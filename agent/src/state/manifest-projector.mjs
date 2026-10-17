import { assertStageState } from './state-engine.mjs';
import { requestScopeSatisfied } from './request-scope.mjs';

export function projectLegacyManifest({ state, skipExplicit = false, attentionRequired = null,
  failureCategory = null, nextAction = 'NONE', handoffApproval = null, requestScope = null } = {}) {
  assertStageState(state, { approvalBindingVerified: state.gate.status !== 'APPROVED' || handoffApproval?.bindingVerified === true });
  const { phase, reason } = state.execution;
  const artifact = state.artifact.status;
  const gate = state.gate.status;
  let status, rule;
  if (phase === 'NOT_STARTED') [status, rule] = ['NOT_STARTED', 'V2_NOT_STARTED'];
  else if (phase === 'READY') [status, rule] = ['READY', 'V2_READY'];
  else if (phase === 'RUNNING') [status, rule] = ['IN_PROGRESS', 'V2_RUNNING'];
  else if (skipExplicit && artifact === 'UNVERIFIED') [status, rule] = ['SKIPPED', 'V2_EXPLICIT_SKIP'];
  else if (artifact === 'INVALID') [status, rule] = ['FAILED', 'V2_ARTIFACT_INVALID'];
  else if (artifact === 'VALIDATED_PARTIAL') [status, rule] = ['PARTIAL', reason === 'TIMEOUT' ? 'V2_TIMEOUT_PARTIAL' : 'V2_VALIDATED_PARTIAL'];
  else if (artifact === 'UNVERIFIED' && ['FAILED', 'TIMEOUT', 'CANCELLED'].includes(reason)) [status, rule] = ['FAILED', 'V2_EXECUTION_FAILED_EMPTY'];
  else if (artifact === 'UNVERIFIED' && reason === 'BLOCKED') [status, rule] = [attentionRequired === 'USER' ? 'WAITING_FOR_USER' : 'BLOCKED', 'V2_BLOCKED_EMPTY'];
  else if (artifact === 'VALIDATED_COMPLETE' && gate === 'WAITING_FOR_APPROVAL') [status, rule] = ['WAITING_FOR_USER', 'V2_COMPLETE_WAITING'];
  else if (artifact === 'VALIDATED_COMPLETE' && ['ELIGIBLE', 'APPROVED'].includes(gate) &&
      requestScope && requestScopeSatisfied(requestScope)) [status, rule] = ['PASSED', 'V2_COMPLETE_SATISFIED'];
  else if (artifact === 'VALIDATED_COMPLETE' && ['ELIGIBLE', 'APPROVED'].includes(gate))
    [status, rule] = ['WAITING_FOR_USER', 'V2_COMPLETE_SCOPE_UNSATISFIED'];
  else [status, rule] = ['BLOCKED', 'V2_FAIL_CLOSED'];
  const stageSatisfied = status === 'PASSED';
  const downstreamAuthorized = artifact === 'VALIDATED_PARTIAL' && gate === 'APPROVED' &&
    handoffApproval?.bindingVerified === true;
  const inferredFailure = failureCategory ?? (['FAILED', 'TIMEOUT', 'CANCELLED'].includes(reason) ? 'EXECUTION_ERROR' : null);
  return Object.freeze({ status, stageSatisfied, downstreamAuthorized,
    attentionRequired: attentionRequired ?? (gate === 'WAITING_FOR_APPROVAL' ? 'APPROVAL' :
      rule === 'V2_COMPLETE_SCOPE_UNSATISFIED' ? 'REQUEST_SCOPE' : null),
    failureCategory: inferredFailure, nextAction, projectionRuleId: rule });
}

export function projectionMetadataFromRecord(record) {
  const priority = ['CONTRACT_ERROR', 'POLICY_DENIED', 'SERVICE_RESTRICTED', 'USER_INPUT_REQUIRED',
    'ENVIRONMENT_ERROR', 'EXECUTION_ERROR', 'EVIDENCE_GAP'];
  const failureCategory = priority.find(category => record.errors?.some(error => error.category === category)) ?? null;
  return { failureCategory, nextAction: record.nextAction };
}
