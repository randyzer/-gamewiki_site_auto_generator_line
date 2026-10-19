import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalJson } from '../../src/contracts/canonical-json.mjs';
import { contractDefinition } from '../../src/contracts/registry.mjs';
import { projectLegacyManifest } from '../../src/state/manifest-projector.mjs';
import { createOfflineContextBinder,
  revalidateOfflineContextBinding } from '../../src/v2/production-context-binding.mjs';
import { createProductionObservation } from '../../src/v2/production-observation.mjs';
import { createOfflineObservationStore } from '../../src/v2/production-observation-store.mjs';
import { stageIdentityTable } from '../../src/v2/stage-identity.mjs';

const agentRoot = fileURLToPath(new URL('../../', import.meta.url));
const schemaRoot = join(agentRoot, 'src/contracts/schemas');
const historicalManifestPath = join(agentRoot, 'runs/wallpaper-engine-002/manifest.json');
const attempt10RecoveryPath = join(agentRoot,
  'runs/wallpaper-engine-002/keyword-recovery/10/f71097b7-f3b6-4cfc-b512-de91fb1f5d90/manifest.json');
const sha256 = value => createHash('sha256').update(value).digest('hex');
const sha = value => value.repeat(64);

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function contextFixture(t) {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'p6-f2-c1-context-')));
  t.after(() => rm(root, { recursive: true, force: true }));
  const legacyRoot = join(root, 'legacy');
  const offlineRoot = join(root, 'offline');
  const sourceRoot = join(root, 'sources');
  await Promise.all([legacyRoot, offlineRoot, sourceRoot].map(path => mkdir(path, { recursive: true })));

  const identity = stageIdentityTable.find(item => item.canonicalStageId === 'keyword-research');
  const checkpoint = { attempt: 11, inputDigest: sha('a'), updatedAt: 'fixture', next: 'Review partial result' };
  const commit = {
    runId: 'prospective-keyword-run', canonicalStageId: identity.canonicalStageId,
    attemptId: checkpoint.attempt, legacyInputDigest: checkpoint.inputDigest,
    sourceRevision: sha('f'), checkpoint, artifacts: [], legacyStatus: 'PARTIAL',
    deploymentExecuted: false, committedSequence: 1,
  };
  let snapshot;
  const observation = createProductionObservation({
    mode: 'SHADOW_READ_ONLY',
    observer: async value => { snapshot = value; },
  });
  assert.equal((await observation.observeLegacyCommit(commit)).status, 'OBSERVED');
  const stages = stageIdentityTable.map(item => ({
    skill: item.legacySkillName,
    status: item.canonicalStageId === commit.canonicalStageId ? commit.legacyStatus : 'NOT_STARTED',
    checkpoint: item.canonicalStageId === commit.canonicalStageId ? checkpoint :
      { attempt: 0, inputDigest: null, updatedAt: null, next: 'Validate stage inputs' },
    artifacts: [],
  }));
  const manifest = {
    schemaVersion: 1, runId: commit.runId, sequence: commit.committedSequence,
    deploymentExecuted: false, inputs: { siteRevision: commit.sourceRevision }, stages,
  };
  const manifestDirectory = join(legacyRoot, 'runs', commit.runId);
  await mkdir(manifestDirectory, { recursive: true });
  await writeFile(join(manifestDirectory, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  const store = createOfflineObservationStore({ legacyRoot, offlineRoot });
  const record = await store.persist(snapshot);

  async function source(name, value) {
    const path = `${name}.json`;
    const bytes = Buffer.from(`${canonicalJson(value)}\n`);
    await writeFile(join(sourceRoot, path), bytes);
    return { path, sha256: sha256(bytes) };
  }
  const values = {
    identity: {
      runId: commit.runId, stageId: commit.canonicalStageId, attemptId: commit.attemptId,
      requestedOperation: 'prospective-keyword-evidence-capture', mappingVersion: 'stage-identity-v1',
    },
    code: {
      sourceCommit: '1'.repeat(40), workspaceDigest: sha('2'), skillLockDigest: sha('3'),
      schemaBundleDigest: sha('4'), policyVersion: 1, featureGate: 'legacy',
    },
    inputs: [{ path: 'inputs/keywords.txt', sha256: sha('5'), kind: 'raw-keywords', lineageDigest: null }],
    execution: { permissionProfile: 'prospective-fixture', budget: 0, timeoutMs: 1, hostCapabilities: [] },
    research: { evidencePlanDigest: sha('6'), recoveryDigest: null, serviceDecisions: [], targetPlatforms: [] },
    site: { siteRevision: commit.sourceRevision, domain: 'example.invalid', baselineDigest: sha('7') },
  };
  const sources = Object.fromEntries(await Promise.all(Object.entries(values).map(async ([name, value]) =>
    [name, await source(name, value)])));
  const binder = createOfflineContextBinder({ sourceRoot, observationStore: store });
  return { root, sourceRoot, store, record, sources, values, binder };
}

test('six-source binding fails closed for missing, modified, unsafe, cross-run and stale site evidence', async t => {
  const f = await contextFixture(t);
  const { research: _research, ...missingResearch } = f.sources;
  const incomplete = await f.binder.bind({ observationRecord: f.record, sources: missingResearch });
  assert.equal(incomplete.bindingStatus, 'INCOMPLETE');
  assert.equal(incomplete.executionContextDigest, null);
  assert.deepEqual(incomplete.missingSourceFields, ['research']);

  await assert.rejects(f.binder.bind({ observationRecord: f.record, sources: {
    ...f.sources, identity: { path: '../identity.json', sha256: f.sources.identity.sha256 },
  } }), error => error.code === 'STATE_STORAGE_PATH_INVALID');

  await writeFile(join(f.sourceRoot, f.sources.code.path), '{"modified":true}\n');
  await assert.rejects(f.binder.bind({ observationRecord: f.record, sources: f.sources }),
    error => error.code === 'CONTRACT_DIGEST_MISMATCH');

  const crossRun = await contextFixture(t);
  const crossRunSources = { ...crossRun.sources, identity: await (async () => {
    const bytes = Buffer.from(`${canonicalJson({ ...crossRun.values.identity, runId: 'other-run' })}\n`);
    const path = 'cross-run.json';
    await writeFile(join(crossRun.sourceRoot, path), bytes);
    return { path, sha256: sha256(bytes) };
  })() };
  await assert.rejects(crossRun.binder.bind({ observationRecord: crossRun.record, sources: crossRunSources }),
    error => error.code === 'IDENTITY_MISMATCH');

  const linked = await contextFixture(t);
  const outside = join(linked.root, 'outside.json');
  await writeFile(outside, '{}\n');
  await symlink(outside, join(linked.sourceRoot, 'linked.json'));
  await assert.rejects(linked.binder.bind({ observationRecord: linked.record, sources: {
    ...linked.sources, code: { path: 'linked.json', sha256: sha256(await readFile(outside)) },
  } }), error => error.code === 'STATE_STORAGE_SYMLINK');

  const stale = await contextFixture(t);
  const binding = await stale.binder.bind({ observationRecord: stale.record, sources: stale.sources });
  assert.equal(binding.bindingStatus, 'VERIFIED');
  await writeFile(join(stale.sourceRoot, stale.sources.site.path),
    `${canonicalJson({ ...stale.values.site, baselineDigest: sha('8') })}\n`);
  await assert.rejects(revalidateOfflineContextBinding(stale.binder, binding),
    error => error.code === 'CONTRACT_DIGEST_MISMATCH');
});

test('current binder proves only offline legacy bytes, not execution-time production authority', async t => {
  const f = await contextFixture(t);
  const binding = await f.binder.bind({ observationRecord: f.record, sources: f.sources });
  assert.equal(binding.bindingStatus, 'VERIFIED');
  assert.equal(binding.authoritative, false);
  assert.equal(binding.verificationScope, 'OFFLINE_SIMULATED');

  const shadowCode = { ...f.values.code, featureGate: 'shadow' };
  const bytes = Buffer.from(`${canonicalJson(shadowCode)}\n`);
  await writeFile(join(f.sourceRoot, 'shadow-code.json'), bytes);
  await assert.rejects(f.binder.bind({ observationRecord: f.record, sources: {
    ...f.sources, code: { path: 'shadow-code.json', sha256: sha256(bytes) },
  } }), error => error.code === 'POLICY_DENIED');
});

test('published contracts keep diagnostics separate from explicit accepted-artifact authority', async t => {
  const candidateSchema = await readJson(join(schemaRoot, 'stage-commit-candidate.v1.json'));
  const objectProperties = candidateSchema.properties.objects.items.properties;
  assert.equal(Object.hasOwn(objectProperties, 'accepted'), false);
  assert.equal(Object.hasOwn(objectProperties, 'artifactClass'), false);

  const recovery = await readJson(attempt10RecoveryPath).catch(error => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  if (recovery === null) t.skip('attempt-10 recovery is external historical evidence and is absent');
  else {
    assert.equal(recovery.countsAsStageArtifact, false);
    assert.equal(recovery.contentValidated, false);
  }

  const manifestBytes = await readFile(historicalManifestPath).catch(error => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  if (manifestBytes === null) return;
  const manifest = JSON.parse(manifestBytes);
  const keyword = manifest.stages[1];
  if (keyword.checkpoint.attempt !== 10) return;
  assert.equal(keyword.status, 'FAILED');
  assert.deepEqual(keyword.artifacts, []);
});

test('status projection never upgrades PARTIAL, BLOCKED, FAILED or WAITING_FOR_USER', () => {
  const state = (reason, artifact, gate = 'NOT_EVALUATED') => ({
    execution: { phase: 'STOPPED', reason }, artifact: { status: artifact },
    gate: { status: gate, approvalDigest: null },
  });
  const partial = projectLegacyManifest({ state: state('PARTIAL', 'VALIDATED_PARTIAL') });
  assert.deepEqual([partial.status, partial.stageSatisfied, partial.downstreamAuthorized],
    ['PARTIAL', false, false]);
  const blocked = projectLegacyManifest({ state: state('BLOCKED', 'UNVERIFIED') });
  assert.deepEqual([blocked.status, blocked.stageSatisfied, blocked.downstreamAuthorized],
    ['BLOCKED', false, false]);
  const failed = projectLegacyManifest({ state: state('FAILED', 'UNVERIFIED') });
  assert.deepEqual([failed.status, failed.stageSatisfied, failed.downstreamAuthorized],
    ['FAILED', false, false]);
  const waiting = projectLegacyManifest({ state: state('SUCCEEDED', 'VALIDATED_COMPLETE', 'WAITING_FOR_APPROVAL') });
  assert.deepEqual([waiting.status, waiting.stageSatisfied, waiting.downstreamAuthorized],
    ['WAITING_FOR_USER', false, false]);
});

test('published schemas expose an explicit policyVersion mapping decision instead of implicit coercion', async () => {
  const executionContext = await readJson(join(schemaRoot, 'execution-context.v1.json'));
  const candidateV2 = await readJson(join(schemaRoot, 'stage-commit-candidate.v2.json'));
  const recordV2 = await readJson(join(schemaRoot, 'stage-commit-record.v2.json'));
  assert.equal(executionContext.properties.code.properties.policyVersion.type, 'integer');
  assert.equal(candidateV2.properties.policyVersion.type, 'string');
  assert.equal(recordV2.properties.policyVersion.type, 'string');
  assert.notEqual(executionContext.properties.code.properties.policyVersion.type,
    candidateV2.properties.policyVersion.type);
});

test('simulated validation and observation contracts cannot claim production trust', () => {
  const validated = contractDefinition('VALIDATED_STAGE_RESULT', 1);
  assert.equal(validated.producer, 'SIMULATED_HOST_STAGE_VALIDATOR');
  assert.equal(validated.schema.properties.mode.const, 'SIMULATED');
  const observation = createProductionObservation({ mode: 'SHADOW_READ_ONLY', observer: async () => null });
  assert.equal(observation.mode, 'SHADOW_READ_ONLY');
  assert.equal(observation.latest(), null);
});

test.todo('production capture binds all six sources to immutable attempt allocation and execution start');
test.todo('retry allocates a new attempt and cannot reuse retrospective Context as execution-time proof');
test.todo('a versioned contract distinguishes accepted business artifacts from evidence and diagnostics');
test.todo('a reviewed production validator preserves content sufficiency separately from hash and schema validity');
test.todo('a versioned policy mapping rejects ambiguous values without implicit string or number coercion');
test.todo('future G0-G4 execution uses no deployment, feature-gate mutation or unbound approval consumption');
