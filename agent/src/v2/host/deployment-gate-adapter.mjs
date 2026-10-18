import { createHash } from 'node:crypto';
import { canonicalJson, deepFreeze } from '../../contracts/canonical-json.mjs';
import { ContractError } from '../../contracts/errors.mjs';

const trustedDeploymentGates = new WeakSet();
const effectStates = new Set(['NONE', 'UNKNOWN', 'PARTIAL', 'CONFIRMED_EFFECT']);
const fail = (code, message) => { throw new ContractError(code, message); };
const digest = (domain, value) => createHash('sha256')
  .update(`${domain}\n${canonicalJson(value)}`).digest('hex');

function exactObject(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      canonicalJson(Object.keys(value).sort()) !== canonicalJson([...keys].sort()))
    fail('CONTRACT_SCHEMA_INVALID', `${label} fields do not match the closed contract`);
}

export function evaluateOfflineDeploymentGate(options) {
  exactObject(options, ['requestedCapabilities', 'externalEffectState', 'approval'],
    'offline deployment gate input');
  const { requestedCapabilities, externalEffectState, approval } = options;
  if (!Array.isArray(requestedCapabilities) ||
      requestedCapabilities.some(value => typeof value !== 'string' || !value.trim()))
    fail('CONTRACT_SCHEMA_INVALID', 'requestedCapabilities must be non-empty strings');
  if (requestedCapabilities.length)
    fail('POLICY_DENIED', `P5-G deployment gate denies ${requestedCapabilities[0]}`);
  if (approval !== null)
    fail('DEPLOYMENT_APPROVAL_UNSUPPORTED', 'P5-G cannot consume or simulate deployment approval');
  if (!effectStates.has(externalEffectState))
    fail('CONTRACT_SCHEMA_INVALID', 'Unknown external effect state');

  const base = {
    kind: 'OFFLINE_DEPLOYMENT_GATE', schemaVersion: 1,
    producer: 'P5_G_FIXED_DEPLOYMENT_GATE', classification: 'OFFLINE_STUB', mode: 'SIMULATED',
    authoritative: false, externalEffectState,
    result: externalEffectState === 'NONE' ? 'WAITING_FOR_APPROVAL' : 'RECONCILIATION_REQUIRED',
    executionAllowed: false, retryAllowed: false, deploymentExecuted: false,
    productionReady: false, authoritySwitchAllowed: false,
  };
  const gate = deepFreeze({ ...base, gateDigest: digest('AGENT_OFFLINE_DEPLOYMENT_GATE_V1', base) });
  trustedDeploymentGates.add(gate);
  return gate;
}

export function assertTrustedDeploymentGate(gate) {
  if (!gate || !trustedDeploymentGates.has(gate))
    fail('DEPLOYMENT_GATE_UNTRUSTED', 'Deployment gate was not issued by the fixed P5-G host');
  return gate;
}
