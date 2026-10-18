import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApprovalRequest, createTestApprovalHarness } from '../src/approval/approval-engine.mjs';
import { assertConsumableHandoff, authorizeCanonicalHandoff, createCanonicalHandoff, createTestValidatedInputHarness,
  partialHandoffPurposePayload } from '../src/handoff-v2/canonical-handoff.mjs';
import { digest } from './state-helpers.mjs';

const material = (keywordId, canonicalStatus) => ({ keywordId, keyword: keywordId,
  canonicalStatus, gapIds: canonicalStatus === 'COMPLETED' ? [] : [`gap-${digest(keywordId).slice(0, 24)}`],
  sourceDigest: digest(`source:${keywordId}`), contentAccepted: canonicalStatus === 'COMPLETED' });

test('canonical handoff accepts only host-validated capabilities and requires exact partial approval', async t => {
  const root = await mkdtemp(join(tmpdir(), 'p4-handoff-')); t.after(() => rm(root, { recursive: true, force: true }));
  const harness = createTestValidatedInputHarness();
  const input = harness.validate({ runId: 'run-p4', stageId: 'stage-2', attemptId: 10,
    contextDigest: digest('context'), schemaBundleDigest: digest('schemas'), recoveryDigest: digest('recovery'),
    evidenceOutcomeDigest: digest('outcome'), siteRevision: digest('site'), domain: 'example.com',
    materials: [material('complete', 'COMPLETED'), material('partial', 'PARTIAL'), material('blocked', 'BLOCKED')],
    pendingRows: [36, 84, 96, 100] });
  const handoff = createCanonicalHandoff({ validatedInput: input, consumerStage: 'stage-3' });
  assert.deepEqual(handoff.materials.map(item => [item.canonicalStatus, item.publicationEligibility]),
    [['COMPLETED', 'ELIGIBLE'], ['PARTIAL', 'DRAFT_ONLY'], ['BLOCKED', 'OMIT']]);
  assert.deepEqual(handoff.pendingRows, [36, 84, 96, 100]);
  assert.equal(handoff.materials[1].canonicalStatus, 'PARTIAL');
  assert.equal(handoff.authorizationStatus, 'REQUIRED');
  const approvals = await createTestApprovalHarness({ rootDirectory: root, namespace: 'p4-handoff' });
  const binding = { runId: handoff.runId, stageId: handoff.stageId, attemptId: handoff.attemptId,
    contextDigest: handoff.contextDigest, schemaBundleDigest: handoff.schemaBundleDigest,
    purpose: 'PARTIAL_HANDOFF', purposePayload: partialHandoffPurposePayload(handoff) };
  const reference = await approvals.authority.issue(createApprovalRequest(binding),
    { decision: 'APPROVED', nowMs: 1000, expiresAtMs: 2000 });
  const consumption = await approvals.consumer.consume(reference, { ...binding, nowMs: 1500 });
  const authorized = authorizeCanonicalHandoff({ candidate: handoff, approvalConsumption: consumption });
  assert.equal(authorized.authorizationStatus, 'CONSUMED');
  assert.equal(authorized.approvalConsumptionDigest, consumption.consumptionDigest);
  assert.equal(authorized.handoffDigest, handoff.handoffDigest);
  assert.throws(() => assertConsumableHandoff(structuredClone(authorized)),
    error => error.code === 'HANDOFF_UNTRUSTED');
  const otherCandidate = createCanonicalHandoff({ validatedInput: input, consumerStage: 'stage-5' });
  assert.throws(() => authorizeCanonicalHandoff({ candidate: otherCandidate, approvalConsumption: consumption }),
    error => error.code === 'HANDOFF_APPROVAL_BINDING_MISMATCH');
  assert.throws(() => createCanonicalHandoff({ validatedInput: structuredClone(input), consumerStage: 'stage-3' }),
    error => error.code === 'HANDOFF_INPUT_UNTRUSTED');
});

test('completed research without content acceptance is not publish eligible', () => {
  const harness = createTestValidatedInputHarness();
  const item = { ...material('complete', 'COMPLETED'), contentAccepted: false };
  const input = harness.validate({ runId: 'run-p4', stageId: 'stage-2', attemptId: 10,
    contextDigest: digest('context'), schemaBundleDigest: digest('schemas'), recoveryDigest: digest('recovery'),
    evidenceOutcomeDigest: digest('outcome'), siteRevision: digest('site'), domain: 'example.com',
    materials: [item], pendingRows: [] });
  const handoff = createCanonicalHandoff({ validatedInput: input, consumerStage: 'stage-3' });
  assert.equal(handoff.materials[0].publicationEligibility, 'UNPROVEN');
  assert.equal(handoff.authorizationStatus, 'REQUIRED');
});
