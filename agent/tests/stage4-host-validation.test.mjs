import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { resolve, join } from 'node:path';
import { validateStage4Candidate } from '../src/stage4-host-validation.mjs';
import { stage4SiteDigest } from '../src/stage4-site-transaction.mjs';
import { resolveSitePackageManager } from '../src/site-package-manager.mjs';

async function fixture(t, scripts = {}) {
  const root = await mkdtemp(resolve('.stage4-host-validation-test-'));
  const candidatePath = join(root, 'candidate'), nativeDirectory = join(root, 'native');
  await Promise.all([candidatePath, nativeDirectory].map(path => mkdir(path)));
  await writeFile(join(candidatePath, 'pnpm-lock.yaml'), 'lockfileVersion: 9\n');
  await writeFile(join(candidatePath, 'package.json'), JSON.stringify({
    name: 'fixture', packageManager: 'pnpm@12.6.0', scripts,
  }));
  await writeFile(join(candidatePath, 'index.js'), 'export default 1;\n');
  t.after(() => rm(root, { recursive: true, force: true }));
  return { candidatePath, nativeDirectory,
    packageManager: await resolveSitePackageManager(candidatePath) };
}

const validateMock = (context, options = {}) => validateStage4Candidate(context, {
  verifyPackageManager: async (_projectPath, expected) => expected,
  ...options,
});

test('Host owns deterministic offline package checks and build runs last', async t => {
  const f = await fixture(t, { precheck: 'node prepare.mjs', check: 'node check.mjs', postcheck: 'node finish.mjs',
    typecheck: 'tsc --noEmit', lint: 'eslint .', test: 'node --test', build: 'next build' });
  const calls = [];
  const report = await validateMock({ ...f, targetPath: join(f.nativeDirectory, 'real-site') }, {
    platform: 'darwin', sandboxCommand: '/usr/bin/sandbox-exec',
    run: async (command, args, options) => {
      calls.push({ command, args, options });
      if (args.at(-1) === 'next build') {
        await mkdir(join(f.candidatePath, '.next'));
        await writeFile(join(f.candidatePath, '.next/build-manifest.json'), '{}\n');
        await writeFile(join(f.candidatePath, 'next-env.d.ts'), 'generated\n');
      }
      return { exitCode: 0 };
    }, environment: { PATH: '/host/bin', HOME: '/secret', SERPER_API_KEY: 'SECRET', NODE_OPTIONS: '--inspect' },
  });
  assert.equal(report.status, 'PASSED');
  assert.equal(report.candidateDigest, await stage4SiteDigest(f.candidatePath));
  assert.deepEqual(calls.map(call => call.args.at(-1)),
    ['node prepare.mjs', 'node check.mjs', 'node finish.mjs', 'tsc --noEmit', 'eslint .', 'node --test', 'next build']);
  assert.ok(calls.every(call => call.command === '/usr/bin/sandbox-exec'));
  assert.ok(calls.every(call => call.args[2] === '/bin/sh' && call.args[3] === '-c'));
  assert.ok(calls.every(call => call.options.env.PATH.startsWith(join(f.candidatePath, 'node_modules', '.bin'))));
  assert.deepEqual(calls.slice(0, 3).map(call => call.options.env.npm_lifecycle_event), ['precheck', 'check', 'postcheck']);
  assert.ok(calls.every(call => call.options.env.INIT_CWD === f.candidatePath &&
    call.options.env.npm_execpath === f.packageManager.executable));
  assert.ok(calls.every(call => call.options.env.SERPER_API_KEY === undefined && call.options.env.NODE_OPTIONS === undefined));
  assert.ok(calls.every(call => call.options.env.npm_config_offline === 'true'));
  const saved = JSON.parse(await readFile(report.reportPath, 'utf8'));
  assert.equal(saved.status, 'PASSED');
});

test('missing build and install-like validation scripts fail closed', async t => {
  const missing = await fixture(t, { test: 'node --test' });
  await assert.rejects(validateMock(missing, { platform: 'darwin', sandboxCommand: '/usr/bin/sandbox-exec',
    run: async () => assert.fail('must not run') }), /STAGE4_BUILD_SCRIPT_MISSING/);

  const unsafe = await fixture(t, { lint: 'pnpm install && eslint .', build: 'next build' });
  await assert.rejects(validateMock(unsafe, { platform: 'darwin', sandboxCommand: '/usr/bin/sandbox-exec',
    run: async () => assert.fail('must not run') }), /STAGE4_VALIDATION_SCRIPT_UNSAFE/);

  const unsupported = await fixture(t, { check: 'printf "$npm_config_registry"', build: 'next build' });
  await assert.rejects(validateMock(unsupported, { platform: 'darwin', sandboxCommand: '/usr/bin/sandbox-exec',
    run: async () => assert.fail('must not run') }), /STAGE4_SCRIPT_SEMANTICS_UNSUPPORTED/);
});

test('nonzero command, source mutation, missing output, and absent sandbox cannot pass', async t => {
  const failed = await fixture(t, { build: 'next build' });
  await assert.rejects(validateMock(failed, { platform: 'darwin', sandboxCommand: '/usr/bin/sandbox-exec',
    run: async () => { throw Error('build failed'); } }), /STAGE4_HOST_VALIDATION_FAILED/);

  const mutated = await fixture(t, { build: 'next build' });
  await assert.rejects(validateMock(mutated, { platform: 'darwin', sandboxCommand: '/usr/bin/sandbox-exec',
    run: async () => { await writeFile(join(mutated.candidatePath, 'index.js'), 'mutated\n'); await mkdir(join(mutated.candidatePath, '.next')); return { exitCode: 0 }; } }), /STAGE4_SOURCE_MUTATED/);

  const noOutput = await fixture(t, { build: 'next build' });
  await assert.rejects(validateMock(noOutput, { platform: 'darwin', sandboxCommand: '/usr/bin/sandbox-exec',
    run: async () => ({ exitCode: 0 }) }), /STAGE4_BUILD_OUTPUT_MISSING/);

  const noSandbox = await fixture(t, { build: 'next build' });
  await assert.rejects(validateMock(noSandbox, { platform: 'linux', run: async () => assert.fail('must not run') }), /STAGE4_HOST_SANDBOX_UNAVAILABLE/);
});

test('real macOS sandbox allows candidate build output and blocks writes to the real target', {
  skip: process.platform !== 'darwin',
}, async t => {
  const allowed = await fixture(t, { build: 'node build.mjs' });
  await writeFile(join(allowed.candidatePath, 'build.mjs'),
    "import {mkdirSync,writeFileSync} from 'node:fs'; writeFileSync('/dev/null','discard'); mkdirSync('dist',{recursive:true}); writeFileSync('dist/index.html','ok');\n");
  const passed = await validateStage4Candidate(allowed);
  assert.equal(passed.status, 'PASSED');
  assert.equal(await readFile(join(allowed.candidatePath, 'dist/index.html'), 'utf8'), 'ok');

  const blocked = await fixture(t, { build: 'node build.mjs' });
  const targetPath = join(blocked.nativeDirectory, '..', 'real-site.txt');
  await writeFile(targetPath, 'original\n');
  await writeFile(join(blocked.candidatePath, 'build.mjs'),
    `import {writeFileSync} from 'node:fs'; writeFileSync(${JSON.stringify(targetPath)},'changed');\n`);
  await assert.rejects(validateStage4Candidate({ ...blocked, targetPath }), /STAGE4_HOST_VALIDATION_FAILED/);
  assert.equal(await readFile(targetPath, 'utf8'), 'original\n');
});

test('real macOS sandbox blocks symlink escapes and external network while allowing required loopback IPC', {
  skip: process.platform !== 'darwin',
}, async t => {
  const alias = await fixture(t, { build: 'node build.mjs' });
  const outside = join(alias.nativeDirectory, '..', 'outside');
  await mkdir(outside);
  await writeFile(join(outside, 'protected.txt'), 'original\n');
  await writeFile(join(alias.candidatePath, 'build.mjs'),
    `import {symlinkSync,writeFileSync} from 'node:fs'; symlinkSync(${JSON.stringify(outside)},'escape','dir'); writeFileSync('escape/protected.txt','changed');\n`);
  await assert.rejects(validateStage4Candidate({ ...alias, targetPath: outside }), /STAGE4_HOST_VALIDATION_FAILED/);
  assert.equal(await readFile(join(outside, 'protected.txt'), 'utf8'), 'original\n');

  let connections = 0;
  const server = createServer(socket => { connections += 1; socket.end(); });
  await new Promise((accept, reject) => {
    server.once('error', reject); server.listen(0, '127.0.0.1', accept);
  });
  t.after(() => new Promise(accept => server.close(accept)));
  const network = await fixture(t, { build: 'node build.mjs' });
  const port = server.address().port;
  await writeFile(join(network.candidatePath, 'build.mjs'),
    `import {connect} from 'node:net'; import {mkdirSync,writeFileSync} from 'node:fs'; const local=connect(${port},'127.0.0.1'); local.on('error',()=>process.exit(6)); local.on('connect',()=>{local.end();const external=connect(80,'203.0.113.1');const timer=setTimeout(()=>process.exit(9),1000);external.on('connect',()=>process.exit(7));external.on('error',error=>{if(error.code!=='EPERM')process.exit(8);clearTimeout(timer);mkdirSync('dist',{recursive:true});writeFileSync('dist/index.html','offline');});});\n`);
  assert.equal((await validateStage4Candidate(network)).status, 'PASSED');
  assert.equal(connections, 1);

  const missing = await fixture(t, { build: 'node build.mjs' });
  const emptyBin = join(missing.nativeDirectory, 'empty-bin');
  await mkdir(emptyBin);
  missing.packageManager = { ...missing.packageManager, executable: join(emptyBin, 'pnpm') };
  await writeFile(join(missing.candidatePath, 'build.mjs'),
    "import {mkdirSync,writeFileSync} from 'node:fs'; mkdirSync('dist',{recursive:true}); writeFileSync('dist/index.html','ok');\n");
  await assert.rejects(validateStage4Candidate(missing, { environment: { PATH: emptyBin } }),
    /SITE_PACKAGE_MANAGER_UNAVAILABLE/);
});
