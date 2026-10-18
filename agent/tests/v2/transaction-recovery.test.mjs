import test from 'node:test';
import assert from 'node:assert/strict';
import { chmod, mkdtemp, readFile, rm, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { createApprovalRequest, createTestApprovalHarness } from '../../src/approval/approval-engine.mjs';
import { assertTrustedApprovalConsumption } from '../../src/approval/approval-engine.mjs';
import { createTestHostCapabilityRegistry } from '../../src/v2/host/capability-registry.mjs';
import { createOfflineTransactionCoordinator } from '../../src/v2/transaction-coordinator.mjs';
import { recoverOfflineTransaction } from '../../src/v2/migration-recovery.mjs';
import { candidateInput, digest } from '../state-helpers.mjs';

const operationId = `op-${'c'.repeat(32)}`;
const purposePayload = { producerStage: 'keyword-research', consumerStage: 'template-selection',
  handoffDigest: digest('handoff'), recoveryDigest: digest('recovery') };

async function fixture(t, { faults = {}, clock = () => 1500,
  policyVersionProvider = () => 'p4-shadow-v1' } = {}) {
  const root = await mkdtemp(join(tmpdir(), 'p5b-transaction-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const input = await candidateInput(root, { runId: 'run-v2', stageId: 'keyword-research', attemptId: 1 });
  const approvalExpected = { runId: input.runId, stageId: input.stageId, attemptId: input.attemptId,
    contextDigest: input.contextDigest, schemaBundleDigest: input.schemaBundleDigest,
    purpose: 'PARTIAL_HANDOFF', purposePayload };
  const harness = await createTestApprovalHarness({ rootDirectory: root, namespace: 'p5b',
    clock, policyVersionProvider });
  const reference = await harness.authority.issue(createApprovalRequest(approvalExpected),
    { decision: 'APPROVED', nowMs: 1000, expiresAtMs: 3000 });
  const registry = createTestHostCapabilityRegistry();
  const capability = registry.issue({ capability: 'OFFLINE_TRANSACTION', mode: 'SIMULATED', rootDirectory: root });
  const coordinator = createOfflineTransactionCoordinator({ rootDirectory: root, namespace: 'p5b',
    approvalHarness: harness, capabilityRegistry: registry, capability, clock, faults });
  return { root, input, approvalExpected, reference, registry, capability, coordinator };
}

const runChild = path => new Promise((resolve, reject) => {
  const child = spawn(process.execPath, [new URL('../fixtures/v2-transaction-child.mjs', import.meta.url).pathname, path]);
  let stdout = ''; child.stdout.on('data', chunk => { stdout += chunk; }); child.on('error', reject);
  child.on('exit', () => resolve(JSON.parse(stdout)));
});

test('coordinator consumes once, commits once and replays the same operation idempotently', async t => {
  const f = await fixture(t);
  const request = { operationId, canonicalStageId: 'keyword-research', candidateInput: f.input,
    approvalReference: f.reference, approvalExpected: f.approvalExpected };
  const first = await f.coordinator.execute(request);
  const second = await f.coordinator.execute(request);
  assert.equal(first.status, 'COMMITTED');
  assert.equal(second.outcomeDigest, first.outcomeDigest);
  assert.equal(first.operationId, operationId);
  assert.equal(first.commitDigest, second.commitDigest);
});

test('consumption survives a stage failure and recovery requires reconciliation without reviving approval', async t => {
  let fail = true;
  const f = await fixture(t, { faults: { afterConsumptionCommitted() {
    if (fail) { fail = false; throw Object.assign(new Error('crash'), { code: 'TEST_FAULT' }); }
  } } });
  const request = { operationId, canonicalStageId: 'keyword-research', candidateInput: f.input,
    approvalReference: f.reference, approvalExpected: f.approvalExpected };
  await assert.rejects(f.coordinator.execute(request), error => error.code === 'TEST_FAULT');
  const recovered = await recoverOfflineTransaction({ rootDirectory: f.root, namespace: 'p5b',
    operationId, approvalHarness: f.coordinator.approvalHarness, capabilityRegistry: f.registry,
    capability: f.capability, repair: true });
  assert.equal(recovered.status, 'RECONCILIATION_REQUIRED');
  const completed = await f.coordinator.execute(request);
  assert.equal(completed.status, 'COMMITTED');
});

test('same operation with a different candidate fails deterministically', async t => {
  const f = await fixture(t);
  const request = { operationId, canonicalStageId: 'keyword-research', candidateInput: f.input,
    approvalReference: f.reference, approvalExpected: f.approvalExpected };
  await f.coordinator.execute(request);
  const changed = await candidateInput(f.root, { runId: 'run-v2', stageId: 'keyword-research', attemptId: 1,
    nextAction: 'DIFFERENT_ACTION' });
  await assert.rejects(f.coordinator.execute({ ...request, candidateInput: changed }),
    error => error.code === 'TRANSACTION_IDEMPOTENCY_CONFLICT');
});

test('all transaction crash windows recover from authority instead of projections', async t => {
  const cases = [
    ['beforeIntentCommit', 'NOT_STARTED'],
    ['afterIntentCommit', 'PREPARED'],
    ['beforeConsumptionCommit', 'PREPARED'],
    ['afterConsumptionCommitted', 'RECONCILIATION_REQUIRED'],
    ['afterObjectsPublished', 'RECONCILIATION_REQUIRED'],
    ['beforeCommitPoint', 'RECONCILIATION_REQUIRED'],
    ['afterCommitPoint', 'COMMITTED'],
    ['afterStageCommit', 'COMMITTED'],
    ['afterOutcomeCommitted', 'COMMITTED'],
  ];
  for (const [point, expected] of cases) {
    let armed = true;
    const f = await fixture(t, { faults: { [point]() {
      if (armed) { armed = false; throw Object.assign(new Error(point), { code: 'TEST_FAULT' }); }
    } } });
    const op = `op-${digest(point).slice(0, 32)}`;
    await assert.rejects(f.coordinator.execute({ operationId: op, canonicalStageId: 'keyword-research',
      candidateInput: f.input, approvalReference: f.reference, approvalExpected: f.approvalExpected }),
    error => error.code === 'TEST_FAULT');
    const recovered = await recoverOfflineTransaction({ rootDirectory: f.root, namespace: 'p5b',
      operationId: op, approvalHarness: f.coordinator.approvalHarness,
      capabilityRegistry: f.registry, capability: f.capability, repair: true });
    assert.equal(recovered.status, expected, point);
  }
});

test('two processes replay one operation once and two operations cannot consume one approval', async t => {
  const first = await fixture(t);
  const samePath = join(first.root, 'same-operation.json');
  const request = { operationId, canonicalStageId: 'keyword-research', candidateInput: first.input,
    approvalReference: first.reference, approvalExpected: first.approvalExpected };
  await writeFile(samePath, JSON.stringify({ rootDirectory: first.root, namespace: 'p5b', request }));
  const same = await Promise.all([runChild(samePath), runChild(samePath)]);
  assert.deepEqual(same.map(item => item.ok), [true, true]);
  assert.equal(same[0].commitDigest, same[1].commitDigest);

  const second = await fixture(t);
  const left = join(second.root, 'left.json'); const right = join(second.root, 'right.json');
  const common = { canonicalStageId: 'keyword-research', candidateInput: second.input,
    approvalReference: second.reference, approvalExpected: second.approvalExpected };
  await writeFile(left, JSON.stringify({ rootDirectory: second.root, namespace: 'p5b',
    request: { ...common, operationId: `op-${'d'.repeat(32)}` } }));
  await writeFile(right, JSON.stringify({ rootDirectory: second.root, namespace: 'p5b',
    request: { ...common, operationId: `op-${'e'.repeat(32)}` } }));
  const competing = await Promise.all([runChild(left), runChild(right)]);
  assert.equal(competing.filter(item => item.ok).length, 1);
  assert.equal(competing.find(item => !item.ok).code, 'APPROVAL_ALREADY_CONSUMED');
});

test('restart re-verifies consumption from the anchored log and never trusts parsed JSON', async t => {
  const f = await fixture(t);
  await f.coordinator.execute({ operationId, canonicalStageId: 'keyword-research', candidateInput: f.input,
    approvalReference: f.reference, approvalExpected: f.approvalExpected });
  const consumptionPath = join(f.root, 'approval/p5b/consumptions/000000000001.json');
  const parsed = JSON.parse(await readFile(consumptionPath));
  assert.throws(() => assertTrustedApprovalConsumption(parsed), error => error.code === 'APPROVAL_CONSUMPTION_UNTRUSTED');
  const restarted = await createTestApprovalHarness({ rootDirectory: f.root, namespace: 'p5b' });
  const recovered = await restarted.consumer.recoverOperationConsumption({ operationId,
    approvalId: parsed.approvalId, intentDigest: parsed.intentDigest,
    contextDigest: parsed.contextDigest, purposeDigest: parsed.purposeDigest,
    consumptionDigest: parsed.consumptionDigest });
  assert.equal(assertTrustedApprovalConsumption(recovered).consumptionDigest, parsed.consumptionDigest);
});

test('tampering any authority layer fails closed', async t => {
  const targets = [
    ['intent.json', value => { value.runId = 'tampered'; }],
    ['approval/p5b/consumptions/000000000001.json', value => { value.contextDigest = digest('tampered'); }],
    ['stage/commit.json', value => { value.candidateDigest = digest('tampered'); }],
    ['outcomes/committed.json', value => { value.commitDigest = digest('tampered'); }],
  ];
  for (const [relative, mutate] of targets) {
    const f = await fixture(t);
    const op = `op-${digest(relative).slice(0, 32)}`;
    await f.coordinator.execute({ operationId: op, canonicalStageId: 'keyword-research', candidateInput: f.input,
      approvalReference: f.reference, approvalExpected: f.approvalExpected });
    const path = relative.startsWith('approval/') ? join(f.root, relative) :
      join(f.root, 'transactions', op, relative);
    const value = JSON.parse(await readFile(path)); mutate(value); await chmod(path, 0o600);
    await writeFile(path, `${JSON.stringify(value)}\n`);
    await assert.rejects(recoverOfflineTransaction({ rootDirectory: f.root, namespace: 'p5b',
      operationId: op, approvalHarness: f.coordinator.approvalHarness,
      capabilityRegistry: f.registry, capability: f.capability, repair: true }),
    error => ['TRANSACTION_AUTHORITY_CORRUPT', 'APPROVAL_CONSUMPTION_CORRUPT'].includes(error.code), relative);
  }
});

test('recovery rejects context, schema, mapping and policy drift', async t => {
  const fields = ['contextDigest', 'schemaBundleDigest', 'mappingVersion', 'policyVersion'];
  for (const field of fields) {
    const f = await fixture(t);
    const op = `op-${digest(`drift:${field}`).slice(0, 32)}`;
    await f.coordinator.execute({ operationId: op, canonicalStageId: 'keyword-research', candidateInput: f.input,
      approvalReference: f.reference, approvalExpected: f.approvalExpected });
    const currentBinding = { contextDigest: f.input.contextDigest,
      schemaBundleDigest: f.input.schemaBundleDigest, mappingVersion: 'stage-identity-v1',
      policyVersion: 'p4-shadow-v1', [field]: field.endsWith('Digest') ? digest(`changed:${field}`) : `changed:${field}` };
    await assert.rejects(recoverOfflineTransaction({ rootDirectory: f.root, namespace: 'p5b',
      operationId: op, approvalHarness: f.coordinator.approvalHarness,
      capabilityRegistry: f.registry, capability: f.capability, repair: true, currentBinding }),
    error => error.code === 'TRANSACTION_CONTEXT_STALE', field);
  }
});

test('authority deletion is either rebuilt from a stronger fact or rejected', async t => {
  const cases = [
    ['intent.json', 'CORRUPT'],
    ['stage/commit.json', 'CORRUPT'],
    ['outcomes/committed.json', 'COMMITTED'],
    ['projection.json', 'COMMITTED'],
    ['approval/p5b/consumptions/000000000001.json', 'CORRUPT'],
  ];
  for (const [relative, expected] of cases) {
    const f = await fixture(t);
    const op = `op-${digest(`delete:${relative}`).slice(0, 32)}`;
    await f.coordinator.execute({ operationId: op, canonicalStageId: 'keyword-research', candidateInput: f.input,
      approvalReference: f.reference, approvalExpected: f.approvalExpected });
    const path = relative.startsWith('approval/') ? join(f.root, relative) : join(f.root, 'transactions', op, relative);
    await unlink(path);
    const recovery = recoverOfflineTransaction({ rootDirectory: f.root, namespace: 'p5b', operationId: op,
      approvalHarness: f.coordinator.approvalHarness, capabilityRegistry: f.registry,
      capability: f.capability, repair: true });
    if (expected === 'CORRUPT') await assert.rejects(recovery);
    else assert.equal((await recovery).status, expected);
  }
});

test('committed replay ignores later expiry while incomplete work still requires current approval', async t => {
  let now = 1500;
  const committed = await fixture(t, { clock: () => now });
  const request = { operationId, canonicalStageId: 'keyword-research', candidateInput: committed.input,
    approvalReference: committed.reference, approvalExpected: committed.approvalExpected };
  const first = await committed.coordinator.execute(request); now = 4000;
  const replay = await committed.coordinator.execute(request);
  assert.equal(replay.commitDigest, first.commitDigest);

  now = 1500; let armed = true;
  const incomplete = await fixture(t, { clock: () => now, faults: { afterIntentCommit() {
    if (armed) { armed = false; throw Object.assign(new Error('stop'), { code: 'TEST_FAULT' }); }
  } } });
  const pending = { operationId: `op-${'f'.repeat(32)}`, canonicalStageId: 'keyword-research',
    candidateInput: incomplete.input, approvalReference: incomplete.reference,
    approvalExpected: incomplete.approvalExpected };
  await assert.rejects(incomplete.coordinator.execute(pending), error => error.code === 'TEST_FAULT');
  now = 4000;
  await assert.rejects(incomplete.coordinator.execute(pending), error => error.code === 'APPROVAL_EXPIRED');
});

test('committed replay needs authoritative stored objects, not the deleted staging directory', async t => {
  const f = await fixture(t);
  const request = { operationId, canonicalStageId: 'keyword-research', candidateInput: f.input,
    approvalReference: f.reference, approvalExpected: f.approvalExpected };
  const first = await f.coordinator.execute(request);
  await rm(f.input.stagingRoot, { recursive: true, force: true });
  const replay = await f.coordinator.execute(request);
  assert.equal(replay.commitDigest, first.commitDigest);
});

test('committed replay ignores current policy drift while incomplete work fails closed', async t => {
  let policy = 'p4-shadow-v1';
  const committed = await fixture(t, { policyVersionProvider: () => policy });
  const request = { operationId, canonicalStageId: 'keyword-research', candidateInput: committed.input,
    approvalReference: committed.reference, approvalExpected: committed.approvalExpected };
  const first = await committed.coordinator.execute(request); policy = 'p4-shadow-v2';
  assert.equal((await committed.coordinator.execute(request)).commitDigest, first.commitDigest);

  policy = 'p4-shadow-v1'; let armed = true;
  const incomplete = await fixture(t, { policyVersionProvider: () => policy, faults: { afterIntentCommit() {
    if (armed) { armed = false; throw Object.assign(new Error('stop'), { code: 'TEST_FAULT' }); }
  } } });
  const pending = { operationId: `op-${'1'.repeat(32)}`, canonicalStageId: 'keyword-research',
    candidateInput: incomplete.input, approvalReference: incomplete.reference,
    approvalExpected: incomplete.approvalExpected };
  await assert.rejects(incomplete.coordinator.execute(pending), error => error.code === 'TEST_FAULT');
  policy = 'p4-shadow-v2';
  await assert.rejects(incomplete.coordinator.execute(pending), error => error.code === 'APPROVAL_POLICY_MISMATCH');
});

test('contradictory Outcome combinations fail closed', async t => {
  const f = await fixture(t);
  const request = { operationId, canonicalStageId: 'keyword-research', candidateInput: f.input,
    approvalReference: f.reference, approvalExpected: f.approvalExpected };
  await f.coordinator.execute(request);
  const intent = JSON.parse(await readFile(join(f.root, 'transactions', operationId, 'intent.json')));
  const { publishTransactionOutcome } = await import('../../src/v2/transaction-coordinator.mjs');
  await publishTransactionOutcome({ rootDirectory: f.root, operationId,
    status: 'ABORTED_BEFORE_CONSUMPTION', intentDigest: intent.intentDigest, recordedAtMs: 1600,
    capabilityRegistry: f.registry, capability: f.capability });
  await assert.rejects(recoverOfflineTransaction({ rootDirectory: f.root, namespace: 'p5b', operationId,
    approvalHarness: f.coordinator.approvalHarness, capabilityRegistry: f.registry,
    capability: f.capability, repair: true }), error => error.code === 'TRANSACTION_AUTHORITY_CORRUPT');
});
