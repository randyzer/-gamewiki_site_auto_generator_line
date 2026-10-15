import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile, rm, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { AGENT_ROOT } from '../src/skill-lock.mjs';
import { createEntry } from '../src/entry-v1.mjs';
import { previewEntryResume } from '../src/entry-resume-snapshot.mjs';
import { loadConfiguration } from '../src/orchestrator.mjs';
import { goodResult } from './helpers.mjs';
import { sha256 } from '../src/files.mjs';

test('separate plan-only operator confirmation never starts a worker; deny and timeout preserve waiting', async t => {
  const messages = [];
  let deny = false;
  const f = await fixture(t, async ({ message, challenge }) => {
    messages.push(message); return { stdout: deny ? 'DENIED' : challenge };
  }, undefined, goodResult);
  await f.execute(f.request);
  const config = await loadConfiguration();
  const base = await previewEntryResume(f.request.executionRunId, config);
  const ready = await f.execute.resume({ runId: f.request.executionRunId, expectedManifestSha256: base.manifestSha256,
    patch: { canonicalOrigin: 'https://fixture.test', domain: 'fixture.test', siteRevision: 'SYNTHETIC',
      repo: 'fixture/repo', branch: 'main', deploymentProvider: 'Vercel',
      dns: { provider: 'SYNTHETIC Cloudflare', recordsReviewed: true }, deploymentPlanAuthorized: true } });
  const snapshot = await previewEntryResume(f.request.executionRunId, config);
  const request = { runId: f.request.executionRunId, expectedManifestSha256: snapshot.manifestSha256, planDigest: ready.plan_digest };
  deny = true;
  await assert.rejects(f.execute.confirmPlan(request), /AUTHORIZATION_REJECTED/);
  assert.equal(f.calls(), 7);
  assert.equal((await previewEntryResume(f.request.executionRunId, config)).currentStatus, 'WAITING_FOR_USER');
  deny = false;
  const result = await f.execute.confirmPlan(request);
  assert.equal(result.status, 'PASSED'); assert.equal(result.deployment_executed, false);
  assert.equal(f.calls(), 7);
  assert.match(messages.at(-1), /deployment PLAN only/);
  assert.ok(messages.at(-1).includes(ready.plan_digest));
  await assert.rejects(f.execute.confirmPlan(request));
});

test('trusted bootstrap requests a separate operator challenge for exact checkpoint resume', async t => {
  const messages = [];
  const f = await fixture(t, async ({ message, challenge }) => {
    messages.push(message); return { stdout: challenge };
  });
  await f.execute(f.request);
  const snapshot = await previewEntryResume(f.request.executionRunId, await loadConfiguration());
  const result = await f.execute.resume({ runId: f.request.executionRunId,
    expectedManifestSha256: snapshot.manifestSha256 });
  assert.equal(result.status, 'BLOCKED');
  assert.equal(f.calls(), 2);
  assert.equal(messages.length, 2);
  assert.match(messages[1], /checkpoint/);
  assert.ok(messages[1].includes(snapshot.manifestSha256));
  await assert.rejects(f.execute.resume({ runId: f.request.executionRunId,
    expectedManifestSha256: snapshot.manifestSha256 }), /ENTRY_RESUME_CHANGED/);
  assert.equal(messages.length, 2);
});

async function fixture(t, dialog, workerRun, stageExecutor, executionStages) {
  const id = 'TEST-bootstrap-' + randomUUID();
  const root = join(AGENT_ROOT, 'runs', id);
  await mkdir(root);
  const request = { runId: id + '-draft', expectedRevision: 1, executionRunId: id + '-exec' };
  t.after(async () => {
    for (const path of [root, join(AGENT_ROOT, 'runs', request.runId),
      join(AGENT_ROOT, 'runs', request.executionRunId), join(AGENT_ROOT, 'workspaces', request.executionRunId)])
      await rm(path, { recursive: true, force: true });
  });
  const material = join(root, 'keywords.md');
  await writeFile(material, 'TEST supplied keywords');
  const lineage = join(root, 'lineage.json');
  await writeFile(lineage, JSON.stringify({ kind: 'KEYWORD_SOURCE_INSPECTION_V1', original: { sha256: 'a'.repeat(64) },
    derived: { sha256: sha256('TEST supplied keywords') }, retained: [{ keyword: 'TEST supplied keywords' }],
    pending: [], scope: 'USER_APPROVED_COMPLETE_READABLE_TERMS_ONLY' }));
  await createEntry({ mode: 'new-site', gameIdentity: 'TEST game', objective: 'offline bootstrap',
    gameMetadata: { steam: 'https://store.steampowered.com/app/570/' }, rawKeywordsFile: material,
    keywordSourceLineageFile: lineage }, request.runId);
  const api = await import('../src/entry-host-bootstrap.mjs');
  let calls = 0;
  const execute = await api.createOfflineEntryBootstrap({ directory: join(root, 'authority'),
    executionStages,
    dialog: dialog ?? (async ({ challenge }) => ({ stdout: challenge })),
    ...(workerRun ? { workerRun } : { executor: async (_skill, context) => {
      calls++;
      assert.equal(JSON.stringify(context).includes('ticket'), false);
      assert.notEqual(context.inputs.rawKeywordsFile, material);
      assert.notEqual(context.inputs.keywordSourceLineageFile, lineage);
      assert.equal(JSON.parse(await readFile(context.inputs.keywordSourceLineageFile)).kind, 'KEYWORD_SOURCE_INSPECTION_V1');
      return stageExecutor ? stageExecutor(_skill, context)
        : { status: 'BLOCKED', artifacts: [], missing_inputs: [], evidence: ['TEST mock'] };
    } }) });
  return { execute, request, root, material, calls: () => calls };
}

test('host-bound homepage scope pauses the same Pipeline before G2 and appears in approval', async t => {
  let displayed;
  const homepage = 'game-homepage-icon-research';
  const f = await fixture(t, async ({ message, challenge }) => {
    displayed = message; return { stdout: challenge };
  }, undefined, goodResult, [homepage]);
  const result = await f.execute(f.request);
  assert.equal(result.status, 'PAUSED');
  assert.equal(f.calls(), 1);
  assert.equal(result.stages[0].status, 'PASSED');
  assert.ok(result.stages.slice(1, 7).every(s => s.status === 'NOT_STARTED'));
  assert.match(displayed, /Execution stages: \["game-homepage-icon-research"\]/);
  const files = (await readdir(join(f.root, 'authority'))).filter(name => name.endsWith('.execution.json'));
  const audit = JSON.parse(await readFile(join(f.root, 'authority', files[0])));
  assert.deepEqual(audit.stages, [homepage]);
});

test('real material preflight yields a legal WAITING manifest and resumes the same run with fresh human approval', async t => {
  const { createSkillExecutor } = await import('../src/skill-executor.mjs');
  let browser = 0, worker = 0, approvals = 0;
  const stageExecutor = createSkillExecutor({ browserHumanDialog: true,
    requestBrowserLaunch: async () => { browser++; return true; }, run: async () => { worker++; } });
  const f = await fixture(t, async ({ challenge }) => { approvals++; return { stdout: challenge }; },
    undefined, stageExecutor, ['game-homepage-icon-research']);
  const first = await f.execute(f.request);
  assert.equal(first.status, 'WAITING_FOR_USER');
  assert.ok(first.missing_inputs.includes('homepageSourceIndex'));
  const snapshot = await previewEntryResume(f.request.executionRunId, await loadConfiguration());
  const second = await f.execute.resume({ runId: f.request.executionRunId, expectedManifestSha256: snapshot.manifestSha256 });
  assert.equal(second.status, 'WAITING_FOR_USER'); assert.equal(approvals, 2);
  assert.equal(second.run_id, first.run_id);
  assert.ok(second.stages.slice(1, 7).every(stage => stage.status === 'NOT_STARTED'));
  assert.equal(second.deployment_executed, false);
  assert.equal(browser, 0); assert.equal(worker, 0);
  await assert.rejects(f.execute(f.request));
});

test('bootstrap regenerates snapshot and runs existing Pipeline once without exposing ticket', async t => {
  const f = await fixture(t);
  const results = await Promise.allSettled([f.execute(f.request), f.execute(f.request)]);
  assert.equal(results.filter(x => x.status === 'fulfilled').length, 1);
  assert.equal(f.calls(), 1);
  const result = results.find(x => x.status === 'fulfilled').value;
  assert.equal(result.status, 'BLOCKED');
  const tickets = (await readdir(join(f.root, 'authority'))).filter(x => x.endsWith('.json'));
  for (const ticket of tickets) {
    const credential = ticket.slice(0, -5);
    assert.equal(JSON.stringify(result).includes(credential), false);
    const manifest = await readFile(join(AGENT_ROOT, 'runs', f.request.executionRunId, 'manifest.json'), 'utf8');
    assert.equal(manifest.includes(credential), false);
  }
  await assert.rejects(f.execute(f.request));
});

test('bootstrap rejects task JSON, supplied snapshots and approval flags', async t => {
  const f = await fixture(t);
  for (const extra of [{ approved: true }, { ticket: 'fake' }, { snapshot: {} }, { retry: true }, { executor: 'codex' }])
    await assert.rejects(f.execute({ ...f.request, ...extra }), /INVALID_REQUEST/);
  assert.equal(f.calls(), 0);
});

test('denied dialog never writes ticket or executes', async t => {
  const f = await fixture(t, async () => ({ stdout: 'DENIED' }));
  await assert.rejects(f.execute(f.request), /AUTHORIZATION_REJECTED/);
  assert.deepEqual(await readdir(join(f.root, 'authority')), []);
  assert.equal(f.calls(), 0);
});

test('material changed during dialog fails before executor', async t => {
  let material;
  const f = await fixture(t, async ({ challenge }) => {
    await writeFile(material, 'changed');
    return { stdout: challenge };
  });
  material = f.material;
  await assert.rejects(f.execute(f.request));
  assert.equal(f.calls(), 0);
});

test('production command cannot enable workers using task or environment flags', () => {
  const result = spawnSync(process.execPath, ['scripts/entry-host.mjs', 'execute', '--approved'],
    { cwd: AGENT_ROOT, encoding: 'utf8', env: { ...process.env, ENTRY_HOST_APPROVED: 'true' } });
  assert.equal(result.status, 2);
  assert.equal(JSON.parse(result.stdout).code, 'ENTRY_HOST_REQUEST_INVALID');
  assert.equal(result.stderr, '');
});

test('production preview shows the exact draft and full remaining pipeline scope without constructing workers', async t => {
  const f = await fixture(t);
  const result = spawnSync(process.execPath, ['scripts/entry-host.mjs', 'preview',
    f.request.runId, String(f.request.expectedRevision), f.request.executionRunId],
  { cwd: AGENT_ROOT, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const value = JSON.parse(result.stdout);
  assert.equal(value.status, 'PREVIEW_ONLY');
  assert.equal(value.executorStarted, false);
  assert.equal(value.snapshot.executionRunId, f.request.executionRunId);
  assert.deepEqual(value.hostExecutionStages, value.snapshot.stages);
});

test('approved production trust model verifies fixed client identities and ignores environment overrides', async () => {
  const api = await import('../src/entry-host-bootstrap.mjs');
  const policy = await api.loadEntryHostPolicy();
  assert.equal(policy.runtimeEvidence, null);
  await api.requireVerifiedHostRuntime(policy);
  const changed = structuredClone(policy);
  changed.cli.path = process.env.CODEX_BIN || 'UNTRUSTED_TASK_CLI';
  await assert.rejects(api.requireVerifiedHostRuntime(changed), /ENTRY_HOST_ISOLATION_UNVERIFIED/);
});


test('fixed createSkillExecutor wiring preserves browser gate before mock process runner', async t => {
  let calls = 0;
  const f = await fixture(t, undefined, async () => {
    calls++;
    throw Error('TEST_MOCK_PROCESS_STOP');
  });
  const result = await f.execute(f.request);
  assert.equal(calls, 0);
  assert.equal(result.status, 'BLOCKED');
  assert.match(result.summary, /APPROVAL_CAPABILITY_UNAVAILABLE/);
});

test('offline bootstrap requires explicit dialog and executor dependencies', async () => {
  const { createOfflineEntryBootstrap } = await import('../src/entry-host-bootstrap.mjs');
  await assert.rejects(createOfflineEntryBootstrap(), /OFFLINE_DEPENDENCIES_REQUIRED/);
  await assert.rejects(createOfflineEntryBootstrap({ dialog: async () => null }), /OFFLINE_DEPENDENCIES_REQUIRED/);
});

test('host errors never propagate arbitrary channel text or credential paths', async t => {
  const f = await fixture(t);
  // Force durable issuance to fail with an OS error carrying a private path.
  await rm(join(f.root, 'authority'), { recursive: true });
  await writeFile(join(f.root, 'authority'), 'TEST unavailable store');
  await assert.rejects(f.execute(f.request), error => {
    assert.equal(error.message, 'ENTRY_HOST_EXECUTION_REJECTED');
    assert.equal(error.cause, undefined);
    return true;
  });
  assert.equal(f.calls(), 0);
});
