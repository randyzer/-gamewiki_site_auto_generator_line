import { createHash } from 'node:crypto';
import { canonicalJson } from '../contracts/canonical-json.mjs';

const digest = (domain, value) => createHash('sha256')
  .update(`${domain}\n${canonicalJson(value)}`).digest('hex');

export function computeCandidateDigest(candidate) {
  const { candidateDigest: ignored, ...payload } = candidate;
  return digest('AGENT_STAGE_COMMIT_CANDIDATE_V1', payload);
}

export function computeCommitDigest(record) {
  const { commitDigest: ignored, ...payload } = record;
  return digest('AGENT_STAGE_COMMIT_RECORD_V1', payload);
}
