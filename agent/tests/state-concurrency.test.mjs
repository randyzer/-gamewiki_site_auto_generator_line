import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { createStageCommitCandidate } from '../src/state/stage-commit-candidate.mjs';
import { acquireStageLock } from '../src/state/stage-lock.mjs';
import { createRequestScopeAssessment } from '../src/state/request-scope.mjs';
import { candidateInput } from './state-helpers.mjs';

const run = (root, file, staging) => new Promise((resolve, reject) => {
  const child = spawn(process.execPath, [new URL('./fixtures/state-commit-child.mjs', import.meta.url).pathname, root, file, staging]);
  let output = ''; child.stdout.on('data', chunk => { output += chunk; }); child.on('error', reject);
  child.on('exit', code => code === 0 ? resolve(JSON.parse(output)) : reject(new Error(`child ${code}: ${output}`)));
});

test('two independent processes competing on one previous sequence create exactly one commit', async t => {
  const root = await mkdtemp(join(tmpdir(), 'p3-concurrency-')); t.after(() => import('node:fs/promises').then(fs => fs.rm(root, { recursive: true, force: true })));
  const input = await candidateInput(root); input.requestScope = createRequestScopeAssessment({ required: ['STAGE_2_ACCEPTANCE'], satisfied: [] }); const candidate = await createStageCommitCandidate(input);
  const candidateFile = join(root, 'candidate.json'); await writeFile(candidateFile, JSON.stringify(candidate));
  const shadow = join(root, 'shadow');
  const results = await Promise.all([run(shadow, candidateFile, input.stagingRoot), run(shadow, candidateFile, input.stagingRoot)]);
  assert.deepEqual(results.map(item => item.ok).sort(), [false, true]);
  assert.equal(results.find(item => !item.ok).code, 'STATE_SEQUENCE_CONFLICT');
});

test('a held or orphaned lock is never reclaimed by timeout', async t => {
  const root = await mkdtemp(join(tmpdir(), 'p3-lock-')); t.after(() => import('node:fs/promises').then(fs => fs.rm(root, { recursive: true, force: true })));
  const lockDirectory = join(root, 'stage.lock'); const first = await acquireStageLock({ lockDirectory });
  await assert.rejects(acquireStageLock({ lockDirectory, waitMs: 20, pollMs: 2 }), error => error.code === 'STATE_LOCK_HELD');
  await first.release();
  await import('node:fs/promises').then(async fs => {
    await fs.mkdir(lockDirectory); await fs.writeFile(join(lockDirectory, 'owner.json'), JSON.stringify({ pid: 999999, token: 'unknown' }));
  });
  await assert.rejects(acquireStageLock({ lockDirectory, waitMs: 20, pollMs: 2 }), error => error.code === 'STATE_LOCK_HELD');
});
