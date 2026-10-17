import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStageCommitCandidate } from '../src/state/stage-commit-candidate.mjs';
import { createStageCommitStore, createTestStageCommitStore } from '../src/state/stage-commit-store.mjs';
import { candidateInput, digest } from './state-helpers.mjs';
import { createRequestScopeAssessment } from '../src/state/request-scope.mjs';

test('commit record is the only commit point and is immutable', async t => {
  const root = await mkdtemp(join(tmpdir(), 'p3-transaction-')); t.after(() => import('node:fs/promises').then(fs => fs.rm(root, { recursive: true, force: true })));
  const input = await candidateInput(root); input.requestScope = createRequestScopeAssessment({ required: ['STAGE_2_ACCEPTANCE'], satisfied: [] }); const candidate = await createStageCommitCandidate(input);
  const store = createStageCommitStore({ rootDirectory: join(root, 'shadow') });
  const record = await store.commit(candidate, { stagingRoot: input.stagingRoot });
  assert.equal(record.sequence, 1);
  assert.equal((await readdir(join(root, 'shadow/commits'))).filter(name => /^\d{12}\.json$/.test(name)).length, 1);
  assert.equal(JSON.parse(await readFile(join(root, 'shadow/HEAD'), 'utf8')).commitDigest, record.commitDigest);
  await assert.rejects(store.commit(candidate, { stagingRoot: input.stagingRoot }), error => error.code === 'STATE_SEQUENCE_CONFLICT');
});

test('crash before and after commit point has deterministic authority', async t => {
  for (const [point, committed] of [['beforeCommitPoint', false], ['afterCommitPoint', true]]) {
    const root = await mkdtemp(join(tmpdir(), `p3-fault-${point}-`)); t.after(() => import('node:fs/promises').then(fs => fs.rm(root, { recursive: true, force: true })));
    const input = await candidateInput(root); input.requestScope = createRequestScopeAssessment({ required: ['STAGE_2_ACCEPTANCE'], satisfied: [] }); const candidate = await createStageCommitCandidate(input);
    const store = createTestStageCommitStore({ rootDirectory: join(root, 'shadow'), faultInjector(name) {
      if (name === point) throw Object.assign(new Error(point), { code: 'TEST_FAULT' });
    } });
    await assert.rejects(store.commit(candidate, { stagingRoot: input.stagingRoot }), error => error.code === 'TEST_FAULT');
    const commits = await readdir(join(root, 'shadow/commits')).catch(() => []);
    assert.equal(commits.some(name => /^\d{12}\.json$/.test(name)), committed);
  }
});

test('a later candidate cannot drift from the committed context or request scope', async t => {
  const root = await mkdtemp(join(tmpdir(), 'p3-chain-binding-')); t.after(() => import('node:fs/promises').then(fs => fs.rm(root, { recursive: true, force: true })));
  const shadow = join(root, 'shadow'); const store = createStageCommitStore({ rootDirectory: shadow });
  const firstInput = await candidateInput(root); const first = await createStageCommitCandidate(firstInput);
  const record = await store.commit(first, { stagingRoot: firstInput.stagingRoot });
  const predecessor = { sequence: record.sequence, commitDigest: record.commitDigest };

  const changedContextInput = await candidateInput(root, { attemptId: 11, expectedPrevious: predecessor,
    contextDigest: digest('changed-context') });
  const changedContext = await createStageCommitCandidate(changedContextInput);
  await assert.rejects(store.commit(changedContext, { stagingRoot: changedContextInput.stagingRoot }),
    error => error.code === 'STATE_CONTEXT_MISMATCH');

  const changedScopeInput = await candidateInput(root, { attemptId: 11, expectedPrevious: predecessor,
    requestScope: createRequestScopeAssessment({ required: ['DIFFERENT_REQUEST'], satisfied: [] }) });
  const changedScope = await createStageCommitCandidate(changedScopeInput);
  await assert.rejects(store.commit(changedScope, { stagingRoot: changedScopeInput.stagingRoot }),
    error => error.code === 'STATE_CONTEXT_MISMATCH');
});
