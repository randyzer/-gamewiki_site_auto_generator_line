import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveEffectiveSiteAcceptance,
  verifyEffectiveSiteAcceptance,
} from '../src/effective-site-acceptance.mjs';

const d = character => character.repeat(64);
const stage = (skill, status = 'PASSED') => ({
  skill, status, artifacts: [], checkpoint: {}, evidence: [], missing_inputs: [], history: [],
});
const manifest = () => {
  const stages = [
    stage('game-homepage-icon-research'),
    stage('game-innerpage-keyword-information-research', 'PARTIAL'),
    stage('game-site-template-selector'),
    stage('game-site-content-integrator'),
    stage('game-site-ui-ux-audit-optimizer', 'NOT_STARTED'),
    stage('game-site-prelaunch-gate', 'NOT_STARTED'),
    stage('game-site-deploy-and-measurement', 'NOT_STARTED'),
    stage('game-site-advertising', 'SKIPPED'),
  ];
  stages[3].artifacts = [{ kind: 'ROUTE_PUBLICATION_MANIFEST.json', sha256: d('1') }];
  stages[3].checkpoint.launchReadiness = { bindingDigest: d('2') };
  return { schemaVersion: 1, runId: 'run', sequence: 4,
    inputs: { siteRevision: 'site-v1' }, deploymentExecuted: false, stages };
};

test('ordinary acceptance is deterministic and does not claim remediation evidence', async () => {
  const value = await resolveEffectiveSiteAcceptance({ manifest: manifest(),
    runDirectory: '/unused', projectDigest: d('3') });
  assert.equal(value.mode, 'ORDINARY');
  assert.equal(value.projectDigest, d('3'));
  assert.equal(value.baselineDigest, null);
  assert.equal(value.receiptDigest, null);
  assert.equal(verifyEffectiveSiteAcceptance(value), value);
  assert.deepEqual(value.unresolvedBlockers, []);
});

test('remediated acceptance binds the committed receipt and current project', async () => {
  const current = manifest();
  current.siteAcceptance = { policyVersion: 'site-remediation-transaction-v1',
    transactionId: 'site-remediation-11111111-1111-4111-8111-111111111111',
    acceptanceRevision: d('4'), baselineDigest: d('5'), projectDigest: d('6'),
    protectedInputsDigest: d('7'), previewDigest: d('8'), acceptedAtMs: 1 };
  const committed = {
    preview: { lineageDigest: d('9'), newProjectDigest: d('6'), baselineDigest: d('5'),
      attestationDigest: d('a'), acceptanceRevision: d('4'),
      historicalEvidenceGaps: ['FINAL_STAGE4_INVENTORY_UNAVAILABLE'] },
    receipt: { receiptDigest: d('b'), acceptanceRevision: d('4') },
  };
  const value = await resolveEffectiveSiteAcceptance({ manifest: current,
    runDirectory: '/run', projectDigest: d('6'),
    verifyCommitted: async () => committed });
  assert.equal(value.mode, 'REMEDIATED');
  assert.equal(value.receiptDigest, d('b'));
  assert.equal(value.attestationDigest, d('a'));
  assert.equal(value.launchReadiness, 'NOT_CLEARED');
  assert.deepEqual(value.unresolvedBlockers, [
    'CURRENT_LAUNCH_READINESS_REVALIDATION_REQUIRED',
    'FINAL_STAGE4_INVENTORY_UNAVAILABLE',
  ]);
});

test('remediated acceptance rejects stale project and substituted receipt identity', async () => {
  const current = manifest();
  current.siteAcceptance = { policyVersion: 'site-remediation-transaction-v1',
    transactionId: 'site-remediation-11111111-1111-4111-8111-111111111111',
    acceptanceRevision: d('4'), baselineDigest: d('5'), projectDigest: d('6'),
    protectedInputsDigest: d('7'), previewDigest: d('8'), acceptedAtMs: 1 };
  const verifyCommitted = async () => ({
    preview: { lineageDigest: d('9'), newProjectDigest: d('6'), baselineDigest: d('5'),
      attestationDigest: d('a'), acceptanceRevision: d('4'), historicalEvidenceGaps: [] },
    receipt: { receiptDigest: d('b'), acceptanceRevision: d('f') },
  });
  await assert.rejects(() => resolveEffectiveSiteAcceptance({ manifest: current,
    runDirectory: '/run', projectDigest: d('0'), verifyCommitted }),
  error => error.code === 'EFFECTIVE_SITE_ACCEPTANCE_STALE');
  await assert.rejects(() => resolveEffectiveSiteAcceptance({ manifest: current,
    runDirectory: '/run', projectDigest: d('6'), verifyCommitted }),
  error => error.code === 'EFFECTIVE_SITE_ACCEPTANCE_INVALID');
});

test('effective acceptance digest rejects mutation', async () => {
  const value = await resolveEffectiveSiteAcceptance({ manifest: manifest(),
    runDirectory: '/unused', projectDigest: d('3') });
  assert.throws(() => verifyEffectiveSiteAcceptance({ ...value, projectDigest: d('f') }),
    error => error.code === 'EFFECTIVE_SITE_ACCEPTANCE_DIGEST_MISMATCH');
});
