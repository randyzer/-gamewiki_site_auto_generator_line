import { readFileSync } from 'node:fs';
import { parseStrictJson } from './canonical-json.mjs';
import { ContractError } from './errors.mjs';
import { validateSchema } from './schema-validator.mjs';

const load = name => parseStrictJson(readFileSync(new URL(`./schemas/${name}`, import.meta.url)), name);
const deepFreeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
};
const definitions = new Map([
  ['EXECUTION_CONTEXT:1', { kind: 'EXECUTION_CONTEXT', schemaVersion: 1,
    producer: 'HOST', validator: 'CONTRACT_REGISTRY', schema: load('execution-context.v1.json') }],
  ['KEYWORD_MATERIAL:1', { kind: 'KEYWORD_MATERIAL', schemaVersion: 1,
    producer: 'ADAPTER', validator: 'CONTRACT_REGISTRY', schema: load('keyword-material.v1.json') }],
]);
for (const definition of definitions.values()) deepFreeze(definition);

export const approvalPurposes = deepFreeze([
  'RUN_EXECUTION', 'SERVICE_RESUME', 'PARTIAL_HANDOFF',
  'UI_MODIFICATION', 'DEPLOYMENT_PLAN', 'DEPLOYMENT_EXECUTION',
]);
const purposeSet = new Set(approvalPurposes);

export function assertContractPurpose(purpose) {
  if (!purposeSet.has(purpose)) {
    throw new ContractError('CONTRACT_PURPOSE_UNKNOWN',
      `Purpose is not registered: ${String(purpose)}`, { purpose });
  }
  return purpose;
}

export function contractDefinition(kind, schemaVersion) {
  const definition = definitions.get(`${kind}:${schemaVersion}`);
  if (definition) return definition;
  const knownKind = [...definitions.values()].some(item => item.kind === kind);
  throw new ContractError(knownKind ? 'CONTRACT_VERSION_UNSUPPORTED' : 'CONTRACT_KIND_UNKNOWN',
    `Unsupported contract: ${kind} version ${schemaVersion}`, { kind, schemaVersion });
}

export function validateContract(kind, schemaVersion, value) {
  const definition = contractDefinition(kind, schemaVersion);
  if (value?.kind !== kind || value?.schemaVersion !== schemaVersion) {
    throw new ContractError('CONTRACT_BINDING_MISMATCH',
      `Contract envelope does not match ${kind} version ${schemaVersion}`, { kind, schemaVersion });
  }
  return validateSchema(definition.schema, value);
}

export const contractRegistry = Object.freeze([...definitions.values()]);
