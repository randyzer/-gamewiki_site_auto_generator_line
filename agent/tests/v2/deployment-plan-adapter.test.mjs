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
import { captureSimulatedBuildEvidence } from '../../src/v2/host/build-evidence-adapter.mjs';
import { replaySimulatedRouteProof, routeRecordDigest } from '../../src/v2/host/route-proof-adapter.mjs';
import { replayUiUxAudit, uiReplayPayloadDigest } from '../../src/v2/adapters/ui-ux-audit.mjs';
import { replayPrelaunchAcceptance, prelaunchFixtureDigest,
  prelaunchReplayPayloadDigest } from '../../src/v2/adapters/prelaunch-acceptance.mjs';
import { assertTrustedDeploymentPlan, deploymentFixtureDigest, deploymentPlanDigest,
  deploymentReplayPayloadDigest, replayDeploymentPlan } from '../../src/v2/adapters/deployment-plan.mjs';
import { assertTrustedDeploymentGate, evaluateOfflineDeploymentGate } from '../../src/v2/host/deployment-gate-adapter.mjs';

const fixtureRoot = fileURLToPath(new URL('../fixtures/v2/', import.meta.url));
const json = async path => JSON.parse(await readFile(join(fixtureRoot, path), 'utf8'));
const stageInput = (stage, manifest, payloadDigest) => ({
  kind: 'STAGE_ADAPTER_INPUT', schemaVersion: 1, producer: 'V2_OFFLINE_HOST', mode: 'OFFLINE',
  runId: manifest.runId, canonicalStageId: stage, mappingVersion: 'stage-identity-v1',
  contextDigest: manifest.contextDigest, featureGate: 'shadow', gateBindingDigest: 'd'.repeat(64),
  payloadDigest,
});

function contentCandidate(manifest) {
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

async function publication(t, manifest) {
  const candidate = contentCandidate(manifest);
  const root = await mkdtemp(join(tmpdir(), 'p5-g-publication-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const approvals = await createTestApprovalHarness({ rootDirectory: root, namespace: 'p5-g-publication' });
  const binding = { runId: candidate.runId, stageId: candidate.stageId, attemptId: candidate.attemptId,
    contextDigest: candidate.contextDigest, schemaBundleDigest: candidate.schemaBundleDigest,
    purpose: 'PARTIAL_HANDOFF', purposePayload: partialHandoffPurposePayload(candidate) };
  const reference = await approvals.authority.issue(createApprovalRequest(binding),
    { decision: 'APPROVED', nowMs: 1000, expiresAtMs: 2000 });
  const consumption = await approvals.consumer.consume(reference, { ...binding, nowMs: 1500 });
  const handoff = authorizeCanonicalHandoff({ candidate, approvalConsumption: consumption });
  return replayContentIntegration({ fixtureManifest: manifest,
    adapterInput: stageInput('content-integration', manifest,
      contentReplayPayloadDigest({ fixtureManifest: manifest })), handoff,
    projection: { stageSatisfied: false, status: 'PARTIAL' } }).publicationDecision;
}

const resignRoute = value => { value.recordDigest = routeRecordDigest(value); return value; };
const resignPrelaunch = value => { value.fixtureDigest = prelaunchFixtureDigest(value); return value; };
const resignDeployment = value => {
  value.planDigest = deploymentPlanDigest(value);
  value.fixtureDigest = deploymentFixtureDigest(value);
  return value;
};

async function upstream(t, overrides = {}) {
  const [content, ui, prelaunch, deployment] = await Promise.all([
    json('content/fixture-manifest.json'), json('ui/fixture-manifest.json'),
    json('prelaunch/fixture-manifest.json'), json('deployment/fixture-manifest.json'),
  ]);
  const decision = await publication(t, content);
  const prelaunchFixture = overrides.prelaunchFixture ?? prelaunch;
  const buildEvidence = captureSimulatedBuildEvidence({ buildRecord: prelaunchFixture.build });
  const routeAssessment = replaySimulatedRouteProof({ routeRecord: prelaunchFixture.route,
    publicationDecision: decision, buildEvidence });
  const uiAudit = replayUiUxAudit({ fixtureManifest: ui, publicationDecision: decision, buildEvidence,
    routeAssessment, adapterInput: stageInput('ui-ux-audit', ui,
      uiReplayPayloadDigest({ fixtureManifest: ui, buildEvidence, routeAssessment })) });
  return { deployment, prelaunchFixture, decision, buildEvidence, routeAssessment, uiAudit };
}

function replay(base, fixture = base.deployment, options = {}) {
  const deploymentGate = options.deploymentGate ?? evaluateOfflineDeploymentGate({
    requestedCapabilities: fixture.requestedCapabilities,
    externalEffectState: fixture.externalEffectState,
    approval: null,
  });
  return replayDeploymentPlan({ fixtureManifest: fixture,
    adapterInput: stageInput('deployment-plan', fixture,
      deploymentReplayPayloadDigest({ fixtureManifest: fixture, buildEvidence: base.buildEvidence,
        uiAudit: base.uiAudit.auditManifest, routeAssessment: base.routeAssessment, deploymentGate })),
    prelaunchFixture: base.prelaunchFixture, publicationDecision: base.decision,
    buildEvidence: base.buildEvidence, uiAudit: base.uiAudit.auditManifest,
    routeAssessment: base.routeAssessment, deploymentGate,
    requestedCapabilities: options.requestedCapabilities ?? [], approval: options.approval ?? null,
  });
}

test('verified offline plan completes only the adapter and projects WAITING_FOR_USER', async t => {
  const base = await upstream(t);
  const result = replay(base);
  assert.equal(result.stageResult.status, 'COMPLETED');
  assert.equal(result.stageResult.authoritative, false);
  assert.equal(result.planManifest.result, 'OFFLINE_SIMULATED_VERIFIED');
  assert.equal(result.planManifest.planDigest, base.deployment.planDigest);
  assert.equal(result.planManifest.authoritative, false);
  assert.equal(result.projection.status, 'WAITING_FOR_USER');
  assert.equal(result.projection.stageSatisfied, false);
  assert.equal(result.projection.downstreamAuthorized, false);
  assert.equal(result.projection.deploymentExecuted, false);
  assert.equal(result.projection.productionReady, false);
  assert.equal(result.projection.authoritySwitchAllowed, false);
  assert.equal(result.projection.legacyPlanDigestCompatible, false);
  assert.equal(result.productionEffects, 0);
  assert.equal(Object.isFrozen(result.planManifest), true);
  assert.equal(assertTrustedDeploymentPlan(result.planManifest), result.planManifest);
  assert.throws(() => assertTrustedDeploymentPlan(structuredClone(result.planManifest)),
    error => error.code === 'DEPLOYMENT_PLAN_UNTRUSTED');
});

test('plan digest covers resources, rollback and every closed-contract field', async t => {
  const base = await upstream(t);
  const scopeDrift = structuredClone(base.deployment);
  scopeDrift.target.repository = 'other/repository';
  scopeDrift.resourceScope[0].locator = 'other/repository';
  assert.throws(() => replay(base, scopeDrift), error => error.code === 'CONTRACT_DIGEST_MISMATCH');

  const rollbackDrift = structuredClone(base.deployment);
  rollbackDrift.rollback.steps[0].action = 'Do something else';
  assert.throws(() => replay(base, rollbackDrift), error => error.code === 'CONTRACT_DIGEST_MISMATCH');

  const duplicate = structuredClone(base.deployment);
  duplicate.resourceScope.push(structuredClone(duplicate.resourceScope[0]));
  resignDeployment(duplicate);
  assert.throws(() => replay(base, duplicate), error => error.code === 'CONTRACT_SCHEMA_INVALID');

  const aliasedResource = structuredClone(base.deployment);
  aliasedResource.resourceScope.push({ ...structuredClone(aliasedResource.resourceScope[0]),
    resourceId: 'repository-alias' });
  resignDeployment(aliasedResource);
  assert.throws(() => replay(base, aliasedResource),
    error => error.code === 'CONTRACT_SCHEMA_INVALID');

  const unknown = structuredClone(base.deployment);
  unknown.executor = 'caller-controlled'; resignDeployment(unknown);
  assert.throws(() => replay(base, unknown), error => error.code === 'CONTRACT_SCHEMA_INVALID');
});

test('every required action binds the exact resource kinds in the safe order', async t => {
  const base = await upstream(t);
  const dnsToMeasurement = structuredClone(base.deployment);
  dnsToMeasurement.steps.find(item => item.action === 'PLAN_DNS_UPDATE').resourceIds = ['measurement'];
  resignDeployment(dnsToMeasurement);
  assert.throws(() => replay(base, dnsToMeasurement), error => error.code === 'CONTRACT_SCHEMA_INVALID');

  const hostingWithoutHost = structuredClone(base.deployment);
  hostingWithoutHost.steps.find(item => item.action === 'PLAN_HOSTING_DEPLOYMENT').resourceIds = ['repository'];
  resignDeployment(hostingWithoutHost);
  assert.throws(() => replay(base, hostingWithoutHost), error => error.code === 'CONTRACT_SCHEMA_INVALID');

  for (const action of ['PLAN_DNS_UPDATE', 'PLAN_MEASUREMENT_SETUP']) {
    const missing = structuredClone(base.deployment);
    missing.steps = missing.steps.filter(item => item.action !== action); resignDeployment(missing);
    assert.throws(() => replay(base, missing), error => error.code === 'CONTRACT_SCHEMA_INVALID');
  }

  const reordered = structuredClone(base.deployment);
  [reordered.steps[1], reordered.steps[2]] = [reordered.steps[2], reordered.steps[1]];
  resignDeployment(reordered);
  assert.throws(() => replay(base, reordered), error => error.code === 'CONTRACT_SCHEMA_INVALID');
});

test('rollback has one structured manual action for every mutable resource', async t => {
  const base = await upstream(t);
  for (const resourceId of ['dns', 'measurement']) {
    const missing = structuredClone(base.deployment);
    missing.rollback.resourceIds = missing.rollback.resourceIds.filter(id => id !== resourceId);
    missing.rollback.steps = missing.rollback.steps.filter(item => item.resourceId !== resourceId);
    resignDeployment(missing);
    assert.throws(() => replay(base, missing), error => error.code === 'CONTRACT_SCHEMA_INVALID');
  }

  const mismatched = structuredClone(base.deployment);
  mismatched.rollback.steps.find(item => item.resourceId === 'dns').resourceId = 'measurement';
  resignDeployment(mismatched);
  assert.throws(() => replay(base, mismatched), error => error.code === 'CONTRACT_SCHEMA_INVALID');

  const automatic = structuredClone(base.deployment);
  automatic.rollback.steps[0].manualConfirmationRequired = false; resignDeployment(automatic);
  assert.throws(() => replay(base, automatic), error => error.code === 'CONTRACT_SCHEMA_INVALID');
});

test('deployment recomputes trusted prelaunch evidence and rejects clones or unverified inputs', async t => {
  const base = await upstream(t);
  assert.throws(() => replayDeploymentPlan({ fixtureManifest: base.deployment,
    adapterInput: stageInput('deployment-plan', base.deployment, 'f'.repeat(64)),
    prelaunchFixture: base.prelaunchFixture, publicationDecision: base.decision,
    buildEvidence: base.buildEvidence, uiAudit: base.uiAudit.auditManifest,
    routeAssessment: base.routeAssessment,
    deploymentGate: evaluateOfflineDeploymentGate({ requestedCapabilities: [],
      externalEffectState: 'NONE', approval: null }), requestedCapabilities: [], approval: null,
    prelaunchAcceptance: { result: 'OFFLINE_SIMULATED_VERIFIED' } }),
  error => error.code === 'CONTRACT_SCHEMA_INVALID');
  assert.throws(() => replayDeploymentPlan({ fixtureManifest: base.deployment,
    adapterInput: stageInput('deployment-plan', base.deployment,
      deploymentReplayPayloadDigest({ fixtureManifest: base.deployment, buildEvidence: base.buildEvidence,
        uiAudit: base.uiAudit.auditManifest, routeAssessment: base.routeAssessment,
        deploymentGate: evaluateOfflineDeploymentGate({ requestedCapabilities: [],
          externalEffectState: 'NONE', approval: null }) })),
    prelaunchFixture: base.prelaunchFixture, publicationDecision: base.decision,
    buildEvidence: base.buildEvidence, uiAudit: base.uiAudit.auditManifest,
    routeAssessment: structuredClone(base.routeAssessment),
    deploymentGate: evaluateOfflineDeploymentGate({ requestedCapabilities: [],
      externalEffectState: 'NONE', approval: null }), requestedCapabilities: [], approval: null }),
  error => error.code === 'ROUTE_ASSESSMENT_UNTRUSTED');

  const incomplete = structuredClone(base.prelaunchFixture);
  incomplete.complete = false; incomplete.gaps = ['prelaunch evidence incomplete']; resignPrelaunch(incomplete);
  const unverifiedBase = await upstream(t, { prelaunchFixture: incomplete });
  const prelaunch = replayPrelaunchAcceptance({ fixtureManifest: incomplete,
    publicationDecision: unverifiedBase.decision, buildEvidence: unverifiedBase.buildEvidence,
    uiAudit: unverifiedBase.uiAudit.auditManifest, routeAssessment: unverifiedBase.routeAssessment,
    adapterInput: stageInput('prelaunch-acceptance', incomplete,
      prelaunchReplayPayloadDigest({ fixtureManifest: incomplete,
        buildEvidence: unverifiedBase.buildEvidence, uiAudit: unverifiedBase.uiAudit.auditManifest,
        routeAssessment: unverifiedBase.routeAssessment })) });
  assert.equal(prelaunch.acceptanceManifest.result, 'UNPROVEN');
  const deployment = structuredClone(unverifiedBase.deployment);
  deployment.prelaunchFixtureDigest = incomplete.fixtureDigest;
  deployment.prelaunchAcceptanceDigest = prelaunch.acceptanceManifest.acceptanceDigest;
  deployment.publicationProofDigest = unverifiedBase.routeAssessment.proofDigest;
  resignDeployment(deployment);
  assert.throws(() => replay(unverifiedBase, deployment),
    error => error.code === 'PRELAUNCH_NOT_VERIFIED');
});

test('offline gate rejects approvals, executors and every real capability', async t => {
  const base = await upstream(t);
  const embedded = structuredClone(base.deployment);
  embedded.requestedCapabilities = ['DEPLOYMENT']; resignDeployment(embedded);
  const emptyGate = evaluateOfflineDeploymentGate({ requestedCapabilities: [],
    externalEffectState: 'NONE', approval: null });
  assert.throws(() => replay(base, embedded, { deploymentGate: emptyGate }),
    error => error.code === 'POLICY_DENIED');
  for (const capability of ['GITHUB_PUSH', 'DEPLOYMENT', 'DNS_WRITE', 'GSC_WRITE', 'GA4_WRITE',
    'MEASUREMENT_WRITE', 'WORKER', 'NETWORK', 'BROWSER', 'BUILD', 'AUTHORITY_SWITCH']) {
    assert.throws(() => evaluateOfflineDeploymentGate({ requestedCapabilities: [capability],
      externalEffectState: 'NONE', approval: null }), error => error.code === 'POLICY_DENIED');
    assert.throws(() => replay(base, base.deployment, { requestedCapabilities: [capability] }),
      error => error.code === 'POLICY_DENIED');
  }
  for (const approval of [
    { purpose: 'PARTIAL_HANDOFF', status: 'APPROVED' },
    { purpose: 'DEPLOYMENT_EXECUTION', status: 'APPROVED', simulated: true },
  ]) {
    assert.throws(() => evaluateOfflineDeploymentGate({ requestedCapabilities: [],
      externalEffectState: 'NONE', approval }), error => error.code === 'DEPLOYMENT_APPROVAL_UNSUPPORTED');
    assert.throws(() => replay(base, base.deployment, { approval }),
      error => error.code === 'DEPLOYMENT_APPROVAL_UNSUPPORTED');
  }
  assert.throws(() => evaluateOfflineDeploymentGate({ requestedCapabilities: [],
    externalEffectState: 'NONE', approval: null, executor: () => {} }),
  error => error.code === 'CONTRACT_SCHEMA_INVALID');
});

test('unknown or observed external effects always require reconciliation and cannot retry', async t => {
  for (const externalEffectState of ['NONE', 'UNKNOWN', 'PARTIAL', 'CONFIRMED_EFFECT']) {
    const gate = evaluateOfflineDeploymentGate({ requestedCapabilities: [], externalEffectState, approval: null });
    assert.equal(gate.retryAllowed, false);
    assert.equal(gate.executionAllowed, false);
    assert.equal(gate.deploymentExecuted, false);
    assert.equal(gate.result, externalEffectState === 'NONE' ? 'WAITING_FOR_APPROVAL' : 'RECONCILIATION_REQUIRED');
    assert.equal(assertTrustedDeploymentGate(gate), gate);
  }
  const clone = evaluateOfflineDeploymentGate({ requestedCapabilities: [],
    externalEffectState: 'NONE', approval: null });
  assert.throws(() => assertTrustedDeploymentGate(structuredClone(clone)),
    error => error.code === 'DEPLOYMENT_GATE_UNTRUSTED');

  const base = await upstream(t);
  const unknown = structuredClone(base.deployment);
  unknown.externalEffectState = 'UNKNOWN'; resignDeployment(unknown);
  assert.throws(() => replay(base, unknown), error => error.code === 'RECONCILIATION_REQUIRED');
});

test('stage identity, binding and target identity fail closed', async t => {
  const base = await upstream(t);
  const gate = evaluateOfflineDeploymentGate({ requestedCapabilities: [],
    externalEffectState: 'NONE', approval: null });
  const payloadDigest = deploymentReplayPayloadDigest({ fixtureManifest: base.deployment,
    buildEvidence: base.buildEvidence, uiAudit: base.uiAudit.auditManifest,
    routeAssessment: base.routeAssessment, deploymentGate: gate });
  assert.throws(() => replayDeploymentPlan({ fixtureManifest: base.deployment,
    adapterInput: stageInput('prelaunch-acceptance', base.deployment, payloadDigest),
    prelaunchFixture: base.prelaunchFixture, publicationDecision: base.decision,
    buildEvidence: base.buildEvidence, uiAudit: base.uiAudit.auditManifest,
    routeAssessment: base.routeAssessment, deploymentGate: gate,
    requestedCapabilities: [], approval: null }), error => error.code === 'CONTRACT_BINDING_MISMATCH');

  const domainDrift = structuredClone(base.deployment);
  domainDrift.domain = 'other.test'; domainDrift.target.targetDomain = 'other.test';
  domainDrift.resourceScope.find(item => item.kind === 'DNS_ZONE').locator = 'cloudflare:other.test';
  resignDeployment(domainDrift);
  assert.throws(() => replay(base, domainDrift), error => error.code === 'DEPLOYMENT_BINDING_MISMATCH');
});
