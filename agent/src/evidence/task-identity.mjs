import { createHash } from 'node:crypto';
import { canonicalJson } from '../contracts/canonical-json.mjs';

const sha256 = value => createHash('sha256').update(value).digest('hex');

export function createCriterionId({ gapId, statement }) {
  return `criterion-${sha256(`AGENT_EVIDENCE_CRITERION_V1\n${canonicalJson({ gapId, statement })}`).slice(0, 24)}`;
}

export function createTaskId({ runId, stageId, attemptId, recoveryDigest, policyVersion,
  keyword, gapId, tool, target }) {
  return `task-${sha256(`AGENT_EVIDENCE_TASK_V3\n${canonicalJson({
    runId, stageId, attemptId, recoveryDigest, policyVersion, keyword, gapId, tool, target,
  })}`)}`;
}
