import { realpath, readFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { delimiter, dirname, join, isAbsolute } from 'node:path';

// The approved deployment uses the operator's own logged-in CLIs; their config directories are the
// only credential locations the worker may read.
const CLI_NAMES = ['gh', 'git', 'vercel'];

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

export async function locateDeploymentTools(environment = process.env) {
  const home = environment.HOME;
  if (!isAbsolute(home ?? '')) throw Error('DEPLOYMENT_TOOLS_UNAVAILABLE: HOME is not set to an absolute path');
  const paths = [], readPaths = [];
  for (const name of CLI_NAMES) {
    const found = await which(name, environment.PATH);
    if (!found) throw Error(`DEPLOYMENT_TOOLS_UNAVAILABLE: ${name} is not on PATH (${environment.PATH ?? ''})`);
    const real = await realpath(found);
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
