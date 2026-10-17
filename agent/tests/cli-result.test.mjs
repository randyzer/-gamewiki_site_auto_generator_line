import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';

test('CLI result status controls the real process and survives tee with pipefail', async t => {
  const root = await mkdtemp(resolve('.cli-result-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const runner = join(root, 'runner.mjs');
  const moduleUrl = new URL('../src/cli-result.mjs', import.meta.url).href;
  await writeFile(runner, `import { reportCliResult } from ${JSON.stringify(moduleUrl)};\nreportCliResult({ status: process.argv[2] });\n`);

  for (const [status, exitCode] of [['PASSED', 0], ['PREVIEW', 0], ['CANCELLED', 0],
    ['FAILED', 2], ['PARTIAL', 2], ['BLOCKED', 2], ['WAITING_FOR_USER', 2]]) {
    const output = join(root, `${status}.json`);
    const result = spawnSync('/bin/bash', ['-o', 'pipefail', '-c',
      '"$1" "$2" "$3" | tee "$4" >/dev/null', 'bash', process.execPath, runner, status, output],
    { encoding: 'utf8' });
    assert.equal(result.status, exitCode, `${status}: ${result.stderr}`);
    assert.equal(JSON.parse(await readFile(output, 'utf8')).status, status);
  }
});
