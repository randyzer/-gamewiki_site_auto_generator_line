import test from 'node:test';
import assert from 'node:assert/strict';
import { chmod, mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import {
  packageManagerEnvironment,
  resolveSitePackageManager,
  verifySitePackageManager,
} from '../src/site-package-manager.mjs';

async function fixture(t, { declared = 'pnpm@12.6.0', reported = '12.6.0' } = {}) {
  const root = await mkdtemp(resolve('.site-package-manager-test-'));
  const projectPath = join(root, 'site'), bin = join(root, 'bin'), storagePath = join(root, 'store');
  await Promise.all([mkdir(projectPath), mkdir(bin), mkdir(storagePath)]);
  const pkg = { name: 'site' };
  if (declared !== null) pkg.packageManager = declared;
  await writeFile(join(projectPath, 'package.json'), JSON.stringify(pkg));
  await writeFile(join(projectPath, 'pnpm-lock.yaml'), 'lockfileVersion: 9\n');
  const executable = join(bin, 'pnpm');
  await writeFile(executable, `#!/bin/sh\nif [ "$1" = "--version" ]; then printf '%s\\n' ${JSON.stringify(reported)}; else printf '%s\\n' ${JSON.stringify(storagePath)}; fi\n`);
  await chmod(executable, 0o755);
  t.after(() => rm(root, { recursive: true, force: true }));
  return { projectPath, bin, executable, storagePath };
}

test('resolves an exact local pnpm executable without bootstrap-capable environment', async t => {
  const f = await fixture(t);
  const context = await resolveSitePackageManager(f.projectPath, {
    environment: { PATH: f.bin, HOME: '/host-home', PNPM_HOME: '/host-pnpm', SERPER_API_KEY: 'secret' },
  });
  assert.equal(context.kind, 'SITE_PACKAGE_MANAGER_CONTEXT_V1');
  assert.equal(context.manager, 'pnpm');
  assert.equal(context.executable, f.executable);
  assert.equal(context.version, '12.6.0');
  assert.equal(context.storagePath, f.storagePath);
  assert.equal(context.declared, 'pnpm@12.6.0');
  assert.match(context.packageJson.sha256, /^[a-f0-9]{64}$/);
  assert.match(context.lockfile.sha256, /^[a-f0-9]{64}$/);

  const env = packageManagerEnvironment({ PATH: f.bin, HOME: '/host-home', SERPER_API_KEY: 'secret' }, {
    home: '/isolated', tmpdir: '/isolated/tmp',
  });
  assert.equal(env.HOME, '/isolated');
  assert.equal(env.TMPDIR, '/isolated/tmp');
  assert.equal(env.npm_config_offline, 'true');
  assert.equal(env.npm_config_manage_package_manager_versions, 'false');
  assert.equal(env.COREPACK_ENABLE_NETWORK, '0');
  assert.equal(env.COREPACK_ENABLE_PROJECT_SPEC, '0');
  assert.equal(env.SERPER_API_KEY, undefined);
});

test('fails closed when the declared pnpm version is unavailable locally', async t => {
  const f = await fixture(t, { reported: '10.14.0' });
  await assert.rejects(resolveSitePackageManager(f.projectPath, { environment: { PATH: f.bin } }),
    error => error.code === 'SITE_PACKAGE_MANAGER_VERSION_MISMATCH' && /12\.6\.0/.test(error.message));
});

test('prefers the exact pnpm runtime already cached by PNPM_HOME over a mismatched PATH launcher', async t => {
  const f = await fixture(t, { reported: '10.14.0' });
  const pnpmHome = join(f.projectPath, '..', 'pnpm-home');
  const cached = join(pnpmHome, '.tools', 'pnpm', '12.6.0', 'node_modules', 'pnpm', 'pnpm');
  await mkdir(join(cached, '..'), { recursive: true });
  await writeFile(cached, `#!/bin/sh\nif [ "$1" = "--version" ]; then printf '12.6.0\\n'; else printf '%s\\n' ${JSON.stringify(f.storagePath)}; fi\n`);
  await chmod(cached, 0o755);
  const context = await resolveSitePackageManager(f.projectPath, {
    environment: { PATH: f.bin, PNPM_HOME: pnpmHome },
  });
  assert.equal(context.executable, cached);
  assert.equal(context.version, '12.6.0');
});

test('pnpm requires an exact packageManager declaration', async t => {
  const missing = await fixture(t, { declared: null });
  await assert.rejects(resolveSitePackageManager(missing.projectPath, { environment: { PATH: missing.bin } }),
    error => error.code === 'SITE_PACKAGE_MANAGER_DECLARATION_INVALID');

  const ranged = await fixture(t, { declared: 'pnpm@^12.6.0' });
  await assert.rejects(resolveSitePackageManager(ranged.projectPath, { environment: { PATH: ranged.bin } }),
    error => error.code === 'SITE_PACKAGE_MANAGER_DECLARATION_INVALID');
});

test('reverification rejects package or lockfile drift after installation', async t => {
  const f = await fixture(t);
  const environment = { PATH: f.bin };
  const context = await resolveSitePackageManager(f.projectPath, { environment });
  await verifySitePackageManager(f.projectPath, context, { environment });

  await writeFile(join(f.projectPath, 'pnpm-lock.yaml'), 'lockfileVersion: 9\nchanged: true\n');
  await assert.rejects(verifySitePackageManager(f.projectPath, context, { environment }),
    error => error.code === 'SITE_PACKAGE_MANAGER_CONTEXT_CHANGED');
});
