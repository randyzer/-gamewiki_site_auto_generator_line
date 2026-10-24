import { createHash } from 'node:crypto';
import { STAGE4_LAUNCH_BLOCKERS } from './stage4-launch-gap-policy.mjs';

const sha256 = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const digest = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const invalid = detail => Object.assign(Error(`PRELAUNCH_ASSESSMENT_INVALID: ${detail}`), {
  code: 'PRELAUNCH_ASSESSMENT_INVALID',
});

export function createPrelaunchContext({ runId, siteRevision, projectDigest, binding,
  stage5Audit, stage5AuditSha256, clearanceDigest = null }) {
  if (typeof runId !== 'string' || !runId || typeof siteRevision !== 'string' || !siteRevision ||
      !digest(projectDigest) || !digest(stage5AuditSha256) ||
      !stage5Audit || typeof stage5Audit !== 'object')
    throw invalid('Host inputs are incomplete');
  const unresolvedBlockers = [];
  if (!binding?.bindingDigest) unresolvedBlockers.push({ source: 'STAGE4_LAUNCH_READINESS',
    code: 'STAGE4_LAUNCH_READINESS_BINDING_MISSING', severity: 'BLOCKER' });
  if (!clearanceDigest) {
    unresolvedBlockers.push(...STAGE4_LAUNCH_BLOCKERS.map(code => ({
      source: 'STAGE4_LAUNCH_READINESS', code, severity: 'BLOCKER',
    })));
  }
  for (const finding of stage5Audit.findings ?? []) {
    if (['BLOCKER', 'HIGH'].includes(finding.severity) &&
        !['FIXED', 'ACCEPTED_RISK'].includes(finding.status)) {
      unresolvedBlockers.push({ source: 'STAGE5_UI_AUDIT', code: finding.id,
        severity: finding.severity, route: finding.route, status: finding.status });
    }
  }
  const unsigned = { kind: 'STAGE6_PRELAUNCH_CONTEXT_V1', runId, siteRevision, projectDigest,
    stage4BindingDigest: binding?.bindingDigest ?? null, stage5AuditSha256,
    stage5Verdict: stage5Audit.verdict ?? null,
    clearanceDigest, status: unresolvedBlockers.length === 0 ? 'CLEARED' : 'NOT_CLEARED',
    unresolvedBlockers };
  return { ...unsigned, contextDigest: sha256(unsigned) };
}

export function validateStage6WorkerHandoff(value) {
  if (value === null || value === undefined) return null;
  const keys = ['audit_execution', 'host_validation', 'kind', 'launch_readiness', 'site_disposition'];
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      JSON.stringify(Object.keys(value).sort()) !== JSON.stringify(keys) ||
      value.kind !== 'STAGE6_PRELAUNCH_HANDOFF_V1' || value.audit_execution !== 'COMPLETE' ||
      value.host_validation !== 'REQUIRED' || !['CLEARED', 'NOT_CLEARED'].includes(value.launch_readiness) ||
      !['可以上线', '可以上线，但有P2待办', '暂不建议上线'].includes(value.site_disposition))
    throw invalid('Worker handoff is malformed');
  if ((value.launch_readiness === 'CLEARED') !==
      ['可以上线', '可以上线，但有P2待办'].includes(value.site_disposition))
    throw invalid('Worker disposition contradicts launch readiness');
  return { launchReadiness: value.launch_readiness, siteDisposition: value.site_disposition };
}

export function validatePrelaunchExecutionAcceptance(report, context) {
  const value = report?.execution_acceptance;
  if (!value || value.kind !== 'PRELAUNCH_EXECUTION_ACCEPTANCE_V1' || value.status !== 'COMPLETE' ||
      value.context_digest !== context.contextDigest || value.launch_readiness !== context.status ||
      JSON.stringify(value.unresolved_blockers) !== JSON.stringify(context.unresolvedBlockers))
    throw invalid('Report does not preserve the Host prelaunch context');
  return value;
}

export function createPrelaunchAssessment({ context, reportSha256, disposition }) {
  if (!digest(reportSha256) || !['可以上线', '可以上线，但有P2待办', '暂不建议上线'].includes(disposition))
    throw invalid('Assessment report is invalid');
  const deploymentAuthorized = context.status === 'CLEARED' &&
    ['可以上线', '可以上线，但有P2待办'].includes(disposition);
  const unsigned = { kind: 'STAGE6_PRELAUNCH_ASSESSMENT_V1', contextDigest: context.contextDigest,
    reportSha256, siteRevision: context.siteRevision, projectDigest: context.projectDigest,
    stage5AuditSha256: context.stage5AuditSha256,
    disposition, launchReadiness: context.status,
    unresolvedBlockers: context.unresolvedBlockers, deploymentAuthorized };
  return { ...unsigned, assessmentDigest: sha256(unsigned) };
}

export function verifyPrelaunchAssessment(value, context) {
  if (!value || value.contextDigest !== context.contextDigest ||
      value.siteRevision !== context.siteRevision || value.projectDigest !== context.projectDigest ||
      value.stage5AuditSha256 !== context.stage5AuditSha256 ||
      JSON.stringify(value.unresolvedBlockers) !== JSON.stringify(context.unresolvedBlockers))
    throw invalid('Persisted assessment is stale or unrelated');
  const { assessmentDigest, ...unsigned } = value;
  if (!digest(assessmentDigest) || sha256(unsigned) !== assessmentDigest)
    throw invalid('Assessment digest mismatch');
  return value;
}
