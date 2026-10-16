import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, realpath } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { generateInventory, verifySkillSource } from '../src/skill-lock.mjs';
import { createPipeline, STAGES } from '../src/pipeline.mjs';
import { fixture, goodResult } from './helpers.mjs';

const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();

async function skillRepo(t, names = ['demo-skill']) {
  // macOS tmpdir is under the /var -> /private/var link, which safePath rejects.
  const root = await realpath(await mkdtemp(join(tmpdir(), 'skill-lock-')));
  t.after(() => rm(root, { recursive: true, force: true }));
  const skillRoot = join(root, 'skills');
  for (const name of names) {
    await mkdir(join(skillRoot, name), { recursive: true });
    await writeFile(join(skillRoot, name, 'SKILL.md'), '# Demo\n');
  }
  git(root, 'init', '-q');
  git(root, '-c', 'user.name=t', '-c', 'user.email=t@t', 'add', '.');
  git(root, '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '-m', 'init');
  const configFile = join(root, 'workflow.json');
  await writeFile(configFile, JSON.stringify({ skillRoot: 'skills', inventory: 'inventory.json', skills: names }));
  return { root, skillRoot, configFile };
}

test('inventory records only the Skill root, committed tree and skills', async t => {
  const { skillRoot, configFile } = await skillRepo(t);
  const inventory = JSON.parse(await readFile(await generateInventory(configFile), 'utf8'));
  assert.deepEqual(Object.keys(inventory), ['skillRoot', 'sourceTree', 'skills']);
  assert.equal(inventory.skillRoot, skillRoot);
  assert.equal(inventory.sourceTree, git(skillRoot, 'rev-parse', 'HEAD:./'));
});

test('a clean Skill tree matching the lock is accepted', async t => {
  const { skillRoot } = await skillRepo(t);
  await verifySkillSource(skillRoot, git(skillRoot, 'rev-parse', 'HEAD:./'));
});

test('uncommitted Skill edits are rejected with the changed path', async t => {
  const { skillRoot, configFile } = await skillRepo(t);
  const tree = git(skillRoot, 'rev-parse', 'HEAD:./');
  await writeFile(join(skillRoot, 'demo-skill', 'SKILL.md'), '# Edited by a worker\n');
  await assert.rejects(verifySkillSource(skillRoot, tree), /SKILL_SOURCE_DIRTY: uncommitted Skill changes: skills\/demo-skill\/SKILL\.md/);
  await assert.rejects(generateInventory(configFile), /SKILL_SOURCE_DIRTY: commit Skill changes before locking/);
});

test('new untracked Skill files are rejected', async t => {
  const { skillRoot } = await skillRepo(t);
  const tree = git(skillRoot, 'rev-parse', 'HEAD:./');
  await writeFile(join(skillRoot, 'demo-skill', 'extra.md'), 'injected');
  await assert.rejects(verifySkillSource(skillRoot, tree), /SKILL_SOURCE_DIRTY.*extra\.md/);
});

const commitAll = (root, message) => {
  git(root, '-c', 'user.name=t', '-c', 'user.email=t@t', 'add', '.');
  git(root, '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '-m', message);
};

test('regenerating inventory after an orchestrator commit preserves every byte', async t => {
  const { root, configFile } = await skillRepo(t);
  const before = await readFile(await generateInventory(configFile));
  const commit = git(root, 'rev-parse', 'HEAD');
  await writeFile(join(root, 'orchestrator-change.txt'), 'x');
  commitAll(root, 'orchestrator only');
  assert.notEqual(git(root, 'rev-parse', 'HEAD'), commit);
  const after = await readFile(await generateInventory(configFile));
  assert.ok(after.equals(before), 'Inventory bytes changed after an orchestrator-only commit');
});

test('a locked pipeline advances after an orchestrator commit and inventory regeneration', async t => {
  const f = await fixture(t);
  const { root, configFile } = await skillRepo(t, STAGES);
  const inventoryPath = await generateInventory(configFile);
  const pipeline = await createPipeline({ ...f.configuration, inventoryPath, executor: goodResult, inputs: f.inputs });
  const locked = pipeline.snapshot().lock;
  assert.ok(locked);
  await pipeline.advance();
  assert.equal(pipeline.snapshot().stages[0].status, 'PASSED');
  await writeFile(join(root, 'orchestrator-change.txt'), 'x');
  commitAll(root, 'orchestrator only');
  await generateInventory(configFile);
  await pipeline.advance();
  const stage = pipeline.snapshot().stages[1];
  assert.equal(stage.status, 'PASSED', stage.diagnostic?.reason);
  assert.deepEqual(pipeline.snapshot().lock, locked);
});

test('a locked pipeline rejects a committed Skill change after inventory regeneration', async t => {
  const f = await fixture(t);
  const { root, skillRoot, configFile } = await skillRepo(t, STAGES);
  const inventoryPath = await generateInventory(configFile);
  const pipeline = await createPipeline({ ...f.configuration, inventoryPath, executor: goodResult, inputs: f.inputs });
  const locked = pipeline.snapshot().lock;
  assert.ok(locked);
  await writeFile(join(skillRoot, STAGES[0], 'SKILL.md'), '# Reviewed change\n');
  commitAll(root, 'skill change');
  await generateInventory(configFile);
  await pipeline.advance();
  const stage = pipeline.snapshot().stages[0];
  assert.equal(stage.status, 'BLOCKED');
  assert.match(stage.diagnostic.reason, /SKILL_SOURCE_TREE_MISMATCH|Skill inventory changed during locked run/);
  assert.deepEqual(pipeline.snapshot().lock, locked);
});

test('commits outside the Skill directory do not invalidate the lock', async t => {
  const { root, skillRoot } = await skillRepo(t);
  const locked = git(skillRoot, 'rev-parse', 'HEAD:./');
  await writeFile(join(root, 'orchestrator-change.txt'), 'x');
  commitAll(root, 'orchestrator only');
  await verifySkillSource(skillRoot, locked);
});

test('a committed Skill change is rejected with both tree hashes', async t => {
  const { root, skillRoot } = await skillRepo(t);
  const locked = git(skillRoot, 'rev-parse', 'HEAD:./');
  await writeFile(join(skillRoot, 'demo-skill', 'SKILL.md'), '# Reviewed change\n');
  commitAll(root, 'skill change');
  const current = git(skillRoot, 'rev-parse', 'HEAD:./');
  await assert.rejects(verifySkillSource(skillRoot, locked), new RegExp(`SKILL_SOURCE_TREE_MISMATCH.*${locked}.*${current}`));
});

test('pipeline refuses to lock a run whose committed Skill source is dirty', async t => {
  const f = await fixture(t);
  const { root, skillRoot } = await skillRepo(t);
  const inventory = JSON.parse(await readFile(f.configuration.inventoryPath, 'utf8'));
  inventory.sourceTree = git(skillRoot, 'rev-parse', 'HEAD:./');
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
