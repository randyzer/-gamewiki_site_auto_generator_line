import { realpath, readFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { delimiter, dirname, join, isAbsolute } from 'node:path';
import { runProcess } from './process.mjs';
import { sanitizeDiagnosticText } from './diagnostics.mjs';

// The approved deployment uses the operator's own logged-in CLIs; their config directories are the
// only credential locations the worker may read.
const CLI_NAMES = ['gh', 'git', 'vercel'];

// Resolve one configured entry. A broken launcher is not permission to select another Git.
export async function locateGitTool(path = '/opt/homebrew/bin/git', { run = runProcess, platform = process.platform } = {}) {
  try {
    if (!isAbsolute(path)) throw Error('fixed Git path must be absolute');
    await access(path, constants.X_OK);
    const realPath = await realpath(path);
    await access(realPath, constants.X_OK);
    const env = { ...process.env };
    delete env.GIT_EXEC_PATH;
    const options = { env, timeoutMs: 10000 };
    const version = (await run(realPath, ['--version'], options)).stdout.trim();
    if (!/^git version \S+/.test(version)) throw Error('unexpected Git version response');
    const execPath = await realpath((await run(realPath, ['--exec-path'], options)).stdout.trim());
    await access(execPath, constants.X_OK);
    const packageRoot = dirname(realPath).endsWith('/bin') && !['/usr/bin', '/bin'].includes(dirname(realPath))
      ? dirname(dirname(realPath)) : realPath;
    const readPaths = new Set([packageRoot, execPath]);
    if (platform === 'darwin') {
      const pending = [realPath], visited = new Set();
      const remoteHelper = join(execPath, 'git-remote-https');
      try { await access(remoteHelper, constants.X_OK); pending.push(await realpath(remoteHelper)); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
      while (pending.length) {
        const file = pending.pop();
        if (visited.has(file)) continue;
        if (visited.size >= 64) throw Error('Git dependency graph exceeds limit');
        visited.add(file);
        const output = (await run('/usr/bin/otool', ['-L', file], options)).stdout;
        for (const line of output.split('\n').slice(1)) {
          const dependency = line.trim().match(/^(.*?) \(compatibility version /)?.[1];
          if (!dependency || dependency.startsWith('/usr/lib/') || dependency.startsWith('/System/Library/')) continue;
          if (!isAbsolute(dependency)) throw Error(`unresolved Git library: ${dependency}`);
          const library = await realpath(dependency);
          readPaths.add(library);
          pending.push(library);
        }
      }
    }
    return { path, realPath, version, execPath, readPaths: [...readPaths] };
  } catch (error) {
    throw Error(`WORKER_GIT_UNAVAILABLE: fixed Git ${path}: ${sanitizeDiagnosticText(error.message)}`);
  }
}

async function which(name, searchPath) {
  for (const directory of (searchPath ?? '').split(delimiter).filter(isAbsolute)) {
    const candidate = join(directory, name);
    try { await access(candidate, constants.X_OK); return candidate; } catch { /* keep searching PATH */ }
  }
  return null;
}

// npm-style shims exec a node script elsewhere, so that script's tree must be readable too.
async function shimTargets(file) {
  let text;
  try { text = await readFile(file, 'utf8'); } catch { return []; }
  if (!text.startsWith('#!')) return [];
  return [...text.matchAll(/(\/[^\s"'\\]+)/g)].map(match => match[1]).filter(path => !path.startsWith('/bin/') && !path.startsWith('/usr/bin/'));
}

export async function locateDeploymentTools(environment = process.env, { gitTool } = {}) {
  const home = environment.HOME;
  if (!isAbsolute(home ?? '')) throw Error('DEPLOYMENT_TOOLS_UNAVAILABLE: HOME is not set to an absolute path');
  const paths = [], readPaths = [];
  for (const name of CLI_NAMES) {
    if (name === 'git' && gitTool) {
      paths.push(dirname(gitTool.realPath)); readPaths.push(...gitTool.readPaths); continue;
    }
    const found = await which(name, environment.PATH);
    if (!found) throw Error(`DEPLOYMENT_TOOLS_UNAVAILABLE: ${name} is not on PATH (${environment.PATH ?? ''})`);
    const real = await realpath(found);
    // Preserve CLI aliases such as vercel -> dist/vc.js; their real trees are granted below.
    paths.push(dirname(found));
    // Package root, not just bin/: git needs its libexec/git-core helpers.
    readPaths.push(dirname(real).endsWith('/bin') ? dirname(dirname(real)) : dirname(real));
    for (const target of await shimTargets(real)) readPaths.push(target.endsWith('.js') ? dirname(dirname(target)) : dirname(target));
  }
  const xdg = environment.XDG_CONFIG_HOME && isAbsolute(environment.XDG_CONFIG_HOME) ? environment.XDG_CONFIG_HOME : join(home, '.config');
  // git and gh keep their tokens in the macOS keychain (credential.helper=osxkeychain); these files only point to it.
  const credentialPaths = [join(xdg, 'gh'), join(xdg, 'git'), join(home, '.gitconfig'), '/opt/homebrew/etc/gitconfig', '/etc/gitconfig',
    join(home, 'Library', 'Application Support', 'com.vercel.cli'), join(xdg, 'com.vercel.cli')];
  const existing = [];
  for (const path of credentialPaths) { try { await access(path); existing.push(path); } catch { /* CLI not logged in here */ } }
  const unique = values => values.filter((value, index, all) => all.indexOf(value) === index);
  return { paths: unique(paths), readPaths: unique(readPaths), credentialPaths: existing };
}
