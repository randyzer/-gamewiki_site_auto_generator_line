import { resolve } from 'node:path';
import { ContractError } from '../../contracts/errors.mjs';

const issued = new WeakMap();
const allowed = new Set([
  'OFFLINE_TRANSACTION',
  'OFFLINE_APPROVED_CANDIDATE',
  'OFFLINE_STAGE_COMMIT',
  'OFFLINE_RECOVERY',
]);

const fail = (code, message) => { throw new ContractError(code, message); };

export function createTestHostCapabilityRegistry() {
  const registryToken = Object.freeze({ registry: Symbol('offline-host-capabilities') });
  return Object.freeze({
    issue(input) {
      if (!allowed.has(input?.capability) || !['SIMULATED', 'SHADOW'].includes(input?.mode)) {
        fail('POLICY_DENIED', 'P5-B exposes only explicit offline simulated capabilities');
      }
      if (typeof input.rootDirectory !== 'string' || !input.rootDirectory) {
        fail('HOST_CAPABILITY_INVALID', 'Capability requires an offline root directory');
      }
      const capability = Object.freeze({
        capability: input.capability,
        mode: input.mode,
        rootDirectory: resolve(input.rootDirectory),
      });
      issued.set(capability, registryToken);
      return capability;
    },
    assert(capability, expected) {
      if (issued.get(capability) !== registryToken) {
        fail('HOST_CAPABILITY_UNTRUSTED', 'Capability was not issued by this offline host registry');
      }
      const normalized = { ...expected, rootDirectory: resolve(expected.rootDirectory) };
      const delegated = capability.capability === 'OFFLINE_TRANSACTION' &&
        ['OFFLINE_APPROVED_CANDIDATE', 'OFFLINE_STAGE_COMMIT', 'OFFLINE_RECOVERY'].includes(expected.capability);
      for (const key of ['mode', 'rootDirectory']) {
        if (capability[key] !== normalized[key]) {
          fail('HOST_CAPABILITY_MISMATCH', `Capability does not match ${key}`);
        }
      }
      if (capability.capability !== expected.capability && !delegated)
        fail('HOST_CAPABILITY_MISMATCH', 'Capability does not match capability');
      return capability;
    },
  });
}
