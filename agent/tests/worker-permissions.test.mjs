import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, rm, writeFile, readFile } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { AGENT_ROOT } from '../src/skill-lock.mjs';
import { createSkillExecutor } from '../src/skill-executor.mjs';
import { sha256 } from '../src/files.mjs';
import { syntheticOfficialSources, syntheticHomepageReadiness, syntheticHomepageMedia } from './helpers.mjs';

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

test('approved deployment writes only the resolved project .git directory', async t => {
  const { stageWorkerPermissions } = await import('../src/worker-permissions.mjs');
  const runId = 'TEST-deploy-git-' + randomUUID(), runDirectory = join(AGENT_ROOT, 'runs', runId);
  const nativeDirectory = join(runDirectory, 'artifacts/6/1/native');
  const projectPath = join(AGENT_ROOT, 'workspaces', runId, 'site');
  await mkdir(nativeDirectory, { recursive: true }); await mkdir(projectPath, { recursive: true });
  t.after(async () => {
    await rm(runDirectory, { recursive: true, force: true });
    await rm(join(AGENT_ROOT, 'workspaces', runId), { recursive: true, force: true });
  });
  const base = { runDirectory, nativeDirectory, inputs: { projectPath }, upstream: [],
    skillLock: { source: join(AGENT_ROOT, 'config/workflow.json') },
    permissions: { productionDeployment: true }, approvedPlan: { digest: 'a'.repeat(64), artifacts: [] } };
  const profile = async (skill, context, writePaths = [projectPath]) =>
    (await stageWorkerPermissions(skill, context, { writePaths })).config;
  const execute = await profile('game-site-deploy-and-measurement', { ...base, mode: 'execute' },
    [resolve(projectPath, '..'), runDirectory, projectPath]);
  assert.ok(execute.includes(JSON.stringify(resolve(projectPath, '.git')) + '="write"'));
  assert.ok(execute.includes(JSON.stringify(resolve(projectPath, '..', '.git')) + '="read"'));
  assert.ok(execute.includes(JSON.stringify(resolve(runDirectory, '.git')) + '="read"'));
  for (const protectedName of ['.agents', '.codex', '.aws'])
    assert.ok(execute.includes(JSON.stringify(resolve(projectPath, protectedName)) + '="read"'));
  const plan = await profile('game-site-deploy-and-measurement', { ...base, mode: 'plan' });
  assert.ok(plan.includes(JSON.stringify(resolve(projectPath, '.git')) + '="read"'));
  for (const skill of ['game-site-content-integrator', 'game-site-ui-ux-audit-optimizer']) {
    const ordinary = await profile(skill, { ...base, mode: 'audit-only',
      permissions: { productionDeployment: false } });
    assert.ok(ordinary.includes(JSON.stringify(resolve(projectPath, '.git')) + '="read"'));
  }
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

test('only the homepage stage gets image generation and image viewing', async t => {
  const runId = 'TEST-worker-image-tools-' + randomUUID();
  const root = join(AGENT_ROOT, 'runs', runId);
  t.after(async () => {
    await rm(root, { recursive: true, force: true });
    await rm(join(AGENT_ROOT, 'workspaces', runId), { recursive: true, force: true });
  });
  const argsFor = async (skill, stage) => {
    const outputDirectory = join(root, 'artifacts', String(stage), '1');
    await mkdir(outputDirectory, { recursive: true });
    let captured;
    // The homepage stage sits behind the frozen G0 browser gate, so drive it with synthetic host evidence.
    await createSkillExecutor({ browserHumanDialog: true, requestBrowserLaunch: async () => true,
      inspectHomepageReadiness: syntheticHomepageReadiness, collectHomepageSourceEvidence: syntheticOfficialSources,
      collectHomepageMediaEvidence: syntheticHomepageMedia,
      collectBrowserEvidence: async context => {
        const path = join(context.runDirectory, 'HOST_APPROVED_STEAM_EVIDENCE_image_test.json');
        const bytes = '{"sourceType":"HOST_APPROVED_TYPED_STEAM_PUBLIC_V1"}';
        await writeFile(path, bytes, { mode: 0o400 });
        return { status: 'EVIDENCE_READY', path, sha256: sha256(bytes) };
      },
      run: async (_command, args) => {
      captured = args;
      await writeFile(args[args.indexOf('--output-last-message') + 1], JSON.stringify({
        status: 'BLOCKED', artifacts: [], missing_inputs: [], evidence: ['SYNTHETIC IMAGE TOOL TEST'] }));
    } })(skill, { runId, outputDirectory, inputs: { gameIdentity: 'SYNTHETIC TEST', projectPath: join(AGENT_ROOT, 'workspaces', runId, 'site') },
      permissions: { siteWrites: false }, skillLock: { source: join(AGENT_ROOT, 'config', 'workflow.json') }, requiredArtifacts: [] });
    return captured;
  };
  const flag = (args, mode, feature) => args.some((value, i) => value === mode && args[i + 1] === feature);
  const homepage = await argsFor('game-homepage-icon-research', 0);
  for (const feature of ['image_generation', 'view_image']) {
    assert.ok(flag(homepage, '--enable', feature), `homepage enables ${feature}`);
    assert.equal(flag(homepage, '--disable', feature), false, `homepage does not disable ${feature}`);
  }
  for (const feature of ['browser_use', 'computer_use']) assert.ok(flag(homepage, '--disable', feature));
  const template = await argsFor('game-site-template-selector', 2);
  for (const feature of ['image_generation', 'view_image']) assert.ok(flag(template, '--disable', feature), `template stage disables ${feature}`);
});

const sharedEvidence = {};
// Drives the homepage stage behind the frozen G0 browser gate with synthetic host evidence.
async function homepageWorker(t, runId, attempt, { worker, convertIcon } = {}) {
  const root = join(AGENT_ROOT, 'runs', runId);
  if (attempt === 1) t.after(async () => {
    await rm(root, { recursive: true, force: true });
    await rm(join(AGENT_ROOT, 'workspaces', runId), { recursive: true, force: true });
  });
  const outputDirectory = join(root, 'artifacts', '0', String(attempt));
  await mkdir(outputDirectory, { recursive: true });
  const once = (collect, cache = {}) => async context => (cache.value ??= await collect(context));
  sharedEvidence[runId] ??= { sources: once(syntheticOfficialSources), media: once(syntheticHomepageMedia) };
  const calls = [];
  const result = await createSkillExecutor({ browserHumanDialog: true, requestBrowserLaunch: async () => true,
    inspectHomepageReadiness: syntheticHomepageReadiness, collectHomepageSourceEvidence: sharedEvidence[runId].sources,
    collectHomepageMediaEvidence: sharedEvidence[runId].media,
    collectBrowserEvidence: async context => {
      const path = join(context.runDirectory, `HOST_APPROVED_STEAM_EVIDENCE_icon_${attempt}.json`);
      const bytes = '{"sourceType":"HOST_APPROVED_TYPED_STEAM_PUBLIC_V1"}';
      await writeFile(path, bytes, { mode: 0o400 });
      return { status: 'EVIDENCE_READY', path, sha256: sha256(bytes) };
    },
    convertIcon: convertIcon ?? (async () => { throw Error('host conversion not expected'); }),
    run: async (_command, args, options) => {
      const call = { args, input: options.input, profile: args.find(value => value.startsWith('permissions.agent-worker=')) };
      calls.push(call);
      const reply = await (worker ?? (async () => ({ status: 'BLOCKED', artifacts: [], missing_inputs: [], evidence: ['SYNTHETIC ICON TEST'] })))(call, calls.length);
      await writeFile(args[args.indexOf('--output-last-message') + 1], JSON.stringify(reply));
    } })('game-homepage-icon-research', { runId, outputDirectory,
    inputs: { gameIdentity: 'SYNTHETIC TEST', projectPath: join(AGENT_ROOT, 'workspaces', runId, 'site') },
    permissions: { siteWrites: false }, skillLock: { source: join(AGENT_ROOT, 'config', 'workflow.json') }, requiredArtifacts: [] });
  return { root, iconDirectory: join(root, 'homepage-icon'), calls, result };
}

// -C is runs/<id>/artifacts/0/<attempt>/native; the icon directory is runs/<id>/homepage-icon.
const iconDirectoryOf = call => join(dirname(dirname(dirname(dirname(call.args[call.args.indexOf('-C') + 1])))), 'homepage-icon');
const waitingForZip = { status: 'WAITING_FOR_USER', artifacts: [], missing_inputs: ['faviconIoManualZip'], evidence: ['SYNTHETIC: icon ready, ZIP missing'] };

test('the homepage worker writes its icon to a per-run directory and never gets the network or a browser', async t => {
  const w = await homepageWorker(t, 'TEST-worker-icon-' + randomUUID(), 1);
  const [call] = w.calls;
  assert.match(call.profile, /network=\{enabled=false\}/);
  assert.ok(call.profile.includes(JSON.stringify(w.iconDirectory) + '="write"'));
  assert.equal(call.args.some(value => /PLAYWRIGHT_BROWSERS_PATH/.test(value)), false);
  assert.ok(call.input.includes(join(w.iconDirectory, 'icon-master.png')));
  assert.match(call.input, /do not run scripts\/favicon_io_convert\.mjs/);
  assert.match(call.input, /faviconIoManualZip/);
});

test('when the worker waits on a ready PNG, the host converts it on favicon.io and re-runs the worker once', async t => {
  const conversions = [];
  const w = await homepageWorker(t, 'TEST-worker-icon-host-' + randomUUID(), 1, {
    worker: async (call, n) => {
      if (n === 1) {
        await writeFile(join(iconDirectoryOf(call), 'icon-master.png'), 'SYNTHETIC PNG');
        return waitingForZip;
      }
      return { status: 'BLOCKED', artifacts: [], missing_inputs: [], evidence: ['SYNTHETIC second pass reached'] };
    },
    convertIcon: async request => {
      conversions.push(request);
      const zip = join(request.iconDirectory, 'favicon_io.zip');
      await writeFile(zip, 'PK SYNTHETIC');
      return { status: 'DOWNLOADED', zip, sha256: 'a'.repeat(64) };
    } });
  assert.equal(conversions.length, 1);
  assert.equal(conversions[0].iconDirectory, w.iconDirectory);
  assert.match(conversions[0].skillRoot, /codex-skills\/game-homepage-icon-research$|config$/);
  assert.equal(w.calls.length, 2);
  assert.match(w.result.evidence.join('\n'), /SYNTHETIC second pass reached/);
  assert.match(w.result.evidence.join('\n'), /favicon\.io conversion by the host: a{64}/);
});

test('a host conversion failure keeps WAITING_FOR_USER with the error, the PNG and where to save the ZIP', async t => {
  const w = await homepageWorker(t, 'TEST-worker-icon-fail-' + randomUUID(), 1, {
    worker: async call => { await writeFile(join(iconDirectoryOf(call), 'icon-master.png'), 'SYNTHETIC PNG'); return waitingForZip; },
    convertIcon: async () => { throw Error('FAVICON_IO_PAGE_CHANGED: expected one input#image'); } });
  assert.equal(w.calls.length, 1);
  assert.equal(w.result.status, 'WAITING_FOR_USER');
  assert.deepEqual(w.result.missing_inputs, ['faviconIoManualZip']);
  const evidence = w.result.evidence.join('\n');
  assert.match(evidence, /FAVICON_IO_PAGE_CHANGED: expected one input#image/);
  assert.ok(evidence.includes(join(w.iconDirectory, 'icon-master.png')));
  assert.ok(evidence.includes(join(w.iconDirectory, 'favicon_io.zip')));
  assert.match(evidence, /https:\/\/favicon\.io\/favicon-converter\//);
});

test('the host does not convert when the PNG is missing or a ZIP is already there', async t => {
  let converted = 0;
  const convertIcon = async () => { converted++; };
  const noPng = await homepageWorker(t, 'TEST-worker-icon-nopng-' + randomUUID(), 1, { worker: async () => waitingForZip, convertIcon });
  assert.equal(noPng.result.status, 'WAITING_FOR_USER');
  const runId = 'TEST-worker-icon-zip-' + randomUUID();
  const preset = join(AGENT_ROOT, 'runs', runId, 'homepage-icon');
  await mkdir(preset, { recursive: true });
  await writeFile(join(preset, 'icon-master.png'), 'SYNTHETIC PNG');
  await writeFile(join(preset, 'favicon_io.zip'), 'PK manual');
  const zipThere = await homepageWorker(t, runId, 1, { worker: async () => waitingForZip, convertIcon });
  assert.equal(zipThere.calls.length, 1);
  assert.equal(converted, 0);
  assert.equal(await readFile(join(preset, 'favicon_io.zip'), 'utf8'), 'PK manual');
});
