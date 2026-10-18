import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { canonicalJson, deepFreeze, parseStrictJson } from '../contracts/canonical-json.mjs';
import { ContractError } from '../contracts/errors.mjs';
import { validateContract } from '../contracts/registry.mjs';
import { acquireStageLock } from '../state/stage-lock.mjs';
import { ensureDirectoryTree, assertRegularFileNoSymlink } from '../state/storage-boundary.mjs';
import { writeAtomicFile } from '../state/atomic-file.mjs';

const sha256 = value => createHash('sha256').update(value).digest('hex');
const digestOf = value => sha256(`AGENT_APPROVAL_REVOCATION_V1\n${canonicalJson(value)}`);

export function createApprovalRevocationStore({ rootDirectory, namespace, mode, consumptions }) {
  if (!/^[A-Za-z0-9._-]+$/u.test(namespace ?? ''))
    throw new ContractError('APPROVAL_NAMESPACE_INVALID', 'Approval namespace must be a safe path segment');
  const base = join(rootDirectory, 'approval', namespace);
  const pathFor = approvalId => join(base, 'revocations', `${approvalId}.json`);

  async function read(approvalId) {
    const path = pathFor(approvalId);
    try {
      await assertRegularFileNoSymlink(path);
      const record = parseStrictJson(await readFile(path), path);
      validateContract('APPROVAL_REVOCATION', 1, record);
      const { revocationDigest, ...payload } = record;
      if (record.namespace !== namespace || record.mode !== mode || record.approvalId !== approvalId ||
          digestOf(payload) !== revocationDigest)
        throw new ContractError('APPROVAL_REVOCATION_CORRUPT', 'Approval revocation digest mismatch');
      return deepFreeze(record);
    } catch (error) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
  }

  return Object.freeze({
    read,
    async assertNotRevoked({ approvalId }) {
      if (await read(approvalId)) throw new ContractError('APPROVAL_REVOKED', 'Approval was revoked');
    },
    async revoke(reference, { nowMs, reasonCode }) {
      await ensureDirectoryTree(rootDirectory, ['approval', namespace, 'revocations']);
      await ensureDirectoryTree(rootDirectory, ['approval', namespace, 'locks']);
      const lock = await acquireStageLock({ lockDirectory: join(base, 'locks/consume.lock') });
      try {
        if (await read(reference.approvalId))
          throw new ContractError('APPROVAL_ALREADY_REVOKED', 'Approval was already revoked');
        if ((await consumptions.readAll()).some(item => item.approvalId === reference.approvalId))
          throw new ContractError('APPROVAL_ALREADY_CONSUMED', 'Consumed approval cannot be revoked retroactively');
        const payload = { kind: 'APPROVAL_REVOCATION', schemaVersion: 1,
          producer: 'SIMULATED_APPROVAL_AUTHORITY', mode, namespace, approvalId: reference.approvalId,
          approvalRecordDigest: reference.recordDigest, revokedAtMs: nowMs, reasonCode };
        const record = { ...payload, revocationDigest: digestOf(payload) };
        validateContract('APPROVAL_REVOCATION', 1, record);
        await writeAtomicFile(pathFor(reference.approvalId), Buffer.from(`${canonicalJson(record)}\n`));
        return deepFreeze(record);
      } finally { await lock.release(); }
    },
  });
}
