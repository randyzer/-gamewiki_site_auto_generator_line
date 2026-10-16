import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile, chmod, lstat, symlink, link, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fixture } from './helpers.mjs';
import { STAGE } from '../src/stages.mjs';
import { sha256 } from '../src/files.mjs';
import * as recovery from '../src/keyword-recovery.mjs';

async function setup(t) {
  const f = await fixture(t), runDirectory = join(f.configuration.workspace, 'runs/recovery');
  const context = { runId: 'recovery', runDirectory, outputDirectory: join(runDirectory, 'artifacts/1/5'),
    inputs: f.inputs, skillLock: { source: join(f.root, 'skills', STAGE.KEYWORD_RESEARCH + '.md'),
      sha256: sha256(STAGE.KEYWORD_RESEARCH) } };
  context.nativeDirectory = join(context.outputDirectory, 'native');
  await mkdir(join(context.nativeDirectory, 'evidence'), { recursive: true });
  await writeFile(join(context.nativeDirectory, 'keywords.json'), '["Fixture guide"]');
  await writeFile(join(context.nativeDirectory, 'Fixture guide素材.md'), '- 状态: PARTIAL\n- 缺口: unavailable source');
  await writeFile(join(context.nativeDirectory, 'evidence/search.json'), '{"synthetic":true}');
  await writeFile(join(context.nativeDirectory, 'unsafe.py'), 'raise RuntimeError("never execute")');
  await writeFile(join(context.nativeDirectory, 'worker-result.json'), '{"status":"PASSED"}');
  return { f, context, next: { ...context, outputDirectory: join(runDirectory, 'artifacts/1/6'),
    nativeDirectory: join(runDirectory, 'artifacts/1/6/native') } };
}

test('host snapshot preserves data and hashes, excludes executable/control files and cannot promote partials', async t => {
  const { context, next } = await setup(t);
  const ref = await recovery.captureKeywordRecovery(context, { reason: 'WORKER_TIMEOUT' });
  const verified = await recovery.verifyKeywordRecovery(next, ref);
  assert.equal(sha256(await readFile(ref.manifestPath)), ref.sha256);
  assert.equal(verified.sourceAttempt, 5);
  assert.equal(verified.countsAsStageArtifact, false);
  assert.equal(verified.files.length, 3);
  assert.ok(verified.files.every(file => /^[a-f0-9]{64}$/.test(file.sha256)));
  assert.match(await readFile(join(verified.directory, 'data/Fixture guide素材.md'), 'utf8'), /PARTIAL/);
  assert.equal((await lstat(ref.manifestPath)).mode & 0o222, 0);
  assert.equal((await lstat(join(verified.directory, 'data/keywords.json'))).mode & 0o222, 0);
  assert.deepEqual(await readdir(join(verified.directory, 'data')), ['Fixture guide素材.md', 'evidence', 'keywords.json']);
  const second = await recovery.captureKeywordRecovery(context, { reason: 'WORKER_TIMEOUT' });
  assert.notEqual(second.manifestPath, ref.manifestPath);
  assert.equal(sha256(await readFile(ref.manifestPath)), ref.sha256);
});

test('explicit reuse rejects changed data, wrong digest and same/future attempts', async t => {
  const { context, next } = await setup(t);
  const ref = await recovery.captureKeywordRecovery(context, { reason: 'WORKER_TIMEOUT' });
  await assert.rejects(recovery.verifyKeywordRecovery(next, { ...ref, sha256: 'a'.repeat(64) }), /RECOVERY/);
  await assert.rejects(recovery.verifyKeywordRecovery(context, ref), /RECOVERY/);
  const directory = dirname(ref.manifestPath), target = join(directory, 'data/keywords.json');
  await chmod(target, 0o600); await writeFile(target, '["changed"]');
  await assert.rejects(recovery.verifyKeywordRecovery(next, ref), /RECOVERY/);
});

test('reuse binds game, run, raw input, optional lineage and locked Skill', async t => {
  const { context, next, f } = await setup(t);
  const lineage = join(f.root, 'lineage.md'); await writeFile(lineage, 'original lineage');
  context.inputs.keywordSourceLineageFile = lineage;
  const ref = await recovery.captureKeywordRecovery(context, { reason: 'WORKER_TIMEOUT' });
  for (const patch of [{ gameIdentity: 'Other' }, { keywordSourceLineageFile: undefined }])
    await assert.rejects(recovery.verifyKeywordRecovery({ ...next, inputs: { ...next.inputs, ...patch } }, ref), /RECOVERY/);
  await writeFile(lineage, 'changed lineage');
  await assert.rejects(recovery.verifyKeywordRecovery(next, ref), /RECOVERY/);
  await writeFile(lineage, 'original lineage');
  await writeFile(f.inputs.rawKeywordsFile, 'changed raw');
  await assert.rejects(recovery.verifyKeywordRecovery(next, ref), /RECOVERY/);
});

test('snapshot rejects linked evidence and refuses to follow paths outside the exact attempt', async t => {
  for (const kind of ['symlink', 'hardlink']) await t.test(kind, async t => {
    const { context, f } = await setup(t), target = join(context.nativeDirectory, 'evidence/escape.json');
    await (kind === 'symlink' ? symlink : link)(f.inputs.rawKeywordsFile, target);
    await assert.rejects(recovery.captureKeywordRecovery(context, { reason: 'WORKER_TIMEOUT' }), /Linked|RECOVERY/);
  });
  const { context } = await setup(t);
  await assert.rejects(recovery.captureKeywordRecovery({ ...context,
    nativeDirectory: dirname(context.nativeDirectory) }, { reason: 'WORKER_TIMEOUT' }), /RECOVERY/);
});

test('crafted manifest paths, omitted files and foreign snapshot roots are rejected', async t => {
  const { context, next } = await setup(t);
  const ref = await recovery.captureKeywordRecovery(context, { reason: 'WORKER_TIMEOUT' });
  const manifest = JSON.parse(await readFile(ref.manifestPath));
  await chmod(ref.manifestPath, 0o600);
  for (const files of [manifest.files.slice(1), [{ ...manifest.files[0], path: '../keywords.json' }]]) {
    const bytes = JSON.stringify({ ...manifest, files }); await writeFile(ref.manifestPath, bytes);
    await assert.rejects(recovery.verifyKeywordRecovery(next, { ...ref, sha256: sha256(bytes) }), /RECOVERY/);
  }
  await assert.rejects(recovery.verifyKeywordRecovery({ ...next, runId: 'foreign',
    runDirectory: join(context.runDirectory, 'other') }, ref), /RECOVERY/);
});

test('Skill content changes and oversized data cannot become reusable evidence', async t => {
  const { context, next } = await setup(t);
  const ref = await recovery.captureKeywordRecovery(context, { reason: 'WORKER_TIMEOUT' });
  await writeFile(context.skillLock.source, 'changed skill');
  await assert.rejects(recovery.verifyKeywordRecovery(next, ref), /RECOVERY/);
  await writeFile(context.skillLock.source, STAGE.KEYWORD_RESEARCH);
  await writeFile(join(context.nativeDirectory, 'large.txt'), Buffer.alloc(33 * 1024 * 1024, 32));
  await assert.rejects(recovery.captureKeywordRecovery(context, { reason: 'WORKER_TIMEOUT' }), /RECOVERY|32 MiB/);
});

test('a file selection does not silently include the rest of a snapshot', async t => {
  const { context, next } = await setup(t);
  const ref = await recovery.captureKeywordRecovery(context, { reason: 'WORKER_TIMEOUT' });
  const selected = await recovery.verifyKeywordRecovery(next, { ...ref, files: ['evidence/search.json'] });
  assert.deepEqual(selected.files.map(file => file.path), ['evidence/search.json']);
  for (const files of [[], ['missing.json'], ['keywords.json', 'keywords.json']])
    await assert.rejects(recovery.verifyKeywordRecovery(next, { ...ref, files }), /RECOVERY/);
});

test('stopped-attempt capture holds the run lock and leaves the run manifest unchanged', async t => {
  const { context } = await setup(t);
  const manifestPath = join(context.runDirectory, 'manifest.json');
  const bytes = JSON.stringify({ runId: context.runId, inputs: context.inputs,
    lock: { skills: [{ name: STAGE.KEYWORD_RESEARCH, ...context.skillLock }] },
    stages: [{ skill: STAGE.KEYWORD_RESEARCH, status: 'FAILED', checkpoint: { attempt: 5 } }] });
  await writeFile(manifestPath, bytes);
  await writeFile(join(context.runDirectory, '.lock'), 'existing writer');
  await assert.rejects(recovery.captureStoppedKeywordAttempt(context.runDirectory, 5), /EEXIST|busy/);
  const { unlink } = await import('node:fs/promises'); await unlink(join(context.runDirectory, '.lock'));
  const ref = await recovery.captureStoppedKeywordAttempt(context.runDirectory, 5);
  assert.ok(ref.sha256);
  assert.equal(await readFile(manifestPath, 'utf8'), bytes);
  await assert.rejects(recovery.captureStoppedKeywordAttempt(context.runDirectory, 4), /RECOVERY/);
});
