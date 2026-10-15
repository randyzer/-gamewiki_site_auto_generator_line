import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFile, readFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { hostname } from 'node:os';
import { createPipeline } from '../src/pipeline.mjs';
import { fixture, goodResult } from './helpers.mjs';

test('dead local durable lock is reclaimed but interrupted worker is blocked until explicit retry', async t => {
  const f = await fixture(t);
  const options = { ...f.configuration, inputs: { ...f.inputs, projectPath: join(f.configuration.workspace, 'site') }, executor: goodResult, runId: 'recovery' };
  const p = await createPipeline(options); const state = p.snapshot();
  state.stages[0].status = 'IN_PROGRESS'; state.stages[0].checkpoint.attempt = 1;
  await writeFile(p.manifestPath, JSON.stringify(state));
  const lock = join(f.configuration.workspace, 'runs/recovery/.lock');
  // Impossible PID exceeds the platform PID range; no process is signaled except signal 0.
  await writeFile(lock, JSON.stringify({ pid: 2147483647, host: hostname(), runId: 'recovery' }));
  const restored = await createPipeline({ ...options, inputs: {}, resume: true, recoverDeadLocks: true });
  await restored.advance(); assert.equal(restored.snapshot().stages[0].status, 'BLOCKED');
  await assert.rejects(access(lock), { code: 'ENOENT' });
  await restored.updateUserInputs({}, { retry: true }); await restored.advance();
  assert.equal(restored.snapshot().stages[0].status, 'PASSED');
});

test('live or unknown lock is never stolen', async t => {
  const f = await fixture(t); const options = { ...f.configuration, inputs: {}, executor: goodResult };
  for (const owner of [{ pid: process.pid, host: hostname() }, { pid: 2147483647, host: 'another-host' }]) {
    const p = await createPipeline(options); const lock = join(f.configuration.workspace, 'runs', p.snapshot().runId, '.lock');
    const bytes = JSON.stringify(owner); await writeFile(lock, bytes);
    const restored = await createPipeline({ ...options, runId: p.snapshot().runId, resume: true, recoverDeadLocks: true });
    await assert.rejects(restored.advance(), /alive|Unknown lock/);
    assert.equal(await readFile(lock, 'utf8'), bytes);
  }
});

test('referenced Skill scripts changing blocks a locked run', async t => {
  const f = await fixture(t); const inventory = JSON.parse(await readFile(f.configuration.inventoryPath));
  const script = join(f.root, 'skills/validator.py'); await writeFile(script, 'original');
  const { sha256 } = await import('../src/files.mjs');
  inventory.skills[0].files = [{ path: script, sha256: sha256('original') }];
  // Fixture skills are at the source root, so this is a valid locked sibling dependency.
  await writeFile(f.configuration.inventoryPath, JSON.stringify(inventory));
  const p = await createPipeline({ ...f.configuration, inputs: f.inputs, executor: goodResult });
  await writeFile(script, 'changed'); await p.advance();
  assert.equal(p.snapshot().stages[0].status, 'BLOCKED');
});
