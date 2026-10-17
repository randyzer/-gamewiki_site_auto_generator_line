import test from 'node:test';
import assert from 'node:assert/strict';
import { createKeywordExecutionReceipt, verifyKeywordExecutionReceipt,
  keywordRecoveryDecision } from '../src/keyword-execution-receipt.mjs';

const base = () => ({
  runId: 'receipt-run', inputsFile: '/tmp/receipt-inputs.json', inputsFileBytes: Buffer.from('{"fixture":true}'),
  inputs: { keywordRecoveryDecision: { mode: 'fresh' },
    keywordResearchBudget: { timeoutMs: 1200000, handoffMarginMs: 180000 },
    keywordServiceStops: ['youtube-subtitles'], keywordServiceResumes: [] },
  manifestBytes: Buffer.from('{"sequence":12}'), confirmationBinding: 'confirmation-code:fixture',
});

test('keyword execution receipt binds input identity, manifest and recovery controls', () => {
  const value = base();
  const receipt = createKeywordExecutionReceipt(value);
  assert.deepEqual(verifyKeywordExecutionReceipt(receipt, {
    runId: value.runId, inputs: value.inputs, manifestBytes: value.manifestBytes }), receipt);
  assert.match(receipt.inputsFileSha256, /^[a-f0-9]{64}$/);
  assert.match(receipt.confirmationBinding, /^[a-f0-9]{64}$/);

  for (const changed of [
    { inputs: { ...value.inputs, keywordResearchBudget: { timeoutMs: 900000, handoffMarginMs: 180000 } } },
    { inputs: { ...value.inputs, keywordServiceStops: [] } },
    { inputs: { ...value.inputs, keywordServiceResumes: ['youtube-subtitles'] } },
    { manifestBytes: Buffer.from('{"sequence":13}') },
    { runId: 'other-run' },
  ]) assert.throws(() => verifyKeywordExecutionReceipt(receipt, { runId: value.runId,
    inputs: value.inputs, manifestBytes: value.manifestBytes, ...changed }), /RECEIPT_INVALID/);
});

test('keyword recovery decision cannot silently mix fresh and recovered work', () => {
  assert.throws(() => keywordRecoveryDecision({ mode: 'recover' }), /requires keywordRecovery/);
  assert.throws(() => keywordRecoveryDecision({ mode: 'fresh' }, { recovery: {} }), /cannot include keywordRecovery/);
  assert.throws(() => keywordRecoveryDecision({ mode: 'guess' }), /DECISION_INVALID/);
});

test('recovery receipt requires and binds the evidence plan reference', () => {
  const value = base();
  value.inputs = { ...value.inputs, keywordRecoveryDecision: { mode: 'recover' },
    keywordRecovery: { manifestPath: '/tmp/recovery/manifest.json', sha256: 'a'.repeat(64), files: ['evidence.json'] },
    keywordEvidencePlan: { path: '/tmp/evidence-plan.json', sha256: 'b'.repeat(64) } };
  const receipt = createKeywordExecutionReceipt(value);
  assert.deepEqual(receipt.evidencePlan, value.inputs.keywordEvidencePlan);
  assert.throws(() => verifyKeywordExecutionReceipt(receipt, { runId: value.runId,
    inputs: { ...value.inputs, keywordEvidencePlan: { ...value.inputs.keywordEvidencePlan, sha256: 'c'.repeat(64) } },
    manifestBytes: value.manifestBytes }), /RECEIPT_INVALID/);
  assert.throws(() => createKeywordExecutionReceipt({ ...value,
    inputs: { ...value.inputs, keywordEvidencePlan: undefined } }), /EVIDENCE_PLAN_REQUIRED/);
});
