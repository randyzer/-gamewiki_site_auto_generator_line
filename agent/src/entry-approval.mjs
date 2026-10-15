// Experimental host contract, not a production issuer or an authentication service.
// Host functions must be installed by trusted bootstrap code, never task/config JSON.
import { join, resolve } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { AGENT_ROOT } from './skill-lock.mjs';
import { validateEntryHandoff } from './entry-v1.mjs';
import { validateEntryResume } from './entry-resume-snapshot.mjs';

function scopeBinding(binding, executionStages) {
  if (executionStages === undefined) return binding;
  if (!Array.isArray(executionStages) || !executionStages.length ||
      !isDeepStrictEqual(executionStages, binding.snapshot.stages.slice(0, executionStages.length)))
    throw Error('ENTRY_APPROVAL_SCOPE_UNSUPPORTED');
  return { ...binding, executionStages: structuredClone(executionStages) };
}

export function entryResumeApprovalBinding(snapshot, configuration, { executionStages } = {}) {
  if (snapshot?.kind !== 'ENTRY_RESUME_PREVIEW_ONLY' ||
      !isDeepStrictEqual(snapshot.configuration, configuration) || snapshot.inputs?.mode !== 'new-site' ||
      snapshot.inputs.adsEnabled !== false || snapshot.inputs.uiMode === 'optimize')
    throw Error('ENTRY_RESUME_SCOPE_UNSUPPORTED');
  return scopeBinding(structuredClone({ kind: 'ENTRY_HOST_APPROVAL_V1', purpose: 'resume-pipeline-only',
    snapshot, configuration, inputs: snapshot.inputs, releaseAuthorized: false }), executionStages);
}

export function entryApprovalBinding(snapshot, configuration, { executionStages } = {}) {
  if (configuration.workspace !== resolve(AGENT_ROOT) ||
      configuration.inventoryPath !== join(AGENT_ROOT, 'config', 'skill-manifest.json'))
    throw Error('ENTRY_APPROVAL_CONFIGURATION_MISMATCH');
  if (snapshot.inputs?.mode !== 'new-site' || snapshot.inputs.adRequested === true ||
      snapshot.inputs.uiMode === 'optimize') throw Error('ENTRY_APPROVAL_SCOPE_UNSUPPORTED');
  // No deployment authorization, DNS string, approval flags or arbitrary passthrough.
  const inputs = { projectPath: snapshot.workspace, mode: 'new-site', adsEnabled: false };
  for (const key of ['gameIdentity', 'objective', 'gameMetadata', 'rawKeywordsFile',
    'keywordSourceLineageFile',
    'iconSourcePng', 'iconSourceMethod', 'canonicalOrigin', 'domain', 'repo', 'branch',
    'deploymentProvider', 'dns', 'uiMode']) {
    if (Object.hasOwn(snapshot.inputs, key)) inputs[key] = structuredClone(snapshot.inputs[key]);
  }
  if (snapshot.inputs.canonicalOrigin) inputs.canonicalRequired = true;
  return scopeBinding(structuredClone({ kind: 'ENTRY_HOST_APPROVAL_V1', purpose: 'fresh-pipeline-only',
    snapshot, configuration, inputs, releaseAuthorized: false }), executionStages);
}

export function createEntryApprovalConsumer({ host, now = Date.now, executionStages } = {}) {
  executionStages = executionStages === undefined ? undefined : structuredClone(executionStages);
  return async (task, configuration) => {
    if (typeof host?.consume !== 'function') throw Error('ENTRY_TRUSTED_APPROVAL_UNAVAILABLE');
    const approval = task.approval;
    const resume = approval?.snapshot?.kind === 'ENTRY_RESUME_PREVIEW_ONLY';
    if (task.retry !== undefined && task.retry !== false && !resume) throw Error('ENTRY_APPROVAL_RETRY_UNSUPPORTED');
    if (!approval || Object.keys(approval).sort().join(',') !== 'snapshot,ticket' ||
        typeof approval.ticket !== 'string' || !approval.ticket || approval.ticket.length > 1024)
      throw Error('ENTRY_APPROVAL_INVALID');
    const snapshot = structuredClone(approval.snapshot);
    if (task.id !== snapshot.executionRunId) throw Error('ENTRY_APPROVAL_RUN_MISMATCH');
    const validate = resume ? validateEntryResume : validateEntryHandoff;
    await validate(snapshot, configuration);
    const binding = resume ? entryResumeApprovalBinding(snapshot, configuration, { executionStages })
      : entryApprovalBinding(snapshot, configuration, { executionStages });
    let supplied;
    try { supplied = JSON.parse(task.inputs); } catch { throw Error('ENTRY_APPROVAL_INPUT_MISMATCH'); }
    if (!isDeepStrictEqual(supplied, binding.inputs)) throw Error('ENTRY_APPROVAL_INPUT_MISMATCH');
    // The host must atomically validate authentication, expiration, unused ticket,
    // and unique destination, then burn the ticket before returning its receipt.
    // A failed subsequent check never rolls consumption back.
    const receipt = await host.consume({ ticket: approval.ticket, binding: structuredClone(binding) });
    const time = now();
    if (!receipt || receipt.used !== true || !isDeepStrictEqual(receipt.binding, binding) ||
        typeof receipt.approvalId !== 'string' || !receipt.approvalId.trim() ||
        typeof receipt.approver !== 'string' || !receipt.approver.trim() ||
        !Number.isSafeInteger(time) || !Number.isSafeInteger(receipt.approvedAt) ||
        !Number.isSafeInteger(receipt.expiresAt) || receipt.approvedAt > time ||
        receipt.expiresAt <= time || receipt.expiresAt <= receipt.approvedAt)
      throw Error('ENTRY_APPROVAL_RECEIPT_INVALID');
    await validate(snapshot, configuration);
    if (now() >= receipt.expiresAt) throw Error('ENTRY_APPROVAL_EXPIRED');
    if (typeof host.prepare === 'function') return host.prepare({ receipt, binding: structuredClone(binding) });
    if (resume) throw Error('ENTRY_RESUME_HOST_REQUIRED');
    return true;
  };
}

export { createLocalEntryApprovalHost } from './local-entry-approval.mjs';
