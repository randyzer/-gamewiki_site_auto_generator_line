import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { canonicalJson } from '../../src/contracts/canonical-json.mjs';
import { createOfflineContextBinder } from '../../src/v2/production-context-binding.mjs';
import { createOfflineShadowEvidenceComparator } from '../../src/v2/offline-shadow-comparator.mjs';
import { createProductionObservation } from '../../src/v2/production-observation.mjs';
import { createOfflineObservationStore } from '../../src/v2/production-observation-store.mjs';
import { stageIdentityTable } from '../../src/v2/stage-identity.mjs';

const sha256 = value => createHash('sha256').update(value).digest('hex');
const sha = value => value.repeat(64);

async function fixture(t, { complete = true, targetPlatforms = [] } = {}) {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'p6c-readiness-')));
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
    research: { evidencePlanDigest: null, recoveryDigest: null, serviceDecisions: [], targetPlatforms },
    site: { siteRevision: commit.sourceRevision, domain: null, baselineDigest: null },
  };
  const sources = complete ? Object.fromEntries(await Promise.all(Object.entries(values).map(async ([name, value]) =>
    [name, await source(name, value)]))) : {};
  const binder = createOfflineContextBinder({ sourceRoot, observationStore: store });
  const binding = await binder.bind({ observationRecord: record, sources });
  const comparator = createOfflineShadowEvidenceComparator({ observationStore: store,
    contextBinder: binder });
  return { root, legacyRoot, sourceRoot, manifest, manifestPath, record, store, binder, binding,
    comparator, sources };
}

async function persistOtherRunRecord(f) {
  const runId = 'run-2';
  const checkpoint = { attempt: 1, inputDigest: sha('a'), updatedAt: 'fixture', next: 'Advance next stage' };
  const commit = { runId, canonicalStageId: 'homepage-research', attemptId: 1,
    legacyInputDigest: sha('a'), sourceRevision: 'source-2', checkpoint,
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
  const manifest = { schemaVersion: 1, runId, sequence: commit.committedSequence,
    deploymentExecuted: false, inputs: { siteRevision: commit.sourceRevision }, stages };
  const directory = join(f.legacyRoot, 'runs', runId);
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  return f.store.persist(snapshot);
}

test('trusted record and context remain incomplete without trusted stage and fixture evidence', async t => {
  const f = await fixture(t);
  const first = await f.comparator.compare({ observationRecord: f.record, contextBinding: f.binding });
  const second = await f.comparator.compare({ observationRecord: f.record, contextBinding: f.binding });

  assert.equal(first.kind, 'OFFLINE_SHADOW_READINESS');
  assert.equal(first.schemaVersion, 1);
  assert.equal(first.readinessStatus, 'INCOMPLETE');
  assert.deepEqual(first.reasons, ['FIXTURE_CONTINUITY_UNPROVEN', 'V2_STAGE_RESULT_MISSING']);
  assert.deepEqual(first.missingEvidence, ['TRUSTED_REAL_FORMAT_FIXTURE', 'TRUSTED_V2_STAGE_RESULT']);
  assert.equal(first.authoritative, false);
  assert.equal(first.verificationScope, 'OFFLINE_SIMULATED');
  assert.equal(first.stageResultCompared, false);
  assert.equal(first.decision, 'HOLD');
  assert.equal(first.readinessDigest, second.readinessDigest);
  assert.ok(Object.isFrozen(first));
});

test('ordinary JSON projection and fixture claims never upgrade readiness', async t => {
  const f = await fixture(t);
  const report = await f.comparator.compare({ observationRecord: f.record, contextBinding: f.binding,
    v2Projection: { kind: 'STAGE_ADAPTER_RESULT', status: 'PASSED' },
    fixtureEvidence: { level: 'REAL_FORMAT_REDACTED', digest: sha('f') } });
  assert.equal(report.readinessStatus, 'INCOMPLETE');
  assert.deepEqual(report.reasons, ['UNTRUSTED_FIXTURE_EVIDENCE', 'UNTRUSTED_PROJECTION']);
  assert.equal(report.stageResultCompared, false);
  assert.equal(report.decision, 'HOLD');
});

test('comparator rejects clones and cross-authority records or bindings', async t => {
  const f = await fixture(t);
  await assert.rejects(f.comparator.compare({ observationRecord: structuredClone(f.record),
    contextBinding: f.binding }), /trusted observation record/i);
  await assert.rejects(f.comparator.compare({ observationRecord: f.record,
    contextBinding: structuredClone(f.binding) }), /trusted context binding/i);

  const other = await fixture(t);
  await assert.rejects(f.comparator.compare({ observationRecord: other.record,
    contextBinding: f.binding }), /trusted observation record/i);
  await assert.rejects(f.comparator.compare({ observationRecord: f.record,
    contextBinding: other.binding }), /trusted context binding/i);
});

test('comparator fails closed after manifest or source evidence drift', async t => {
  const changedManifest = await fixture(t);
  changedManifest.manifest.sequence++;
  await writeFile(changedManifest.manifestPath, JSON.stringify(changedManifest.manifest, null, 2) + '\n');
  await assert.rejects(changedManifest.comparator.compare({ observationRecord: changedManifest.record,
    contextBinding: changedManifest.binding }), /historical manifest|manifest.*changed/i);

  const changedSource = await fixture(t);
  await writeFile(join(changedSource.sourceRoot, changedSource.sources.site.path), '{"tampered":true}\n');
  await assert.rejects(changedSource.comparator.compare({ observationRecord: changedSource.record,
    contextBinding: changedSource.binding }), /digest/i);
});

test('incomplete binding reports source gaps and never becomes ready', async t => {
  const f = await fixture(t, { complete: false });
  const report = await f.comparator.compare({ observationRecord: f.record, contextBinding: f.binding });
  assert.equal(report.readinessStatus, 'INCOMPLETE');
  assert.ok(report.reasons.includes('CONTEXT_SOURCE_INCOMPLETE'));
  assert.ok(report.missingEvidence.includes('CONTEXT_SOURCE_MISSING:identity'));
  assert.equal(report.executionContextDigest, null);
  assert.equal(report.stageResultCompared, false);
});

test('comparator rejects unsupported fields and identity mismatch', async t => {
  const f = await fixture(t);
  await assert.rejects(f.comparator.compare({ observationRecord: f.record, contextBinding: f.binding,
    authority: true }), /unsupported fields/i);

  const otherRecord = await persistOtherRunRecord(f);
  await assert.rejects(f.comparator.compare({ observationRecord: otherRecord,
    contextBinding: f.binding }), error => error.code === 'IDENTITY_MISMATCH');
});

test('readiness digest changes when independently verified source evidence changes', async t => {
  const first = await fixture(t);
  const firstReport = await first.comparator.compare({ observationRecord: first.record,
    contextBinding: first.binding });
  const sourceBytes = await readFile(join(first.sourceRoot, first.sources.research.path));
  assert.equal(sha256(sourceBytes), first.sources.research.sha256);

  const second = await fixture(t, { targetPlatforms: ['steam'] });
  const secondReport = await second.comparator.compare({ observationRecord: second.record,
    contextBinding: second.binding });
  assert.notEqual(first.binding.sourceEvidenceDigest, second.binding.sourceEvidenceDigest);
  assert.notEqual(firstReport.executionContextDigest, secondReport.executionContextDigest);
  assert.notEqual(firstReport.readinessDigest, secondReport.readinessDigest);
});
