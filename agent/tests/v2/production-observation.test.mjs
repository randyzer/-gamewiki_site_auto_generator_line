import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createPipeline } from '../../src/pipeline.mjs';
import { assertTrustedObservationSnapshot,
  createProductionObservation } from '../../src/v2/production-observation.mjs';
import { fixture, goodResult } from '../helpers.mjs';

const sha256 = 'a'.repeat(64);

function legacyCommit(overrides = {}) {
  return {
    runId: 'run-1',
    canonicalStageId: 'homepage-research',
    attemptId: 1,
    legacyInputDigest: sha256,
    sourceRevision: 'source-1',
    checkpoint: { attempt: 1, inputDigest: sha256, next: 'Advance next stage' },
    artifacts: [{ sha256: 'b'.repeat(64) }],
    legacyStatus: 'PASSED',
    deploymentExecuted: false,
    committedSequence: 4,
    ...overrides,
  };
}

test('disabled observation is a no-op and never invokes an observer', async () => {
  let calls = 0;
  assert.throws(() => createProductionObservation({ mode: 'DISABLED', observer: () => calls++ }),
    /DISABLED.*observer/i);
  const observation = createProductionObservation();
  assert.equal(observation.mode, 'DISABLED');
  assert.equal(observation.latest(), null);
  assert.equal(calls, 0);
});

test('shadow observer receives only a deeply frozen non-authoritative snapshot', async () => {
  let received;
  const observation = createProductionObservation({ mode: 'SHADOW_READ_ONLY', observer: async snapshot => {
    received = snapshot;
    assert.equal(Object.isFrozen(snapshot), true);
    assert.equal(Object.isFrozen(snapshot.artifactDigests), true);
    assert.equal(Object.hasOwn(snapshot, 'checkpoint'), false);
    assert.equal(Object.hasOwn(snapshot, 'executor'), false);
    assert.equal(Object.hasOwn(snapshot, 'capabilities'), false);
    return { status: 'PASSED', deploymentExecuted: true };
  } });
  const outcome = await observation.observeLegacyCommit(legacyCommit());
  assert.equal(outcome.status, 'OBSERVED');
  assert.equal(outcome.authoritative, false);
  assert.equal(outcome.observerResultAccepted, false);
  assert.equal(received.authority, 'LEGACY');
  assert.equal(received.digestSemantics, 'LEGACY_INPUT_DIGEST');
  assert.equal(received.legacyInputDigest, sha256);
  assert.equal(Object.hasOwn(received, 'contextDigest'), false);
  assert.equal(received.canonicalStageId, 'homepage-research');
  assert.deepEqual(received.artifactDigests, ['b'.repeat(64)]);
  assert.equal(assertTrustedObservationSnapshot(received), received);
  assert.throws(() => assertTrustedObservationSnapshot(structuredClone(received)),
    /trusted observation snapshot/i);
});

test('observation rejects capability injection and identity or digest mismatches', async () => {
  const observation = createProductionObservation({ mode: 'SHADOW_READ_ONLY', observer: async () => null });
  for (const commit of [
    legacyCommit({ executor: async () => {} }),
    legacyCommit({ canonicalStageId: 'game-homepage-icon-research' }),
    legacyCommit({ legacyInputDigest: 'bad' }),
    legacyCommit({ attemptId: 0 }),
    legacyCommit({ attemptId: 2 }),
    legacyCommit({ legacyInputDigest: 'c'.repeat(64) }),
    legacyCommit({ artifacts: [{ sha256: 'bad' }] }),
  ]) {
    const outcome = await observation.observeLegacyCommit(commit);
    assert.equal(outcome.status, 'OBSERVATION_FAILED');
    assert.match(outcome.code, /POLICY_DENIED|IDENTITY_MISMATCH|CONTRACT_INVALID/);
  }
});

test('observer mutation and exceptions remain isolated from the legacy commit', async () => {
  const commit = legacyCommit();
  const before = structuredClone(commit);
  const observation = createProductionObservation({ mode: 'SHADOW_READ_ONLY', observer: async snapshot => {
    snapshot.artifactDigests.push('c'.repeat(64));
  } });
  const outcome = await observation.observeLegacyCommit(commit);
  assert.equal(outcome.status, 'OBSERVATION_FAILED');
  assert.equal(outcome.code, 'OBSERVER_ERROR');
  assert.deepEqual(commit, before);
  assert.deepEqual(observation.latest(), outcome);
});

test('pipeline rejects an untrusted observation hook', async t => {
  const f = await fixture(t);
  await assert.rejects(createPipeline({ ...f.configuration, inputs: f.inputs, executor: goodResult,
    productionObservation: { mode: 'SHADOW_READ_ONLY', observeLegacyCommit: async () => {} } }),
  /trusted production observation/i);
});

test('pipeline default path preserves legacy behavior without observation', async t => {
  const f = await fixture(t);
  const pipeline = await createPipeline({ ...f.configuration, inputs: f.inputs, executor: goodResult });
  const before = pipeline.snapshot();
  const after = await pipeline.advance();
  assert.equal(before.stages[0].status, 'NOT_STARTED');
  assert.equal(after.stages[0].status, 'PASSED');
  assert.equal(after.deploymentExecuted, false);
  assert.equal(await readFile(pipeline.manifestPath, 'utf8'), JSON.stringify(after, null, 2) + '\n');
});

test('pipeline observes exactly once after the committed legacy result', async t => {
  const f = await fixture(t);
  let calls = 0;
  const observation = createProductionObservation({ mode: 'SHADOW_READ_ONLY', observer: async snapshot => {
    calls++;
    const manifest = JSON.parse(await readFile(`${f.configuration.workspace}/runs/${snapshot.runId}/manifest.json`, 'utf8'));
    assert.equal(manifest.sequence, snapshot.committedSequence);
    assert.equal(manifest.stages[0].status, 'PASSED');
    return { status: 'PASSED' };
  } });
  const pipeline = await createPipeline({ ...f.configuration, inputs: f.inputs, executor: goodResult,
    productionObservation: observation });
  const state = await pipeline.advance();
  assert.equal(calls, 1);
  assert.equal(state.stages[0].status, 'PASSED');
  assert.equal(state.deploymentExecuted, false);
  assert.equal(observation.latest().status, 'OBSERVED');
});

test('observer failure never changes a committed legacy result', async t => {
  const f = await fixture(t);
  const observation = createProductionObservation({ mode: 'SHADOW_READ_ONLY', observer: async () => {
    throw Error('synthetic observer failure');
  } });
  const pipeline = await createPipeline({ ...f.configuration, inputs: f.inputs, executor: goodResult,
    productionObservation: observation });
  const state = await pipeline.advance();
  assert.equal(state.stages[0].status, 'PASSED');
  assert.equal(observation.latest().status, 'OBSERVATION_FAILED');
  assert.equal(observation.latest().code, 'OBSERVER_ERROR');
  const disk = JSON.parse(await readFile(pipeline.manifestPath, 'utf8'));
  assert.deepEqual(disk, state);
});

test('WAITING_FOR_USER exits before observation and never adds execution', async t => {
  const f = await fixture(t);
  let calls = 0;
  const observation = createProductionObservation({ mode: 'SHADOW_READ_ONLY', observer: async () => { calls++; } });
  const pipeline = await createPipeline({ ...f.configuration, inputs: { ...f.inputs, objective: '' },
    executor: async () => assert.fail('worker must not run'), productionObservation: observation });
  const state = await pipeline.advance();
  assert.equal(state.stages[0].status, 'WAITING_FOR_USER');
  assert.equal(calls, 0);
  assert.equal(observation.latest(), null);
  assert.equal(state.deploymentExecuted, false);
});
