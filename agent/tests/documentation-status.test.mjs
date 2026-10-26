import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const docs = resolve(root, 'docs');

async function text(path) {
  return readFile(resolve(root, path), 'utf8');
}

test('active documentation points to the current status instead of the retired roadmap', async () => {
  const [readme, index, architecture, matrix, status] = await Promise.all([
    text('README.md'),
    text('docs/README.md'),
    text('docs/AGENT_PERSONAL_USE_ARCHITECTURE_AND_PLAN.md'),
    text('docs/SEVEN_STAGE_GATE_AND_EVIDENCE_MATRIX_V1.md'),
    text('docs/CURRENT_STATUS.md'),
  ]);

  for (const active of [readme, index, architecture, matrix]) {
    assert.match(active, /CURRENT_STATUS\.md/);
    assert.doesNotMatch(active, /AGENT_V2_CURRENT_EXECUTION_ROADMAP\.md/);
  }
  assert.match(status, /Manifest sequence：`219`/);
  assert.match(status, /\| 2 关键词资料调研 \| `PARTIAL` \|/);
  assert.match(status, /\| 7 部署计划 \| `WAITING_FOR_USER` \|/);
  assert.match(status, /生产部署、站点推送、DNS 修改：均未授权、未执行/);
});

test('active documentation links resolve to files', async () => {
  const active = [
    'README.md',
    'docs/README.md',
    'docs/CURRENT_STATUS.md',
    'docs/AGENT_PERSONAL_USE_ARCHITECTURE_AND_PLAN.md',
    'docs/SEVEN_STAGE_GATE_AND_EVIDENCE_MATRIX_V1.md',
  ];

  for (const relative of active) {
    const body = await text(relative);
    const base = dirname(resolve(root, relative));
    for (const match of body.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      const target = match[1].split('#', 1)[0];
      if (!target || /^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
      await assert.doesNotReject(access(resolve(base, target)), `${relative}: missing ${target}`);
    }
  }
});
