import test from 'node:test';
import assert from 'node:assert/strict';
import { createTestDependencyApprovalHarness, dependencySatisfied } from '../src/state/dependency-rules.mjs';

const base = { producerStageId: 'stage-2', consumerStageId: 'stage-3', purpose: 'PARTIAL_HANDOFF',
  contextDigest: 'a'.repeat(64), handoffDigest: 'b'.repeat(64), now: '2026-10-17T00:00:00.000Z' };
const approval = { producerStageId: 'stage-2', consumerStageId: 'stage-3', purpose: 'PARTIAL_HANDOFF',
  contextDigest: 'a'.repeat(64), handoffDigest: 'b'.repeat(64), expiresAt: '2026-10-18T00:00:00.000Z', consumed: false };

test('dependency gate accepts complete results or one exactly bound partial handoff', () => {
  assert.equal(dependencySatisfied({ ...base, projection: { stageSatisfied: true, status: 'PASSED' } }).satisfied, true);
  const harness = createTestDependencyApprovalHarness(); const approvalReference = harness.issue(approval);
  const result = dependencySatisfied({ ...base, projection: { stageSatisfied: false, status: 'PARTIAL' },
    approvalReference, approvalVerifier: harness.verifier });
  assert.equal(result.satisfied, true); assert.equal(result.ruleId, 'V2_STAGE2_PARTIAL_TO_STAGE3');
  assert.equal(result.approvalDigest, approvalReference.approvalDigest);
});

test('dependency gate fails closed for purpose, consumer, context, digest, expiry and consumption', () => {
  const projection = { stageSatisfied: false, status: 'PARTIAL' };
  const harness = createTestDependencyApprovalHarness();
  for (const changed of [
    { purpose: 'RUN_EXECUTION' }, { consumerStageId: 'stage-4' }, { contextDigest: 'c'.repeat(64) },
    { handoffDigest: 'd'.repeat(64) }, { expiresAt: '2026-10-16T00:00:00.000Z' }, { consumed: true },
  ]) {
    const approvalReference = harness.issue({ ...approval, ...changed });
    assert.equal(dependencySatisfied({ ...base, projection, approvalReference,
      approvalVerifier: harness.verifier }).satisfied, false);
  }
  assert.equal(dependencySatisfied({ ...base, projection,
    approvalReference: { approvalId: 'fake', approvalDigest: 'f'.repeat(64) },
    approvalVerifier: { verify: () => approval } }).satisfied, false);
  const other = { ...base, producerStageId: 'stage-1' };
  const otherReference = harness.issue({ ...approval, producerStageId: 'stage-1' });
  assert.equal(dependencySatisfied({ ...other, projection, approvalReference: otherReference,
    approvalVerifier: harness.verifier }).satisfied, false);
  const unknown = { ...base, consumerStageId: 'stage-7' };
  const unknownReference = harness.issue({ ...approval, consumerStageId: 'stage-7' });
  assert.equal(dependencySatisfied({ ...unknown, projection, approvalReference: unknownReference,
    approvalVerifier: harness.verifier }).satisfied, false);
});
