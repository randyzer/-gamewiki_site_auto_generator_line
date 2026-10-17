import test from 'node:test';
import assert from 'node:assert/strict';
import { assertStageState, transitionStageState } from '../src/state/state-engine.mjs';
import { stageState } from './state-helpers.mjs';

test('state engine permits the lifecycle and keeps dimensions separate', () => {
  const initial = stageState({ phase: 'NOT_STARTED', reason: null, artifact: 'UNVERIFIED', gate: 'NOT_EVALUATED' });
  const ready = transitionStageState(initial, { execution: { phase: 'READY', reason: null }, artifact: { status: 'UNVERIFIED' }, gate: { status: 'NOT_EVALUATED', approvalDigest: null } });
  const running = transitionStageState(ready, { execution: { phase: 'RUNNING', reason: null }, artifact: { status: 'UNVERIFIED' }, gate: { status: 'NOT_EVALUATED', approvalDigest: null } });
  const stopped = transitionStageState(running, stageState());
  assert.equal(stopped.execution.reason, 'PARTIAL');
  assert.equal(stopped.artifact.status, 'VALIDATED_PARTIAL');
});

test('state engine rejects illegal jumps and unbound approval', () => {
  const initial = stageState({ phase: 'NOT_STARTED', reason: null, artifact: 'UNVERIFIED', gate: 'NOT_EVALUATED' });
  assert.throws(() => transitionStageState(initial, stageState()), error => error.code === 'STATE_TRANSITION_INVALID');
  assert.throws(() => assertStageState(stageState({ gate: 'APPROVED' }), { approvalBindingVerified: false }),
    error => error.code === 'STATE_APPROVAL_INVALID');
});

test('stopped partial outcome may receive a later exactly bound handoff approval', () => {
  const waiting = stageState();
  const approved = stageState({ gate: 'APPROVED' });
  assert.equal(transitionStageState(waiting, approved, { approvalBindingVerified: true }).gate.status, 'APPROVED');
});
