import { open, readFile, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { hostname } from 'node:os';
import { ContractError } from './contracts/errors.mjs';

async function readOwner(lockPath) {
  return JSON.parse(await readFile(lockPath, 'utf8'));
}

export async function recoverDeadRunLock(lockPath) {
  const guardPath = `${lockPath}.recovery`;
  let guard;
  try {
    guard = await open(guardPath, 'wx', 0o600);
  } catch (error) {
    if (error.code === 'EEXIST') {
      throw new ContractError('RUN_LOCK_RECOVERY_HELD', 'Run lock recovery is already in progress');
    }
    throw error;
  }
  try {
    const owner = await readOwner(lockPath);
    if (owner.host !== hostname() || !Number.isSafeInteger(owner.pid) || owner.pid <= 0) {
      throw new ContractError('RUN_LOCK_OWNER_UNKNOWN', 'Unknown lock owner; manual reconciliation required');
    }
    let dead = false;
    try { process.kill(owner.pid, 0); }
    catch (error) {
      if (error.code === 'ESRCH') dead = true;
      else throw error;
    }
    if (!dead) throw new ContractError('RUN_LOCK_HELD', 'Run lock owner is still alive');
    await unlink(lockPath);
  } finally {
    await guard.close();
    await unlink(guardPath);
  }
}

export async function acquireRunLock({ lockPath, runId, recoverDead = false }) {
  const token = randomUUID();
  let handle;
  try {
    handle = await open(lockPath, 'wx', 0o600);
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    if (!recoverDead) throw new ContractError('RUN_LOCK_HELD', 'Pipeline busy: durable run lock exists');
    await recoverDeadRunLock(lockPath);
    handle = await open(lockPath, 'wx', 0o600);
  }
  try {
    await handle.writeFile(JSON.stringify({
      runId,
      pid: process.pid,
      host: hostname(),
      token,
      acquiredAt: new Date().toISOString(),
    }));
    await handle.sync();
  } catch (error) {
    await handle.close();
    await unlink(lockPath).catch(() => {});
    throw error;
  }
  await handle.close();
  return Object.freeze({
    token,
    async release() {
      const owner = await readOwner(lockPath);
      if (owner.runId !== runId || owner.token !== token) {
        throw new ContractError('RUN_LOCK_OWNERSHIP_LOST', 'Run lock ownership changed');
      }
      await unlink(lockPath);
    },
  });
}
