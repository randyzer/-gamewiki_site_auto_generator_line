import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { access, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
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

test('allocation-shaped JSON has no registered production authority', () => {
  const allocation = {
    kind: 'ATTEMPT_ALLOCATION', schemaVersion: 1, producer: 'PRODUCTION_ATTEMPT_COORDINATOR',
    runId: 'prospective-allocation-run', canonicalStageId: 'keyword-research', attemptId: 11,
    requestedOperation: 'keyword-research', mappingVersion: 'stage-identity-v1',
    allocationDigest: digest('allocation'),
  };
  assert.throws(() => contractDefinition(allocation.kind, allocation.schemaVersion),
    error => error.code === 'CONTRACT_KIND_UNKNOWN');
  assert.throws(() => validateContract(allocation.kind, allocation.schemaVersion, allocation),
    error => error.code === 'CONTRACT_KIND_UNKNOWN');
  assert.equal(Object.hasOwn(allocation, 'authoritative'), false);
  assert.equal(Object.hasOwn(allocation, 'capabilities'), false);
});

test.todo('host allocates one immutable identity per run, stage and attempt');
test.todo('allocation binds requestedOperation and a stable operationDigest');
test.todo('identical allocation is idempotent and conflicting allocation fails closed');
test.todo('previous-attempt digest and sequence establish a verifiable allocation chain');
test.todo('concurrent writers have one winner and deterministic conflict behavior');
test.todo('ATTEMPT_HEAD can be reconstructed but cannot authorize allocation');
test.todo('crash recovery cannot fabricate phantom or duplicate allocations');
test.todo('genesis migration respects legacy attempt numbers without rewriting history');
test.todo('cross-run, cross-stage and cross-operation allocation replay is rejected');
test.todo('allocation alone grants no Source Set, Context, launch or approval authority');
