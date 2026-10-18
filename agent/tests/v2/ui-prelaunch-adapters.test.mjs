import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApprovalRequest, createTestApprovalHarness } from '../../src/approval/approval-engine.mjs';
import { authorizeCanonicalHandoff, createCanonicalHandoff, createTestValidatedInputHarness,
  partialHandoffPurposePayload } from '../../src/handoff-v2/canonical-handoff.mjs';
import { replayContentIntegration, contentReplayPayloadDigest } from '../../src/v2/adapters/content-integration.mjs';
import { captureSimulatedBuildEvidence, assertTrustedBuildEvidence,
  buildRecordDigest } from '../../src/v2/host/build-evidence-adapter.mjs';
import { replaySimulatedRouteProof, assertTrustedRouteAssessment,
  routeRecordDigest } from '../../src/v2/host/route-proof-adapter.mjs';
import { replayUiUxAudit, assertTrustedUiAudit, uiCaptureDigest, uiFixtureDigest,
  uiReplayPayloadDigest } from '../../src/v2/adapters/ui-ux-audit.mjs';
import { replayPrelaunchAcceptance, prelaunchFixtureDigest,
  prelaunchReplayPayloadDigest } from '../../src/v2/adapters/prelaunch-acceptance.mjs';

const contentPath = fileURLToPath(new URL('../fixtures/v2/content/fixture-manifest.json', import.meta.url));
const uiPath = fileURLToPath(new URL('../fixtures/v2/ui/fixture-manifest.json', import.meta.url));
const prelaunchPath = fileURLToPath(new URL('../fixtures/v2/prelaunch/fixture-manifest.json', import.meta.url));
const json = async path => JSON.parse(await readFile(path, 'utf8'));

const stageInput = (stage, manifest, payloadDigest) => ({
  kind: 'STAGE_ADAPTER_INPUT', schemaVersion: 1, producer: 'V2_OFFLINE_HOST', mode: 'OFFLINE',
  runId: manifest.runId, canonicalStageId: stage, mappingVersion: 'stage-identity-v1',
  contextDigest: manifest.contextDigest, featureGate: 'shadow', gateBindingDigest: 'd'.repeat(64),
  payloadDigest,
});

function candidateForContent(manifest) {
  const validated = createTestValidatedInputHarness().validate({
    runId: manifest.runId, stageId: 'stage-2', attemptId: manifest.sourceAttempt,
    contextDigest: manifest.contextDigest, schemaBundleDigest: manifest.schemaBundleDigest,
    recoveryDigest: manifest.recoveryDigest, evidenceOutcomeDigest: manifest.evidenceOutcomeDigest,
    siteRevision: manifest.siteRevision, domain: manifest.domain, pendingRows: manifest.pendingRows,
    materials: manifest.pages.map(page => ({ keywordId: page.pageId, keyword: page.keyword,
      canonicalStatus: page.materialStatus, gapIds: page.gapIds, sourceDigest: page.upstreamSourceDigest,
      contentAccepted: page.upstreamEligibility === 'ELIGIBLE' })),
  });
  return createCanonicalHandoff({ validatedInput: validated, consumerStage: 'stage-4' });
}

async function publication(t) {
  const manifest = await json(contentPath);
  const candidate = candidateForContent(manifest);
  const root = await mkdtemp(join(tmpdir(), 'p5-f-publication-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const approvals = await createTestApprovalHarness({ rootDirectory: root, namespace: 'p5-f-publication' });
  const binding = { runId: candidate.runId, stageId: candidate.stageId, attemptId: candidate.attemptId,
    contextDigest: candidate.contextDigest, schemaBundleDigest: candidate.schemaBundleDigest,
    purpose: 'PARTIAL_HANDOFF', purposePayload: partialHandoffPurposePayload(candidate) };
  const reference = await approvals.authority.issue(createApprovalRequest(binding),
    { decision: 'APPROVED', nowMs: 1000, expiresAtMs: 2000 });
  const consumption = await approvals.consumer.consume(reference, { ...binding, nowMs: 1500 });
  const handoff = authorizeCanonicalHandoff({ candidate, approvalConsumption: consumption });
  const adapterInput = stageInput('content-integration', manifest,
    contentReplayPayloadDigest({ fixtureManifest: manifest }));
  return replayContentIntegration({ fixtureManifest: manifest, adapterInput, handoff,
    projection: { stageSatisfied: false, status: 'PARTIAL' } }).publicationDecision;
}

const resignUi = value => { value.fixtureDigest = uiFixtureDigest(value); return value; };
const resignCapture = value => { value.captureDigest = uiCaptureDigest(value); return value; };
const resignRoute = value => { value.recordDigest = routeRecordDigest(value); return value; };
const resignBuild = value => { value.recordDigest = buildRecordDigest(value); return value; };
const resignPrelaunch = value => { value.fixtureDigest = prelaunchFixtureDigest(value); return value; };

async function replayHappy(t) {
  const [uiFixture, prelaunchFixture, decision] = await Promise.all([json(uiPath), json(prelaunchPath), publication(t)]);
  const buildEvidence = captureSimulatedBuildEvidence({ buildRecord: prelaunchFixture.build });
  const uiAudit = replayUiUxAudit({ fixtureManifest: uiFixture, publicationDecision: decision, buildEvidence,
    adapterInput: stageInput('ui-ux-audit', uiFixture,
      uiReplayPayloadDigest({ fixtureManifest: uiFixture, buildEvidence })) });
  const routeAssessment = replaySimulatedRouteProof({ routeRecord: prelaunchFixture.route,
    publicationDecision: decision, buildEvidence });
  const prelaunch = replayPrelaunchAcceptance({ fixtureManifest: prelaunchFixture,
    publicationDecision: decision, buildEvidence, uiAudit: uiAudit.auditManifest, routeAssessment,
    adapterInput: stageInput('prelaunch-acceptance', prelaunchFixture,
      prelaunchReplayPayloadDigest({ fixtureManifest: prelaunchFixture, buildEvidence,
        uiAudit: uiAudit.auditManifest, routeAssessment })) });
  return { uiFixture, prelaunchFixture, decision, buildEvidence, uiAudit, routeAssessment, prelaunch };
}

test('complete six-viewport and closed-world fixtures remain explicitly offline and non-authoritative', async t => {
  const replay = await replayHappy(t);
  assert.equal(replay.buildEvidence.result, 'OFFLINE_SIMULATED_VERIFIED');
  assert.equal(replay.uiAudit.auditManifest.result, 'OFFLINE_SIMULATED_VERIFIED');
  assert.equal(replay.uiAudit.stageResult.status, 'COMPLETED');
  assert.equal(replay.routeAssessment.result, 'OFFLINE_SIMULATED_VERIFIED');
  assert.equal(replay.routeAssessment.publicationProof.status, 'VERIFIED');
  assert.equal(replay.prelaunch.acceptanceManifest.result, 'OFFLINE_SIMULATED_VERIFIED');
  assert.equal(replay.prelaunch.stageResult.status, 'COMPLETED');
  for (const value of [replay.buildEvidence, replay.uiAudit.auditManifest,
    replay.routeAssessment, replay.prelaunch.acceptanceManifest]) {
    assert.equal(value.classification, 'OFFLINE_STUB');
    assert.equal(value.authoritative, false);
    assert.equal(Object.isFrozen(value), true);
  }
  assert.deepEqual(replay.uiAudit.auditManifest.viewportWidths, [360, 390, 768, 1024, 1440, 1920]);
  assert.equal(replay.prelaunch.productionReady, false);
  assert.equal(replay.prelaunch.authoritySwitchAllowed, false);
});

test('missing viewport is UNPROVEN while an observed UI failure is REJECTED', async t => {
  const base = await replayHappy(t);
  const missing = structuredClone(base.uiFixture);
  missing.routes[0].captures.pop(); resignUi(missing);
  const unknown = replayUiUxAudit({ fixtureManifest: missing, publicationDecision: base.decision,
    buildEvidence: base.buildEvidence, adapterInput: stageInput('ui-ux-audit', missing,
      uiReplayPayloadDigest({ fixtureManifest: missing, buildEvidence: base.buildEvidence })) });
  assert.equal(unknown.auditManifest.result, 'UNPROVEN');
  assert.equal(unknown.stageResult.status, 'PARTIAL');

  const failed = structuredClone(base.uiFixture);
  failed.routes[0].captures[0].checks.overflow = 'FAIL';
  resignCapture(failed.routes[0].captures[0]); resignUi(failed);
  const rejected = replayUiUxAudit({ fixtureManifest: failed, publicationDecision: base.decision,
    buildEvidence: base.buildEvidence, adapterInput: stageInput('ui-ux-audit', failed,
      uiReplayPayloadDigest({ fixtureManifest: failed, buildEvidence: base.buildEvidence })) });
  assert.equal(rejected.auditManifest.result, 'REJECTED');
  assert.equal(rejected.stageResult.status, 'FAILED');
});

test('old screenshots, build drift and cloned host evidence cannot be reused', async t => {
  const base = await replayHappy(t);
  const stale = structuredClone(base.uiFixture);
  stale.routes[0].captures[0].buildDigest = 'f'.repeat(64);
  resignCapture(stale.routes[0].captures[0]); resignUi(stale);
  assert.throws(() => replayUiUxAudit({ fixtureManifest: stale, publicationDecision: base.decision,
    buildEvidence: base.buildEvidence, adapterInput: stageInput('ui-ux-audit', stale,
      uiReplayPayloadDigest({ fixtureManifest: stale, buildEvidence: base.buildEvidence })) }),
  error => error.code === 'UI_EVIDENCE_BINDING_MISMATCH');
  assert.throws(() => assertTrustedBuildEvidence(structuredClone(base.buildEvidence)),
    error => error.code === 'BUILD_EVIDENCE_UNTRUSTED');
  assert.throws(() => assertTrustedUiAudit(structuredClone(base.uiAudit.auditManifest)),
    error => error.code === 'UI_AUDIT_UNTRUSTED');
});

test('incomplete dynamic coverage is UNPROVEN and explicit route leaks are REJECTED', async t => {
  const base = await replayHappy(t);
  const incomplete = structuredClone(base.prelaunchFixture.route);
  incomplete.complete = false; incomplete.dynamicRouteCoverage = 'UNPROVEN';
  incomplete.gaps = ['dynamic route enumeration incomplete']; incomplete.unprovenRoutes = ['/dynamic/:slug'];
  resignRoute(incomplete);
  const unknown = replaySimulatedRouteProof({ routeRecord: incomplete,
    publicationDecision: base.decision, buildEvidence: base.buildEvidence });
  assert.equal(unknown.result, 'UNPROVEN');
  assert.equal(unknown.publicationProof.status, 'UNPROVEN');

  const leak = structuredClone(base.prelaunchFixture.route);
  leak.sitemapRoutes.push('/build');
  leak.staticRoutes.push('/unknown');
  leak.responses.push({ route: '/unknown', status: 200, redirect: null, robots: 'index',
    responseSha256: '9'.repeat(64), byteLength: 64 });
  const omitted = leak.responses.find(item => item.route === '/blocked');
  omitted.status = 200; omitted.robots = 'index'; resignRoute(leak);
  const rejected = replaySimulatedRouteProof({ routeRecord: leak,
    publicationDecision: base.decision, buildEvidence: base.buildEvidence });
  assert.equal(rejected.result, 'REJECTED');
  assert.ok(rejected.publicationProof.failures.some(item => item.includes('DRAFT_LEAK')));
  assert.ok(rejected.publicationProof.failures.some(item => item.includes('OMIT_LEAK')));
  assert.ok(rejected.publicationProof.failures.some(item => item.includes('UNEXPECTED_ROUTE')));
});

test('route proof must use the original P4 decision and trusted in-process evidence', async t => {
  const base = await replayHappy(t);
  assert.throws(() => replaySimulatedRouteProof({ routeRecord: base.prelaunchFixture.route,
    publicationDecision: structuredClone(base.decision), buildEvidence: base.buildEvidence }),
  error => error.code === 'PUBLICATION_DECISION_UNTRUSTED');
  assert.throws(() => assertTrustedRouteAssessment(structuredClone(base.routeAssessment)),
    error => error.code === 'ROUTE_ASSESSMENT_UNTRUSTED');
  const tampered = structuredClone(base.prelaunchFixture.route);
  tampered.responses[0].responseSha256 = 'f'.repeat(64);
  assert.throws(() => replaySimulatedRouteProof({ routeRecord: tampered,
    publicationDecision: base.decision, buildEvidence: base.buildEvidence }),
  error => error.code === 'CONTRACT_DIGEST_MISMATCH');
});

test('prelaunch binds build, UI and route evidence and rejects cloned proof objects', async t => {
  const base = await replayHappy(t);
  const input = stageInput('prelaunch-acceptance', base.prelaunchFixture,
    prelaunchReplayPayloadDigest({ fixtureManifest: base.prelaunchFixture, buildEvidence: base.buildEvidence,
      uiAudit: base.uiAudit.auditManifest, routeAssessment: base.routeAssessment }));
  assert.throws(() => replayPrelaunchAcceptance({ fixtureManifest: base.prelaunchFixture,
    publicationDecision: base.decision, buildEvidence: base.buildEvidence,
    uiAudit: base.uiAudit.auditManifest, routeAssessment: structuredClone(base.routeAssessment), adapterInput: input }),
  error => error.code === 'ROUTE_ASSESSMENT_UNTRUSTED');
  assert.throws(() => replayPrelaunchAcceptance({ fixtureManifest: base.prelaunchFixture,
    publicationDecision: structuredClone(base.decision), buildEvidence: base.buildEvidence,
    uiAudit: base.uiAudit.auditManifest, routeAssessment: base.routeAssessment, adapterInput: input }),
  error => error.code === 'PUBLICATION_DECISION_UNTRUSTED');
  const drift = structuredClone(base.prelaunchFixture);
  drift.siteRevision = 'f'.repeat(64); resignPrelaunch(drift);
  assert.throws(() => replayPrelaunchAcceptance({ fixtureManifest: drift,
    publicationDecision: base.decision, buildEvidence: base.buildEvidence,
    uiAudit: base.uiAudit.auditManifest, routeAssessment: base.routeAssessment,
    adapterInput: stageInput('prelaunch-acceptance', drift,
      prelaunchReplayPayloadDigest({ fixtureManifest: drift, buildEvidence: base.buildEvidence,
        uiAudit: base.uiAudit.auditManifest, routeAssessment: base.routeAssessment })) }),
  error => error.code === 'PRELAUNCH_BINDING_MISMATCH');
});

test('prelaunch never promotes UNPROVEN or REJECTED component evidence', async t => {
  const base = await replayHappy(t);
  const incompleteRoute = structuredClone(base.prelaunchFixture.route);
  incompleteRoute.complete = false; incompleteRoute.dynamicRouteCoverage = 'UNPROVEN';
  incompleteRoute.gaps = ['dynamic universe incomplete']; incompleteRoute.unprovenRoutes = ['/dynamic/:slug'];
  resignRoute(incompleteRoute);
  const routeAssessment = replaySimulatedRouteProof({ routeRecord: incompleteRoute,
    publicationDecision: base.decision, buildEvidence: base.buildEvidence });
  const incompleteFixture = structuredClone(base.prelaunchFixture);
  incompleteFixture.route = incompleteRoute; resignPrelaunch(incompleteFixture);
  const unproven = replayPrelaunchAcceptance({ fixtureManifest: incompleteFixture,
    publicationDecision: base.decision, buildEvidence: base.buildEvidence,
    uiAudit: base.uiAudit.auditManifest, routeAssessment,
    adapterInput: stageInput('prelaunch-acceptance', incompleteFixture,
      prelaunchReplayPayloadDigest({ fixtureManifest: incompleteFixture, buildEvidence: base.buildEvidence,
        uiAudit: base.uiAudit.auditManifest, routeAssessment })) });
  assert.equal(unproven.acceptanceManifest.result, 'UNPROVEN');
  assert.equal(unproven.stageResult.status, 'PARTIAL');

  const failedUiFixture = structuredClone(base.uiFixture);
  failedUiFixture.routes[0].captures[0].checks.accessibility = 'FAIL';
  resignCapture(failedUiFixture.routes[0].captures[0]); resignUi(failedUiFixture);
  const failedUi = replayUiUxAudit({ fixtureManifest: failedUiFixture,
    publicationDecision: base.decision, buildEvidence: base.buildEvidence,
    adapterInput: stageInput('ui-ux-audit', failedUiFixture,
      uiReplayPayloadDigest({ fixtureManifest: failedUiFixture, buildEvidence: base.buildEvidence })) });
  const rejected = replayPrelaunchAcceptance({ fixtureManifest: base.prelaunchFixture,
    publicationDecision: base.decision, buildEvidence: base.buildEvidence,
    uiAudit: failedUi.auditManifest, routeAssessment: base.routeAssessment,
    adapterInput: stageInput('prelaunch-acceptance', base.prelaunchFixture,
      prelaunchReplayPayloadDigest({ fixtureManifest: base.prelaunchFixture,
        buildEvidence: base.buildEvidence, uiAudit: failedUi.auditManifest,
        routeAssessment: base.routeAssessment })) });
  assert.equal(rejected.acceptanceManifest.result, 'REJECTED');
  assert.equal(rejected.stageResult.status, 'FAILED');
});

test('build failure is REJECTED and incomplete build evidence is UNPROVEN', async () => {
  const fixture = await json(prelaunchPath);
  const failed = structuredClone(fixture.build);
  failed.commands.find(item => item.script === 'build').exitCode = 1; resignBuild(failed);
  assert.equal(captureSimulatedBuildEvidence({ buildRecord: failed }).result, 'REJECTED');
  const incomplete = structuredClone(fixture.build);
  incomplete.complete = false; incomplete.gaps = ['build artifacts incomplete']; resignBuild(incomplete);
  assert.equal(captureSimulatedBuildEvidence({ buildRecord: incomplete }).result, 'UNPROVEN');
});

test('all P5-F entry points deny real capabilities before any simulated result is issued', async t => {
  const base = await replayHappy(t);
  for (const capability of ['BUILD', 'BROWSER', 'NETWORK', 'FILE_WRITE', 'WORKER', 'GIT',
    'DEPLOYMENT', 'AUTHORITY_SWITCH']) {
    assert.throws(() => captureSimulatedBuildEvidence({ buildRecord: base.prelaunchFixture.build,
      requestedCapabilities: [capability] }), error => error.code === 'POLICY_DENIED');
    assert.throws(() => replayUiUxAudit({ fixtureManifest: base.uiFixture, publicationDecision: base.decision,
      buildEvidence: base.buildEvidence, requestedCapabilities: [capability],
      adapterInput: stageInput('ui-ux-audit', base.uiFixture,
        uiReplayPayloadDigest({ fixtureManifest: base.uiFixture, buildEvidence: base.buildEvidence })) }),
    error => error.code === 'POLICY_DENIED');
    assert.throws(() => replaySimulatedRouteProof({ routeRecord: base.prelaunchFixture.route,
      publicationDecision: base.decision, buildEvidence: base.buildEvidence,
      requestedCapabilities: [capability] }), error => error.code === 'POLICY_DENIED');
    assert.throws(() => replayPrelaunchAcceptance({ fixtureManifest: base.prelaunchFixture,
      publicationDecision: base.decision, buildEvidence: base.buildEvidence,
      uiAudit: base.uiAudit.auditManifest, routeAssessment: base.routeAssessment,
      requestedCapabilities: [capability], adapterInput: stageInput('prelaunch-acceptance',
        base.prelaunchFixture, prelaunchReplayPayloadDigest({ fixtureManifest: base.prelaunchFixture,
          buildEvidence: base.buildEvidence, uiAudit: base.uiAudit.auditManifest,
          routeAssessment: base.routeAssessment })) }), error => error.code === 'POLICY_DENIED');
  }
});

test('closed fixture contracts reject unknown fields, duplicate routes and digest drift', async t => {
  const base = await replayHappy(t);
  const unknown = structuredClone(base.uiFixture); unknown.extra = true; resignUi(unknown);
  assert.throws(() => replayUiUxAudit({ fixtureManifest: unknown, publicationDecision: base.decision,
    buildEvidence: base.buildEvidence, adapterInput: stageInput('ui-ux-audit', unknown,
      uiReplayPayloadDigest({ fixtureManifest: unknown, buildEvidence: base.buildEvidence })) }),
  error => error.code === 'CONTRACT_SCHEMA_INVALID');
  const duplicate = structuredClone(base.uiFixture); duplicate.routes[1].route = duplicate.routes[0].route;
  resignUi(duplicate);
  assert.throws(() => replayUiUxAudit({ fixtureManifest: duplicate, publicationDecision: base.decision,
    buildEvidence: base.buildEvidence, adapterInput: stageInput('ui-ux-audit', duplicate,
      uiReplayPayloadDigest({ fixtureManifest: duplicate, buildEvidence: base.buildEvidence })) }),
  error => error.code === 'CONTRACT_SCHEMA_INVALID');
  const digestDrift = structuredClone(base.prelaunchFixture.build);
  digestDrift.artifacts[0].sha256 = 'f'.repeat(64);
  assert.throws(() => captureSimulatedBuildEvidence({ buildRecord: digestDrift }),
    error => error.code === 'CONTRACT_DIGEST_MISMATCH');
});
