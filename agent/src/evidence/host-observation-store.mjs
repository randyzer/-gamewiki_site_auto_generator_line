import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { canonicalJson, parseStrictJson } from '../contracts/canonical-json.mjs';
import { ContractError } from '../contracts/errors.mjs';
import { validateContract } from '../contracts/registry.mjs';
import { isHostEvidenceBrokerAuthority } from './host-evidence-broker.mjs';

const sha256 = value => createHash('sha256').update(value).digest('hex');
const trustedStores = new WeakSet();
const defaultWriter = async (path, bytes) => {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, bytes, { flag: 'wx', mode: 0o600 });
};

const contains = (root, candidate) => {
  const path = relative(resolve(root), resolve(candidate));
  return path === '' || (!path.startsWith('../') && !isAbsolute(path));
};

export function createHostObservationStore({ rootDirectory, namespace, evidenceMode,
  workerWritableRoots = [], writer = defaultWriter, brokerAuthority }) {
  if (!isHostEvidenceBrokerAuthority(brokerAuthority))
    throw new ContractError('TRUST_LEVEL_INSUFFICIENT',
      'Only Host Evidence Broker can create a trusted Observation Store');
  if ((evidenceMode === 'SIMULATED') !== namespace.startsWith('simulation/'))
    throw new ContractError('CONTRACT_BINDING_MISMATCH',
      'Simulated observations require a simulation namespace isolated from production');
  if (workerWritableRoots.some(root => contains(root, rootDirectory) || contains(rootDirectory, root)))
    throw new ContractError('CONTRACT_PATH_INVALID',
      'Host Observation store must be outside every worker-writable root');
  const references = [];
  const append = async observation => {
      validateContract('HOST_OBSERVATION', 1, observation);
      if (observation.namespace !== namespace || observation.evidenceMode !== evidenceMode)
        throw new ContractError('CONTRACT_BINDING_MISMATCH', 'Observation store namespace or mode mismatch');
      const bytes = Buffer.from(`${canonicalJson(observation)}\n`);
      const reference = { observationId: observation.observationId,
        path: `${namespace}/${observation.observationId}.json`, sha256: sha256(bytes) };
      await writer(join(rootDirectory, reference.path), bytes);
      references.push(Object.freeze(reference));
      return reference;
  };
  const store = Object.freeze({
    async read(reference) {
      if (!/^obs-[a-f0-9]{24}$/.test(reference?.observationId ?? '') ||
          !/^[a-f0-9]{64}$/.test(reference?.sha256 ?? '') ||
          typeof reference?.path !== 'string' || !reference.path.startsWith(`${namespace}/`) ||
          reference.path.startsWith('/') || reference.path.includes('\\') ||
          reference.path.split('/').some(part => !part || part === '.' || part === '..'))
        throw new ContractError('CONTRACT_PATH_INVALID', 'Invalid Host Observation reference path');
      const bytes = await readFile(join(rootDirectory, reference.path));
      if (sha256(bytes) !== reference.sha256)
        throw new ContractError('CONTRACT_DIGEST_MISMATCH', 'Host Observation bytes were replaced');
      const observation = parseStrictJson(bytes, reference.path);
      validateContract('HOST_OBSERVATION', 1, observation);
      if (observation.observationId !== reference.observationId ||
          observation.namespace !== namespace || observation.evidenceMode !== evidenceMode)
        throw new ContractError('CONTRACT_BINDING_MISMATCH',
          'Observation reference identity, namespace or mode mismatch');
      return observation;
    },
    async list() { return [...references]; },
  });
  trustedStores.add(store);
  return Object.freeze({ store, append });
}

export async function readVerifiedHostObservations(store, references) {
  if (!trustedStores.has(store))
    throw new ContractError('TRUST_LEVEL_INSUFFICIENT',
      'Host Observations must be loaded through a trusted Host Observation Store');
  if (!Array.isArray(references))
    throw new ContractError('CONTRACT_SCHEMA_INVALID', 'Observation References must be an array');
  const observations = [];
  for (const reference of references) observations.push(await store.read(reference));
  return observations;
}
