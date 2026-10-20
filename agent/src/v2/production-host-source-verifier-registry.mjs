import { canonicalJson, deepFreeze } from '../contracts/canonical-json.mjs';
import { ContractError } from '../contracts/errors.mjs';

export const HOST_SOURCE_SECTIONS = deepFreeze([
  'identity', 'code', 'inputs', 'execution', 'research', 'site',
]);

const definitionList = [
  ['identity', 'HOST_ALLOCATION_CHAIN_V1', [
    ['allocation-record', 'ATTEMPT_ALLOCATION', 1],
  ]],
  ['code', 'HOST_CODE_ATTESTATION_V1', [
    ['git-tree', 'GIT_TREE', 1],
    ['skill-lock', 'SKILL_LOCK', 1],
    ['schema-bundle', 'SCHEMA_BUNDLE', 1],
    ['policy-config', 'POLICY_CONFIG', 1],
  ]],
  ['inputs', 'HOST_APPROVED_INPUTS_V1', [
    ['approved-inputs-record', 'APPROVED_INPUTS', 1],
    ['input-manifest', 'INPUT_MANIFEST', 1],
  ]],
  ['execution', 'HOST_EXECUTION_PLAN_V1', [
    ['permission-plan', 'HOST_PERMISSION_PLAN', 1],
    ['budget-plan', 'HOST_BUDGET_PLAN', 1],
    ['command-identity', 'HOST_COMMAND_IDENTITY', 1],
  ]],
  ['research', 'HOST_RESEARCH_DECISIONS_V1', [
    ['evidence-plan', 'HOST_EVIDENCE_PLAN', 1],
    ['recovery-decision', 'HOST_RECOVERY_DECISION', 1],
    ['service-decisions', 'HOST_SERVICE_DECISIONS', 1],
  ]],
  ['site', 'HOST_SITE_BASELINE_V1', [
    ['site-baseline', 'PROJECT_BASELINE', 1],
    ['site-configuration', 'SITE_CONFIGURATION', 1],
  ]],
];

const definitions = new Map(definitionList.map(([section, verifierId, references]) => [section,
  deepFreeze({
    section,
    verifierId,
    verifierVersion: 1,
    references: references.map(([role, sourceKind, sourceVersion]) => ({
      role, sourceKind, sourceVersion,
    })),
  }),
]));

const fail = (code, message) => { throw new ContractError(code, message); };
const safeReferencePath = value => typeof value === 'string' && value.length <= 1024 &&
  !/[\u0000-\u001f\u007f]/u.test(value) && !value.startsWith('/') && !value.includes('\\') &&
  !value.includes('//') && !value.split('/').some(part => !part || part === '.' || part === '..');

export function hostSourceVerifierDefinition(section) {
  const definition = definitions.get(section);
  if (!definition) fail('HOST_SOURCE_SECTION_INVALID', `Unknown host source section: ${String(section)}`);
  return definition;
}

export function validateHostSourceVerifierMapping(anchor) {
  const definition = hostSourceVerifierDefinition(anchor?.section);
  if (anchor.verifierId !== definition.verifierId ||
      anchor.verifierVersion !== definition.verifierVersion) {
    fail('HOST_SOURCE_VERIFIER_INVALID', 'Host source verifier does not match its fixed section mapping');
  }
  if (!Array.isArray(anchor.sourceReferences) ||
      anchor.sourceReferences.length !== definition.references.length) {
    fail('HOST_SOURCE_ROLE_INVALID', 'Host source roles do not match the fixed section role set');
  }
  for (let index = 0; index < definition.references.length; index += 1) {
    const expected = definition.references[index];
    const actual = anchor.sourceReferences[index];
    if (!actual || actual.role !== expected.role) {
      fail('HOST_SOURCE_ROLE_INVALID', 'Host source roles are missing, duplicated or out of order');
    }
    if (actual.sourceKind !== expected.sourceKind || actual.sourceVersion !== expected.sourceVersion ||
        !safeReferencePath(actual.relativePath) || !Number.isSafeInteger(actual.byteLength) ||
        actual.byteLength < 0) {
      fail('HOST_SOURCE_REFERENCE_INVALID', 'Host source reference does not match its fixed mapping');
    }
  }
  const roles = anchor.sourceReferences.map(reference => reference.role);
  if (new Set(roles).size !== roles.length ||
      canonicalJson(roles) !== canonicalJson(definition.references.map(reference => reference.role))) {
    fail('HOST_SOURCE_ROLE_INVALID', 'Host source roles are not canonical');
  }
  return anchor;
}
