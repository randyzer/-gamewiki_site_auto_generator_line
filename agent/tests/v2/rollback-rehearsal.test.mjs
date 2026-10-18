import test from 'node:test';
import assert from 'node:assert/strict';
import { chmod, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApprovalRequest, createTestApprovalHarness } from '../../src/approval/approval-engine.mjs';
import { createTestHostCapabilityRegistry } from '../../src/v2/host/capability-registry.mjs';
import { recoverOfflineTransaction } from '../../src/v2/migration-recovery.mjs';
import { createStageFeatureGateStore } from '../../src/v2/stage-feature-gates.mjs';
import { offlineReplayOperationId, recoverOfflineReplayAuthority } from '../../src/v2/stage-coordinator.mjs';
import { createOfflineTransactionCoordinator } from '../../src/v2/transaction-coordinator.mjs';
import { candidateInput, digest } from '../state-helpers.mjs';

const purposePayload = { producerStage: 'keyword-research', consumerStage: 'template-selection',
  handoffDigest: digest('p5-h-handoff'), recoveryDigest: digest('p5-h-recovery') };

async function fixture(t, { faults = {} } = {}) {
  const root = await mkdtemp(join(tmpdir(), 'p5-h-rollback-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const input = await candidateInput(root, { runId: 'p5-h-run', stageId: 'keyword-research', attemptId: 1 });
  const approvalExpected = { runId: input.runId, stageId: input.stageId, attemptId: input.attemptId,
    contextDigest: input.contextDigest, schemaBundleDigest: input.schemaBundleDigest,
    purpose: 'PARTIAL_HANDOFF', purposePayload };
  const approvals = await createTestApprovalHarness({ rootDirectory: root, namespace: 'p5-h',
    clock: () => 1500, policyVersionProvider: () => 'p4-shadow-v1' });
  const reference = await approvals.authority.issue(createApprovalRequest(approvalExpected),
    { decision: 'APPROVED', nowMs: 1000, expiresAtMs: 3000 });
  const registry = createTestHostCapabilityRegistry();
  const capability = registry.issue({ capability: 'OFFLINE_TRANSACTION', mode: 'SIMULATED', rootDirectory: root });
  const coordinator = createOfflineTransactionCoordinator({ rootDirectory: root, namespace: 'p5-h',
    approvalHarness: approvals, capabilityRegistry: registry, capability, clock: () => 1500, faults });
  return { root, input, approvalExpected, reference, registry, capability, coordinator };
}

const request = (f, operationId) => ({ operationId, canonicalStageId: 'keyword-research',
  candidateInput: f.input, approvalReference: f.reference, approvalExpected: f.approvalExpected });

async function recover(f, operationId, options = {}) {
  return recoverOfflineTransaction({ rootDirectory: f.root, namespace: 'p5-h', operationId,
    approvalHarness: f.coordinator.approvalHarness, capabilityRegistry: f.registry,
    capability: f.capability, repair: true, clock: () => 1600, ...options });
}

const replayBinding = f => ({ runId: f.input.runId, contextDigest: f.input.contextDigest,
  schemaBundleDigest: f.input.schemaBundleDigest, policyVersion: 'p4-shadow-v1' });

async function recoverReplayAuthority(f, options = {}) {
  return recoverOfflineReplayAuthority({ rootDirectory: f.root,
    approvalHarness: f.coordinator.approvalHarness, capabilityRegistry: f.registry,
    capability: f.capability, replayBinding: replayBinding(f), repair: true,
    clock: () => 1600, ...options });
}

test('real P5-B recovery classifies all four authority windows without inventing rollback state', async t => {
  const untouched = await fixture(t);
  assert.equal((await recover(untouched, `op-${'0'.repeat(32)}`)).status, 'NOT_STARTED');

  let armed = true;
  const prepared = await fixture(t, { faults: { afterIntentCommit() {
    if (armed) { armed = false; throw Object.assign(new Error('prepared'), { code: 'TEST_FAULT' }); }
  } } });
  const preparedId = `op-${'1'.repeat(32)}`;
  await assert.rejects(prepared.coordinator.execute(request(prepared, preparedId)),
    error => error.code === 'TEST_FAULT');
  assert.equal((await recover(prepared, preparedId)).status, 'PREPARED');

  armed = true;
  const consumed = await fixture(t, { faults: { afterConsumptionCommitted() {
    if (armed) { armed = false; throw Object.assign(new Error('consumed'), { code: 'TEST_FAULT' }); }
  } } });
  const consumedId = offlineReplayOperationId(replayBinding(consumed));
  await assert.rejects(consumed.coordinator.execute(request(consumed, consumedId)),
    error => error.code === 'TEST_FAULT');
  assert.equal((await recover(consumed, consumedId)).status, 'RECONCILIATION_REQUIRED');
  await assert.rejects(recoverReplayAuthority(consumed),
    error => error.code === 'RECONCILIATION_REQUIRED');

  const committed = await fixture(t);
  const committedId = `op-${'3'.repeat(32)}`;
  await committed.coordinator.execute(request(committed, committedId));
  assert.equal((await recover(committed, committedId)).status, 'COMMITTED');
});

test('replay recovery authority rejects prepared work and cross-run transaction reuse', async t => {
  let armed = true;
  const prepared = await fixture(t, { faults: { afterIntentCommit() {
    if (armed) { armed = false; throw Object.assign(new Error('prepared'), { code: 'TEST_FAULT' }); }
  } } });
  const preparedId = offlineReplayOperationId(replayBinding(prepared));
  await assert.rejects(prepared.coordinator.execute(request(prepared, preparedId)),
    error => error.code === 'TEST_FAULT');
  await assert.rejects(recoverReplayAuthority(prepared), error => error.code === 'TRANSACTION_PENDING');

  const crossRun = await fixture(t);
  const claimed = { ...replayBinding(crossRun), runId: 'different-run' };
  const crossRunId = offlineReplayOperationId(claimed);
  await crossRun.coordinator.execute(request(crossRun, crossRunId));
  await assert.rejects(recoverOfflineReplayAuthority({ rootDirectory: crossRun.root,
    approvalHarness: crossRun.coordinator.approvalHarness, capabilityRegistry: crossRun.registry,
    capability: crossRun.capability, replayBinding: claimed, repair: true, clock: () => 1600 }),
  error => error.code === 'TRANSACTION_AUTHORITY_MISMATCH');
});

test('a committed V2 binding is immutable and cannot fall back to a legacy writer', async t => {
  const f = await fixture(t);
  const operationId = `op-${'4'.repeat(32)}`;
  await f.coordinator.execute(request(f, operationId));
  const recovered = await recover(f, operationId);
  assert.equal(recovered.status, 'COMMITTED');
  const gates = createStageFeatureGateStore();
  gates.bind({ runId: f.input.runId, canonicalStageId: 'keyword-research',
    contextDigest: f.input.contextDigest, featureGate: 'v2' });
  assert.throws(() => gates.bind({ runId: f.input.runId, canonicalStageId: 'keyword-research',
    contextDigest: f.input.contextDigest, featureGate: 'legacy' }),
  error => error.code === 'STAGE_GATE_BINDING_IMMUTABLE');
});

test('recovery rebuilds the derived projection from committed authority', async t => {
  const f = await fixture(t);
  const operationId = `op-${'5'.repeat(32)}`;
  await f.coordinator.execute(request(f, operationId));
  const projectionPath = join(f.root, 'transactions', operationId, 'projection.json');
  await rm(projectionPath, { force: true });
  const recovered = await recover(f, operationId);
  assert.equal(recovered.status, 'COMMITTED');
  const projection = JSON.parse(await readFile(projectionPath, 'utf8'));
  assert.deepEqual(projection, { operationId, status: 'COMMITTED', outcomeDigest: recovered.outcomeDigest });
});

test('schema, context, mapping and policy drift all stop recovery', async t => {
  for (const field of ['contextDigest', 'schemaBundleDigest', 'mappingVersion', 'policyVersion']) {
    const f = await fixture(t);
    const operationId = `op-${digest(`p5-h:${field}`).slice(0, 32)}`;
    await f.coordinator.execute(request(f, operationId));
    const currentBinding = { contextDigest: f.input.contextDigest,
      schemaBundleDigest: f.input.schemaBundleDigest, mappingVersion: 'stage-identity-v1',
      policyVersion: 'p4-shadow-v1', [field]: field.endsWith('Digest') ? digest(`changed:${field}`) : `changed:${field}` };
    await assert.rejects(recover(f, operationId, { currentBinding }),
      error => error.code === 'TRANSACTION_CONTEXT_STALE', field);
  }
});

test('tampered transaction intent and committed outcome fail closed', async t => {
  for (const [relative, mutate] of [
    ['intent.json', value => { value.runId = 'tampered'; }],
    ['outcomes/committed.json', value => { value.commitDigest = digest('tampered'); }],
  ]) {
    const f = await fixture(t);
    const operationId = `op-${digest(`p5-h:${relative}`).slice(0, 32)}`;
    await f.coordinator.execute(request(f, operationId));
    const path = join(f.root, 'transactions', operationId, relative);
    const value = JSON.parse(await readFile(path, 'utf8'));
    mutate(value);
    await chmod(path, 0o600);
    await writeFile(path, `${JSON.stringify(value)}\n`);
    await assert.rejects(recover(f, operationId), error => error.code === 'TRANSACTION_AUTHORITY_CORRUPT');
  }
});
