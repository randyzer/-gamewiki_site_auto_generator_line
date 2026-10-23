import { constants as fsConstants } from 'node:fs';
import { access, lstat, readFile, realpath } from 'node:fs/promises';
import { delimiter, dirname, isAbsolute, join } from 'node:path';
import { runProcess } from './process.mjs';
import { sanitizeDiagnosticText } from './diagnostics.mjs';
import { safePath, sha256 } from './files.mjs';
import { siteProcessEnvironment } from './site-process-environment.mjs';

const fail = (code, detail = '') => Object.assign(
  Error(`${code}${detail ? `: ${sanitizeDiagnosticText(detail)}` : ''}`), { code });
const exactVersion = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const managers = Object.freeze({
  'pnpm-lock.yaml': { manager: 'pnpm', installArgs: ['install', '--frozen-lockfile', '--offline', '--ignore-scripts'] },
  'package-lock.json': { manager: 'npm', installArgs: ['ci', '--offline', '--ignore-scripts'] },
});

async function regularFile(path) {
  const stat = await lstat(path);
  if (!stat.isFile()) throw fail('SITE_PACKAGE_MANAGER_FILE_INVALID', path);
  return readFile(path);
}

async function projectIdentity(projectPath) {
  await safePath(projectPath, [projectPath]);
  const packageJsonPath = join(projectPath, 'package.json');
  await safePath(packageJsonPath, [projectPath]);
  let packageBytes;
  try { packageBytes = await regularFile(packageJsonPath); }
  catch (error) {
    if (error.code === 'ENOENT') throw fail('SITE_PACKAGE_JSON_MISSING', packageJsonPath);
    throw error;
  }
  let pkg;
  try { pkg = JSON.parse(packageBytes.toString('utf8')); }
  catch { throw fail('SITE_PACKAGE_JSON_INVALID', packageJsonPath); }

  const found = [];
  for (const [name, definition] of Object.entries(managers)) {
    const path = join(projectPath, name);
    await safePath(path, [projectPath]);
    try { found.push({ ...definition, name, path, bytes: await regularFile(path) }); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  if (found.length !== 1)
    throw fail('SITE_LOCKFILE_INVALID', `expected one lockfile, found ${found.length}`);

  const selected = found[0];
  const declaration = typeof pkg.packageManager === 'string' ? pkg.packageManager : null;
  let declaredVersion = null;
  if (selected.manager === 'pnpm') {
    const match = /^pnpm@(.+)$/.exec(declaration ?? '');
    if (!match || !exactVersion.test(match[1]))
      throw fail('SITE_PACKAGE_MANAGER_DECLARATION_INVALID', 'pnpm requires packageManager pnpm@<exact-version>');
    declaredVersion = match[1];
  } else if (declaration !== null) {
    const match = /^npm@(.+)$/.exec(declaration);
    if (!match || !exactVersion.test(match[1]))
      throw fail('SITE_PACKAGE_MANAGER_DECLARATION_INVALID', 'npm packageManager must use npm@<exact-version>');
    declaredVersion = match[1];
  }
  return {
    manager: selected.manager,
    installArgs: selected.installArgs,
    declared: declaration,
    declaredVersion,
    packageJson: { path: packageJsonPath, sha256: sha256(packageBytes) },
    lockfile: { path: selected.path, name: selected.name, sha256: sha256(selected.bytes) },
  };
}

async function executablePath(command, pathValue) {
  for (const directory of String(pathValue ?? '').split(delimiter).filter(Boolean)) {
    const candidate = join(directory, command);
    try {
      await access(candidate, fsConstants.X_OK);
      const resolved = await realpath(candidate);
      if ((await lstat(resolved)).isFile()) return resolved;
    } catch (error) {
      if (!['ENOENT', 'EACCES', 'ENOTDIR'].includes(error.code)) throw error;
    }
  }
  throw fail('SITE_PACKAGE_MANAGER_UNAVAILABLE', `${command} is not executable in PATH`);
}

async function cachedPnpmExecutable(identity, environment) {
  if (identity.manager !== 'pnpm' || !identity.declaredVersion || !environment.PNPM_HOME) return null;
  const root = join(environment.PNPM_HOME, '.tools', 'pnpm', identity.declaredVersion, 'node_modules');
  const candidates = [
    join(root, 'pnpm', 'pnpm'),
    join(root, `@pnpm/exe.${process.platform}-${process.arch}`, 'pnpm'),
  ];
  for (const candidate of candidates) {
    try {
      await access(candidate, fsConstants.X_OK);
      const resolved = await realpath(candidate);
      if ((await lstat(resolved)).isFile()) return resolved;
    } catch (error) {
      if (!['ENOENT', 'EACCES', 'ENOTDIR'].includes(error.code)) throw error;
    }
  }
  return null;
}

export function packageManagerEnvironment(source = process.env, { home = source.HOME, tmpdir = source.TMPDIR } = {}) {
  const env = siteProcessEnvironment(source);
  if (typeof home === 'string' && home) env.HOME = home; else delete env.HOME;
  if (typeof tmpdir === 'string' && tmpdir) env.TMPDIR = tmpdir; else delete env.TMPDIR;
  if (home !== source.HOME) delete env.PNPM_HOME;
  Object.assign(env, {
    npm_config_offline: 'true',
    npm_config_audit: 'false',
    npm_config_fund: 'false',
    npm_config_manage_package_manager_versions: 'false',
    npm_config_pm_on_fail: 'ignore',
    npm_config_update_notifier: 'false',
    PNPM_NETWORK_CONCURRENCY: '0',
    YARN_ENABLE_NETWORK: 'false',
    COREPACK_ENABLE_NETWORK: '0',
    COREPACK_ENABLE_PROJECT_SPEC: '0',
  });
  return env;
}

async function verifiedStoragePath(path) {
  if (!path || !isAbsolute(path) || path === '/')
    throw fail('SITE_PACKAGE_MANAGER_STORAGE_CHECK_FAILED', 'storage command returned no safe absolute path');
  try {
    const resolved = await realpath(path);
    if (!(await lstat(resolved)).isDirectory()) throw Error('not a directory');
    return resolved;
  } catch {
    throw fail('SITE_PACKAGE_MANAGER_STORAGE_UNAVAILABLE', path);
  }
}

async function packageStorage(identity, executable, run, environment, options) {
  const args = identity.manager === 'pnpm' ? ['store', 'path', '--silent'] : ['config', 'get', 'cache'];
  let result;
  try {
    result = await run(executable, args, {
      cwd: dirname(executable),
      env: packageManagerEnvironment(environment, options),
      timeoutMs: 30000,
    });
  } catch (error) {
    throw fail('SITE_PACKAGE_MANAGER_STORAGE_CHECK_FAILED', error.message);
  }
  const path = result?.stdout?.trim();
  if (result?.exitCode !== 0)
    throw fail('SITE_PACKAGE_MANAGER_STORAGE_CHECK_FAILED', 'storage command returned no safe absolute path');
  return verifiedStoragePath(path);
}

export async function resolveSitePackageManager(projectPath, { run = runProcess,
  environment = process.env, executable, storagePath, home, tmpdir } = {}) {
  const identity = await projectIdentity(projectPath);
  let resolvedExecutable;
  try {
    resolvedExecutable = executable
      ? await realpath(executable)
      : await cachedPnpmExecutable(identity, environment) ??
        await executablePath(identity.manager, environment.PATH);
  } catch (error) {
    if (error.code === 'SITE_PACKAGE_MANAGER_UNAVAILABLE') throw error;
    throw fail('SITE_PACKAGE_MANAGER_UNAVAILABLE', executable ?? identity.manager);
  }
  try { await access(resolvedExecutable, fsConstants.X_OK); }
  catch { throw fail('SITE_PACKAGE_MANAGER_UNAVAILABLE', resolvedExecutable); }
  const executableBytes = await regularFile(resolvedExecutable);
  let result;
  try {
    result = await run(resolvedExecutable, ['--version'], {
      cwd: dirname(resolvedExecutable),
      env: packageManagerEnvironment(environment, { home, tmpdir }),
      timeoutMs: 30000,
    });
  } catch (error) {
    throw fail('SITE_PACKAGE_MANAGER_VERSION_CHECK_FAILED', error.message);
  }
  if (result?.exitCode !== 0 || typeof result?.stdout !== 'string')
    throw fail('SITE_PACKAGE_MANAGER_VERSION_CHECK_FAILED', 'version command returned no successful output');
  const version = result.stdout.trim();
  if (!exactVersion.test(version))
    throw fail('SITE_PACKAGE_MANAGER_VERSION_INVALID', version);
  if (identity.declaredVersion && version !== identity.declaredVersion)
    throw fail('SITE_PACKAGE_MANAGER_VERSION_MISMATCH', `declared ${identity.declaredVersion}; executable reports ${version}`);
  const resolvedStoragePath = storagePath
    ? await verifiedStoragePath(storagePath)
    : await packageStorage(identity, resolvedExecutable, run, environment, { home, tmpdir });
  return Object.freeze({
    schemaVersion: 1,
    kind: 'SITE_PACKAGE_MANAGER_CONTEXT_V1',
    manager: identity.manager,
    executable: resolvedExecutable,
    executableSha256: sha256(executableBytes),
    version,
    storagePath: resolvedStoragePath,
    declared: identity.declared,
    packageJson: identity.packageJson,
    lockfile: identity.lockfile,
    installArgs: identity.installArgs,
  });
}

export async function verifySitePackageManager(projectPath, expected, options = {}) {
  if (expected?.kind !== 'SITE_PACKAGE_MANAGER_CONTEXT_V1' || typeof expected.executable !== 'string')
    throw fail('SITE_PACKAGE_MANAGER_CONTEXT_INVALID');
  const current = await resolveSitePackageManager(projectPath, { ...options,
    executable: expected.executable, storagePath: expected.storagePath });
  const fields = ['manager', 'executable', 'executableSha256', 'version', 'storagePath', 'declared'];
  const same = fields.every(name => current[name] === expected[name]) &&
    current.packageJson.sha256 === expected.packageJson?.sha256 &&
    current.lockfile.name === expected.lockfile?.name &&
    current.lockfile.sha256 === expected.lockfile?.sha256;
  if (!same) throw fail('SITE_PACKAGE_MANAGER_CONTEXT_CHANGED');
  return current;
}
