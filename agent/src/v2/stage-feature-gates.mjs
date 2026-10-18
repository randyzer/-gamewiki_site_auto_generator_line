import { ContractError } from '../contracts/errors.mjs';
import { validateContract } from '../contracts/registry.mjs';
import { STAGE_IDENTITY_MAPPING_VERSION, assertCanonicalStageId } from './stage-identity.mjs';
import { stageRegistry } from './stage-registry.mjs';

const bindingFields = Object.freeze([
  'runId', 'canonicalStageId', 'mappingVersion', 'contextDigest', 'featureGate',
]);

function requireCoreBindingIdentity(binding) {
  const identity = assertCanonicalStageId(binding.canonicalStageId, { mappingVersion: binding.mappingVersion });
  return stageRegistry.requireCore(identity.canonicalStageId);
}

export function createStageGateBinding({ runId, canonicalStageId,
  mappingVersion = STAGE_IDENTITY_MAPPING_VERSION, contextDigest, featureGate = 'legacy' } = {}) {
  requireCoreBindingIdentity({ canonicalStageId, mappingVersion });
  const binding = {
    kind: 'STAGE_GATE_BINDING', schemaVersion: 1, producer: 'V2_OFFLINE_HOST', runtimeScope: 'OFFLINE',
    runId, canonicalStageId, mappingVersion, contextDigest, featureGate, authoritative: false,
  };
  validateContract('STAGE_GATE_BINDING', 1, binding);
  return Object.freeze(binding);
}

export function assertStageGateBinding(binding, expected = {}) {
  if (binding?.kind === 'STAGE_GATE_BINDING' && binding?.schemaVersion === 1) {
    requireCoreBindingIdentity(binding);
  }
  validateContract('STAGE_GATE_BINDING', 1, binding);
  requireCoreBindingIdentity(binding);
  for (const field of ['runId', 'canonicalStageId', 'mappingVersion', 'contextDigest']) {
    if (Object.hasOwn(expected, field) && !Object.is(binding[field], expected[field])) {
      throw new ContractError('STAGE_GATE_BINDING_MISMATCH', `Stage gate binding mismatch: ${field}`,
        { field });
    }
  }
  return binding;
}

export function createStageFeatureGateStore() {
  const bindingsByRun = new Map();
  return Object.freeze({
    bind(request) {
      const candidate = createStageGateBinding(request);
      let bindingsByStage = bindingsByRun.get(candidate.runId);
      if (!bindingsByStage) {
        bindingsByStage = new Map();
        bindingsByRun.set(candidate.runId, bindingsByStage);
      }
      const existing = bindingsByStage.get(candidate.canonicalStageId);
      if (!existing) {
        bindingsByStage.set(candidate.canonicalStageId, candidate);
        return candidate;
      }
      if (bindingFields.every(field => Object.is(existing[field], candidate[field]))) return existing;
      throw new ContractError('STAGE_GATE_BINDING_IMMUTABLE',
        `Stage gate binding is immutable for ${candidate.runId}/${candidate.canonicalStageId}`,
        { runId: candidate.runId, canonicalStageId: candidate.canonicalStageId });
    },
    get(runId, canonicalStageId) {
      return bindingsByRun.get(runId)?.get(canonicalStageId) ?? null;
    },
  });
}
