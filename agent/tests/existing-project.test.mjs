import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile, symlink, access, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fixture } from './helpers.mjs';

async function setup(t) {
  const f = await fixture(t), source = join(f.root, 'existing'); await mkdir(source);
  execFileSync('git', ['init', '-q', source]);
  await writeFile(join(source, 'package.json'), '{"dependencies":{"astro":"7"},"scripts":{"build":"astro build"}}');
  await mkdir(join(source, 'src')); await writeFile(join(source, 'src/page.txt'), 'original');
  execFileSync('git', ['-C', source, 'add', 'package.json', 'src/page.txt']);
  execFileSync('git', ['-C', source, '-c', 'user.name=Offline Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'baseline']);
  await mkdir(join(source, 'background_information/keyword-materials'), { recursive: true });
  const keywords = join(source, 'background_information/keyword-materials/关键词.md'); await writeFile(keywords, '# user supplied keywords');
  await writeFile(join(source, '.env'), 'DO_NOT_READ_OR_COPY');
  const entry = { path: source, repository: 'offline/fixture', protectedPaths: ['background_information'] };
  const allowlist = { targets: { fixture: entry } };
  return { ...f, source, keywords, entry, allowlist };
}

test('existing project snapshots preserve source and untracked research without copying secrets or Git', async t => {
  const f = await setup(t);
  let api;
  try { api = await import('../src/existing-project.mjs'); } catch (error) { if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error; }
  assert.equal(typeof api?.prepareExistingProject, 'function');
  const directory = join(f.configuration.workspace, 'runs/existing'); await mkdir(directory, { recursive: true });
  const candidate = join(f.configuration.workspace, 'site');
  const result = await api.prepareExistingProject({ targetId: 'fixture', allowlist: f.allowlist, runDirectory: directory,
    candidateProjectPath: candidate, rawKeywordsFile: f.keywords });
  assert.equal(result.baseline.researchRootName, 'background_information');
  assert.equal(await readFile(join(candidate, 'src/page.txt'), 'utf8'), 'original');
  assert.equal(await readFile(join(candidate, 'background_information/keyword-materials/关键词.md'), 'utf8'), '# user supplied keywords');
  const { access } = await import('node:fs/promises');
  await assert.rejects(access(join(candidate, '.env')), { code: 'ENOENT' });
  await assert.rejects(access(join(candidate, '.git')), { code: 'ENOENT' });
  assert.equal(await readFile(join(f.source, 'src/page.txt'), 'utf8'), 'original');
  await assert.rejects(api.prepareExistingProject({ targetId: 'fixture', allowlist: f.allowlist, runDirectory: directory,
    candidateProjectPath: candidate, rawKeywordsFile: f.keywords }), /exists|EEXIST/);
});

test('unknown target, symlinks and source/candidate overlap are rejected', async t => {
  const f = await setup(t); const api = await import('../src/existing-project.mjs');
  const options = { allowlist: f.allowlist, runDirectory: join(f.configuration.workspace, 'run'), rawKeywordsFile: f.keywords };
  await assert.rejects(api.prepareExistingProject({ ...options, targetId: 'unknown', candidateProjectPath: join(f.configuration.workspace, 'site') }), /allowlist/);
  await assert.rejects(api.prepareExistingProject({ ...options, targetId: 'fixture', candidateProjectPath: join(f.source, 'candidate') }), /overlap/);
  await symlink(join(f.source, 'src/page.txt'), join(f.source, 'link'));
  await assert.rejects(api.prepareExistingProject({ ...options, targetId: 'fixture', candidateProjectPath: join(f.configuration.workspace, 'site') }), /Linked|symlink/);
});

test('baseline detects source content and keyword bytes changing at the same path', async t => {
  const f = await setup(t); const { captureBaseline, verifyBaseline } = await import('../src/project-baseline.mjs');
  const baseline = await captureBaseline(f.entry, f.keywords);
  const { sha256 } = await import('../src/files.mjs');
  const { digest, snapshotPolicyVersion, ...legacy } = baseline;
  await assert.rejects(verifyBaseline({ ...legacy, digest: sha256(JSON.stringify(legacy)) }, f.entry), /Snapshot policy changed/);
  await writeFile(f.keywords, 'changed keyword bytes');
  await assert.rejects(verifyBaseline(baseline, f.entry), /drift|changed/);
});

test('task card rejects arbitrary directories and promotion/release permissions', async t => {
  const f = await setup(t); const { validateIntakeCard } = await import('../src/intake-card.mjs');
  const card = { schemaVersion: 1, mode: 'existing-project', targetId: 'fixture', gameIdentity: 'Offline Fixture', objective: 'rebuild', rawKeywordsFile: f.keywords,
    canonicalOrigin: 'https://fixture.test', repository: 'offline/fixture', deploymentProvider: 'Vercel', adRequested: false,
    allowedOperations: ['read-source', 'write-candidate'], promotionPolicy: 'review-required' };
  assert.equal(validateIntakeCard(card).targetId, 'fixture');
  assert.throws(() => validateIntakeCard({ ...card, projectPath: '/somewhere' }), /Unknown/);
  assert.throws(() => validateIntakeCard({ ...card, allowedOperations: ['write-source'] }), /operation/);
});

test('snapshots exclude credential directories and caches and reject credentials in candidates', async t => {
  const f = await setup(t);
  for (const path of ['.ssh/id_rsa', '.aws/config', '.config/gcloud/application_default_credentials.json', '.cache/compiler.bin']) {
    await mkdir(join(f.source, path, '..'), { recursive: true });
    await writeFile(join(f.source, path), 'OFFLINE FIXTURE ONLY');
  }
  const { prepareExistingProject } = await import('../src/existing-project.mjs');
  const candidate = join(f.configuration.workspace, 'candidate');
  const { baseline } = await prepareExistingProject({ targetId: 'fixture', allowlist: f.allowlist,
    runDirectory: join(f.configuration.workspace, 'run'), candidateProjectPath: candidate, rawKeywordsFile: f.keywords });
  assert.ok(baseline.files.every(file => !file.path.startsWith('.ssh/') && !file.path.startsWith('.aws/') &&
    !file.path.startsWith('.config/gcloud/') && !file.path.startsWith('.cache/')));
  for (const directory of ['.ssh', '.aws', '.cache']) await assert.rejects(access(join(candidate, directory)), { code: 'ENOENT' });
  await mkdir(join(candidate, '.ssh')); await writeFile(join(candidate, '.ssh/id_rsa'), 'OFFLINE FIXTURE ONLY');
  const { candidateDiff } = await import('../src/candidate-diff.mjs');
  await assert.rejects(candidateDiff(baseline, candidate), /credential/);
});

test('interrupted snapshot resumes a partial staging directory or a committed candidate', async t => {
  const f = await setup(t), { captureBaseline } = await import('../src/project-baseline.mjs');
  const { prepareExistingProject } = await import('../src/existing-project.mjs');
  const baseline = await captureBaseline(f.entry, f.keywords);
  const runDirectory = join(f.configuration.workspace, 'run'), candidateProjectPath = join(f.configuration.workspace, 'candidate');
  await mkdir(runDirectory);
  const staging = candidateProjectPath + '.snapshot'; await mkdir(staging);
  await writeFile(join(staging, 'incomplete.txt'), 'partial copy');
  const pending = { schemaVersion: 1, targetId: 'fixture', candidateProjectPath, baseline };
  await writeFile(join(runDirectory, 'SNAPSHOT_PENDING.json'), JSON.stringify(pending));
  const result = await prepareExistingProject({ targetId: 'fixture', allowlist: f.allowlist, runDirectory,
    candidateProjectPath, rawKeywordsFile: f.keywords });
  assert.equal(result.baseline.digest, baseline.digest);
  assert.equal(await readFile(join(candidateProjectPath, 'src/page.txt'), 'utf8'), 'original');
  await assert.rejects(access(staging), { code: 'ENOENT' });
  await assert.rejects(access(join(runDirectory, 'SNAPSHOT_PENDING.json')), { code: 'ENOENT' });
  const { unlink } = await import('node:fs/promises'); await unlink(join(runDirectory, 'BASELINE.json'));
  await writeFile(join(runDirectory, 'SNAPSHOT_PENDING.json'), JSON.stringify(pending));
  assert.equal((await prepareExistingProject({ targetId: 'fixture', allowlist: f.allowlist, runDirectory,
    candidateProjectPath, rawKeywordsFile: f.keywords })).baseline.digest, baseline.digest);
  assert.ok((await readdir(runDirectory)).includes('BASELINE.json'));
});
