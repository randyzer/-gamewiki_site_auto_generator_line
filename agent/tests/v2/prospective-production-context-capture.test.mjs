import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { canonicalJson } from '../../src/contracts/canonical-json.mjs';
import { executionContextDigest } from '../../src/contracts/context-digest.mjs';
import { validateContract } from '../../src/contracts/registry.mjs';
import { verifyBaseline } from '../../src/project-baseline.mjs';
import { writeImmutableFile } from '../../src/state/atomic-file.mjs';
import { createStateObjectStore } from '../../src/state/state-object-store.mjs';
import { ensureDirectoryTree } from '../../src/state/storage-boundary.mjs';
import { assertTrustedOfflineContextBinding, createOfflineContextBinder,
  revalidateOfflineContextBinding } from '../../src/v2/production-context-binding.mjs';
import { assertTrustedObservationSnapshot,
  createProductionObservation } from '../../src/v2/production-observation.mjs';
import { createOfflineObservationStore } from '../../src/v2/production-observation-store.mjs';
import { assertCanonicalStageId, resolveStageIdentity,
  stageIdentityTable } from '../../src/v2/stage-identity.mjs';

const sha256 = value => createHash('sha256').update(value).digest('hex');
const sha = value => value.repeat(64);

function executionContext(overrides = {}) {
  return {
    kind: 'EXECUTION_CONTEXT', schemaVersion: 1,
    runId: 'run-1', stageId: 'homepage-research', attemptId: 1,
    requestedOperation: 'capture-context',
    code: { sourceCommit: '1'.repeat(40), workspaceDigest: sha('2'),
      skillLockDigest: sha('3'), schemaBundleDigest: sha('4'), policyVersion: 1,
      featureGate: 'legacy' },
    inputs: [{ path: 'inputs/raw.md', sha256: sha('5'), kind: 'raw-keywords', lineageDigest: null }],
    execution: { permissionProfile: 'offline-fixture', budget: 0, timeoutMs: 1,
      hostCapabilities: [] },
    research: { evidencePlanDigest: null, recoveryDigest: null,
      serviceDecisions: [], targetPlatforms: [] },
    site: { siteRevision: 'source-1', domain: null, baselineDigest: null },
    ...overrides,
  };
}

async function contextFixture(t) {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'prospective-context-capture-')));
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
  const observation = createProductionObservation({ mode: 'SHADOW_READ_ONLY',
    observer: async value => { snapshot = value; } });
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
  await writeFile(join(manifestDirectory, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  const store = createOfflineObservationStore({ legacyRoot, offlineRoot });
  const record = await store.persist(snapshot);

  async function source(name, value) {
    const path = `${name}.json`;
    const bytes = Buffer.from(`${canonicalJson(value)}\n`);
    await writeFile(join(sourceRoot, path), bytes);
    return { path, sha256: sha256(bytes) };
  }
  async function completeSources() {
    const context = executionContext();
    const values = {
      identity: { runId: context.runId, stageId: context.stageId,
        attemptId: context.attemptId, requestedOperation: context.requestedOperation,
        mappingVersion: 'stage-identity-v1' },
      code: context.code, inputs: context.inputs, execution: context.execution,
      research: context.research, site: context.site,
    };
    return Object.fromEntries(await Promise.all(Object.entries(values).map(async ([name, value]) =>
      [name, await source(name, value)])));
  }
  return { root, sourceRoot, store, record, snapshot, completeSources };
}

test('EXECUTION_CONTEXT requires all six sections and uses a deterministic domain-separated digest', () => {
  const context = executionContext();
  assert.equal(validateContract('EXECUTION_CONTEXT', 1, context), context);
  const first = executionContextDigest(context);
  assert.equal(first, executionContextDigest(structuredClone(context)));
  assert.notEqual(first, sha256(canonicalJson(context)));
  for (const section of ['code', 'inputs', 'execution', 'research', 'site']) {
    const incomplete = structuredClone(context);
    delete incomplete[section];
    assert.throws(() => executionContextDigest(incomplete), /required (?:property|field)/i);
  }
});

test('Offline Binder reports missing sources without issuing a trusted Context digest', async t => {
  const f = await contextFixture(t);
  const binder = createOfflineContextBinder({ sourceRoot: f.sourceRoot, observationStore: f.store });
  const binding = await binder.bind({ observationRecord: f.record, sources: {} });
  assert.equal(binding.bindingStatus, 'INCOMPLETE');
  assert.equal(binding.executionContextDigest, null);
  assert.deepEqual(binding.missingSourceFields,
    ['code', 'execution', 'identity', 'inputs', 'research', 'site']);
  assert.equal(binding.authoritative, false);
  assert.equal(binding.verificationScope, 'OFFLINE_SIMULATED');
  assert.equal(assertTrustedOfflineContextBinding(binder, binding), binding);
});

test('Offline Binder rejects unsafe, symlinked, hash-drifted and stale Context sources', async t => {
  const f = await contextFixture(t);
  const binder = createOfflineContextBinder({ sourceRoot: f.sourceRoot, observationStore: f.store });
  let sources = await f.completeSources();
  await assert.rejects(binder.bind({ observationRecord: f.record,
    sources: { ...sources, identity: { ...sources.identity, path: '../identity.json' } } }), /path/i);

  await writeFile(join(f.sourceRoot, sources.code.path), '{"tampered":true}\n');
  await assert.rejects(binder.bind({ observationRecord: f.record, sources }), /digest/i);

  sources = await f.completeSources();
  const outside = join(f.root, 'outside.json');
  await writeFile(outside, '{}\n');
  await symlink(outside, join(f.sourceRoot, 'linked.json'));
  await assert.rejects(binder.bind({ observationRecord: f.record,
    sources: { ...sources, code: { path: 'linked.json', sha256: sha256(await readFile(outside)) } } }),
  /symlink/i);

  const binding = await binder.bind({ observationRecord: f.record, sources });
  await writeFile(join(f.sourceRoot, sources.site.path), '{"changed":true}\n');
  await assert.rejects(revalidateOfflineContextBinding(binder, binding), /digest|changed|stale/i);
});

test('immutable storage rejects unsafe sources, symlinks and conflicting content while preserving idempotency', async t => {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'prospective-context-store-')));
  t.after(() => rm(root, { recursive: true, force: true }));
  const staging = join(root, 'staging');
  const state = join(root, 'state');
  await mkdir(staging);
  const bytes = Buffer.from('immutable-context-source\n');
  await writeFile(join(staging, 'source.bin'), bytes);
  const descriptor = { role: 'context-source', contractKind: 'TEST', schemaVersion: 1,
    sourcePath: 'source.bin', sha256: sha256(bytes), byteLength: bytes.length };
  const store = createStateObjectStore({ rootDirectory: state });
  const first = await store.publish(descriptor, { stagingRoot: staging });
  const second = await store.publish(descriptor, { stagingRoot: staging });
  assert.deepEqual(second, first);
  assert.deepEqual(await store.verify(first), bytes);
  await assert.rejects(store.publish({ ...descriptor, sourcePath: '../outside.bin' },
    { stagingRoot: staging }), /escapes staging root/i);

  const linked = join(root, 'linked-state');
  await symlink(state, linked);
  await assert.rejects(ensureDirectoryTree(linked, ['objects']), /symbolic link/i);

  const immutable = join(root, 'immutable.json');
  assert.equal(await writeImmutableFile(immutable, Buffer.from('{}\n')), true);
  assert.equal(await writeImmutableFile(immutable, Buffer.from('{}\n')), false);

  const collisionRoot = join(root, 'collision');
  await ensureDirectoryTree(collisionRoot, ['objects', 'sha256']);
  await writeFile(join(collisionRoot, 'objects/sha256', descriptor.sha256), 'different-bytes\n');
  const collisionStore = createStateObjectStore({ rootDirectory: collisionRoot });
  await assert.rejects(collisionStore.publish(descriptor, { stagingRoot: staging }),
    error => error.code === 'STATE_COMMIT_CORRUPT');
});

test('project baseline verifier rejects a drifted site attestation without granting production authority', async t => {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'prospective-site-baseline-')));
  t.after(() => rm(root, { recursive: true, force: true }));
  const data = { schemaVersion: 1, snapshotPolicyVersion: 1, sourceProjectPath: root,
    head: '1'.repeat(40), branch: 'main', repository: '', status: '', statusDigest: sha('1'),
    staged: [], modified: [], untracked: [], researchRootName: 'backgroundinformation',
    keyword: { path: join(root, 'keywords.md'), sha256: sha('2'), size: 1 },
    files: [{ path: 'index.md', sha256: sha('3'), size: 1, mode: 0o600, type: 'file' }],
    protectedPaths: [], sourceDigest: sha('4') };
  const baseline = { ...data, digest: sha256(JSON.stringify(data)) };
  const drifted = structuredClone(baseline);
  drifted.files[0].sha256 = sha('5');
  await assert.rejects(verifyBaseline(drifted, { path: root }), /Invalid source baseline/i);
  assert.equal(Object.hasOwn(baseline, 'authoritative'), false);
  assert.equal(Object.hasOwn(baseline, 'productionCapability'), false);
});

test('canonical identity and offline observation reject invalid identity and production authority claims', async () => {
  assert.equal(resolveStageIdentity({ namespace: 'canonical-stage-id',
    value: 'keyword-research' }).legacySkillName, 'game-innerpage-keyword-information-research');
  assert.throws(() => resolveStageIdentity({ namespace: 'canonical-stage-id', value: 'unknown-stage' }),
    error => error.code === 'STAGE_ID_UNKNOWN');
  assert.throws(() => resolveStageIdentity({ namespace: 'canonical-stage-id',
    value: 'keyword-research', mappingVersion: 'future-map' }),
  error => error.code === 'STAGE_ID_MAPPING_VERSION_MISMATCH');
  assert.throws(() => assertCanonicalStageId('game-innerpage-keyword-information-research'),
    error => error.code === 'STAGE_ID_NON_CANONICAL');

  let snapshot;
  const observation = createProductionObservation({ mode: 'SHADOW_READ_ONLY',
    observer: async value => { snapshot = value; } });
  const digest = sha('a');
  const outcome = await observation.observeLegacyCommit({ runId: 'run-1',
    canonicalStageId: 'keyword-research', attemptId: 1, legacyInputDigest: digest,
    sourceRevision: 'source-1', checkpoint: { attempt: 1, inputDigest: digest },
    artifacts: [], legacyStatus: 'PARTIAL', deploymentExecuted: false, committedSequence: 1 });
  assert.equal(outcome.authoritative, false);
  assert.equal(outcome.observerResultAccepted, false);
  assert.equal(snapshot.authoritative, false);
  assert.equal(Object.hasOwn(snapshot, 'contextDigest'), false);
  assert.equal(Object.hasOwn(snapshot, 'capabilities'), false);
  assert.equal(assertTrustedObservationSnapshot(snapshot), snapshot);
  assert.throws(() => assertTrustedObservationSnapshot(structuredClone(snapshot)),
    /trusted observation snapshot/i);
});

test.todo('trusted host allocates a unique immutable attempt before Context capture');
test.todo('identical allocation is idempotent and conflicting allocation is rejected');
test.todo('six authoritative host producers are required and worker-authored sources are rejected');
test.todo('Source Set binds the exact allocation digest, run, stage and attempt');
test.todo('Production Context is durably committed before Execution Start');
test.todo('Execution Start requires exact Context, policy and capability bindings');
test.todo('durable Launch Intent is required before a worker can spawn');
test.todo('Launch Outcome binds the spawn result and uncertain launches cannot be replayed');
test.todo('permission plan and apply mismatch rejects worker launch');
test.todo('crashes between lifecycle records recover without fabricating missing authority');
test.todo('retry allocates a fresh attempt and binds any approved recovery digest');
test.todo('concurrent allocation has one winner and deterministic conflict behavior');
test.todo('Offline Binder and Observation cannot satisfy production capture authority');
test.todo('post-capture code, input, site or permission drift prevents worker launch');
test.todo('lifecycle sequence gaps, predecessor drift and conflicting Context fail closed');
test.todo('launch binding covers executable, argv, cwd, environment keys, timeout, permissions and outcome');
