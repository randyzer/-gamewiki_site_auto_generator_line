import test from 'node:test';
import assert from 'node:assert/strict';
import { createOrchestrator } from '../src/orchestrator.mjs';
import { fixture, goodResult } from './helpers.mjs';
import { mkdir, writeFile, readFile, rm, access, symlink, readdir, chmod } from 'node:fs/promises';
import { createMacLocalEntryApprovalHost } from '../src/local-entry-approval.mjs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { spawnSync } from 'node:child_process';
import { AGENT_ROOT } from '../src/skill-lock.mjs';
import { createEntry, previewEntryHandoff, inspectEntrySkills } from '../src/entry-v1.mjs';
import { sha256 } from '../src/files.mjs';
import { loadConfiguration } from '../src/orchestrator.mjs';
import { previewEntryResume } from '../src/entry-resume-snapshot.mjs';
import { OFFLINE_STAGE4_READINESS_CAPABILITY } from '../src/pipeline.mjs';

test('new trusted input approval resumes missing canonical, preserves original approval and confirms exact plan without worker', async t => {
  const f = await handoffFixture(t);
  const host = await f.api.createLocalEntryApprovalHost({ directory: join(f.directory, 'patch-authority'),
    authorize: async () => ({ approver: 'SYNTHETIC TEST', approvedAt: Date.now()-1, expiresAt: Date.now()+60000 }) });
  let calls = 0;
  const execute = createOrchestrator({ configuration: f.configuration,
    approvalConsumer: f.api.createEntryApprovalConsumer({ host }), executor: async (skill, context) => {
      calls++; return goodResult(skill, context);
    } });
  const first = await execute({ ...f.task, approval: { snapshot: f.snapshot, ticket: await host.issue(f.binding) } });
  assert.equal(first.status, 'WAITING_FOR_USER');
  assert.equal(calls, 3);
  const approvalPath = join(f.configuration.workspace, 'runs', f.task.id, 'APPROVED_INPUTS.json');
  const originalApproval = await readFile(approvalPath);
  const snapshot = await previewEntryResume(f.task.id, f.configuration, { patch: {
    canonicalOrigin: 'https://fixture.test', domain: 'fixture.test', siteRevision: 'SYNTHETIC revision1',
    repo: 'fixture/repo', branch: 'main', deploymentProvider: 'Vercel', dns: { provider: 'SYNTHETIC Cloudflare', recordsReviewed: true },
    deploymentPlanAuthorized: true } });
  const binding = f.api.entryResumeApprovalBinding(snapshot, f.configuration);
  const second = await execute({ id: f.task.id, retry: true, inputs: JSON.stringify(binding.inputs),
    approval: { snapshot, ticket: await host.issue(binding) } });
  assert.equal(second.status, 'WAITING_FOR_USER');
  assert.equal(second.stage, 'game-site-deploy-and-measurement');
  assert.equal(calls, 7);
  assert.deepEqual(await readFile(approvalPath), originalApproval);
  const confirm = await previewEntryResume(f.task.id, f.configuration, { planDigest: second.plan_digest });
  const confirmBinding = f.api.entryResumeApprovalBinding(confirm, f.configuration);
  const task = { id: f.task.id, inputs: JSON.stringify(confirmBinding.inputs),
    approval: { snapshot: confirm, ticket: await host.issue(confirmBinding) } };
  const final = await execute(task);
  assert.equal(final.status, 'PASSED');
  assert.equal(final.deployment_executed, false);
  assert.equal(calls, 7);
  await assert.rejects(execute(task));
  assert.deepEqual(await readFile(approvalPath), originalApproval);
});

test('replacement keywords require new approval, use versioned immutable copies and reject drift/scope changes', async t => {
  const f=await handoffFixture(t), authority=join(f.directory,'replacement-authority');
  const host=await f.api.createLocalEntryApprovalHost({directory:authority,
    authorize:async()=>({approver:'SYNTHETIC TEST',approvedAt:Date.now()-1,expiresAt:Date.now()+60000})});
  let calls=0,observed;
  const execute=createOrchestrator({configuration:f.configuration,
    approvalConsumer:f.api.createEntryApprovalConsumer({host}),executor:async(_skill,ctx)=>{
      calls++; observed=ctx.inputs.rawKeywordsFile;
      if(_skill==='game-homepage-icon-research')return goodResult(_skill,ctx);
      return{status:'BLOCKED',artifacts:[],missing_inputs:[],evidence:['SYNTHETIC known stop']};
    }});
  await execute({...f.task,approval:{snapshot:f.snapshot,ticket:await host.issue(f.binding)}});
  const newKeywords=join(f.directory,'supplement.md');await writeFile(newKeywords,'SYNTHETIC newly supplied');
  const snapshot=await previewEntryResume(f.task.id,f.configuration,{patch:{rawKeywordsFile:newKeywords}});
  assert.equal(snapshot.firstAffectedStage,'game-innerpage-keyword-information-research');
  const binding=f.api.entryResumeApprovalBinding(snapshot,f.configuration);
  const ticket=await host.issue(binding);
  const result=await execute({id:f.task.id,retry:true,inputs:JSON.stringify(binding.inputs),approval:{snapshot,ticket}});
  assert.equal(result.status,'BLOCKED');assert.equal(calls,3);
  const approvedOriginal=(await previewEntryResume(f.task.id,f.configuration)).inputs.rawKeywordsFile;
  assert.notEqual(observed,newKeywords);assert.match(observed,/\/runs\/[^/]+\/inputs\/raw-/);
  assert.ok(approvedOriginal.includes('approved-input-revisions'));
  assert.equal(await readFile(observed,'utf8'),'SYNTHETIC newly supplied');
  assert.equal(await readFile(approvedOriginal,'utf8'),'SYNTHETIC newly supplied');
  for(const patch of [{gameIdentity:'changed'},{projectPath:'/tmp/other'},{uiMode:'optimize'},
    {deploymentPlanApproval:{approved:true,digest:'x'}},{adsEnabled:true}])
    await assert.rejects(previewEntryResume(f.task.id,f.configuration,{patch}),/SCOPE_REJECTED/);
  const newer=join(f.directory,'newer.md');await writeFile(newer,'SYNTHETIC approved new bytes');
  const changed=await previewEntryResume(f.task.id,f.configuration,{patch:{rawKeywordsFile:newer}});
  const changedBinding=f.api.entryResumeApprovalBinding(changed,f.configuration),changedTicket=await host.issue(changedBinding);
  await writeFile(newer,'SYNTHETIC drift before consume');
  await assert.rejects(execute({id:f.task.id,retry:true,inputs:JSON.stringify(changedBinding.inputs),
    approval:{snapshot:changed,ticket:changedTicket}}),/ENTRY_RESUME_CHANGED/);
  assert.equal(calls,3);
});

test('fresh trusted resume binds one checkpoint, rejects replay and concurrent consumption, and never repeats unknown effects', async t => {
  const f = await handoffFixture(t);
  const host = await f.api.createLocalEntryApprovalHost({ directory: join(f.directory, 'resume-authority'),
    authorize: async () => ({ approver: 'SYNTHETIC TEST', approvedAt: Date.now() - 1, expiresAt: Date.now() + 60000 }) });
  let calls = 0;
  const execute = createOrchestrator({ configuration: f.configuration,
    approvalConsumer: f.api.createEntryApprovalConsumer({ host }), executor: async () => {
      calls++; return { status: 'BLOCKED', artifacts: [], missing_inputs: [], evidence: ['SYNTHETIC staged stop'] };
    } });
  await execute({ ...f.task, approval: { snapshot: f.snapshot, ticket: await host.issue(f.binding) } });
  const snapshot = await previewEntryResume(f.task.id, f.configuration);
  const binding = f.api.entryResumeApprovalBinding(snapshot, f.configuration);
  const ticket = await host.issue(binding);
  const secondTicket = await host.issue(binding);
  const task = { id: f.task.id, retry: true, inputs: JSON.stringify(binding.inputs), approval: { snapshot, ticket } };
  const outcomes = await Promise.allSettled([execute(task), execute({ ...task, approval: { snapshot, ticket: secondTicket } })]);
  assert.equal(outcomes.filter(x => x.status === 'fulfilled').length, 1);
  assert.equal(calls, 2);
  const next = await previewEntryResume(f.task.id, f.configuration);
  const nextBinding = f.api.entryResumeApprovalBinding(next, f.configuration);
  const nextTicket = await host.issue(nextBinding);
  await mkdir(next.inputs.projectPath, { recursive: true });
  await writeFile(join(next.inputs.projectPath, 'changed-source.txt'), 'SYNTHETIC SOURCE CHANGE');
  await assert.rejects(execute({ id: f.task.id, retry: true, inputs: JSON.stringify(next.inputs),
    approval: { snapshot: next, ticket: nextTicket } }), /ENTRY_RESUME_CHANGED/);
  assert.equal(calls, 2);
  await assert.rejects(execute(task));
  const materialSnapshot = await previewEntryResume(f.task.id, f.configuration);
  const materialBinding = f.api.entryResumeApprovalBinding(materialSnapshot, f.configuration);
  const materialTicket = await host.issue(materialBinding);
  await chmod(materialSnapshot.inputs.rawKeywordsFile, 0o600); // TEST tamper simulation, not a worker grant.
  await writeFile(materialSnapshot.inputs.rawKeywordsFile, 'SYNTHETIC altered approval material');
  await assert.rejects(execute({ id: f.task.id, retry: true, inputs: JSON.stringify(materialSnapshot.inputs),
    approval: { snapshot: materialSnapshot, ticket: materialTicket } }), /ENTRY_RESUME_MATERIAL_CHANGED/);
  assert.equal(calls, 2);
  const manifestPath = join(f.configuration.workspace, 'runs', f.task.id, 'manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath));
  manifest.stages[0].status = 'IN_PROGRESS';
  await writeFile(manifestPath, JSON.stringify(manifest));
  await assert.rejects(previewEntryResume(f.task.id, f.configuration), /ENTRY_RESUME_EFFECT_RECONCILIATION_REQUIRED/);
  assert.equal(calls, 2);
});

// A simulated authenticated host: issuance is unavailable through task JSON.
// The synchronous compare-and-consume section models a host database transaction.
function simulatedHost() {
  const tickets = new Map(), destinations = new Set();
  let clock = Date.now();
  return {
    now: () => clock,
    expire: () => { clock += 120000; },
    issue(binding) {
      const ticket = randomUUID();
      tickets.set(ticket, { binding: structuredClone(binding), approver: 'TEST-human',
        approvedAt: clock, expiresAt: clock + 60000, approvalId: randomUUID(), used: false });
      return ticket;
    },
    async consume({ ticket, binding }) {
      const record = tickets.get(ticket);
      if (!record || record.used || record.expiresAt <= clock || !isDeepStrictEqual(record.binding, binding))
        throw Error('TEST_HOST_REJECTED');
      if (destinations.has(binding.snapshot.executionRunId)) throw Error('TEST_HOST_DESTINATION_CLAIMED');
      record.used = true;
      destinations.add(binding.snapshot.executionRunId);
      return structuredClone(record);
    }
  };
}

async function handoffFixture(t) {
  const api = await import('../src/entry-approval.mjs');
  const runId = 'TEST-approval-' + randomUUID(), executionRunId = runId + '-exec';
  const directory = join(AGENT_ROOT, 'runs', runId), materials = directory + '-materials';
  await mkdir(materials);
  t.after(async () => {
    for (const path of [directory, materials, join(AGENT_ROOT, 'runs', executionRunId), join(AGENT_ROOT, 'workspaces', executionRunId)])
      await rm(path, { recursive: true, force: true });
  });
  const rawKeywordsFile = join(materials, 'keywords.md');
  await writeFile(rawKeywordsFile, 'TEST-only supplied material');
  await createEntry({ mode: 'new-site', gameIdentity: 'TEST game', objective: 'TEST approval boundary',
    gameMetadata: { steam: 'https://store.steampowered.com/app/570/' }, rawKeywordsFile }, runId);
  const { snapshot } = await previewEntryHandoff({ runId, expectedRevision: 1, executionRunId });
  const configuration = await loadConfiguration();
  configuration.stage4ReadinessCapability = OFFLINE_STAGE4_READINESS_CAPABILITY;
  const host = simulatedHost();
  const binding = api.entryApprovalBinding(snapshot, configuration);
  const ticket = host.issue(binding);
  const task = { id: executionRunId, inputs: JSON.stringify(binding.inputs), approval: { snapshot, ticket } };
  let calls = 0;
  const execute = createOrchestrator({ configuration,
    approvalConsumer: api.createEntryApprovalConsumer({ host, now: host.now }),
    executor: async () => { calls++; return { status: 'BLOCKED', artifacts: [], missing_inputs: [], evidence: ['TEST mock boundary reached'] }; }
  });
  return { api, host, binding, task, execute, snapshot, configuration, rawKeywordsFile, directory, calls: () => calls };
}

test('legacy plain inputs, retry and self-asserted approval fail closed without host', async t => {
  const f = await fixture(t);
  let calls = 0;
  const execute = createOrchestrator({ configuration: f.configuration, executor: async () => { calls++; throw Error('unexpected worker'); } });
  for (const retry of [false, true]) {
    await assert.rejects(execute({ id: 'unapproved', retry, approval: { approved: true, issuer: 'caller' },
      inputs: JSON.stringify(f.inputs) }), /ENTRY_TRUSTED_APPROVAL_UNAVAILABLE/);
  }
  assert.equal(calls, 0);
});

test('simulated authenticated issuance reaches only the existing Pipeline with mock executor; replay and retry reject', async t => {
  const f = await handoffFixture(t);
  const result = await f.execute(f.task);
  assert.equal(result.status, 'BLOCKED');
  assert.equal(f.calls(), 1);
  const manifest = JSON.parse(await readFile(join(AGENT_ROOT, 'runs', f.task.id, 'manifest.json')));
  assert.equal(manifest.inputs.projectPath, f.snapshot.workspace);
  await assert.rejects(f.execute(f.task));
  await assert.rejects(f.execute({ ...f.task, retry: true }), /ENTRY_APPROVAL_RETRY_UNSUPPORTED/);
  assert.equal(f.calls(), 1);
});

test('one approved Pipeline continues past short ticket expiry and stops at its next missing input', async t => {
  const f = await handoffFixture(t);
  let time = 1000;
  const host = await f.api.createLocalEntryApprovalHost({ directory: join(f.directory, 'authority'),
    now: () => time, authorize: async () => ({ approver: 'SYNTHETIC TEST CHANNEL',
      approvedAt: 900, expiresAt: 2000 }) });
  const ticket = await host.issue(f.binding);
  const calls = [];
  const execute = createOrchestrator({ configuration: f.configuration,
    approvalConsumer: f.api.createEntryApprovalConsumer({ host, now: () => time }),
    executor: async (skill, context) => {
      calls.push(skill);
      time = 120000; // Simulate a long first stage without sleeping.
      return goodResult(skill, context); // Explicitly synthetic stage evidence.
    } });
  const result = await execute({ ...f.task, approval: { snapshot: f.snapshot, ticket } });
  assert.equal(result.status, 'WAITING_FOR_USER');
  assert.deepEqual(calls, ['game-homepage-icon-research',
    'game-innerpage-keyword-information-research', 'game-site-template-selector']);
  assert.ok(result.missing_inputs.includes('canonicalRequired'));
  assert.ok(result.stages.slice(0, 3).every(stage => stage.status === 'PASSED'));
  await assert.rejects(execute({ ...f.task, approval: { snapshot: f.snapshot, ticket } }));
});

test('concurrent copies and independently issued tickets cannot claim the same execution twice', async t => {
  const f = await handoffFixture(t);
  const other = structuredClone(f.task);
  other.approval.ticket = f.host.issue(f.binding);
  const results = await Promise.allSettled([f.execute(f.task), f.execute(f.task), f.execute(other)]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(f.calls(), 1);
});

for (const variant of ['expired', 'self-issued', 'inputs', 'scope', 'skill-version', 'inventory', 'workspace', 'same-run', 'material', 'draft', 'linked-destination', 'occupied-workspace', 'config']) {
  test('approval rejects ' + variant + ' before creating a Pipeline', async t => {
    const f = await handoffFixture(t);
    if (variant === 'expired') f.host.expire();
    if (variant === 'self-issued') f.task.approval.ticket = JSON.stringify({ approved: true, issuer: 'caller' });
    if (variant === 'inputs') f.task.inputs = JSON.stringify({ ...f.binding.inputs, objective: 'tampered' });
    if (variant === 'scope') f.task.approval.snapshot.stages = [];
    if (variant === 'skill-version') f.task.approval.snapshot.skills[0].version = 'tampered';
    if (variant === 'inventory') f.task.approval.snapshot.inventorySha256 = '0'.repeat(64);
    if (variant === 'workspace') f.task.approval.snapshot.workspace = '/tmp/escape';
    if (variant === 'same-run') f.task.approval.snapshot.executionRunId = f.snapshot.runId;
    if (variant === 'material') await writeFile(f.rawKeywordsFile, 'tampered material');
    if (variant === 'draft') {
      const file = join(f.directory, 'ENTRY_INTAKE_V1.json');
      const draft = JSON.parse(await readFile(file)); draft.inputs.objective = 'tampered';
      await writeFile(file, JSON.stringify(draft));
    }
    if (variant === 'linked-destination') await symlink(f.directory, join(AGENT_ROOT, 'runs', f.task.id));
    if (variant === 'occupied-workspace') await mkdir(join(AGENT_ROOT, 'workspaces', f.task.id));
    if (variant === 'config') f.configuration.templateRoots = ['/tmp/unapproved'];
    await assert.rejects(f.execute(f.task));
    assert.equal(f.calls(), 0);
    await assert.rejects(access(join(AGENT_ROOT, 'runs', f.task.id, 'manifest.json')), { code: 'ENOENT' });
  });
}

test('CLI run/retry need a readable inputs file and an interactive terminal; nothing starts otherwise', async t => {
  for (const command of ['run', 'retry']) {
    const missing = spawnSync(process.execPath, ['src/cli.mjs', command, '/nonexistent/inputs.json', 'TEST-no-host'],
      { cwd: AGENT_ROOT, encoding: 'utf8', input: 'y\n' });
    assert.notEqual(missing.status, 0);
    assert.match(missing.stderr, /RUN_INPUTS_INVALID: \/nonexistent\/inputs\.json/);
  }
  const id = 'TEST-cli-pipe-' + randomUUID(), inputs = join(AGENT_ROOT, 'runs', id + '-inputs.json');
  t.after(() => rm(inputs, { force: true }));
  await writeFile(inputs, JSON.stringify({ gameIdentity: 'TEST' }));
  const piped = spawnSync(process.execPath, ['src/cli.mjs', 'run', inputs, id], { cwd: AGENT_ROOT, encoding: 'utf8', input: 'y\n' });
  assert.notEqual(piped.status, 0);
  assert.match(piped.stderr, /TERMINAL_CONFIRMATION_REQUIRED/);
  await assert.rejects(access(join(AGENT_ROOT, 'runs', id)), { code: 'ENOENT' });
});

for (const variant of ['material-after-consume', 'expiry-after-consume', 'host-error', 'empty-receipt', 'wrong-binding', 'future-approval']) {
  test('consumption failure is fail-closed and burns the ticket: ' + variant, async t => {
    const f = await handoffFixture(t), consume = f.host.consume;
    f.host.consume = async args => {
      const receipt = await consume(args);
      if (variant === 'material-after-consume') await writeFile(f.rawKeywordsFile, 'changed while awaiting host');
      if (variant === 'expiry-after-consume') f.host.expire();
      if (variant === 'host-error') throw Error('TEST host unavailable after transaction');
      if (variant === 'empty-receipt') return true;
      if (variant === 'wrong-binding') receipt.binding.inputs.objective = 'wrong';
      if (variant === 'future-approval') receipt.approvedAt = receipt.expiresAt - 1;
      return receipt;
    };
    await assert.rejects(f.execute(f.task));
    f.host.consume = consume;
    await assert.rejects(f.execute(f.task));
    assert.equal(f.calls(), 0);
    await assert.rejects(access(join(AGENT_ROOT, 'runs', f.task.id, 'manifest.json')), { code: 'ENOENT' });
  });
}

test('consumer injection alone never selects the real default worker', async t => {
  const f = await fixture(t);
  let approvals = 0;
  await assert.rejects(createOrchestrator({ configuration: f.configuration,
    approvalConsumer: async () => { approvals++; return true; }
  })({ id: 'TEST-no-executor', inputs: JSON.stringify(f.inputs) }), /ENTRY_PRODUCTION_HANDOFF_DISABLED/);
  assert.equal(approvals, 0);
});

test('actual Skill byte drift is rejected using an isolated synthetic lock; original Skills untouched', async t => {
  const f = await fixture(t, { local: true }), root = join(f.root, 'synthetic-skills'), name = 'test-skill';
  await mkdir(join(root, name), { recursive: true });
  const source = join(root, name, 'SKILL.md'), original = '# TEST-only skill';
  await writeFile(source, original);
  const inventory = join(f.root, 'synthetic-inventory.json'), configPath = join(f.root, 'synthetic-config.json');
  await writeFile(inventory, JSON.stringify({ skillRoot: root, skills: [{ name, source, version: 'TEST-v1',
    sha256: sha256(original), files: [{ path: source, sha256: sha256(original) }] }] }));
  await writeFile(configPath, JSON.stringify({ skillRoot: 'synthetic-skills', inventory: 'synthetic-inventory.json', skills: [name] }));
  assert.equal((await inspectEntrySkills({ configPath })).status, 'READY');
  await writeFile(source, original + '\nchanged bytes');
  const inspection = await inspectEntrySkills({ configPath });
  assert.equal(inspection.status, 'BLOCKED');
  assert.equal(inspection.skills[0].code, 'SKILL_VERSION_DRIFT');
});

test('approval cannot race a fresh run into resume after returning', async t => {
  const f = await handoffFixture(t);
  const execute = createOrchestrator({ configuration: f.configuration,
    approvalConsumer: async () => {
      await mkdir(join(AGENT_ROOT, 'runs', f.task.id));
      await writeFile(join(AGENT_ROOT, 'runs', f.task.id, 'manifest.json'), '{}');
      return true;
    }, executor: async () => { throw Error('TEST worker forbidden'); } });
  await assert.rejects(execute(f.task), /ENTRY_EXECUTION_DESTINATION_EXISTS/);
});

test('persistent host integrates with entry consumer using copied inputs and mock executor only', async t => {
  const f = await handoffFixture(t);
  const host = await f.api.createLocalEntryApprovalHost({ directory: join(f.directory, 'test-authority'),
    authorize: async () => ({ approver: 'TEST-independent-channel', approvedAt: Date.now(), expiresAt: Date.now() + 60000 }) });
  f.task.approval.ticket = await host.issue(f.binding);
  let calls = 0;
  const execute = createOrchestrator({ configuration: f.configuration,
    approvalConsumer: f.api.createEntryApprovalConsumer({ host }),
    executor: async (_skill, context) => {
      calls++;
      assert.notEqual(context.inputs.rawKeywordsFile, f.rawKeywordsFile);
      assert.equal(await readFile(context.inputs.rawKeywordsFile, 'utf8'), 'TEST-only supplied material');
      return { status: 'BLOCKED', artifacts: [], missing_inputs: [], evidence: ['TEST offline only'] };
    } });
  assert.equal((await execute(f.task)).status, 'BLOCKED');
  assert.equal(calls, 1);
  await assert.rejects(execute(f.task));
});

test('macOS simulated dialog -> real host issue/consume/prepare -> Pipeline with mock executor, no replay', async t => {
  const f = await handoffFixture(t), events = [];
  const host = await createMacLocalEntryApprovalHost({ directory: join(f.directory, 'mac-authority') }, {
    platform: 'darwin', dialog: async ({ message, challenge }) => {
      events.push('dialog');
      assert.ok(message.includes(f.snapshot.inventorySha256));
      assert.ok(message.includes(f.snapshot.executionRunId));
      return { stdout: challenge + '\n' };
    }
  });
  for (const name of ['issue', 'consume', 'prepare']) {
    const original = host[name];
    host[name] = async (...args) => { const result = await original(...args); events.push(name); return result; };
  }
  f.task.approval.ticket = await host.issue(f.binding);
  const execute = createOrchestrator({ configuration: f.configuration,
    approvalConsumer: f.api.createEntryApprovalConsumer({ host }),
    executor: async (_skill, context) => {
      events.push('mock-executor');
      assert.notEqual(context.inputs.rawKeywordsFile, f.rawKeywordsFile);
      assert.equal(await readFile(context.inputs.rawKeywordsFile, 'utf8'), 'TEST-only supplied material');
      return { status: 'BLOCKED', artifacts: [], missing_inputs: [], evidence: ['TEST simulated dialog, mock executor'] };
    } });
  assert.equal((await execute(f.task)).status, 'BLOCKED');
  assert.deepEqual(events, ['dialog', 'issue', 'consume', 'prepare', 'mock-executor']);
  const record = JSON.parse(await readFile(join(f.directory, 'mac-authority', f.task.approval.ticket + '.json')));
  assert.equal(record.approver, 'local-macos-interactive-operator');
  assert.deepEqual(record.binding, f.binding);
  assert.equal(JSON.parse(await readFile(join(AGENT_ROOT, 'runs', f.task.id, 'manifest.json'))).runId, f.task.id);
  await assert.rejects(execute(f.task));
  const restarted = await f.api.createLocalEntryApprovalHost({ directory: join(f.directory, 'mac-authority') });
  await assert.rejects(restarted.consume({ ticket: f.task.approval.ticket, binding: f.binding }));
  assert.equal(events.filter(x => x === 'mock-executor').length, 1);
});

for (const outcome of ['deny', 'timeout', 'forged']) {
  test('macOS host ' + outcome + ' leaves no ticket or execution directory', async t => {
    const f = await handoffFixture(t), directory = join(f.directory, 'mac-authority');
    const host = await createMacLocalEntryApprovalHost({ directory }, { platform: 'darwin', timeoutMs: 5,
      dialog: async () => outcome === 'timeout' ? new Promise(() => {}) :
        { stdout: outcome === 'deny' ? 'DENIED' : 'APPROVED' } });
    await assert.rejects(host.issue(f.binding), /HUMAN_AUTHORIZATION_REJECTED/);
    assert.deepEqual(await readdir(directory), []);
    await assert.rejects(access(join(AGENT_ROOT, 'runs', f.task.id)), { code: 'ENOENT' });
  });
}
