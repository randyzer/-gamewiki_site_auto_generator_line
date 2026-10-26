import { readFileSync } from 'node:fs';
import { parseStrictJson } from './canonical-json.mjs';
import { ContractError } from './errors.mjs';
import { validateSchema } from './schema-validator.mjs';

const load = name => parseStrictJson(readFileSync(new URL(`./schemas/${name}`, import.meta.url)), name);
const deepFreeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
};
const extendSchema = (base, overlay, inheritedProperties = {}) => ({
  ...base,
  $id: overlay.$id,
  required: [...new Set([...(base.required ?? []), ...(overlay.required ?? [])])],
  properties: { ...base.properties, ...inheritedProperties, ...overlay.properties },
});
const stageCommitCandidateV1 = load('stage-commit-candidate.v1.json');
const stageCommitRecordV1 = load('stage-commit-record.v1.json');
const stageCommitCandidateV2 = extendSchema(stageCommitCandidateV1, load('stage-commit-candidate.v2.json'));
const stageCommitRecordV2 = extendSchema(stageCommitRecordV1, load('stage-commit-record.v2.json'), {
  workerStop: stageCommitCandidateV1.properties.workerStop,
  requestScope: stageCommitCandidateV1.properties.requestScope,
  state: stageCommitCandidateV1.properties.state,
  errors: stageCommitCandidateV1.properties.errors,
  events: stageCommitCandidateV1.properties.events,
});
const definitions = new Map([
  ['HOST_SOURCE_ANCHOR:1', { kind: 'HOST_SOURCE_ANCHOR', schemaVersion: 1,
    producer: 'PRODUCTION_HOST_SOURCE_ANCHOR_V1', validator: 'CONTRACT_REGISTRY',
    schema: load('host-source-anchor.v1.json') }],
  ['ATTEMPT_ALLOCATION:1', { kind: 'ATTEMPT_ALLOCATION', schemaVersion: 1,
    producer: 'PRODUCTION_ATTEMPT_COORDINATOR_V1', validator: 'CONTRACT_REGISTRY',
    schema: load('attempt-allocation.v1.json') }],
  ['EXECUTION_CONTEXT:1', { kind: 'EXECUTION_CONTEXT', schemaVersion: 1,
    producer: 'HOST', validator: 'CONTRACT_REGISTRY', schema: load('execution-context.v1.json') }],
  ['KEYWORD_MATERIAL:1', { kind: 'KEYWORD_MATERIAL', schemaVersion: 1,
    producer: 'ADAPTER', validator: 'CONTRACT_REGISTRY', schema: load('keyword-material.v1.json') }],
  ['EVIDENCE_PLAN:3', { kind: 'EVIDENCE_PLAN', schemaVersion: 3,
    producer: 'HOST_PLAN_BUILDER', validator: 'CONTRACT_REGISTRY', schema: load('evidence-plan.v3.json') }],
  ['EVIDENCE_CLAIM:3', { kind: 'EVIDENCE_CLAIM', schemaVersion: 3,
    producer: 'WORKER', validator: 'CONTRACT_REGISTRY', schema: load('evidence-claim.v3.json') }],
  ['HOST_OBSERVATION:1', { kind: 'HOST_OBSERVATION', schemaVersion: 1,
    producer: 'HOST_EVIDENCE_BROKER', validator: 'CONTRACT_REGISTRY', schema: load('host-observation.v1.json') }],
  ['EVIDENCE_OUTCOME:3', { kind: 'EVIDENCE_OUTCOME', schemaVersion: 3,
    producer: 'EVIDENCE_ASSESSOR', validator: 'CONTRACT_REGISTRY', schema: load('evidence-outcome.v3.json') }],
  ['STATE_EVENT:1', { kind: 'STATE_EVENT', schemaVersion: 1,
    producer: 'STATE_ENGINE', validator: 'CONTRACT_REGISTRY', schema: load('state-event.v1.json') }],
  ['STAGE_COMMIT_CANDIDATE:1', { kind: 'STAGE_COMMIT_CANDIDATE', schemaVersion: 1,
    producer: 'STATE_ENGINE', validator: 'CONTRACT_REGISTRY', schema: stageCommitCandidateV1 }],
  ['STAGE_COMMIT_CANDIDATE:2', { kind: 'STAGE_COMMIT_CANDIDATE', schemaVersion: 2,
    producer: 'V2_TRANSACTION_COORDINATOR', validator: 'CONTRACT_REGISTRY', schema: stageCommitCandidateV2 }],
  ['STAGE_COMMIT_RECORD:1', { kind: 'STAGE_COMMIT_RECORD', schemaVersion: 1,
    producer: 'STAGE_COMMIT_STORE', validator: 'CONTRACT_REGISTRY', schema: stageCommitRecordV1 }],
  ['STAGE_COMMIT_RECORD:2', { kind: 'STAGE_COMMIT_RECORD', schemaVersion: 2,
    producer: 'V2_OFFLINE_STAGE_COMMIT_STORE', validator: 'CONTRACT_REGISTRY', schema: stageCommitRecordV2 }],
  ['STAGE_CHECKPOINT:1', { kind: 'STAGE_CHECKPOINT', schemaVersion: 1,
    producer: 'STATE_RECOVERY', validator: 'CONTRACT_REGISTRY', schema: load('stage-checkpoint.v1.json') }],
  ['APPROVAL_REQUEST:1', { kind: 'APPROVAL_REQUEST', schemaVersion: 1,
    producer: 'APPROVAL_REQUEST_BUILDER', validator: 'CONTRACT_REGISTRY', schema: load('approval-request.v1.json') }],
  ['APPROVAL_RECORD:1', { kind: 'APPROVAL_RECORD', schemaVersion: 1,
    producer: 'SIMULATED_APPROVAL_AUTHORITY', validator: 'CONTRACT_REGISTRY', schema: load('approval-record.v1.json') }],
  ['APPROVAL_REFERENCE:1', { kind: 'APPROVAL_REFERENCE', schemaVersion: 1,
    producer: 'APPROVAL_STORE', validator: 'CONTRACT_REGISTRY', schema: load('approval-reference.v1.json') }],
  ['APPROVAL_CONSUMPTION:1', { kind: 'APPROVAL_CONSUMPTION', schemaVersion: 1,
    producer: 'APPROVAL_CONSUMPTION_STORE', validator: 'CONTRACT_REGISTRY', schema: load('approval-consumption.v1.json') }],
  ['APPROVAL_CONSUMPTION:2', { kind: 'APPROVAL_CONSUMPTION', schemaVersion: 2,
    producer: 'APPROVAL_CONSUMPTION_STORE', validator: 'CONTRACT_REGISTRY', schema: load('approval-consumption.v2.json') }],
  ['APPROVAL_REVOCATION:1', { kind: 'APPROVAL_REVOCATION', schemaVersion: 1,
    producer: 'SIMULATED_APPROVAL_AUTHORITY', validator: 'CONTRACT_REGISTRY', schema: load('approval-revocation.v1.json') }],
  ['VALIDATED_STAGE_RESULT:1', { kind: 'VALIDATED_STAGE_RESULT', schemaVersion: 1,
    producer: 'SIMULATED_HOST_STAGE_VALIDATOR', validator: 'CONTRACT_REGISTRY', schema: load('validated-stage-result.v1.json') }],
  ['RESEARCH_HANDOFF:2', { kind: 'RESEARCH_HANDOFF', schemaVersion: 2,
    producer: 'CANONICAL_HANDOFF_BUILDER', validator: 'CONTRACT_REGISTRY', schema: load('research-handoff.v2.json') }],
  ['ROUTE_PUBLICATION:2', { kind: 'ROUTE_PUBLICATION', schemaVersion: 2,
    producer: 'PUBLICATION_ENGINE', validator: 'CONTRACT_REGISTRY', schema: load('route-publication.v2.json') }],
  ['ROUTE_COVERAGE:1', { kind: 'ROUTE_COVERAGE', schemaVersion: 1,
    producer: 'SIMULATED_HOST_ROUTE_DISCOVERY', validator: 'CONTRACT_REGISTRY', schema: load('route-coverage.v1.json') }],
  ['PUBLICATION_PROOF:1', { kind: 'PUBLICATION_PROOF', schemaVersion: 1,
    producer: 'PUBLICATION_PROOF_VALIDATOR', validator: 'CONTRACT_REGISTRY', schema: load('publication-proof.v1.json') }],
  ['STAGE_ADAPTER_INPUT:1', { kind: 'STAGE_ADAPTER_INPUT', schemaVersion: 1,
    producer: 'V2_OFFLINE_HOST', validator: 'CONTRACT_REGISTRY', schema: load('stage-adapter-input.v1.json') }],
  ['STAGE_ADAPTER_RESULT:1', { kind: 'STAGE_ADAPTER_RESULT', schemaVersion: 1,
    producer: 'V2_STAGE_ADAPTER', validator: 'CONTRACT_REGISTRY', schema: load('stage-adapter-result.v1.json') }],
  ['KEYWORD_LEGACY_SNAPSHOT:1', { kind: 'KEYWORD_LEGACY_SNAPSHOT', schemaVersion: 1,
    producer: 'V2_OFFLINE_HOST', validator: 'CONTRACT_REGISTRY', schema: load('keyword-legacy-snapshot.v1.json') }],
  ['SHADOW_DIFF:1', { kind: 'SHADOW_DIFF', schemaVersion: 1,
    producer: 'V2_SHADOW_COMPARATOR', validator: 'CONTRACT_REGISTRY', schema: load('shadow-diff.v1.json') }],
  ['SHADOW_DIFF:2', { kind: 'SHADOW_DIFF', schemaVersion: 2,
    producer: 'V2_SHADOW_COMPARATOR', validator: 'CONTRACT_REGISTRY', schema: load('shadow-diff.v2.json') }],
  ['HOMEPAGE_FIXTURE:1', { kind: 'HOMEPAGE_FIXTURE', schemaVersion: 1,
    producer: 'P5_D_FIXTURE_DERIVER', validator: 'CONTRACT_REGISTRY', schema: load('homepage-fixture.v1.json') }],
  ['TEMPLATE_FIXTURE:1', { kind: 'TEMPLATE_FIXTURE', schemaVersion: 1,
    producer: 'P5_D_OFFLINE_FIXTURE', validator: 'CONTRACT_REGISTRY', schema: load('template-fixture.v1.json') }],
  ['STAGE_GATE_BINDING:1', { kind: 'STAGE_GATE_BINDING', schemaVersion: 1,
    producer: 'V2_OFFLINE_HOST', validator: 'CONTRACT_REGISTRY', schema: load('stage-gate-binding.v1.json') }],
  ['TRANSACTION_INTENT:1', { kind: 'TRANSACTION_INTENT', schemaVersion: 1,
    producer: 'V2_TRANSACTION_COORDINATOR', validator: 'CONTRACT_REGISTRY', schema: load('transaction-intent.v1.json') }],
  ['TRANSACTION_OUTCOME:1', { kind: 'TRANSACTION_OUTCOME', schemaVersion: 1,
    producer: 'V2_TRANSACTION_COORDINATOR', validator: 'CONTRACT_REGISTRY', schema: load('transaction-outcome.v1.json') }],
  ['MIGRATION_DECISION:1', { kind: 'MIGRATION_DECISION', schemaVersion: 1,
    producer: 'V2_OFFLINE_STAGE_COORDINATOR', validator: 'CONTRACT_REGISTRY', schema: load('migration-decision.v1.json') }],
  ['STAGE4_READINESS_ATTESTATION:1', { kind: 'STAGE4_READINESS_ATTESTATION', schemaVersion: 1,
    producer: 'HOST_STAGE4_READINESS_GATE', validator: 'CONTRACT_REGISTRY',
    schema: load('stage4-readiness-attestation.v1.json') }],
  ['IMMUTABLE_INTEGRATION_LINEAGE:1', { kind: 'IMMUTABLE_INTEGRATION_LINEAGE', schemaVersion: 1,
    producer: 'SITE_ACCEPTANCE_CONTRACT', validator: 'CONTRACT_REGISTRY',
    schema: load('immutable-integration-lineage.v1.json') }],
  ['CURRENT_SITE_BASELINE:1', { kind: 'CURRENT_SITE_BASELINE', schemaVersion: 1,
    producer: 'SITE_ACCEPTANCE_CONTRACT', validator: 'CONTRACT_REGISTRY',
    schema: load('current-site-baseline.v1.json') }],
  ['SITE_ACCEPTANCE_IDENTITY:1', { kind: 'SITE_ACCEPTANCE_IDENTITY', schemaVersion: 1,
    producer: 'SITE_ACCEPTANCE_CONTRACT', validator: 'CONTRACT_REGISTRY',
    schema: load('site-acceptance-identity.v1.json') }],
  ['SITE_REACCEPTANCE_AUTHORIZATION:1', { kind: 'SITE_REACCEPTANCE_AUTHORIZATION', schemaVersion: 1,
    producer: 'SITE_ACCEPTANCE_CONTRACT', validator: 'CONTRACT_REGISTRY',
    schema: load('site-reacceptance-authorization.v1.json') }],
  ['SITE_REACCEPTANCE_AUTHORIZATION_RESERVATION:1', {
    kind: 'SITE_REACCEPTANCE_AUTHORIZATION_RESERVATION', schemaVersion: 1,
    producer: 'SITE_ACCEPTANCE_CONTRACT', validator: 'CONTRACT_REGISTRY',
    schema: load('site-reacceptance-authorization-reservation.v1.json') }],
  ['SITE_REACCEPTANCE_AUTHORIZATION_CONSUMPTION:1', {
    kind: 'SITE_REACCEPTANCE_AUTHORIZATION_CONSUMPTION', schemaVersion: 1,
    producer: 'SITE_ACCEPTANCE_CONTRACT', validator: 'CONTRACT_REGISTRY',
    schema: load('site-reacceptance-authorization-consumption.v1.json') }],
  ['PUBLICATION_EVIDENCE_BODY:1', { kind: 'PUBLICATION_EVIDENCE_BODY', schemaVersion: 1,
    producer: 'EFFECTIVE_PUBLICATION_ATTESTATION', validator: 'CONTRACT_REGISTRY',
    schema: load('publication-evidence-body.v1.json') }],
  ['DERIVED_PUBLICATION_ATTESTATION:1', { kind: 'DERIVED_PUBLICATION_ATTESTATION', schemaVersion: 1,
    producer: 'EFFECTIVE_PUBLICATION_ATTESTATION', validator: 'CONTRACT_REGISTRY',
    schema: load('derived-publication-attestation.v1.json') }],
  ['SITE_REMEDIATION_PREVIEW:1', { kind: 'SITE_REMEDIATION_PREVIEW', schemaVersion: 1,
    producer: 'SITE_REMEDIATION_TRANSACTION', validator: 'CONTRACT_REGISTRY',
    schema: load('site-remediation-preview.v1.json') }],
  ['SITE_REMEDIATION_INTENT:1', { kind: 'SITE_REMEDIATION_INTENT', schemaVersion: 1,
    producer: 'SITE_REMEDIATION_TRANSACTION', validator: 'CONTRACT_REGISTRY',
    schema: load('site-remediation-intent.v1.json') }],
  ['SITE_REMEDIATION_RECEIPT:1', { kind: 'SITE_REMEDIATION_RECEIPT', schemaVersion: 1,
    producer: 'SITE_REMEDIATION_TRANSACTION', validator: 'CONTRACT_REGISTRY',
    schema: load('site-remediation-receipt.v1.json') }],
  ['SITE_REMEDIATION_ABORT:1', { kind: 'SITE_REMEDIATION_ABORT', schemaVersion: 1,
    producer: 'SITE_REMEDIATION_TRANSACTION', validator: 'CONTRACT_REGISTRY',
    schema: load('site-remediation-abort.v1.json') }],
]);
for (const definition of definitions.values()) deepFreeze(definition);

export const approvalPurposes = deepFreeze([
  'RUN_EXECUTION', 'SERVICE_RESUME', 'PARTIAL_HANDOFF',
  'UI_MODIFICATION', 'DEPLOYMENT_PLAN', 'DEPLOYMENT_EXECUTION',
]);
const purposeSet = new Set(approvalPurposes);

export function assertContractPurpose(purpose) {
  if (!purposeSet.has(purpose)) {
    throw new ContractError('CONTRACT_PURPOSE_UNKNOWN',
      `Purpose is not registered: ${String(purpose)}`, { purpose });
  }
  return purpose;
}

export function contractDefinition(kind, schemaVersion) {
  const definition = definitions.get(`${kind}:${schemaVersion}`);
  if (definition) return definition;
  const knownKind = [...definitions.values()].some(item => item.kind === kind);
  throw new ContractError(knownKind ? 'CONTRACT_VERSION_UNSUPPORTED' : 'CONTRACT_KIND_UNKNOWN',
    `Unsupported contract: ${kind} version ${schemaVersion}`, { kind, schemaVersion });
}

export function validateContract(kind, schemaVersion, value) {
  const definition = contractDefinition(kind, schemaVersion);
  if (value?.kind !== kind || value?.schemaVersion !== schemaVersion) {
    throw new ContractError('CONTRACT_BINDING_MISMATCH',
      `Contract envelope does not match ${kind} version ${schemaVersion}`, { kind, schemaVersion });
  }
  return validateSchema(definition.schema, value);
}

export const contractRegistry = Object.freeze([...definitions.values()]);
