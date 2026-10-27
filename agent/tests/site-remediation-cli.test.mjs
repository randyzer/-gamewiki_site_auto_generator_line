import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('site remediation CLI enters production orchestration and fails closed on a missing run', async t => {
  const root = await mkdtemp(join(tmpdir(), 'site-remediation-cli-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const agent = join(root, 'agent');
  await cp(new URL('../src/', import.meta.url), join(agent, 'src'), { recursive: true });
  await mkdir(join(agent, 'config'));
  await writeFile(join(agent, 'config', 'workflow.json'), JSON.stringify({
    workspace: '../../workspace', inventory: '../../inventory.json', templateCache: '../../cache',
    templateSource: { repository: 'https://example.invalid/never-fetch.git', ref: 'main',
      subtree: 'template' },
  }));
  const invoke = (...args) => spawnSync(process.execPath,
    [join(agent, 'src', 'cli.mjs'), ...args], { cwd: agent, encoding: 'utf8', timeout: 5000 });
  for (const args of [
    ['site-remediation-preview', 'wallpaper-engine-002'],
    ['site-remediation-confirm', '11111111-1111-4111-8111-111111111111',
      'wallpaper-engine-002', '0123456789abcdef'],
    ['site-remediation-recover', 'wallpaper-engine-002'],
  ]) {
    const result = invoke(...args);
    assert.equal(result.status, 2, result.stderr);
    const output = JSON.parse(result.stdout);
    assert.equal(output.status, 'BLOCKED');
    assert.notEqual(output.code, 'SITE_REMEDIATION_HOST_PROVIDER_REQUIRED');
    assert.equal(output.executorStarted, false);
    assert.equal(output.siteWrites, false);
  }
});
