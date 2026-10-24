import { readArtifact, sha256, parseArtifactJson } from './files.mjs';
import { dirname } from 'node:path';

const STATUSES = Object.freeze(['PASS', 'FAIL', 'NOT_APPLICABLE', 'NOT_TESTED']);
const PRESENCE = Object.freeze(['PRESENT', 'ABSENT', 'UNKNOWN']);
const VERDICTS = Object.freeze(['SHIP', 'SHIP_WITH_FIXES', 'NEEDS_WORK', 'BLOCKED']);
export const REQUIRED_INTERACTION_CATEGORIES = Object.freeze(['route-load', 'internal-navigation',
  'mobile-menu', 'keyboard-focus-return', 'search-trigger', 'search-query', 'search-empty-state',
  'theme-toggle', 'dialog-disclosure', 'unclassified-controls']);
const INVENTORY_COUNTS = Object.freeze(['interactiveCount', 'internalLinkCount', 'authorizedInternalLinkCount',
  'unlistedInternalLinkCount', 'externalLinkCount', 'formControlCount', 'unclassifiedControlCount',
  'mobileMenuControlCount', 'searchControlCount', 'themeToggleControlCount', 'dialogDisclosureControlCount']);
const invalid = detail => Object.assign(Error(`STAGE5_AUDIT_INVALID: ${detail}`), { code: 'STAGE5_AUDIT_INVALID' });
const status = (route, category) => route.checks.find(item => item.category === category)?.status;

export async function validateHostInteractions(path, expectedSha256, runId, expectedRoutes = null) {
  const bytes = await readArtifact(path, [dirname(path)]);
  if (sha256(bytes) !== expectedSha256) throw invalid('host interaction evidence hash mismatch');
  const value = parseArtifactJson(bytes, path);
  if (value.kind !== 'HOST_UI_INTERACTIONS_V1' || value.schemaVersion !== 1 || value.runId !== runId ||
      !Array.isArray(value.authorizedRoutes) || !value.authorizedRoutes.length ||
      !Array.isArray(value.routes) || value.routes.length === 0)
    throw invalid('host interaction evidence identity or completion is invalid');
  if (new Set(value.authorizedRoutes).size !== value.authorizedRoutes.length ||
      value.authorizedRoutes.some(route => typeof route !== 'string' || !route.startsWith('/')) ||
      JSON.stringify(value.routes.map(item => item.route)) !== JSON.stringify(value.authorizedRoutes) ||
      (expectedRoutes && JSON.stringify(value.authorizedRoutes) !== JSON.stringify(expectedRoutes)))
    throw invalid('host interaction route authorization boundary mismatch');
  const counts = Object.fromEntries(STATUSES.map(item => [item, 0]));
  for (const route of value.routes) {
    if (typeof route?.route !== 'string' || !route.route.startsWith('/') || !Array.isArray(route.checks))
      throw invalid('host interaction route is malformed');
    const categories = route.checks.map(item => item.category).sort();
    if (JSON.stringify(categories) !== JSON.stringify([...REQUIRED_INTERACTION_CATEGORIES].sort()))
      throw invalid(`host interaction categories are incomplete for ${route.route}`);
    const inventory = route.inventory;
    if (!inventory || INVENTORY_COUNTS.some(key => !Number.isSafeInteger(inventory[key]) || inventory[key] < 0) ||
        !PRESENCE.includes(inventory.mobileMenu) || !PRESENCE.includes(inventory.search) ||
        !PRESENCE.includes(inventory.themeToggle) || !PRESENCE.includes(inventory.dialogDisclosure) ||
        inventory.authorizedInternalLinkCount + inventory.unlistedInternalLinkCount !== inventory.internalLinkCount)
      throw invalid(`host interaction inventory is malformed for ${route.route}`);
    for (const [countKey, presenceKey] of [['mobileMenuControlCount', 'mobileMenu'], ['searchControlCount', 'search'],
      ['themeToggleControlCount', 'themeToggle'], ['dialogDisclosureControlCount', 'dialogDisclosure']]) {
      if ((inventory[countKey] === 0) !== (inventory[presenceKey] === 'ABSENT'))
        throw invalid(`host interaction inventory count disagrees with ${presenceKey} for ${route.route}`);
    }
    for (const item of route.checks) {
      if (typeof item.category !== 'string' || !STATUSES.includes(item.status) ||
          typeof item.detail !== 'string' || !item.detail.trim()) throw invalid('host interaction check is malformed');
      counts[item.status]++;
    }
    if (inventory.mobileMenu === 'ABSENT' &&
        [status(route, 'mobile-menu'), status(route, 'keyboard-focus-return')].some(item => item !== 'NOT_APPLICABLE'))
      throw invalid(`absent mobile menu has unsupported acceptance state for ${route.route}`);
    if (inventory.mobileMenu === 'UNKNOWN' &&
        ![status(route, 'mobile-menu'), status(route, 'keyboard-focus-return')].includes('NOT_TESTED'))
      throw invalid(`unknown mobile menu coverage was not marked NOT_TESTED for ${route.route}`);
    const searchStatuses = ['search-trigger', 'search-query', 'search-empty-state'].map(category => status(route, category));
    if (inventory.search === 'ABSENT' && searchStatuses.some(item => item !== 'NOT_APPLICABLE'))
      throw invalid(`absent search has unsupported acceptance state for ${route.route}`);
    if (inventory.search === 'UNKNOWN' && !searchStatuses.includes('NOT_TESTED'))
      throw invalid(`unknown search coverage was not marked NOT_TESTED for ${route.route}`);
    if (inventory.search === 'PRESENT' && searchStatuses.slice(1).some(item => item === 'NOT_APPLICABLE'))
      throw invalid(`present search was not exercised for ${route.route}`);
    if (inventory.themeToggle === 'ABSENT' && status(route, 'theme-toggle') !== 'NOT_APPLICABLE')
      throw invalid(`absent theme toggle has unsupported acceptance state for ${route.route}`);
    if (inventory.themeToggle === 'UNKNOWN' && status(route, 'theme-toggle') !== 'NOT_TESTED')
      throw invalid(`unknown theme-toggle coverage was not marked NOT_TESTED for ${route.route}`);
    if (inventory.dialogDisclosure === 'ABSENT' && status(route, 'dialog-disclosure') !== 'NOT_APPLICABLE')
      throw invalid(`absent disclosure has unsupported acceptance state for ${route.route}`);
    if (inventory.dialogDisclosure === 'UNKNOWN' && status(route, 'dialog-disclosure') !== 'NOT_TESTED')
      throw invalid(`unknown disclosure coverage was not marked NOT_TESTED for ${route.route}`);
    if ((inventory.unclassifiedControlCount === 0) !== (status(route, 'unclassified-controls') === 'NOT_APPLICABLE'))
      throw invalid(`unclassified control coverage is inconsistent for ${route.route}`);
  }
  if (!value.summary || STATUSES.some(item => value.summary[item] !== counts[item]) ||
      Object.keys(value.summary).some(item => !STATUSES.includes(item)))
    throw invalid('host interaction summary does not match checks');
  if (value.completion !== (counts.NOT_TESTED === 0 ? 'COMPLETE' : 'INCOMPLETE') ||
      value.completion !== 'COMPLETE') throw invalid('SITE_AUDIT_INTERACTIONS_INCOMPLETE');
  return { value, sha256: expectedSha256,
    failures: value.routes.flatMap(route => route.checks.filter(item => item.status === 'FAIL')
      .map(item => ({ route: route.route, category: item.category, detail: item.detail }))) };
}

export function validateStage5WorkerHandoff(value) {
  if (value === null || value === undefined) return null;
  const keys = ['audit_execution', 'host_validation', 'kind', 'site_verdict'];
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      JSON.stringify(Object.keys(value).sort()) !== JSON.stringify(keys) ||
      value.kind !== 'STAGE5_AUDIT_HANDOFF_V1' || value.audit_execution !== 'COMPLETE' ||
      value.host_validation !== 'REQUIRED' || !VERDICTS.includes(value.site_verdict))
    throw invalid('worker handoff is malformed');
  return { siteVerdict: value.site_verdict };
}

export function validateAuditExecutionAcceptance(audit, interactionsSha256, siteVerdict) {
  const acceptance = audit?.execution_acceptance;
  if (!acceptance || JSON.stringify(Object.keys(acceptance).sort()) !==
      JSON.stringify(['host_interactions_sha256', 'kind', 'status']) ||
      acceptance.kind !== 'AUDIT_EXECUTION_ACCEPTANCE_V1' || acceptance.status !== 'COMPLETE' ||
      acceptance.host_interactions_sha256 !== interactionsSha256)
    throw invalid('UI audit is not bound to complete host interaction evidence');
  if (!VERDICTS.includes(audit.verdict) || (siteVerdict && audit.verdict !== siteVerdict))
    throw invalid('site verdict is invalid or differs from the worker handoff');
  return acceptance;
}
