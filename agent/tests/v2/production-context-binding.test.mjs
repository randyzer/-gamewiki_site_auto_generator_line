import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { canonicalJson } from '../../src/contracts/canonical-json.mjs';
import { executionContextDigest } from '../../src/contracts/context-digest.mjs';
import { createOfflineContextBinder } from '../../src/v2/production-context-binding.mjs';
import { createProductionObservation } from '../../src/v2/production-observation.mjs';
import { createOfflineObservationStore } from '../../src/v2/production-observation-store.mjs';
import { stageIdentityTable } from '../../src/v2/stage-identity.mjs';

const sha256 = value => createHash('sha256').update(value).digest('hex');
const sha = value => value.repeat(64);

async function fixture(t) {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'p6b-context-')));
  t.after(() => rm(root, { recursive: true, force: true }));
  const legacyRoot = join(root, 'legacy');
  const offlineRoot = join(root, 'offline');
  const sourceRoot = join(root, 'sources');
  await Promise.all([legacyRoot, offlineRoot, sourceRoot].map(path => mkdir(path, { recursive: true })));
  const checkpoint = { attempt: 1, inputDigest: sha('a'), updatedAt: 'fixture', next: 'Advance next stage' };
  const commit = { runId: 'run-1', canonicalStageId: 'homepage-research', attemptId: 1,
    legacyInputDigest: sha('a'), sourceRevision: 'source-1', checkpoint,
    artifacts: [{ sha256: sha('b') }], legacyStatus: 'PASSED',
    deploymentExecuted: false, committedSequence: 4 };
  let snapshot;
  const observation = createProductionObservation({ mode: 'SHADOW_READ_ONLY', observer: async value => { snapshot = value; } });
  assert.equal((await observation.observeLegacyCommit(commit)).status, 'OBSERVED');
  const stages = stageIdentityTable.map(identity => ({ skill: identity.legacySkillName,
    status: identity.canonicalStageId === commit.canonicalStageId ? 'PASSED' : 'NOT_STARTED',
    checkpoint: identity.canonicalStageId === commit.canonicalStageId ? checkpoint :
      { attempt: 0, inputDigest: null, updatedAt: null, next: 'Validate stage inputs' },
    artifacts: identity.canonicalStageId === commit.canonicalStageId ? commit.artifacts : [] }));
  const manifest = { schemaVersion: 1, runId: commit.runId, sequence: commit.committedSequence,
    deploymentExecuted: false, inputs: { siteRevision: commit.sourceRevision }, stages };
  const manifestDirectory = join(legacyRoot, 'runs', commit.runId);
  await mkdir(manifestDirectory, { recursive: true });
  const manifestPath = join(manifestDirectory, 'manifest.json');
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  const store = createOfflineObservationStore({ legacyRoot, offlineRoot });

  async function source(name, value) {
    const path = `${name}.json`;
    const bytes = Buffer.from(`${canonicalJson(value)}\n`);
    await writeFile(join(sourceRoot, path), bytes);
    return { path, sha256: sha256(bytes) };
  }
  async function completeSources(overrides = {}) {
    const values = {
      identity: { runId: commit.runId, stageId: commit.canonicalStageId, attemptId: commit.attemptId,
        requestedOperation: 'observe-legacy-stage', mappingVersion: 'stage-identity-v1' },
      code: { sourceCommit: '1'.repeat(40), workspaceDigest: sha('2'), skillLockDigest: sha('3'),
        schemaBundleDigest: sha('4'), policyVersion: 1, featureGate: 'legacy' },
      inputs: [{ path: 'inputs/raw.md', sha256: sha('5'), kind: 'raw-keywords', lineageDigest: null }],
      execution: { permissionProfile: 'offline-fixture', budget: 0, timeoutMs: 1, hostCapabilities: [] },
      research: { evidencePlanDigest: null, recoveryDigest: null, serviceDecisions: [], targetPlatforms: [] },
      site: { siteRevision: commit.sourceRevision, domain: null, baselineDigest: null },
      ...overrides,
    };
    return Object.fromEntries(await Promise.all(Object.entries(values).map(async ([name, value]) =>
      [name, await source(name, value)])));
  }
  return { root, legacyRoot, offlineRoot, sourceRoot, manifestPath, manifest, commit,
    snapshot, store, completeSources };
}

test('store accepts only an original trusted snapshot and cross-checks the persisted manifest', async t => {
  const f = await fixture(t);
  await assert.rejects(f.store.persist(structuredClone(f.snapshot)), /trusted observation snapshot/i);
  const record = await f.store.persist(f.snapshot);
  assert.equal(record.authoritative, false);
  assert.equal(record.verificationScope, 'OFFLINE_SIMULATED');
  assert.equal(record.snapshot.runId, f.manifest.runId);
  assert.equal(record.legacyManifest.sha256, sha256(await readFile(f.manifestPath)));
  assert.equal((await f.store.persist(f.snapshot)).recordDigest, record.recordDigest);
  assert.equal((await f.store.read(record.identity)).recordDigest, record.recordDigest);
});

test('store rejects manifest identity drift and cannot use a newer manifest as historical proof', async t => {
  const f = await fixture(t);
  f.manifest.stages[0].checkpoint.inputDigest = sha('c');
  await writeFile(f.manifestPath, JSON.stringify(f.manifest, null, 2) + '\n');
  await assert.rejects(f.store.persist(f.snapshot), /manifest.*snapshot|identity/i);

  const clean = await fixture(t);
  const record = await clean.store.persist(clean.snapshot);
  clean.manifest.sequence++;
  await writeFile(clean.manifestPath, JSON.stringify(clean.manifest, null, 2) + '\n');
  await assert.rejects(clean.store.read(record.identity), /historical manifest|manifest.*changed/i);
});

test('store rejects path escape and symlinked manifest roots', async t => {
  const f = await fixture(t);
  assert.throws(() => createOfflineObservationStore({ legacyRoot: '../escape', offlineRoot: f.offlineRoot }),
    /absolute/i);
  const linkedRoot = join(f.root, 'linked-legacy');
  await symlink(f.legacyRoot, linkedRoot);
  const store = createOfflineObservationStore({ legacyRoot: linkedRoot, offlineRoot: join(f.root, 'other-offline') });
  await assert.rejects(store.persist(f.snapshot), /symlink/i);

  const parentLink = join(f.root, 'parent-link');
  await symlink(f.root, parentLink);
  const nestedStore = createOfflineObservationStore({ legacyRoot: join(parentLink, 'legacy'),
    offlineRoot: join(f.root, 'nested-offline') });
  await assert.rejects(nestedStore.persist(f.snapshot), /symlink/i);
});

test('store rejects an existing conflicting record instead of overwriting it', async t => {
  const f = await fixture(t);
  const record = await f.store.persist(f.snapshot);
  const path = join(f.offlineRoot, record.reference.path);
  await writeFile(path, '{"conflict":true}\n');
  await assert.rejects(f.store.persist(f.snapshot), error => error.code === 'OBSERVATION_RECORD_CONFLICT');
});

test('store read rejects direct record digest, snapshot and path-identity tampering', async t => {
  for (const mutate of [
    record => ({ ...record, recordDigest: sha('f') }),
    record => ({ ...record, snapshot: { ...record.snapshot, sourceRevision: 'tampered' } }),
    record => {
      const changed = { ...record, identity: { ...record.identity, runId: 'other-run' } };
      const { recordDigest: _ignored, ...base } = changed;
      return { ...changed, recordDigest: sha256(`AGENT_P6_B_OBSERVATION_RECORD_V1\n${canonicalJson(base)}`) };
    },
  ]) {
    const f = await fixture(t);
    const record = await f.store.persist(f.snapshot);
    await writeFile(join(f.offlineRoot, record.reference.path), `${canonicalJson(mutate(record))}\n`);
    await assert.rejects(f.store.read(record.identity), /digest|identity/i);
  }
});

test('binder reports missing sources as INCOMPLETE without inventing a context digest', async t => {
  const f = await fixture(t);
  const record = await f.store.persist(f.snapshot);
  const binder = createOfflineContextBinder({ sourceRoot: f.sourceRoot, observationStore: f.store });
  const binding = await binder.bind({ observationRecord: record, sources: {} });
  assert.equal(binding.bindingStatus, 'INCOMPLETE');
  assert.equal(binding.executionContextDigest, null);
  assert.deepEqual(binding.missingSourceFields, ['code', 'execution', 'identity', 'inputs', 'research', 'site']);
  assert.equal(binding.authoritative, false);
  assert.equal(binding.verificationScope, 'OFFLINE_SIMULATED');
});

test('binder revalidates the current manifest before trusting a stored observation', async t => {
  const f = await fixture(t);
  const record = await f.store.persist(f.snapshot);
  f.manifest.sequence++;
  await writeFile(f.manifestPath, JSON.stringify(f.manifest, null, 2) + '\n');
  const binder = createOfflineContextBinder({ sourceRoot: f.sourceRoot, observationStore: f.store });
  await assert.rejects(binder.bind({ observationRecord: record, sources: {} }),
    /historical manifest|manifest.*changed/i);
});

test('binder assembles the existing execution context from six verified source files', async t => {
  const f = await fixture(t);
  const record = await f.store.persist(f.snapshot);
  const sources = await f.completeSources();
  const binder = createOfflineContextBinder({ sourceRoot: f.sourceRoot, observationStore: f.store });
  const first = await binder.bind({ observationRecord: record, sources });
  const second = await binder.bind({ observationRecord: record, sources });
  assert.equal(first.bindingStatus, 'VERIFIED');
  assert.equal(first.verificationScope, 'OFFLINE_SIMULATED');
  assert.equal(first.authoritative, false);
  assert.deepEqual(first.missingSourceFields, []);
  assert.equal(first.executionContextDigest, executionContextDigest(first.executionContext));
  assert.equal(first.legacyInputDigest, f.snapshot.legacyInputDigest);
  assert.notEqual(first.executionContextDigest, first.legacyInputDigest);
  assert.equal(first.bindingDigest, second.bindingDigest);
});

test('binder rejects untrusted records, cross-run identity and non-legacy feature gates', async t => {
  const f = await fixture(t);
  const record = await f.store.persist(f.snapshot);
  const binder = createOfflineContextBinder({ sourceRoot: f.sourceRoot, observationStore: f.store });
  await assert.rejects(binder.bind({ observationRecord: structuredClone(record), sources: {} }),
    /trusted observation record/i);
  await assert.rejects(binder.bind({ observationRecord: record,
    sources: await f.completeSources({ identity: { runId: 'other-run', stageId: f.commit.canonicalStageId,
      attemptId: 1, requestedOperation: 'observe-legacy-stage', mappingVersion: 'stage-identity-v1' } }) }),
  /identity/i);
  await assert.rejects(binder.bind({ observationRecord: record,
    sources: await f.completeSources({ code: { sourceCommit: '1'.repeat(40), workspaceDigest: sha('2'),
      skillLockDigest: sha('3'), schemaBundleDigest: sha('4'), policyVersion: 1, featureGate: 'shadow' } }) }),
  error => error.code === 'POLICY_DENIED');
});

test('binder rejects unsafe paths, symlinks and source hash drift', async t => {
  const f = await fixture(t);
  const record = await f.store.persist(f.snapshot);
  const binder = createOfflineContextBinder({ sourceRoot: f.sourceRoot, observationStore: f.store });
  const sources = await f.completeSources();
  await assert.rejects(binder.bind({ observationRecord: record,
    sources: { ...sources, identity: { path: '../identity.json', sha256: sources.identity.sha256 } } }),
  /path/i);
  await writeFile(join(f.sourceRoot, sources.code.path), '{"tampered":true}\n');
  await assert.rejects(binder.bind({ observationRecord: record, sources }), /digest/i);

  const outside = join(f.root, 'outside.json');
  await writeFile(outside, '{}\n');
  const link = join(f.sourceRoot, 'linked.json');
  await symlink(outside, link);
  await assert.rejects(binder.bind({ observationRecord: record,
    sources: { ...sources, code: { path: 'linked.json', sha256: sha256(await readFile(outside)) } } }),
  /symlink/i);

  const parentLink = join(f.root, 'source-parent-link');
  await symlink(f.root, parentLink);
  const nestedBinder = createOfflineContextBinder({ sourceRoot: join(parentLink, 'sources'),
    observationStore: f.store });
  await assert.rejects(nestedBinder.bind({ observationRecord: record, sources: await f.completeSources() }),
    /symlink/i);
});
