import { validateContract } from '../contracts/registry.mjs';
import { assertCanonicalStageId } from './stage-identity.mjs';
import { stageRegistry } from './stage-registry.mjs';

function validateCanonicalEnvelope(kind, value) {
  if (value?.kind === kind && value?.schemaVersion === 1) {
    const identity = assertCanonicalStageId(value.canonicalStageId, { mappingVersion: value.mappingVersion });
    stageRegistry.requireCore(identity.canonicalStageId);
  }
  validateContract(kind, 1, value);
  const identity = assertCanonicalStageId(value.canonicalStageId, { mappingVersion: value.mappingVersion });
  stageRegistry.requireCore(identity.canonicalStageId);
  return value;
}

export function validateStageAdapterInput(value) {
  return validateCanonicalEnvelope('STAGE_ADAPTER_INPUT', value);
}

export function validateStageAdapterResult(value) {
  return validateCanonicalEnvelope('STAGE_ADAPTER_RESULT', value);
}
