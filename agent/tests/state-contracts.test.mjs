import test from 'node:test';
import assert from 'node:assert/strict';
import { contractDefinition, validateContract } from '../src/contracts/registry.mjs';
import { createStageCommitCandidate } from '../src/state/stage-commit-candidate.mjs';
import { candidateInput } from './state-helpers.mjs';
import { stageState } from './state-helpers.mjs';
import { createRequestScopeAssessment } from '../src/state/request-scope.mjs';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('P3 contracts are registered and candidate identity is deterministic', async t => {
  const root = await mkdtemp(join(tmpdir(), 'p3-contracts-')); t.after(() => import('node:fs/promises').then(fs => fs.rm(root, { recursive: true, force: true })));
  for (const [kind, version] of [['STATE_EVENT', 1], ['STAGE_COMMIT_CANDIDATE', 1],
    ['STAGE_COMMIT_RECORD', 1], ['STAGE_CHECKPOINT', 1]]) {
    assert.equal(contractDefinition(kind, version).kind, kind);
  }
  const input = await candidateInput(root);
  input.requestScope = createRequestScopeAssessment({ required: ['STAGE_2_ACCEPTANCE'], satisfied: [] });
  const first = await createStageCommitCandidate(input);
  const second = await createStageCommitCandidate(input);
  assert.equal(first.candidateDigest, second.candidateDigest);
  assert.equal(validateContract('STAGE_COMMIT_CANDIDATE', 1, first), first);
});

test('candidate rejects missing worker stop and unsafe staged paths', async t => {
  const root = await mkdtemp(join(tmpdir(), 'p3-contracts-bad-')); t.after(() => import('node:fs/promises').then(fs => fs.rm(root, { recursive: true, force: true })));
  const input = await candidateInput(root);
  input.requestScope = createRequestScopeAssessment({ required: ['STAGE_2_ACCEPTANCE'], satisfied: [] });
  await assert.rejects(createStageCommitCandidate({ ...input, workerStop: null }), error => error.code === 'STATE_CANDIDATE_INVALID');
  await assert.rejects(createStageCommitCandidate({ ...input,
    objects: [{ ...input.objects[0], sourcePath: '../escape.json' }] }), error => error.code === 'CONTRACT_PATH_INVALID');
  await assert.rejects(createStageCommitCandidate({ ...input,
    objects: [input.objects[0], { ...input.objects[0] }] }), error => error.code === 'STATE_CANDIDATE_INVALID');
  await assert.rejects(createStageCommitCandidate({ ...input, state: stageState({ gate: 'APPROVED' }) }),
    error => error.code === 'STATE_APPROVAL_ENGINE_UNAVAILABLE');
});
