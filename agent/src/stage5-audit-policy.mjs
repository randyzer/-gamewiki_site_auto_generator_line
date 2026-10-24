import { readArtifact, sha256, parseArtifactJson } from './files.mjs';
import { dirname } from 'node:path';

const STATUSES = Object.freeze(['PASS', 'FAIL', 'NOT_APPLICABLE', 'NOT_TESTED']);
const VERDICTS = Object.freeze(['SHIP', 'SHIP_WITH_FIXES', 'NEEDS_WORK', 'BLOCKED']);
const invalid = detail => Object.assign(Error(`STAGE5_AUDIT_INVALID: ${detail}`), {
  code: 'STAGE5_AUDIT_INVALID',
});

export async function validateHostInteractions(path, expectedSha256, runId) {
  const bytes = await readArtifact(path, [dirname(path)]);
  if (sha256(bytes) !== expectedSha256) throw invalid('host interaction evidence hash mismatch');
  const value = parseArtifactJson(bytes, path);
  if (value.kind !== 'HOST_UI_INTERACTIONS_V1' || value.schemaVersion !== 1 || value.runId !== runId ||
      !Array.isArray(value.routes) || value.routes.length === 0)
    throw invalid('host interaction evidence identity or completion is invalid');
  const counts = Object.fromEntries(STATUSES.map(status => [status, 0]));
  for (const route of value.routes) {
    if (typeof route?.route !== 'string' || !route.route.startsWith('/') || !Array.isArray(route.checks) || !route.checks.length)
      throw invalid('host interaction route is malformed');
    for (const check of route.checks) {
      if (typeof check?.category !== 'string' || !STATUSES.includes(check.status) ||
          typeof check.detail !== 'string' || !check.detail.trim()) throw invalid('host interaction check is malformed');
      counts[check.status]++;
    }
  }
  if (!value.summary || STATUSES.some(status => value.summary[status] !== counts[status]) ||
      Object.keys(value.summary).some(status => !STATUSES.includes(status)))
    throw invalid('host interaction summary does not match checks');
  if (value.completion !== 'COMPLETE' || counts.NOT_TESTED !== 0)
    throw invalid('SITE_AUDIT_INTERACTIONS_INCOMPLETE');
  return { value, sha256: expectedSha256,
    failures: value.routes.flatMap(route => route.checks.filter(check => check.status === 'FAIL')
      .map(check => ({ route: route.route, category: check.category, detail: check.detail }))) };
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
