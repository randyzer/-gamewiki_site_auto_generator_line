import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { lstat, open } from 'node:fs/promises';
import { isAbsolute, join, parse, resolve, sep } from 'node:path';
import { canonicalJson, parseStrictJson } from '../contracts/canonical-json.mjs';
import { ContractError } from '../contracts/errors.mjs';
import { validateContract } from '../contracts/registry.mjs';
import {
  assertActiveVerifiedAllocationLease,
  assertTrustedAttemptAllocation,
} from './production-attempt-allocation-store.mjs';
import { computeAttemptAllocationDigest } from './production-allocation-digest.mjs';
import { hostSourceVerifierDefinition } from './production-host-source-verifier-registry.mjs';

const identityFields = Object.freeze([
  'runId', 'canonicalStageId', 'attemptId', 'requestedOperation', 'mappingVersion',
  'allocationDigest', 'allocationSequence',
]);
const fail = (code, message) => { throw new ContractError(code, message); };
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const attemptDirectoryName = attemptId => String(attemptId).padStart(12, '0');

function assertLease(lease) {
  try { return assertActiveVerifiedAllocationLease(lease); }
  catch (error) {
    if (error.code === 'ATTEMPT_LEASE_INVALID') {
      fail('HOST_SOURCE_LEASE_INVALID', 'An active verified Allocation lease is required');
    }
    throw error;
  }
}

function assertAllocation(allocation) {
  try { assertTrustedAttemptAllocation(allocation); }
  catch (error) {
    if (error.code === 'ATTEMPT_IDENTITY_INVALID') {
      fail('HOST_SOURCE_ALLOCATION_UNVERIFIED', 'Allocation lacks trusted host provenance');
    }
    throw error;
  }
  validateContract('ATTEMPT_ALLOCATION', 1, allocation);
  if (computeAttemptAllocationDigest(allocation) !== allocation.allocationDigest) {
    fail('ATTEMPT_DIGEST_MISMATCH', 'Attempt Allocation digest mismatch');
  }
  return allocation;
}

function sourceRelativePath(allocation) {
  return join(
    'production-preparation', 'v1', 'stages', allocation.canonicalStageId, 'attempts',
    attemptDirectoryName(allocation.attemptId), 'allocation.json',
  ).split(sep).join('/');
}

function assertRunDirectory(runDirectory) {
  if (typeof runDirectory !== 'string' || !isAbsolute(runDirectory) ||
      resolve(runDirectory) !== runDirectory || runDirectory.includes('\0')) {
    fail('HOST_SOURCE_REFERENCE_INVALID', 'runDirectory must be a normalized absolute path');
  }
  return runDirectory;
}

async function resolveNoSymlinkPath(root, relativePath) {
  const rootPrefix = parse(root).root;
  const rootSegments = root.slice(rootPrefix.length).split(sep).filter(Boolean);
  const sourceSegments = relativePath.split('/');
  const segments = [...rootSegments, ...sourceSegments];
  let current = rootPrefix;
  try {
    for (let index = 0; index < segments.length; index += 1) {
      current = join(current, segments[index]);
      const metadata = await lstat(current);
      if (metadata.isSymbolicLink()) {
        fail('STATE_STORAGE_SYMLINK', `Host source path must not be a symbolic link: ${current}`);
      }
      const final = index === segments.length - 1;
      if ((!final && !metadata.isDirectory()) || (final && !metadata.isFile())) {
        fail('HOST_SOURCE_REFERENCE_INVALID', `Host source path has an invalid type: ${current}`);
      }
    }
  } catch (error) {
    if (error.code === 'ENOENT') fail('HOST_SOURCE_RECORD_MISSING', 'Allocation record is missing');
    throw error;
  }
  return current;
}

async function readStableRecord(path) {
  let handle;
  try {
    handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  } catch (error) {
    if (error.code === 'ENOENT') fail('HOST_SOURCE_RECORD_MISSING', 'Allocation record is missing');
    if (error.code === 'ELOOP') {
      fail('STATE_STORAGE_SYMLINK', 'Allocation record must not be a symbolic link');
    }
    throw error;
  }
  try {
    const before = await handle.stat();
    if (!before.isFile()) fail('HOST_SOURCE_REFERENCE_INVALID', 'Allocation record is not a regular file');
    const bytes = await handle.readFile();
    const after = await handle.stat();
    if (before.dev !== after.dev || before.ino !== after.ino || before.size !== after.size ||
        before.mtimeMs !== after.mtimeMs) {
      fail('HOST_SOURCE_RECORD_CHANGED', 'Allocation record changed while it was read');
    }
    return bytes;
  } finally {
    await handle.close();
  }
}

function parseStoredAllocation(bytes, path, allocation) {
  let stored;
  try { stored = parseStrictJson(bytes, path); }
  catch (error) {
    if (error.code === 'CONTEXT_CANONICALIZATION_INVALID') {
      fail('HOST_SOURCE_RECORD_CORRUPT', 'Allocation record is not strict JSON');
    }
    throw error;
  }
  validateContract('ATTEMPT_ALLOCATION', 1, stored);
  if (canonicalJson(stored) !== canonicalJson(allocation)) {
    fail('HOST_SOURCE_RECORD_CHANGED', 'Allocation record does not match the trusted Allocation');
  }
  if (computeAttemptAllocationDigest(stored) !== stored.allocationDigest) {
    fail('ATTEMPT_DIGEST_MISMATCH', 'Stored Attempt Allocation digest mismatch');
  }
  const canonicalBytes = Buffer.from(`${canonicalJson(stored)}\n`);
  if (!bytes.equals(canonicalBytes)) {
    fail('HOST_SOURCE_RECORD_CORRUPT', 'Allocation record bytes are not canonical');
  }
}

function assertIdentityMapping() {
  const definition = hostSourceVerifierDefinition('identity');
  const reference = definition.references[0];
  if (definition.verifierId !== 'HOST_ALLOCATION_CHAIN_V1' ||
      definition.verifierVersion !== 1 || definition.references.length !== 1 ||
      reference.role !== 'allocation-record' || reference.sourceKind !== 'ATTEMPT_ALLOCATION' ||
      reference.sourceVersion !== 1) {
    fail('HOST_SOURCE_REFERENCE_INVALID', 'Identity source mapping is not the approved fixed mapping');
  }
  return reference;
}

export async function verifyProductionHostIdentitySource(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      Object.keys(input).sort().join('\0') !== ['allocation', 'lease', 'runDirectory'].join('\0')) {
    fail('HOST_SOURCE_REFERENCE_INVALID', 'Identity source verification input is invalid');
  }
  const { lease, allocation, runDirectory } = input;
  assertLease(lease);
  assertAllocation(allocation);
  if (identityFields.some(field => !Object.is(lease[field], allocation[field]))) {
    fail('HOST_SOURCE_IDENTITY_MISMATCH', 'Allocation does not match the active verified lease');
  }
  const root = assertRunDirectory(runDirectory);
  const relativePath = sourceRelativePath(allocation);
  const path = await resolveNoSymlinkPath(root, relativePath);
  const bytes = await readStableRecord(path);
  parseStoredAllocation(bytes, path, allocation);
  const mapping = assertIdentityMapping();
  return Object.freeze({
    role: mapping.role,
    relativePath,
    sha256: sha256(bytes),
    byteLength: bytes.length,
    sourceKind: mapping.sourceKind,
    sourceVersion: mapping.sourceVersion,
  });
}
