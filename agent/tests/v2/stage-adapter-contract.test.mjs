import test from 'node:test';
import assert from 'node:assert/strict';
import { contractDefinition, validateContract } from '../../src/contracts/registry.mjs';
import {
  validateStageAdapterInput,
  validateStageAdapterResult,
} from '../../src/v2/stage-adapter-contract.mjs';
import {
  assertStageGateBinding,
  createStageFeatureGateStore,
  createStageGateBinding,
} from '../../src/v2/stage-feature-gates.mjs';

const sha = character => character.repeat(64);
const baseBinding = {
  runId: 'run-p5-a', canonicalStageId: 'keyword-research',
  mappingVersion: 'stage-identity-v1', contextDigest: sha('a'),
};
const adapterInput = {
  kind: 'STAGE_ADAPTER_INPUT', schemaVersion: 1, producer: 'V2_OFFLINE_HOST', mode: 'OFFLINE',
  ...baseBinding, featureGate: 'legacy', gateBindingDigest: sha('b'), payloadDigest: sha('c'),
};
const adapterResult = {
  kind: 'STAGE_ADAPTER_RESULT', schemaVersion: 1, producer: 'V2_STAGE_ADAPTER', mode: 'OFFLINE',
  ...baseBinding, inputDigest: sha('d'), status: 'PARTIAL', authoritative: false,
  artifactDigests: [], errorCodes: ['EVIDENCE_GAP'],
};

test('P5-A contracts are registered with closed versioned schemas', () => {
  for (const kind of ['STAGE_ADAPTER_INPUT', 'STAGE_ADAPTER_RESULT', 'STAGE_GATE_BINDING']) {
    const definition = contractDefinition(kind, 1);
    assert.equal(definition.kind, kind);
    assert.equal(definition.schema.additionalProperties, false);
  }
  assert.deepEqual(validateStageAdapterInput(adapterInput), adapterInput);
  assert.deepEqual(validateStageAdapterResult(adapterResult), adapterResult);
  assert.throws(() => validateContract('STAGE_ADAPTER_INPUT', 1, { ...adapterInput, unexpected: true }),
    error => error.code === 'CONTRACT_SCHEMA_INVALID' && error.pointer === '/unexpected');
  assert.throws(() => validateStageAdapterInput(null), error => error.code === 'CONTRACT_BINDING_MISMATCH');
});

test('adapter contracts accept canonical identities only and never create authority', () => {
  for (const invalidStageId of [1, 'stage-2', 'game-innerpage-keyword-information-research']) {
    assert.throws(() => validateStageAdapterInput({ ...adapterInput, canonicalStageId: invalidStageId }), error =>
      ['CONTRACT_SCHEMA_INVALID', 'STAGE_ID_NON_CANONICAL'].includes(error.code));
  }
  assert.throws(() => validateStageAdapterResult({ ...adapterResult, authoritative: true }), error =>
    error.code === 'CONTRACT_SCHEMA_INVALID');
  assert.throws(() => validateStageAdapterResult({ ...adapterResult, mode: 'PRODUCTION' }), error =>
    error.code === 'CONTRACT_SCHEMA_INVALID');
  assert.throws(() => validateStageAdapterResult({ ...adapterResult, mappingVersion: 'stage-identity-v2' }), error =>
    error.code === 'STAGE_ID_MAPPING_VERSION_MISMATCH');
});

test('feature gate defaults to legacy and its offline binding is immutable', () => {
  const binding = createStageGateBinding(baseBinding);
  assert.deepEqual(binding, {
    kind: 'STAGE_GATE_BINDING', schemaVersion: 1, producer: 'V2_OFFLINE_HOST', runtimeScope: 'OFFLINE',
    ...baseBinding, featureGate: 'legacy', authoritative: false,
  });
  assert.equal(Object.isFrozen(binding), true);
  assert.throws(() => { binding.featureGate = 'v2'; }, TypeError);

  const store = createStageFeatureGateStore();
  assert.equal(store.bind(baseBinding).featureGate, 'legacy');
  assert.equal(store.bind(baseBinding).featureGate, 'legacy');
  assert.throws(() => store.bind({ ...baseBinding, featureGate: 'shadow' }), error =>
    error.code === 'STAGE_GATE_BINDING_IMMUTABLE');
  assert.throws(() => store.bind({ ...baseBinding, contextDigest: sha('e') }), error =>
    error.code === 'STAGE_GATE_BINDING_IMMUTABLE');
});

test('gate bindings cannot cross runs, stages, contexts or enter the core pipeline through advertising', () => {
  const binding = createStageGateBinding(baseBinding);
  assert.equal(assertStageGateBinding(binding, baseBinding), binding);
  for (const expected of [
    { ...baseBinding, runId: 'other-run' },
    { ...baseBinding, canonicalStageId: 'homepage-research' },
    { ...baseBinding, contextDigest: sha('f') },
    { ...baseBinding, mappingVersion: 'stage-identity-v2' },
  ]) {
    assert.throws(() => assertStageGateBinding(binding, expected), error =>
      error.code === 'STAGE_GATE_BINDING_MISMATCH');
  }
  assert.throws(() => createStageGateBinding({ ...baseBinding, canonicalStageId: 'advertising-plan' }), error =>
    error.code === 'STAGE_NOT_CORE');
  assert.throws(() => createStageGateBinding({ ...baseBinding, mappingVersion: 'stage-identity-v2' }), error =>
    error.code === 'STAGE_ID_MAPPING_VERSION_MISMATCH');
});

test('offline shadow and v2 labels remain non-authoritative configuration values', () => {
  for (const featureGate of ['shadow', 'v2']) {
    const binding = createStageGateBinding({ ...baseBinding, featureGate });
    assert.equal(binding.runtimeScope, 'OFFLINE');
    assert.equal(binding.authoritative, false);
    assert.equal(binding.featureGate, featureGate);
  }
});
