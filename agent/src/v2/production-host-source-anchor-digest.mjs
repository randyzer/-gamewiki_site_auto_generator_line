import { createHash } from 'node:crypto';
import { canonicalJson } from '../contracts/canonical-json.mjs';
import { ContractError } from '../contracts/errors.mjs';
import { validateContract } from '../contracts/registry.mjs';
import { assertCanonicalStageId, STAGE_IDENTITY_MAPPING_VERSION } from './stage-identity.mjs';
import { validateHostSourceVerifierMapping } from './production-host-source-verifier-registry.mjs';

export const HOST_SOURCE_ANCHOR_DIGEST_DOMAIN = 'AGENT_HOST_SOURCE_ANCHOR_V1';

const identityFields = Object.freeze([
  'runId', 'canonicalStageId', 'attemptId', 'requestedOperation', 'mappingVersion', 'allocationDigest',
]);
const sha256 = value => createHash('sha256').update(value).digest('hex');
const fail = (code, message) => { throw new ContractError(code, message); };

function structurallyValidate(anchor) {
  validateContract('HOST_SOURCE_ANCHOR', 1, anchor);
  validateHostSourceVerifierMapping(anchor);
  try { assertCanonicalStageId(anchor.canonicalStageId, { mappingVersion: anchor.mappingVersion }); }
  catch { fail('HOST_SOURCE_IDENTITY_MISMATCH', 'Host source canonical stage identity is invalid'); }
  if (anchor.mappingVersion !== STAGE_IDENTITY_MAPPING_VERSION ||
      anchor.requestedOperation !== anchor.canonicalStageId) {
    fail('HOST_SOURCE_IDENTITY_MISMATCH',
      'Host source operation must equal the registered canonical stage identity');
  }
  return anchor;
}

export function computeHostSourceAnchorDigest(anchor) {
  if (!anchor || typeof anchor !== 'object' || Array.isArray(anchor)) {
    fail('CONTRACT_SCHEMA_INVALID', 'Host source Anchor must be an object');
  }
  const { anchorDigest: ignored, ...payload } = anchor;
  structurallyValidate({ ...payload, anchorDigest: '0'.repeat(64) });
  return sha256(`${HOST_SOURCE_ANCHOR_DIGEST_DOMAIN}\n${canonicalJson(payload)}`);
}

export function validateHostSourceAnchor(anchor, expectedAllocation = null) {
  structurallyValidate(anchor);
  if (computeHostSourceAnchorDigest(anchor) !== anchor.anchorDigest) {
    fail('HOST_SOURCE_DIGEST_MISMATCH', 'Host source Anchor digest does not match its persisted fields');
  }
  if (expectedAllocation !== null) {
    if (!expectedAllocation || typeof expectedAllocation !== 'object' ||
        Array.isArray(expectedAllocation) ||
        Object.keys(expectedAllocation).sort().join('\0') !== [...identityFields].sort().join('\0') ||
        identityFields.some(field => expectedAllocation[field] !== anchor[field])) {
      fail('HOST_SOURCE_IDENTITY_MISMATCH',
        'Host source Anchor does not match the expected Allocation identity');
    }
  }
  return anchor;
}
