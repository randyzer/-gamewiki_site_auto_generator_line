import { ContractError } from '../contracts/errors.mjs';
import { assertConsumableHandoff } from '../handoff-v2/canonical-handoff.mjs';
import { createAuthorizedDependencyPolicyAdapter } from '../state/dependency-rules.mjs';
import { resolveStageIdentity } from './stage-identity.mjs';

const fail = (code, message) => { throw new ContractError(code, message); };
const authorizedPolicy = createAuthorizedDependencyPolicyAdapter({
  verifyAuthorizedHandoff: assertConsumableHandoff,
});

export function requireStageDependency({ handoff, projection, runId, contextDigest,
  producerCanonicalStageId, consumerCanonicalStageId, purpose }) {
  const producer = resolveStageIdentity({ namespace: 'canonical-stage-id', value: producerCanonicalStageId });
  const consumer = resolveStageIdentity({ namespace: 'canonical-stage-id', value: consumerCanonicalStageId });
  const trusted = assertConsumableHandoff(handoff);
  if (purpose !== 'PARTIAL_HANDOFF' || trusted.runId !== runId || trusted.contextDigest !== contextDigest ||
      trusted.stageId !== producer.shadowAlias || trusted.consumerStage !== consumer.shadowAlias) {
    fail('DEPENDENCY_BINDING_MISMATCH', 'Canonical dependency does not bind this run, stage, consumer or purpose');
  }
  const result = authorizedPolicy.evaluate({ handoff: trusted, projection,
    producerStageId: producer.shadowAlias,
    consumerStageId: consumer.shadowAlias, purpose, contextDigest,
    handoffDigest: trusted.handoffDigest });
  if (!result.satisfied) fail('DEPENDENCY_UNSATISFIED', `Stage dependency denied: ${result.reason}`);
  return Object.freeze({ ...result, producerCanonicalStageId, consumerCanonicalStageId,
    runId, contextDigest, handoffDigest: trusted.handoffDigest });
}
