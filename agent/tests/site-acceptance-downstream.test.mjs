import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bindStage5SiteAcceptance,
  verifyStage5SiteAcceptance,
} from '../src/stage5-audit-policy.mjs';
import {
  createPrelaunchAssessment,
  createPrelaunchContext,
  verifyPrelaunchAssessment,
} from '../src/stage6-prelaunch-policy.mjs';

const d = character => character.repeat(64);
const acceptance = { mode: 'REMEDIATED', acceptanceRevision: d('1'),
  projectDigest: d('2'), attestationDigest: d('3'), envelopeDigest: d('4') };

test('Stage 5 binding rejects a different remediation acceptance', () => {
  const binding = bindStage5SiteAcceptance(acceptance);
  assert.equal(verifyStage5SiteAcceptance(binding, acceptance), binding);
  assert.throws(() => verifyStage5SiteAcceptance(binding, {
    ...acceptance, acceptanceRevision: d('f') }), /another site acceptance/);
});

test('Stage 6 context and assessment preserve the remediation acceptance identity', () => {
  const context = createPrelaunchContext({ runId: 'run', siteRevision: 'site-v1',
    projectDigest: acceptance.projectDigest, binding: null,
    stage5Audit: { verdict: 'NEEDS_WORK', findings: [] }, stage5AuditSha256: d('5'),
    siteAcceptance: acceptance });
  assert.equal(context.acceptanceRevision, acceptance.acceptanceRevision);
  assert.equal(context.acceptanceProjectDigest, acceptance.projectDigest);
  assert.equal(context.publicationAttestationDigest, acceptance.attestationDigest);
  const assessment = createPrelaunchAssessment({ context, reportSha256: d('6'),
    disposition: '暂不建议上线' });
  assert.equal(verifyPrelaunchAssessment(assessment, context), assessment);
  assert.throws(() => verifyPrelaunchAssessment({ ...assessment,
    acceptanceRevision: d('f') }, context), /digest mismatch|stale or unrelated/);
});
