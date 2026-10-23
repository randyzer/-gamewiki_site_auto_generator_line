import { constants as fsConstants } from 'node:fs';
import { access, readFile, mkdir, rm, writeFile, lstat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { runProcess } from './process.mjs';
import { safePath, sha256 } from './files.mjs';
import { sanitizeDiagnosticText } from './diagnostics.mjs';
import { siteProcessEnvironment } from './site-process-environment.mjs';
import { packageManagerEnvironment, resolveSitePackageManager } from './site-package-manager.mjs';

const fail = (code, detail) => Object.assign(Error(`${code}: ${sanitizeDiagnosticText(detail)}`), { code });
const installSandboxProfile = () => '(version 1)\n(allow default)\n(deny network*)\n';
async function manager(projectPath) {
  await safePath(projectPath, [projectPath]);
  for (const [name, command, args] of [['pnpm-lock.yaml', 'pnpm', ['install', '--frozen-lockfile']], ['package-lock.json', 'npm', ['ci']]]) {
    const path = join(projectPath, name);
    await safePath(path, [projectPath]);
    try { if ((await lstat(path)).isFile()) return { command, args, lockfile: { path, sha256: sha256(await readFile(path)) } }; }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  throw fail('SITE_LOCKFILE_MISSING', `project ${projectPath}; expected pnpm-lock.yaml or package-lock.json`);
}

export async function installDependencies(projectPath, { run = runProcess,
  manifestPath = join(projectPath, 'docs/agent-runs/site-dependencies.json'),
  environment = process.env, resolvePackageManager = resolveSitePackageManager,
  platform = process.platform, sandboxCommand = '/usr/bin/sandbox-exec' } = {}) {
  const toolchain = await resolvePackageManager(projectPath, { run, environment });
  const manifest = { projectPath, lockfile: toolchain.lockfile,
    toolchain, command: [toolchain.executable, ...toolchain.installArgs],
    sandbox: 'macos-deny-network', exitCode: null };
  let failure;
  const installTmp = join(projectPath, '.agent-install-tmp');
  try {
    if (platform !== 'darwin') throw fail('SITE_INSTALL_SANDBOX_UNAVAILABLE', platform);
    if (run === runProcess) {
      try { await access(sandboxCommand, fsConstants.X_OK); }
      catch { throw fail('SITE_INSTALL_SANDBOX_UNAVAILABLE', sandboxCommand); }
    }
    await mkdir(installTmp, { recursive: true, mode: 0o700 });
    const profile = installSandboxProfile();
    const result = await run(sandboxCommand, ['-p', profile, toolchain.executable, ...toolchain.installArgs], {
      cwd: projectPath, env: packageManagerEnvironment(environment, { tmpdir: installTmp }), timeoutMs: 600000 });
    manifest.exitCode = result?.exitCode;
    if (!Number.isInteger(manifest.exitCode)) throw Error('installation returned no concrete exit code');
    if (manifest.exitCode !== 0) throw Object.assign(Error('installation exited unsuccessfully'), { exitCode: manifest.exitCode });
  } catch (error) {
    manifest.exitCode = error.exitCode ?? null;
    manifest.error = sanitizeDiagnosticText(error.message);
    failure = fail('SITE_INSTALL_FAILED', `${projectPath}; exit ${manifest.exitCode}; ${manifest.error}`);
  } finally {
    await rm(installTmp, { recursive: true, force: true });
  }
  await safePath(manifestPath, [dirname(manifestPath)]);
  await mkdir(dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  if (failure) throw failure;
  return manifest;
}

export function availablePort() {
  return new Promise((resolve, reject) => {
    const server = createServer(); server.on('error', reject);
    server.listen(0, '127.0.0.1', () => { const port = server.address().port; server.close(error => error ? reject(error) : resolve(port)); });
  });
}

export async function buildAndServe(projectPath, { run = runProcess, spawnProcess = spawn,
  getPort = availablePort, fetchUrl = fetch, timeoutMs = 60000, pollMs = 200 } = {}) {
  let child, stopped;
  let stdout = '', stderr = '', exited = false, startError;
  const stop = () => stopped ??= (async () => {
    if (!child) return;
    const kill = signal => {
      try { child.pid && process.platform !== 'win32' ? process.kill(-child.pid, signal) : child.kill(signal); }
      catch (error) { if (error.code !== 'ESRCH') throw error; }
    };
    // Kill the group even if its parent has exited: package managers can leave a server behind.
    kill('SIGTERM');
    await new Promise(done => setTimeout(done, 500));
    kill('SIGKILL');
  })();
  try {
    const { command } = await manager(projectPath);
    const pkg = JSON.parse(await readFile(join(projectPath, 'package.json'), 'utf8'));
    if (!pkg.scripts?.build || !pkg.scripts?.start) throw Error(`build/start script missing in ${projectPath}/package.json`);
    const env = siteProcessEnvironment();
    await run(command, ['run', 'build'], { cwd: projectPath, env, timeoutMs: 600000 });
    const port = await getPort(), url = `http://127.0.0.1:${port}`;
    const args = ['run', 'start', ...(command === 'npm' ? ['--'] : []), '--hostname', '127.0.0.1', '--port', String(port)];
    child = spawnProcess(command, args, { cwd: projectPath, env, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.on('data', bytes => { stdout = (stdout + bytes).slice(-8192); });
    child.stderr.on('data', bytes => { stderr = (stderr + bytes).slice(-8192); });
    child.on('error', error => { startError = error; });
    child.on('close', () => { exited = true; });
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (startError || exited) throw startError ?? Error('start process exited before readiness');
      try {
        const response = await fetchUrl(url, { signal: AbortSignal.timeout(Math.max(1, Math.min(2000, deadline - Date.now()))), redirect: 'manual' });
        await response.body?.cancel();
        if (response.status === 200) return { url, stop };
      } catch { /* The server may still be starting. */ }
      await new Promise(done => setTimeout(done, pollMs));
    }
    throw Error(`preview readiness timed out after ${timeoutMs}ms`);
  } catch (error) {
    await stop();
    throw fail('SITE_PREVIEW_FAILED', `${projectPath}; ${error.message}; stdout tail: ${stdout.split('\n').slice(-12).join('\n')}; stderr tail: ${stderr.split('\n').slice(-12).join('\n')}`);
  }
}
