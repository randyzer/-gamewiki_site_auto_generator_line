import { createHash } from 'node:crypto';
import { canonicalJson } from '../contracts/canonical-json.mjs';
import { ContractError } from '../contracts/errors.mjs';
import { STAGE_IDENTITY_MAPPING_VERSION, assertCanonicalStageId } from './stage-identity.mjs';

export const ATTEMPT_OPERATION_DIGEST_DOMAIN = 'AGENT_ATTEMPT_OPERATION_V1';
export const ATTEMPT_ALLOCATION_DIGEST_DOMAIN = 'AGENT_ATTEMPT_ALLOCATION_V1';
export const LEGACY_ATTEMPT_BOUNDARY_DIGEST_DOMAIN = 'AGENT_LEGACY_ATTEMPT_BOUNDARY_V1';

const sha256 = value => createHash('sha256').update(value).digest('hex');
const digest = (domain, value) => sha256(`${domain}\n${canonicalJson(value)}`);
const sha = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const safeRunId = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(value);

function exactKeys(value, expected, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).sort().join('\0') !== [...expected].sort().join('\0')) {
    throw new ContractError('ATTEMPT_IDENTITY_INVALID', `${label} has unsupported fields`);
  }
}

function assertDigestOrNull(value, label) {
  if (value !== null && !sha(value)) {
    throw new ContractError('ATTEMPT_DIGEST_MISMATCH', `${label} must be a lowercase SHA256 or null`);
  }
}

export function assertAttemptOperationIdentity(value) {
  exactKeys(value, ['runId', 'canonicalStageId', 'mappingVersion', 'requestedOperation',
    'operationInputsDigest', 'recoveryDecisionDigest'], 'Attempt operation');
  if (!safeRunId(value.runId)) {
    throw new ContractError('ATTEMPT_IDENTITY_INVALID', 'Attempt runId is invalid');
  }
  if (value.mappingVersion !== STAGE_IDENTITY_MAPPING_VERSION) {
    throw new ContractError('ATTEMPT_MAPPING_VERSION_MISMATCH',
      `Unsupported Attempt mapping version: ${String(value.mappingVersion)}`);
  }
  let identity;
  try { identity = assertCanonicalStageId(value.canonicalStageId, { mappingVersion: value.mappingVersion }); }
  catch (error) {
    throw new ContractError('ATTEMPT_OPERATION_INVALID', error.message);
  }
  if (!identity.coreStage || value.requestedOperation !== identity.canonicalStageId) {
    throw new ContractError('ATTEMPT_OPERATION_INVALID',
      'requestedOperation must equal one registered core canonical stage ID');
  }
  assertDigestOrNull(value.operationInputsDigest, 'operationInputsDigest');
  assertDigestOrNull(value.recoveryDecisionDigest, 'recoveryDecisionDigest');
  return value;
}

export function computeAttemptOperationDigest(value) {
  assertAttemptOperationIdentity(value);
  return digest(ATTEMPT_OPERATION_DIGEST_DOMAIN, value);
}

export function computeAttemptAllocationDigest(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    throw new ContractError('ATTEMPT_IDENTITY_INVALID', 'Attempt Allocation must be an object');
  }
  const { allocationDigest: ignored, ...payload } = record;
  return digest(ATTEMPT_ALLOCATION_DIGEST_DOMAIN, payload);
}

export function computeLegacyAttemptBoundaryDigest(value) {
  exactKeys(value, ['runId', 'canonicalStageId', 'mappingVersion', 'verifiedHighWaterMark',
    'sourceManifestDigest', 'sourceLineageDigest'], 'Legacy Attempt boundary');
  assertAttemptOperationIdentity({
    runId: value.runId,
    canonicalStageId: value.canonicalStageId,
    mappingVersion: value.mappingVersion,
    requestedOperation: value.canonicalStageId,
    operationInputsDigest: value.sourceManifestDigest,
    recoveryDecisionDigest: value.sourceLineageDigest,
  });
  if (!Number.isSafeInteger(value.verifiedHighWaterMark) || value.verifiedHighWaterMark < 1) {
    throw new ContractError('ATTEMPT_LEGACY_BOUNDARY_UNVERIFIED',
      'Legacy Attempt high-water mark must be a positive safe integer');
  }
  if (!sha(value.sourceManifestDigest) || !sha(value.sourceLineageDigest)) {
    throw new ContractError('ATTEMPT_LEGACY_BOUNDARY_UNVERIFIED',
      'Legacy Attempt boundary source digests are invalid');
  }
  return digest(LEGACY_ATTEMPT_BOUNDARY_DIGEST_DOMAIN, value);
}
