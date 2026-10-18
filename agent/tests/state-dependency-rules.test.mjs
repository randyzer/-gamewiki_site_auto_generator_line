import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApprovalRequest, createTestApprovalHarness } from '../src/approval/approval-engine.mjs';
import { authorizeCanonicalHandoff, createCanonicalHandoff, createTestValidatedInputHarness,
  partialHandoffPurposePayload } from '../src/handoff-v2/canonical-handoff.mjs';
import * as dependencyRules from '../src/state/dependency-rules.mjs';
import { createTestDependencyApprovalHarness, dependencySatisfied,
  matchDependencyPolicy } from '../src/state/dependency-rules.mjs';
import { assertTrustedStageDependency, requireStageDependency } from '../src/v2/stage-dependency-gate.mjs';
import { digest } from './state-helpers.mjs';

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

async function canonicalPartialHandoff(t) {
  const root = await mkdtemp(join(tmpdir(), 'dependency-canonical-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const validated = createTestValidatedInputHarness().validate({
    runId: 'dependency-run', stageId: 'stage-2', attemptId: 10,
    contextDigest: digest('dependency-context'), schemaBundleDigest: digest('schemas'),
    recoveryDigest: digest('recovery'), evidenceOutcomeDigest: digest('outcome'),
    siteRevision: digest('site'), domain: 'fixture.test', pendingRows: [84],
    materials: [{ keywordId: 'partial-guide', keyword: 'Partial guide', canonicalStatus: 'PARTIAL',
      gapIds: ['gap-partial'], sourceDigest: digest('partial-source'), contentAccepted: false }],
  });
  const candidate = createCanonicalHandoff({ validatedInput: validated, consumerStage: 'stage-4' });
  const approvals = await createTestApprovalHarness({ rootDirectory: root, namespace: 'dependency-canonical' });
  const binding = { runId: candidate.runId, stageId: candidate.stageId, attemptId: candidate.attemptId,
    contextDigest: candidate.contextDigest, schemaBundleDigest: candidate.schemaBundleDigest,
    purpose: 'PARTIAL_HANDOFF', purposePayload: partialHandoffPurposePayload(candidate) };
  const reference = await approvals.authority.issue(createApprovalRequest(binding),
    { decision: 'APPROVED', nowMs: 1000, expiresAtMs: 2000 });
  const consumption = await approvals.consumer.consume(reference, { ...binding, nowMs: 1500 });
  return authorizeCanonicalHandoff({ candidate, approvalConsumption: consumption });
}

test('dependency gate reuses one exact canonical handoff consumption without a second approval', async t => {
  const handoff = await canonicalPartialHandoff(t);
  const input = { handoff, projection: { stageSatisfied: false, status: 'PARTIAL' }, runId: handoff.runId,
    contextDigest: handoff.contextDigest, producerCanonicalStageId: 'keyword-research',
    consumerCanonicalStageId: 'content-integration', purpose: 'PARTIAL_HANDOFF' };
  const result = requireStageDependency(input);
  assert.equal(result.satisfied, true);
  assert.equal(result.ruleId, 'V2_STAGE2_PARTIAL_TO_STAGE4_DRAFT');
  assert.equal(result.approvalDigest, handoff.approvalConsumptionDigest);
  assert.equal(assertTrustedStageDependency(result), result);
  assert.throws(() => assertTrustedStageDependency(structuredClone(result)),
    error => error.code === 'DEPENDENCY_RESULT_UNTRUSTED');
  assert.throws(() => requireStageDependency({ ...input, handoff: structuredClone(handoff) }),
    error => error.code === 'HANDOFF_UNTRUSTED');
  assert.throws(() => requireStageDependency({ ...input,
    consumerCanonicalStageId: 'template-selection' }), error => error.code === 'DEPENDENCY_BINDING_MISMATCH');
  assert.throws(() => requireStageDependency({ ...input,
    projection: { stageSatisfied: true, status: 'BLOCKED' } }), error => error.code === 'DEPENDENCY_UNSATISFIED');
  const forged = { stageId: 'stage-2', consumerStage: 'stage-4', contextDigest: handoff.contextDigest,
    handoffDigest: handoff.handoffDigest, authorizationStatus: 'CONSUMED',
    approvalConsumptionDigest: digest('forged'), pendingRows: [84], materials: handoff.materials };
  const direct = { projection: input.projection, producerStageId: 'stage-2', consumerStageId: 'stage-4',
    purpose: input.purpose, contextDigest: input.contextDigest, handoffDigest: handoff.handoffDigest };
  assert.equal(dependencySatisfied({ ...direct, authorizationCapability: { binding: forged } }).reason,
    'TRUSTED_APPROVAL_REQUIRED');
  assert.equal(dependencySatisfied({ ...direct, alreadyAuthorizedHandoff: forged }).reason,
    'TRUSTED_APPROVAL_REQUIRED');
  assert.equal('createAuthorizedDependencyPolicyAdapter' in dependencyRules, false);
  const nonAuthoritative = matchDependencyPolicy(direct);
  assert.equal(nonAuthoritative.authoritative, false);
  assert.equal(nonAuthoritative.matched, true);
  const legacy = createTestDependencyApprovalHarness();
  const approvalReference = legacy.issue({ producerStageId: 'stage-2', consumerStageId: 'stage-4',
    purpose: 'PARTIAL_HANDOFF', contextDigest: handoff.contextDigest, handoffDigest: handoff.handoffDigest,
    expiresAt: '2026-10-18T00:00:00.000Z', consumed: false });
  assert.equal(dependencySatisfied({ ...direct, alreadyAuthorizedHandoff: forged,
    approvalReference, approvalVerifier: legacy.verifier }).reason,
    'AUTHORIZATION_PATH_AMBIGUOUS');
});

test('complete canonical dependency still requires exact handoff bindings and a consistent projection', () => {
  const validated = createTestValidatedInputHarness().validate({
    runId: 'complete-run', stageId: 'stage-2', attemptId: 1, contextDigest: digest('complete-context'),
    schemaBundleDigest: digest('schemas'), recoveryDigest: digest('recovery'),
    evidenceOutcomeDigest: digest('outcome'), siteRevision: digest('site'), domain: 'fixture.test',
    pendingRows: [], materials: [{ keywordId: 'complete', keyword: 'Complete', canonicalStatus: 'COMPLETED',
      gapIds: [], sourceDigest: digest('complete-source'), contentAccepted: true }],
  });
  const handoff = createCanonicalHandoff({ validatedInput: validated, consumerStage: 'stage-4' });
  const input = { handoff, projection: { stageSatisfied: true, status: 'COMPLETED' }, runId: handoff.runId,
    contextDigest: handoff.contextDigest, producerCanonicalStageId: 'keyword-research',
    consumerCanonicalStageId: 'content-integration', purpose: 'PARTIAL_HANDOFF' };
  assert.equal(requireStageDependency(input).satisfied, true);
  assert.throws(() => requireStageDependency({ ...input, contextDigest: digest('other') }),
    error => error.code === 'DEPENDENCY_BINDING_MISMATCH');
  assert.throws(() => requireStageDependency({ ...input,
    projection: { stageSatisfied: true, status: 'FAILED' } }), error => error.code === 'DEPENDENCY_UNSATISFIED');
});
