import { ContractError } from '../contracts/errors.mjs';

const phases = new Set(['NOT_STARTED', 'READY', 'RUNNING', 'STOPPED']);
const stopReasons = new Set(['SUCCEEDED', 'PARTIAL', 'BLOCKED', 'FAILED', 'TIMEOUT', 'CANCELLED']);
const artifacts = new Set(['UNVERIFIED', 'VALIDATED_COMPLETE', 'VALIDATED_PARTIAL', 'INVALID']);
const gates = new Set(['NOT_EVALUATED', 'ELIGIBLE', 'WAITING_FOR_APPROVAL', 'APPROVED', 'DENIED']);
const nextPhase = new Map([
  ['NOT_STARTED', new Set(['NOT_STARTED', 'READY'])],
  ['READY', new Set(['READY', 'RUNNING'])],
  ['RUNNING', new Set(['RUNNING', 'STOPPED'])],
  ['STOPPED', new Set(['STOPPED'])],
]);
const nextGate = new Map([
  ['NOT_EVALUATED', new Set(['NOT_EVALUATED', 'ELIGIBLE', 'WAITING_FOR_APPROVAL', 'DENIED'])],
  ['ELIGIBLE', new Set(['ELIGIBLE', 'WAITING_FOR_APPROVAL', 'APPROVED', 'DENIED'])],
  ['WAITING_FOR_APPROVAL', new Set(['WAITING_FOR_APPROVAL', 'APPROVED', 'DENIED'])],
  ['APPROVED', new Set(['APPROVED'])], ['DENIED', new Set(['DENIED'])],
]);

const fail = (code, message) => { throw new ContractError(code, message); };
const exactKeys = (value, expected, label) => {
  if (!value || Object.keys(value).sort().join(',') !== [...expected].sort().join(','))
    fail('STATE_INVALID', `${label} has an invalid shape`);
};

export function assertStageState(state, { approvalBindingVerified = true } = {}) {
  exactKeys(state, ['execution', 'artifact', 'gate'], 'Stage state');
  exactKeys(state.execution, ['phase', 'reason'], 'Execution state');
  exactKeys(state.artifact, ['status'], 'Artifact state');
  exactKeys(state.gate, ['status', 'approvalDigest'], 'Gate state');
  if (!state || !phases.has(state.execution?.phase) || !artifacts.has(state.artifact?.status) ||
      !gates.has(state.gate?.status)) fail('STATE_INVALID', 'Stage state contains an unknown dimension value');
  const stopped = state.execution.phase === 'STOPPED';
  if (stopped !== stopReasons.has(state.execution.reason))
    fail('STATE_INVALID', 'STOPPED requires one stop reason and active phases require null reason');
  if (!stopped && state.artifact.status !== 'UNVERIFIED')
    fail('STATE_INVALID', 'Artifact cannot be validated before Worker stops');
  if (state.artifact.status === 'VALIDATED_COMPLETE' &&
      ['FAILED', 'TIMEOUT', 'CANCELLED', 'BLOCKED'].includes(state.execution.reason))
    fail('STATE_INVALID', 'Failed or blocked execution cannot claim complete artifacts');
  if (state.gate.status === 'APPROVED') {
    if (!state.gate.approvalDigest || !approvalBindingVerified)
      fail('STATE_APPROVAL_INVALID', 'APPROVED requires an exactly bound trusted approval');
  } else if (state.gate.approvalDigest !== null)
    fail('STATE_APPROVAL_INVALID', 'Only APPROVED may carry an approval digest');
  if (['ELIGIBLE', 'APPROVED'].includes(state.gate.status) && state.artifact.status === 'UNVERIFIED')
    fail('STATE_INVALID', 'Unverified artifacts cannot be eligible or approved');
  return state;
}

export function transitionStageState(current, next, options) {
  assertStageState(current, options); assertStageState(next, options);
  if (!nextPhase.get(current.execution.phase).has(next.execution.phase))
    fail('STATE_TRANSITION_INVALID', `${current.execution.phase} cannot transition to ${next.execution.phase}`);
  if (current.execution.phase === 'STOPPED') {
    if (current.execution.reason !== next.execution.reason)
      fail('STATE_TRANSITION_INVALID', 'A Worker stop reason is immutable');
    if (current.artifact.status !== next.artifact.status && current.artifact.status !== 'UNVERIFIED')
      fail('STATE_TRANSITION_INVALID', 'A validated Artifact result is immutable');
    if (!nextGate.get(current.gate.status).has(next.gate.status))
      fail('STATE_TRANSITION_INVALID', `Gate ${current.gate.status} cannot transition to ${next.gate.status}`);
  }
  return structuredClone(next);
}
