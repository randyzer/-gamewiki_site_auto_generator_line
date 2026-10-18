import { ContractError } from '../contracts/errors.mjs';
import { purposeContextDigest } from '../contracts/context-digest.mjs';
import { deepFreeze } from '../contracts/canonical-json.mjs';

const rules = Object.freeze([
  ['APPROVAL_DENIED', 'decision', 'decision-approved'],
  ['APPROVAL_CONTEXT_MISMATCH', 'runId', 'execution-identity'],
  ['APPROVAL_CONTEXT_MISMATCH', 'stageId', 'execution-identity'],
  ['APPROVAL_CONTEXT_MISMATCH', 'attemptId', 'execution-identity'],
  ['APPROVAL_CONTEXT_MISMATCH', 'contextDigest', 'execution-context'],
  ['APPROVAL_CONTEXT_MISMATCH', 'schemaBundleDigest', 'schema-version'],
  ['APPROVAL_PURPOSE_MISMATCH', 'purpose', 'purpose-kind'],
]);

export function approvalInvalidationReport(record, expected) {
  const matches = [];
  for (const [reasonCode, field, ruleId] of rules) {
    const invalid = field === 'decision' ? record.decision !== 'APPROVED' : record[field] !== expected[field];
    if (invalid) matches.push({ reasonCode, field, ruleId });
  }
  if (record.purpose === expected.purpose && record.contextDigest === expected.contextDigest) {
    const expectedDigest = purposeContextDigest(expected.contextDigest, expected.purpose, expected.purposePayload);
    if (record.purposeDigest !== expectedDigest)
      matches.push({ reasonCode: 'APPROVAL_BINDING_MISMATCH', field: 'purposePayload', ruleId: 'purpose-payload' });
  }
  if (expected.nowMs < record.issuedAtMs)
    matches.push({ reasonCode: 'APPROVAL_NOT_YET_VALID', field: 'issuedAtMs', ruleId: 'validity-window' });
  if (expected.nowMs >= record.expiresAtMs)
    matches.push({ reasonCode: 'APPROVAL_EXPIRED', field: 'expiresAtMs', ruleId: 'validity-window' });
  return deepFreeze({ invalidatedApprovalIds: matches.length ? [record.approvalId] : [],
    reasonCodes: [...new Set(matches.map(item => item.reasonCode))],
    affectedFields: [...new Set(matches.map(item => item.field))],
    dependencyRuleIds: [...new Set(matches.map(item => item.ruleId))] });
}

export function assertApprovalValid(record, expected) {
  const report = approvalInvalidationReport(record, expected);
  if (report.reasonCodes.length) {
    const code = report.reasonCodes[0];
    const messages = { APPROVAL_DENIED: 'Approval decision is not approved',
      APPROVAL_CONTEXT_MISMATCH: 'Approval execution binding changed',
      APPROVAL_PURPOSE_MISMATCH: 'Approval purpose changed',
      APPROVAL_BINDING_MISMATCH: 'Approval payload changed',
      APPROVAL_NOT_YET_VALID: 'Approval is not yet valid', APPROVAL_EXPIRED: 'Approval expired' };
    throw new ContractError(code, messages[code], { invalidation: report });
  }
  return record;
}
