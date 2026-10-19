import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cp, mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalJson } from '../../src/contracts/canonical-json.mjs';
import { deriveHomepageFixtureSnapshot } from '../../src/v2/homepage-fixture-derivation.mjs';
import { createOfflineHomepageFixtureContinuity } from '../../src/v2/offline-homepage-fixture-continuity.mjs';
import { createOfflineShadowEvidenceComparator } from '../../src/v2/offline-shadow-comparator.mjs';
import { createExactShadowComparison, createShadowDiff } from '../../src/v2/shadow-comparator.mjs';
import { createOfflineContextBinder } from '../../src/v2/production-context-binding.mjs';
import { createProductionObservation } from '../../src/v2/production-observation.mjs';
import { createOfflineObservationStore } from '../../src/v2/production-observation-store.mjs';
import { createOfflineStageResultProvenance } from '../../src/v2/offline-stage-result-provenance.mjs';

const repoRoot = fileURLToPath(new URL('../../..', import.meta.url));
const fixtureRoot = join(repoRoot, 'agent/tests/fixtures/v2/homepage');
const sha256 = value => createHash('sha256').update(value).digest('hex');
const sha = value => value.repeat(64);

function sourceDescriptors(fixtureManifest) {
  const item = role => fixtureManifest.sources.find(source => source.role === role);
  return Object.freeze({
    manifest: { role: 'RUN_MANIFEST', path: item('RUN_MANIFEST').sourceRelativePath,
      sha256: item('RUN_MANIFEST').sourceSha256 },
    report: { role: 'HOMEPAGE_REPORT', path: item('HOMEPAGE_REPORT').sourceRelativePath,
      sha256: item('HOMEPAGE_REPORT').sourceSha256 },
    icon: { role: 'ICON_ARCHIVE', path: item('ICON_ARCHIVE').sourceRelativePath,
      sha256: item('ICON_ARCHIVE').sourceSha256 },
    completion: { role: 'COMPLETION_REPORT', path: item('COMPLETION_REPORT').sourceRelativePath,
      sha256: item('COMPLETION_REPORT').sourceSha256 },
  });
}

async function committedFixture() {
  const fixtureManifest = JSON.parse(await readFile(join(fixtureRoot, 'fixture-manifest.json'), 'utf8'));
  const source = sourceDescriptors(fixtureManifest);
  const [manifestBytes, reportBytes, iconBytes, completionBytes] = await Promise.all([
    readFile(join(repoRoot, source.manifest.path)), readFile(join(repoRoot, source.report.path)),
    readFile(join(repoRoot, source.icon.path)), readFile(join(repoRoot, source.completion.path)),
  ]);
  return { fixtureManifest, source, manifestBytes, reportBytes, iconBytes, completionBytes };
}

async function setup(t) {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'p6e-continuity-')));
  t.after(() => rm(root, { recursive: true, force: true }));
  const repositoryRoot = join(root, 'repo');
  const legacyRoot = join(repositoryRoot, 'agent');
  const offlineRoot = join(root, 'offline');
  const sourceRoot = join(root, 'context');
  const fixtureDirectory = join(repositoryRoot, 'agent/tests/fixtures/v2/homepage');
  await Promise.all([offlineRoot, sourceRoot, fixtureDirectory].map(path => mkdir(path, { recursive: true })));

  const committed = await committedFixture();
  const manifest = JSON.parse(committed.manifestBytes.toString('utf8'));
  const stage = manifest.stages[0];
  for (const artifact of stage.artifacts) {
    const target = join(repositoryRoot, artifact.path.slice(repoRoot.length + 1));
    await mkdir(dirname(target), { recursive: true });
    await cp(artifact.path, target);
    artifact.path = target;
    artifact.sourcePath = target;
  }
  const manifestPath = join(legacyRoot, 'runs', manifest.runId, 'manifest.json');
  await mkdir(dirname(manifestPath), { recursive: true });
  const manifestBytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);
  await writeFile(manifestPath, manifestBytes);

  const pathForKind = kind => stage.artifacts.find(artifact => artifact.kind === kind).path;
  const reportBytes = await readFile(pathForKind('HOMEPAGE_RESEARCH.md'));
  const iconBytes = await readFile(pathForKind('ICON.zip'));
  const completionBytes = await readFile(pathForKind('VALIDATION_REPORT'));
  const source = Object.freeze({
    manifest: { role: 'RUN_MANIFEST', path: `agent/runs/${manifest.runId}/manifest.json`,
      sha256: sha256(manifestBytes) },
    report: { role: 'HOMEPAGE_REPORT', path: pathForKind('HOMEPAGE_RESEARCH.md').slice(repositoryRoot.length + 1),
      sha256: sha256(reportBytes) },
    icon: { role: 'ICON_ARCHIVE', path: pathForKind('ICON.zip').slice(repositoryRoot.length + 1),
      sha256: sha256(iconBytes) },
    completion: { role: 'COMPLETION_REPORT', path: pathForKind('VALIDATION_REPORT').slice(repositoryRoot.length + 1),
      sha256: sha256(completionBytes) },
  });
  const derived = deriveHomepageFixtureSnapshot({ source, manifestBytes, reportBytes, iconBytes,
    completionBytes });
  await writeFile(join(fixtureDirectory, 'fixture-manifest.json'),
    `${JSON.stringify(derived.fixtureManifest, null, 2)}\n`);
  for (const [path, bytes] of derived.derivedFiles) await writeFile(join(fixtureDirectory, path), bytes);

  let snapshot;
  const observation = createProductionObservation({ mode: 'SHADOW_READ_ONLY',
    observer: async value => { snapshot = value; } });
  await observation.observeLegacyCommit({ runId: manifest.runId, canonicalStageId: 'homepage-research',
    attemptId: stage.checkpoint.attempt, legacyInputDigest: stage.checkpoint.inputDigest,
    sourceRevision: manifest.inputs.siteRevision, checkpoint: stage.checkpoint,
    artifacts: stage.artifacts.map(artifact => ({ sha256: artifact.sha256 })),
    legacyStatus: stage.status, deploymentExecuted: manifest.deploymentExecuted,
    committedSequence: manifest.sequence });
  const store = createOfflineObservationStore({ legacyRoot, offlineRoot });
  const record = await store.persist(snapshot);

  async function contextSource(name, value) {
    const path = `${name}.json`;
    const bytes = Buffer.from(`${canonicalJson(value)}\n`);
    await writeFile(join(sourceRoot, path), bytes);
    return { path, sha256: sha256(bytes) };
  }
  const values = {
    identity: { runId: manifest.runId, stageId: 'homepage-research', attemptId: stage.checkpoint.attempt,
      requestedOperation: 'observe-legacy-stage', mappingVersion: 'stage-identity-v1' },
    code: { sourceCommit: '1'.repeat(40), workspaceDigest: sha('2'), skillLockDigest: sha('3'),
      schemaBundleDigest: sha('4'), policyVersion: 1, featureGate: 'legacy' },
    inputs: [{ path: 'inputs/raw.md', sha256: sha('5'), kind: 'raw-keywords', lineageDigest: null }],
    execution: { permissionProfile: 'offline-fixture', budget: 0, timeoutMs: 1, hostCapabilities: [] },
    research: { evidencePlanDigest: null, recoveryDigest: null, serviceDecisions: [], targetPlatforms: [] },
    site: { siteRevision: manifest.inputs.siteRevision, domain: null, baselineDigest: null },
  };
  const sources = Object.fromEntries(await Promise.all(Object.entries(values).map(async ([name, value]) =>
    [name, await contextSource(name, value)])));
  const binder = createOfflineContextBinder({ sourceRoot, observationStore: store });
  const binding = await binder.bind({ observationRecord: record, sources });
  const sourceFiles = new Map(Object.values(source).map(item => [item.path,
    item.role === 'RUN_MANIFEST' ? manifestBytes :
      item.role === 'HOMEPAGE_REPORT' ? reportBytes :
        item.role === 'ICON_ARCHIVE' ? iconBytes : completionBytes]));
  const fixturePayload = { fixtureManifest: derived.fixtureManifest, sourceFiles,
    derivedFiles: derived.derivedFiles, zipBytes: iconBytes };
  const provenance = createOfflineStageResultProvenance({ observationStore: store, contextBinder: binder });
  const stageResult = await provenance.run({ observationRecord: record, contextBinding: binding,
    canonicalStageId: 'homepage-research', fixturePayload });
  const continuity = createOfflineHomepageFixtureContinuity({ repositoryRoot, observationStore: store,
    contextBinder: binder, stageResultProvenance: provenance });
  return { repositoryRoot, fixtureDirectory, source, store, record, binder, binding, provenance,
    stageResult, continuity };
}

test('pure derivation recreates the committed homepage fixture byte-for-byte', async () => {
  const committed = await committedFixture();
  const derived = deriveHomepageFixtureSnapshot(committed);
  assert.equal(canonicalJson(derived.fixtureManifest), canonicalJson(committed.fixtureManifest));
  for (const item of committed.fixtureManifest.sources.filter(source => source.derivedPath)) {
    assert.deepEqual(derived.derivedFiles.get(item.derivedPath),
      await readFile(join(fixtureRoot, item.derivedPath)));
  }
});

test('continuity authority proves and revalidates exact historical source and derived bytes', async t => {
  const f = await setup(t);
  const first = await f.continuity.prove({ observationRecord: f.record, contextBinding: f.binding,
    stageResult: f.stageResult });
  const second = await f.continuity.prove({ observationRecord: f.record, contextBinding: f.binding,
    stageResult: f.stageResult });
  assert.equal(first.kind, 'OFFLINE_HOMEPAGE_FIXTURE_CONTINUITY');
  assert.equal(first.continuityStatus, 'VERIFIED');
  assert.equal(first.authoritative, false);
  assert.equal(first.verificationScope, 'OFFLINE_SIMULATED');
  assert.equal(first.continuityDigest, second.continuityDigest);
  assert.equal(f.continuity.assertTrustedEvidence(first), first);
  assert.equal(await f.continuity.revalidateEvidence(first), first);
  assert.ok(Object.isFrozen(first));
});

test('clones, cross-instance evidence and cross-authority provenance are rejected', async t => {
  const f = await setup(t);
  const evidence = await f.continuity.prove({ observationRecord: f.record, contextBinding: f.binding,
    stageResult: f.stageResult });
  assert.throws(() => f.continuity.assertTrustedEvidence(structuredClone(evidence)),
    error => error.code === 'TRUST_LEVEL_INSUFFICIENT');
  const otherContinuity = createOfflineHomepageFixtureContinuity({ repositoryRoot: f.repositoryRoot,
    observationStore: f.store, contextBinder: f.binder, stageResultProvenance: f.provenance });
  assert.throws(() => otherContinuity.assertTrustedEvidence(evidence),
    error => error.code === 'TRUST_LEVEL_INSUFFICIENT');
  const other = await setup(t);
  assert.throws(() => createOfflineHomepageFixtureContinuity({ repositoryRoot: other.repositoryRoot,
    observationStore: other.store, contextBinder: other.binder, stageResultProvenance: f.provenance }),
  error => error.code === 'TRUST_LEVEL_INSUFFICIENT');
});

test('source, derived and symlink drift fail closed during revalidation', async t => {
  const changedSource = await setup(t);
  const sourceEvidence = await changedSource.continuity.prove({ observationRecord: changedSource.record,
    contextBinding: changedSource.binding, stageResult: changedSource.stageResult });
  await writeFile(join(changedSource.repositoryRoot, changedSource.source.report.path), 'tampered');
  await assert.rejects(changedSource.continuity.revalidateEvidence(sourceEvidence), /digest|drift/i);

  const changedDerived = await setup(t);
  const derivedEvidence = await changedDerived.continuity.prove({ observationRecord: changedDerived.record,
    contextBinding: changedDerived.binding, stageResult: changedDerived.stageResult });
  await writeFile(join(changedDerived.fixtureDirectory, 'homepage-research.redacted.md'), 'tampered');
  await assert.rejects(changedDerived.continuity.revalidateEvidence(derivedEvidence), /digest|drift/i);

  const linked = await setup(t);
  const reportPath = join(linked.repositoryRoot, linked.source.report.path);
  const moved = `${reportPath}.real`;
  await cp(reportPath, moved);
  await rm(reportPath);
  await symlink(moved, reportPath);
  await assert.rejects(linked.continuity.prove({ observationRecord: linked.record,
    contextBinding: linked.binding, stageResult: linked.stageResult }), /symlink/i);
});

test('trusted continuity and stage result produce a non-authoritative homepage shadow diff', async t => {
  const f = await setup(t);
  const fixtureEvidence = await f.continuity.prove({ observationRecord: f.record,
    contextBinding: f.binding, stageResult: f.stageResult });
  const comparator = createOfflineShadowEvidenceComparator({ observationStore: f.store,
    contextBinder: f.binder, stageResultProvenance: f.provenance,
    fixtureContinuity: f.continuity });
  const report = await comparator.compare({ observationRecord: f.record,
    contextBinding: f.binding, v2Projection: f.stageResult, fixtureEvidence });
  const repeated = await comparator.compare({ observationRecord: f.record,
    contextBinding: f.binding, v2Projection: f.stageResult, fixtureEvidence });
  assert.equal(report.trustedStageResult, true);
  assert.equal(report.fixtureContinuityVerified, true);
  assert.equal(report.readinessStatus, 'OFFLINE_COMPARISON_COMPLETE');
  assert.equal(report.stageResultCompared, true);
  assert.equal(report.decision, 'HOLD');
  assert.deepEqual(report.reasons, []);
  assert.deepEqual(report.missingEvidence, []);
  assert.equal(report.shadowDiff.kind, 'SHADOW_DIFF');
  assert.equal(report.shadowDiff.canonicalStageId, 'homepage-research');
  assert.equal(report.shadowDiff.authoritative, 'LEGACY');
  assert.equal(report.shadowDiff.blocking, false);
  assert.equal(report.shadowDiff.diffs.length, 8);
  assert.ok(report.shadowDiff.diffs.every(diff => diff.diffClass === 'MATCH'));
  assert.deepEqual(report.shadowDiff.diffs.map(diff => diff.fieldPath), [
    '/identity/runId',
    '/identity/stage',
    '/identity/attempt',
    '/status',
    '/authority',
    '/artifacts/legacyBusiness',
    '/artifacts/v2AdapterResult',
    '/adapter/inputDigest',
  ]);
  assert.equal(report.readinessDigest, repeated.readinessDigest);
  assert.equal(report.shadowDiff.comparisonDigest, repeated.shadowDiff.comparisonDigest);
});

test('exact business comparisons classify unequal values as blocking instead of false MATCH', () => {
  const comparison = createExactShadowComparison({ fieldPath: '/artifacts/legacyBusiness',
    legacyValue: ['a'.repeat(64)], v2Value: ['b'.repeat(64)],
    matchReasonCode: 'BUSINESS_ARTIFACTS_EQUAL',
    mismatchReasonCode: 'BUSINESS_ARTIFACTS_INCOMPATIBLE', evidenceReferences: ['fixture-continuity'] });
  assert.equal(comparison.diffClass, 'V2_INCOMPATIBLE');
  assert.equal(comparison.reasonCode, 'BUSINESS_ARTIFACTS_INCOMPATIBLE');
  const report = createShadowDiff({ runId: 'wallpaper-engine-002', canonicalStageId: 'homepage-research',
    mappingVersion: 'stage-identity-v1', attemptId: 1, contextDigest: 'c'.repeat(64),
    legacySnapshotDigest: 'd'.repeat(64), v2ResultDigest: 'e'.repeat(64),
    comparisons: [comparison] });
  assert.equal(report.blocking, true);
  assert.equal(report.diffs[0].blocking, true);
});

test('cloned, cross-instance and stale continuity never enters comparison', async t => {
  const cloned = await setup(t);
  const clonedEvidence = await cloned.continuity.prove({ observationRecord: cloned.record,
    contextBinding: cloned.binding, stageResult: cloned.stageResult });
  const clonedComparator = createOfflineShadowEvidenceComparator({ observationStore: cloned.store,
    contextBinder: cloned.binder, stageResultProvenance: cloned.provenance,
    fixtureContinuity: cloned.continuity });
  const cloneReport = await clonedComparator.compare({ observationRecord: cloned.record,
    contextBinding: cloned.binding, v2Projection: cloned.stageResult,
    fixtureEvidence: structuredClone(clonedEvidence) });
  assert.equal(cloneReport.fixtureContinuityVerified, false);
  assert.equal(cloneReport.stageResultCompared, false);
  assert.ok(cloneReport.reasons.includes('UNTRUSTED_FIXTURE_EVIDENCE'));

  const crossInstance = await setup(t);
  const crossEvidence = await crossInstance.continuity.prove({ observationRecord: crossInstance.record,
    contextBinding: crossInstance.binding, stageResult: crossInstance.stageResult });
  const otherContinuity = createOfflineHomepageFixtureContinuity({ repositoryRoot: crossInstance.repositoryRoot,
    observationStore: crossInstance.store, contextBinder: crossInstance.binder,
    stageResultProvenance: crossInstance.provenance });
  const crossComparator = createOfflineShadowEvidenceComparator({ observationStore: crossInstance.store,
    contextBinder: crossInstance.binder, stageResultProvenance: crossInstance.provenance,
    fixtureContinuity: otherContinuity });
  const crossReport = await crossComparator.compare({ observationRecord: crossInstance.record,
    contextBinding: crossInstance.binding, v2Projection: crossInstance.stageResult,
    fixtureEvidence: crossEvidence });
  assert.equal(crossReport.fixtureContinuityVerified, false);
  assert.equal(crossReport.stageResultCompared, false);

  const stale = await setup(t);
  const staleEvidence = await stale.continuity.prove({ observationRecord: stale.record,
    contextBinding: stale.binding, stageResult: stale.stageResult });
  const staleComparator = createOfflineShadowEvidenceComparator({ observationStore: stale.store,
    contextBinder: stale.binder, stageResultProvenance: stale.provenance,
    fixtureContinuity: stale.continuity });
  await writeFile(join(stale.repositoryRoot, stale.source.report.path), 'tampered');
  await assert.rejects(staleComparator.compare({ observationRecord: stale.record,
    contextBinding: stale.binding, v2Projection: stale.stageResult, fixtureEvidence: staleEvidence }),
  /digest|drift/i);
});
