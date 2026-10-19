import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cp, mkdir, mkdtemp, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalJson } from '../../src/contracts/canonical-json.mjs';
import { deriveHomepageFixtureSnapshot } from '../../src/v2/homepage-fixture-derivation.mjs';
import { createOfflineHomepageFixtureContinuity } from '../../src/v2/offline-homepage-fixture-continuity.mjs';
import { createOfflineReadinessAggregator } from '../../src/v2/offline-readiness-aggregator.mjs';
import { createOfflineStageResultProvenance } from '../../src/v2/offline-stage-result-provenance.mjs';
import { createOfflineContextBinder } from '../../src/v2/production-context-binding.mjs';
import { createProductionObservation } from '../../src/v2/production-observation.mjs';
import { createOfflineObservationStore } from '../../src/v2/production-observation-store.mjs';

const stageIds = Object.freeze([
  'homepage-research',
  'keyword-research',
  'template-selection',
  'content-integration',
  'ui-ux-audit',
  'prelaunch-acceptance',
  'deployment-plan',
]);
const repoRoot = fileURLToPath(new URL('../../..', import.meta.url));
const committedFixtureRoot = join(repoRoot, 'agent/tests/fixtures/v2/homepage');
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
  const fixtureManifest = JSON.parse(await readFile(join(committedFixtureRoot, 'fixture-manifest.json'), 'utf8'));
  const source = sourceDescriptors(fixtureManifest);
  const [manifestBytes, reportBytes, iconBytes, completionBytes] = await Promise.all([
    readFile(join(repoRoot, source.manifest.path)),
    readFile(join(repoRoot, source.report.path)),
    readFile(join(repoRoot, source.icon.path)),
    readFile(join(repoRoot, source.completion.path)),
  ]);
  return { fixtureManifest, source, manifestBytes, reportBytes, iconBytes, completionBytes };
}

async function trustedHomepage(t, { completeContext = true } = {}) {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'p6f2a-homepage-')));
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
  const observationStore = createOfflineObservationStore({ legacyRoot, offlineRoot });
  const observationRecord = await observationStore.persist(snapshot);

  async function contextSource(name, value) {
    const path = `${name}.json`;
    const bytes = Buffer.from(`${canonicalJson(value)}\n`);
    await writeFile(join(sourceRoot, path), bytes);
    return { path, sha256: sha256(bytes) };
  }
  const contextValues = {
    identity: { runId: manifest.runId, stageId: 'homepage-research', attemptId: stage.checkpoint.attempt,
      requestedOperation: 'observe-legacy-stage', mappingVersion: 'stage-identity-v1' },
    code: { sourceCommit: '1'.repeat(40), workspaceDigest: sha('2'), skillLockDigest: sha('3'),
      schemaBundleDigest: sha('4'), policyVersion: 1, featureGate: 'legacy' },
    inputs: [{ path: 'inputs/raw.md', sha256: sha('5'), kind: 'raw-keywords', lineageDigest: null }],
    execution: { permissionProfile: 'offline-fixture', budget: 0, timeoutMs: 1, hostCapabilities: [] },
    research: { evidencePlanDigest: null, recoveryDigest: null, serviceDecisions: [], targetPlatforms: [] },
    site: { siteRevision: manifest.inputs.siteRevision, domain: null, baselineDigest: null },
  };
  const sources = completeContext ? Object.fromEntries(await Promise.all(Object.entries(contextValues)
    .map(async ([name, value]) => [name, await contextSource(name, value)]))) : {};
  const contextBinder = createOfflineContextBinder({ sourceRoot, observationStore });
  const contextBinding = await contextBinder.bind({ observationRecord, sources });
  const sourceFiles = new Map(Object.values(source).map(item => [item.path,
    item.role === 'RUN_MANIFEST' ? manifestBytes :
      item.role === 'HOMEPAGE_REPORT' ? reportBytes :
        item.role === 'ICON_ARCHIVE' ? iconBytes : completionBytes]));
  const fixturePayload = { fixtureManifest: derived.fixtureManifest, sourceFiles,
    derivedFiles: derived.derivedFiles, zipBytes: iconBytes };
  const stageResultProvenance = createOfflineStageResultProvenance({ observationStore, contextBinder });
  const stageResult = completeContext ? await stageResultProvenance.run({ observationRecord, contextBinding,
    canonicalStageId: 'homepage-research', fixturePayload }) : null;
  const fixtureContinuity = createOfflineHomepageFixtureContinuity({ repositoryRoot, observationStore,
    contextBinder, stageResultProvenance });
  const fixtureEvidence = stageResult ? await fixtureContinuity.prove({ observationRecord, contextBinding,
    stageResult }) : null;
  const aggregator = createOfflineReadinessAggregator({ observationStore, contextBinder,
    stageResultProvenance, fixtureContinuity });
  return { root, repositoryRoot, source, observationRecord, contextBinding, stageResult,
    fixtureEvidence, aggregator };
}

async function directoryDigest(root) {
  const items = [];
  async function walk(path, relativePath = '') {
    const entries = await readdir(path, { withFileTypes: true });
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      const absolute = join(path, entry.name);
      const relative = relativePath ? `${relativePath}/${entry.name}` : entry.name;
      if (entry.isDirectory()) await walk(absolute, relative);
      else items.push([relative, sha256(await readFile(absolute))]);
    }
  }
  await walk(root);
  return sha256(canonicalJson(items));
}

async function emptyAuthorities(t) {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'p6f2a-readiness-')));
  t.after(() => rm(root, { recursive: true, force: true }));
  const legacyRoot = join(root, 'legacy');
  const offlineRoot = join(root, 'offline');
  const sourceRoot = join(root, 'sources');
  await Promise.all([legacyRoot, offlineRoot, sourceRoot].map(path => mkdir(path, { recursive: true })));
  const observationStore = createOfflineObservationStore({ legacyRoot, offlineRoot });
  const contextBinder = createOfflineContextBinder({ sourceRoot, observationStore });
  const stageResultProvenance = createOfflineStageResultProvenance({ observationStore, contextBinder });
  const fixtureContinuity = createOfflineHomepageFixtureContinuity({ repositoryRoot: root,
    observationStore, contextBinder, stageResultProvenance });
  return { observationStore, contextBinder, stageResultProvenance, fixtureContinuity };
}

function assertDeepFrozen(value) {
  assert.ok(Object.isFrozen(value));
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) assertDeepFrozen(child);
  }
}

test('no evidence yields a deterministic seven-stage HOLD report without authority promotion', async t => {
  const aggregator = createOfflineReadinessAggregator(await emptyAuthorities(t));
  const first = await aggregator.aggregate({ runId: 'wallpaper-engine-002' });
  const second = await aggregator.aggregate({ runId: 'wallpaper-engine-002' });

  assert.equal(first.kind, 'SEVEN_STAGE_OFFLINE_READINESS');
  assert.equal(first.schemaVersion, 1);
  assert.equal(first.producer, 'P6_F2_A_READINESS_AGGREGATOR');
  assert.equal(first.authoritative, false);
  assert.equal(first.verificationScope, 'OFFLINE_SIMULATED');
  assert.equal(first.mappingVersion, 'stage-identity-v1');
  assert.equal(first.decision, 'HOLD');
  assert.equal(first.productionReady, false);
  assert.equal(first.authoritySwitchAllowed, false);
  assert.equal(first.deploymentExecuted, false);
  assert.equal(first.deploymentExecution, 'BLOCKED');
  assert.deepEqual(first.stages.map(stage => stage.canonicalStageId), stageIds);
  assert.ok(first.stages.every(stage => stage.classification === 'PARTIAL'));
  assert.equal(first.stages[0].firstMissingTransition, 'LEGACY_OBSERVATION');
  assert.ok(first.stages.every(stage => stage.authoritative === false));
  assert.equal(first.readinessDigest, second.readinessDigest);
  assert.match(first.readinessDigest, /^[a-f0-9]{64}$/);
  assertDeepFrozen(first);
});

test('factory and aggregate inputs reject comparator injection and unsupported fields', async t => {
  const authorities = await emptyAuthorities(t);
  assert.throws(() => createOfflineReadinessAggregator({ ...authorities,
    homepageComparator: { compare: async value => value } }), /unsupported fields/i);

  const aggregator = createOfflineReadinessAggregator(authorities);
  const other = await emptyAuthorities(t);
  assert.throws(() => createOfflineReadinessAggregator({ ...authorities,
    contextBinder: other.contextBinder }), error => error.code === 'TRUST_LEVEL_INSUFFICIENT');
  assert.throws(() => createOfflineReadinessAggregator({ ...authorities,
    stageResultProvenance: { assertTrustedResult: value => value } }),
  error => error.code === 'TRUST_LEVEL_INSUFFICIENT');
  await assert.rejects(aggregator.aggregate({ runId: 'run-1', authority: true }),
    /unsupported fields/i);
  await assert.rejects(aggregator.aggregate({ runId: '' }), /non-empty string/i);
});

test('an authentic homepage chain upgrades only homepage to VERIFIED_OFFLINE_ONLY', async t => {
  const f = await trustedHomepage(t);
  const evidence = { observationRecord: f.observationRecord, contextBinding: f.contextBinding,
    v2Projection: f.stageResult, fixtureEvidence: f.fixtureEvidence };
  const first = await f.aggregator.aggregate({ runId: 'wallpaper-engine-002', homepageEvidence: evidence });
  const second = await f.aggregator.aggregate({ runId: 'wallpaper-engine-002', homepageEvidence: evidence });

  const homepage = first.stages[0];
  assert.equal(homepage.classification, 'VERIFIED_OFFLINE_ONLY');
  assert.equal(homepage.firstMissingTransition, null);
  assert.deepEqual(homepage.missingEvidence, []);
  assert.equal(homepage.trustedOfflineComparison, true);
  assert.equal(homepage.shadowDiffVersion, 2);
  assert.match(homepage.comparisonDigest, /^[a-f0-9]{64}$/);
  assert.ok(Object.values(homepage.evidenceReferences).every(value => /^[a-f0-9]{64}$/.test(value)));
  assert.ok(first.stages.slice(1).every(stage => stage.classification === 'PARTIAL'));
  assert.equal(first.readinessDigest, second.readinessDigest);
  assert.equal(first.decision, 'HOLD');
  assert.equal(first.productionReady, false);
  assert.equal(first.deploymentExecution, 'BLOCKED');
});

test('missing trusted context, stage result, or fixture reports the first missing transition', async t => {
  const incomplete = await trustedHomepage(t, { completeContext: false });
  const contextReport = await incomplete.aggregator.aggregate({ runId: 'wallpaper-engine-002',
    homepageEvidence: { observationRecord: incomplete.observationRecord,
      contextBinding: incomplete.contextBinding, v2Projection: null, fixtureEvidence: null } });
  assert.equal(contextReport.stages[0].classification, 'PARTIAL');
  assert.equal(contextReport.stages[0].firstMissingTransition, 'CONTEXT_BINDING');

  const complete = await trustedHomepage(t);
  const stageReport = await complete.aggregator.aggregate({ runId: 'wallpaper-engine-002',
    homepageEvidence: { observationRecord: complete.observationRecord,
      contextBinding: complete.contextBinding, v2Projection: null, fixtureEvidence: null } });
  assert.equal(stageReport.stages[0].firstMissingTransition, 'STAGE_RESULT_PROVENANCE');

  const fixtureReport = await complete.aggregator.aggregate({ runId: 'wallpaper-engine-002',
    homepageEvidence: { observationRecord: complete.observationRecord,
      contextBinding: complete.contextBinding, v2Projection: complete.stageResult, fixtureEvidence: null } });
  assert.equal(fixtureReport.stages[0].firstMissingTransition, 'FIXTURE_CONTINUITY');
});

test('cloned trust objects never promote readiness and unsupported evidence fields are rejected', async t => {
  const f = await trustedHomepage(t);
  const clonedResult = await f.aggregator.aggregate({ runId: 'wallpaper-engine-002',
    homepageEvidence: { observationRecord: f.observationRecord, contextBinding: f.contextBinding,
      v2Projection: structuredClone(f.stageResult), fixtureEvidence: f.fixtureEvidence } });
  assert.equal(clonedResult.stages[0].classification, 'PARTIAL');
  assert.equal(clonedResult.stages[0].firstMissingTransition, 'STAGE_RESULT_PROVENANCE');

  const clonedFixture = await f.aggregator.aggregate({ runId: 'wallpaper-engine-002',
    homepageEvidence: { observationRecord: f.observationRecord, contextBinding: f.contextBinding,
      v2Projection: f.stageResult, fixtureEvidence: structuredClone(f.fixtureEvidence) } });
  assert.equal(clonedFixture.stages[0].classification, 'PARTIAL');
  assert.equal(clonedFixture.stages[0].firstMissingTransition, 'FIXTURE_CONTINUITY');

  await assert.rejects(f.aggregator.aggregate({ runId: 'wallpaper-engine-002',
    homepageEvidence: { observationRecord: f.observationRecord, contextBinding: f.contextBinding,
      v2Projection: f.stageResult, fixtureEvidence: f.fixtureEvidence, verified: true } }),
  /unsupported fields/i);
});

test('cross-run identity and historical source drift fail closed', async t => {
  const crossRun = await trustedHomepage(t);
  await assert.rejects(crossRun.aggregator.aggregate({ runId: 'another-run',
    homepageEvidence: { observationRecord: crossRun.observationRecord,
      contextBinding: crossRun.contextBinding, v2Projection: crossRun.stageResult,
      fixtureEvidence: crossRun.fixtureEvidence } }), error => error.code === 'IDENTITY_MISMATCH');
  const wrongAttempt = structuredClone(crossRun.observationRecord);
  wrongAttempt.identity.attemptId += 1;
  await assert.rejects(crossRun.aggregator.aggregate({ runId: 'wallpaper-engine-002',
    homepageEvidence: { observationRecord: wrongAttempt,
      contextBinding: crossRun.contextBinding, v2Projection: crossRun.stageResult,
      fixtureEvidence: crossRun.fixtureEvidence } }), error => error.code === 'TRUST_LEVEL_INSUFFICIENT');

  const drift = await trustedHomepage(t);
  await writeFile(join(drift.repositoryRoot, drift.source.report.path), 'tampered');
  await assert.rejects(drift.aggregator.aggregate({ runId: 'wallpaper-engine-002',
    homepageEvidence: { observationRecord: drift.observationRecord,
      contextBinding: drift.contextBinding, v2Projection: drift.stageResult,
      fixtureEvidence: drift.fixtureEvidence } }), /digest|drift/i);
});

test('aggregation is read-only across the complete trusted homepage comparison', async t => {
  const f = await trustedHomepage(t);
  const before = await directoryDigest(f.root);
  await f.aggregator.aggregate({ runId: 'wallpaper-engine-002',
    homepageEvidence: { observationRecord: f.observationRecord,
      contextBinding: f.contextBinding, v2Projection: f.stageResult,
      fixtureEvidence: f.fixtureEvidence } });
  assert.equal(await directoryDigest(f.root), before);
});
