import { ContractError } from '../contracts/errors.mjs';
import { assertConsumableHandoff } from '../handoff-v2/canonical-handoff.mjs';
import { matchDependencyPolicy } from '../state/dependency-rules.mjs';
import { resolveStageIdentity } from './stage-identity.mjs';

const fail = (code, message) => { throw new ContractError(code, message); };
const trustedDependencyResults = new WeakSet();

export function requireStageDependency({ handoff, projection, runId, contextDigest,
  producerCanonicalStageId, consumerCanonicalStageId, purpose }) {
  const producer = resolveStageIdentity({ namespace: 'canonical-stage-id', value: producerCanonicalStageId });
  const consumer = resolveStageIdentity({ namespace: 'canonical-stage-id', value: consumerCanonicalStageId });
  const trusted = assertConsumableHandoff(handoff);
  if (purpose !== 'PARTIAL_HANDOFF' || trusted.runId !== runId || trusted.contextDigest !== contextDigest ||
      trusted.stageId !== producer.shadowAlias || trusted.consumerStage !== consumer.shadowAlias) {
    fail('DEPENDENCY_BINDING_MISMATCH', 'Canonical dependency does not bind this run, stage, consumer or purpose');
  }
  const policy = matchDependencyPolicy({ projection, producerStageId: producer.shadowAlias,
    consumerStageId: consumer.shadowAlias, purpose });
  if (!policy.matched) fail('DEPENDENCY_UNSATISFIED', `Stage dependency denied: ${policy.reason}`);
  let approvalDigest = null;
  if (policy.approvalRequired) {
    if (trusted.authorizationStatus !== 'CONSUMED' || !trusted.approvalConsumptionDigest) {
      fail('HANDOFF_APPROVAL_REQUIRED', 'Partial dependency requires one consumed handoff approval');
    }
    approvalDigest = trusted.approvalConsumptionDigest;
  } else if (trusted.authorizationStatus !== 'NOT_REQUIRED' || trusted.pendingRows.length ||
      trusted.materials.some(item => item.canonicalStatus !== 'COMPLETED' ||
        item.publicationEligibility !== 'ELIGIBLE')) {
    fail('HANDOFF_PROJECTION_MISMATCH', 'Completed dependency does not match its canonical handoff');
  }
  const result = Object.freeze({ satisfied: true,
    reason: policy.approvalRequired ? 'PARTIAL_HANDOFF_APPROVED' : 'STAGE_SATISFIED',
    ruleId: policy.ruleId, approvalDigest, producerCanonicalStageId, consumerCanonicalStageId,
    runId, contextDigest, handoffDigest: trusted.handoffDigest });
  trustedDependencyResults.add(result);
  return result;
}

export function assertTrustedStageDependency(result) {
  if (!trustedDependencyResults.has(result)) {
    fail('DEPENDENCY_RESULT_UNTRUSTED', 'Stage dependency result was not issued by the V2 gate');
  }
  return result;
}
