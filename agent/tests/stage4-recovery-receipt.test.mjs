import test from 'node:test';
import assert from 'node:assert/strict';
import { createStage4RecoveryReceipt, stage4RecoveryDecision,
  verifyStage4RecoveryReceipt } from '../src/stage4-recovery-receipt.mjs';
import { normalizedJson } from '../src/keyword-execution-receipt.mjs';
import { sha256 } from '../src/files.mjs';

const held = { attempt: 13, candidateDigest: 'a'.repeat(64), baselineDigest: 'b'.repeat(64) };
const decision = { mode: 'recover', sourceAttempt: 13,
  heldCandidateDigest: held.candidateDigest, baselineDigest: held.baselineDigest };
const previewSnapshot = { previewId: '12345678-1234-4123-8123-123456789abc',
  snapshotSha256: 'c'.repeat(64), approvedSummarySha256: 'd'.repeat(64),
  effectiveInputsSha256: 'e'.repeat(64), stage4RecoverySha256: sha256(normalizedJson(decision)) };

test('Stage 4 recovery receipt requires a single-use preview and exact held identity', () => {
  const inputs = { stage4RecoveryDecision: decision };
  const manifestBytes = Buffer.from('{"sequence":43}');
  const receipt = createStage4RecoveryReceipt({ runId: 'wallpaper-engine-002',
    inputsFile: '/private/tmp/stage4-recovery.json', inputsFileBytes: Buffer.from(JSON.stringify(inputs)),
    inputs, manifestBytes, confirmationBinding: 'preview-snapshot:fixture', previewSnapshot, held });
  assert.deepEqual(verifyStage4RecoveryReceipt(receipt,
    { runId: 'wallpaper-engine-002', inputs, manifestBytes, held }).decision, decision);
  assert.throws(() => verifyStage4RecoveryReceipt(receipt, { runId: 'wallpaper-engine-002', inputs,
    manifestBytes, held: { ...held, candidateDigest: 'f'.repeat(64) } }), /STALE|INVALID/);
  assert.throws(() => createStage4RecoveryReceipt({ runId: 'wallpaper-engine-002',
    inputsFile: '/private/tmp/stage4-recovery.json', inputsFileBytes: Buffer.from(JSON.stringify(inputs)),
    inputs, manifestBytes, confirmationBinding: 'confirmation-code:fixture', previewSnapshot: null, held }),
  /single-use preview/);
});

test('Stage 4 recovery decision rejects extra fields and stale baselines', () => {
  assert.throws(() => stage4RecoveryDecision({ ...decision, path: '/tmp/candidate' }, { held }),
    /STAGE4_RECOVERY_DECISION_INVALID/);
  assert.throws(() => stage4RecoveryDecision({ ...decision, baselineDigest: 'f'.repeat(64) }, { held }),
    /STAGE4_RECOVERY_DECISION_STALE/);
});
