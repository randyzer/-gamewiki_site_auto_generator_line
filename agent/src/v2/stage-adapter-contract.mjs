import { validateContract } from '../contracts/registry.mjs';
import { STAGE_IDENTITY_MAPPING_VERSION, assertCanonicalStageId } from './stage-identity.mjs';

function validateCanonicalEnvelope(kind, value) {
  if (value && typeof value === 'object' && value.mappingVersion !== STAGE_IDENTITY_MAPPING_VERSION) {
    assertCanonicalStageId(value.canonicalStageId, { mappingVersion: value.mappingVersion });
  }
  validateContract(kind, 1, value);
  assertCanonicalStageId(value.canonicalStageId, { mappingVersion: value.mappingVersion });
  return value;
}

export function validateStageAdapterInput(value) {
  return validateCanonicalEnvelope('STAGE_ADAPTER_INPUT', value);
}

export function validateStageAdapterResult(value) {
  return validateCanonicalEnvelope('STAGE_ADAPTER_RESULT', value);
}
