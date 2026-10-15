import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { Store, Queue, handler } from '../feishu-ai-employee/src/core.mjs';
import { createOrchestrator } from '../src/orchestrator.mjs';
import { fixture, goodResult, until, offlineApprovalConsumer } from './helpers.mjs';

const event = (id, text, owner = 'owner') => ({ sender: { sender_id: { open_id: owner } }, message: {
  message_id: id, chat_id: 'offline-chat', chat_type: 'p2p', message_type: 'text', content: JSON.stringify({ text }) } });

test('Feishu offline full flow: pause, missing input, resume, plan approval, duplicates and owner isolation', async t => {
  const f = await fixture(t); const store = new Store(join(f.root, 'jobs.sqlite')); t.after(() => store.close());
  let release; const gate = new Promise(r => { release = r; }); const calls = [];
  const execute = createOrchestrator({ approvalConsumer: offlineApprovalConsumer, configuration: f.configuration, executor: async (skill, context) => {
    calls.push(skill); if (calls.length === 1) await gate; return goodResult(skill, context);
  } });
  const notifications = [], replies = [];
  const queue = new Queue(store, execute, async (_t, text) => notifications.push(text));
  const handle = handler({ store, queue, reply: async (_id, text) => replies.push(text), allowed: new Set(['owner', 'other']) });
  const inputs = { ...f.inputs }; delete inputs.rawKeywordsFile;
  await handle(event('start', '/start ' + JSON.stringify(inputs)));
  const id = store.list('owner')[0].id;
  await until(() => calls.length === 1);
  await handle(event('pause', '/pause ' + id)); release();
  await until(() => store.get(id, 'owner').status === 'paused');
  assert.equal(calls.length, 1);
  await handle(event('resume', '/resume ' + id));
  await until(() => store.get(id, 'owner').status === 'waiting_input');
  assert.equal(calls.length, 1);
  await handle(event('inputs', '/inputs ' + id)); assert.match(replies.at(-1), /rawKeywordsFile/);
  await handle(event('supply', '/input ' + id + ' ' + JSON.stringify({ rawKeywordsFile: f.inputs.rawKeywordsFile })));
  await until(() => JSON.parse(store.get(id, 'owner').result || '{}').plan_digest);
  assert.equal(calls.length, 7);
  const result = JSON.parse(store.get(id, 'owner').result), digest = result.plan_digest;
  assert.equal(result.stage, 'game-site-deploy-and-measurement');
  assert.equal(result.deployment_executed, false);
  await handle(event('forbidden', '/approve ' + id + ' ' + digest, 'other')); assert.equal(replies.at(-1), 'Not found');
  await handle(event('wrong', '/approve ' + id + ' wrong')); assert.match(replies.at(-1), /rejected/);
  await handle(event('reject', '/reject ' + id));
  assert.equal(store.get(id, 'owner').status, 'paused');
  await handle(event('reopen', '/resume ' + id));
  await until(() => store.get(id, 'owner').status === 'waiting_input');
  assert.equal(calls.length, 7);
  store.db.prepare('UPDATE approvals SET expires_at=0 WHERE task_id=?').run(id);
  await handle(event('expired', '/approve ' + id + ' ' + digest)); assert.match(replies.at(-1), /expired/);
  await handle(event('renew', '/resume ' + id));
  await until(() => store.get(id, 'owner').status === 'waiting_input');
  await handle(event('approve', '/approve ' + id + ' ' + digest));
  await until(() => store.get(id, 'owner').status === 'succeeded');
  await handle(event('approve', '/approve ' + id + ' ' + digest));
  assert.equal(calls.length, 7);
  assert.equal(store.db.prepare('SELECT used FROM approvals WHERE task_id=?').get(id).used, 1);
  const manifest = JSON.parse(await readFile(join(f.configuration.workspace, 'runs', id, 'manifest.json')));
  assert.deepEqual(manifest.stages.slice(0, 7).map(s => s.status), Array(7).fill('PASSED'));
  assert.equal(manifest.deploymentExecuted, false);
});

test('Feishu task failures surface the stage, actual reason and diagnostic path without credentials', async t => {
  const f = await fixture(t), store = new Store(join(f.root, 'failure.sqlite')); t.after(() => store.close());
  const execute = createOrchestrator({ approvalConsumer: offlineApprovalConsumer, configuration: f.configuration, executor: async () => {
    throw Object.assign(Error('Required source file missing; token=PRIVATE_FEISHU_VALUE'), { code: 'ENOENT' });
  } });
  const notifications = [], queue = new Queue(store, execute, async (_task, text) => notifications.push(text));
  const task = store.create({ messageId: 'failure', owner: 'owner', chatId: 'offline', text: 'fixture', inputs: f.inputs });
  queue.add(task); await until(() => store.get(task.id, 'owner').status === 'failed');
  const serialized = store.get(task.id, 'owner').result, result = JSON.parse(serialized);
  assert.equal(result.stage, 'game-homepage-icon-research');
  assert.match(result.summary, /Required source file missing/);
  assert.equal(result.diagnostic.code, 'ENOENT');
  assert.ok(result.diagnostic.recordPath.includes('/diagnostics/'));
  assert.doesNotMatch(serialized, /PRIVATE_FEISHU_VALUE/);
  await until(() => notifications.length > 0);
  assert.match(notifications[0], /Required source file missing/);
  assert.doesNotMatch(notifications[0], /PRIVATE_FEISHU_VALUE/);
});

test('new-site Feishu tasks accept per-game metadata without requiring an existing-project card', async t => {
  const f = await fixture(t), store = new Store(join(f.root, 'metadata.sqlite')); t.after(() => store.close());
  const replies = [], queue = new Queue(store, async () => ({ status: 'WAITING_FOR_USER', missing_inputs: ['rawKeywordsFile'] }), async () => {});
  const handle = handler({ store, queue, reply: async (_id, text) => replies.push(text), allowed: new Set(['owner']) });
  const gameMetadata = { steamAppId: '570', steam: 'https://store.steampowered.com/app/570/Dota_2/' };
  await handle(event('metadata-start', '/start ' + JSON.stringify({ gameIdentity: 'Dota 2', objective: 'Create a guide', gameMetadata })));
  assert.doesNotMatch(replies.at(-1), /Unknown input field/);
  const task = store.list('owner')[0];
  assert.ok(task);
  await until(() => store.get(task.id, 'owner').status === 'waiting_input');
  assert.deepEqual(JSON.parse(store.get(task.id, 'owner').inputs).gameMetadata, gameMetadata);
  await handle(event('metadata-secret', '/input ' + task.id + ' ' + JSON.stringify({ gameMetadata: { ...gameMetadata, apiKey: 'PRIVATE_METADATA_VALUE' } })));
  assert.match(replies.at(-1), /Do not send credentials/);
  assert.doesNotMatch(store.get(task.id, 'owner').inputs, /PRIVATE_METADATA_VALUE/);
});

test('queued jobs survive restart; acknowledgement and notification failures never re-execute', async t => {
  const f = await fixture(t); const file = join(f.root, 'jobs.sqlite');
  let store = new Store(file);
  const job = store.create({ messageId: 'queued', owner: 'owner', chatId: 'offline', text: 'fixture' }); store.close();
  store = new Store(file); let calls = 0, deliveries = 0;
  const queue = new Queue(store, async () => { calls++; return { status: 'BLOCKED' }; }, async () => { deliveries++; throw Error('Offline transport failure'); });
  await until(() => store.get(job.id, 'owner').status === 'blocked');
  assert.equal(calls, 1); await until(() => !queue.outboxBusy);
  store.close(); store = new Store(file); t.after(() => store.close());
  const restored = new Queue(store, async () => { calls++; return { status: 'PASSED' }; }, async () => { deliveries++; });
  store.db.exec('UPDATE outbox SET next_at=0'); await restored.flushOutbox();
  assert.equal(calls, 1); assert.equal(store.db.prepare('SELECT sent FROM outbox').get().sent, 1);
  const handle = handler({ store, queue: restored, allowed: new Set(['owner']), reply: async () => { throw Error('No reply transport'); } });
  await handle(event('ack-fails', 'offline task'));
  await until(() => store.list('owner').some(t => t.status === 'succeeded'));
  assert.equal(calls, 2);
});

test('second queue cannot corrupt a running task or dispatch duplicate work', async t => {
  const f = await fixture(t); const file = join(f.root, 'jobs.sqlite');
  const store = new Store(file); t.after(() => store.close());
  let release; const gate = new Promise(r => { release = r; });
  const queue = new Queue(store, async () => { await gate; return { status: 'PARTIAL' }; }, async () => {});
  const task = store.create({ messageId: 'race', owner: 'owner', chatId: 'offline', text: 'fixture' }); queue.add(task);
  const other = new Store(file);
  assert.equal(other.get(task.id, 'owner').status, 'running');
  assert.throws(() => new Queue(other, async () => {}, async () => {}), /already running/); other.close();
  release(); await until(() => store.get(task.id, 'owner').status === 'partial');
});

test('approval inputs cannot be forged through structured input command', async t => {
  const f = await fixture(t); const store = new Store(join(f.root, 'db')); t.after(() => store.close());
  const replies = []; const queue = new Queue(store, async () => ({ status: 'WAITING_FOR_USER', missing_inputs: ['gameIdentity'] }), async () => {});
  const h = handler({ store, queue, allowed: new Set(['owner']), reply: async (_id, x) => replies.push(x) });
  await h(event('start', '/start {}'));
  const id = store.list('owner')[0].id; await until(() => store.get(id, 'owner').status === 'waiting_input');
  await h(event('forged', '/input ' + id + ' {"deploymentPlanApproval":{"approved":true,"digest":"fake"}}'));
  assert.match(replies.at(-1), /Unknown input field/);
  assert.equal(store.get(id, 'owner').status, 'waiting_input');
});

test('approval succeeds despite reply failure; restart only retries reply and never replays approval or work', async t => {
  const f = await fixture(t), file = join(f.root, 'replies.sqlite');
  let store = new Store(file), executions = 0;
  const executor = async task => {
    executions++;
    return JSON.parse(task.inputs).deploymentPlanApproval
      ? { status: 'PASSED', summary: 'Offline plan acknowledged' }
      : { status: 'WAITING_FOR_USER', stage: 6, plan_digest: 'offline-digest', missing_inputs: ['deploymentPlanApproval'] };
  };
  const queue = new Queue(store, executor, async () => {});
  const h = handler({ store, queue, allowed: new Set(['owner']), reply: async (_id, text) => {
    if (text.startsWith('Acknowledged')) throw Error('Offline reply outage');
  } });
  await h(event('start', '/start {}')); const id = store.list('owner')[0].id;
  await until(() => store.get(id, 'owner').status === 'waiting_input');
  await h(event('approval-message', '/approve ' + id + ' offline-digest'));
  await until(() => store.get(id, 'owner').status === 'succeeded' && !queue.replyBusy && !queue.outboxBusy);
  assert.equal(executions, 2);
  assert.equal(store.db.prepare('SELECT delivery_state FROM replies WHERE message_id=?').get('approval-message').delivery_state, 'PENDING');
  store.close(); store = new Store(file); t.after(() => store.close());
  const deliveries = [];
  const restored = new Queue(store, executor, async () => {}, { reply: async (id, text) => deliveries.push({ id, text }) });
  store.db.exec('UPDATE replies SET next_at=0'); await restored.flushReplies();
  assert.equal(executions, 2);
  assert.match(deliveries.find(x => x.id === 'approval-message').text, /^Acknowledged/);
  assert.equal(store.db.prepare('SELECT delivery_state FROM replies WHERE message_id=?').get('approval-message').delivery_state, 'SENT');
  const h2 = handler({ store, queue: restored, allowed: new Set(['owner']), reply: restored.reply });
  await h2(event('approval-message', '/approve ' + id + ' offline-digest'));
  assert.equal(executions, 2); assert.equal(deliveries.filter(x => x.id === 'approval-message').length, 1);
});

test('command reply retries are bounded with durable FAILED status', async t => {
  const f = await fixture(t), store = new Store(join(f.root, 'failed.sqlite')); t.after(() => store.close());
  let attempts = 0;
  const queue = new Queue(store, async () => {}, async () => {}, { reply: async () => { attempts++; throw Error('Offline outage'); } });
  store.recordReply('reply', 'owner', 'Offline reply');
  for (let i = 0; i < 5; i++) { store.db.exec('UPDATE replies SET next_at=0'); await queue.flushReplies(); }
  const record = store.db.prepare('SELECT * FROM replies').get();
  assert.equal(attempts, 3); assert.equal(record.attempts, 3); assert.equal(record.delivery_state, 'FAILED');
});
