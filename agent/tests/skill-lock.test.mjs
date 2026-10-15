import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, realpath } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { generateInventory, verifySkillSource } from '../src/skill-lock.mjs';
import { createPipeline } from '../src/pipeline.mjs';
import { fixture, goodResult } from './helpers.mjs';

const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();

async function skillRepo(t) {
  // macOS tmpdir is under the /var -> /private/var link, which safePath rejects.
  const root = await realpath(await mkdtemp(join(tmpdir(), 'skill-lock-')));
  t.after(() => rm(root, { recursive: true, force: true }));
  const skillRoot = join(root, 'skills');
  await mkdir(join(skillRoot, 'demo-skill'), { recursive: true });
  await writeFile(join(skillRoot, 'demo-skill', 'SKILL.md'), '# Demo\n');
  git(root, 'init', '-q');
  git(root, '-c', 'user.name=t', '-c', 'user.email=t@t', 'add', '.');
  git(root, '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '-m', 'init');
  const configFile = join(root, 'workflow.json');
  await writeFile(configFile, JSON.stringify({ skillRoot: 'skills', inventory: 'inventory.json', skills: ['demo-skill'] }));
  return { root, skillRoot, configFile };
}

test('inventory records the git commit that contains the Skills', async t => {
  const { root, configFile } = await skillRepo(t);
  const inventory = JSON.parse(await readFile(await generateInventory(configFile), 'utf8'));
  assert.equal(inventory.sourceCommit, git(root, 'rev-parse', 'HEAD'));
});

test('a clean Skill tree at the locked commit is accepted', async t => {
  const { root, skillRoot } = await skillRepo(t);
  await verifySkillSource(skillRoot, git(root, 'rev-parse', 'HEAD'));
});

test('uncommitted Skill edits are rejected with the changed path', async t => {
  const { root, skillRoot } = await skillRepo(t);
  const commit = git(root, 'rev-parse', 'HEAD');
  await writeFile(join(skillRoot, 'demo-skill', 'SKILL.md'), '# Edited by a worker\n');
  await assert.rejects(verifySkillSource(skillRoot, commit), /SKILL_SOURCE_DIRTY.*demo-skill\/SKILL\.md/);
});

test('new untracked Skill files are rejected', async t => {
  const { root, skillRoot } = await skillRepo(t);
  const commit = git(root, 'rev-parse', 'HEAD');
  await writeFile(join(skillRoot, 'demo-skill', 'extra.md'), 'injected');
  await assert.rejects(verifySkillSource(skillRoot, commit), /SKILL_SOURCE_DIRTY.*extra\.md/);
});

test('a different HEAD commit than the lock is rejected with both commits', async t => {
  const { root, skillRoot } = await skillRepo(t);
  const locked = git(root, 'rev-parse', 'HEAD');
  await writeFile(join(root, 'unrelated.txt'), 'x');
  git(root, '-c', 'user.name=t', '-c', 'user.email=t@t', 'add', '.');
  git(root, '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '-m', 'next');
  const head = git(root, 'rev-parse', 'HEAD');
  await assert.rejects(verifySkillSource(skillRoot, locked), new RegExp(`SKILL_SOURCE_COMMIT_MISMATCH.*${locked}.*${head}`));
});

test('pipeline refuses to lock a run whose committed Skill source is dirty', async t => {
  const f = await fixture(t);
  const { root, skillRoot } = await skillRepo(t);
  const inventory = JSON.parse(await readFile(f.configuration.inventoryPath, 'utf8'));
  inventory.sourceCommit = git(root, 'rev-parse', 'HEAD');
  inventory.skillRoot = skillRoot;
  for (const skill of inventory.skills) {
    const file = join(skillRoot, skill.name + '.md');
    await writeFile(file, skill.name);
    skill.source = file;
  }
  await writeFile(f.configuration.inventoryPath, JSON.stringify(inventory));
  // Skill files were written after the commit, so the tree is dirty.
  const pipeline = await createPipeline({ ...f.configuration, executor: goodResult, inputs: f.inputs });
  assert.equal(pipeline.snapshot().lock, null);
  assert.match(pipeline.snapshot().lockError, /SKILL_SOURCE_DIRTY/);
});
