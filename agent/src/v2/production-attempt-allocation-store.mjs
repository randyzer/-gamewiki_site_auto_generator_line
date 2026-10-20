import { readdir, readFile, rm } from 'node:fs/promises';
import { isAbsolute, join } from 'node:path';
import { canonicalJson, parseStrictJson } from '../contracts/canonical-json.mjs';
import { ContractError } from '../contracts/errors.mjs';
import { validateContract } from '../contracts/registry.mjs';
import { syncDirectory, writeAtomicFile, writeImmutableFile } from '../state/atomic-file.mjs';
import { acquireStageLock } from '../state/stage-lock.mjs';
import {
  assertDirectoryNoSymlink,
  assertRegularFileNoSymlink,
  ensureDirectoryTree,
} from '../state/storage-boundary.mjs';
import {
  assertAttemptOperationIdentity,
  computeAttemptAllocationDigest,
  computeAttemptOperationDigest,
  computeLegacyAttemptBoundaryDigest,
} from './production-allocation-digest.mjs';

const allocationTrust = new WeakSet();
const legacyBoundaryTrust = new WeakSet();
const allocationDirectoryName = attemptId => String(attemptId).padStart(12, '0');
const attemptDirectoryPattern = /^\d{12}$/;

const attemptError = (code, message, details) => new ContractError(code, message, details);

function exactKeys(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).sort().join('\0') !== [...keys].sort().join('\0')) {
    throw attemptError('ATTEMPT_IDENTITY_INVALID', `${label} has unsupported fields`);
  }
}

function freezeTrustedAllocation(record) {
  const trusted = Object.freeze(structuredClone(record));
  allocationTrust.add(trusted);
  return trusted;
}

export function assertTrustedAttemptAllocation(value) {
  if (!allocationTrust.has(value)) {
    throw attemptError('ATTEMPT_IDENTITY_INVALID', 'Attempt Allocation is not a trusted store result');
  }
  return value;
}

export function createTestLegacyAttemptBoundary(value) {
  exactKeys(value, ['runId', 'canonicalStageId', 'mappingVersion', 'verifiedHighWaterMark',
    'sourceManifestDigest', 'sourceLineageDigest'], 'Legacy Attempt boundary');
  const boundary = Object.freeze({
    ...structuredClone(value),
    legacyBoundaryDigest: computeLegacyAttemptBoundaryDigest(value),
  });
  legacyBoundaryTrust.add(boundary);
  return boundary;
}

function assertTrustedLegacyBoundary(boundary) {
  if (!legacyBoundaryTrust.has(boundary)) {
    throw attemptError('ATTEMPT_LEGACY_BOUNDARY_UNVERIFIED',
      'Legacy Attempt boundary lacks trusted host provenance');
  }
  const { legacyBoundaryDigest, ...payload } = boundary;
  if (computeLegacyAttemptBoundaryDigest(payload) !== legacyBoundaryDigest) {
    throw attemptError('ATTEMPT_LEGACY_BOUNDARY_UNVERIFIED', 'Legacy Attempt boundary digest changed');
  }
  return boundary;
}

function expectedPreviousFrom(latest, boundary) {
  if (latest) return Object.freeze({
    attemptId: latest.attemptId,
    allocationSequence: latest.allocationSequence,
    allocationDigest: latest.allocationDigest,
  });
  return Object.freeze({
    attemptId: boundary?.verifiedHighWaterMark ?? 0,
    allocationSequence: 0,
    allocationDigest: null,
  });
}

function assertExpectedPrevious(value) {
  exactKeys(value, ['attemptId', 'allocationSequence', 'allocationDigest'], 'Expected predecessor');
  if (!Number.isSafeInteger(value.attemptId) || value.attemptId < 0 ||
      !Number.isSafeInteger(value.allocationSequence) || value.allocationSequence < 0 ||
      (value.allocationDigest !== null && !/^[a-f0-9]{64}$/.test(value.allocationDigest))) {
    throw attemptError('ATTEMPT_PREDECESSOR_MISMATCH', 'Expected predecessor is invalid');
  }
  return value;
}

function samePrevious(left, right) {
  return left.attemptId === right.attemptId &&
    left.allocationSequence === right.allocationSequence &&
    left.allocationDigest === right.allocationDigest;
}

export function createProductionAttemptAllocationStore({
  runDirectory,
  runId,
  legacyBoundary = null,
  faultInjector = null,
} = {}) {
  if (typeof runDirectory !== 'string' || !isAbsolute(runDirectory)) {
    throw attemptError('ATTEMPT_STORAGE_FAILURE', 'Attempt Allocation runDirectory must be absolute');
  }
  assertAttemptOperationIdentity({
    runId,
    canonicalStageId: 'homepage-research',
    mappingVersion: 'stage-identity-v1',
    requestedOperation: 'homepage-research',
    operationInputsDigest: null,
    recoveryDecisionDigest: null,
  });
  if (legacyBoundary !== null) {
    assertTrustedLegacyBoundary(legacyBoundary);
    if (legacyBoundary.runId !== runId) {
      throw attemptError('ATTEMPT_LEGACY_BOUNDARY_UNVERIFIED', 'Legacy boundary belongs to another run');
    }
  }

  const root = join(runDirectory, 'production-preparation', 'v1');
  const inject = async point => { await faultInjector?.(point); };
  const stageRoot = canonicalStageId => join(root, 'stages', canonicalStageId);
  const boundaryFor = canonicalStageId => legacyBoundary?.canonicalStageId === canonicalStageId ? legacyBoundary : null;

  function assertStage(canonicalStageId) {
    assertAttemptOperationIdentity({
      runId,
      canonicalStageId,
      mappingVersion: 'stage-identity-v1',
      requestedOperation: canonicalStageId,
      operationInputsDigest: null,
      recoveryDecisionDigest: null,
    });
    return canonicalStageId;
  }

  async function readAllocationChain(canonicalStageId) {
    assertStage(canonicalStageId);
    const attemptsDirectory = join(stageRoot(canonicalStageId), 'attempts');
    try { await assertDirectoryNoSymlink(attemptsDirectory); }
    catch (error) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
    const entries = await readdir(attemptsDirectory, { withFileTypes: true });
    const unexpected = entries.filter(entry => !attemptDirectoryPattern.test(entry.name));
    if (unexpected.length > 0) {
      throw attemptError('ATTEMPT_CHAIN_CORRUPT',
        `Attempt directory contains an unexpected entry: ${unexpected[0].name}`);
    }
    const records = [];
    const operationDigests = new Set();
    const boundary = boundaryFor(canonicalStageId);
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      const directory = join(attemptsDirectory, entry.name);
      await assertDirectoryNoSymlink(directory);
      const path = join(directory, 'allocation.json');
      try { await assertRegularFileNoSymlink(path); }
      catch (error) {
        if (error.code === 'ENOENT') {
          const remnants = await readdir(directory);
          if (remnants.every(name => name.startsWith('.tmp-'))) continue;
          throw attemptError('ATTEMPT_CHAIN_CORRUPT', `Attempt ${entry.name} has no Allocation record`);
        }
        throw error;
      }
      const record = parseStrictJson(await readFile(path), path);
      validateContract(record.kind, record.schemaVersion, record);
      if (record.runId !== runId || record.canonicalStageId !== canonicalStageId ||
          entry.name !== allocationDirectoryName(record.attemptId)) {
        throw attemptError('ATTEMPT_IDENTITY_INVALID', 'Attempt Allocation storage identity mismatch');
      }
      let recomputedOperation;
      try {
        recomputedOperation = computeAttemptOperationDigest({
          runId: record.runId,
          canonicalStageId: record.canonicalStageId,
          mappingVersion: record.mappingVersion,
          requestedOperation: record.requestedOperation,
          operationInputsDigest: record.operationInputsDigest,
          recoveryDecisionDigest: record.recoveryDecisionDigest,
        });
      } catch (error) {
        if (error.code?.startsWith('ATTEMPT_')) throw error;
        throw attemptError('ATTEMPT_DIGEST_MISMATCH', error.message);
      }
      if (record.operationDigest !== recomputedOperation ||
          record.allocationDigest !== computeAttemptAllocationDigest(record)) {
        throw attemptError('ATTEMPT_DIGEST_MISMATCH', 'Attempt Allocation digest mismatch');
      }
      const previous = records.at(-1) ?? null;
      const expectedSequence = records.length + 1;
      if (record.allocationSequence !== expectedSequence) {
        throw attemptError('ATTEMPT_CHAIN_CORRUPT', 'Attempt Allocation sequence is not contiguous');
      }
      if (!previous) {
        if (boundary) {
          assertTrustedLegacyBoundary(boundary);
          if (record.attemptId !== boundary.verifiedHighWaterMark + 1 ||
              record.previousAttemptId !== boundary.verifiedHighWaterMark ||
              record.previousAllocationDigest !== null ||
              record.legacyBoundaryDigest !== boundary.legacyBoundaryDigest) {
            throw attemptError('ATTEMPT_LEGACY_BOUNDARY_UNVERIFIED',
              'Legacy-bound Attempt Allocation does not match trusted boundary evidence');
          }
        } else if (record.attemptId !== 1 || record.previousAttemptId !== 0 ||
            record.previousAllocationDigest !== null || record.legacyBoundaryDigest !== null) {
          if (record.legacyBoundaryDigest !== null || record.previousAttemptId > 0) {
            throw attemptError('ATTEMPT_LEGACY_BOUNDARY_UNVERIFIED',
              'Legacy-bound Attempt Allocation lacks trusted boundary evidence');
          }
          throw attemptError('ATTEMPT_PREDECESSOR_MISMATCH', 'New-run Attempt genesis is invalid');
        }
      } else if (record.attemptId !== previous.attemptId + 1 ||
          record.previousAttemptId !== previous.attemptId ||
          record.previousAllocationDigest !== previous.allocationDigest ||
          record.legacyBoundaryDigest !== null) {
        throw attemptError('ATTEMPT_PREDECESSOR_MISMATCH',
          'Attempt Allocation predecessor does not match the immutable chain');
      }
      if (operationDigests.has(record.operationDigest)) {
        throw attemptError('ATTEMPT_CHAIN_CORRUPT', 'Attempt Allocation operation is duplicated');
      }
      operationDigests.add(record.operationDigest);
      records.push(freezeTrustedAllocation(record));
    }
    return records;
  }

  async function reconcileHead(canonicalStageId, records, repairHead) {
    const path = join(stageRoot(canonicalStageId), 'ATTEMPT_HEAD');
    const latest = records.at(-1) ?? null;
    const expected = latest ? Buffer.from(`${canonicalJson({
      attemptId: latest.attemptId,
      allocationSequence: latest.allocationSequence,
      allocationDigest: latest.allocationDigest,
    })}\n`) : null;
    let actual = null;
    try {
      await assertRegularFileNoSymlink(path);
      actual = await readFile(path);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    if ((expected === null && actual === null) ||
        (expected !== null && actual !== null && actual.equals(expected))) return;
    if (!repairHead) throw attemptError('ATTEMPT_HEAD_STALE', 'ATTEMPT_HEAD does not match immutable chain');
    if (expected === null) {
      await rm(path, { force: true });
      await syncDirectory(stageRoot(canonicalStageId));
    } else await writeAtomicFile(path, expected);
  }

  async function withAllocationLocks(canonicalStageId, action) {
    assertStage(canonicalStageId);
    await ensureDirectoryTree(runDirectory, ['production-preparation', 'v1', 'locks']);
    await ensureDirectoryTree(runDirectory,
      ['production-preparation', 'v1', 'stages', canonicalStageId, 'locks']);
    let runLock;
    try {
      runLock = await acquireStageLock({ lockDirectory: join(root, 'locks', 'run.lock') });
    } catch (error) {
      if (error.code === 'STATE_LOCK_HELD') {
        throw attemptError('ATTEMPT_LOCK_HELD', 'Trusted run lock remains held');
      }
      throw error;
    }
    let stageLock;
    try {
      try {
        stageLock = await acquireStageLock({
          lockDirectory: join(stageRoot(canonicalStageId), 'locks', 'allocation.lock'),
        });
      } catch (error) {
        if (error.code === 'STATE_LOCK_HELD') {
          throw attemptError('ATTEMPT_LOCK_HELD', 'Stage allocation lock remains held');
        }
        throw error;
      }
      return await action();
    } finally {
      if (stageLock) await stageLock.release();
      await runLock.release();
    }
  }

  async function recoverLocked(canonicalStageId, repairHead = true) {
    const records = await readAllocationChain(canonicalStageId);
    await reconcileHead(canonicalStageId, records, repairHead);
    return Object.freeze({ records: Object.freeze(records), latest: records.at(-1) ?? null });
  }

  return Object.freeze({
    async inspect({ canonicalStageId }) {
      return withAllocationLocks(canonicalStageId, async () => {
        const recovered = await recoverLocked(canonicalStageId, true);
        return expectedPreviousFrom(recovered.latest, boundaryFor(canonicalStageId));
      });
    },

    async recover({ canonicalStageId, repairHead = true }) {
      return withAllocationLocks(canonicalStageId,
        () => recoverLocked(canonicalStageId, repairHead));
    },

    async allocate(request) {
      exactKeys(request, ['canonicalStageId', 'mappingVersion', 'requestedOperation',
        'operationInputsDigest', 'recoveryDecisionDigest', 'expectedPrevious'], 'Attempt allocation request');
      const operationIdentity = {
        runId,
        canonicalStageId: request.canonicalStageId,
        mappingVersion: request.mappingVersion,
        requestedOperation: request.requestedOperation,
        operationInputsDigest: request.operationInputsDigest,
        recoveryDecisionDigest: request.recoveryDecisionDigest,
      };
      assertAttemptOperationIdentity(operationIdentity);
      assertExpectedPrevious(request.expectedPrevious);
      const operationDigest = computeAttemptOperationDigest(operationIdentity);
      return withAllocationLocks(request.canonicalStageId, async () => {
        const records = await readAllocationChain(request.canonicalStageId);
        const replay = records.find(record => record.operationDigest === operationDigest);
        if (replay) {
          await reconcileHead(request.canonicalStageId, records, true);
          return replay;
        }
        const current = expectedPreviousFrom(records.at(-1) ?? null,
          boundaryFor(request.canonicalStageId));
        if (!samePrevious(request.expectedPrevious, current)) {
          throw attemptError('ATTEMPT_ALLOCATION_CONFLICT',
            'Attempt predecessor changed before allocation');
        }
        const allocationSequence = current.allocationSequence + 1;
        const boundary = allocationSequence === 1 ? boundaryFor(request.canonicalStageId) : null;
        const base = {
          kind: 'ATTEMPT_ALLOCATION',
          schemaVersion: 1,
          producer: 'PRODUCTION_ATTEMPT_COORDINATOR_V1',
          authorityScope: 'PREPARATION_IDENTITY_ONLY',
          runId,
          canonicalStageId: request.canonicalStageId,
          mappingVersion: request.mappingVersion,
          attemptId: current.attemptId + 1,
          requestedOperation: request.requestedOperation,
          operationInputsDigest: request.operationInputsDigest,
          recoveryDecisionDigest: request.recoveryDecisionDigest,
          operationDigest,
          allocationSequence,
          previousAttemptId: current.attemptId,
          previousAllocationDigest: current.allocationDigest,
          legacyBoundaryDigest: boundary?.legacyBoundaryDigest ?? null,
        };
        const record = { ...base, allocationDigest: computeAttemptAllocationDigest(base) };
        validateContract('ATTEMPT_ALLOCATION', 1, record);
        await inject('beforeAllocationPublish');
        const attemptDirectory = await ensureDirectoryTree(runDirectory, [
          'production-preparation', 'v1', 'stages', request.canonicalStageId, 'attempts',
          allocationDirectoryName(record.attemptId),
        ]);
        const target = join(attemptDirectory, 'allocation.json');
        const bytes = Buffer.from(`${canonicalJson(record)}\n`);
        const created = await writeImmutableFile(target, bytes);
        if (!created) {
          const existing = await readFile(target);
          if (!existing.equals(bytes)) {
            throw attemptError('ATTEMPT_ALLOCATION_CONFLICT',
              'Attempt identity already contains different immutable bytes');
          }
        }
        await inject('afterAllocationPublished');
        const trusted = freezeTrustedAllocation(record);
        await inject('beforeHeadUpdate');
        await reconcileHead(request.canonicalStageId, [...records, trusted], true);
        await inject('afterHeadUpdate');
        return trusted;
      });
    },
  });
}
