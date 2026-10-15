import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, writeFile, mkdir, realpath, chmod } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import * as api from '../src/entry-approval.mjs';
import { sha256 } from '../src/files.mjs';

async function setup(t) {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'local-approval-')));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'runs')); await mkdir(join(root, 'workspaces'));
  const material = join(root, 'keywords.md'); await writeFile(material, 'approved bytes');
  const binding = { kind: 'ENTRY_HOST_APPROVAL_V1', purpose: 'fresh-pipeline-only', releaseAuthorized: false,
    configuration: { workspace: root }, inputs: { rawKeywordsFile: material },
    snapshot: { executionRunId: 'execution', workspace: join(root, 'workspaces/execution/site'),
      materials: { rawKeywordsFile: { sha256: sha256('approved bytes') } } } };
  const options = { directory: join(root, 'authority'), now: () => 1000,
    // TEST ONLY: production must supply an independently authenticated channel.
    authorize: async () => ({ approver: 'TEST-independent-human', approvedAt: 900, expiresAt: 2000 }) };
  assert.equal(typeof api.createLocalEntryApprovalHost, 'function');
  return { root, binding, options, host: await api.createLocalEntryApprovalHost(options) };
}

test('local host has no implicit human identity or JSON self-approval', async t => {
  const f = await setup(t);
  const host = await api.createLocalEntryApprovalHost({ directory: join(f.root, 'denied') });
  await assert.rejects(host.issue({ ...f.binding, approved: true, approver: 'model' }), /HUMAN_CHANNEL_UNAVAILABLE/);
});

test('durable consumption survives restart and concurrent consumers have one winner', async t => {
  const f = await setup(t), ticket = await f.host.issue(f.binding);
  const second = await api.createLocalEntryApprovalHost(f.options);
  const results = await Promise.allSettled([f.host, second].map(host => host.consume({ ticket, binding: f.binding })));
  assert.equal(results.filter(x => x.status === 'fulfilled').length, 1);
  const restarted = await api.createLocalEntryApprovalHost(f.options);
  await assert.rejects(restarted.consume({ ticket, binding: f.binding }));
});

test('binding changes, expiry and forged tickets reject', async t => {
  const f = await setup(t), ticket = await f.host.issue(f.binding);
  await assert.rejects(f.host.consume({ ticket, binding: { ...f.binding, releaseAuthorized: true } }));
  await assert.rejects(f.host.consume({ ticket: '../forged', binding: f.binding }));
  const expired = await api.createLocalEntryApprovalHost({ ...f.options, now: () => 3000 });
  await assert.rejects(expired.consume({ ticket, binding: f.binding }));
});

test('prepared execution pins bytes and directory; different tickets cannot reuse destination', async t => {
  const f = await setup(t), ticket = await f.host.issue(f.binding), other = await f.host.issue(f.binding);
  const receipt = await f.host.consume({ ticket, binding: f.binding });
  const permit = await f.host.prepare({ receipt, binding: f.binding });
  await writeFile(f.binding.inputs.rawKeywordsFile, 'later mutation');
  assert.equal(await readFile(permit.inputs.rawKeywordsFile, 'utf8'), 'approved bytes');
  await permit.verify();
  const receipt2 = await f.host.consume({ ticket: other, binding: f.binding });
  await assert.rejects(f.host.prepare({ receipt: receipt2, binding: f.binding }));
  await chmod(permit.inputs.rawKeywordsFile, 0o600);
  await writeFile(permit.inputs.rawKeywordsFile, 'tamper');
  await assert.rejects(permit.verify(), /CHANGED/);
});

test('failed preparation burns ticket and never adopts an existing run', async t => {
  const f = await setup(t), ticket = await f.host.issue(f.binding);
  const receipt = await f.host.consume({ ticket, binding: f.binding });
  await mkdir(join(f.root, 'runs/execution'));
  await assert.rejects(f.host.prepare({ receipt, binding: f.binding }));
  await assert.rejects(f.host.consume({ ticket, binding: f.binding }));
});

test('separate OS processes atomically consume one durable ticket', async t => {
  const f = await setup(t), ticket = await f.host.issue(f.binding);
  const { spawn } = await import('node:child_process');
  const moduleUrl = new URL('../src/local-entry-approval.mjs', import.meta.url).href;
  const script = `import { createLocalEntryApprovalHost } from ${JSON.stringify(moduleUrl)};
    const host = await createLocalEntryApprovalHost({directory: process.argv[1], now: () => 1000});
    try { await host.consume(JSON.parse(process.argv[2])); process.exitCode = 0; }
    catch { process.exitCode = 3; }`;
  const attempt = () => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--input-type=module', '-e', script,
      f.options.directory, JSON.stringify({ ticket, binding: f.binding })], { stdio: 'ignore' });
    child.on('error', reject); child.on('exit', resolve);
  });
  assert.deepEqual((await Promise.all([attempt(), attempt(), attempt()])).sort(), [0, 3, 3]);
});

test('denial and invalid channel identity never issue a ticket', async t => {
  const f = await setup(t);
  for (const identity of [null, { approver: '', approvedAt: 900, expiresAt: 2000 },
    { approver: 'TEST', approvedAt: 1100, expiresAt: 2000 }]) {
    const host = await api.createLocalEntryApprovalHost({ ...f.options, authorize: async () => identity });
    await assert.rejects(host.issue(f.binding), /HUMAN_AUTHORIZATION_REJECTED/);
  }
});

test('approved inventory drift is blocked at executor boundary', async t => {
  const f = await setup(t);
  f.binding.configuration.inventoryPath = join(f.root, 'inventory.json');
  await writeFile(f.binding.configuration.inventoryPath, 'approved inventory');
  f.binding.snapshot.inventorySha256 = sha256('approved inventory');
  const ticket = await f.host.issue(f.binding);
  const receipt = await f.host.consume({ ticket, binding: f.binding });
  const permit = await f.host.prepare({ receipt, binding: f.binding });
  await writeFile(f.binding.configuration.inventoryPath, 'changed inventory');
  await assert.rejects(permit.verify(), /CHANGED/);
});

test('public approval audit record never contains the bearer ticket', async t => {
  const f = await setup(t), ticket = await f.host.issue(f.binding);
  const receipt = await f.host.consume({ ticket, binding: f.binding });
  const permit = await f.host.prepare({ receipt, binding: f.binding });
  assert.notEqual(receipt.approvalId, ticket);
  assert.equal((await readFile(join(permit.runDirectory, 'APPROVED_INPUTS.json'), 'utf8')).includes(ticket), false);
});

async function timedPermit(t) {
  const f = await setup(t);
  let time = 1000;
  f.binding.snapshot.stages = ['game-homepage-icon-research', 'game-innerpage-keyword-information-research'];
  const host = await api.createLocalEntryApprovalHost({ ...f.options, now: () => time });
  const ticket = await host.issue(f.binding);
  const receipt = await host.consume({ ticket, binding: f.binding });
  const permit = await host.prepare({ receipt, binding: f.binding });
  return { ...f, host, ticket, receipt, permit, setTime: value => { time = value; } };
}

test('consumed approval may start once; running beyond ticket expiry retains integrity checks', async t => {
  const f = await timedPermit(t);
  await f.permit.start();
  f.setTime(120000);
  await f.permit.verify({ stage: 'game-innerpage-keyword-information-research' });
  await assert.rejects(f.permit.start(), /ALREADY_STARTED/);
  await chmod(f.permit.inputs.rawKeywordsFile, 0o600);
  await writeFile(f.permit.inputs.rawKeywordsFile, 'tampered after expiry');
  await assert.rejects(f.permit.verify(), /IMMUTABLE_INPUT_CHANGED/);
});

test('prepared approval expiring before first start cannot authorize work', async t => {
  const f = await timedPermit(t);
  f.setTime(3000);
  await assert.rejects(f.permit.start(), /APPROVAL_EXPIRED/);
});

test('active permit cannot extend approved stages or be reused after stop', async t => {
  const f = await timedPermit(t);
  await f.permit.start();
  await assert.rejects(f.permit.verify({ stage: 'game-site-deploy-and-measurement' }), /SCOPE_REJECTED/);
  await f.permit.stop();
  await assert.rejects(f.permit.verify(), /EXECUTION_STOPPED/);
  await assert.rejects(f.permit.start(), /EXECUTION_STOPPED/);
  await assert.rejects(f.host.consume({ ticket: f.ticket, binding: f.binding }));
});

test('narrow host execution scope cannot be expanded using the original full snapshot stages', async t => {
  const f = await setup(t);
  f.binding.snapshot.stages = ['game-homepage-icon-research', 'game-innerpage-keyword-information-research'];
  f.binding.executionStages = ['game-homepage-icon-research'];
  const ticket = await f.host.issue(f.binding);
  const receipt = await f.host.consume({ ticket, binding: f.binding });
  const permit = await f.host.prepare({ receipt, binding: f.binding });
  await permit.start();
  await permit.verify({ stage: 'game-homepage-icon-research' });
  await assert.rejects(permit.verify({ stage: 'game-innerpage-keyword-information-research' }), /SCOPE_REJECTED/);
});

test('runtime audit is separate from one-time bearer credential and remains bound to approval', async t => {
  const f = await timedPermit(t);
  await f.permit.start();
  const { readdir } = await import('node:fs/promises');
  const auditPath = (await readdir(f.options.directory)).find(name => name.endsWith('.execution.json'));
  assert.ok(auditPath);
  const bytes = await readFile(join(f.options.directory, auditPath), 'utf8');
  assert.equal(bytes.includes(f.ticket), false);
  const audit = JSON.parse(bytes);
  assert.equal(audit.executionRunId, 'execution');
  assert.equal(audit.approvalId, f.receipt.approvalId);
  assert.equal(audit.bindingSha256, sha256(JSON.stringify(f.binding)));
  await chmod(join(f.options.directory, auditPath), 0o600);
  await writeFile(join(f.options.directory, auditPath), '{}');
  await assert.rejects(f.permit.verify(), /EXECUTION_AUDIT_CHANGED/);
});
