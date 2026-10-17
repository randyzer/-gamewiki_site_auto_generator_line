import { createHash } from 'node:crypto';
import { canonicalJson } from './canonical-json.mjs';
import { ContractError } from './errors.mjs';
import { assertContractPurpose, validateContract } from './registry.mjs';

const sha256 = value => createHash('sha256').update(value).digest('hex');

export function executionContextDigest(context) {
  validateContract('EXECUTION_CONTEXT', context?.schemaVersion, context);
  return sha256(`AGENT_EXECUTION_CONTEXT_V1\n${canonicalJson(context)}`);
}

export function purposeContextDigest(contextDigest, purpose, purposePayload) {
  if (!/^[a-f0-9]{64}$/.test(contextDigest ?? '')) {
    throw new ContractError('CONTEXT_DIGEST_MISMATCH', 'Invalid context digest');
  }
  const registeredPurpose = assertContractPurpose(purpose);
  return sha256(`AGENT_PURPOSE_CONTEXT_V1\n${canonicalJson({
    contextDigest, purpose: registeredPurpose, purposePayload,
  })}`);
}
