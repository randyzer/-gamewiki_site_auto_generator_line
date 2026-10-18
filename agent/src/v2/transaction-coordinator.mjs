import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { canonicalJson, deepFreeze, parseStrictJson } from '../contracts/canonical-json.mjs';
import { ContractError } from '../contracts/errors.mjs';
import { validateContract } from '../contracts/registry.mjs';
import { purposeContextDigest } from '../contracts/context-digest.mjs';
import { createOfflineApprovedStageCommitCandidate } from '../state/stage-commit-candidate.mjs';
import { createOfflineTransactionStageCommitStore } from '../state/stage-commit-store.mjs';
import { writeAtomicFile, writeImmutableFile } from '../state/atomic-file.mjs';
import { assertRegularFileNoSymlink, ensureDirectoryTree } from '../state/storage-boundary.mjs';
import { STAGE_IDENTITY_MAPPING_VERSION } from './stage-identity.mjs';
import { stageRegistry } from './stage-registry.mjs';
import { assertTrustedApprovalConsumption } from '../approval/approval-engine.mjs';

const sha256 = value => createHash('sha256').update(value).digest('hex');
const digest = (domain, value, field) => {
  const { [field]: ignored, ...payload } = value;
  return sha256(`${domain}\n${canonicalJson(payload)}`);
};
export const computeTransactionIntentDigest = value => digest('AGENT_TRANSACTION_INTENT_V1', value, 'intentDigest');
export const computeTransactionOutcomeDigest = value => digest('AGENT_TRANSACTION_OUTCOME_V1', value, 'outcomeDigest');

const transactionRoot = (rootDirectory, operationId) => join(rootDirectory, 'transactions', operationId);

function assertIntentDigest(intent) {
  validateContract('TRANSACTION_INTENT', 1, intent);
  if (computeTransactionIntentDigest(intent) !== intent.intentDigest)
    throw new ContractError('TRANSACTION_AUTHORITY_CORRUPT', 'Transaction Intent digest mismatch');
  stageRegistry.requireCore(intent.canonicalStageId);
  return intent;
}

export function assertTransactionOutcome(outcome) {
  validateContract('TRANSACTION_OUTCOME', 1, outcome);
  if (computeTransactionOutcomeDigest(outcome) !== outcome.outcomeDigest)
    throw new ContractError('TRANSACTION_AUTHORITY_CORRUPT', 'Transaction Outcome digest mismatch');
  if (outcome.status === 'COMMITTED' && (!outcome.consumptionDigest || !outcome.commitDigest))
    throw new ContractError('TRANSACTION_AUTHORITY_CORRUPT', 'Committed Outcome lacks authority digests');
  if (outcome.status === 'RECONCILIATION_REQUIRED' && (!outcome.consumptionDigest || outcome.commitDigest))
    throw new ContractError('TRANSACTION_AUTHORITY_CORRUPT', 'Reconciliation Outcome has invalid authority digests');
  if (outcome.status === 'ABORTED_BEFORE_CONSUMPTION' && (outcome.consumptionDigest || outcome.commitDigest))
    throw new ContractError('TRANSACTION_AUTHORITY_CORRUPT', 'Aborted Outcome contains committed authority');
  return outcome;
}

export async function readTransactionIntent({ rootDirectory, operationId }) {
  const path = join(transactionRoot(rootDirectory, operationId), 'intent.json');
  try {
    await assertRegularFileNoSymlink(path);
    return assertIntentDigest(parseStrictJson(await readFile(path), path));
  } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

export async function readTransactionOutcomes({ rootDirectory, operationId }) {
  const directory = join(transactionRoot(rootDirectory, operationId), 'outcomes');
  const results = [];
  for (const name of ['aborted-before-consumption.json', 'reconciliation-required.json', 'committed.json']) {
    const path = join(directory, name);
    try {
      await assertRegularFileNoSymlink(path);
      const outcome = assertTransactionOutcome(parseStrictJson(await readFile(path), path));
      if (outcome.operationId !== operationId)
        throw new ContractError('TRANSACTION_AUTHORITY_CORRUPT', 'Outcome operation binding mismatch');
      results.push(outcome);
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  return results;
}

async function publishIntent({ rootDirectory, intent }) {
  const root = transactionRoot(rootDirectory, intent.operationId);
  await ensureDirectoryTree(rootDirectory, ['transactions', intent.operationId]);
  const existing = await readTransactionIntent({ rootDirectory, operationId: intent.operationId });
  if (existing) {
    for (const key of ['operationId', 'runId', 'canonicalStageId', 'attemptId', 'contextDigest',
      'schemaBundleDigest', 'policyVersion', 'purposeDigest', 'candidateDigest', 'approvalId', 'approvalDigest']) {
      if (existing[key] !== intent[key])
        throw new ContractError('TRANSACTION_IDEMPOTENCY_CONFLICT', `Operation changed ${key}`);
    }
    return existing;
  }
  const created = await writeImmutableFile(join(root, 'intent.json'), Buffer.from(`${canonicalJson(intent)}\n`));
  if (created) return intent;
  const winner = await readTransactionIntent({ rootDirectory, operationId: intent.operationId });
  for (const key of ['operationId', 'runId', 'canonicalStageId', 'attemptId', 'contextDigest',
    'schemaBundleDigest', 'policyVersion', 'purposeDigest', 'candidateDigest', 'approvalId', 'approvalDigest']) {
    if (winner[key] !== intent[key])
      throw new ContractError('TRANSACTION_IDEMPOTENCY_CONFLICT', `Operation changed ${key}`);
  }
  return winner;
}

export async function publishTransactionOutcome({ rootDirectory, operationId, status, intentDigest,
  consumptionDigest = null, commitDigest = null, recordedAtMs, capabilityRegistry, capability }) {
  capabilityRegistry.assert(capability, { capability: 'OFFLINE_RECOVERY', mode: 'SIMULATED', rootDirectory });
  const names = { COMMITTED: 'committed.json', RECONCILIATION_REQUIRED: 'reconciliation-required.json',
    ABORTED_BEFORE_CONSUMPTION: 'aborted-before-consumption.json' };
  const root = transactionRoot(rootDirectory, operationId);
  await ensureDirectoryTree(rootDirectory, ['transactions', operationId, 'outcomes']);
  const base = { kind: 'TRANSACTION_OUTCOME', schemaVersion: 1, producer: 'V2_TRANSACTION_COORDINATOR',
    operationId, status, intentDigest, consumptionDigest, commitDigest, recordedAtMs };
  const outcome = deepFreeze({ ...base, outcomeDigest: computeTransactionOutcomeDigest(base) });
  assertTransactionOutcome(outcome);
  const path = join(root, 'outcomes', names[status]);
  try {
    await assertRegularFileNoSymlink(path);
    const existing = assertTransactionOutcome(parseStrictJson(await readFile(path), path));
    if (existing.intentDigest !== intentDigest || existing.consumptionDigest !== consumptionDigest ||
        existing.commitDigest !== commitDigest)
      throw new ContractError('TRANSACTION_IDEMPOTENCY_CONFLICT', `Outcome ${status} already has different bindings`);
    return existing;
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const created = await writeImmutableFile(path, Buffer.from(`${canonicalJson(outcome)}\n`));
  if (created) return outcome;
  const existing = assertTransactionOutcome(parseStrictJson(await readFile(path), path));
  if (existing.intentDigest !== intentDigest || existing.consumptionDigest !== consumptionDigest ||
      existing.commitDigest !== commitDigest)
    throw new ContractError('TRANSACTION_IDEMPOTENCY_CONFLICT', `Outcome ${status} already has different bindings`);
  return existing;
}

export function createOfflineTransactionCoordinator({ rootDirectory, namespace, approvalHarness,
  capabilityRegistry, capability, clock = Date.now, faults = {} }) {
  capabilityRegistry.assert(capability, { capability: 'OFFLINE_TRANSACTION', mode: 'SIMULATED', rootDirectory });
  const stageStore = createOfflineTransactionStageCommitStore({ rootDirectory, capabilityRegistry, capability,
    faultInjector: async point => faults[point]?.() });
  const coordinator = {
    approvalHarness,
    async execute(request) {
      capabilityRegistry.assert(capability, { capability: 'OFFLINE_TRANSACTION', mode: 'SIMULATED', rootDirectory });
      stageRegistry.requireCore(request.canonicalStageId);
      if (!/^op-[a-f0-9]{32}$/.test(request.operationId))
        throw new ContractError('TRANSACTION_OPERATION_INVALID', 'Invalid operationId');
      await ensureDirectoryTree(rootDirectory, ['transactions', request.operationId]);
      {
        const approvalDigest = request.approvalReference.recordDigest;
        const purposeDigest = purposeContextDigest(request.approvalExpected.contextDigest,
          request.approvalExpected.purpose, request.approvalExpected.purposePayload);
        const approvedState = structuredClone(request.candidateInput.state);
        approvedState.gate = { status: 'APPROVED', approvalDigest };
        const buildCandidate = (policyVersion, verifyStagedObjects = true) => createOfflineApprovedStageCommitCandidate({
          ...request.candidateInput, state: approvedState, operationId: request.operationId,
          canonicalStageId: request.canonicalStageId, purposeDigest, policyVersion,
          approvalId: request.approvalReference.approvalId, approvalDigest },
        { capabilityRegistry, capability, rootDirectory, verifyStagedObjects });
        const existingIntent = await readTransactionIntent({ rootDirectory, operationId: request.operationId });
        if (existingIntent) {
          const replayCandidate = await buildCandidate(existingIntent.policyVersion, false);
          for (const [key, value] of Object.entries({ runId: replayCandidate.runId,
            canonicalStageId: replayCandidate.canonicalStageId, attemptId: replayCandidate.attemptId,
            contextDigest: replayCandidate.contextDigest, schemaBundleDigest: replayCandidate.schemaBundleDigest,
            purposeDigest: replayCandidate.purposeDigest, candidateDigest: replayCandidate.candidateDigest,
            approvalId: replayCandidate.approvalId, approvalDigest: replayCandidate.approvalDigest })) {
            if (existingIntent[key] !== value)
              throw new ContractError('TRANSACTION_IDEMPOTENCY_CONFLICT', `Operation changed ${key}`);
          }
          const { recoverOfflineTransaction } = await import('./migration-recovery.mjs');
          const recovered = await recoverOfflineTransaction({ rootDirectory, namespace,
            operationId: request.operationId, approvalHarness, capabilityRegistry, capability, repair: true,
            clock });
          if (recovered.status === 'COMMITTED') {
            const outcomes = await readTransactionOutcomes({ rootDirectory, operationId: request.operationId });
            return outcomes.find(item => item.status === 'COMMITTED');
          }
        }
        const approval = await approvalHarness.verifier.verify(request.approvalReference,
          { ...request.approvalExpected, nowMs: clock() });
        const candidate = await buildCandidate(approval.policyVersion);
        const intentBase = { kind: 'TRANSACTION_INTENT', schemaVersion: 1,
          producer: 'V2_TRANSACTION_COORDINATOR', operationId: request.operationId,
          mode: 'SIMULATED', mappingVersion: STAGE_IDENTITY_MAPPING_VERSION,
          policyVersion: candidate.policyVersion,
          runId: candidate.runId, canonicalStageId: candidate.canonicalStageId,
          attemptId: candidate.attemptId, contextDigest: candidate.contextDigest,
          schemaBundleDigest: candidate.schemaBundleDigest, purposeDigest: candidate.purposeDigest,
          candidateDigest: candidate.candidateDigest, approvalId: candidate.approvalId,
          approvalDigest: candidate.approvalDigest, createdAtMs: clock() };
        const proposed = { ...intentBase, intentDigest: computeTransactionIntentDigest(intentBase) };
        assertIntentDigest(proposed);
        await faults.beforeIntentCommit?.();
        const intent = await publishIntent({ rootDirectory, intent: proposed });
        await faults.afterIntentCommit?.();
        const outcomes = await readTransactionOutcomes({ rootDirectory, operationId: request.operationId });
        const committed = outcomes.find(item => item.status === 'COMMITTED');
        if (committed) return committed;
        await faults.beforeConsumptionCommit?.();
        const consumption = await approvalHarness.consumer.consumeForOperation(request.approvalReference,
          { ...request.approvalExpected, nowMs: clock() },
          { operationId: request.operationId, intentDigest: intent.intentDigest });
        assertTrustedApprovalConsumption(consumption);
        await faults.afterConsumptionCommitted?.();
        const record = await stageStore.commit(candidate, { stagingRoot: request.candidateInput.stagingRoot,
          intent, consumption });
        await faults.afterStageCommit?.();
        const outcome = await publishTransactionOutcome({ rootDirectory, operationId: request.operationId,
          status: 'COMMITTED', intentDigest: intent.intentDigest,
          consumptionDigest: consumption.consumptionDigest, commitDigest: record.commitDigest,
          recordedAtMs: clock(), capabilityRegistry, capability });
        await faults.afterOutcomeCommitted?.();
        await writeAtomicFile(join(transactionRoot(rootDirectory, request.operationId), 'projection.json'),
          Buffer.from(`${canonicalJson({ operationId: request.operationId, status: 'COMMITTED',
            outcomeDigest: outcome.outcomeDigest })}\n`));
        return outcome;
      }
    },
  };
  return Object.freeze(coordinator);
}
