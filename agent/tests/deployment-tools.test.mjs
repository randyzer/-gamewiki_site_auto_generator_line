import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, chmod, rm, realpath } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { locateDeploymentTools } from '../src/deployment-tools.mjs';

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
