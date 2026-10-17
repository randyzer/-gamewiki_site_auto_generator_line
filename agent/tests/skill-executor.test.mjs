import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile, access, link, readdir, stat, symlink, unlink, realpath, chmod } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fixture, goodResult } from './helpers.mjs';
import { createSkillExecutor } from '../src/skill-executor.mjs';
import { ARTIFACTS, STAGES, createPipeline } from '../src/pipeline.mjs';
import { captureKeywordRecovery, verifyKeywordRecovery } from '../src/keyword-recovery.mjs';
import { prepareResearchHandoff, publishResearchArtifacts, publishDeploymentPlan } from '../src/handoff.mjs';
import { inside, sha256 } from '../src/files.mjs';
import { ALL_STAGES } from '../src/stages.mjs';
import { snapshotSiteEvidence } from '../src/site-evidence.mjs';
import { runProcess } from '../src/process.mjs';

test('non-browser executor preserves its sandbox and BLOCKED output without fabricating artifacts', async t => {
  const f = await fixture(t); let invoked;
  const context = { runId: 'worker-fixture', inputs: { ...f.inputs, projectPath: join(f.configuration.workspace, 'site') },
    outputDirectory: join(f.configuration.workspace, 'runs/worker-fixture/artifacts/2/1'), requiredArtifacts: ARTIFACTS[2],
    skillLock: { source: join(f.root, 'skills', STAGES[2] + '.md') }, upstream: [], mode: 'audit-only', templateRoots: f.configuration.templateRoots,
    permissions: { siteWrites: false, productionDeployment: false } };
  const executor = createSkillExecutor({ command: 'offline-codex-fixture', researchPython: process.execPath,
    run: async (command, args, options) => {
    invoked = { command, args, options };
    await writeFile(args[args.indexOf('--output-last-message') + 1], JSON.stringify({ status: 'BLOCKED', summary: 'Offline fixture unavailable browser',
      evidence: ['Offline transport fixture'], missing_inputs: [], artifacts: [] }));
  } });
  const result = await executor(STAGES[2], context);
  assert.equal(result.status, 'BLOCKED'); assert.deepEqual(result.artifacts, []);
  assert.ok(invoked.args.includes('--ignore-user-config'));
  assert.equal(invoked.args.includes('--sandbox'), false);
  assert.ok(invoked.args.includes('default_permissions="agent-worker"'));
  assert.ok(!invoked.args.includes('--add-dir'));
  assert.equal(invoked.options.env.FEISHU_APP_SECRET, undefined);
  assert.equal(invoked.options.env.BSK_AUTO_START, '0');
  const path = invoked.args.find(value => value.startsWith('shell_environment_policy.set='));
  assert.ok(path.indexOf(dirname(process.execPath)) < path.indexOf('/usr/bin'));
  assert.ok(invoked.args.find(value => value.startsWith('permissions.agent-worker='))
    .includes(JSON.stringify(dirname(dirname(process.execPath))) + '="read"'));
  assert.ok(invoked.options.input.includes(`Use ${process.execPath} for every Python Skill script`));
  assert.match(invoked.options.input, /Do not invoke browser commands/);
  assert.match(invoked.options.input, /actual callable image-generation tool/);
  assert.match(invoked.options.input, /No commit, push/);
});

test('research handoff preserves native filenames, verifies bytes and never overwrites conflicts', async t => {
  const f = await fixture(t), runDirectory = join(f.configuration.workspace, 'runs/fixture');
  await mkdir(runDirectory, { recursive: true });
  const projectPath = f.inputs.paths.siteDirectory; await mkdir(projectPath);
  const snapshot = join(runDirectory, '0-native.md'); await writeFile(snapshot, '# Offline research');
  const artifact = { kind: 'HOMEPAGE_RESEARCH.md', path: snapshot, sourcePath: join(runDirectory, 'Offline Fixture攻略站首页调研信息.md'),
    sha256: sha256('# Offline research'), runId: 'fixture', projectPath, gameIdentity: f.inputs.gameIdentity };
  const context = { runId: 'fixture', runDirectory, inputs: { ...f.inputs, projectPath }, upstream: [{ skill: STAGES[0], artifacts: [artifact] }, { skill: STAGES[1], artifacts: [] }] };
  await publishResearchArtifacts(context, STAGES[0], [artifact]);
  const output = await prepareResearchHandoff(context);
  const file = join(output.homepageRoot, 'Offline Fixture攻略站首页调研信息.md');
  assert.equal(await readFile(file, 'utf8'), '# Offline research');
  await prepareResearchHandoff(context);
  await writeFile(file, 'user changed research');
  await assert.rejects(prepareResearchHandoff(context), /conflicts/);
});

test('real adapter rejects fabricated empty directories as PASSED', async t => {
  const f = await fixture(t);
  const outputDirectory = join(f.configuration.workspace, 'runs/fake/artifacts/0/1');
  const executor = createSkillExecutor({ run: async (_cmd, args) => {
    const output = args[args.indexOf('--output-last-message') + 1];
    await writeFile(output, JSON.stringify({ status: 'PASSED', summary: 'fake', evidence: ['fake'], missing_inputs: [], artifacts: [{ kind: 'TEMPLATE_SELECTION_REPORT.md', path: outputDirectory }] }));
  } });
  await assert.rejects(executor(STAGES[2], { runId: 'fake', inputs: { ...f.inputs, projectPath: join(f.configuration.workspace, 'site') },
    outputDirectory, requiredArtifacts: ARTIFACTS[2], skillLock: { source: join(f.root, 'skills', STAGES[2] + '.md') }, upstream: [],
    mode: 'audit-only', permissions: { siteWrites: false } }), /outside temporary directory|outside allowed roots|regular artifact/);
});

test('worker result failures identify parsing and native validation separately', async t => {
  const f = await fixture(t);
  const context = { runId: 'diagnostic', inputs: { ...f.inputs, projectPath: join(f.configuration.workspace, 'site') },
    outputDirectory: join(f.configuration.workspace, 'runs/diagnostic/artifacts/2/1'),
    requiredArtifacts: ARTIFACTS[2], skillLock: { source: join(f.root, 'skills', STAGES[2] + '.md') },
    upstream: [], mode: 'audit-only', permissions: { siteWrites: false } };
  for (const [bytes, operation] of [
    ['invalid-json', 'read-worker-result'],
    [JSON.stringify({ status: 'PASSED', evidence: ['fixture'], missing_inputs: [], artifacts: [] }), 'validate-template-copy'],
  ]) {
    const executor = createSkillExecutor({ run: async (_command, args) => {
      await writeFile(args[args.indexOf('--output-last-message') + 1], bytes);
    } });
    await assert.rejects(executor(STAGES[2], context), error => {
      assert.equal(error.diagnosticOperation, operation);
      if (operation === 'read-worker-result') {
        assert.equal(error.code, 'ARTIFACT_INVALID_JSON');
        assert.match(error.message, /worker-result\.json/);
      }
      return true;
    });
  }
});

test('real optimize blocks before any worker or broad write grant', async t => {
  const f = await fixture(t); let invoked = false;
  const executor = createSkillExecutor({ run: async () => { invoked = true; } });
  const result = await executor(STAGES[4], { runId: 'ui', mode: 'optimize', outputDirectory: join(f.configuration.workspace, 'artifacts'),
    skillLock: { source: join(f.root, 'skills', STAGES[4] + '.md') }, requiredArtifacts: ARTIFACTS[4], upstream: [],
    inputs: { ...f.inputs, projectPath: join(f.configuration.workspace, 'site') }, permissions: { siteWrites: true, uiChanges: true } });
  assert.equal(result.status, 'BLOCKED'); assert.equal(invoked, false);
});

test('legacy browser approvals cannot change the offline homepage worker permissions', async t => {
  const f = await fixture(t);
  const context = { runId: 'scoped', inputs: { ...f.inputs, projectPath: join(f.configuration.workspace, 'site') },
    outputDirectory: join(f.configuration.workspace, 'runs/scoped/artifacts/0/1'), requiredArtifacts: ARTIFACTS[0],
    skillLock: { source: join(f.root, 'skills', STAGES[0] + '.md') }, permissions: { siteWrites: false } };
  const calls = [];
  const run = async (_command, args) => {
    calls.push(args); await writeFile(args[args.indexOf('--output-last-message') + 1], JSON.stringify({
      status: 'BLOCKED', evidence: ['offline native fixture incomplete'], missing_inputs: [], artifacts: [] }));
  };
  for (const browserLaunchApproval of [null, { type: 'scoped-bsk-launch', runId: 'wrong' }])
    assert.equal((await createSkillExecutor({ run, browserLaunchApproval })(STAGES[0], context)).status, 'BLOCKED');
  assert.equal(calls.length, 2);
  for (const args of calls) {
    assert.match(args.join(' '), /network=\{enabled=false\}/);
    assert.ok(!args.join(' ').includes('mcp_servers.scoped_game_bsk'));
  }
});

test('browser stages without run-scoped context block before worker launch', async t => {
  const f = await fixture(t); let calls = 0;
  for (const index of [0, 4, 5]) {
    const result = await createSkillExecutor({ run: async () => { calls++; } })(STAGES[index], {
      runId: '', mode: 'audit-only', outputDirectory: join(f.configuration.workspace, 'artifacts'),
      inputs: { ...f.inputs, projectPath: join(f.configuration.workspace, 'site') } });
    assert.equal(result.status, 'BLOCKED'); assert.match(result.evidence[0], /APPROVAL_CAPABILITY_UNAVAILABLE/);
  }
  assert.equal(calls, 0);
});

test('keyword research runs the locked Skill CLI with stage-scoped network and environment credentials', async t => {
  const f = await fixture(t), root = join(f.configuration.workspace, 'runs/keyword-network');
  const ytDlp = join(f.root, 'Cellar/yt-dlp/test/libexec/bin/yt-dlp');
  await mkdir(dirname(ytDlp), { recursive: true });
  await writeFile(ytDlp, `#!${process.execPath}\nconsole.log('2026.08.19');\n`, { mode: 0o500 });
  let invoked;
  const executor = createSkillExecutor({ environment: {
    PATH: '/synthetic', HOME: process.env.HOME, CODEX_HOME: process.env.CODEX_HOME,
    SERPER_API_KEY: 'SYNTHETIC_SECRET'
  }, researchPython: process.execPath, researchYtDlp: ytDlp,
  run: async (_command, args, options) => {
    invoked = { args, options };
    await writeFile(args[args.indexOf('--output-last-message') + 1], JSON.stringify({
      status: 'BLOCKED', artifacts: [], missing_inputs: [], evidence: ['SYNTHETIC RESEARCH STOP'] }));
  } });
  const result = await executor(STAGES[1], { runId: 'keyword-network',
    inputs: { ...f.inputs, projectPath: join(f.configuration.workspace, 'site') },
    outputDirectory: join(root, 'artifacts/1/1'), requiredArtifacts: ARTIFACTS[1],
    skillLock: { source: join(f.root, 'skills', STAGES[1] + '.md') }, upstream: [],
    permissions: { siteWrites: false } });
  assert.equal(result.status, 'BLOCKED');
  assert.equal(invoked.options.env.SERPER_API_KEY, 'SYNTHETIC_SECRET');
  assert.match(invoked.args.find(value => value.startsWith('permissions.agent-worker=')), /network=\{enabled=true\}/);
  const path = invoked.args.find(value => value.startsWith('shell_environment_policy.set='));
  assert.ok(path.indexOf(dirname(process.execPath)) < path.indexOf('/usr/bin'));
  assert.ok(invoked.args.find(value => value.startsWith('permissions.agent-worker='))
    .includes(JSON.stringify(dirname(dirname(process.execPath))) + '="read"'));
  assert.ok(invoked.options.input.includes(`Use ${process.execPath} for every Python Skill script`));
  assert.match(invoked.options.input, /Use the Skill serper command/);
  assert.match(invoked.options.input, /host-tools\/keyword-research\/yt-dlp/);
  assert.equal(invoked.options.input.includes('SYNTHETIC_SECRET'), false);
  assert.equal(invoked.options.timeoutMs, 1800000);
  assert.match(invoked.options.input, /handoffDeadline/);
});

test('keyword budget is stage-scoped and invalid budgets block before worker launch', async t => {
  const f = await keywordLaunchFixture(t);
  f.context.inputs.keywordResearchBudget = { timeoutMs: 1200000, handoffMarginMs: 240000 };
  await f.executor(STAGES[1], f.context);
  assert.equal(f.calls[0].options.timeoutMs, 1200000);
  assert.match(f.calls[0].options.input, /240000/);
  f.context.inputs.keywordResearchBudget = { timeoutMs: 1000, handoffMarginMs: 2000 };
  await assert.rejects(f.executor(STAGES[1], f.context), /KEYWORD_BUDGET_INVALID/);
  assert.equal(f.calls.length, 1);
});

test('an explicit trusted-host timeout still caps keyword research and cannot be raised by task input', async t => {
  const f = await keywordLaunchFixture(t, { executorTimeoutMs: 300000 });
  await f.executor(STAGES[1], f.context);
  assert.equal(f.calls[0].options.timeoutMs, 300000, 'preserve the existing selfcheck five-minute cap');
  f.context.outputDirectory = join(f.root, 'artifacts/1/2');
  f.context.inputs.keywordResearchBudget = { timeoutMs: 3600000, handoffMarginMs: 180000 };
  await f.executor(STAGES[1], f.context);
  assert.equal(f.calls[1].options.timeoutMs, 300000);
  f.context.outputDirectory = join(f.root, 'artifacts/1/3');
  f.context.inputs.keywordResearchBudget = { timeoutMs: 120000, handoffMarginMs: 30000 };
  await f.executor(STAGES[1], f.context);
  assert.equal(f.calls[2].options.timeoutMs, 120000, 'the smaller task budget also remains effective');
});

test('inherited provider stops are shared readonly policy and suspend subtitle CLI requests', async t => {
  const f = await keywordLaunchFixture(t);
  f.context.inputs.keywordServiceStops = ['youtube-subtitles', 'steam-community'];
  f.context.inputs.keywordServiceResumes = [];
  await f.executor(STAGES[1], f.context);
  const policy = join(f.context.outputDirectory, 'keyword-service-stops.json');
  assert.deepEqual(JSON.parse(await readFile(policy)).services, f.context.inputs.keywordServiceStops);
  const profile = f.calls[0].args.find(value => value.startsWith('permissions.agent-worker='));
  assert.ok(profile.includes(JSON.stringify(policy) + '="read"'));
  const wrapper = join(f.root, 'host-tools/keyword-research/yt-dlp');
  for (const flag of ['--write-subs', '--write-auto-subs'])
    await assert.rejects(runProcess(wrapper, [flag, 'synthetic.invalid'], { env: { PATH: '/usr/bin:/bin' } }),
      /KEYWORD_SERVICE_SUSPENDED/);
  assert.equal((await runProcess(wrapper, ['--version'], { env: { PATH: '/usr/bin:/bin' } })).exitCode, 0);
  f.context.inputs.keywordServiceStops = ['unknown-provider'];
  await assert.rejects(f.executor(STAGES[1], f.context), /KEYWORD_SERVICE_STOPS_INVALID/);
  assert.equal(f.calls.length, 1);
});

test('explicit recovered-service resumes reach the worker context without weakening other stops', async t => {
  const f = await keywordLaunchFixture(t);
  f.context.inputs.keywordServiceStops = ['steam-community'];
  f.context.inputs.keywordServiceResumes = ['youtube-subtitles'];
  await f.executor(STAGES[1], f.context);
  assert.match(f.calls[0].options.input,
    /"keywordServiceResumes":\{"services":\["youtube-subtitles"\]\}/);
  assert.match(f.calls[0].options.input, /resumes are the only host-confirmed exceptions/);
  const policy = JSON.parse(await readFile(join(f.context.outputDirectory, 'keyword-service-stops.json')));
  assert.deepEqual(policy.services, ['steam-community']);
});

async function keywordLaunchFixture(t, { versionFailure = null, withCookies = true,
  leakCredentialInFailure = false, frameworkRuntime = false, tlsImportFailure = false,
  emptyCertificate = false, workerRun, executorTimeoutMs } = {}) {
  const f = await fixture(t), root = join(f.configuration.workspace, 'runs/keyword-env');
  const libexec = join(f.root, 'Cellar/yt-dlp/test/libexec');
  const script = join(libexec, 'bin/yt-dlp'), interpreter = join(libexec, 'bin/python');
  const interpreterAlias = join(f.root, 'opt/python/bin/python'), link = join(f.root, 'yt-dlp');
  await mkdir(dirname(script), { recursive: true });
  await mkdir(dirname(interpreterAlias), { recursive: true });
  let python = process.execPath, frameworkPython, dependencyPaths = [], certificateFile;
  if (frameworkRuntime) {
    const framework = join(f.root, "Cellar/python@3.14/test/Frameworks/Python's.framework/Versions/3.14");
    python = join(framework, 'bin/python3');
    frameworkPython = join(framework, 'Resources/Python.app/Contents/MacOS/Python');
    await mkdir(dirname(python), { recursive: true });
    await mkdir(dirname(frameworkPython), { recursive: true });
    // Model the broken launcher boundary while leaving the actual runtime usable.
    await writeFile(python, `#!${process.execPath}\n` +
      `if (process.argv.at(-1) === 'import ssl') {\n` +
      `  if (process.env.DYLD_LIBRARY_PATH !== ${JSON.stringify(join(f.root, 'Cellar/openssl@3/test/lib'))}) process.exit(75);\n` +
      `  if (process.env.SSL_CERT_FILE !== ${JSON.stringify(join(f.root, 'etc/ca-certificates/cert.pem'))}) process.exit(76);\n` +
      `  process.exit(${tlsImportFailure ? 77 : 0});\n` +
      `}\n` +
      `console.error('launcher-unavailable'); process.exit(73);\n`, { mode: 0o500 });
    await writeFile(frameworkPython, `#!${process.execPath}\n` +
      `if (process.env.__PYVENV_LAUNCHER__ !== ${JSON.stringify(interpreter)}) process.exit(74);\n` +
      `if (process.argv.at(-1) === '--version') console.log('2026.08.19');\n` +
      `else { console.log(JSON.stringify(process.argv.slice(2))); process.exit(9); }\n`, { mode: 0o500 });
    await writeFile(join(libexec, 'pyvenv.cfg'), 'version = 3.14.7\n');
    const certifi = join(f.root, 'Cellar/certifi/test/lib/python3.14/site-packages/certifi');
    const ssl = join(f.root, 'Cellar/openssl@3/test/lib');
    await mkdir(certifi, { recursive: true });
    await mkdir(ssl, { recursive: true });
    certificateFile = join(f.root, 'etc/ca-certificates/cert.pem');
    await mkdir(dirname(certificateFile), { recursive: true });
    await writeFile(certificateFile, emptyCertificate ? '' : 'SYNTHETIC CERTIFICATE');
    await symlink(certificateFile, join(certifi, 'cacert.pem'));
    await symlink(join(f.root, 'Cellar/certifi/test'), join(f.root, 'opt/certifi'));
    await symlink(join(f.root, 'Cellar/openssl@3/test'), join(f.root, 'opt/openssl@3'));
    dependencyPaths = [certifi, join(ssl, 'libssl.3.dylib'), join(ssl, 'libcrypto.3.dylib')];
    for (const path of dependencyPaths.slice(1)) await writeFile(path, 'fixture library');
  }
  await symlink(python, interpreterAlias);
  await symlink(interpreterAlias, interpreter);
  const environment = { HOME: process.env.HOME, CODEX_HOME: process.env.CODEX_HOME,
    SERPER_API_KEY: randomUUID(), ...(withCookies ? { YTDLP_COOKIES_FILE: join(f.root, 'cookies.txt') } : {}) };
  const failureOutput = leakCredentialInFailure
    ? `${versionFailure} ${environment.SERPER_API_KEY}` : versionFailure;
  const body = versionFailure
    ? `console.error(${JSON.stringify(failureOutput)}); process.exit(7);`
    : `console.log('2026.08.19');`;
  await writeFile(script, `#!${frameworkRuntime ? interpreter : python}\n${body}\n`, { mode: 0o500 });
  await symlink(script, link);
  const calls = [];
  const hostEvidence = async context => {
    const directory = join(context.inputs.projectPath, 'docs/offline-evidence');
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, 'evidence.txt'), 'offline host evidence');
    return snapshotSiteEvidence(directory);
  };
  const executor = createSkillExecutor({ environment, researchPython: python, researchYtDlp: link, timeoutMs: executorTimeoutMs,
    previewSite: async () => ({ url: 'http://127.0.0.1:3001', stop: async () => {} }),
    auditSite: hostEvidence, prelaunchSite: hostEvidence,
    run: async (command, args, options) => {
      calls.push({ command, args, options });
      if (workerRun) return workerRun(command, args, options);
      await writeFile(args[args.indexOf('--output-last-message') + 1], JSON.stringify({
        status: 'BLOCKED', artifacts: [], missing_inputs: [], evidence: ['offline worker fixture'] }));
    } });
  const context = { runId: 'keyword-env', inputs: { ...f.inputs, projectPath: join(f.configuration.workspace, 'site') },
    outputDirectory: join(root, 'artifacts/1/1'), requiredArtifacts: ARTIFACTS[1],
    skillLock: { source: join(f.root, 'skills', STAGES[1] + '.md') }, upstream: [], permissions: { siteWrites: false } };
  return { f, root, libexec, script, interpreterAlias, interpreter, python, frameworkPython,
    dependencyPaths, certificateFile, environment, calls, executor, context };
}

async function attachEvidencePlan(f, recovery) {
  const plan = { kind: 'KEYWORD_EVIDENCE_PLAN_V1', runId: f.context.runId,
    stage: STAGES[1], recoverySha256: recovery.sha256, serviceStops: [], serviceResumes: [],
    tasks: [{ keyword: 'Fixture guide', rawRows: [1], gap: 'Missing official fact', tool: 'serper',
      target: 'Fixture guide official documentation',
      expectedEvidence: 'First-party page body for the missing fact' }], pendingRows: [] };
  const bytes = Buffer.from(JSON.stringify(plan));
  const path = join(f.root, 'keyword-evidence-plan-' + randomUUID() + '.json');
  await writeFile(path, bytes);
  f.context.inputs.keywordEvidencePlan = { path, sha256: sha256(bytes) };
}

test('keyword timeout preserves host-hashed progress without advancing or registering artifacts', async t => {
  const f = await keywordLaunchFixture(t, { workerRun: async (_command, _args, options) => {
    await writeFile(join(options.cwd, 'Fixture素材.md'), '- 状态: PARTIAL\n- 缺口: synthetic HTTP 429');
    throw Object.assign(Error('Worker timed out'), { code: 'WORKER_TIMEOUT' });
  } });
  const p = await createPipeline({ ...f.f.configuration, runId: 'keyword-env', inputs: f.f.inputs,
    executor: (skill, context) => skill === STAGES[0] ? goodResult(skill, context) : f.executor(skill, context) });
  await p.advance();
  const failed = await p.advance();
  assert.equal(failed.stages[1].status, 'FAILED');
  assert.equal(failed.stages[1].diagnostic.code, 'WORKER_TIMEOUT');
  assert.deepEqual(failed.stages[1].artifacts, []);
  assert.equal(failed.stages[2].status, 'NOT_STARTED');
  const ref = JSON.parse(await readFile(join(f.root, 'artifacts/1/1/keyword-recovery.json')));
  const verified = await verifyKeywordRecovery({ ...f.context,
    outputDirectory: join(f.root, 'artifacts/1/2') }, ref);
  assert.equal(verified.sourceAttempt, 1);
  assert.match(await readFile(join(verified.directory, 'data/Fixture素材.md'), 'utf8'), /PARTIAL/);
});

test('keyword recovery copies only selected data and grants reads only to selected immutable files', async t => {
  const f = await keywordLaunchFixture(t);
  const native = join(f.context.outputDirectory, 'native'); await mkdir(native, { recursive: true });
  await writeFile(join(native, 'selected.txt'), 'verified old public evidence');
  await writeFile(join(native, 'unselected.txt'), 'must not be exposed');
  const ref = await captureKeywordRecovery(f.context, { reason: 'WORKER_TIMEOUT' });
  f.context.inputs.keywordRecovery = { ...ref, files: ['selected.txt'] };
  await attachEvidencePlan(f, ref);
  f.context.outputDirectory = join(f.root, 'artifacts/1/2');
  const result = await f.executor(STAGES[1], f.context);
  assert.equal(result.status, 'BLOCKED');
  assert.deepEqual(result.artifacts, []);
  assert.equal(await readFile(join(f.context.outputDirectory, 'native/selected.txt'), 'utf8'), 'verified old public evidence');
  await assert.rejects(access(join(f.context.outputDirectory, 'native/unselected.txt')), { code: 'ENOENT' });
  const profile = f.calls[0].args.find(value => value.startsWith('permissions.agent-worker='));
  const recoveryDirectory = dirname(ref.manifestPath);
  assert.ok(profile.includes(JSON.stringify(join(recoveryDirectory, 'data/selected.txt')) + '="read"'));
  assert.ok(!profile.includes(JSON.stringify(recoveryDirectory) + '='));
  assert.ok(!profile.includes(JSON.stringify(join(recoveryDirectory, 'data/unselected.txt')) + '='));
  assert.match(f.calls[0].options.input, /ALL keywords/);
  assert.match(f.calls[0].options.input, /Never execute recovered files/);
  assert.match(f.calls[0].options.input, /return exactly the three top-level artifact roles/i);
  assert.match(f.calls[0].options.input, /Never return keyword-material:/);
});

test('recovery converts a report-only retry to a no-progress blocker', async t => {
  const f = await keywordLaunchFixture(t, { workerRun: async (_command, args, options) => {
    await writeFile(join(options.cwd, '关键词素材汇总.md'), '# same recovered facts, new prose');
    await writeFile(args[args.indexOf('--output-last-message') + 1], JSON.stringify({
      status: 'PARTIAL', artifacts: [], missing_inputs: [], evidence: ['Revalidated recovered files only'] }));
  } });
  const native = join(f.context.outputDirectory, 'native/evidence');
  await mkdir(native, { recursive: true });
  await writeFile(join(native, 'old.json'), '{"fact":"old"}');
  const recovery = await captureKeywordRecovery(f.context, { reason: 'WORKER_STOPPED' });
  f.context.inputs.keywordRecovery = recovery;
  await attachEvidencePlan(f, recovery);
  f.context.outputDirectory = join(f.root, 'artifacts/1/2');
  const result = await f.executor(STAGES[1], f.context);
  assert.equal(result.status, 'BLOCKED');
  assert.match(result.evidence.join('\n'), /KEYWORD_EVIDENCE_PLAN_NO_PROGRESS/);
});

test('recovery retains PARTIAL when the plan saves new evidence', async t => {
  const f = await keywordLaunchFixture(t, { workerRun: async (_command, args, options) => {
    await mkdir(join(options.cwd, 'evidence'), { recursive: true });
    await writeFile(join(options.cwd, 'evidence/new.json'), '{"fact":"new"}');
    await writeFile(args[args.indexOf('--output-last-message') + 1], JSON.stringify({
      status: 'PARTIAL', artifacts: [], missing_inputs: [], evidence: ['Saved one new source'] }));
  } });
  const native = join(f.context.outputDirectory, 'native/evidence');
  await mkdir(native, { recursive: true });
  await writeFile(join(native, 'old.json'), '{"fact":"old"}');
  const recovery = await captureKeywordRecovery(f.context, { reason: 'WORKER_STOPPED' });
  f.context.inputs.keywordRecovery = recovery;
  await attachEvidencePlan(f, recovery);
  f.context.outputDirectory = join(f.root, 'artifacts/1/2');
  const result = await f.executor(STAGES[1], f.context);
  assert.equal(result.status, 'PARTIAL');
  assert.match(result.evidence.join('\n'), /evidence\/new\.json/);
});

test('keyword contract failure preserves PARTIAL worker status and a recovery snapshot', async t => {
  const f = await keywordLaunchFixture(t, { workerRun: async (_command, args, options) => {
    const files = {
      'keywords.json': JSON.stringify({ categories: [{ category: 'Guide', keywords: ['Fixture guide'] }] }),
      '关键词处理记录.md': '# Fixture processing',
      '关键词素材汇总.md': '# Fixture summary',
      'Fixture guide素材.md': '- 状态: PARTIAL\n- 缺口: synthetic provider stop',
    };
    for (const [name, content] of Object.entries(files)) await writeFile(join(options.cwd, name), content);
    const output = args[args.indexOf('--output-last-message') + 1];
    await writeFile(output, JSON.stringify({ status: 'PARTIAL', missing_inputs: [], evidence: ['SYNTHETIC partial'],
      artifacts: [
        { kind: 'keywords.json', path: join(options.cwd, 'keywords.json') },
        { kind: '关键词处理记录.md', path: join(options.cwd, '关键词处理记录.md') },
        { kind: '关键词素材汇总.md', path: join(options.cwd, '关键词素材汇总.md') },
        { kind: 'keyword-material:Fixture guide', path: join(options.cwd, 'Fixture guide素材.md') },
      ] }));
  } });
  await assert.rejects(f.executor(STAGES[1], f.context), error => {
    assert.equal(error.diagnosticOperation, 'validate-native-artifacts');
    assert.equal(error.workerStatus, 'PARTIAL');
    assert.equal(error.hostValidation, 'FAILED');
    assert.match(error.message, /host-derived/);
    return true;
  });
  const checkpoint = JSON.parse(await readFile(join(f.context.outputDirectory, 'keyword-recovery.json')));
  const verified = await verifyKeywordRecovery({ ...f.context,
    outputDirectory: join(f.root, 'artifacts/1/2') }, checkpoint);
  assert.equal(verified.sourceAttempt, 1);
});

test('post-worker recovery integrity errors do not hide an original worker timeout', async t => {
  let ref;
  const f = await keywordLaunchFixture(t, { workerRun: async () => {
    // Host-side fault injection; the real worker has no write permission here.
    await chmod(ref.manifestPath, 0o600); await writeFile(ref.manifestPath, '{}');
    throw Object.assign(Error('Worker timed out'), { code: 'WORKER_TIMEOUT' });
  } });
  const native = join(f.context.outputDirectory, 'native'); await mkdir(native, { recursive: true });
  await writeFile(join(native, 'public.txt'), 'partial evidence');
  ref = await captureKeywordRecovery(f.context, { reason: 'WORKER_TIMEOUT' });
  f.context.inputs.keywordRecovery = ref; await attachEvidencePlan(f, ref);
  f.context.outputDirectory = join(f.root, 'artifacts/1/2');
  await assert.rejects(f.executor(STAGES[1], f.context), error =>
    error.code === 'WORKER_TIMEOUT' && /KEYWORD_RECOVERY_CHANGED_AFTER_WORKER/.test(error.message));
});

test('keyword framework launcher preserves venv identity, arguments and exit status without alias grants', async t => {
  const f = await keywordLaunchFixture(t, { frameworkRuntime: true });
  await f.executor(STAGES[1], f.context);
  assert.equal(f.calls.length, 1, 'host version preflight must reach the framework runtime');
  const wrapper = join(f.root, 'host-tools/keyword-research/yt-dlp');
  const content = await readFile(wrapper, 'utf8');
  assert.match(content, /__PYVENV_LAUNCHER__/);
  assert.ok(!content.includes(`exec '${f.python}'`));
  const profile = f.calls[0].args.find(value => value.startsWith('permissions.agent-worker='));
  assert.ok(profile.includes(JSON.stringify(f.libexec) + '="read"'));
  assert.ok(!profile.includes(JSON.stringify(f.interpreterAlias) + '="read"'));
  for (const path of f.dependencyPaths) assert.ok(profile.includes(JSON.stringify(path) + '="read"'));
  assert.ok(!profile.includes(JSON.stringify(dirname(f.dependencyPaths[1])) + '="read"'));
  assert.ok(!profile.includes(JSON.stringify(join(f.f.root, 'Cellar')) + '="read"'));
  assert.match(content, /export DYLD_LIBRARY_PATH=/);
  const version = await runProcess(wrapper, ['--version'], { env: { PATH: '/usr/bin:/bin' } });
  assert.equal(version.stdout.trim(), '2026.08.19');
  await assert.rejects(runProcess(wrapper, ['argument with spaces', "single'quote"], { env: { PATH: '/usr/bin:/bin' } }), error => {
    assert.equal(error.exitCode, 9);
    assert.ok(error.message.includes(JSON.stringify(['-I', f.script, 'argument with spaces', "single'quote"])));
    return true;
  });
});

test('keyword TLS uses resolved Homebrew paths and grants only the certificate file', async t => {
  const f = await keywordLaunchFixture(t, { frameworkRuntime: true });
  await f.executor(STAGES[1], f.context);
  assert.equal(f.calls.length, 1);
  const args = f.calls[0].args;
  const shellEnvironment = args.find(value => value.startsWith('shell_environment_policy.set='));
  const opensslDirectory = dirname(f.dependencyPaths[1]);
  assert.equal(shellEnvironment.includes('DYLD_LIBRARY_PATH'), false);
  assert.equal(shellEnvironment.includes('SSL_CERT_FILE'), false);
  assert.equal(f.calls[0].options.env.DYLD_LIBRARY_PATH, opensslDirectory);
  assert.equal(f.calls[0].options.env.SSL_CERT_FILE, f.certificateFile);
  const nativeDirectory = join(f.context.outputDirectory, 'native');
  const zdotDirectory = join(f.root, 'host-tools/keyword-research/zdotdir');
  const zshEnvironment = join(zdotDirectory, '.zshenv');
  assert.equal(f.calls[0].options.env.ZDOTDIR, zdotDirectory);
  assert.equal(inside(nativeDirectory, zdotDirectory), false);
  assert.equal(inside(zdotDirectory, nativeDirectory), false);
  assert.ok(args.includes('shell_environment_policy.include_only=["PATH","TMPDIR","SERPER_API_KEY","YTDLP_COOKIES_FILE","DYLD_LIBRARY_PATH","SSL_CERT_FILE","ZDOTDIR"]'));
  assert.equal(await readFile(zshEnvironment, 'utf8'),
    `export DYLD_LIBRARY_PATH='${opensslDirectory}'\nexport SSL_CERT_FILE='${f.certificateFile}'\n`);
  await assert.rejects(access(join(nativeDirectory, '.zshenv')), error => error.code === 'ENOENT');
  assert.equal((await stat(zshEnvironment)).mode & 0o777, 0o400);
  const profile = args.find(value => value.startsWith('permissions.agent-worker='));
  assert.ok(profile.includes(JSON.stringify(zdotDirectory) + '="read"'));
  assert.equal(profile.includes(JSON.stringify(zdotDirectory) + '="write"'), false);
  assert.equal(profile.includes(JSON.stringify(dirname(zdotDirectory)) + '="write"'), false);
  assert.ok(profile.includes(JSON.stringify(nativeDirectory) + '="write"'));
  assert.ok(profile.includes(JSON.stringify(f.certificateFile) + '="read"'));
  assert.equal(profile.includes(JSON.stringify(dirname(f.certificateFile)) + '='), false);
  assert.equal(profile.includes(JSON.stringify(join(f.f.root, 'etc')) + '='), false);
  assert.equal(f.dependencyPaths.filter(path => profile.includes(JSON.stringify(path) + '="read"')).length,
    f.dependencyPaths.length);

  await f.executor(STAGES[1], f.context);
  assert.equal(f.calls.length, 2, 'retry must replace the read-only shell environment before worker launch');
  assert.equal((await stat(zshEnvironment)).mode & 0o777, 0o400);
});

test('keyword TLS host preflight blocks before worker launch and reports concrete paths', async t => {
  for (const options of [{ emptyCertificate: true }, { tlsImportFailure: true }]) {
    await t.test(Object.keys(options)[0], async t => {
      const f = await keywordLaunchFixture(t, { frameworkRuntime: true, ...options });
      const result = await f.executor(STAGES[1], f.context);
      assert.equal(f.calls.length, 0);
      assert.equal(result.status, 'BLOCKED');
      const evidence = result.evidence.join('\n');
      assert.ok(evidence.includes(f.certificateFile));
      if (options.tlsImportFailure) {
        assert.ok(evidence.includes(f.python));
        assert.ok(evidence.includes(dirname(f.dependencyPaths[1])));
      }
      assert.ok(!evidence.includes(f.environment.SERPER_API_KEY));
    });
  }
});

test('keyword dependency symlinks cannot grant reads outside their Homebrew formula', async t => {
  const f = await keywordLaunchFixture(t, { frameworkRuntime: true });
  await unlink(join(f.f.root, 'opt/certifi'));
  await symlink(f.f.root, join(f.f.root, 'opt/certifi'));
  const result = await f.executor(STAGES[1], f.context);
  assert.equal(f.calls.length, 0);
  assert.equal(result.status, 'BLOCKED');
  assert.match(result.evidence.join('\n'), /YTDLP_DEPENDENCY_OUTSIDE_FORMULA/);
});

test('keyword framework launcher blocks a venv from a different Python installation', async t => {
  const f = await keywordLaunchFixture(t, { frameworkRuntime: true });
  await unlink(f.interpreterAlias);
  await symlink(process.execPath, f.interpreterAlias);
  const result = await f.executor(STAGES[1], f.context);
  assert.equal(f.calls.length, 0);
  assert.equal(result.status, 'BLOCKED');
  assert.match(result.evidence.join('\n'), /YTDLP_PYTHON_MISMATCH/);
});

test('keyword framework runtime cannot resolve outside the existing Python read root', async t => {
  const f = await keywordLaunchFixture(t, { frameworkRuntime: true });
  await unlink(f.frameworkPython);
  await symlink(process.execPath, f.frameworkPython);
  const result = await f.executor(STAGES[1], f.context);
  assert.equal(f.calls.length, 0);
  assert.equal(result.status, 'BLOCKED');
  assert.match(result.evidence.join('\n'), /YTDLP_FRAMEWORK_OUTSIDE_PYTHON_ROOT/);
});

test('keyword venv without pyvenv.cfg fails closed instead of using base packages', async t => {
  const f = await keywordLaunchFixture(t, { frameworkRuntime: true });
  await unlink(join(f.libexec, 'pyvenv.cfg'));
  const result = await f.executor(STAGES[1], f.context);
  assert.equal(f.calls.length, 0);
  assert.equal(result.status, 'BLOCKED');
  assert.match(result.evidence.join('\n'), /YTDLP_VENV_CONFIG_MISSING/);
});

test('keyword standalone entry point cannot select an unpinned interpreter', async t => {
  const f = await keywordLaunchFixture(t);
  await unlink(f.script);
  await writeFile(f.script, '#!/bin/sh\necho 2026.08.19\n', { mode: 0o500 });
  const result = await f.executor(STAGES[1], f.context);
  assert.equal(f.calls.length, 0);
  assert.equal(result.status, 'BLOCKED');
  assert.match(result.evidence.join('\n'), /YTDLP_PYTHON_MISMATCH/);
});

test('keyword shell inherits only credential names without exposing values in launch arguments', async t => {
  for (const withCookies of [true, false]) {
    const f = await keywordLaunchFixture(t, { withCookies, frameworkRuntime: true });
    await f.executor(STAGES[1], f.context);
    assert.equal(f.calls.length, 1);
    const { args, options } = f.calls[0];
    assert.ok(args.includes('shell_environment_policy.inherit="all"'));
    assert.ok(args.includes('shell_environment_policy.ignore_default_excludes=true'));
    const allowed = ['PATH', 'TMPDIR', 'SERPER_API_KEY', ...(withCookies ? ['YTDLP_COOKIES_FILE'] : []),
      'DYLD_LIBRARY_PATH', 'SSL_CERT_FILE', 'ZDOTDIR'];
    assert.ok(args.includes(`shell_environment_policy.include_only=${JSON.stringify(allowed)}`));
    for (const name of ['SERPER_API_KEY', 'YTDLP_COOKIES_FILE']) {
      assert.ok(!f.environment[name] || !args.join(' ').includes(f.environment[name]), 'launch arguments must not contain credential values');
      assert.ok(options.env[name] === f.environment[name], 'only the process environment carries credentials');
    }
    assert.equal(args.join(' ').includes('YTDLP_COOKIES_FILE'), withCookies);
    await mkdir(f.f.inputs.paths.researchDirectory, { recursive: true });
    for (const index of [0, 2, 3, 4, 5, 6, 7]) {
      const otherRunDirectory = join(f.root, `other-runs/${index}`);
      const stageContext = { ...f.context, outputDirectory: join(otherRunDirectory, `artifacts/${index}/1`),
        mode: 'plan-only', requiredArtifacts: ARTIFACTS[index],
        upstream: [0, 1].map(i => ({ skill: STAGES[i], artifacts: [] })),
        skillLock: { source: join(f.f.root, 'skills', ALL_STAGES[index] + '.md') } };
      const count = f.calls.length;
      await f.executor(ALL_STAGES[index], stageContext);
      assert.equal(f.calls.length, count + 1);
      const other = f.calls.at(-1);
      assert.ok(other.args.includes('shell_environment_policy.inherit="none"'));
      assert.ok(!/SERPER_API_KEY|YTDLP_COOKIES_FILE|DYLD_LIBRARY_PATH|SSL_CERT_FILE|ZDOTDIR/.test(other.args.join(' ')));
      for (const name of ['SERPER_API_KEY', 'YTDLP_COOKIES_FILE', 'DYLD_LIBRARY_PATH', 'SSL_CERT_FILE', 'ZDOTDIR'])
        assert.equal(other.options.env[name], undefined);
      await assert.rejects(access(join(otherRunDirectory, 'host-tools/keyword-research/zdotdir/.zshenv')),
        error => error.code === 'ENOENT');
    }
  }
});

test('keyword yt-dlp wrapper executes the resolved entry point and reads only its libexec root', async t => {
  const f = await keywordLaunchFixture(t);
  await f.executor(STAGES[1], f.context);
  const wrapper = join(f.root, 'host-tools/keyword-research/yt-dlp');
  assert.equal(await readFile(wrapper, 'utf8'), `#!/bin/sh\nexec '${f.script}' "$@"\n`);
  assert.ok(!(await readFile(wrapper, 'utf8')).includes(process.execPath));
  const profile = f.calls[0].args.find(value => value.startsWith('permissions.agent-worker='));
  const path = f.calls[0].args.find(value => value.startsWith('shell_environment_policy.set='));
  assert.ok(path.indexOf(dirname(wrapper)) < path.indexOf(dirname(process.execPath)));
  assert.ok(path.indexOf(dirname(wrapper)) < path.indexOf('/usr/bin'));
  assert.ok(profile.includes(JSON.stringify(f.libexec) + '="read"'));
  assert.ok(!profile.includes(JSON.stringify(f.interpreterAlias) + '="read"'),
    'keyword permissions must not add interpreter aliases outside libexec');
  assert.ok(!profile.includes('"/opt/homebrew"='));
  assert.ok(!profile.includes(JSON.stringify(join(f.f.root, 'Cellar')) + '='));
});

test('keyword retry atomically replaces an existing read-only yt-dlp wrapper', async t => {
  const f = await keywordLaunchFixture(t);
  await f.executor(STAGES[1], f.context);
  const wrapper = join(f.root, 'host-tools/keyword-research/yt-dlp');
  const expected = `#!/bin/sh\nexec '${f.script}' "$@"\n`;
  assert.equal(f.calls.length, 1);
  assert.equal((await stat(wrapper)).mode & 0o777, 0o500);

  await f.executor(STAGES[1], f.context);

  assert.equal(f.calls.length, 2, 'retry must reach the worker after replacing the 0500 wrapper');
  assert.equal(await readFile(wrapper, 'utf8'), expected);
  assert.equal((await stat(wrapper)).mode & 0o777, 0o500);
  assert.deepEqual(await readdir(dirname(wrapper)), ['yt-dlp']);
});

test('keyword wrapper replacement rejects unsafe existing targets without leaving temporary files', async t => {
  for (const kind of ['symlink', 'hardlink', 'directory']) {
    await t.test(kind, async t => {
      const f = await keywordLaunchFixture(t);
      await f.executor(STAGES[1], f.context);
      const wrapper = join(f.root, 'host-tools/keyword-research/yt-dlp');
      const outside = join(f.root, `${kind}-target`);
      await unlink(wrapper);
      if (kind === 'directory') {
        await mkdir(wrapper);
        await writeFile(join(wrapper, 'marker'), 'unchanged');
      } else {
        await writeFile(outside, 'unchanged');
        await (kind === 'symlink' ? symlink(outside, wrapper) : link(outside, wrapper));
      }

      const result = await f.executor(STAGES[1], f.context);

      assert.equal(result.status, 'BLOCKED');
      assert.equal(f.calls.length, 1, 'unsafe target must block before retry worker launch');
      assert.equal(await readFile(kind === 'directory' ? join(wrapper, 'marker') : outside, 'utf8'), 'unchanged');
      assert.deepEqual((await readdir(dirname(wrapper))).filter(name => name.endsWith('.tmp')), []);
    });
  }
});

test('keyword yt-dlp version failure blocks before worker launch with paths and sanitized output', async t => {
  const f = await keywordLaunchFixture(t, { versionFailure: 'venv module missing', leakCredentialInFailure: true });
  const result = await f.executor(STAGES[1], f.context);
  assert.equal(result.status, 'BLOCKED');
  assert.equal(f.calls.length, 0);
  const evidence = result.evidence.join('\n');
  assert.ok(evidence.includes(join(f.root, 'host-tools/keyword-research/yt-dlp')));
  assert.ok(evidence.includes(f.script));
  assert.match(evidence, /venv module missing/);
  assert.match(evidence, /7/);
  assert.ok(!evidence.includes(f.environment.SERPER_API_KEY), 'preflight evidence must not expose credentials');
});

test('a missing or non-executable pinned Python blocks a Python stage before worker launch and names the path', async t => {
  const f = await fixture(t), root = join(f.configuration.workspace, 'runs/python-unavailable');
  const nonExecutable = join(f.root, 'not-executable-python');
  await writeFile(nonExecutable, '#!/bin/sh\nexit 0\n', { mode: 0o600 });
  for (const python of [join(f.root, 'missing-python'), nonExecutable]) {
    let calls = 0;
    const executor = createSkillExecutor({ researchPython: python, run: async (_command, args) => {
      calls++;
      await writeFile(args[args.indexOf('--output-last-message') + 1], JSON.stringify({
        status: 'BLOCKED', artifacts: [], missing_inputs: [], evidence: ['SYNTHETIC WORKER STARTED'] }));
    } });
    const result = await executor(STAGES[2], { runId: 'python-unavailable',
      inputs: { ...f.inputs, projectPath: join(f.configuration.workspace, 'site') },
      outputDirectory: join(root, 'artifacts/2/1'), requiredArtifacts: ARTIFACTS[2],
      skillLock: { source: join(f.root, 'skills', STAGES[2] + '.md') }, upstream: [],
      permissions: { siteWrites: false } });
    assert.equal(result.status, 'BLOCKED');
    assert.match(result.evidence.join('\n'), /WORKER_PYTHON_UNAVAILABLE/);
    assert.ok(result.evidence.join('\n').includes(python));
    assert.equal(calls, 0);
  }
});

test('validated deployment plan is published to native docs with identical snapshot bytes and no worker site grant', async t => {
  const f = await fixture(t); const projectPath = join(f.configuration.workspace, 'site'); let invoked;
  const executor = createSkillExecutor({ run: async (_command, args, options) => {
    invoked = { args, options };
    const output = args[args.indexOf('--output-last-message') + 1];
    const plan = { schema_version: 1, status: 'AWAITING_CONFIRMATION', confirmation: { status: 'AWAITING_CONFIRMATION' },
      project: { path: projectPath, repository: f.inputs.repo, branch: f.inputs.branch },
      domain: { production_origin: 'https://' + f.inputs.domain }, github_sync: { push_authorized: false },
      architecture: {}, hosting: {}, measurement: {}, checks: [], risks: [], rollback: [] };
    const artifacts = [];
    for (const [kind, bytes] of [['DEPLOYMENT_PLAN.md', '# Offline fixture plan'], ['DEPLOYMENT_PLAN.json', JSON.stringify(plan)]]) {
      const path = join(options.cwd, kind); await writeFile(path, bytes); artifacts.push({ kind, path });
    }
    await writeFile(output, JSON.stringify({ status: 'PASSED', evidence: ['Offline worker fixture'], missing_inputs: [], artifacts }));
  } });
  const context = { runId: 'plan', inputs: { ...f.inputs, projectPath }, outputDirectory: join(f.configuration.workspace, 'runs/plan/artifacts/6/1'),
    requiredArtifacts: ARTIFACTS[6], skillLock: { source: join(f.root, 'skills', STAGES[6] + '.md') },
    upstream: [], mode: 'plan-only', permissions: { siteWrites: false, productionDeployment: false } };
  const result = await executor(STAGES[6], context);
  assert.ok(!invoked.args.includes('--add-dir'));
  for (const artifact of result.artifacts) {
    assert.equal(artifact.sourcePath, join(projectPath, 'docs', artifact.kind));
    const bytes = await readFile(artifact.sourcePath);
    assert.equal(bytes.toString('base64'), artifact.content); assert.equal(sha256(bytes), artifact.sourceSha256);
  }
  await executor(STAGES[6], context);
  await writeFile(join(projectPath, 'docs/DEPLOYMENT_PLAN.md'), 'unconfirmed user plan');
  await assert.rejects(executor(STAGES[6], context), /conflicts/);
  assert.equal(await readFile(join(projectPath, 'docs/DEPLOYMENT_PLAN.md'), 'utf8'), 'unconfirmed user plan');
});

test('deployment plan publication rolls back newly created files after a write failure', async t => {
  const f = await fixture(t); const projectPath = join(f.configuration.workspace, 'site');
  const result = { artifacts: ['DEPLOYMENT_PLAN.md', 'DEPLOYMENT_PLAN.json'].map(kind => ({ kind, content: 'offline fixture', encoding: 'utf8' })) };
  let count = 0;
  await assert.rejects(publishDeploymentPlan({ inputs: { projectPath } }, result, { write: async (...args) => {
    if (++count === 2) throw Error('Offline disk failure'); return writeFile(...args);
  } }), /disk failure/);
  await assert.rejects(access(join(projectPath, 'docs/DEPLOYMENT_PLAN.md')), { code: 'ENOENT' });
  await assert.rejects(access(join(projectPath, 'docs/DEPLOYMENT_PLAN.json')), { code: 'ENOENT' });
});

function deploymentExecutionContext(f, projectPath, extra = {}) {
  const runDirectory = join(f.configuration.workspace, 'runs/deploy');
  const plan = join(runDirectory, 'artifacts/6/1/0-DEPLOYMENT_PLAN.json');
  return { runId: 'deploy', inputs: { ...f.inputs, projectPath }, outputDirectory: join(runDirectory, 'artifacts/6/2'),
    requiredArtifacts: ['DEPLOYMENT_REPORT.md', 'DEPLOYMENT_REPORT.json'], skillLock: { source: join(f.root, 'skills', STAGES[6] + '.md') },
    upstream: [], mode: 'execute', approvedPlan: { digest: 'a'.repeat(64), artifacts: [{ kind: 'DEPLOYMENT_PLAN.json', path: plan }] },
    permissions: { siteWrites: true, gitPush: true, dns: true, productionDeployment: true, gsc: true, ga4: true, advertisingScripts: false },
    ...extra };
}

test('approved deployment worker gets network, the operator CLI logins and an execute-the-approved-plan prompt', async t => {
  const f = await fixture(t); const projectPath = join(f.configuration.workspace, 'site'); let invoked;
  await mkdir(projectPath, { recursive: true });
  const context = deploymentExecutionContext(f, projectPath);
  await mkdir(join(f.configuration.workspace, 'runs/deploy/artifacts/6/1'), { recursive: true });
  await writeFile(context.approvedPlan.artifacts[0].path, '{}');
  const executor = createSkillExecutor({ run: async (_command, args, options) => {
    invoked = { args, options };
    await writeFile(args[args.indexOf('--output-last-message') + 1], JSON.stringify({
      status: 'BLOCKED', artifacts: [], missing_inputs: [], evidence: ['SYNTHETIC deployment fixture'] }));
  }, deploymentTools: { paths: ['/opt/homebrew/bin'], readPaths: ['/opt/homebrew/Cellar/gh'],
    credentialPaths: [join(f.root, 'gh-config')] } });
  await executor(STAGES[6], context);
  const profile = invoked.args.find(value => value.startsWith('permissions.agent-worker='));
  assert.match(profile, /network=\{enabled=true\}/);
  assert.ok(profile.includes(JSON.stringify(join(f.root, 'gh-config')) + '="read"'));
  assert.ok(profile.includes(JSON.stringify(projectPath) + '="write"'));
  assert.ok(profile.includes(JSON.stringify(context.approvedPlan.artifacts[0].path) + '="read"'));
  const path = invoked.args.find(value => value.startsWith('shell_environment_policy.set='));
  assert.ok(path.indexOf('/opt/homebrew/bin') < path.indexOf('/usr/bin'), 'deployment tools precede system launchers');
  assert.match(path, /\/opt\/homebrew\/bin/);
  assert.match(invoked.options.input, /Execute the APPROVED deployment plan/);
  assert.match(invoked.options.input, /a{64}/);
  assert.match(invoked.options.input, /DEPLOYMENT_REPORT\.md/);
  assert.doesNotMatch(invoked.options.input, /No commit, push/);
  for (const key of ['GH_TOKEN', 'GITHUB_TOKEN', 'VERCEL_TOKEN']) assert.equal(invoked.options.env[key], undefined);
});

test('Git stages use the resolved fixed Git before system launchers and keep plan offline', async t => {
  const f = await fixture(t), projectPath = join(f.configuration.workspace, 'site');
  let invoked;
  const executor = createSkillExecutor({ run: async (_command, args, options) => {
    invoked = { args, options };
    await writeFile(args[args.indexOf('--output-last-message') + 1], JSON.stringify({
      status: 'BLOCKED', artifacts: [], missing_inputs: [], evidence: ['SYNTHETIC'] }));
  } });
  await executor(STAGES[6], deploymentExecutionContext(f, projectPath, { mode: 'plan', approvedPlan: undefined,
    permissions: { siteWrites: false, productionDeployment: false } }));
  const path = invoked.args.find(value => value.startsWith('shell_environment_policy.set='));
  const gitDirectory = dirname(await realpath('/opt/homebrew/bin/git'));
  assert.ok(path.indexOf(gitDirectory) < path.indexOf('/usr/bin'));
  assert.ok(path.includes('GIT_EXEC_PATH='));
  assert.match(invoked.args.find(value => value.startsWith('permissions.agent-worker=')), /network=\{enabled=false\}/);
  assert.ok(invoked.options.input.includes('git version'));
});

test('missing fixed Git blocks a Git stage before launching a worker', async t => {
  const f = await fixture(t), git = join(f.root, 'missing-git');
  let calls = 0;
  const executor = createSkillExecutor({ workerGit: git, run: async () => { calls++; } });
  const result = await executor(STAGES[6], deploymentExecutionContext(f, join(f.root, 'site'), {
    mode: 'plan', approvedPlan: undefined, permissions: { siteWrites: false, productionDeployment: false } }));
  assert.equal(result.status, 'BLOCKED');
  assert.match(result.evidence.join('\n'), /WORKER_GIT_UNAVAILABLE/);
  assert.ok(result.evidence.join('\n').includes(git));
  assert.equal(calls, 0);
});

test('audit-only hosts retain independent evidence when Git is unavailable, without substituting a worker Git', async t => {
  for (const skill of [STAGES[4], STAGES[5]]) {
    const f = await fixture(t), root = join(f.configuration.workspace, 'runs/audit-git-unknown');
    const projectPath = join(f.root, 'site');
    let audited = 0, stopped = 0, workerCalls = 0;
    const collect = async context => {
      audited++;
      const area = join(context.nativeDirectory, 'host-evidence');
      await mkdir(area); await writeFile(join(area, 'EVIDENCE.txt'), 'SYNTHETIC independent audit');
      return snapshotSiteEvidence(area);
    };
    const execute = createSkillExecutor({ workerGit: join(f.root, 'missing-git'), researchPython: process.execPath,
      previewSite: async () => ({ url: 'http://127.0.0.1:1', stop: async () => { stopped++; } }),
      auditSite: collect, prelaunchSite: collect, run: async () => { workerCalls++; } });
    const context = { runId: 'audit-git-unknown', outputDirectory: join(root, 'artifacts/4/1'),
      inputs: { ...f.inputs, projectPath }, requiredArtifacts: [], upstream: [], mode: 'audit-only',
      permissions: { siteWrites: false }, skillLock: { source: join(f.root, 'skills', skill + '.md') } };
    const result = await execute(skill, context);
    assert.equal(audited, 1);
    assert.equal(stopped, 1);
    assert.equal(workerCalls, 0);
    assert.equal(result.status, 'BLOCKED');
    assert.match(result.evidence.join('\n'), /GIT_STATE_UNKNOWN/);
    assert.match(result.evidence.join('\n'), /host-evidence/);
    assert.deepEqual(result.artifacts, []);
    const repair = await execute(skill, { ...context, mode: 'audit-and-repair', permissions: { siteWrites: true } });
    assert.equal(repair.status, 'BLOCKED');
    assert.equal(audited, 1);
    assert.equal(workerCalls, 0);
  }
});

test('the plan pass stays offline and keeps the no-commit instruction', async t => {
  const f = await fixture(t); const projectPath = join(f.configuration.workspace, 'site'); let invoked;
  const executor = createSkillExecutor({ run: async (_command, args, options) => {
    invoked = { args, options };
    await writeFile(args[args.indexOf('--output-last-message') + 1], JSON.stringify({
      status: 'BLOCKED', artifacts: [], missing_inputs: [], evidence: ['SYNTHETIC plan fixture'] }));
  }, deploymentTools: { paths: ['/opt/homebrew/bin'], readPaths: [], credentialPaths: [join(f.root, 'gh-config')] } });
  await executor(STAGES[6], deploymentExecutionContext(f, projectPath, { mode: 'plan', approvedPlan: undefined,
    requiredArtifacts: ARTIFACTS[6], permissions: { siteWrites: false, gitPush: false, productionDeployment: false } }));
  const profile = invoked.args.find(value => value.startsWith('permissions.agent-worker='));
  assert.match(profile, /network=\{enabled=false\}/);
  assert.equal(profile.includes('gh-config'), false);
  assert.match(invoked.options.input, /No commit, push/);
});

test('execute mode without production permission or an approved plan is refused before the worker starts', async t => {
  const f = await fixture(t); const projectPath = join(f.configuration.workspace, 'site'); let started = false;
  const executor = createSkillExecutor({ run: async () => { started = true; } });
  await assert.rejects(executor(STAGES[6], deploymentExecutionContext(f, projectPath, {
    permissions: { siteWrites: true, productionDeployment: false } })), /DEPLOYMENT_EXECUTION_NOT_APPROVED/);
  await assert.rejects(executor(STAGES[6], deploymentExecutionContext(f, projectPath, { approvedPlan: undefined })),
    /DEPLOYMENT_EXECUTION_NOT_APPROVED/);
  assert.equal(started, false);
});
