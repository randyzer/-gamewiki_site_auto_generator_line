import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { ContractError } from '../contracts/errors.mjs';

const pause = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

export async function acquireStageLock({ lockDirectory, waitMs = 5000, pollMs = 10 }) {
  const token = randomUUID(); const deadline = Date.now() + waitMs;
  while (true) {
    try {
      await mkdir(lockDirectory, { recursive: false, mode: 0o700 });
      try {
        await writeFile(`${lockDirectory}/owner.json`, JSON.stringify({ pid: process.pid, token }), { flag: 'wx', mode: 0o600 });
      } catch (error) {
        await rm(lockDirectory, { recursive: true, force: true });
        throw error;
      }
      return Object.freeze({
        async release() {
          const owner = JSON.parse(await readFile(`${lockDirectory}/owner.json`, 'utf8'));
          if (owner.token !== token) throw new ContractError('STATE_LOCK_OWNERSHIP_LOST', 'Stage lock ownership changed');
          await rm(lockDirectory, { recursive: true, force: true });
        },
      });
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      if (Date.now() >= deadline) throw new ContractError('STATE_LOCK_HELD', 'Stage lock remains owned; it was not reclaimed by timeout');
      await pause(pollMs);
    }
  }
}
