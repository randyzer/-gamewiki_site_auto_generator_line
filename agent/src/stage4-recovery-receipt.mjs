import { resolve } from 'node:path';
import { sha256 } from './files.mjs';
import { normalizedJson } from './keyword-execution-receipt.mjs';

const DIGEST = /^[a-f0-9]{64}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const assert = (ok, message) => { if (!ok) throw Error(message); };
const clone = value => JSON.parse(JSON.stringify(value));

export function stage4RecoveryDecision(value, { held } = {}) {
  if (value === undefined) return null;
  assert(value && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).sort().join(',') ===
      ['baselineDigest', 'heldCandidateDigest', 'mode', 'sourceAttempt'].sort().join(',') &&
    ['recover', 'fresh'].includes(value.mode) && Number.isSafeInteger(value.sourceAttempt) &&
    value.sourceAttempt >= 1 && DIGEST.test(value.heldCandidateDigest ?? '') &&
    DIGEST.test(value.baselineDigest ?? ''),
  'STAGE4_RECOVERY_DECISION_INVALID: expected exact recover/fresh held candidate identity');
  if (held) assert(value.sourceAttempt === held.attempt &&
    value.heldCandidateDigest === held.candidateDigest && value.baselineDigest === held.baselineDigest,
  'STAGE4_RECOVERY_DECISION_STALE: held candidate identity changed; preview again');
  return clone(value);
}

export function stage4RecoveryBinding(decision) {
  const normalized = stage4RecoveryDecision(decision);
  return { decision: normalized, sha256: sha256(normalizedJson(normalized)) };
}

export function createStage4RecoveryReceipt({ runId, inputsFile, inputsFileBytes, inputs,
  manifestBytes, confirmationBinding, previewSnapshot, held }) {
  const decision = stage4RecoveryDecision(inputs.stage4RecoveryDecision, { held });
  if (!decision) return null;
  assert(previewSnapshot && UUID.test(previewSnapshot.previewId ?? '') &&
    ['snapshotSha256', 'approvedSummarySha256', 'effectiveInputsSha256', 'stage4RecoverySha256']
      .every(key => DIGEST.test(previewSnapshot[key] ?? '')),
  'STAGE4_RECOVERY_RECEIPT_INVALID: a single-use preview snapshot is required');
  assert(previewSnapshot.stage4RecoverySha256 === sha256(normalizedJson(decision)),
    'STAGE4_RECOVERY_RECEIPT_INVALID: preview recovery binding changed');
  return {
    schemaVersion: 1,
    kind: 'STAGE4_RECOVERY_EXECUTION_V1',
    runId,
    command: 'retry',
    inputsFile: resolve(inputsFile),
    inputsFileSha256: sha256(inputsFileBytes),
    inputPatchSha256: sha256(normalizedJson(inputs)),
    manifestSha256: sha256(manifestBytes),
    confirmationBinding: sha256(confirmationBinding),
    decision,
    held: { attempt: held.attempt, candidateDigest: held.candidateDigest,
      baselineDigest: held.baselineDigest },
    previewSnapshot: clone(previewSnapshot),
  };
}

export function verifyStage4RecoveryReceipt(receipt, { runId, inputs, manifestBytes, held }) {
  if (!receipt) return null;
  assert(receipt.schemaVersion === 1 && receipt.kind === 'STAGE4_RECOVERY_EXECUTION_V1' &&
    receipt.runId === runId && receipt.command === 'retry' &&
    receipt.previewSnapshot && UUID.test(receipt.previewSnapshot.previewId ?? '') &&
    ['snapshotSha256', 'approvedSummarySha256', 'effectiveInputsSha256', 'stage4RecoverySha256']
      .every(key => DIGEST.test(receipt.previewSnapshot[key] ?? '')),
  'STAGE4_RECOVERY_RECEIPT_INVALID: identity mismatch');
  assert(receipt.inputPatchSha256 === sha256(normalizedJson(inputs)) &&
    receipt.manifestSha256 === sha256(manifestBytes) &&
    DIGEST.test(receipt.inputsFileSha256 ?? '') && DIGEST.test(receipt.confirmationBinding ?? ''),
  'STAGE4_RECOVERY_RECEIPT_INVALID: approved inputs or manifest changed');
  const decision = stage4RecoveryDecision(receipt.decision, { held });
  assert(normalizedJson(decision) === normalizedJson(inputs.stage4RecoveryDecision) &&
    normalizedJson(receipt.held) === normalizedJson({ attempt: held.attempt,
      candidateDigest: held.candidateDigest, baselineDigest: held.baselineDigest }) &&
    receipt.previewSnapshot.stage4RecoverySha256 === sha256(normalizedJson(decision)),
  'STAGE4_RECOVERY_RECEIPT_INVALID: held candidate binding changed');
  return clone(receipt);
}
