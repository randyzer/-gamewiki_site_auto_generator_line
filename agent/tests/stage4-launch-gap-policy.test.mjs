import test from 'node:test';
import assert from 'node:assert/strict';
import { STAGE4_LAUNCH_BLOCKERS, validateStage4WorkerHandoff } from '../src/stage4-launch-gap-policy.mjs';

const handoff = launchBlockers => ({
  kind: 'STAGE4_WORKER_HANDOFF_V1',
  worker_owned_gates: 'PASSED',
  host_validation: 'REQUIRED',
  blocking_gaps: [],
  launch_blockers: launchBlockers,
});

test('Stage 4 handoff accepts only canonical launch-only blockers', () => {
  const launchBlockers = [...STAGE4_LAUNCH_BLOCKERS];
  assert.deepEqual(validateStage4WorkerHandoff(handoff(launchBlockers)), { launchBlockers });
});

test('Stage 4 handoff rejects omissions, unknown, duplicate, unordered and content blockers', () => {
  for (const launchBlockers of [
    [],
    STAGE4_LAUNCH_BLOCKERS.slice(0, -1),
    ['UNKNOWN_GAP'],
    ['CONTACT_CHANNEL_REQUIRED', 'CONTACT_CHANNEL_REQUIRED'],
    ['TERMS_POLICY_REVIEW_REQUIRED', 'OPERATOR_IDENTITY_REQUIRED'],
  ]) assert.throws(() => validateStage4WorkerHandoff(handoff(launchBlockers)), /STAGE4_WORKER_HANDOFF_INVALID/);

  assert.throws(() => validateStage4WorkerHandoff({ ...handoff([]), blocking_gaps: ['Missing source'] }),
    /STAGE4_WORKER_HANDOFF_INVALID/);
});

test('ordinary PARTIAL without a handoff remains ineligible', () => {
  assert.equal(validateStage4WorkerHandoff(null), null);
  assert.equal(validateStage4WorkerHandoff(undefined), null);
});
