import { ContractError } from '../contracts/errors.mjs';
import { ALL_STAGES, STAGES } from '../stages.mjs';

export const STAGE_IDENTITY_MAPPING_VERSION = 'stage-identity-v1';

const namespaces = Object.freeze({
  'canonical-stage-id': 'canonicalStageId',
  'legacy-skill-name': 'legacySkillName',
  'legacy-array-index': 'legacyArrayIndex',
  'p3-shadow-alias': 'shadowAlias',
});

const definitions = Object.freeze([
  ['homepage-research', 'game-homepage-icon-research'],
  ['keyword-research', 'game-innerpage-keyword-information-research'],
  ['template-selection', 'game-site-template-selector'],
  ['content-integration', 'game-site-content-integrator'],
  ['ui-ux-audit', 'game-site-ui-ux-audit-optimizer'],
  ['prelaunch-acceptance', 'game-site-prelaunch-gate'],
  ['deployment-plan', 'game-site-deploy-and-measurement'],
  ['advertising-plan', 'game-site-adsterra-ad-integration'],
]);

const identityError = (code, message, details) => new ContractError(code, message, details);

function assertMappingVersion(mappingVersion) {
  if (mappingVersion !== STAGE_IDENTITY_MAPPING_VERSION) {
    throw identityError('STAGE_ID_MAPPING_VERSION_MISMATCH',
      `Unsupported stage identity mapping: ${String(mappingVersion)}`, { mappingVersion });
  }
  return mappingVersion;
}

export function buildStageIdentityTable(entries) {
  if (!Array.isArray(entries)) {
    throw identityError('STAGE_ID_UNKNOWN', 'Stage identity table must be an array');
  }
  const indexes = Object.fromEntries(Object.values(namespaces).map(key => [key, new Map()]));
  const table = entries.map((entry, index) => {
    if (!entry || typeof entry !== 'object') {
      throw identityError('STAGE_ID_UNKNOWN', `Invalid stage identity at index ${index}`);
    }
    assertMappingVersion(entry.mappingVersion);
    const normalized = {
      mappingVersion: entry.mappingVersion,
      canonicalStageId: entry.canonicalStageId,
      legacySkillName: entry.legacySkillName,
      legacyArrayIndex: entry.legacyArrayIndex,
      shadowAlias: entry.shadowAlias,
      coreStage: entry.coreStage,
    };
    if (typeof normalized.canonicalStageId !== 'string' ||
        typeof normalized.legacySkillName !== 'string' ||
        !Number.isSafeInteger(normalized.legacyArrayIndex) || normalized.legacyArrayIndex < 0 ||
        typeof normalized.shadowAlias !== 'string' || typeof normalized.coreStage !== 'boolean') {
      throw identityError('STAGE_ID_UNKNOWN', `Invalid stage identity at index ${index}`);
    }
    for (const [field, values] of Object.entries(indexes)) {
      const value = normalized[field];
      if (values.has(value)) {
        throw identityError('STAGE_ID_AMBIGUOUS', `Duplicate ${field}: ${String(value)}`, { field, value });
      }
      values.set(value, index);
    }
    return Object.freeze(normalized);
  });
  return Object.freeze(table);
}

export const stageIdentityTable = buildStageIdentityTable(definitions.map(([canonicalStageId, legacySkillName], index) => ({
  mappingVersion: STAGE_IDENTITY_MAPPING_VERSION,
  canonicalStageId,
  legacySkillName,
  legacyArrayIndex: index,
  shadowAlias: `stage-${index + 1}`,
  coreStage: index < STAGES.length,
})));

if (stageIdentityTable.map(item => item.legacySkillName).join('\0') !== ALL_STAGES.join('\0')) {
  throw identityError('STAGE_ID_MAPPING_VERSION_MISMATCH', 'Stage identity table does not match legacy stage order');
}

export const coreStageIdentities = Object.freeze(stageIdentityTable.filter(item => item.coreStage));
export const extensionStageIdentities = Object.freeze(stageIdentityTable.filter(item => !item.coreStage));

export function resolveStageIdentity({ namespace, value, mappingVersion = STAGE_IDENTITY_MAPPING_VERSION } = {}) {
  assertMappingVersion(mappingVersion);
  const field = namespaces[namespace];
  if (!field) {
    throw identityError('STAGE_ID_NAMESPACE_REQUIRED', 'A supported stage identity namespace is required', { namespace });
  }
  const matches = stageIdentityTable.filter(item => Object.is(item[field], value));
  if (matches.length > 1) {
    throw identityError('STAGE_ID_AMBIGUOUS', `Ambiguous stage identity: ${String(value)}`, { namespace, value });
  }
  if (matches.length === 0) {
    throw identityError('STAGE_ID_UNKNOWN', `Unknown stage identity: ${String(value)}`, { namespace, value });
  }
  return matches[0];
}

export function assertCanonicalStageId(value, { mappingVersion = STAGE_IDENTITY_MAPPING_VERSION } = {}) {
  assertMappingVersion(mappingVersion);
  const identity = stageIdentityTable.find(item => item.canonicalStageId === value);
  if (identity) return identity;
  const isLegacyRepresentation = stageIdentityTable.some(item =>
    item.legacySkillName === value || item.legacyArrayIndex === value || item.shadowAlias === value);
  throw identityError(isLegacyRepresentation ? 'STAGE_ID_NON_CANONICAL' : 'STAGE_ID_UNKNOWN',
    `Expected a canonical stage ID: ${String(value)}`, { value });
}

export function stageIdentityValue({ canonicalStageId, namespace,
  mappingVersion = STAGE_IDENTITY_MAPPING_VERSION } = {}) {
  const field = namespaces[namespace];
  if (!field) {
    throw identityError('STAGE_ID_NAMESPACE_REQUIRED', 'A supported target namespace is required', { namespace });
  }
  return assertCanonicalStageId(canonicalStageId, { mappingVersion })[field];
}
