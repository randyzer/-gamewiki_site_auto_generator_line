import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fixture, goodResult, until, offlineApprovalConsumer } from './helpers.mjs';
import { createOrchestrator } from '../src/orchestrator.mjs';
import { Store, Queue, handler } from '../feishu-ai-employee/src/core.mjs';

test('existing-project task uses candidate, skips copy honestly, preserves source and blocks incompatible integration', async t => {
  const f = await fixture(t), source = join(f.root, 'existing'); await mkdir(source);
  execFileSync('git', ['init', '-q', source]);
  execFileSync('git', ['-C', source, 'remote', 'add', 'origin', 'https://github.com/offline/fixture.git']);
  await writeFile(join(source, 'package.json'), '{"dependencies":{"astro":"7"},"scripts":{"build":"astro build"}}');
  await writeFile(join(source, 'package-lock.json'), '{}'); await writeFile(join(source, 'game.config.ts'), 'https://fixture.test');
  execFileSync('git', ['-C', source, 'add', 'package.json', 'package-lock.json', 'game.config.ts']);
  execFileSync('git', ['-C', source, '-c', 'user.name=fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'baseline']);
  await mkdir(join(source, 'background_information/keyword-materials'), { recursive: true });
  const rawKeywordsFile = join(source, 'background_information/keyword-materials/关键词.md'); await writeFile(rawKeywordsFile, 'user supplied keyword');
  const card = { schemaVersion: 1, mode: 'existing-project', targetId: 'fixture', gameIdentity: 'Offline Fixture', objective: 'rebuild fixture',
    rawKeywordsFile, canonicalOrigin: 'https://fixture.test', repository: 'offline/fixture', deploymentProvider: 'Vercel', adRequested: false,
    allowedOperations: ['read-source', 'write-candidate'], promotionPolicy: 'review-required' };
  const configuration = { ...f.configuration, inspectTools: false,
    existingProjectAllowlist: { targets: { fixture: { path: source, repository: 'offline/fixture', protectedPaths: ['background_information'] } } } };
  const calls = [];
  const execute = createOrchestrator({ approvalConsumer: offlineApprovalConsumer, configuration, executor: async (skill, context) => { calls.push(skill); return goodResult(skill, context); } });
  const store = new Store(join(f.root, 'db')); t.after(() => store.close());
  const queue = new Queue(store, execute, async () => {}), replies = [];
  const h = handler({ store, queue, allowed: new Set(['owner']), reply: async (_id, text) => replies.push(text) });
  const event = text => ({ sender: { sender_id: { open_id: 'owner' } }, message: { message_id: 'same-message', chat_id: 'offline',
    chat_type: 'p2p', message_type: 'text', content: JSON.stringify({ text }) } });
  await h(event('/start ' + JSON.stringify(card)));
  const id = store.list('owner')[0].id; await until(() => store.get(id, 'owner').status === 'blocked');
  await h(event('/start ' + JSON.stringify(card))); assert.equal(store.list('owner').length, 1);
  const result = JSON.parse(store.get(id, 'owner').result);
  assert.equal(result.source_writes, false); assert.equal(calls.length, 2);
  const manifest = JSON.parse(await readFile(join(f.configuration.workspace, 'runs', id, 'manifest.json')));
  assert.equal(manifest.stages[2].status, 'SKIPPED'); assert.equal(manifest.stages[2].artifacts.length, 0);
  assert.match(manifest.stages[3].evidence.join(' '), /CONTRACT_INCOMPATIBLE/);
  assert.equal(await readFile(rawKeywordsFile, 'utf8'), 'user supplied keyword');
  assert.equal(await readFile(join(source, 'game.config.ts'), 'utf8'), 'https://fixture.test');
  assert.equal(await readFile(join(result.candidate_project_path, 'background_information/keyword-materials/关键词.md'), 'utf8'), 'user supplied keyword');
  await assert.rejects(execute({ id, inputs: JSON.stringify({ ...card, objective: 'changed card' }) }), /Task card changed/);
});

test('Feishu rejects arbitrary target paths in versioned task cards before creating jobs', async t => {
  const f = await fixture(t), store = new Store(join(f.root, 'db')); t.after(() => store.close());
  const queue = new Queue(store, async () => { throw Error('must not execute'); }, async () => {}), replies = [];
  const h = handler({ store, queue, allowed: new Set(['owner']), reply: async (_id, text) => replies.push(text) });
  await h({ sender: { sender_id: { open_id: 'owner' } }, message: { message_id: 'bad', chat_id: 'offline', chat_type: 'p2p', message_type: 'text',
    content: JSON.stringify({ text: '/start {"schemaVersion":1,"mode":"existing-project","projectPath":"/arbitrary"}' }) } });
  assert.equal(store.list('owner').length, 0); assert.match(replies[0], /rejected/);
});

test('existing-project rejects overlapping workspace before writing any files into source', async t => {
  const f = await fixture(t), source = join(f.root, 'existing'); await mkdir(source);
  execFileSync('git', ['init', '-q', source]);
  execFileSync('git', ['-C', source, 'remote', 'add', 'origin', 'https://github.com/offline/fixture.git']);
  await writeFile(join(source, 'package.json'), '{"dependencies":{"astro":"7"},"scripts":{"build":"astro build"}}');
  await writeFile(join(source, 'package-lock.json'), '{}'); await writeFile(join(source, 'game.config.ts'), 'https://fixture.test');
  execFileSync('git', ['-C', source, 'add', '.']);
  execFileSync('git', ['-C', source, '-c', 'user.name=fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'baseline']);
  const rawKeywordsFile = join(source, 'keywords.md'); await writeFile(rawKeywordsFile, 'original keywords');
  const card = { schemaVersion: 1, mode: 'existing-project', targetId: 'fixture', gameIdentity: 'Fixture', objective: 'rebuild',
    rawKeywordsFile, canonicalOrigin: 'https://fixture.test', repository: 'offline/fixture', deploymentProvider: 'Vercel', adRequested: false,
    allowedOperations: ['read-source', 'write-candidate'], promotionPolicy: 'review-required' };
  const configuration = { ...f.configuration, workspace: join(source, 'workspace'), inspectTools: false,
    existingProjectAllowlist: { targets: { fixture: { path: source, repository: 'offline/fixture' } } } };
  const before = await readdir(source);
  await assert.rejects(createOrchestrator({ approvalConsumer: offlineApprovalConsumer, configuration, executor: async () => { throw Error("must not execute"); } })({ id: 'overlap', inputs: JSON.stringify(card) }), /overlap/);
  assert.deepEqual(await readdir(source), before);
  const { existingProjectPreflight } = await import('../src/existing-project-preflight.mjs');
  await assert.rejects(existingProjectPreflight(card, { allowlist: configuration.existingProjectAllowlist,
    runDirectory: join(source, 'report'), inspectTools: false }), /overlap/);
  assert.deepEqual(await readdir(source), before);
});
