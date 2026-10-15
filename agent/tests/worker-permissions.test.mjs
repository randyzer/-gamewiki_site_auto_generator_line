import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { AGENT_ROOT } from '../src/skill-lock.mjs';
import { createSkillExecutor } from '../src/skill-executor.mjs';
import { sha256 } from '../src/files.mjs';

test('worker gets only digest-checked media receipt read access, never media-directory writes', async t => {
  const { stageWorkerPermissions } = await import('../src/worker-permissions.mjs');
  const runId = 'TEST-media-permission-' + randomUUID(), runDirectory = join(AGENT_ROOT, 'runs', runId);
  const nativeDirectory = join(runDirectory, 'artifacts/0/1/native'), area = join(runDirectory, 'homepage-media');
  await mkdir(nativeDirectory, { recursive: true }); await mkdir(area);
  t.after(() => rm(runDirectory, { recursive: true, force: true }));
  const path = join(area, 'MEDIA_EVIDENCE.json'), bytes = 'SYNTHETIC receipt'; await writeFile(path, bytes, { mode: 0o400 });
  const context = { runDirectory, nativeDirectory, inputs: {}, skillLock: { source: join(AGENT_ROOT, 'config/workflow.json') },
    homepageMediaEvidencePath: path, homepageMediaEvidenceSha256: sha256(bytes) };
  const permissions = await stageWorkerPermissions('game-homepage-icon-research', context);
  assert.ok(permissions.config.includes(JSON.stringify(path) + '="read"'));
  assert.equal(permissions.config.includes(JSON.stringify(area) + '="write"'), false);
  await assert.rejects(stageWorkerPermissions('game-homepage-icon-research', { ...context,
    homepageMediaEvidenceSha256: '0'.repeat(64) }), /MEDIA_EVIDENCE_CHANGED/);
  await assert.rejects(stageWorkerPermissions('game-homepage-icon-research', { ...context,
    homepageMediaEvidencePath: join(nativeDirectory, 'worker.json') }), /MEDIA_EVIDENCE_INVALID/);
});

test('pinned CLI and Code Mode host identities are rechecked before every worker call', async t => {
  const id = 'TEST-pinned-cli-' + randomUUID(), root = join(AGENT_ROOT, 'runs', id);
  await mkdir(root); t.after(() => rm(root, { recursive: true, force: true }));
  const command = join(root, 'synthetic-cli');
  const codeModeHost = join(root, 'codex-code-mode-host');
  await writeFile(command, 'SYNTHETIC CLI IDENTITY', { mode: 0o700 });
  await writeFile(codeModeHost, 'SYNTHETIC CODE MODE HOST', { mode: 0o700 });
  const commandIdentity = { path: command, realPath: command, version: 'codex-cli 0.153.0',
    sha256: sha256('SYNTHETIC CLI IDENTITY') };
  const codeModeHostIdentity = { path: codeModeHost, realPath: codeModeHost,
    sha256: sha256('SYNTHETIC CODE MODE HOST') };
  const context = { runId: id, outputDirectory: join(root, 'artifacts/2/1'),
    inputs: { gameIdentity: 'SYNTHETIC', projectPath: join(root, 'site') },
    permissions: { siteWrites: false }, requiredArtifacts: [],
    skillLock: { source: join(AGENT_ROOT, 'config/workflow.json') } };
  let calls = 0;
  const execute = createSkillExecutor({ command, commandIdentity, codeModeHostIdentity, run: async (_command, args) => {
    calls++; await writeFile(args[args.indexOf('--output-last-message') + 1], JSON.stringify({
      status: 'BLOCKED', artifacts: [], missing_inputs: [], evidence: ['SYNTHETIC ONLY'] }));
  } });
  await execute('game-site-template-selector', context);
  await writeFile(codeModeHost, 'REPLACED CODE MODE HOST', { mode: 0o700 });
  await assert.rejects(execute('game-site-template-selector', context), /WORKER_CODE_MODE_HOST_IDENTITY_CHANGED/);
  await writeFile(codeModeHost, 'SYNTHETIC CODE MODE HOST', { mode: 0o700 });
  await writeFile(command, 'REPLACED CLI');
  await assert.rejects(execute('game-site-template-selector', context), /WORKER_CLI_IDENTITY_CHANGED/);
  assert.equal(calls, 1);
});

test('a partial pinned runtime identity fails before worker launch', async () => {
  let calls = 0;
  const execute = createSkillExecutor({ command: '/synthetic/codex', commandIdentity: {
    path: '/synthetic/codex', realPath: '/synthetic/codex', version: 'codex-cli 0.153.0', sha256: '0'.repeat(64)
  }, run: async () => { calls++; } });
  await assert.rejects(execute('game-site-template-selector', {
    runId: 'TEST-incomplete-runtime', outputDirectory: join(AGENT_ROOT, 'runs/TEST-incomplete-runtime/artifacts/2/1'),
    inputs: { gameIdentity: 'SYNTHETIC', projectPath: join(AGENT_ROOT, 'workspaces/TEST-incomplete-runtime/site') },
    permissions: { siteWrites: false }, requiredArtifacts: [],
    skillLock: { source: join(AGENT_ROOT, 'config/workflow.json') }
  }), /WORKER_RUNTIME_IDENTITY_INCOMPLETE/);
  assert.equal(calls, 0);
});

test('worker environment excludes host approval and research credentials', async () => {
  const { workerEnvironment, keywordResearchEnvironment } = await import('../src/worker-permissions.mjs');
  const env = workerEnvironment({ PATH: '/synthetic/bin', HOME: '/synthetic/home',
    CODEX_HOME: '/synthetic/codex', LANG: 'en_US.UTF-8', SERPER_API_KEY: 'SYNTHETIC_CANARY',
    FEISHU_APP_SECRET: 'SYNTHETIC_CANARY', ENTRY_TICKET: 'SYNTHETIC_CANARY',
    GAME_SITE_BROWSER_HUMAN_DIALOG: 'enabled', NODE_OPTIONS: 'SYNTHETIC_CANARY' });
  assert.equal(env.PATH, '/synthetic/bin');
  assert.equal(env.BSK_AUTO_START, '0');
  for (const key of ['SERPER_API_KEY', 'FEISHU_APP_SECRET', 'ENTRY_TICKET',
    'GAME_SITE_BROWSER_HUMAN_DIALOG', 'NODE_OPTIONS']) assert.equal(env[key], undefined);
  const research = keywordResearchEnvironment({ PATH: '/synthetic/bin', HOME: '/synthetic/home',
    SERPER_API_KEY: 'SYNTHETIC_CANARY', ENTRY_TICKET: 'DO_NOT_COPY' });
  assert.equal(research.SERPER_API_KEY, 'SYNTHETIC_CANARY');
  assert.equal(research.ENTRY_TICKET, undefined);
});

test('actual executor retains sandbox/approval bounds and grants only task-owned writes', async t => {
  const runId = 'TEST-worker-permissions-' + randomUUID();
  const root = join(AGENT_ROOT, 'runs', runId);
  const outputDirectory = join(root, 'artifacts', '2', '1');
  const projectPath = join(AGENT_ROOT, 'workspaces', runId, 'site');
  await mkdir(outputDirectory, { recursive: true });
  t.after(async () => {
    await rm(root, { recursive: true, force: true });
    await rm(join(AGENT_ROOT, 'workspaces', runId), { recursive: true, force: true });
  });
  let captured;
  await createSkillExecutor({ run: async (_command, args, options) => {
    captured = { args, options };
    await writeFile(args[args.indexOf('--output-last-message') + 1], JSON.stringify({
      status: 'BLOCKED', artifacts: [], missing_inputs: [], evidence: ['SYNTHETIC PERMISSIONS TEST'] }));
  } })('game-site-template-selector', { runId, outputDirectory,
    inputs: { gameIdentity: 'SYNTHETIC TEST', projectPath }, permissions: { siteWrites: true },
    skillLock: { source: join(AGENT_ROOT, 'config', 'workflow.json') }, requiredArtifacts: [] });
  assert.equal(captured.args.includes('--sandbox'), false);
  assert.ok(captured.args.includes('default_permissions="agent-worker"'));
  assert.ok(captured.args.includes('--ignore-user-config'));
  assert.ok(captured.args.includes('approval_policy="never"'));
  assert.ok(captured.args.includes('allow_login_shell=false'));
  assert.ok(captured.args.includes('shell_environment_policy.inherit="none"'));
  assert.equal(captured.args.some(value => value.startsWith('tools.view_image=')), false);
  assert.ok(captured.args.some((value, i) => value === '--disable' && captured.args[i + 1] === 'view_image'));
  assert.ok(captured.args.includes('--strict-config'));
  assert.ok(captured.args.some((value, i) => value === '--enable' && captured.args[i + 1] === 'code_mode_host'));
  for (const feature of ['workspace_dependencies', 'auth_elicitation', 'tool_suggest', 'goals'])
    assert.ok(captured.args.some((value, i) => value === '--disable' && captured.args[i + 1] === feature));
  assert.equal(captured.args.some((value, i) => value === '--disable' && captured.args[i + 1] === 'code_mode_host'), false);
  assert.equal(captured.args.includes('--add-dir'), false);
  const profile = captured.args.find(value => value.startsWith('permissions.agent-worker='));
  assert.match(profile, /":root"="deny"/);
  assert.ok(profile.includes(JSON.stringify(join(AGENT_ROOT, 'workspaces', runId)) + '="write"'));
  assert.ok(profile.includes(JSON.stringify(join(process.env.HOME, '.codex')) + '="deny"'));
  assert.match(profile, /network=\{enabled=false\}/);
  for (const capability of ['apps', 'browser_use', 'computer_use', 'plugins', 'hooks', 'multi_agent', 'image_generation'])
    assert.ok(captured.args.some((value, i) => value === '--disable' && captured.args[i + 1] === capability));
  assert.ok(captured.args.includes('web_search="disabled"'));
  assert.equal(captured.options.env.SERPER_API_KEY, undefined);
  assert.equal(captured.options.env.ENTRY_TICKET, undefined);
  assert.ok(!captured.args.some(arg => /dangerously|approve-for-me/.test(arg)));
});
