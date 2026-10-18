import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { canonicalJson, parseStrictJson } from '../contracts/canonical-json.mjs';
import { ContractError } from '../contracts/errors.mjs';
import { validateContract } from '../contracts/registry.mjs';
import { computeCommitDigest } from '../state/state-records.mjs';
import { createStateObjectStore } from '../state/state-object-store.mjs';
import { writeAtomicFile } from '../state/atomic-file.mjs';
import { assertRegularFileNoSymlink } from '../state/storage-boundary.mjs';
import { assertTrustedApprovalConsumption } from '../approval/approval-engine.mjs';
import { publishTransactionOutcome, readTransactionIntent, readTransactionOutcomes } from './transaction-coordinator.mjs';

const fail = message => { throw new ContractError('TRANSACTION_AUTHORITY_CORRUPT', message); };

async function readCommit({ rootDirectory, operationId }) {
  const path = join(rootDirectory, 'transactions', operationId, 'stage/commit.json');
  try {
    await assertRegularFileNoSymlink(path);
    const record = parseStrictJson(await readFile(path), path);
    validateContract('STAGE_COMMIT_RECORD', 2, record);
    if (record.operationId !== operationId || computeCommitDigest(record) !== record.commitDigest)
      fail('Offline Stage Commit binding or digest mismatch');
    const objectStore = createStateObjectStore({ rootDirectory });
    for (const reference of record.objects) await objectStore.verify(reference);
    return record;
  } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

function assertBindings(intent, consumption, commit, outcomes) {
  const aborted = outcomes.find(item => item.status === 'ABORTED_BEFORE_CONSUMPTION');
  const reconciliation = outcomes.find(item => item.status === 'RECONCILIATION_REQUIRED');
  const committed = outcomes.find(item => item.status === 'COMMITTED');
  if (aborted && (consumption || commit || reconciliation || committed))
    fail('ABORTED_BEFORE_CONSUMPTION contradicts later transaction authority');
  if (reconciliation && (!consumption || reconciliation.commitDigest !== null))
    fail('RECONCILIATION_REQUIRED lacks its authoritative Consumption');
  if (committed && !commit) fail('COMMITTED Outcome exists without Stage Commit');
  if (consumption) {
    for (const [key, value] of Object.entries({ operationId: intent.operationId, approvalId: intent.approvalId,
      contextDigest: intent.contextDigest, purposeDigest: intent.purposeDigest, intentDigest: intent.intentDigest })) {
      if (consumption[key] !== value) fail(`Consumption does not match ${key}`);
    }
  }
  if (commit) {
    if (!consumption) fail('APPROVED Stage Commit exists without authoritative Consumption');
    for (const [key, value] of Object.entries({ operationId: intent.operationId, runId: intent.runId,
      canonicalStageId: intent.canonicalStageId, attemptId: intent.attemptId,
      contextDigest: intent.contextDigest, schemaBundleDigest: intent.schemaBundleDigest,
      policyVersion: intent.policyVersion,
      purposeDigest: intent.purposeDigest, candidateDigest: intent.candidateDigest,
      approvalId: intent.approvalId, approvalDigest: intent.approvalDigest,
      intentDigest: intent.intentDigest, consumptionDigest: consumption.consumptionDigest })) {
      if (commit[key] !== value) fail(`Stage Commit does not match ${key}`);
    }
  }
  for (const outcome of outcomes) {
    if (outcome.intentDigest !== intent.intentDigest) fail('Outcome does not match Intent');
    if (outcome.consumptionDigest && outcome.consumptionDigest !== consumption?.consumptionDigest)
      fail('Outcome does not match Consumption');
    if (outcome.commitDigest && outcome.commitDigest !== commit?.commitDigest)
      fail('Outcome does not match Stage Commit');
    if (outcome.status === 'COMMITTED' && !commit) fail('Committed Outcome exists without Stage Commit');
  }
}

export async function recoverOfflineTransaction({ rootDirectory, operationId, approvalHarness,
  capabilityRegistry, capability, repair = false, clock = Date.now, currentBinding = null }) {
  capabilityRegistry.assert(capability, { capability: 'OFFLINE_RECOVERY', mode: 'SIMULATED', rootDirectory });
  const intent = await readTransactionIntent({ rootDirectory, operationId });
  if (!intent) {
    const consumption = await approvalHarness.consumer.recoverOperationConsumption({ operationId });
    const commit = await readCommit({ rootDirectory, operationId });
    const outcomes = await readTransactionOutcomes({ rootDirectory, operationId });
    if (consumption || commit || outcomes.length)
      fail('Transaction Intent is missing while later authority exists');
    return Object.freeze({ operationId, status: 'NOT_STARTED' });
  }
  if (currentBinding) {
    for (const key of ['contextDigest', 'schemaBundleDigest', 'mappingVersion', 'policyVersion']) {
      if (currentBinding[key] !== intent[key])
        throw new ContractError('TRANSACTION_CONTEXT_STALE', `Transaction is invalid after ${key} changed`);
    }
  }
  const consumption = await approvalHarness.consumer.recoverOperationConsumption({
    operationId, approvalId: intent.approvalId, intentDigest: intent.intentDigest,
    contextDigest: intent.contextDigest, purposeDigest: intent.purposeDigest,
  });
  if (consumption) assertTrustedApprovalConsumption(consumption);
  const commit = await readCommit({ rootDirectory, operationId });
  const outcomes = await readTransactionOutcomes({ rootDirectory, operationId });
  assertBindings(intent, consumption, commit, outcomes);
  if (!consumption) {
    if (outcomes.some(item => item.status !== 'ABORTED_BEFORE_CONSUMPTION'))
      fail('Outcome claims authority before Approval Consumption');
    return Object.freeze({ operationId, status: outcomes.some(item => item.status === 'ABORTED_BEFORE_CONSUMPTION') ?
      'ABORTED_BEFORE_CONSUMPTION' : 'PREPARED', intentDigest: intent.intentDigest });
  }
  if (!commit) {
    const outcome = repair ? await publishTransactionOutcome({ rootDirectory, operationId,
      status: 'RECONCILIATION_REQUIRED', intentDigest: intent.intentDigest,
      consumptionDigest: consumption.consumptionDigest, commitDigest: null, recordedAtMs: clock(),
      capabilityRegistry, capability }) :
      outcomes.find(item => item.status === 'RECONCILIATION_REQUIRED');
    return Object.freeze({ operationId, status: 'RECONCILIATION_REQUIRED',
      intentDigest: intent.intentDigest, consumptionDigest: consumption.consumptionDigest,
      outcomeDigest: outcome?.outcomeDigest ?? null });
  }
  const outcome = outcomes.find(item => item.status === 'COMMITTED') ?? (repair ?
    await publishTransactionOutcome({ rootDirectory, operationId, status: 'COMMITTED',
      intentDigest: intent.intentDigest, consumptionDigest: consumption.consumptionDigest,
      commitDigest: commit.commitDigest, recordedAtMs: clock(), capabilityRegistry, capability }) : null);
  if (repair && outcome) {
    await writeAtomicFile(join(rootDirectory, 'transactions', operationId, 'projection.json'),
      Buffer.from(`${canonicalJson({ operationId, status: 'COMMITTED', outcomeDigest: outcome.outcomeDigest })}\n`));
  }
  return Object.freeze({ operationId, status: 'COMMITTED', intentDigest: intent.intentDigest,
    consumptionDigest: consumption.consumptionDigest, commitDigest: commit.commitDigest,
    outcomeDigest: outcome?.outcomeDigest ?? null });
}
