import test from 'node:test';
import assert from 'node:assert/strict';
import { chmod, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStageCommitCandidate } from '../src/state/stage-commit-candidate.mjs';
import { createStageCommitStore, createTestStageCommitStore } from '../src/state/stage-commit-store.mjs';
import { recoverStage } from '../src/state/stage-recovery.mjs';
import { candidateInput } from './state-helpers.mjs';
import { createRequestScopeAssessment } from '../src/state/request-scope.mjs';
import { canonicalJson } from '../src/contracts/canonical-json.mjs';
import { computeCommitDigest } from '../src/state/state-records.mjs';

test('recovery rebuilds HEAD and manifest after post-commit projection failure', async t => {
  const root = await mkdtemp(join(tmpdir(), 'p3-recovery-')); t.after(() => import('node:fs/promises').then(fs => fs.rm(root, { recursive: true, force: true })));
  const input = await candidateInput(root); input.requestScope = createRequestScopeAssessment({ required: ['STAGE_2_ACCEPTANCE'], satisfied: [] }); const candidate = await createStageCommitCandidate(input);
  const shadow = join(root, 'shadow');
  const store = createTestStageCommitStore({ rootDirectory: shadow, faultInjector(name) {
    if (name === 'beforeHeadUpdate') throw Object.assign(new Error(name), { code: 'TEST_FAULT' });
  } });
  await assert.rejects(store.commit(candidate, { stagingRoot: input.stagingRoot }));
  const recovered = await recoverStage({ rootDirectory: shadow, repairProjections: true });
  assert.equal(recovered.checkpoint.sequence, 1);
  assert.equal(JSON.parse(await readFile(join(shadow, 'HEAD'), 'utf8')).sequence, 1);
  assert.equal(JSON.parse(await readFile(join(shadow, 'projections/manifest.json'), 'utf8')).status, 'PARTIAL');
});

test('P3 persistently rejects APPROVED commits until P4 supplies the approval engine', async t => {
  const root = await mkdtemp(join(tmpdir(), 'p3-approved-')); t.after(() => import('node:fs/promises').then(fs => fs.rm(root, { recursive: true, force: true })));
  const input = await candidateInput(root); const candidate = await createStageCommitCandidate(input);
  const shadow = join(root, 'shadow'); await createStageCommitStore({ rootDirectory: shadow }).commit(candidate, { stagingRoot: input.stagingRoot });
  const commitPath = join(shadow, 'commits/000000000001.json'); const record = JSON.parse(await readFile(commitPath));
  record.state.gate = { status: 'APPROVED', approvalDigest: 'f'.repeat(64) };
  record.commitDigest = computeCommitDigest(record); await chmod(commitPath, 0o600);
  await writeFile(commitPath, `${canonicalJson(record)}\n`);
  await assert.rejects(recoverStage({ rootDirectory: shadow }), error => error.code === 'STATE_APPROVAL_ENGINE_UNAVAILABLE');
});

test('recovery rejects symbolic links in authoritative object storage', async t => {
  const root = await mkdtemp(join(tmpdir(), 'p3-symlink-')); t.after(() => import('node:fs/promises').then(fs => fs.rm(root, { recursive: true, force: true })));
  const input = await candidateInput(root); const candidate = await createStageCommitCandidate(input);
  const shadow = join(root, 'shadow'); const record = await createStageCommitStore({ rootDirectory: shadow }).commit(candidate, { stagingRoot: input.stagingRoot });
  const objectPath = join(shadow, record.objects[0].path); const bytes = await readFile(objectPath);
  const external = join(root, 'external-object'); await writeFile(external, bytes); await rm(objectPath); await symlink(external, objectPath);
  await assert.rejects(recoverStage({ rootDirectory: shadow }), error => error.code === 'STATE_STORAGE_SYMLINK');
});

test('recovery fails closed for missing or replaced immutable objects', async t => {
  const root = await mkdtemp(join(tmpdir(), 'p3-corrupt-')); t.after(() => import('node:fs/promises').then(fs => fs.rm(root, { recursive: true, force: true })));
  const input = await candidateInput(root); input.requestScope = createRequestScopeAssessment({ required: ['STAGE_2_ACCEPTANCE'], satisfied: [] }); const candidate = await createStageCommitCandidate(input);
  const shadow = join(root, 'shadow'); const record = await createStageCommitStore({ rootDirectory: shadow }).commit(candidate, { stagingRoot: input.stagingRoot });
  const objectPath = join(shadow, record.objects[0].path);
  await chmod(objectPath, 0o600);
  await writeFile(objectPath, 'tampered');
  await assert.rejects(recoverStage({ rootDirectory: shadow }), error => error.code === 'STATE_COMMIT_CORRUPT');
  await rm(objectPath, { force: true });
  await assert.rejects(recoverStage({ rootDirectory: shadow }), error => error.code === 'STATE_COMMIT_CORRUPT');
});

test('recovery rejects request-scope drift inside an otherwise valid commit chain', async t => {
  const root = await mkdtemp(join(tmpdir(), 'p3-scope-drift-')); t.after(() => import('node:fs/promises').then(fs => fs.rm(root, { recursive: true, force: true })));
  const shadow = join(root, 'shadow'); const store = createStageCommitStore({ rootDirectory: shadow });
  const firstInput = await candidateInput(root); const first = await createStageCommitCandidate(firstInput);
  const firstRecord = await store.commit(first, { stagingRoot: firstInput.stagingRoot });
  const secondInput = await candidateInput(root, { attemptId: 11,
    expectedPrevious: { sequence: firstRecord.sequence, commitDigest: firstRecord.commitDigest } });
  const second = await createStageCommitCandidate(secondInput);
  await store.commit(second, { stagingRoot: secondInput.stagingRoot });

  const secondPath = join(shadow, 'commits/000000000002.json');
  const record = JSON.parse(await readFile(secondPath));
  record.requestScope = createRequestScopeAssessment({ required: ['DIFFERENT_REQUEST'], satisfied: [] });
  record.commitDigest = computeCommitDigest(record); await chmod(secondPath, 0o600);
  await writeFile(secondPath, `${canonicalJson(record)}\n`);
  await assert.rejects(recoverStage({ rootDirectory: shadow }), error => error.code === 'STATE_COMMIT_CORRUPT');
});
