import { resolve } from 'node:path';
import { sha256 } from './files.mjs';
import { keywordResearchBudget } from './keyword-budget.mjs';
import { keywordServiceStops, keywordServiceResumes } from './keyword-service-stops.mjs';
import { keywordEvidencePlanReference } from './keyword-evidence-plan.mjs';

const assert = (ok, message) => { if (!ok) throw Error(message); };
const clone = value => JSON.parse(JSON.stringify(value));
const previewId = value => /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(value ?? '');

export function normalizedJson(value) {
  if (Array.isArray(value)) return '[' + value.map(normalizedJson).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort()
    .map(key => JSON.stringify(key) + ':' + normalizedJson(value[key])).join(',') + '}';
  return JSON.stringify(value);
}

export function keywordRecoveryDecision(value, { recovery } = {}) {
  if (value === undefined) return null;
  assert(value && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).length === 1 && ['recover', 'fresh'].includes(value.mode),
  'KEYWORD_RECOVERY_DECISION_INVALID: expected {"mode":"recover"|"fresh"}');
  if (value.mode === 'recover') assert(recovery,
    'KEYWORD_RECOVERY_DECISION_INVALID: recover requires keywordRecovery');
  if (value.mode === 'fresh') assert(!recovery,
    'KEYWORD_RECOVERY_DECISION_INVALID: fresh cannot include keywordRecovery');
  return clone(value);
}

export function createKeywordExecutionReceipt({ runId, inputsFile, inputsFileBytes, inputs,
  manifestBytes, confirmationBinding, previewSnapshot = null }) {
  const decision = keywordRecoveryDecision(inputs.keywordRecoveryDecision, { recovery: inputs.keywordRecovery });
  if (!decision) return null;
  const recovery = inputs.keywordRecovery ? {
    manifestPath: resolve(inputs.keywordRecovery.manifestPath),
    sha256: inputs.keywordRecovery.sha256,
    filesSha256: sha256(normalizedJson(inputs.keywordRecovery.files)),
  } : null;
  const evidencePlan = inputs.keywordEvidencePlan
    ? keywordEvidencePlanReference(inputs.keywordEvidencePlan) : null;
  assert(decision?.mode !== 'recover' || evidencePlan,
    'KEYWORD_EVIDENCE_PLAN_REQUIRED: recover execution receipts require a reviewed plan');
  assert(decision?.mode === 'recover' || !evidencePlan,
    'KEYWORD_EVIDENCE_PLAN_INVALID: a plan is allowed only with recover mode');
  if (previewSnapshot) assert(previewSnapshot && typeof previewSnapshot === 'object' &&
    previewId(previewSnapshot.previewId) &&
    ['snapshotSha256', 'approvedSummarySha256', 'effectiveInputsSha256'].every(key =>
      /^[a-f0-9]{64}$/.test(previewSnapshot[key] ?? '')) &&
    (previewSnapshot.effectiveEvidencePlanSha256 === null ||
      /^[a-f0-9]{64}$/.test(previewSnapshot.effectiveEvidencePlanSha256 ?? '')),
  'KEYWORD_EXECUTION_RECEIPT_INVALID: preview snapshot binding');
  return {
    schemaVersion: previewSnapshot ? 2 : 1,
    kind: previewSnapshot ? 'KEYWORD_RECOVERY_EXECUTION_V2' : 'KEYWORD_RECOVERY_EXECUTION_V1',
    runId,
    command: 'retry',
    inputsFile: resolve(inputsFile),
    inputsFileSha256: sha256(inputsFileBytes),
    inputPatchSha256: sha256(normalizedJson(inputs)),
    manifestSha256: sha256(manifestBytes),
    confirmationBinding: sha256(confirmationBinding),
    decision,
    recovery,
    evidencePlan,
    budget: keywordResearchBudget(inputs.keywordResearchBudget),
    serviceStops: keywordServiceStops(inputs.keywordServiceStops),
    serviceResumes: keywordServiceResumes(inputs.keywordServiceResumes),
    ...(previewSnapshot ? { previewSnapshot: clone(previewSnapshot) } : {}),
  };
}

export function verifyKeywordExecutionReceipt(receipt, { runId, inputs, manifestBytes }) {
  if (!receipt) return null;
  const v1 = receipt.schemaVersion === 1 && receipt.kind === 'KEYWORD_RECOVERY_EXECUTION_V1' &&
    receipt.previewSnapshot === undefined;
  const v2 = receipt.schemaVersion === 2 && receipt.kind === 'KEYWORD_RECOVERY_EXECUTION_V2' &&
    receipt.previewSnapshot && typeof receipt.previewSnapshot === 'object' &&
    previewId(receipt.previewSnapshot.previewId) &&
    ['snapshotSha256', 'approvedSummarySha256', 'effectiveInputsSha256'].every(key =>
      /^[a-f0-9]{64}$/.test(receipt.previewSnapshot[key] ?? '')) &&
    (receipt.previewSnapshot.effectiveEvidencePlanSha256 === null ||
      /^[a-f0-9]{64}$/.test(receipt.previewSnapshot.effectiveEvidencePlanSha256 ?? ''));
  assert((v1 || v2) &&
    receipt.runId === runId && receipt.command === 'retry', 'KEYWORD_EXECUTION_RECEIPT_INVALID: identity mismatch');
  assert(receipt.inputPatchSha256 === sha256(normalizedJson(inputs)),
    'KEYWORD_EXECUTION_RECEIPT_INVALID: input patch changed');
  assert(receipt.manifestSha256 === sha256(manifestBytes),
    'KEYWORD_EXECUTION_RECEIPT_INVALID: manifest changed');
  assert(/^[a-f0-9]{64}$/.test(receipt.inputsFileSha256 ?? '') &&
    /^[a-f0-9]{64}$/.test(receipt.confirmationBinding ?? ''),
  'KEYWORD_EXECUTION_RECEIPT_INVALID: missing binding');
  keywordRecoveryDecision(receipt.decision, { recovery: inputs.keywordRecovery });
  assert(normalizedJson(receipt.decision) === normalizedJson(inputs.keywordRecoveryDecision),
    'KEYWORD_EXECUTION_RECEIPT_INVALID: decision changed');
  const expectedRecovery = inputs.keywordRecovery ? {
    manifestPath: resolve(inputs.keywordRecovery.manifestPath), sha256: inputs.keywordRecovery.sha256,
    filesSha256: sha256(normalizedJson(inputs.keywordRecovery.files)),
  } : null;
  const expectedEvidencePlan = inputs.keywordEvidencePlan
    ? keywordEvidencePlanReference(inputs.keywordEvidencePlan) : null;
  assert(receipt.decision?.mode !== 'recover' || expectedEvidencePlan,
    'KEYWORD_EXECUTION_RECEIPT_INVALID: recover receipt has no evidence plan');
  assert(normalizedJson(receipt.recovery) === normalizedJson(expectedRecovery) &&
    normalizedJson(receipt.evidencePlan ?? null) === normalizedJson(expectedEvidencePlan) &&
    normalizedJson(receipt.budget) === normalizedJson(keywordResearchBudget(inputs.keywordResearchBudget)) &&
    normalizedJson(receipt.serviceStops) === normalizedJson(keywordServiceStops(inputs.keywordServiceStops)) &&
    normalizedJson(receipt.serviceResumes) === normalizedJson(keywordServiceResumes(inputs.keywordServiceResumes)),
  'KEYWORD_EXECUTION_RECEIPT_INVALID: recovery controls changed');
  return clone(receipt);
}
