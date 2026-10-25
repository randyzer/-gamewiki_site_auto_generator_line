import test from 'node:test';
import assert from 'node:assert/strict';
import { bindStage6HostFindings, createPrelaunchContext, createPrelaunchAssessment,
  validatePrelaunchExecutionAcceptance, validateStage6WorkerHandoff,
  verifyPrelaunchAssessment } from '../src/stage6-prelaunch-policy.mjs';
import { STAGE4_LAUNCH_BLOCKERS } from '../src/stage4-launch-gap-policy.mjs';

const base = () => createPrelaunchContext({ runId: 'run-1', siteRevision: 'revision-1',
  projectDigest: 'a'.repeat(64), binding: { bindingDigest: 'b'.repeat(64) },
  stage5AuditSha256: '5'.repeat(64),
  stage5Audit: { verdict: 'BLOCKED', findings: [
    { id: 'UX-001', severity: 'BLOCKER', route: '/', status: 'OPEN' },
    { id: 'UX-002', severity: 'HIGH', route: '/', status: 'FIXED' },
  ] } });

test('prelaunch context preserves launch and open Stage 5 blockers in deterministic order', () => {
  const context = base();
  assert.equal(context.status, 'NOT_CLEARED');
  assert.deepEqual(context.unresolvedBlockers.slice(0, 6).map(item => item.code), STAGE4_LAUNCH_BLOCKERS);
  assert.deepEqual(context.unresolvedBlockers.at(-1), {
    source: 'STAGE5_UI_AUDIT', code: 'UX-001', severity: 'BLOCKER', route: '/', status: 'OPEN',
  });
});

test('prelaunch report and assessment reject omitted blockers and stale digests', () => {
  const context = base();
  assert.throws(() => validatePrelaunchExecutionAcceptance({ execution_acceptance: {
    kind: 'PRELAUNCH_EXECUTION_ACCEPTANCE_V1', status: 'COMPLETE',
    context_digest: context.contextDigest, launch_readiness: 'NOT_CLEARED', unresolved_blockers: [],
  } }, context), /does not preserve/);
  const assessment = createPrelaunchAssessment({ context, reportSha256: 'c'.repeat(64),
    disposition: '暂不建议上线' });
  assert.equal(assessment.deploymentAuthorized, false);
  assert.throws(() => verifyPrelaunchAssessment({ ...assessment, reportSha256: 'd'.repeat(64) }, context),
    /digest mismatch/);
});

test('prelaunch context and assessment bind the exact accepted Stage 5 audit artifact', () => {
  const first = base();
  const changed = createPrelaunchContext({ runId: 'run-1', siteRevision: 'revision-1',
    projectDigest: 'a'.repeat(64), binding: { bindingDigest: 'b'.repeat(64) },
    stage5AuditSha256: '6'.repeat(64),
    stage5Audit: { verdict: 'BLOCKED', findings: [
      { id: 'UX-001', severity: 'BLOCKER', route: '/', status: 'OPEN' },
      { id: 'UX-002', severity: 'LOW', route: '/guide', status: 'OPEN', evidence: 'updated detail' },
    ] } });
  assert.equal(first.stage5AuditSha256, '5'.repeat(64));
  assert.notEqual(first.contextDigest, changed.contextDigest);
  const assessment = createPrelaunchAssessment({ context: first, reportSha256: 'c'.repeat(64),
    disposition: '暂不建议上线' });
  assert.equal(assessment.stage5AuditSha256, first.stage5AuditSha256);
  assert.throws(() => verifyPrelaunchAssessment(assessment, changed), /stale or unrelated/);
});

test('Stage 6 handoff cannot claim a launchable disposition while not cleared', () => {
  assert.throws(() => validateStage6WorkerHandoff({ kind: 'STAGE6_PRELAUNCH_HANDOFF_V1',
    audit_execution: 'COMPLETE', host_validation: 'REQUIRED', site_disposition: '可以上线',
    launch_readiness: 'NOT_CLEARED' }), /contradicts/);
});

test('Stage 6 Host findings become immutable blockers without invalidating audit completion', () => {
  const baseContext = base();
  const violations = [
    { code: 'ROUTE_UNPROVABLE', path: 'app/[[...segments]]/page.tsx' },
    { code: 'PUBLISHED_ROUTE_NOINDEX', route: '/' },
  ];
  const context = bindStage6HostFindings(baseContext, violations);
  assert.equal(context.status, 'NOT_CLEARED');
  assert.deepEqual(context.stage6HostFindings, violations);
  assert.deepEqual(context.unresolvedBlockers.slice(-2), violations.map(violation => ({
    source: 'STAGE6_ROUTE_PUBLICATION', code: violation.code, severity: 'BLOCKER', violation,
  })));

  const assessment = createPrelaunchAssessment({ context, reportSha256: 'c'.repeat(64),
    disposition: '暂不建议上线' });
  assert.equal(assessment.deploymentAuthorized, false);
  assert.deepEqual(assessment.stage6HostFindings, violations);
  assert.equal(verifyPrelaunchAssessment(assessment, baseContext).assessmentDigest,
    assessment.assessmentDigest);
  assert.throws(() => verifyPrelaunchAssessment({ ...assessment,
    stage6HostFindings: violations.slice(1) }, baseContext), /digest|findings/i);
});

test('Stage 6 Host findings revoke an otherwise cleared launch context', () => {
  const cleared = createPrelaunchContext({ runId: 'run-1', siteRevision: 'revision-1',
    projectDigest: 'a'.repeat(64), binding: { bindingDigest: 'b'.repeat(64) },
    stage5AuditSha256: '5'.repeat(64), stage5Audit: { verdict: 'SHIP', findings: [] },
    clearanceDigest: 'd'.repeat(64) });
  assert.equal(cleared.status, 'CLEARED');
  const context = bindStage6HostFindings(cleared,
    [{ code: 'PUBLISHED_ROUTE_NOINDEX', route: '/' }]);
  assert.equal(context.status, 'NOT_CLEARED');
});
