import { resolve } from 'node:path';
import { sha256 } from './files.mjs';
import { keywordResearchBudget } from './keyword-budget.mjs';
import { keywordServiceStops, keywordServiceResumes } from './keyword-service-stops.mjs';

const assert = (ok, message) => { if (!ok) throw Error(message); };
const clone = value => JSON.parse(JSON.stringify(value));

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
  manifestBytes, confirmationBinding }) {
  const decision = keywordRecoveryDecision(inputs.keywordRecoveryDecision, { recovery: inputs.keywordRecovery });
  if (!decision) return null;
  const recovery = inputs.keywordRecovery ? {
    manifestPath: resolve(inputs.keywordRecovery.manifestPath),
    sha256: inputs.keywordRecovery.sha256,
    filesSha256: sha256(normalizedJson(inputs.keywordRecovery.files)),
  } : null;
  return {
    schemaVersion: 1,
    kind: 'KEYWORD_RECOVERY_EXECUTION_V1',
    runId,
    command: 'retry',
    inputsFile: resolve(inputsFile),
    inputsFileSha256: sha256(inputsFileBytes),
    inputPatchSha256: sha256(normalizedJson(inputs)),
    manifestSha256: sha256(manifestBytes),
    confirmationBinding: sha256(confirmationBinding),
    decision,
    recovery,
    budget: keywordResearchBudget(inputs.keywordResearchBudget),
    serviceStops: keywordServiceStops(inputs.keywordServiceStops),
    serviceResumes: keywordServiceResumes(inputs.keywordServiceResumes),
  };
}

export function verifyKeywordExecutionReceipt(receipt, { runId, inputs, manifestBytes }) {
  if (!receipt) return null;
  assert(receipt.schemaVersion === 1 && receipt.kind === 'KEYWORD_RECOVERY_EXECUTION_V1' &&
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
  assert(normalizedJson(receipt.recovery) === normalizedJson(expectedRecovery) &&
    normalizedJson(receipt.budget) === normalizedJson(keywordResearchBudget(inputs.keywordResearchBudget)) &&
    normalizedJson(receipt.serviceStops) === normalizedJson(keywordServiceStops(inputs.keywordServiceStops)) &&
    normalizedJson(receipt.serviceResumes) === normalizedJson(keywordServiceResumes(inputs.keywordServiceResumes)),
  'KEYWORD_EXECUTION_RECEIPT_INVALID: recovery controls changed');
  return clone(receipt);
}
