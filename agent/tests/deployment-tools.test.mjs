import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, chmod, rm, realpath, symlink } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { locateDeploymentTools, locateGitTool } from '../src/deployment-tools.mjs';

async function machine(t, { withVercel = true } = {}) {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'deploy-tools-')));
  t.after(() => rm(root, { recursive: true, force: true }));
  const bin = join(root, 'bin'), home = join(root, 'home');
  await mkdir(join(root, 'Cellar/git/1.0/bin'), { recursive: true });
  await mkdir(join(root, 'node/lib/node_modules/vercel/dist'), { recursive: true });
  await mkdir(bin); await mkdir(join(home, '.config/gh'), { recursive: true });
  for (const name of ['gh', 'git']) {
    const target = join(root, 'Cellar/git/1.0/bin', name);
    await writeFile(target, 'binary'); await chmod(target, 0o755);
    await writeFile(join(bin, name), 'binary'); await chmod(join(bin, name), 0o755);
  }
  if (withVercel) {
    await writeFile(join(bin, 'vercel'), `#!/bin/sh\nexec ${root}/node/bin/node \\\n  ${root}/node/lib/node_modules/vercel/dist/vc.js "$@"\n`);
    await chmod(join(bin, 'vercel'), 0o755);
  }
  return { root, bin, home };
}

test('finds the CLIs on PATH, the node script behind the vercel shim, and only existing login directories', async t => {
  const m = await machine(t);
  const tools = await locateDeploymentTools({ HOME: m.home, PATH: `/nonexistent:${m.bin}` });
  assert.deepEqual(tools.paths, [m.bin]);
  assert.ok(tools.readPaths.includes(join(m.root, 'node/lib/node_modules/vercel')));
  assert.ok(tools.credentialPaths.includes(join(m.home, '.config/gh')));
  assert.equal(tools.credentialPaths.includes(join(m.home, '.gitconfig')), false);
});

test('a missing CLI fails with its name and the PATH searched', async t => {
  const m = await machine(t, { withVercel: false });
  await assert.rejects(locateDeploymentTools({ HOME: m.home, PATH: m.bin }),
    new RegExp(`DEPLOYMENT_TOOLS_UNAVAILABLE: vercel is not on PATH \\(${m.bin}\\)`));
});

test('HOME must be absolute', async () => {
  await assert.rejects(locateDeploymentTools({ PATH: '/usr/bin' }), /DEPLOYMENT_TOOLS_UNAVAILABLE: HOME/);
});

test('fixed Git resolves its executable, helpers and transitive native libraries without broad grants', async t => {
  const m = await machine(t), root = join(m.root, 'Cellar/git/1.0');
  const helpers = join(root, 'libexec/git-core');
  const library = join(m.root, 'Cellar/pcre2/1/lib/pcre.dylib');
  await mkdir(helpers, { recursive: true });
  await mkdir(join(m.root, 'Cellar/pcre2/1/lib'), { recursive: true });
  await mkdir(join(m.root, 'opt'), { recursive: true });
  await writeFile(library, 'library');
  await symlink(join(m.root, 'Cellar/pcre2/1'), join(m.root, 'opt/pcre2'));
  const libraryAlias = join(m.root, 'opt/pcre2/lib/pcre.dylib');
  const entry = join(m.bin, 'fixed-git');
  await symlink(join(root, 'bin/git'), entry);
  const calls = [];
  const tool = await locateGitTool(entry, { platform: 'darwin', run: async (command, args) => {
    calls.push({ command, args });
    if (args[0] === '--version') return { stdout: 'git version 2.50.1\n' };
    if (args[0] === '--exec-path') return { stdout: helpers + '\n' };
    return { stdout: command === '/usr/bin/otool'
      ? `${args[1]}:\n\t${libraryAlias} (compatibility version 1.0.0)\n\t/usr/lib/libSystem.B.dylib (compatibility version 1.0.0)\n` : '' };
  } });
  assert.equal(tool.path, entry);
  assert.equal(tool.realPath, join(root, 'bin/git'));
  assert.equal(tool.invocationPath, tool.realPath);
  assert.equal(tool.execPath, helpers);
  assert.equal(tool.version, 'git version 2.50.1');
  assert.equal(tool.readPaths.includes(entry), false);
  assert.ok(tool.readPaths.includes(root));
  assert.ok(tool.readPaths.includes(library));
  assert.deepEqual(tool.librarySearchPaths, [dirname(library)]);
  assert.equal(tool.librarySearchPaths.some(path => path.includes('/opt/')), false);
  assert.equal(tool.readPaths.includes(m.bin), false);
  assert.equal(tool.readPaths.includes(m.root), false);
  assert.ok(calls.some(call => call.command === '/usr/bin/otool' && call.args[1] === library));
});

test('fixed Git rejects ambiguous native libraries with the same basename', async t => {
  const m = await machine(t), root = join(m.root, 'Cellar/git/1.0');
  const helpers = join(root, 'libexec/git-core');
  const first = join(m.root, 'Cellar/first/1/lib/libshared.dylib');
  const second = join(m.root, 'Cellar/second/1/lib/libshared.dylib');
  await mkdir(helpers, { recursive: true });
  await mkdir(dirname(first), { recursive: true });
  await mkdir(dirname(second), { recursive: true });
  await writeFile(first, 'first'); await writeFile(second, 'second');
  await assert.rejects(locateGitTool(join(root, 'bin/git'), { platform: 'darwin', run: async (_command, args) => {
    if (args[0] === '--version') return { stdout: 'git version 2.50.1\n' };
    if (args[0] === '--exec-path') return { stdout: helpers + '\n' };
    return { stdout: `${args[1]}:\n\t${first} (compatibility version 1.0.0)\n\t${second} (compatibility version 1.0.0)\n` };
  } }), /conflicting Git library basename: libshared\.dylib/);
});

test('fixed Git failure names the configured entry and does not try another Git', async t => {
  const m = await machine(t), entry = join(m.bin, 'git'), calls = [];
  await assert.rejects(locateGitTool(entry, { run: async (command, args) => {
    calls.push(command);
    throw Error('fixture launcher unavailable');
  } }), /WORKER_GIT_UNAVAILABLE.*fixture launcher unavailable/);
  assert.deepEqual(calls, [entry]);
});
