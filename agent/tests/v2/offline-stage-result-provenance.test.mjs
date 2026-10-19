import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalJson } from '../../src/contracts/canonical-json.mjs';
import { createOfflineContextBinder } from '../../src/v2/production-context-binding.mjs';
import { createProductionObservation } from '../../src/v2/production-observation.mjs';
import { createOfflineObservationStore } from '../../src/v2/production-observation-store.mjs';
import { createOfflineStageResultProvenance } from '../../src/v2/offline-stage-result-provenance.mjs';
import { stageIdentityTable } from '../../src/v2/stage-identity.mjs';

const repoRoot = fileURLToPath(new URL('../../..', import.meta.url));
const fixtureRoot = join(repoRoot, 'agent/tests/fixtures/v2/homepage');
const sha256 = value => createHash('sha256').update(value).digest('hex');
const sha = value => value.repeat(64);

async function setup(t) {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'p6d-provenance-')));
  t.after(() => rm(root, { recursive: true, force: true }));
  const legacyRoot = join(root, 'legacy');
  const offlineRoot = join(root, 'offline');
  const sourceRoot = join(root, 'sources');
  await Promise.all([legacyRoot, offlineRoot, sourceRoot].map(path => mkdir(path, { recursive: true })));
  const checkpoint = { attempt: 1, inputDigest: sha('a'), updatedAt: 'fixture', next: 'Advance next stage' };
  const commit = { runId: 'wallpaper-engine-002', canonicalStageId: 'homepage-research', attemptId: 1,
    legacyInputDigest: sha('a'), sourceRevision: 'source-1', checkpoint,
    artifacts: [{ sha256: sha('b') }], legacyStatus: 'PASSED',
    deploymentExecuted: false, committedSequence: 4 };
  let snapshot;
  const observation = createProductionObservation({ mode: 'SHADOW_READ_ONLY',
    observer: async value => { snapshot = value; } });
  await observation.observeLegacyCommit(commit);
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
  const record = await store.persist(snapshot);

  async function source(name, value) {
    const path = `${name}.json`;
    const bytes = Buffer.from(`${canonicalJson(value)}\n`);
    await writeFile(join(sourceRoot, path), bytes);
    return { path, sha256: sha256(bytes) };
  }
  const values = {
    identity: { runId: commit.runId, stageId: commit.canonicalStageId, attemptId: commit.attemptId,
      requestedOperation: 'observe-legacy-stage', mappingVersion: 'stage-identity-v1' },
    code: { sourceCommit: '1'.repeat(40), workspaceDigest: sha('2'), skillLockDigest: sha('3'),
      schemaBundleDigest: sha('4'), policyVersion: 1, featureGate: 'legacy' },
    inputs: [{ path: 'inputs/raw.md', sha256: sha('5'), kind: 'raw-keywords', lineageDigest: null }],
    execution: { permissionProfile: 'offline-fixture', budget: 0, timeoutMs: 1, hostCapabilities: [] },
    research: { evidencePlanDigest: null, recoveryDigest: null, serviceDecisions: [], targetPlatforms: [] },
    site: { siteRevision: commit.sourceRevision, domain: null, baselineDigest: null },
  };
  const sources = Object.fromEntries(await Promise.all(Object.entries(values).map(async ([name, value]) =>
    [name, await source(name, value)])));
  const binder = createOfflineContextBinder({ sourceRoot, observationStore: store });
  const binding = await binder.bind({ observationRecord: record, sources });
  const fixtureManifest = JSON.parse(await readFile(join(fixtureRoot, 'fixture-manifest.json'), 'utf8'));
  const sourceFiles = new Map();
  const derivedFiles = new Map();
  for (const item of fixtureManifest.sources) {
    sourceFiles.set(item.sourceRelativePath, await readFile(join(repoRoot, item.sourceRelativePath)));
    if (item.derivedPath) derivedFiles.set(item.derivedPath, await readFile(join(fixtureRoot, item.derivedPath)));
  }
  const fixturePayload = { fixtureManifest, sourceFiles, derivedFiles,
    zipBytes: sourceFiles.get(fixtureManifest.iconArchive.sourceRelativePath) };
  const provenance = createOfflineStageResultProvenance({ observationStore: store, contextBinder: binder });
  return { root, manifest, manifestPath, sourceRoot, sources, store, record, binder, binding,
    fixturePayload, provenance };
}

test('controlled homepage execution creates deterministic trusted result provenance', async t => {
  const f = await setup(t);
  const input = { observationRecord: f.record, contextBinding: f.binding,
    canonicalStageId: 'homepage-research', fixturePayload: f.fixturePayload };
  const first = await f.provenance.run(input);
  const second = await f.provenance.run(input);
  assert.equal(first.kind, 'OFFLINE_TRUSTED_STAGE_RESULT');
  assert.equal(first.resultStatus, 'COMPLETED');
  assert.equal(first.stageResult.status, 'COMPLETED');
  assert.equal(first.provenanceDigest, second.provenanceDigest);
  assert.equal(first.stageResultDigest, second.stageResultDigest);
  assert.equal(f.provenance.assertTrustedResult(first), first);
  assert.equal(await f.provenance.revalidateResult(first), first);
  assert.ok(Object.isFrozen(first));
});

test('ordinary JSON, clones and another provenance instance cannot acquire trust', async t => {
  const f = await setup(t);
  const result = await f.provenance.run({ observationRecord: f.record, contextBinding: f.binding,
    canonicalStageId: 'homepage-research', fixturePayload: f.fixturePayload });
  assert.throws(() => f.provenance.assertTrustedResult(structuredClone(result)),
    error => error.code === 'TRUST_LEVEL_INSUFFICIENT');
  const other = createOfflineStageResultProvenance({ observationStore: f.store, contextBinder: f.binder });
  assert.throws(() => other.assertTrustedResult(result), error => error.code === 'TRUST_LEVEL_INSUFFICIENT');
  assert.throws(() => f.provenance.assertTrustedResult({ ...result }),
    error => error.code === 'TRUST_LEVEL_INSUFFICIENT');
});

test('a provenance factory rejects a store and binder assembled from separate authorities', async t => {
  const first = await setup(t);
  const second = await setup(t);
  assert.throws(() => createOfflineStageResultProvenance({ observationStore: first.store,
    contextBinder: second.binder }), error => error.code === 'TRUST_LEVEL_INSUFFICIENT');
});

test('run rejects wrong stage, cross-store records and fixture run mismatch', async t => {
  const f = await setup(t);
  await assert.rejects(f.provenance.run({ observationRecord: f.record, contextBinding: f.binding,
    canonicalStageId: 'keyword-research', fixturePayload: f.fixturePayload }),
  error => error.code === 'POLICY_DENIED');
  const other = await setup(t);
  await assert.rejects(f.provenance.run({ observationRecord: other.record, contextBinding: f.binding,
    canonicalStageId: 'homepage-research', fixturePayload: f.fixturePayload }),
  error => error.code === 'TRUST_LEVEL_INSUFFICIENT');
  await assert.rejects(f.provenance.run({ observationRecord: f.record, contextBinding: other.binding,
    canonicalStageId: 'homepage-research', fixturePayload: f.fixturePayload }),
  error => error.code === 'TRUST_LEVEL_INSUFFICIENT');
  const changedManifest = { ...f.fixturePayload.fixtureManifest, sourceRunId: 'another-run' };
  await assert.rejects(f.provenance.run({ observationRecord: f.record, contextBinding: f.binding,
    canonicalStageId: 'homepage-research', fixturePayload: { ...f.fixturePayload,
      fixtureManifest: changedManifest } }), error => error.code === 'CONTRACT_BINDING_MISMATCH');
});

test('fixture bytes and the closed execution interface are checked before trust is issued', async t => {
  const f = await setup(t);
  const changedFiles = new Map(f.fixturePayload.sourceFiles);
  const firstPath = f.fixturePayload.fixtureManifest.sources[0].sourceRelativePath;
  changedFiles.set(firstPath, Buffer.from('tampered'));
  await assert.rejects(f.provenance.run({ observationRecord: f.record, contextBinding: f.binding,
    canonicalStageId: 'homepage-research', fixturePayload: { ...f.fixturePayload,
      sourceFiles: changedFiles } }), error => error.code === 'CONTRACT_DIGEST_MISMATCH');
  await assert.rejects(f.provenance.run({ observationRecord: f.record, contextBinding: f.binding,
    canonicalStageId: 'homepage-research', fixturePayload: f.fixturePayload, executor: () => {} }),
  /unsupported fields/i);
  await assert.rejects(f.provenance.run({ observationRecord: f.record, contextBinding: f.binding,
    canonicalStageId: 'homepage-research', fixturePayload: { ...f.fixturePayload,
      requestedCapabilities: [] } }), /unsupported fields/i);
});

test('private fixture copy survives caller mutation and stale context sources fail closed', async t => {
  const f = await setup(t);
  const result = await f.provenance.run({ observationRecord: f.record, contextBinding: f.binding,
    canonicalStageId: 'homepage-research', fixturePayload: f.fixturePayload });
  f.fixturePayload.zipBytes.fill(0);
  f.fixturePayload.sourceFiles.clear();
  f.fixturePayload.derivedFiles.clear();
  f.fixturePayload.fixtureManifest.sourceRunId = 'mutated';
  assert.equal(await f.provenance.revalidateResult(result), result);

  await writeFile(join(f.sourceRoot, f.sources.site.path), '{"tampered":true}\n');
  await assert.rejects(f.provenance.revalidateResult(result), /digest/i);
});

test('historical manifest drift invalidates an existing trusted result', async t => {
  const f = await setup(t);
  const result = await f.provenance.run({ observationRecord: f.record, contextBinding: f.binding,
    canonicalStageId: 'homepage-research', fixturePayload: f.fixturePayload });
  f.manifest.sequence += 1;
  await writeFile(f.manifestPath, JSON.stringify(f.manifest, null, 2) + '\n');
  await assert.rejects(f.provenance.revalidateResult(result), /historical manifest|manifest.*changed/i);
});
