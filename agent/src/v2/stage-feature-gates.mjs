import { ContractError } from '../contracts/errors.mjs';
import { validateContract } from '../contracts/registry.mjs';
import { STAGE_IDENTITY_MAPPING_VERSION, assertCanonicalStageId } from './stage-identity.mjs';
import { stageRegistry } from './stage-registry.mjs';

const bindingFields = Object.freeze([
  'runId', 'canonicalStageId', 'mappingVersion', 'contextDigest', 'featureGate',
]);

export function createStageGateBinding({ runId, canonicalStageId,
  mappingVersion = STAGE_IDENTITY_MAPPING_VERSION, contextDigest, featureGate = 'legacy' } = {}) {
  assertCanonicalStageId(canonicalStageId, { mappingVersion });
  stageRegistry.requireCore(canonicalStageId);
  const binding = {
    kind: 'STAGE_GATE_BINDING', schemaVersion: 1, producer: 'V2_OFFLINE_HOST', runtimeScope: 'OFFLINE',
    runId, canonicalStageId, mappingVersion, contextDigest, featureGate, authoritative: false,
  };
  validateContract('STAGE_GATE_BINDING', 1, binding);
  return Object.freeze(binding);
}

export function assertStageGateBinding(binding, expected = {}) {
  validateContract('STAGE_GATE_BINDING', 1, binding);
  for (const field of ['runId', 'canonicalStageId', 'mappingVersion', 'contextDigest']) {
    if (Object.hasOwn(expected, field) && !Object.is(binding[field], expected[field])) {
      throw new ContractError('STAGE_GATE_BINDING_MISMATCH', `Stage gate binding mismatch: ${field}`,
        { field });
    }
  }
  return binding;
}

export function createStageFeatureGateStore() {
  const bindings = new Map();
  return Object.freeze({
    bind(request) {
      const candidate = createStageGateBinding(request);
      const key = `${candidate.runId}\0${candidate.canonicalStageId}`;
      const existing = bindings.get(key);
      if (!existing) {
        bindings.set(key, candidate);
        return candidate;
      }
      if (bindingFields.every(field => Object.is(existing[field], candidate[field]))) return existing;
      throw new ContractError('STAGE_GATE_BINDING_IMMUTABLE',
        `Stage gate binding is immutable for ${candidate.runId}/${candidate.canonicalStageId}`,
        { runId: candidate.runId, canonicalStageId: candidate.canonicalStageId });
    },
    get(runId, canonicalStageId) {
      return bindings.get(`${runId}\0${canonicalStageId}`) ?? null;
    },
  });
}
