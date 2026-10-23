import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { EventEmitter } from 'node:events';
import { sha256 } from '../src/files.mjs';
import { createSkillExecutor } from '../src/skill-executor.mjs';

const api = await import('../src/site-preview-host.mjs').catch(() => ({}));
const toolchain = (project, lock, manager, installArgs) => ({
  schemaVersion: 1, kind: 'SITE_PACKAGE_MANAGER_CONTEXT_V1', manager,
  executable: `/fixed/${manager}`, executableSha256: 'a'.repeat(64), version: '1.2.3',
  declared: manager === 'pnpm' ? 'pnpm@1.2.3' : null,
  packageJson: { path: join(project, 'package.json'), sha256: 'b'.repeat(64) },
  lockfile: { path: join(project, lock), name: lock, sha256: sha256('locked') },
  installArgs,
});
async function fixture(t, files = {}) {
  const path = await mkdtemp(resolve('.agent-test-preview-'));
  t.after(() => rm(path, { recursive: true, force: true }));
  for (const [name, bytes] of Object.entries(files)) await writeFile(join(path, name), bytes);
  return path;
}
test('preview host API exists', () => assert.equal(typeof api.installDependencies, 'function'));
test('production executor exposes host installation to the existing pipeline', () => {
  assert.equal(createSkillExecutor().installDependencies, api.installDependencies);
});
for (const [lock, command, args] of [['pnpm-lock.yaml', 'pnpm', ['install', '--frozen-lockfile', '--offline']], ['package-lock.json', 'npm', ['ci', '--offline']]]) {
  test(`install records ${lock} hash and exact command`, async t => {
    const project = await fixture(t, { [lock]: 'locked' }), calls = [];
    const manifestPath = join(project, 'installation.json');
    const selected = toolchain(project, lock, command, args);
    const result = await api.installDependencies(project, { manifestPath,
      resolvePackageManager: async () => selected,
      run: async (...args) => { calls.push(args); return { exitCode: 0 }; } });
    assert.equal(result.lockfile.path, join(project, lock));
    assert.equal(result.lockfile.sha256, sha256('locked'));
    assert.deepEqual(result.command, [selected.executable, ...args]);
    assert.equal(calls[0][2].cwd, project);
    assert.equal(result.exitCode, 0);
    assert.deepEqual(JSON.parse(await readFile(manifestPath)), result);
  });
}
test('missing lockfile and failed install identify project and persist exit code', async t => {
  const project = await fixture(t, { 'package.json': '{}' });
  await assert.rejects(() => api.installDependencies(project), error => error.code === 'SITE_LOCKFILE_INVALID' && error.message.includes('found 0'));
  await writeFile(join(project, 'pnpm-lock.yaml'), 'lock');
  const manifestPath = join(project, 'install.json');
  await assert.rejects(() => api.installDependencies(project, { manifestPath,
    resolvePackageManager: async () => toolchain(project, 'pnpm-lock.yaml', 'pnpm', ['install', '--frozen-lockfile', '--offline']),
    run: async () => { throw Object.assign(Error('bad install'), { exitCode: 7 }); } }), /SITE_INSTALL_FAILED/);
  assert.equal(JSON.parse(await readFile(manifestPath)).exitCode, 7);
});
function childFixture() {
  const child = new EventEmitter(); child.stdout = new EventEmitter(); child.stderr = new EventEmitter();
  const kills = []; child.kill = signal => { kills.push(signal); queueMicrotask(() => child.emit('close', 0)); };
  return { child, kills };
}
test('build then production start binds loopback and stops process on explicit cleanup', async t => {
  const project = await fixture(t, { 'package.json': JSON.stringify({ scripts: { build: 'next build', start: 'next start' } }), 'pnpm-lock.yaml': 'lock' });
  const child = childFixture(), calls = [];
  const preview = await api.buildAndServe(project, { run: async (...args) => calls.push(args),
    getPort: async () => 32123, spawnProcess: (...args) => { calls.push(args); return child.child; },
    fetchUrl: async url => { assert.equal(url, 'http://127.0.0.1:32123'); return { status: 200 }; } });
  assert.deepEqual(calls[0].slice(0, 2), ['pnpm', ['run', 'build']]);
  assert.deepEqual(calls[1].slice(0, 2), ['pnpm', ['run', 'start', '--hostname', '127.0.0.1', '--port', '32123']]);
  await preview.stop(); await preview.stop(); assert.ok(child.kills.length);
});
test('preview timeout includes sanitized tail and kills child', async t => {
  const project = await fixture(t, { 'package.json': JSON.stringify({ scripts: { build: 'build', start: 'start' } }), 'package-lock.json': 'lock' });
  const child = childFixture();
  await assert.rejects(() => api.buildAndServe(project, { run: async () => ({}), getPort: async () => 32124,
    timeoutMs: 10, pollMs: 1, spawnProcess: () => { queueMicrotask(() => child.child.stderr.emit('data', 'tail\npassword=private-preview-value')); return child.child; },
    fetchUrl: async () => ({ status: 503 }) }), error => error.code === 'SITE_PREVIEW_FAILED' && error.message.includes('tail') && !error.message.includes('private-preview-value'));
  assert.ok(child.kills.length);
});
test('build failure does not start server and is sanitized', async t => {
  const project = await fixture(t, { 'package.json': JSON.stringify({ scripts: { build: 'build', start: 'start' } }), 'package-lock.json': 'lock' });
  await assert.rejects(() => api.buildAndServe(project, { run: async () => { throw Error('password=private-build-value'); },
    spawnProcess: () => assert.fail('must not start') }), error => error.code === 'SITE_PREVIEW_FAILED' && !error.message.includes('private-build-value'));
});

test('install, build and start receive a minimal environment without host secrets', async t => {
  const supplied = { SERPER_API_KEY: 'x', HOST_TOKEN: 'x', HOST_SECRET: 'x', HOST_COOKIE: 'x', HOST_PASSWORD: 'x',
    UNRELATED_SETTING: 'x', NODE_OPTIONS: '--inspect', PNPM_HOME: '/synthetic/pnpm', NODE_ENV: 'production' };
  const previous = Object.fromEntries(Object.keys(supplied).map(name => [name, process.env[name]]));
  Object.assign(process.env, supplied);
  t.after(() => { for (const [name, value] of Object.entries(previous)) {
    if (value === undefined) delete process.env[name]; else process.env[name] = value;
  } });
  const project = await fixture(t, { 'package.json': JSON.stringify({ scripts: { build: 'build', start: 'start' } }), 'pnpm-lock.yaml': 'lock' });
  const observed = [], child = childFixture();
  const assertEnvironment = env => {
    assert.ok(env, 'run/spawn must receive an explicit env');
    assert.notEqual(env, process.env);
    assert.equal(env.SERPER_API_KEY, undefined);
    assert.ok(Object.keys(env).every(name => ['PATH', 'HOME', 'TMPDIR', 'LANG', 'LC_ALL', 'NODE_ENV', 'PNPM_HOME',
      'npm_config_offline', 'npm_config_audit', 'npm_config_fund', 'npm_config_manage_package_manager_versions',
      'PNPM_NETWORK_CONCURRENCY', 'YARN_ENABLE_NETWORK', 'COREPACK_ENABLE_NETWORK', 'COREPACK_ENABLE_PROJECT_SPEC'].includes(name)));
    assert.ok(Object.keys(env).every(name => !/key|token|secret|cookie|password/i.test(name)));
    for (const name of ['PATH', 'HOME', 'TMPDIR', 'LANG', 'LC_ALL', 'NODE_ENV', 'PNPM_HOME'])
      assert.equal(env[name], process.env[name]);
    if (env.npm_config_offline !== undefined)
      assert.equal(env.npm_config_manage_package_manager_versions, 'false');
  };
  const run = async (_command, _args, options) => { assertEnvironment(options.env); observed.push('run'); return { exitCode: 0 }; };
  await api.installDependencies(project, { run,
    resolvePackageManager: async () => toolchain(project, 'pnpm-lock.yaml', 'pnpm', ['install', '--frozen-lockfile', '--offline']) });
  const preview = await api.buildAndServe(project, { run, getPort: async () => 32125,
    spawnProcess: (_command, _args, options) => { assertEnvironment(options.env); observed.push('spawn'); return child.child; },
    fetchUrl: async () => ({ status: 200 }) });
  await preview.stop();
  assert.deepEqual(observed, ['run', 'run', 'spawn']);
});
