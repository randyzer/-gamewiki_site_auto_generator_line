import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  mkdtemp, readFile, realpath, rename, rm, symlink, writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { canonicalJson } from '../../src/contracts/canonical-json.mjs';
import {
  createProductionAttemptAllocationStore,
  createTestProductionAttemptAllocationStore,
} from '../../src/v2/production-attempt-allocation-store.mjs';
import * as identityVerifier from '../../src/v2/production-host-identity-verifier.mjs';
import { digest } from '../state-helpers.mjs';

const stage = 'keyword-research';
const sha256 = value => createHash('sha256').update(value).digest('hex');
const relativeAllocationPath = (attemptId = 1, canonicalStageId = stage) =>
  `production-preparation/v1/stages/${canonicalStageId}/attempts/` +
  `${String(attemptId).padStart(12, '0')}/allocation.json`;
const allocationPath = (root, attemptId = 1, canonicalStageId = stage) =>
  join(root, relativeAllocationPath(attemptId, canonicalStageId));

async function fixture(t, { testOnly = false, runId = 'identity-verifier-run' } = {}) {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'host-identity-verifier-')));
  t.after(() => rm(root, { recursive: true, force: true }));
  const createStore = testOnly
    ? createTestProductionAttemptAllocationStore
    : createProductionAttemptAllocationStore;
  const store = createStore({ runDirectory: root, runId });
  const expectedPrevious = await store.inspect({ canonicalStageId: stage });
  const allocation = await store.allocate({
    canonicalStageId: stage,
    mappingVersion: 'stage-identity-v1',
    requestedOperation: stage,
    operationInputsDigest: digest('identity-verifier-inputs'),
    recoveryDecisionDigest: null,
    expectedPrevious,
  });
  const request = {
    canonicalStageId: stage,
    attemptId: allocation.attemptId,
    allocationDigest: allocation.allocationDigest,
  };
  return { root, runId, store, allocation, request };
}

async function verify(f) {
  return f.store.withVerifiedAllocationLease(f.request, lease =>
    identityVerifier.verifyProductionHostIdentitySource({
      lease, allocation: f.allocation, runDirectory: f.root,
    }));
}

test('active lease verifies the actual immutable allocation bytes into one frozen reference', async t => {
  const f = await fixture(t);
  const bytes = await readFile(allocationPath(f.root));
  const reference = await verify(f);
  assert.deepEqual(reference, {
    role: 'allocation-record',
    relativePath: relativeAllocationPath(),
    sha256: sha256(bytes),
    byteLength: bytes.length,
    sourceKind: 'ATTEMPT_ALLOCATION',
    sourceVersion: 1,
  });
  assert.equal(Object.isFrozen(reference), true);
  assert.deepEqual(Object.keys(identityVerifier), ['verifyProductionHostIdentitySource']);
});

test('caller-shaped or cloned allocations never acquire source authority', async t => {
  const f = await fixture(t);
  await assert.rejects(f.store.withVerifiedAllocationLease(f.request, lease =>
    identityVerifier.verifyProductionHostIdentitySource({
      lease, allocation: structuredClone(f.allocation), runDirectory: f.root,
    })), error => error.code === 'HOST_SOURCE_ALLOCATION_UNVERIFIED');
});

test('fabricated and expired leases are rejected', async t => {
  const f = await fixture(t);
  await assert.rejects(identityVerifier.verifyProductionHostIdentitySource({
    lease: { ...f.request }, allocation: f.allocation, runDirectory: f.root,
  }), error => error.code === 'HOST_SOURCE_LEASE_INVALID');

  let expired;
  await f.store.withVerifiedAllocationLease(f.request, lease => { expired = lease; });
  await assert.rejects(identityVerifier.verifyProductionHostIdentitySource({
    lease: expired, allocation: f.allocation, runDirectory: f.root,
  }), error => error.code === 'HOST_SOURCE_LEASE_INVALID');
});

test('lease and Allocation must match every shared identity field', async t => {
  const f = await fixture(t);
  const second = await f.store.allocate({
    canonicalStageId: stage,
    mappingVersion: 'stage-identity-v1',
    requestedOperation: stage,
    operationInputsDigest: digest('identity-verifier-second-inputs'),
    recoveryDecisionDigest: null,
    expectedPrevious: {
      attemptId: f.allocation.attemptId,
      allocationSequence: f.allocation.allocationSequence,
      allocationDigest: f.allocation.allocationDigest,
    },
  });
  await assert.rejects(f.store.withVerifiedAllocationLease({
    canonicalStageId: stage,
    attemptId: second.attemptId,
    allocationDigest: second.allocationDigest,
  }, lease => identityVerifier.verifyProductionHostIdentitySource({
    lease, allocation: f.allocation, runDirectory: f.root,
  })), error => error.code === 'HOST_SOURCE_IDENTITY_MISMATCH');
});

test('changed, noncanonical and missing allocation bytes fail closed', async t => {
  for (const scenario of ['changed', 'noncanonical', 'missing']) {
    await t.test(scenario, async t => {
      const f = await fixture(t, { runId: `identity-${scenario}` });
      await assert.rejects(f.store.withVerifiedAllocationLease(f.request, async lease => {
        const path = allocationPath(f.root);
        if (scenario === 'changed') {
          await writeFile(path, `${canonicalJson({ ...f.allocation, operationInputsDigest: digest('drift') })}\n`);
        } else if (scenario === 'noncanonical') {
          await writeFile(path, `${JSON.stringify(f.allocation, null, 2)}\n`);
        } else await rm(path);
        return identityVerifier.verifyProductionHostIdentitySource({
          lease, allocation: f.allocation, runDirectory: f.root,
        });
      }), error => error.code === ({
        changed: 'HOST_SOURCE_RECORD_CHANGED',
        noncanonical: 'HOST_SOURCE_RECORD_CORRUPT',
        missing: 'HOST_SOURCE_RECORD_MISSING',
      })[scenario]);
    });
  }
});

test('symlinked allocation files and ancestors are rejected', async t => {
  for (const scenario of ['file', 'ancestor']) {
    await t.test(scenario, async t => {
      const f = await fixture(t, { runId: `identity-symlink-${scenario}` });
      await assert.rejects(f.store.withVerifiedAllocationLease(f.request, async lease => {
        const path = allocationPath(f.root);
        if (scenario === 'file') {
          const outside = join(f.root, 'outside-allocation.json');
          await writeFile(outside, await readFile(path));
          await rm(path);
          await symlink(outside, path);
        } else {
          const attemptDirectory = dirname(path);
          const realDirectory = `${attemptDirectory}-real`;
          await rename(attemptDirectory, realDirectory);
          await symlink(realDirectory, attemptDirectory);
        }
        return identityVerifier.verifyProductionHostIdentitySource({
          lease, allocation: f.allocation, runDirectory: f.root,
        });
      }), error => error.code === 'STATE_STORAGE_SYMLINK');
    });
  }
});

test('unsafe run directories are rejected before filesystem access', async t => {
  const f = await fixture(t);
  await assert.rejects(identityVerifier.verifyProductionHostIdentitySource(null),
    error => error.code === 'HOST_SOURCE_REFERENCE_INVALID');
  await assert.rejects(f.store.withVerifiedAllocationLease(f.request, lease =>
    identityVerifier.verifyProductionHostIdentitySource({
      lease, allocation: f.allocation, runDirectory: 'relative/run',
    })), error => error.code === 'HOST_SOURCE_REFERENCE_INVALID');
});

test('restart recovery requires fresh chain verification and a fresh active lease', async t => {
  const f = await fixture(t);
  let oldLease;
  await f.store.withVerifiedAllocationLease(f.request, lease => { oldLease = lease; });
  const restarted = createProductionAttemptAllocationStore({
    runDirectory: f.root, runId: f.runId,
  });
  const recovered = (await restarted.recover({ canonicalStageId: stage })).records[0];
  await assert.rejects(identityVerifier.verifyProductionHostIdentitySource({
    lease: oldLease, allocation: recovered, runDirectory: f.root,
  }), error => error.code === 'HOST_SOURCE_LEASE_INVALID');
  const reference = await restarted.withVerifiedAllocationLease(f.request, lease =>
    identityVerifier.verifyProductionHostIdentitySource({
      lease, allocation: recovered, runDirectory: f.root,
    }));
  assert.equal(reference.relativePath, relativeAllocationPath());
});

test('test-only Allocation stores cannot reach the verifier with a production lease', async t => {
  const f = await fixture(t, { testOnly: true });
  await assert.rejects(verify(f), error => error.code === 'ATTEMPT_LEASE_INVALID');
});
