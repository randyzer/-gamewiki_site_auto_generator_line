import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir, hostname } from 'node:os';
import { join } from 'node:path';
import { acquireRunLock, recoverDeadRunLock } from '../src/run-lock.mjs';

test('shared run lock rejects concurrent ownership and releases by token', async t => {
  const root = await mkdtemp(join(tmpdir(), 'agent-run-lock-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const lockPath = join(root, '.lock');
  const lock = await acquireRunLock({ lockPath, runId: 'run-1' });
  const owner = JSON.parse(await readFile(lockPath, 'utf8'));
  assert.equal(owner.runId, 'run-1');
  assert.match(owner.token, /^[0-9a-f-]{36}$/);
  await assert.rejects(() => acquireRunLock({ lockPath, runId: 'run-1' }),
    error => error.code === 'RUN_LOCK_HELD');
  await lock.release();
  const next = await acquireRunLock({ lockPath, runId: 'run-1' });
  await next.release();
});

test('shared run lock detects ownership loss', async t => {
  const root = await mkdtemp(join(tmpdir(), 'agent-run-lock-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const lockPath = join(root, '.lock');
  const lock = await acquireRunLock({ lockPath, runId: 'run-1' });
  await writeFile(lockPath, JSON.stringify({ runId: 'run-1', pid: process.pid,
    host: hostname(), token: 'stolen', acquiredAt: new Date().toISOString() }));
  await assert.rejects(() => lock.release(), error => error.code === 'RUN_LOCK_OWNERSHIP_LOST');
});

test('dead lock recovery remains explicit and host-bound', async t => {
  const root = await mkdtemp(join(tmpdir(), 'agent-run-lock-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const lockPath = join(root, '.lock');
  await writeFile(lockPath, JSON.stringify({ runId: 'run-1', pid: 2147483647,
    host: hostname(), acquiredAt: new Date().toISOString() }));
  await recoverDeadRunLock(lockPath);
  const lock = await acquireRunLock({ lockPath, runId: 'run-1' });
  await lock.release();
});
