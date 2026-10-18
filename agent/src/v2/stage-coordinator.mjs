import { createHash } from 'node:crypto';
import { canonicalJson, deepFreeze } from '../contracts/canonical-json.mjs';
import { ContractError } from '../contracts/errors.mjs';
import { validateContract } from '../contracts/registry.mjs';
import { createKeywordResearchHandoff, keywordReplayPayloadDigest,
  replayKeywordResearchAttempt } from './adapters/keyword-research.mjs';
import { homepageReplayPayloadDigest, replayHomepageResearch } from './adapters/homepage-research.mjs';
import { replayTemplateSelection, templateReplayPayloadDigest } from './adapters/template-selection.mjs';
import { contentReplayPayloadDigest, replayContentIntegration } from './adapters/content-integration.mjs';
import { replayUiUxAudit, uiReplayPayloadDigest } from './adapters/ui-ux-audit.mjs';
import { prelaunchReplayPayloadDigest, replayPrelaunchAcceptance } from './adapters/prelaunch-acceptance.mjs';
import { deploymentReplayPayloadDigest, replayDeploymentPlan } from './adapters/deployment-plan.mjs';
import { captureSimulatedBuildEvidence } from './host/build-evidence-adapter.mjs';
import { replaySimulatedRouteProof } from './host/route-proof-adapter.mjs';
import { evaluateOfflineDeploymentGate } from './host/deployment-gate-adapter.mjs';
import { requireStageDependency } from './stage-dependency-gate.mjs';
import { validateStageAdapterResult } from './stage-adapter-contract.mjs';
import { createStageFeatureGateStore } from './stage-feature-gates.mjs';
import { STAGE_IDENTITY_MAPPING_VERSION } from './stage-identity.mjs';
import { stageRegistry } from './stage-registry.mjs';
import { recoverOfflineTransaction } from './migration-recovery.mjs';
import { readTransactionIntent } from './transaction-coordinator.mjs';

const sha256 = value => createHash('sha256').update(value).digest('hex');
const digest = (domain, value) => sha256(`${domain}\n${canonicalJson(value)}`);
const fail = (code, message) => { throw new ContractError(code, message); };
const stageIds = Object.freeze(stageRegistry.core.map(item => item.canonicalStageId));
const stageKeys = Object.freeze({
  'homepage-research': ['fixtureManifest', 'sourceFiles', 'derivedFiles', 'zipBytes'],
  'keyword-research': ['sourceAttempt', 'fixtureManifest', 'expected', 'lineage', 'materialBytes',
    'legacyIdentity', 'recoveryDigest', 'schemaBundleDigest', 'evidenceOutcomeDigest', 'siteRevision',
    'domain', 'templateHandoff', 'templateProjection'],
  'template-selection': ['fixtureManifest'],
  'content-integration': ['fixtureManifest', 'handoff', 'projection'],
  'ui-ux-audit': ['fixtureManifest'],
  'prelaunch-acceptance': ['fixtureManifest'],
  'deployment-plan': ['fixtureManifest'],
});
const missingEvidenceByStage = Object.freeze({
  'homepage-research': Object.freeze(['THREE_REAL_FORMAT_CHECKPOINTS_MISSING', 'ICON_LICENSE_UNVERIFIED']),
  'keyword-research': Object.freeze(['THREE_REAL_FORMAT_CHECKPOINTS_MISSING', 'CONTENT_AUTHORITY_UNPROVEN']),
  'template-selection': Object.freeze(['REAL_FORMAT_CHECKPOINT_MISSING', 'SOURCE_AND_COPY_UNVERIFIED']),
  'content-integration': Object.freeze(['REAL_FORMAT_CHECKPOINT_MISSING', 'KEYWORD_CONTENT_CONTINUITY_UNPROVEN']),
  'ui-ux-audit': Object.freeze(['REAL_FORMAT_CHECKPOINT_MISSING', 'REAL_VIEWPORT_CAPTURE_MISSING']),
  'prelaunch-acceptance': Object.freeze(['REAL_FORMAT_CHECKPOINT_MISSING', 'REAL_ROUTE_COVERAGE_MISSING']),
  'deployment-plan': Object.freeze(['REAL_FORMAT_CHECKPOINT_MISSING', 'EXTERNAL_EFFECT_EXECUTION_DISABLED']),
});
const recoveryAuthorities = new WeakMap();

function exactObject(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      canonicalJson(Object.keys(value).sort()) !== canonicalJson([...keys].sort()))
    fail('CONTRACT_SCHEMA_INVALID', `${label} fields do not match the closed contract`);
  return value;
}

export function computeMigrationDecisionDigest(value) {
  const { decisionDigest: ignored, ...payload } = value;
  return digest('AGENT_MIGRATION_DECISION_V1', payload);
}

export function assertMigrationDecision(value) {
  validateContract('MIGRATION_DECISION', 1, value);
  if (value.actualGateAfter !== value.actualGateBefore || value.currentGate !== value.actualGateBefore)
    fail('MIGRATION_GATE_MUTATION_DENIED', 'Offline migration evidence cannot change the actual feature gate');
  if (value.decisionDigest !== computeMigrationDecisionDigest(value))
    fail('CONTRACT_DIGEST_MISMATCH', 'Migration Decision digest mismatch');
  return value;
}

function migrationDecision(stageResult, gateBinding) {
  const base = {
    kind: 'MIGRATION_DECISION', schemaVersion: 1, producer: 'V2_OFFLINE_STAGE_COORDINATOR',
    mode: 'OFFLINE', authoritative: false, runId: stageResult.runId,
    contextDigest: stageResult.contextDigest, canonicalStageId: stageResult.canonicalStageId,
    mappingVersion: stageResult.mappingVersion, gateObservationScope: 'OFFLINE_SIMULATED',
    currentGate: gateBinding.featureGate,
    proposedGate: gateBinding.featureGate, actualGateBefore: gateBinding.featureGate,
    actualGateAfter: gateBinding.featureGate, decision: 'HOLD',
    evidenceDigests: [...new Set([stageResult.inputDigest, ...stageResult.artifactDigests])].sort(),
    missingEvidence: [...missingEvidenceByStage[stageResult.canonicalStageId]],
  };
  const value = deepFreeze({ ...base, decisionDigest: computeMigrationDecisionDigest(base) });
  assertMigrationDecision(value);
  return value;
}

function adapterInput({ runId, contextDigest, canonicalStageId, featureGate, gateBinding, payloadDigest }) {
  return deepFreeze({
    kind: 'STAGE_ADAPTER_INPUT', schemaVersion: 1, producer: 'V2_OFFLINE_HOST', mode: 'OFFLINE',
    runId, canonicalStageId, mappingVersion: STAGE_IDENTITY_MAPPING_VERSION, contextDigest, featureGate,
    gateBindingDigest: digest('AGENT_STAGE_GATE_BINDING_V1', gateBinding), payloadDigest,
  });
}

function checkedReplayBinding(binding) {
  exactObject(binding, ['runId', 'contextDigest', 'schemaBundleDigest', 'policyVersion'],
    'offline replay recovery binding');
  for (const key of ['runId', 'policyVersion']) {
    if (typeof binding[key] !== 'string' || !binding[key])
      fail('CONTRACT_SCHEMA_INVALID', `${key} must be a non-empty string`);
  }
  for (const key of ['contextDigest', 'schemaBundleDigest']) {
    if (!/^[a-f0-9]{64}$/.test(binding[key] ?? ''))
      fail('CONTRACT_SCHEMA_INVALID', `${key} must be a SHA256 digest`);
  }
  return binding;
}

export function offlineReplayOperationId(binding) {
  const checked = checkedReplayBinding(binding);
  return `op-${digest('AGENT_P5_H_OFFLINE_REPLAY_OPERATION_V1', {
    ...checked, mappingVersion: STAGE_IDENTITY_MAPPING_VERSION,
  }).slice(0, 32)}`;
}

function assertRecoverableStatus(status) {
  if (['NOT_STARTED', 'ABORTED_BEFORE_CONSUMPTION', 'COMMITTED'].includes(status)) return status;
  if (status === 'RECONCILIATION_REQUIRED')
    fail('RECONCILIATION_REQUIRED', 'Offline replay cannot continue while transaction reconciliation is required');
  if (status === 'PREPARED')
    fail('TRANSACTION_PENDING', 'Offline replay cannot continue while a prepared transaction is pending');
  fail('TRANSACTION_STATE_UNSUPPORTED', `Offline replay cannot consume transaction state ${String(status)}`);
}

export async function recoverOfflineReplayAuthority({ rootDirectory, approvalHarness,
  capabilityRegistry, capability, replayBinding, repair = true, clock = Date.now }) {
  const binding = checkedReplayBinding(replayBinding);
  const operationId = offlineReplayOperationId(binding);
  const currentBinding = { contextDigest: binding.contextDigest,
    schemaBundleDigest: binding.schemaBundleDigest, mappingVersion: STAGE_IDENTITY_MAPPING_VERSION,
    policyVersion: binding.policyVersion };
  const existingIntent = await readTransactionIntent({ rootDirectory, operationId });
  if (existingIntent && existingIntent.runId !== binding.runId)
    fail('TRANSACTION_AUTHORITY_MISMATCH', 'Transaction Intent does not bind the offline replay run');
  const recovered = await recoverOfflineTransaction({ rootDirectory, operationId, approvalHarness,
    capabilityRegistry, capability, repair, clock, currentBinding });
  assertRecoverableStatus(recovered.status);
  const intent = await readTransactionIntent({ rootDirectory, operationId });
  if (intent && (intent.runId !== binding.runId || intent.operationId !== operationId))
    fail('TRANSACTION_AUTHORITY_MISMATCH', 'Recovered transaction does not bind the offline replay run');
  const authority = deepFreeze({ kind: 'OFFLINE_REPLAY_RECOVERY_AUTHORITY', schemaVersion: 1,
    producer: 'V2_OFFLINE_STAGE_COORDINATOR', mode: 'OFFLINE_SIMULATED', operationId,
    recoveryStatus: recovered.status, runId: binding.runId, contextDigest: binding.contextDigest,
    schemaBundleDigest: binding.schemaBundleDigest, mappingVersion: STAGE_IDENTITY_MAPPING_VERSION,
    policyVersion: binding.policyVersion,
    recoveryDigest: digest('AGENT_P5_H_OFFLINE_REPLAY_RECOVERY_V1', recovered) });
  recoveryAuthorities.set(authority, { ...binding, operationId, recoveryStatus: recovered.status });
  return authority;
}

export function assertOfflineReplayTransactionAuthority(input, authority) {
  const trusted = recoveryAuthorities.get(authority);
  if (!trusted)
    fail('TRANSACTION_AUTHORITY_UNTRUSTED', 'Offline replay requires a directly recovered P5-B authority');
  const expected = checkedReplayBinding({ runId: input.runId, contextDigest: input.contextDigest,
    schemaBundleDigest: input.transactionBinding?.schemaBundleDigest,
    policyVersion: input.transactionBinding?.policyVersion });
  const operationId = offlineReplayOperationId(expected);
  for (const [key, value] of Object.entries({ ...expected, operationId })) {
    if (trusted[key] !== value)
      fail('TRANSACTION_AUTHORITY_MISMATCH', `Offline recovery authority does not match ${key}`);
  }
  assertRecoverableStatus(trusted.recoveryStatus);
  return authority;
}

function validateRequest(input) {
  exactObject(input, ['mode', 'runId', 'contextDigest', 'transactionBinding', 'requestedCapabilities',
    'featureGates', 'stages'], 'seven-stage coordinator input');
  if (input.mode !== 'OFFLINE_SIMULATED') fail('POLICY_DENIED', 'P5-H permits only OFFLINE_SIMULATED mode');
  exactObject(input.transactionBinding, ['schemaBundleDigest', 'policyVersion'], 'transactionBinding');
  checkedReplayBinding({ runId: input.runId, contextDigest: input.contextDigest,
    ...input.transactionBinding });
  if (!Array.isArray(input.requestedCapabilities))
    fail('CONTRACT_SCHEMA_INVALID', 'requestedCapabilities must be an array');
  if (input.requestedCapabilities.length)
    fail('POLICY_DENIED', `P5-H denies ${String(input.requestedCapabilities[0])}`);
  exactObject(input.featureGates, stageIds, 'featureGates');
  exactObject(input.stages, stageIds, 'stages');
  for (const stageId of stageIds) {
    stageRegistry.requireCore(stageId);
    exactObject(input.stages[stageId], stageKeys[stageId], `${stageId} input`);
    if (!['legacy', 'shadow', 'v2'].includes(input.featureGates[stageId]))
      fail('CONTRACT_SCHEMA_INVALID', `Invalid feature gate for ${stageId}`);
  }
}

export function replaySevenStageOffline(input, recoveryAuthority) {
  validateRequest(input);
  assertOfflineReplayTransactionAuthority(input, recoveryAuthority);
  const { runId, contextDigest, stages } = input;
  const gateStore = createStageFeatureGateStore();
  const bindings = Object.fromEntries(stageIds.map(canonicalStageId => {
    const binding = gateStore.bind({ runId, canonicalStageId, contextDigest,
      featureGate: input.featureGates[canonicalStageId] });
    return [canonicalStageId, binding];
  }));
  const makeInput = (canonicalStageId, payloadDigest) => adapterInput({ runId, contextDigest,
    canonicalStageId, featureGate: input.featureGates[canonicalStageId],
    gateBinding: bindings[canonicalStageId], payloadDigest });

  const homepageArgs = stages['homepage-research'];
  const homepage = replayHomepageResearch({ ...homepageArgs, requestedCapabilities: [],
    adapterInput: makeInput('homepage-research', homepageReplayPayloadDigest(homepageArgs)) });

  const keywordArgs = stages['keyword-research'];
  const keywordPayload = {
    fixtureManifest: keywordArgs.fixtureManifest, expected: keywordArgs.expected,
    lineage: keywordArgs.lineage, legacyIdentity: keywordArgs.legacyIdentity,
    materialBytes: keywordArgs.materialBytes,
  };
  const keyword = replayKeywordResearchAttempt({ ...keywordPayload,
    adapterInput: makeInput('keyword-research', keywordReplayPayloadDigest(keywordPayload)),
    sourceAttempt: keywordArgs.sourceAttempt, recoveryDigest: keywordArgs.recoveryDigest,
    schemaBundleDigest: keywordArgs.schemaBundleDigest,
    evidenceOutcomeDigest: keywordArgs.evidenceOutcomeDigest, siteRevision: keywordArgs.siteRevision,
    domain: keywordArgs.domain });
  const expectedTemplateHandoff = createKeywordResearchHandoff({ replay: keyword,
    consumerCanonicalStageId: 'template-selection' });
  if (expectedTemplateHandoff.handoffDigest !== keywordArgs.templateHandoff?.handoffDigest)
    fail('CONTRACT_BINDING_MISMATCH', 'Template handoff does not bind the current keyword replay');
  const templateDependency = requireStageDependency({ handoff: keywordArgs.templateHandoff,
    projection: keywordArgs.templateProjection, runId, contextDigest,
    producerCanonicalStageId: 'keyword-research', consumerCanonicalStageId: 'template-selection',
    purpose: 'PARTIAL_HANDOFF' });

  const templateArgs = stages['template-selection'];
  const template = replayTemplateSelection({ fixtureManifest: templateArgs.fixtureManifest,
    requestedCapabilities: [], adapterInput: makeInput('template-selection',
      templateReplayPayloadDigest({ fixtureManifest: templateArgs.fixtureManifest })) });

  const contentArgs = stages['content-integration'];
  const content = replayContentIntegration({ fixtureManifest: contentArgs.fixtureManifest,
    handoff: contentArgs.handoff, projection: contentArgs.projection, requestedCapabilities: [],
    adapterInput: makeInput('content-integration',
      contentReplayPayloadDigest({ fixtureManifest: contentArgs.fixtureManifest })) });

  const prelaunchArgs = stages['prelaunch-acceptance'];
  const buildEvidence = captureSimulatedBuildEvidence({ buildRecord: prelaunchArgs.fixtureManifest.build,
    requestedCapabilities: [] });
  const routeAssessment = replaySimulatedRouteProof({ routeRecord: prelaunchArgs.fixtureManifest.route,
    publicationDecision: content.publicationDecision, buildEvidence, requestedCapabilities: [] });

  const uiArgs = stages['ui-ux-audit'];
  const ui = replayUiUxAudit({ fixtureManifest: uiArgs.fixtureManifest,
    publicationDecision: content.publicationDecision, buildEvidence, routeAssessment,
    requestedCapabilities: [], adapterInput: makeInput('ui-ux-audit',
      uiReplayPayloadDigest({ fixtureManifest: uiArgs.fixtureManifest, buildEvidence, routeAssessment })) });

  const prelaunch = replayPrelaunchAcceptance({ fixtureManifest: prelaunchArgs.fixtureManifest,
    publicationDecision: content.publicationDecision, buildEvidence,
    uiAudit: ui.auditManifest, routeAssessment, requestedCapabilities: [],
    adapterInput: makeInput('prelaunch-acceptance', prelaunchReplayPayloadDigest({
      fixtureManifest: prelaunchArgs.fixtureManifest, buildEvidence,
      uiAudit: ui.auditManifest, routeAssessment })) });

  const deploymentArgs = stages['deployment-plan'];
  const deploymentGate = evaluateOfflineDeploymentGate({ requestedCapabilities: [],
    externalEffectState: deploymentArgs.fixtureManifest.externalEffectState, approval: null });
  const deployment = replayDeploymentPlan({ fixtureManifest: deploymentArgs.fixtureManifest,
    adapterInput: makeInput('deployment-plan', deploymentReplayPayloadDigest({
      fixtureManifest: deploymentArgs.fixtureManifest, buildEvidence,
      uiAudit: ui.auditManifest, routeAssessment, deploymentGate })),
    prelaunchFixture: prelaunchArgs.fixtureManifest,
    publicationDecision: content.publicationDecision, buildEvidence,
    uiAudit: ui.auditManifest, routeAssessment, deploymentGate,
    requestedCapabilities: [], approval: null });

  const replays = { 'homepage-research': homepage, 'keyword-research': keyword,
    'template-selection': template, 'content-integration': content, 'ui-ux-audit': ui,
    'prelaunch-acceptance': prelaunch, 'deployment-plan': deployment };
  const stageResults = stageIds.map(canonicalStageId => {
    const result = replays[canonicalStageId].stageResult;
    validateStageAdapterResult(result);
    if (result.runId !== runId || result.contextDigest !== contextDigest ||
        result.canonicalStageId !== canonicalStageId)
      fail('CONTRACT_BINDING_MISMATCH', `Stage result escaped the coordinator binding: ${canonicalStageId}`);
    return result;
  });
  const migrationDecisions = stageResults.map(result => migrationDecision(result,
    gateStore.get(runId, result.canonicalStageId)));
  return deepFreeze({
    kind: 'SEVEN_STAGE_OFFLINE_TRACE', schemaVersion: 1,
    producer: 'V2_OFFLINE_STAGE_COORDINATOR', mode: 'OFFLINE_SIMULATED', authoritative: false,
    runId, contextDigest, mappingVersion: STAGE_IDENTITY_MAPPING_VERSION,
    frameworkCeiling: 'P5_OFFLINE_FRAMEWORK_COMPLETE', terminalProjection: 'WAITING_FOR_USER',
    terminalProjectionScope: 'DEPLOYMENT_ADAPTER_LOCAL', adapterReplayComplete: true,
    endToEndDependencySatisfied: false,
    deploymentExecuted: false, productionReady: false, authoritySwitchAllowed: false,
    productionEffects: 0, chainIntegrity: 'OFFLINE_FIXTURE_BRIDGE_GAPS',
    fixtureBridgeGaps: ['KEYWORD_TO_CONTENT_FIXTURE_CONTINUITY_UNPROVEN'],
    transactionRecovery: { operationId: recoveryAuthority.operationId,
      status: recoveryAuthority.recoveryStatus, authority: 'P5_B_VERIFIED' },
    stageResults, migrationDecisions, templateDependency, buildEvidence, routeAssessment, replays,
  });
}
