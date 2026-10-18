import { ContractError } from '../contracts/errors.mjs';
import { assertConsumableHandoff } from '../handoff-v2/canonical-handoff.mjs';
import { dependencySatisfied } from '../state/dependency-rules.mjs';
import { resolveStageIdentity } from './stage-identity.mjs';

const fail = (code, message) => { throw new ContractError(code, message); };

export function requireStageDependency({ handoff, projection, runId, contextDigest,
  producerCanonicalStageId, consumerCanonicalStageId, purpose }) {
  const producer = resolveStageIdentity({ namespace: 'canonical-stage-id', value: producerCanonicalStageId });
  const consumer = resolveStageIdentity({ namespace: 'canonical-stage-id', value: consumerCanonicalStageId });
  const trusted = assertConsumableHandoff(handoff);
  if (purpose !== 'PARTIAL_HANDOFF' || trusted.runId !== runId || trusted.contextDigest !== contextDigest ||
      trusted.stageId !== producer.shadowAlias || trusted.consumerStage !== consumer.shadowAlias) {
    fail('DEPENDENCY_BINDING_MISMATCH', 'Canonical dependency does not bind this run, stage, consumer or purpose');
  }
  const result = dependencySatisfied({ projection, producerStageId: producer.shadowAlias,
    consumerStageId: consumer.shadowAlias, purpose, contextDigest,
    handoffDigest: trusted.handoffDigest, alreadyAuthorizedHandoff: trusted });
  if (!result.satisfied) fail('DEPENDENCY_UNSATISFIED', `Stage dependency denied: ${result.reason}`);
  return Object.freeze({ ...result, producerCanonicalStageId, consumerCanonicalStageId,
    runId, contextDigest, handoffDigest: trusted.handoffDigest });
}
