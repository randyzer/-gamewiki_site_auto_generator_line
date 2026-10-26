import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  createSiteRemediationAbort,
  createSiteRemediationIntent,
  createSiteRemediationPreview,
  createSiteRemediationReceipt,
  verifySiteRemediationAbort,
  verifySiteRemediationIntent,
  verifySiteRemediationPreview,
  verifySiteRemediationReceipt,
} from '../src/site-remediation-records.mjs';
import {
  classifySiteRemediation,
  persistSiteRemediationRecord,
  siteRemediationPaths,
} from '../src/site-remediation-journal.mjs';

const d = character => character.repeat(64);
const previewId = '11111111-1111-4111-8111-111111111111';
const transactionId = `site-remediation-${previewId}`;
const preview = () => createSiteRemediationPreview({
  runId: 'wallpaper-engine-002', transactionId, previewId,
  manifestSequence: 219, manifestSha256: d('1'), mode: 'LEGACY_CURRENT_BASELINE',
  lineageDigest: d('2'), researchApprovalDigest: d('3'), oldProjectDigest: d('4'),
  newProjectDigest: d('5'), baselineDigest: d('6'), remediationScopeDigest: d('7'),
  publicationEvidenceDigest: d('8'), attestationDigest: d('9'), acceptanceRevision: d('a'),
  protectedInputsDigest: d('b'),
  invalidatedStages: [
    'game-site-ui-ux-audit-optimizer',
    'game-site-prelaunch-gate',
    'game-site-deploy-and-measurement',
  ],
  historicalEvidenceGaps: ['FINAL_STAGE4_INVENTORY_UNAVAILABLE'],
  operatorSummarySha256: d('c'), createdAtMs: 1,
});
const intent = value => createSiteRemediationIntent({
  runId: value.runId, transactionId, previewId, previewDigest: value.previewDigest,
  authorizationDigest: d('d'), expectedManifestSequence: value.manifestSequence,
  expectedManifestSha256: value.manifestSha256, postManifestSha256: d('e'),
  committedSequence: value.manifestSequence + 1, acceptanceRevision: value.acceptanceRevision,
  committedObjectDigests: [d('f')], createdAtMs: 2,
});

test('remediation records use closed canonical digests', () => {
  const p = preview();
  const i = intent(p);
  const receipt = createSiteRemediationReceipt({
    runId: p.runId, transactionId, previewId, previewDigest: p.previewDigest,
    intentDigest: i.intentDigest, reservationDigest: d('1'), consumptionDigest: d('2'),
    preManifestSha256: p.manifestSha256, postManifestSha256: i.postManifestSha256,
    committedSequence: i.committedSequence, acceptanceRevision: p.acceptanceRevision,
    preservedStages: [
      'game-homepage-icon-research',
      'game-innerpage-keyword-information-research',
      'game-site-template-selector',
      'game-site-content-integrator',
    ],
    invalidatedStages: p.invalidatedStages, deploymentExecuted: false, committedAtMs: 3,
  });
  const abort = createSiteRemediationAbort({
    runId: p.runId, transactionId, previewId, previewDigest: p.previewDigest,
    intentDigest: i.intentDigest, phase: 'RESERVED_PRE_COMMIT', reasonCode: 'TEST_ABORT',
    abortedAtMs: 3,
  });
  assert.equal(verifySiteRemediationPreview(p), p);
  assert.equal(verifySiteRemediationIntent(i), i);
  assert.equal(verifySiteRemediationReceipt(receipt), receipt);
  assert.equal(verifySiteRemediationAbort(abort), abort);
  assert.throws(() => verifySiteRemediationPreview({ ...p, manifestSequence: 220 }),
    error => error.code === 'SITE_REMEDIATION_DIGEST_MISMATCH');
  assert.throws(() => createSiteRemediationPreview({ ...p, previewDigest: d('0') }),
    error => error.code === 'SITE_REMEDIATION_DERIVED_FIELD_INVALID');
});

test('journal writes are immutable, repeatable only for identical bytes', async t => {
  const root = await mkdtemp(join(tmpdir(), 'site-remediation-journal-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const p = preview();
  const paths = siteRemediationPaths(root, { previewId, transactionId });
  assert.equal(await persistSiteRemediationRecord(paths.previewPath, p), true);
  assert.equal(await persistSiteRemediationRecord(paths.previewPath, p), false);
  await assert.rejects(() => persistSiteRemediationRecord(paths.previewPath,
    { ...p, createdAtMs: 4 }), error => error.code === 'SITE_REMEDIATION_JOURNAL_CONFLICT');
});

test('journal classifies intent, reservation and post-commit recovery boundaries', async t => {
  const root = await mkdtemp(join(tmpdir(), 'site-remediation-journal-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const p = preview(); const i = intent(p);
  const paths = siteRemediationPaths(root, { previewId, transactionId });
  await persistSiteRemediationRecord(paths.previewPath, p);
  assert.equal((await classifySiteRemediation({ runDirectory: root, transactionId,
    manifestSha256: p.manifestSha256 })).phase, 'NO_INTENT');
  await persistSiteRemediationRecord(paths.intentPath, i);
  assert.equal((await classifySiteRemediation({ runDirectory: root, transactionId,
    manifestSha256: p.manifestSha256 })).phase, 'INTENT_ONLY');
  await persistSiteRemediationRecord(paths.reservationPath, {
    kind: 'SITE_REACCEPTANCE_AUTHORIZATION_RESERVATION', schemaVersion: 1,
    producer: 'SITE_ACCEPTANCE_CONTRACT', authorizationDigest: d('d'), previewId,
    confirmationIdentity: 'interactive-confirmation', transactionId,
    intentDigest: i.intentDigest, reservedAtMs: 2, reservationDigest: d('1'),
  });
  assert.equal((await classifySiteRemediation({ runDirectory: root, transactionId,
    manifestSha256: p.manifestSha256 })).phase, 'RESERVED_PRE_COMMIT');
  assert.equal((await classifySiteRemediation({ runDirectory: root, transactionId,
    manifestSha256: i.postManifestSha256 })).phase, 'RESERVED_POST_COMMIT');
});

test('journal fails closed when manifest identity is neither pre nor post state', async t => {
  const root = await mkdtemp(join(tmpdir(), 'site-remediation-journal-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const p = preview(); const i = intent(p);
  const paths = siteRemediationPaths(root, { previewId, transactionId });
  await persistSiteRemediationRecord(paths.previewPath, p);
  await persistSiteRemediationRecord(paths.intentPath, i);
  assert.equal((await classifySiteRemediation({ runDirectory: root, transactionId,
    manifestSha256: d('0') })).phase, 'RECOVERY_REQUIRED');
});
