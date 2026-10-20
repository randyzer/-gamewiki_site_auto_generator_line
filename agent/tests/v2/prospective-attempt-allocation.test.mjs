import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { access, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { canonicalJson } from '../../src/contracts/canonical-json.mjs';
import { contractDefinition, validateContract } from '../../src/contracts/registry.mjs';
import { writeImmutableFile } from '../../src/state/atomic-file.mjs';
import { createRequestScopeAssessment } from '../../src/state/request-scope.mjs';
import { createStateObjectStore } from '../../src/state/state-object-store.mjs';
import { computeCommitDigest } from '../../src/state/state-records.mjs';
import { readCommitChain } from '../../src/state/stage-recovery.mjs';
import { ensureDirectoryTree } from '../../src/state/storage-boundary.mjs';
import { assertCanonicalStageId, resolveStageIdentity } from '../../src/v2/stage-identity.mjs';
import {
  computeAttemptAllocationDigest,
  computeAttemptOperationDigest,
} from '../../src/v2/production-allocation-digest.mjs';
import {
  assertTrustedAttemptAllocation,
  createProductionAttemptAllocationStore,
  createTestLegacyAttemptBoundary,
} from '../../src/v2/production-attempt-allocation-store.mjs';
import { digest, event, stageState } from '../state-helpers.mjs';

const sha256 = value => createHash('sha256').update(value).digest('hex');

async function temporaryRoot(t, prefix) {
  const root = await mkdtemp(join(tmpdir(), prefix));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

function record(overrides = {}) {
  const identity = {
    runId: 'prospective-allocation-run', stageId: 'stage-2', attemptId: 1,
    contextDigest: digest('context'), schemaBundleDigest: digest('schemas'),
  };
  const base = {
    kind: 'STAGE_COMMIT_RECORD', schemaVersion: 1, producer: 'STAGE_COMMIT_STORE', mode: 'SHADOW',
    ...identity, sequence: 1, previous: { sequence: 0, commitDigest: null },
    candidateDigest: digest('candidate'), workerStop: { phase: 'STOPPED', reason: 'PARTIAL' },
    objects: [{ role: 'diagnostic', contractKind: 'TEST', schemaVersion: 1,
      path: `objects/sha256/${digest('object')}`, sha256: digest('object'), byteLength: 1 }],
    requestScope: createRequestScopeAssessment({ required: ['STAGE_2_ACCEPTANCE'], satisfied: [] }),
    state: stageState(), nextAction: 'REQUEST_PARTIAL_HANDOFF', errors: [],
    events: [event('ATTEMPT_STARTED', 1, identity), event('WORKER_STOPPED', 2, identity)],
    ...overrides,
  };
  return { ...base, commitDigest: computeCommitDigest(base) };
}

test('canonical stage identity rejects unknown stages and incorrect mapping versions', () => {
  assert.equal(resolveStageIdentity({ namespace: 'canonical-stage-id',
    value: 'keyword-research' }).canonicalStageId, 'keyword-research');
  assert.throws(() => resolveStageIdentity({ namespace: 'canonical-stage-id', value: 'unknown-stage' }),
    error => error.code === 'STAGE_ID_UNKNOWN');
  assert.throws(() => resolveStageIdentity({ namespace: 'canonical-stage-id',
    value: 'keyword-research', mappingVersion: 'stage-identity-v2' }),
  error => error.code === 'STAGE_ID_MAPPING_VERSION_MISMATCH');
  assert.throws(() => assertCanonicalStageId('game-innerpage-keyword-information-research'),
    error => error.code === 'STAGE_ID_NON_CANONICAL');
});

test('immutable publication preserves identical bytes and refuses conflicting replacement', async t => {
  const root = await temporaryRoot(t, 'prospective-attempt-immutable-');
  const path = join(root, 'allocation.json');
  const original = Buffer.from('{"attempt":1}\n');
  assert.equal(await writeImmutableFile(path, original), true);
  assert.equal(await writeImmutableFile(path, original), false);
  assert.equal(await writeImmutableFile(path, Buffer.from('{"attempt":2}\n')), false);
  assert.deepEqual(await readFile(path), original);
});

test('storage boundary rejects unsafe components before creation and preserves valid nested directories', async t => {
  const root = await temporaryRoot(t, 'prospective-attempt-boundary-');
  const unsafe = [
    ['.'], ['..'], [''], ['a/b'], ['a\\b'], ['/absolute'],
    ['a', '..', 'escaped'], ['a', '.', 'escaped'], [null], [123], [`a\0b`],
  ];
  for (const [index, segments] of unsafe.entries()) {
    const stateRoot = join(root, `invalid-${index}`);
    await assert.rejects(ensureDirectoryTree(stateRoot, segments),
      error => error.code === 'STATE_STORAGE_PATH_INVALID', JSON.stringify(segments));
    await assert.rejects(access(stateRoot), error => error.code === 'ENOENT');
  }
  await assert.rejects(access(join(root, 'escaped')), error => error.code === 'ENOENT');

  const empty = join(root, 'empty');
  assert.equal(await ensureDirectoryTree(empty, []), empty);
  const nestedRoot = join(root, 'valid');
  const expected = join(nestedRoot, 'state', 'objects', 'sha256');
  assert.equal(await ensureDirectoryTree(nestedRoot, ['state', 'objects', 'sha256']), expected);
  assert.equal(await ensureDirectoryTree(nestedRoot, ['state', 'objects', 'sha256']), expected);
  await access(expected);

  const outside = join(root, 'outside');
  await mkdir(outside);
  await symlink(outside, join(nestedRoot, 'linked'));
  await assert.rejects(ensureDirectoryTree(nestedRoot, ['linked', 'child']),
    error => error.code === 'STATE_STORAGE_SYMLINK');
  await assert.rejects(access(join(outside, 'child')), error => error.code === 'ENOENT');
});

test('content-addressed object storage rejects digest, length and collision drift', async t => {
  const root = await temporaryRoot(t, 'prospective-attempt-objects-');
  const staging = join(root, 'staging');
  const state = join(root, 'state');
  await mkdir(staging);
  const bytes = Buffer.from('attempt-allocation-source\n');
  await writeFile(join(staging, 'source.bin'), bytes);
  const descriptor = { role: 'allocation-input', contractKind: 'TEST', schemaVersion: 1,
    sourcePath: 'source.bin', sha256: sha256(bytes), byteLength: bytes.length };
  const store = createStateObjectStore({ rootDirectory: state });

  await assert.rejects(store.publish({ ...descriptor, sha256: digest('wrong') }, { stagingRoot: staging }),
    error => error.code === 'CONTRACT_DIGEST_MISMATCH');
  await assert.rejects(store.publish({ ...descriptor, byteLength: bytes.length + 1 }, { stagingRoot: staging }),
    error => error.code === 'CONTRACT_DIGEST_MISMATCH');

  await ensureDirectoryTree(state, ['objects', 'sha256']);
  await writeFile(join(state, 'objects/sha256', descriptor.sha256), 'different-bytes\n');
  await assert.rejects(store.publish(descriptor, { stagingRoot: staging }),
    error => error.code === 'STATE_COMMIT_CORRUPT');
});

test('pure commit-chain recovery rejects invalid sequence and predecessor links', async t => {
  const root = await temporaryRoot(t, 'prospective-attempt-chain-');
  const invalidSequence = join(root, 'invalid-sequence');
  await mkdir(join(invalidSequence, 'commits'), { recursive: true });
  await writeFile(join(invalidSequence, 'commits/000000000001.json'),
    `${canonicalJson(record({ sequence: 2 }))}\n`);
  await assert.rejects(readCommitChain({ rootDirectory: invalidSequence }),
    error => error.code === 'STATE_COMMIT_CORRUPT' && /sequence/i.test(error.message));

  const invalidPredecessor = join(root, 'invalid-predecessor');
  await mkdir(join(invalidPredecessor, 'commits'), { recursive: true });
  await writeFile(join(invalidPredecessor, 'commits/000000000001.json'), `${canonicalJson(record({
    previous: { sequence: 1, commitDigest: digest('unrelated') },
  }))}\n`);
  await assert.rejects(readCommitChain({ rootDirectory: invalidPredecessor }),
    error => error.code === 'STATE_COMMIT_CORRUPT' && /predecessor/i.test(error.message));
});

test('allocation-shaped JSON cannot acquire host-owned production authority', () => {
  const allocation = {
    kind: 'ATTEMPT_ALLOCATION', schemaVersion: 1, producer: 'PRODUCTION_ATTEMPT_COORDINATOR',
    runId: 'prospective-allocation-run', canonicalStageId: 'keyword-research', attemptId: 11,
    requestedOperation: 'keyword-research', mappingVersion: 'stage-identity-v1',
    allocationDigest: digest('allocation'),
  };
  assert.equal(contractDefinition(allocation.kind, allocation.schemaVersion).producer,
    'PRODUCTION_ATTEMPT_COORDINATOR_V1');
  assert.throws(() => validateContract(allocation.kind, allocation.schemaVersion, allocation),
    error => error.code === 'CONTRACT_SCHEMA_INVALID');
  assert.equal(Object.hasOwn(allocation, 'authoritative'), false);
  assert.equal(Object.hasOwn(allocation, 'capabilities'), false);
});

const stage = 'keyword-research';
const allocationPath = (root, attemptId = 1, canonicalStageId = stage) => join(root,
  'production-preparation', 'v1', 'stages', canonicalStageId, 'attempts',
  String(attemptId).padStart(12, '0'), 'allocation.json');
const headPath = (root, canonicalStageId = stage) => join(root,
  'production-preparation', 'v1', 'stages', canonicalStageId, 'ATTEMPT_HEAD');
const operation = (expectedPrevious, overrides = {}) => ({
  canonicalStageId: stage,
  mappingVersion: 'stage-identity-v1',
  requestedOperation: stage,
  operationInputsDigest: digest('operation-inputs'),
  recoveryDecisionDigest: null,
  expectedPrevious,
  ...overrides,
});

async function allocationFixture(t, options = {}) {
  const root = await temporaryRoot(t, 'production-attempt-allocation-');
  const runId = options.runId ?? 'allocation-run';
  const store = createProductionAttemptAllocationStore({
    runDirectory: root,
    runId,
    legacyBoundary: options.legacyBoundary ?? null,
    faultInjector: options.faultInjector ?? null,
  });
  return { root, runId, store };
}

test('host allocates one immutable identity per run, stage and attempt', async t => {
  const fixture = await allocationFixture(t);
  const expectedPrevious = await fixture.store.inspect({ canonicalStageId: stage });
  const allocation = await fixture.store.allocate(operation(expectedPrevious));
  assert.equal(allocation.runId, fixture.runId);
  assert.equal(allocation.canonicalStageId, stage);
  assert.equal(allocation.attemptId, 1);
  assert.equal(allocation.allocationSequence, 1);
  assert.equal(allocation.previousAttemptId, 0);
  assert.equal(allocation.previousAllocationDigest, null);
  assert.equal(allocation.legacyBoundaryDigest, null);
  assert.equal(assertTrustedAttemptAllocation(allocation), allocation);
  assert.throws(() => assertTrustedAttemptAllocation(structuredClone(allocation)),
    error => error.code === 'ATTEMPT_IDENTITY_INVALID');
  assert.deepEqual(JSON.parse(await readFile(allocationPath(fixture.root))), allocation);
});

test('allocation persists every operation digest input and independently verifies it after restart', async t => {
  const fixture = await allocationFixture(t);
  const expectedPrevious = await fixture.store.inspect({ canonicalStageId: stage });
  const request = operation(expectedPrevious, { recoveryDecisionDigest: digest('recovery-decision') });
  const allocation = await fixture.store.allocate(request);
  assert.equal(allocation.operationDigest, computeAttemptOperationDigest({
    runId: fixture.runId,
    canonicalStageId: stage,
    mappingVersion: request.mappingVersion,
    requestedOperation: request.requestedOperation,
    operationInputsDigest: request.operationInputsDigest,
    recoveryDecisionDigest: request.recoveryDecisionDigest,
  }));
  const restarted = createProductionAttemptAllocationStore({ runDirectory: fixture.root, runId: fixture.runId });
  assert.equal((await restarted.recover({ canonicalStageId: stage })).records[0].operationDigest,
    allocation.operationDigest);

  const path = allocationPath(fixture.root);
  const original = JSON.parse(await readFile(path));
  for (const [field, value] of [
    ['operationInputsDigest', digest('tampered-inputs')],
    ['recoveryDecisionDigest', digest('tampered-recovery')],
  ]) {
    const tampered = { ...original, [field]: value };
    await writeFile(path, `${canonicalJson(tampered)}\n`);
    await assert.rejects(restarted.recover({ canonicalStageId: stage }),
      error => error.code === 'ATTEMPT_DIGEST_MISMATCH', field);
  }
});

test('identical allocation is idempotent and conflicting allocation fails closed', async t => {
  const fixture = await allocationFixture(t);
  const expectedPrevious = await fixture.store.inspect({ canonicalStageId: stage });
  const request = operation(expectedPrevious);
  const first = await fixture.store.allocate(request);
  const bytes = await readFile(allocationPath(fixture.root));
  const replay = await fixture.store.allocate(request);
  assert.equal(replay.allocationDigest, first.allocationDigest);
  assert.deepEqual(await readFile(allocationPath(fixture.root)), bytes);
  await assert.rejects(fixture.store.allocate(operation(expectedPrevious, {
    operationInputsDigest: digest('different-inputs'),
  })), error => error.code === 'ATTEMPT_ALLOCATION_CONFLICT');
  await assert.rejects(access(allocationPath(fixture.root, 2)), error => error.code === 'ENOENT');
});

test('previous-attempt digest and sequence establish a verifiable allocation chain', async t => {
  const fixture = await allocationFixture(t);
  const first = await fixture.store.allocate(operation(await fixture.store.inspect({ canonicalStageId: stage })));
  const second = await fixture.store.allocate(operation(await fixture.store.inspect({ canonicalStageId: stage }), {
    operationInputsDigest: digest('second-inputs'),
  }));
  assert.equal(second.attemptId, 2);
  assert.equal(second.allocationSequence, 2);
  assert.equal(second.previousAttemptId, 1);
  assert.equal(second.previousAllocationDigest, first.allocationDigest);
  assert.equal(second.legacyBoundaryDigest, null);
  const path = allocationPath(fixture.root, 2);
  const original = JSON.parse(await readFile(path));
  const boundaryTampered = { ...original, legacyBoundaryDigest: digest('late-legacy-boundary') };
  boundaryTampered.allocationDigest = computeAttemptAllocationDigest(boundaryTampered);
  await writeFile(path, `${canonicalJson(boundaryTampered)}\n`);
  await assert.rejects(fixture.store.recover({ canonicalStageId: stage }),
    error => error.code === 'ATTEMPT_PREDECESSOR_MISMATCH');

  const tampered = { ...original };
  tampered.previousAllocationDigest = digest('unrelated-predecessor');
  tampered.allocationDigest = computeAttemptAllocationDigest(tampered);
  await writeFile(path, `${canonicalJson(tampered)}\n`);
  await assert.rejects(fixture.store.recover({ canonicalStageId: stage }),
    error => error.code === 'ATTEMPT_PREDECESSOR_MISMATCH');
});

test('concurrent writers have one winner and deterministic conflict behavior', async t => {
  const fixture = await allocationFixture(t);
  const expectedPrevious = await fixture.store.inspect({ canonicalStageId: stage });
  const requests = [
    operation(expectedPrevious, { operationInputsDigest: digest('left') }),
    operation(expectedPrevious, { operationInputsDigest: digest('right') }),
  ];
  const outcomes = await Promise.allSettled(requests.map(request => fixture.store.allocate(request)));
  assert.equal(outcomes.filter(item => item.status === 'fulfilled').length, 1);
  assert.equal(outcomes.find(item => item.status === 'rejected').reason.code, 'ATTEMPT_ALLOCATION_CONFLICT');
  assert.deepEqual(await readdir(join(fixture.root, 'production-preparation/v1/stages', stage, 'attempts')),
    ['000000000001']);
});

test('ATTEMPT_HEAD is reconstructed from the chain and cannot authorize allocation', async t => {
  const fixture = await allocationFixture(t);
  const allocation = await fixture.store.allocate(operation(
    await fixture.store.inspect({ canonicalStageId: stage })));
  await writeFile(headPath(fixture.root), `${canonicalJson({
    attemptId: 99, allocationSequence: 99, allocationDigest: digest('stale-head'),
  })}\n`);
  await assert.rejects(fixture.store.recover({ canonicalStageId: stage, repairHead: false }),
    error => error.code === 'ATTEMPT_HEAD_STALE');
  const recovered = await fixture.store.recover({ canonicalStageId: stage });
  assert.equal(recovered.latest.allocationDigest, allocation.allocationDigest);
  assert.deepEqual(JSON.parse(await readFile(headPath(fixture.root))), {
    attemptId: 1, allocationSequence: 1, allocationDigest: allocation.allocationDigest,
  });
  const parsed = JSON.parse(await readFile(allocationPath(fixture.root)));
  assert.throws(() => assertTrustedAttemptAllocation(parsed),
    error => error.code === 'ATTEMPT_IDENTITY_INVALID');
});

test('crash recovery cannot fabricate phantom or duplicate allocations', async t => {
  let beforeArmed = true;
  const before = await allocationFixture(t, { faultInjector(point) {
    if (point === 'beforeAllocationPublish' && beforeArmed) {
      beforeArmed = false; throw Object.assign(new Error(point), { code: 'TEST_FAULT' });
    }
  } });
  const beforeRequest = operation(await before.store.inspect({ canonicalStageId: stage }));
  await assert.rejects(before.store.allocate(beforeRequest), error => error.code === 'TEST_FAULT');
  assert.equal((await before.store.recover({ canonicalStageId: stage })).records.length, 0);

  let afterArmed = true;
  const after = await allocationFixture(t, { faultInjector(point) {
    if (point === 'afterAllocationPublished' && afterArmed) {
      afterArmed = false; throw Object.assign(new Error(point), { code: 'TEST_FAULT' });
    }
  } });
  const afterRequest = operation(await after.store.inspect({ canonicalStageId: stage }));
  await assert.rejects(after.store.allocate(afterRequest), error => error.code === 'TEST_FAULT');
  const recovered = await after.store.recover({ canonicalStageId: stage });
  assert.equal(recovered.records.length, 1);
  assert.equal((await after.store.allocate(afterRequest)).allocationDigest,
    recovered.records[0].allocationDigest);
  assert.deepEqual(await readdir(join(after.root, 'production-preparation/v1/stages', stage, 'attempts')),
    ['000000000001']);
});

test('genesis migration respects verified legacy attempts without rewriting history', async t => {
  const boundary = createTestLegacyAttemptBoundary({
    runId: 'legacy-run', canonicalStageId: stage, mappingVersion: 'stage-identity-v1',
    verifiedHighWaterMark: 10, sourceManifestDigest: digest('legacy-manifest'),
    sourceLineageDigest: digest('legacy-lineage'),
  });
  const fixture = await allocationFixture(t, { runId: 'legacy-run', legacyBoundary: boundary });
  const historical = join(fixture.root, 'legacy-history.json');
  await writeFile(historical, '{"attempt":10}\n');
  const original = await readFile(historical);
  const allocation = await fixture.store.allocate(operation(
    await fixture.store.inspect({ canonicalStageId: stage })));
  assert.equal(allocation.attemptId, 11);
  assert.equal(allocation.previousAttemptId, 10);
  assert.equal(allocation.previousAllocationDigest, null);
  assert.equal(allocation.legacyBoundaryDigest, boundary.legacyBoundaryDigest);
  assert.deepEqual(await readFile(historical), original);

  const missingBoundaryDigest = { ...allocation };
  delete missingBoundaryDigest.legacyBoundaryDigest;
  assert.throws(() => validateContract('ATTEMPT_ALLOCATION', 1, missingBoundaryDigest),
    error => error.code === 'CONTRACT_SCHEMA_INVALID');

  const plainBoundary = structuredClone(boundary);
  assert.throws(() => createProductionAttemptAllocationStore({
    runDirectory: fixture.root, runId: 'legacy-run', legacyBoundary: plainBoundary,
  }), error => error.code === 'ATTEMPT_LEGACY_BOUNDARY_UNVERIFIED');
});

test('cross-run, cross-stage and cross-operation allocation replay is rejected', async t => {
  const fixture = await allocationFixture(t);
  await fixture.store.allocate(operation(await fixture.store.inspect({ canonicalStageId: stage })));
  const otherRun = createProductionAttemptAllocationStore({ runDirectory: fixture.root, runId: 'other-run' });
  await assert.rejects(otherRun.recover({ canonicalStageId: stage }),
    error => error.code === 'ATTEMPT_IDENTITY_INVALID');

  const homepageDirectory = join(fixture.root, 'production-preparation/v1/stages/homepage-research/attempts/000000000001');
  await mkdir(homepageDirectory, { recursive: true });
  await writeFile(join(homepageDirectory, 'allocation.json'), await readFile(allocationPath(fixture.root)));
  await assert.rejects(fixture.store.recover({ canonicalStageId: 'homepage-research' }),
    error => error.code === 'ATTEMPT_IDENTITY_INVALID');
  await rm(join(fixture.root, 'production-preparation/v1/stages/homepage-research'),
    { recursive: true, force: true });

  const expectedPrevious = await fixture.store.inspect({ canonicalStageId: 'homepage-research' });
  for (const requestedOperation of ['keyword-research', 'game-homepage-icon-research',
    'advertising-plan', 'unknown-operation']) {
    await assert.rejects(fixture.store.allocate(operation(expectedPrevious, {
      canonicalStageId: 'homepage-research', requestedOperation,
    })), error => error.code === 'ATTEMPT_OPERATION_INVALID');
  }
});

test('allocation grants no Source Set, Context, launch or approval authority', async t => {
  const fixture = await allocationFixture(t);
  const allocation = await fixture.store.allocate(operation(
    await fixture.store.inspect({ canonicalStageId: stage })));
  assert.deepEqual(Object.keys(allocation).sort(), [
    'allocationDigest', 'allocationSequence', 'attemptId', 'authorityScope', 'canonicalStageId',
    'kind', 'legacyBoundaryDigest', 'mappingVersion', 'operationDigest', 'operationInputsDigest',
    'previousAllocationDigest', 'previousAttemptId', 'producer', 'recoveryDecisionDigest',
    'requestedOperation', 'runId', 'schemaVersion',
  ].sort());
  for (const field of ['approval', 'capabilities', 'context', 'executionStart', 'launch',
    'publication', 'deployment']) assert.equal(Object.hasOwn(allocation, field), false);
  assert.equal(contractDefinition('ATTEMPT_ALLOCATION', 1).producer,
    'PRODUCTION_ATTEMPT_COORDINATOR_V1');
  assert.throws(() => contractDefinition('ATTEMPT_ALLOCATION', 2),
    error => error.code === 'CONTRACT_VERSION_UNSUPPORTED');
});
