import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdir, writeFile, access } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { fixture } from './helpers.mjs';

// Copy the real CLI into an isolated workspace so these subprocess tests never touch live runs/config.
async function setup(t) {
  const f = await fixture(t);
  const agent = join(f.root, 'agent');
  await cp(new URL('../src/', import.meta.url), join(agent, 'src'), { recursive: true });
  await mkdir(join(agent, 'config'));
  await writeFile(join(agent, 'config', 'workflow.json'), JSON.stringify({ workspace: '../../workspace',
    inventory: '../../inventory.json', templateCache: '../../cache',
    templateSource: { repository: 'https://example.invalid/never-fetch.git', ref: 'main', subtree: 'template' } }));
  const inputsFile = join(f.root, 'inputs.json');
  await writeFile(inputsFile, JSON.stringify(f.inputs));
  const invoke = (command, ...args) => spawnSync(process.execPath,
    [join(agent, 'src', 'cli.mjs'), command, inputsFile, 'cli-code', ...args],
    { cwd: agent, encoding: 'utf8', input: 'y\n', timeout: 5000 });
  return { f, invoke };
}

test('CLI run and retry preview exit 0, print stable codes and do not execute or create a run', async t => {
  const { f, invoke } = await setup(t);
  const first = invoke('run', '--preview');
  assert.equal(first.status, 0, first.stderr);
  const code = first.stdout.match(/Confirmation code: ([a-f0-9]{16})\n$/)?.[1];
  assert.ok(code, first.stdout);
  assert.equal(invoke('run', '--preview').stdout, first.stdout);
  await assert.rejects(access(join(f.configuration.workspace, 'runs')), { code: 'ENOENT' });
  await assert.rejects(access(join(f.root, 'cache')), { code: 'ENOENT' });
  const directory = join(f.configuration.workspace, 'runs', 'cli-code');
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, 'manifest.json'), JSON.stringify({ inputs: f.inputs }));
  const retry = invoke('retry', '--preview');
  assert.equal(retry.status, 0, retry.stderr);
  assert.match(retry.stdout, /Retry existing run cli-code/);
  assert.notEqual(retry.stdout.match(/Confirmation code: ([a-f0-9]{16})/)?.[1], code);
});

test('CLI confirm passes the supplied code through and refuses mismatch before execution', async t => {
  const { f, invoke } = await setup(t);
  const first = invoke('run', '--preview');
  assert.equal(first.status, 0, first.stderr);
  const expected = first.stdout.match(/Confirmation code: ([a-f0-9]{16})/)[1];
  const refused = invoke('run', '--confirm', 'wrong-code');
  assert.notEqual(refused.status, 0);
  assert.match(refused.stderr, /CONFIRMATION_CODE_MISMATCH/);
  assert.ok(refused.stderr.includes(expected));
  assert.ok(refused.stderr.includes('wrong-code'));
  await assert.rejects(access(join(f.configuration.workspace, 'runs')), { code: 'ENOENT' });
});

for (const args of [['--yes'], ['--confirm'], ['--confirm', '--preview'], ['--preview', '--confirm', 'code'],
  ['--preview', '--preview'], ['--confirm', 'code', '--confirm', 'code'], ['unexpected']]) {
  test(`CLI refuses invalid run/retry options ${JSON.stringify(args)}`, async t => {
    const { f, invoke } = await setup(t);
    for (const command of ['run', 'retry']) {
      const result = invoke(command, ...args);
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /RUN_ARGUMENTS_INVALID/);
    }
    await assert.rejects(access(join(f.configuration.workspace, 'runs')), { code: 'ENOENT' });
  });
}
