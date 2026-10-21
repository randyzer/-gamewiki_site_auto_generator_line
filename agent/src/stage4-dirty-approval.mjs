import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

import { canonicalJson } from './contracts/canonical-json.mjs';
import { ContractError } from './contracts/errors.mjs';
import { assertTrustedRunPreviewConsumption } from './run-preview-snapshot.mjs';
import { STAGE } from './stages.mjs';

const DIGEST = /^[a-f0-9]{64}$/;
const sha = value => createHash('sha256').update(value).digest('hex');
const fail = (code, message) => { throw new ContractError(code, message); };
const claimedPreviewConsumptions = new WeakSet();
const exactKeys = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) &&
  Object.keys(value).sort().join(',') === [...keys].sort().join(',');

export function validateStage4DirtyWorktreeApproval(value) {
  if (!exactKeys(value, ['kind', 'schemaVersion', 'approved', 'runId', 'stage', 'attempt',
    'projectPath', 'repositoryRoot', 'headSha', 'baselineDigest']) ||
      value.kind !== 'STAGE4_DIRTY_WORKTREE_APPROVAL_V1' || value.schemaVersion !== 1 ||
      value.approved !== true || value.stage !== STAGE.CONTENT_INTEGRATION ||
      !/^[a-zA-Z0-9_-]{1,100}$/.test(value.runId ?? '') ||
      !Number.isSafeInteger(value.attempt) || value.attempt < 1 ||
      typeof value.projectPath !== 'string' || resolve(value.projectPath) !== value.projectPath ||
      typeof value.repositoryRoot !== 'string' || resolve(value.repositoryRoot) !== value.repositoryRoot ||
      !(value.headSha === null || /^[a-f0-9]{40}$/.test(value.headSha ?? '')) ||
      !DIGEST.test(value.baselineDigest ?? ''))
    fail('STAGE4_DIRTY_WORKTREE_APPROVAL_INVALID', 'Dirty-worktree approval does not match the typed contract');
  return structuredClone(value);
}

export function createStage4DirtyApprovalVerifier({ previewConsumption, approvedInputs }) {
  const consumption = assertTrustedRunPreviewConsumption(previewConsumption, { effectiveInputs: approvedInputs });
  const approved = validateStage4DirtyWorktreeApproval(approvedInputs?.stage4DirtyWorktreeApproval);
  if (claimedPreviewConsumptions.has(consumption))
    fail('STAGE4_DIRTY_WORKTREE_APPROVAL_REPLAY', 'Preview consumption was already claimed');
  if (consumption.runId !== approved.runId || consumption.command !== 'retry')
    fail('STAGE4_DIRTY_WORKTREE_APPROVAL_INVALID',
      'Preview consumption does not match the approved retry input document');
  claimedPreviewConsumptions.add(consumption);
  let consumed = false;
  return expected => {
    if (consumed) fail('STAGE4_DIRTY_WORKTREE_APPROVAL_REPLAY', 'Dirty-worktree approval was already consumed');
    const actual = validateStage4DirtyWorktreeApproval(approved);
    if (actual.runId !== expected.runId || actual.stage !== expected.stage ||
        actual.attempt !== expected.attempt || actual.projectPath !== expected.projectPath ||
        actual.repositoryRoot !== expected.repositoryRoot || actual.headSha !== expected.headSha ||
        actual.baselineDigest !== expected.baselineDigest)
      fail('STAGE4_DIRTY_WORKTREE_APPROVAL_STALE', 'Dirty-worktree approval does not match the current Git baseline');
    consumed = true;
    return Object.freeze({ kind: 'STAGE4_DIRTY_WORKTREE_APPROVAL_CONSUMPTION_V1',
      previewId: consumption.previewId, snapshotSha256: consumption.snapshotSha256,
      approvalDigest: sha(`STAGE4_DIRTY_WORKTREE_APPROVAL_V1\n${canonicalJson(actual)}`) });
  };
}
