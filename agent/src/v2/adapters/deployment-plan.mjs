import { createHash } from 'node:crypto';
import { canonicalJson, deepFreeze } from '../../contracts/canonical-json.mjs';
import { ContractError } from '../../contracts/errors.mjs';
import { validateStageAdapterInput, validateStageAdapterResult } from '../stage-adapter-contract.mjs';
import { replayPrelaunchAcceptance, prelaunchReplayPayloadDigest } from './prelaunch-acceptance.mjs';
import { assertTrustedDeploymentGate } from '../host/deployment-gate-adapter.mjs';

const trustedDeploymentPlans = new WeakSet();
const digestPattern = /^[a-f0-9]{64}$/;
const safeDomainPattern = /^(?=.{1,253}$)(?!-)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const repositoryPattern = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const resourceKinds = new Set(['GITHUB_REPOSITORY', 'HOSTING_PROJECT', 'DNS_ZONE', 'MEASUREMENT_PROPERTY']);
const effectStates = new Set(['NONE', 'UNKNOWN', 'PARTIAL', 'CONFIRMED_EFFECT']);
const requiredActions = Object.freeze([
  Object.freeze({ action: 'VERIFY_SOURCE_REVISION', kinds: Object.freeze(['GITHUB_REPOSITORY']) }),
  Object.freeze({ action: 'PLAN_HOSTING_DEPLOYMENT',
    kinds: Object.freeze(['GITHUB_REPOSITORY', 'HOSTING_PROJECT']) }),
  Object.freeze({ action: 'PLAN_DNS_UPDATE', kinds: Object.freeze(['HOSTING_PROJECT', 'DNS_ZONE']) }),
  Object.freeze({ action: 'PLAN_MEASUREMENT_SETUP', kinds: Object.freeze(['MEASUREMENT_PROPERTY']) }),
]);
const mutableResourceKinds = new Set(['HOSTING_PROJECT', 'DNS_ZONE', 'MEASUREMENT_PROPERTY']);
const fail = (code, message) => { throw new ContractError(code, message); };
const nonempty = value => typeof value === 'string' && value.trim() === value && value.length > 0;
const digest = (domain, value) => createHash('sha256')
  .update(`${domain}\n${canonicalJson(value)}`).digest('hex');

function exactObject(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      canonicalJson(Object.keys(value).sort()) !== canonicalJson([...keys].sort()))
    fail('CONTRACT_SCHEMA_INVALID', `${label} fields do not match the closed contract`);
}

function assertDigest(value, label) {
  if (!digestPattern.test(value ?? '')) fail('CONTRACT_SCHEMA_INVALID', `${label} must be a SHA256 digest`);
}

function planPayload(manifest) {
  const { planDigest: ignoredPlan, fixtureDigest: ignoredFixture, ...payload } = manifest;
  return payload;
}

export function deploymentPlanDigest(fixtureManifest) {
  return digest('AGENT_OFFLINE_DEPLOYMENT_PLAN_V1', planPayload(fixtureManifest));
}

export function deploymentFixtureDigest(fixtureManifest) {
  const { fixtureDigest: ignored, ...payload } = fixtureManifest;
  return digest('AGENT_DEPLOYMENT_PLAN_FIXTURE_V1', payload);
}

export function deploymentReplayPayloadDigest({ fixtureManifest, buildEvidence, uiAudit,
  routeAssessment, deploymentGate }) {
  return digest('AGENT_DEPLOYMENT_PLAN_REPLAY_PAYLOAD_V1', {
    fixtureDigest: fixtureManifest.fixtureDigest,
    buildEvidenceDigest: buildEvidence.evidenceDigest,
    uiAuditDigest: uiAudit.auditDigest,
    routeAssessmentDigest: routeAssessment.assessmentDigest,
    deploymentGateDigest: deploymentGate.gateDigest,
  });
}

function validateFixture(manifest) {
  exactObject(manifest, ['kind', 'schemaVersion', 'producer', 'classification', 'mode',
    'canonicalStageId', 'mappingVersion', 'runId', 'contextDigest', 'sourceRevision',
    'siteRevision', 'buildDigest', 'domain', 'prelaunchFixtureDigest',
    'prelaunchAcceptanceDigest', 'publicationProofDigest', 'requestedCapabilities',
    'externalEffectState', 'complete', 'gaps', 'target', 'resourceScope', 'steps',
    'rollback', 'approval', 'planDigest', 'fixtureDigest'], 'deployment fixture');
  if (manifest.kind !== 'DEPLOYMENT_PLAN_FIXTURE' || manifest.schemaVersion !== 1 ||
      manifest.producer !== 'P5_G_OFFLINE_FIXTURE' || manifest.classification !== 'OFFLINE_STUB' ||
      manifest.mode !== 'SIMULATED' || manifest.canonicalStageId !== 'deployment-plan' ||
      manifest.mappingVersion !== 'stage-identity-v1' || !nonempty(manifest.runId) ||
      !safeDomainPattern.test(manifest.domain ?? '') || !effectStates.has(manifest.externalEffectState) ||
      typeof manifest.complete !== 'boolean' || !Array.isArray(manifest.requestedCapabilities) ||
      manifest.requestedCapabilities.some(value => !nonempty(value)) ||
      !Array.isArray(manifest.gaps) || manifest.gaps.some(value => !nonempty(value)) ||
      new Set(manifest.gaps).size !== manifest.gaps.length)
    fail('CONTRACT_SCHEMA_INVALID', 'Deployment fixture identity is invalid');
  for (const name of ['contextDigest', 'sourceRevision', 'siteRevision', 'buildDigest',
    'prelaunchFixtureDigest', 'prelaunchAcceptanceDigest', 'publicationProofDigest',
    'planDigest', 'fixtureDigest']) assertDigest(manifest[name], name);

  exactObject(manifest.target, ['repository', 'branch', 'targetDomain', 'hostingProvider',
    'dnsProvider', 'costStatus'], 'deployment target');
  if (!repositoryPattern.test(manifest.target.repository ?? '') || !nonempty(manifest.target.branch) ||
      manifest.target.targetDomain !== manifest.domain || !nonempty(manifest.target.hostingProvider) ||
      !nonempty(manifest.target.dnsProvider) || !['KNOWN', 'UNKNOWN'].includes(manifest.target.costStatus))
    fail('CONTRACT_SCHEMA_INVALID', 'Deployment target is invalid');

  if (!Array.isArray(manifest.resourceScope) || !manifest.resourceScope.length)
    fail('CONTRACT_SCHEMA_INVALID', 'Deployment resource scope is empty');
  const resourceIds = new Set(); const seenResourceKinds = new Set();
  const resourceLocators = new Set(); const resourceById = new Map();
  for (const resource of manifest.resourceScope) {
    exactObject(resource, ['resourceId', 'kind', 'locator', 'access'], 'deployment resource');
    if (!nonempty(resource.resourceId) || resourceIds.has(resource.resourceId) ||
        !resourceKinds.has(resource.kind) || seenResourceKinds.has(resource.kind) ||
        !nonempty(resource.locator) || resourceLocators.has(resource.locator) ||
        resource.access !== 'PLANNED_ONLY')
      fail('CONTRACT_SCHEMA_INVALID', 'Deployment resources must be unique and plan-only');
    resourceIds.add(resource.resourceId); seenResourceKinds.add(resource.kind);
    resourceLocators.add(resource.locator); resourceById.set(resource.resourceId, resource);
  }
  if (seenResourceKinds.size !== resourceKinds.size ||
      manifest.resourceScope.find(item => item.kind === 'GITHUB_REPOSITORY')?.locator !==
        manifest.target.repository ||
      !manifest.resourceScope.find(item => item.kind === 'DNS_ZONE')?.locator.endsWith(`:${manifest.domain}`))
    fail('CONTRACT_SCHEMA_INVALID', 'Deployment resources do not cover the exact target scope');

  if (!Array.isArray(manifest.steps) || manifest.steps.length !== requiredActions.length)
    fail('CONTRACT_SCHEMA_INVALID', 'Deployment steps do not cover the required actions');
  const stepIds = new Set();
  for (const [index, step] of manifest.steps.entries()) {
    exactObject(step, ['stepId', 'action', 'resourceIds', 'expectedEffect', 'stopCondition'],
      'deployment step');
    const required = requiredActions[index];
    if (!nonempty(step.stepId) || stepIds.has(step.stepId) || step.action !== required.action ||
        !Array.isArray(step.resourceIds) || !step.resourceIds.length ||
        step.resourceIds.some(id => !resourceIds.has(id)) ||
        new Set(step.resourceIds).size !== step.resourceIds.length ||
        !nonempty(step.expectedEffect) || !nonempty(step.stopCondition))
      fail('CONTRACT_SCHEMA_INVALID', 'Deployment step is invalid');
    const actualKinds = step.resourceIds.map(id => resourceById.get(id).kind).sort();
    if (canonicalJson(actualKinds) !== canonicalJson([...required.kinds].sort()))
      fail('CONTRACT_SCHEMA_INVALID', `Deployment action ${step.action} has invalid resource kinds`);
    stepIds.add(step.stepId);
  }

  exactObject(manifest.rollback, ['strategy', 'resourceIds', 'steps', 'manualConfirmationRequired'],
    'deployment rollback');
  const mutableResourceIds = manifest.resourceScope
    .filter(resource => mutableResourceKinds.has(resource.kind)).map(resource => resource.resourceId).sort();
  if (manifest.rollback.strategy !== 'MANUAL_APPROVAL_REQUIRED' ||
      manifest.rollback.manualConfirmationRequired !== true ||
      !Array.isArray(manifest.rollback.resourceIds) || !manifest.rollback.resourceIds.length ||
      manifest.rollback.resourceIds.some(id => !resourceIds.has(id)) ||
      new Set(manifest.rollback.resourceIds).size !== manifest.rollback.resourceIds.length ||
      canonicalJson([...manifest.rollback.resourceIds].sort()) !== canonicalJson(mutableResourceIds) ||
      !Array.isArray(manifest.rollback.steps) ||
      manifest.rollback.steps.length !== mutableResourceIds.length)
    fail('CONTRACT_SCHEMA_INVALID', 'Deployment rollback is invalid');
  const rollbackResources = new Set();
  for (const step of manifest.rollback.steps) {
    exactObject(step, ['resourceId', 'action', 'manualConfirmationRequired'], 'deployment rollback step');
    if (!mutableResourceIds.includes(step.resourceId) || rollbackResources.has(step.resourceId) ||
        !nonempty(step.action) || step.manualConfirmationRequired !== true)
      fail('CONTRACT_SCHEMA_INVALID', 'Deployment rollback step is invalid');
    rollbackResources.add(step.resourceId);
  }
  if (canonicalJson([...rollbackResources].sort()) !== canonicalJson(mutableResourceIds))
    fail('CONTRACT_SCHEMA_INVALID', 'Deployment rollback does not cover mutable resources');
  exactObject(manifest.approval, ['purpose', 'status'], 'deployment approval');
  if (manifest.approval.purpose !== 'DEPLOYMENT_EXECUTION' ||
      manifest.approval.status !== 'AWAITING_CONFIRMATION')
    fail('CONTRACT_SCHEMA_INVALID', 'Deployment plan must await execution approval');
  if (deploymentPlanDigest(manifest) !== manifest.planDigest ||
      deploymentFixtureDigest(manifest) !== manifest.fixtureDigest)
    fail('CONTRACT_DIGEST_MISMATCH', 'Deployment fixture digest mismatch');
}

function assertBindings(fixture, acceptance, gate) {
  const expected = {
    runId: acceptance.runId, contextDigest: acceptance.contextDigest,
    sourceRevision: acceptance.sourceRevision, siteRevision: acceptance.siteRevision,
    buildDigest: acceptance.buildDigest, domain: acceptance.domain,
    prelaunchAcceptanceDigest: acceptance.acceptanceDigest,
    publicationProofDigest: acceptance.publicationProofDigest,
  };
  for (const [key, value] of Object.entries(expected)) {
    if (fixture[key] !== value)
      fail('DEPLOYMENT_BINDING_MISMATCH', `Deployment fixture does not bind ${key}`);
  }
  if (fixture.prelaunchFixtureDigest !== acceptance.fixtureDigest ||
      fixture.target.targetDomain !== acceptance.domain ||
      fixture.externalEffectState !== gate.externalEffectState)
    fail('DEPLOYMENT_BINDING_MISMATCH', 'Deployment target or upstream evidence does not match');
}

function prelaunchInput(adapterInput, prelaunchFixture, buildEvidence, uiAudit, routeAssessment) {
  return {
    kind: 'STAGE_ADAPTER_INPUT', schemaVersion: 1, producer: 'V2_OFFLINE_HOST', mode: 'OFFLINE',
    runId: prelaunchFixture.runId, canonicalStageId: 'prelaunch-acceptance',
    mappingVersion: adapterInput.mappingVersion, contextDigest: prelaunchFixture.contextDigest,
    featureGate: adapterInput.featureGate, gateBindingDigest: adapterInput.gateBindingDigest,
    payloadDigest: prelaunchReplayPayloadDigest({ fixtureManifest: prelaunchFixture,
      buildEvidence, uiAudit, routeAssessment }),
  };
}

export function replayDeploymentPlan(options) {
  exactObject(options, ['fixtureManifest', 'adapterInput', 'prelaunchFixture', 'publicationDecision',
    'buildEvidence', 'uiAudit', 'routeAssessment', 'deploymentGate', 'requestedCapabilities',
    'approval'], 'deployment replay input');
  const { fixtureManifest, adapterInput, prelaunchFixture, publicationDecision, buildEvidence,
    uiAudit, routeAssessment, deploymentGate, requestedCapabilities, approval } = options;
  if (!Array.isArray(requestedCapabilities))
    fail('CONTRACT_SCHEMA_INVALID', 'requestedCapabilities must be an array');
  if (requestedCapabilities.length)
    fail('POLICY_DENIED', `P5-G deployment adapter denies ${requestedCapabilities[0]}`);
  if (approval !== null)
    fail('DEPLOYMENT_APPROVAL_UNSUPPORTED', 'P5-G cannot consume or simulate deployment approval');
  validateFixture(fixtureManifest); validateStageAdapterInput(adapterInput);
  if (fixtureManifest.requestedCapabilities.length)
    fail('POLICY_DENIED', `P5-G deployment fixture requests ${fixtureManifest.requestedCapabilities[0]}`);
  const gate = assertTrustedDeploymentGate(deploymentGate);
  if (gate.externalEffectState !== fixtureManifest.externalEffectState)
    fail('DEPLOYMENT_BINDING_MISMATCH', 'Deployment gate belongs to another external effect state');
  if (gate.result !== 'WAITING_FOR_APPROVAL')
    fail('RECONCILIATION_REQUIRED', 'External deployment effects are not known to be absent');
  if (adapterInput.canonicalStageId !== 'deployment-plan' ||
      adapterInput.runId !== fixtureManifest.runId ||
      adapterInput.contextDigest !== fixtureManifest.contextDigest ||
      adapterInput.payloadDigest !== deploymentReplayPayloadDigest({ fixtureManifest,
        buildEvidence, uiAudit, routeAssessment, deploymentGate: gate }))
    fail('CONTRACT_BINDING_MISMATCH', 'Deployment adapter input does not bind the replay payload');

  const prelaunch = replayPrelaunchAcceptance({ fixtureManifest: prelaunchFixture,
    publicationDecision, buildEvidence, uiAudit, routeAssessment,
    adapterInput: prelaunchInput(adapterInput, prelaunchFixture, buildEvidence, uiAudit, routeAssessment),
    requestedCapabilities: [] });
  const acceptance = prelaunch.acceptanceManifest;
  assertBindings(fixtureManifest, acceptance, gate);
  if (acceptance.result !== 'OFFLINE_SIMULATED_VERIFIED' || !fixtureManifest.complete ||
      fixtureManifest.gaps.length)
    fail('PRELAUNCH_NOT_VERIFIED', 'Deployment planning requires complete verified offline prelaunch evidence');

  const planManifest = deepFreeze({
    kind: 'OFFLINE_DEPLOYMENT_PLAN', schemaVersion: 1,
    producer: 'P5_G_DEPLOYMENT_PLAN_ADAPTER', classification: 'OFFLINE_STUB', mode: 'SIMULATED',
    authoritative: false, runId: fixtureManifest.runId, contextDigest: fixtureManifest.contextDigest,
    sourceRevision: fixtureManifest.sourceRevision, siteRevision: fixtureManifest.siteRevision,
    buildDigest: fixtureManifest.buildDigest, domain: fixtureManifest.domain,
    prelaunchFixtureDigest: fixtureManifest.prelaunchFixtureDigest,
    prelaunchAcceptanceDigest: acceptance.acceptanceDigest,
    publicationProofDigest: acceptance.publicationProofDigest,
    deploymentGateDigest: gate.gateDigest, fixtureDigest: fixtureManifest.fixtureDigest,
    planDigest: fixtureManifest.planDigest, target: structuredClone(fixtureManifest.target),
    resourceScope: structuredClone(fixtureManifest.resourceScope),
    steps: structuredClone(fixtureManifest.steps), rollback: structuredClone(fixtureManifest.rollback),
    approvalPurpose: fixtureManifest.approval.purpose,
    approvalStatus: fixtureManifest.approval.status,
    externalEffectState: fixtureManifest.externalEffectState,
    result: 'OFFLINE_SIMULATED_VERIFIED', deploymentExecuted: false,
    productionReady: false, authoritySwitchAllowed: false,
  });
  trustedDeploymentPlans.add(planManifest);
  const stageResult = {
    kind: 'STAGE_ADAPTER_RESULT', schemaVersion: 1, producer: 'V2_STAGE_ADAPTER', mode: 'OFFLINE',
    runId: adapterInput.runId, canonicalStageId: adapterInput.canonicalStageId,
    mappingVersion: adapterInput.mappingVersion, contextDigest: adapterInput.contextDigest,
    inputDigest: digest('AGENT_STAGE_ADAPTER_INPUT_V1', adapterInput), status: 'COMPLETED',
    authoritative: false, artifactDigests: [planManifest.planDigest, planManifest.fixtureDigest,
      acceptance.acceptanceDigest, gate.gateDigest].sort(), errorCodes: [],
  };
  validateStageAdapterResult(stageResult);
  const projection = {
    kind: 'OFFLINE_DEPLOYMENT_WAIT_PROJECTION', schemaVersion: 1,
    producer: 'P5_G_DEPLOYMENT_PLAN_ADAPTER', authoritative: false,
    status: 'WAITING_FOR_USER', stageSatisfied: false, downstreamAuthorized: false,
    deploymentExecuted: false, productionReady: false, authoritySwitchAllowed: false,
    legacyPlanDigestCompatible: false, planDigest: planManifest.planDigest,
  };
  return deepFreeze({ stageResult, planManifest, projection,
    deploymentExecuted: false, productionReady: false, authoritySwitchAllowed: false,
    productionEffects: 0 });
}

export function assertTrustedDeploymentPlan(planManifest) {
  if (!planManifest || !trustedDeploymentPlans.has(planManifest))
    fail('DEPLOYMENT_PLAN_UNTRUSTED', 'Deployment plan was not issued by the P5-G adapter');
  return planManifest;
}
