import { createHash } from 'node:crypto';
import { canonicalJson } from '../contracts/canonical-json.mjs';
import { ContractError } from '../contracts/errors.mjs';

const sha256 = value => createHash('sha256').update(value).digest('hex');

export function computeRequestScopeDigest(scope) {
  const { scopeDigest: ignored, ...payload } = scope;
  return sha256(`AGENT_REQUEST_SCOPE_V1\n${canonicalJson(payload)}`);
}

export function createRequestScopeAssessment({ required, satisfied, mode = 'SHADOW' }) {
  if (mode !== 'SHADOW' || !Array.isArray(required) || required.length === 0 || !Array.isArray(satisfied))
    throw new ContractError('STATE_SCOPE_INVALID', 'P3 requires a non-empty Shadow request scope');
  const uniqueRequired = [...new Set(required)].sort(); const uniqueSatisfied = [...new Set(satisfied)].sort();
  if (uniqueRequired.length !== required.length || uniqueSatisfied.length !== satisfied.length ||
      uniqueSatisfied.some(item => !uniqueRequired.includes(item)) ||
      [...uniqueRequired, ...uniqueSatisfied].some(item => typeof item !== 'string' || !item))
    throw new ContractError('STATE_SCOPE_INVALID', 'Request scope items must be unique and satisfied items must be required');
  const base = { mode, required: uniqueRequired, satisfied: uniqueSatisfied };
  return Object.freeze({ ...base, scopeDigest: computeRequestScopeDigest(base) });
}

export function assertRequestScopeAssessment(scope) {
  const recreated = createRequestScopeAssessment(scope);
  if (recreated.scopeDigest !== scope.scopeDigest)
    throw new ContractError('CONTRACT_DIGEST_MISMATCH', 'Request scope digest does not match its payload');
  return scope;
}

export function requestScopeSatisfied(scope) {
  assertRequestScopeAssessment(scope);
  return scope.required.every(item => scope.satisfied.includes(item));
}
