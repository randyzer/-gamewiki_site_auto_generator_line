import { createHash } from 'node:crypto';
import { canonicalJson } from '../contracts/canonical-json.mjs';

const equal = (left, right, fields) => fields.every(field => left[field] === right[field]);
const trustedVerifiers = new WeakSet();
const trustedAuthorizationCapabilities = new WeakSet();
const partialRules = new Map([
  ['stage-2:stage-3:PARTIAL_HANDOFF', 'V2_STAGE2_PARTIAL_TO_STAGE3'],
  ['stage-2:stage-4:PARTIAL_HANDOFF', 'V2_STAGE2_PARTIAL_TO_STAGE4_DRAFT'],
]);
const digestApproval = value => createHash('sha256')
  .update(`AGENT_SIMULATED_PARTIAL_APPROVAL_V1\n${canonicalJson(value)}`).digest('hex');

export function createTestDependencyApprovalHarness() {
  const approvals = new Map();
  const verifier = Object.freeze({
    verify(reference) {
      if (reference?.mode !== 'SIMULATED' || !/^approval-[a-f0-9]{24}$/.test(reference.approvalId ?? '') ||
          !/^[a-f0-9]{64}$/.test(reference.approvalDigest ?? '')) return null;
      const approval = approvals.get(reference.approvalId);
      if (!approval || digestApproval(approval) !== reference.approvalDigest) return null;
      return structuredClone(approval);
    },
  });
  trustedVerifiers.add(verifier);
  return Object.freeze({
    issue(input) {
      const approvalId = `approval-${createHash('sha256').update(canonicalJson(input)).digest('hex').slice(0, 24)}`;
      const approval = { ...structuredClone(input), approvalId, mode: 'SIMULATED' };
      approvals.set(approvalId, approval);
      return Object.freeze({ approvalId, approvalDigest: digestApproval(approval), mode: 'SIMULATED' });
    },
    verifier,
  });
}

export function dependencySatisfied({ projection, producerStageId, consumerStageId, purpose,
  contextDigest, handoffDigest, approvalReference = null, approvalVerifier = null,
  authorizationCapability = null,
  now = new Date().toISOString() }) {
  const denied = reason => Object.freeze({ satisfied: false, reason, ruleId: null, approvalDigest: null });
  const completeStatus = ['PASSED', 'COMPLETED'].includes(projection?.status);
  if (typeof projection?.stageSatisfied !== 'boolean' ||
      (projection.stageSatisfied && !completeStatus) || (!projection.stageSatisfied && completeStatus)) {
    return denied('PROJECTION_INCONSISTENT');
  }
  if (authorizationCapability && (approvalReference || approvalVerifier)) {
    return denied('AUTHORIZATION_PATH_AMBIGUOUS');
  }
  let authorized = null;
  if (authorizationCapability) {
    if (!trustedAuthorizationCapabilities.has(authorizationCapability))
      return denied('AUTHORIZATION_CAPABILITY_UNTRUSTED');
    authorized = authorizationCapability.binding;
    if (purpose !== 'PARTIAL_HANDOFF' || authorized.stageId !== producerStageId ||
        authorized.consumerStage !== consumerStageId || authorized.contextDigest !== contextDigest ||
        authorized.handoffDigest !== handoffDigest) return denied('HANDOFF_BINDING_MISMATCH');
  }
  if (projection.stageSatisfied) {
    if (authorized && (authorized.authorizationStatus !== 'NOT_REQUIRED' || authorized.pendingRows.length ||
        authorized.materials.some(item => item.canonicalStatus !== 'COMPLETED' ||
          item.publicationEligibility !== 'ELIGIBLE'))) return denied('HANDOFF_PROJECTION_MISMATCH');
    return Object.freeze({ satisfied: true,
      reason: 'STAGE_SATISFIED', ruleId: 'V2_COMPLETE_STAGE', approvalDigest: null });
  }
  if (projection?.status !== 'PARTIAL') return denied('PRODUCER_NOT_SATISFIED');
  const ruleId = partialRules.get(`${producerStageId}:${consumerStageId}:${purpose}`);
  if (!ruleId) return denied('PARTIAL_RULE_DENIED');
  if (authorized) {
    if (authorized.authorizationStatus !== 'CONSUMED' || !authorized.approvalConsumptionDigest)
      return denied('HANDOFF_APPROVAL_REQUIRED');
    return Object.freeze({ satisfied: true, reason: 'PARTIAL_HANDOFF_APPROVED', ruleId,
      approvalDigest: authorized.approvalConsumptionDigest });
  }
  if (!approvalReference || !trustedVerifiers.has(approvalVerifier)) return denied('TRUSTED_APPROVAL_REQUIRED');
  const approval = approvalVerifier.verify(approvalReference);
  if (!approval) return denied('APPROVAL_REFERENCE_INVALID');
  const expected = { producerStageId, consumerStageId, purpose, contextDigest, handoffDigest };
  if (!equal(approval, expected, Object.keys(expected))) return denied('APPROVAL_BINDING_MISMATCH');
  const expiry = Date.parse(approval.expiresAt), current = Date.parse(now);
  if (!Number.isFinite(expiry) || !Number.isFinite(current)) return denied('APPROVAL_TIME_INVALID');
  if (approval.consumed || expiry <= current)
    return denied(approval.consumed ? 'APPROVAL_CONSUMED' : 'APPROVAL_EXPIRED');
  return Object.freeze({ satisfied: true, reason: 'PARTIAL_HANDOFF_APPROVED', ruleId,
    approvalDigest: approvalReference.approvalDigest });
}

export function createAuthorizedDependencyPolicyAdapter({ verifyAuthorizedHandoff }) {
  if (typeof verifyAuthorizedHandoff !== 'function') throw new TypeError('Authorized handoff verifier is required');
  return Object.freeze({ evaluate(input) {
    const handoff = verifyAuthorizedHandoff(input.handoff);
    const capability = Object.freeze({ binding: Object.freeze({
      stageId: handoff.stageId, consumerStage: handoff.consumerStage,
      contextDigest: handoff.contextDigest, handoffDigest: handoff.handoffDigest,
      authorizationStatus: handoff.authorizationStatus,
      approvalConsumptionDigest: handoff.approvalConsumptionDigest,
      pendingRows: handoff.pendingRows,
      materials: handoff.materials,
    }) });
    trustedAuthorizationCapabilities.add(capability);
    const { handoff: ignored, ...policyInput } = input;
    return dependencySatisfied({ ...policyInput, authorizationCapability: capability });
  } });
}
