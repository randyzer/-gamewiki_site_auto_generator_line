import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { createApprovalRequest, createProductionApprovalVerifier,
  createTestApprovalHarness } from '../src/approval/approval-engine.mjs';
import { createApprovalStore } from '../src/approval/approval-store.mjs';
import { approvalInvalidationReport } from '../src/approval/approval-invalidation.mjs';
import { digest } from './state-helpers.mjs';

const binding = { runId: 'run-p4', stageId: 'stage-2', attemptId: 10,
  contextDigest: digest('context'), schemaBundleDigest: digest('schemas'),
  purpose: 'PARTIAL_HANDOFF', purposePayload: { producerStage: 'stage-2',
    consumerStage: 'stage-3', handoffDigest: digest('handoff'), recoveryDigest: digest('recovery') } };

test('only the private simulated authority can issue a trusted approval', async t => {
  const root = await mkdtemp(join(tmpdir(), 'p4-approval-')); t.after(() => rm(root, { recursive: true, force: true }));
  const request = createApprovalRequest(binding);
  const harness = await createTestApprovalHarness({ rootDirectory: root, namespace: 'p4-tests' });
  const publicStore = createApprovalStore({ rootDirectory: root, namespace: 'p4-tests', mode: 'SIMULATED' });
  assert.equal(Object.hasOwn(publicStore, 'publish'), false);
  await assert.rejects(async () => publicStore.publish({}), TypeError);
  const reference = await harness.authority.issue(request, { decision: 'APPROVED', nowMs: 1000, expiresAtMs: 2000 });
  const verified = await harness.verifier.verify(reference, { ...binding, nowMs: 1500 });
  assert.equal(verified.mode, 'SIMULATED');
  await assert.rejects(createProductionApprovalVerifier({ rootDirectory: root }).verify(reference,
    { ...binding, nowMs: 1500 }), error => error.code === 'APPROVAL_MODE_MISMATCH');
  await assert.rejects(harness.verifier.verify({ ...reference, recordDigest: digest('fake') },
    { ...binding, nowMs: 1500 }));
  await assert.rejects(createTestApprovalHarness({ rootDirectory: root, namespace: '../escape' }),
    error => error.code === 'APPROVAL_NAMESPACE_INVALID');
});

test('approval consumption is atomic, single-use and remains consumed after restart', async t => {
  const root = await mkdtemp(join(tmpdir(), 'p4-consume-')); t.after(() => rm(root, { recursive: true, force: true }));
  const request = createApprovalRequest(binding);
  const first = await createTestApprovalHarness({ rootDirectory: root, namespace: 'p4-tests' });
  const reference = await first.authority.issue(request, { decision: 'APPROVED', nowMs: 1000, expiresAtMs: 3000 });
  const results = await Promise.allSettled([
    first.consumer.consume(reference, { ...binding, nowMs: 1500 }),
    first.consumer.consume(reference, { ...binding, nowMs: 1500 }),
  ]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  const restarted = await createTestApprovalHarness({ rootDirectory: root, namespace: 'p4-tests' });
  await assert.rejects(restarted.consumer.consume(reference, { ...binding, nowMs: 1600 }),
    error => error.code === 'APPROVAL_ALREADY_CONSUMED');
});

test('purpose, context, expiry and future issuance fail closed without consuming', async t => {
  const root = await mkdtemp(join(tmpdir(), 'p4-binding-')); t.after(() => rm(root, { recursive: true, force: true }));
  const harness = await createTestApprovalHarness({ rootDirectory: root, namespace: 'p4-tests' });
  const reference = await harness.authority.issue(createApprovalRequest(binding),
    { decision: 'APPROVED', nowMs: 1000, expiresAtMs: 2000 });
  await assert.rejects(harness.verifier.verify(reference, { ...binding, contextDigest: digest('other'), nowMs: 1500 }),
    error => error.code === 'APPROVAL_CONTEXT_MISMATCH');
  await assert.rejects(harness.verifier.verify(reference, { ...binding, purpose: 'SERVICE_RESUME', nowMs: 1500 }),
    error => error.code === 'APPROVAL_PURPOSE_MISMATCH');
  await assert.rejects(harness.verifier.verify(reference, { ...binding, nowMs: 3000 }),
    error => error.code === 'APPROVAL_EXPIRED');
  await assert.rejects(harness.verifier.verify(reference, { ...binding, nowMs: 500 }),
    error => error.code === 'APPROVAL_NOT_YET_VALID');
  const record = await harness.verifier.verify(reference, { ...binding, nowMs: 1500 });
  assert.deepEqual(approvalInvalidationReport(record, { ...binding,
    schemaBundleDigest: digest('changed-schema'), purpose: 'SERVICE_RESUME', nowMs: 3000 }), {
    invalidatedApprovalIds: [record.approvalId],
    reasonCodes: ['APPROVAL_CONTEXT_MISMATCH', 'APPROVAL_PURPOSE_MISMATCH', 'APPROVAL_EXPIRED'],
    affectedFields: ['schemaBundleDigest', 'purpose', 'expiresAtMs'],
    dependencyRuleIds: ['schema-version', 'purpose-kind', 'validity-window'],
  });
});

test('revocation is immutable, blocks verify and cannot overwrite consumption', async t => {
  const root = await mkdtemp(join(tmpdir(), 'p4-revoke-')); t.after(() => rm(root, { recursive: true, force: true }));
  const harness = await createTestApprovalHarness({ rootDirectory: root, namespace: 'revoke-test' });
  const revokedReference = await harness.authority.issue(createApprovalRequest(binding),
    { decision: 'APPROVED', nowMs: 1000, expiresAtMs: 3000 });
  await harness.authority.revoke(revokedReference, { nowMs: 1200, reasonCode: 'CONTEXT_WITHDRAWN' });
  await assert.rejects(harness.verifier.verify(revokedReference, { ...binding, nowMs: 1500 }),
    error => error.code === 'APPROVAL_REVOKED');
  await assert.rejects(harness.consumer.consume(revokedReference, { ...binding, nowMs: 1500 }),
    error => error.code === 'APPROVAL_REVOKED');
  await assert.rejects(harness.authority.revoke(revokedReference, { nowMs: 1300, reasonCode: 'SECOND' }),
    error => error.code === 'APPROVAL_ALREADY_REVOKED');

  const consumedReference = await harness.authority.issue(createApprovalRequest(binding),
    { decision: 'APPROVED', nowMs: 1000, expiresAtMs: 3000 });
  await harness.consumer.consume(consumedReference, { ...binding, nowMs: 1500 });
  await assert.rejects(harness.authority.revoke(consumedReference, { nowMs: 1600, reasonCode: 'TOO_LATE' }),
    error => error.code === 'APPROVAL_ALREADY_CONSUMED');
});

test('revocation and consumption race has one durable winner', async t => {
  const root = await mkdtemp(join(tmpdir(), 'p4-revoke-race-')); t.after(() => rm(root, { recursive: true, force: true }));
  const harness = await createTestApprovalHarness({ rootDirectory: root, namespace: 'revoke-race' });
  const reference = await harness.authority.issue(createApprovalRequest(binding),
    { decision: 'APPROVED', nowMs: 1000, expiresAtMs: 3000 });
  const results = await Promise.allSettled([
    harness.consumer.consume(reference, { ...binding, nowMs: 1500 }),
    harness.authority.revoke(reference, { nowMs: 1500, reasonCode: 'RACE' }),
  ]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  const rejected = results.find(result => result.status === 'rejected');
  assert.ok(['APPROVAL_REVOKED', 'APPROVAL_ALREADY_CONSUMED'].includes(rejected.reason.code));
  const restarted = await createTestApprovalHarness({ rootDirectory: root, namespace: 'revoke-race' });
  await assert.rejects(restarted.consumer.consume(reference, { ...binding, nowMs: 1600 }),
    error => ['APPROVAL_REVOKED', 'APPROVAL_ALREADY_CONSUMED'].includes(error.code));
});

const runChild = path => new Promise(resolve => {
  const child = spawn(process.execPath, ['agent/tests/fixtures/p4-approval-consume-child.mjs', path], {
    cwd: new URL('../..', import.meta.url), stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '', stderr = '';
  child.stdout.on('data', chunk => { stdout += chunk; });
  child.stderr.on('data', chunk => { stderr += chunk; });
  child.on('exit', code => resolve({ code, stdout, stderr }));
});

test('two independent processes cannot consume the same approval twice', async t => {
  const root = await mkdtemp(join(tmpdir(), 'p4-process-')); t.after(() => rm(root, { recursive: true, force: true }));
  const harness = await createTestApprovalHarness({ rootDirectory: root, namespace: 'cross-process' });
  const request = createApprovalRequest(binding);
  const reference = await harness.authority.issue(request, { decision: 'APPROVED', nowMs: 1000, expiresAtMs: 3000 });
  const inputPath = join(root, 'consume-input.json');
  await writeFile(inputPath, JSON.stringify({ rootDirectory: root, namespace: 'cross-process', reference,
    expected: { ...binding, nowMs: 1500 } }));
  const results = await Promise.all([runChild(inputPath), runChild(inputPath)]);
  assert.deepEqual(results.map(item => item.code).sort(), [0, 2], JSON.stringify(results));
});

test('consumption crashes have deterministic fail-closed boundaries', async t => {
  const beforeRoot = await mkdtemp(join(tmpdir(), 'p4-before-record-'));
  const recordRoot = await mkdtemp(join(tmpdir(), 'p4-after-record-'));
  const headRoot = await mkdtemp(join(tmpdir(), 'p4-after-head-'));
  t.after(() => Promise.all([beforeRoot, recordRoot, headRoot].map(root => rm(root, { recursive: true, force: true }))));

  async function issued(root, namespace, faults) {
    const harness = await createTestApprovalHarness({ rootDirectory: root, namespace, faults });
    const reference = await harness.authority.issue(createApprovalRequest(binding),
      { decision: 'APPROVED', nowMs: 1000, expiresAtMs: 3000 });
    return { harness, reference };
  }

  const before = await issued(beforeRoot, 'fault', { beforeRecordCommit: () => { throw Error('before record'); } });
  await assert.rejects(before.harness.consumer.consume(before.reference, { ...binding, nowMs: 1500 }), /before record/);
  const beforeRestart = await createTestApprovalHarness({ rootDirectory: beforeRoot, namespace: 'fault' });
  await beforeRestart.consumer.consume(before.reference, { ...binding, nowMs: 1600 });

  const afterRecord = await issued(recordRoot, 'fault', { afterRecordCommit: () => { throw Error('after record'); } });
  await assert.rejects(afterRecord.harness.consumer.consume(afterRecord.reference, { ...binding, nowMs: 1500 }), /after record/);
  const recordRestart = await createTestApprovalHarness({ rootDirectory: recordRoot, namespace: 'fault' });
  await assert.rejects(recordRestart.consumer.consume(afterRecord.reference, { ...binding, nowMs: 1600 }),
    error => error.code === 'APPROVAL_ALREADY_CONSUMED');

  const afterHead = await issued(headRoot, 'fault', { afterHeadCommit: () => { throw Error('after head'); } });
  await assert.rejects(afterHead.harness.consumer.consume(afterHead.reference, { ...binding, nowMs: 1500 }), /after head/);
  const headRestart = await createTestApprovalHarness({ rootDirectory: headRoot, namespace: 'fault' });
  await assert.rejects(headRestart.consumer.consume(afterHead.reference, { ...binding, nowMs: 1600 }),
    error => error.code === 'APPROVAL_ALREADY_CONSUMED');
});

test('approval is revalidated with trusted time after the consumption lock is acquired', async t => {
  const expiredRoot = await mkdtemp(join(tmpdir(), 'p4-lock-expired-'));
  const rollbackRoot = await mkdtemp(join(tmpdir(), 'p4-lock-rollback-'));
  t.after(() => Promise.all([expiredRoot, rollbackRoot].map(root => rm(root, { recursive: true, force: true }))));

  let expiredClock = 1500;
  const expired = await createTestApprovalHarness({ rootDirectory: expiredRoot, namespace: 'lock-time',
    clock: () => expiredClock, faults: { afterLockAcquired: () => { expiredClock = 3000; } } });
  const expiredReference = await expired.authority.issue(createApprovalRequest(binding),
    { decision: 'APPROVED', nowMs: 1000, expiresAtMs: 2000 });
  await assert.rejects(expired.consumer.consume(expiredReference, { ...binding, nowMs: 1500 }),
    error => error.code === 'APPROVAL_EXPIRED');
  const expiredRestart = await createTestApprovalHarness({ rootDirectory: expiredRoot, namespace: 'lock-time', clock: () => 1500 });
  await expiredRestart.consumer.consume(expiredReference, { ...binding, nowMs: 1500 });

  let rollbackClock = 1500;
  const rollback = await createTestApprovalHarness({ rootDirectory: rollbackRoot, namespace: 'lock-time',
    clock: () => rollbackClock, faults: { afterLockAcquired: () => { rollbackClock = 500; } } });
  const rollbackReference = await rollback.authority.issue(createApprovalRequest(binding),
    { decision: 'APPROVED', nowMs: 1000, expiresAtMs: 2000 });
  await assert.rejects(rollback.consumer.consume(rollbackReference, { ...binding, nowMs: 1500 }),
    error => error.code === 'APPROVAL_NOT_YET_VALID');
});

test('context and policy changes while waiting for the lock invalidate consumption', async t => {
  const contextRoot = await mkdtemp(join(tmpdir(), 'p4-lock-context-'));
  const policyRoot = await mkdtemp(join(tmpdir(), 'p4-lock-policy-'));
  t.after(() => Promise.all([contextRoot, policyRoot].map(root => rm(root, { recursive: true, force: true }))));

  let currentBinding = binding;
  const contextHarness = await createTestApprovalHarness({ rootDirectory: contextRoot, namespace: 'context-change',
    bindingProvider: () => currentBinding,
    faults: { afterLockAcquired: () => { currentBinding = { ...binding, contextDigest: digest('new-context') }; } } });
  const contextReference = await contextHarness.authority.issue(createApprovalRequest(binding),
    { decision: 'APPROVED', nowMs: 1000, expiresAtMs: 3000 });
  await assert.rejects(contextHarness.consumer.consume(contextReference, { ...binding, nowMs: 1500 }),
    error => error.code === 'APPROVAL_CONTEXT_MISMATCH');

  let policyVersion = 'p4-shadow-v1';
  const policyHarness = await createTestApprovalHarness({ rootDirectory: policyRoot, namespace: 'policy-change',
    policyVersionProvider: () => policyVersion,
    faults: { afterLockAcquired: () => { policyVersion = 'p4-shadow-v2'; } } });
  const policyReference = await policyHarness.authority.issue(createApprovalRequest(binding),
    { decision: 'APPROVED', nowMs: 1000, expiresAtMs: 3000 });
  await assert.rejects(policyHarness.consumer.consume(policyReference, { ...binding, nowMs: 1500 }),
    error => error.code === 'APPROVAL_POLICY_MISMATCH');
});

test('consumption chain deletion is detected instead of reopening approval', async t => {
  const root = await mkdtemp(join(tmpdir(), 'p4-delete-')); t.after(() => rm(root, { recursive: true, force: true }));
  const harness = await createTestApprovalHarness({ rootDirectory: root, namespace: 'delete-test' });
  const reference = await harness.authority.issue(createApprovalRequest(binding),
    { decision: 'APPROVED', nowMs: 1000, expiresAtMs: 3000 });
  await harness.consumer.consume(reference, { ...binding, nowMs: 1500 });
  await rm(join(root, 'approval/delete-test/consumptions/000000000001.json'));
  const restarted = await createTestApprovalHarness({ rootDirectory: root, namespace: 'delete-test' });
  await assert.rejects(restarted.consumer.consume(reference, { ...binding, nowMs: 1600 }),
    error => error.code === 'APPROVAL_CONSUMPTION_CORRUPT');
});

test('missing protected anchor and tail rollback are fail-closed', async t => {
  const anchorRoot = await mkdtemp(join(tmpdir(), 'p4-anchor-delete-'));
  const rollbackRoot = await mkdtemp(join(tmpdir(), 'p4-anchor-rollback-'));
  t.after(() => Promise.all([anchorRoot, rollbackRoot].map(root => rm(root, { recursive: true, force: true }))));

  const anchorHarness = await createTestApprovalHarness({ rootDirectory: anchorRoot, namespace: 'anchor-test' });
  const anchorReference = await anchorHarness.authority.issue(createApprovalRequest(binding),
    { decision: 'APPROVED', nowMs: 1000, expiresAtMs: 3000 });
  await anchorHarness.consumer.consume(anchorReference, { ...binding, nowMs: 1500 });
  await rm(join(anchorRoot, 'approval-trust/anchor-test/CONSUMPTION_ANCHOR'));
  const anchorRestart = await createTestApprovalHarness({ rootDirectory: anchorRoot, namespace: 'anchor-test' });
  await assert.rejects(anchorRestart.consumer.consume(anchorReference, { ...binding, nowMs: 1600 }),
    error => error.code === 'APPROVAL_CONSUMPTION_CORRUPT');

  const rollbackHarness = await createTestApprovalHarness({ rootDirectory: rollbackRoot, namespace: 'rollback-test' });
  const first = await rollbackHarness.authority.issue(createApprovalRequest(binding),
    { decision: 'APPROVED', nowMs: 1000, expiresAtMs: 3000 });
  const second = await rollbackHarness.authority.issue(createApprovalRequest({ ...binding, attemptId: 11 }),
    { decision: 'APPROVED', nowMs: 1000, expiresAtMs: 3000 });
  await rollbackHarness.consumer.consume(first, { ...binding, nowMs: 1500 });
  await rollbackHarness.consumer.consume(second, { ...binding, attemptId: 11, nowMs: 1500 });
  await rm(join(rollbackRoot, 'approval/rollback-test/consumptions/000000000002.json'));
  await rm(join(rollbackRoot, 'approval-trust/rollback-test/CONSUMPTION_ANCHOR'));
  const rollbackRestart = await createTestApprovalHarness({ rootDirectory: rollbackRoot, namespace: 'rollback-test' });
  await assert.rejects(rollbackRestart.consumer.consume(second, { ...binding, attemptId: 11, nowMs: 1600 }),
    error => error.code === 'APPROVAL_CONSUMPTION_CORRUPT');
});
