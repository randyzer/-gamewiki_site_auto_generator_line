import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { validateStage4Candidate } from '../src/stage4-host-validation.mjs';
import { stage4SiteDigest } from '../src/stage4-site-transaction.mjs';

async function fixture(t, scripts = {}) {
  const root = await mkdtemp(resolve('.stage4-host-validation-test-'));
  const candidatePath = join(root, 'candidate'), nativeDirectory = join(root, 'native');
  await Promise.all([candidatePath, nativeDirectory].map(path => mkdir(path)));
  await writeFile(join(candidatePath, 'pnpm-lock.yaml'), 'lockfileVersion: 9\n');
  await writeFile(join(candidatePath, 'package.json'), JSON.stringify({ name: 'fixture', scripts }));
  await writeFile(join(candidatePath, 'index.js'), 'export default 1;\n');
  t.after(() => rm(root, { recursive: true, force: true }));
  return { candidatePath, nativeDirectory };
}

test('Host owns deterministic offline package checks and build runs last', async t => {
  const f = await fixture(t, { check: 'node check.mjs', typecheck: 'tsc --noEmit', lint: 'eslint .', test: 'node --test', build: 'next build' });
  const calls = [];
  const report = await validateStage4Candidate({ ...f, targetPath: join(f.nativeDirectory, 'real-site') }, {
    platform: 'darwin', sandboxCommand: '/usr/bin/sandbox-exec',
    run: async (command, args, options) => {
      calls.push({ command, args, options });
      if (args.at(-1) === 'build') {
        await mkdir(join(f.candidatePath, '.next'));
        await writeFile(join(f.candidatePath, '.next/build-manifest.json'), '{}\n');
        await writeFile(join(f.candidatePath, 'next-env.d.ts'), 'generated\n');
      }
      return { exitCode: 0 };
    }, environment: { PATH: '/host/bin', HOME: '/secret', SERPER_API_KEY: 'SECRET', NODE_OPTIONS: '--inspect' },
  });
  assert.equal(report.status, 'PASSED');
  assert.equal(report.candidateDigest, await stage4SiteDigest(f.candidatePath));
  assert.deepEqual(calls.map(call => call.args.at(-1)), ['check', 'typecheck', 'lint', 'test', 'build']);
  assert.ok(calls.every(call => call.command === '/usr/bin/sandbox-exec'));
  assert.ok(calls.every(call => call.options.env.SERPER_API_KEY === undefined && call.options.env.NODE_OPTIONS === undefined));
  assert.ok(calls.every(call => call.options.env.npm_config_offline === 'true'));
  const saved = JSON.parse(await readFile(report.reportPath, 'utf8'));
  assert.equal(saved.status, 'PASSED');
});

test('missing build and install-like validation scripts fail closed', async t => {
  const missing = await fixture(t, { test: 'node --test' });
  await assert.rejects(validateStage4Candidate(missing, { platform: 'darwin', sandboxCommand: '/usr/bin/sandbox-exec',
    run: async () => assert.fail('must not run') }), /STAGE4_BUILD_SCRIPT_MISSING/);

  const unsafe = await fixture(t, { lint: 'pnpm install && eslint .', build: 'next build' });
  await assert.rejects(validateStage4Candidate(unsafe, { platform: 'darwin', sandboxCommand: '/usr/bin/sandbox-exec',
    run: async () => assert.fail('must not run') }), /STAGE4_VALIDATION_SCRIPT_UNSAFE/);
});

test('nonzero command, source mutation, missing output, and absent sandbox cannot pass', async t => {
  const failed = await fixture(t, { build: 'next build' });
  await assert.rejects(validateStage4Candidate(failed, { platform: 'darwin', sandboxCommand: '/usr/bin/sandbox-exec',
    run: async () => { throw Error('build failed'); } }), /STAGE4_HOST_VALIDATION_FAILED/);

  const mutated = await fixture(t, { build: 'next build' });
  await assert.rejects(validateStage4Candidate(mutated, { platform: 'darwin', sandboxCommand: '/usr/bin/sandbox-exec',
    run: async () => { await writeFile(join(mutated.candidatePath, 'index.js'), 'mutated\n'); await mkdir(join(mutated.candidatePath, '.next')); } }), /STAGE4_SOURCE_MUTATED/);

  const noOutput = await fixture(t, { build: 'next build' });
  await assert.rejects(validateStage4Candidate(noOutput, { platform: 'darwin', sandboxCommand: '/usr/bin/sandbox-exec',
    run: async () => ({ exitCode: 0 }) }), /STAGE4_BUILD_OUTPUT_MISSING/);

  const noSandbox = await fixture(t, { build: 'next build' });
  await assert.rejects(validateStage4Candidate(noSandbox, { platform: 'linux', run: async () => assert.fail('must not run') }), /STAGE4_HOST_SANDBOX_UNAVAILABLE/);
});

test('real macOS sandbox allows candidate build output and blocks writes to the real target', {
  skip: process.platform !== 'darwin',
}, async t => {
  const allowed = await fixture(t, { build: 'node build.mjs' });
  await writeFile(join(allowed.candidatePath, 'build.mjs'),
    "import {mkdirSync,writeFileSync} from 'node:fs'; mkdirSync('dist',{recursive:true}); writeFileSync('dist/index.html','ok');\n");
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

