import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { STAGE4_LAUNCH_BLOCKERS } from './stage4-launch-gap-policy.mjs';

const sha256 = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const digest = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const invalid = detail => Object.assign(Error(`PRELAUNCH_ASSESSMENT_INVALID: ${detail}`), {
  code: 'PRELAUNCH_ASSESSMENT_INVALID',
});
const clone = value => JSON.parse(JSON.stringify(value));

function acceptanceFields(value) {
  if (value === null || value === undefined) return {};
  if (!digest(value.acceptanceRevision) || !digest(value.projectDigest) ||
      !digest(value.attestationDigest)) {
    throw invalid('Effective site acceptance identity is incomplete');
  }
  return { acceptanceRevision: value.acceptanceRevision,
    acceptanceProjectDigest: value.projectDigest,
    publicationAttestationDigest: value.attestationDigest };
}

function hostFindings(value) {
  if (!Array.isArray(value) || value.some(item => !item || typeof item !== 'object' ||
      Array.isArray(item) || typeof item.code !== 'string' || !item.code))
    throw invalid('Stage 6 Host findings are malformed');
  return clone(value);
}

const hostBlockers = findings => findings.map(violation => ({
  source: 'STAGE6_ROUTE_PUBLICATION', code: violation.code, severity: 'BLOCKER', violation,
}));

export function createPrelaunchContext({ runId, siteRevision, projectDigest, binding,
  stage5Audit, stage5AuditSha256, clearanceDigest = null, siteAcceptance = null }) {
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
    clearanceDigest, ...acceptanceFields(siteAcceptance),
    status: unresolvedBlockers.length === 0 ? 'CLEARED' : 'NOT_CLEARED',
    unresolvedBlockers };
  return { ...unsigned, contextDigest: sha256(unsigned) };
}

export function bindStage6HostFindings(context, findings) {
  if (context?.kind !== 'STAGE6_PRELAUNCH_CONTEXT_V1' || !digest(context.contextDigest))
    throw invalid('Base prelaunch context is invalid');
  const { contextDigest, ...baseUnsigned } = context;
  if (sha256(baseUnsigned) !== contextDigest)
    throw invalid('Base prelaunch context digest mismatch');
  const { kind: _kind, contextDigest: baseContextDigest, status: _status,
    unresolvedBlockers: baseBlockers, ...identity } = context;
  const stage6HostFindings = hostFindings(findings);
  const unresolvedBlockers = [...baseBlockers, ...hostBlockers(stage6HostFindings)];
  const unsigned = { ...identity, kind: 'STAGE6_PRELAUNCH_CONTEXT_V2', baseContextDigest,
    stage6HostFindings, stage6HostFindingsDigest: sha256(stage6HostFindings),
    status: context.status === 'CLEARED' && stage6HostFindings.length === 0 ? 'CLEARED' : 'NOT_CLEARED',
    unresolvedBlockers };
  return { ...unsigned, contextDigest: sha256(unsigned) };
}

export function verifyStage6HostContext(value, baseContext) {
  if (!value || value.kind !== 'STAGE6_PRELAUNCH_CONTEXT_V2' ||
      value.baseContextDigest !== baseContext?.contextDigest)
    throw invalid('Stage 6 Host context is stale or unrelated');
  const expected = bindStage6HostFindings(baseContext, value.stage6HostFindings);
  if (!isDeepStrictEqual(value, expected))
    throw invalid('Stage 6 Host findings or context digest mismatch');
  return value;
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
  const stage6 = context.kind === 'STAGE6_PRELAUNCH_CONTEXT_V2';
  const unsigned = { kind: stage6 ? 'STAGE6_PRELAUNCH_ASSESSMENT_V2' : 'STAGE6_PRELAUNCH_ASSESSMENT_V1',
    contextDigest: context.contextDigest,
    reportSha256, siteRevision: context.siteRevision, projectDigest: context.projectDigest,
    stage5AuditSha256: context.stage5AuditSha256,
    disposition, launchReadiness: context.status,
    unresolvedBlockers: context.unresolvedBlockers, deploymentAuthorized,
    ...acceptanceFields(context.acceptanceRevision ? {
      acceptanceRevision: context.acceptanceRevision,
      projectDigest: context.acceptanceProjectDigest,
      attestationDigest: context.publicationAttestationDigest,
    } : null),
    ...(stage6 ? { baseContextDigest: context.baseContextDigest,
      stage6HostFindings: context.stage6HostFindings,
      stage6HostFindingsDigest: context.stage6HostFindingsDigest } : {}) };
  return { ...unsigned, assessmentDigest: sha256(unsigned) };
}

export function verifyPrelaunchAssessment(value, context) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw invalid('Persisted assessment is missing');
  const { assessmentDigest, ...unsigned } = value;
  if (!digest(assessmentDigest) || sha256(unsigned) !== assessmentDigest)
    throw invalid('Assessment digest mismatch');
  const expectedContext = value.kind === 'STAGE6_PRELAUNCH_ASSESSMENT_V2'
    ? verifyStage6HostContext({ kind: 'STAGE6_PRELAUNCH_CONTEXT_V2', runId: context.runId,
      siteRevision: value.siteRevision, projectDigest: value.projectDigest,
      stage4BindingDigest: context.stage4BindingDigest, stage5AuditSha256: value.stage5AuditSha256,
      stage5Verdict: context.stage5Verdict, clearanceDigest: context.clearanceDigest,
      ...acceptanceFields(value.acceptanceRevision ? {
        acceptanceRevision: value.acceptanceRevision,
        projectDigest: value.acceptanceProjectDigest,
        attestationDigest: value.publicationAttestationDigest,
      } : null),
      baseContextDigest: value.baseContextDigest, stage6HostFindings: value.stage6HostFindings,
      stage6HostFindingsDigest: value.stage6HostFindingsDigest, status: value.launchReadiness,
      unresolvedBlockers: value.unresolvedBlockers, contextDigest: value.contextDigest }, context)
    : context;
  if (value.contextDigest !== expectedContext.contextDigest ||
      value.siteRevision !== expectedContext.siteRevision || value.projectDigest !== expectedContext.projectDigest ||
      value.stage5AuditSha256 !== expectedContext.stage5AuditSha256 ||
      value.acceptanceRevision !== expectedContext.acceptanceRevision ||
      value.acceptanceProjectDigest !== expectedContext.acceptanceProjectDigest ||
      value.publicationAttestationDigest !== expectedContext.publicationAttestationDigest ||
      value.launchReadiness !== expectedContext.status ||
      JSON.stringify(value.unresolvedBlockers) !== JSON.stringify(expectedContext.unresolvedBlockers))
    throw invalid('Persisted assessment is stale or unrelated');
  const expectedAuthorization = expectedContext.status === 'CLEARED' &&
    ['可以上线', '可以上线，但有P2待办'].includes(value.disposition);
  if (value.deploymentAuthorized !== expectedAuthorization)
    throw invalid('Persisted assessment authorization is invalid');
  return value;
}
