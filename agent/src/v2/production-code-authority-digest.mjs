import { createHash } from 'node:crypto';
import { canonicalJson } from '../contracts/canonical-json.mjs';
import { ContractError } from '../contracts/errors.mjs';
import { validateContract } from '../contracts/registry.mjs';

const domains = Object.freeze({
  CODE_AUTHORITY_APPROVAL: 'AGENT_CODE_AUTHORITY_APPROVAL_V1',
  CODE_AUTHORITY_REVOCATION: 'AGENT_CODE_AUTHORITY_REVOCATION_V1',
});
const sha256 = value => createHash('sha256').update(value).digest('hex');
const fail = message => { throw new ContractError('CODE_AUTHORITY_SCHEMA_INVALID', message); };

export function computeCodeAuthorityEventDigest(event) {
  if (!event || typeof event !== 'object' || Array.isArray(event)) {
    fail('Code authority event must be an object');
  }
  const domain = domains[event.kind];
  if (!domain || event.schemaVersion !== 1) fail('Code authority event kind is unsupported');
  const hasDigest = Object.hasOwn(event, 'eventDigest');
  const hasSignature = Object.hasOwn(event, 'signature');
  if (hasDigest !== hasSignature) fail('Code authority digest and signature must be present together');
  const { eventDigest: ignoredDigest, signature: ignoredSignature, ...payload } = event;
  validateContract(event.kind, 1, {
    ...payload,
    eventDigest: '0'.repeat(64),
    signature: '0'.repeat(128),
  });
  return sha256(`${domain}\n${canonicalJson(payload)}`);
}
