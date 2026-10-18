import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { canonicalJson, parseStrictJson } from '../contracts/canonical-json.mjs';
import { ContractError } from '../contracts/errors.mjs';
import { validateContract } from '../contracts/registry.mjs';
import { acquireStageLock } from '../state/stage-lock.mjs';
import { ensureDirectoryTree, assertRegularFileNoSymlink } from '../state/storage-boundary.mjs';
import { writeAtomicFile } from '../state/atomic-file.mjs';

const sha256 = value => createHash('sha256').update(value).digest('hex');
const digestOf = record => { const { consumptionDigest: ignored, ...payload } = record;
  return sha256(`AGENT_APPROVAL_CONSUMPTION_V${record.schemaVersion ?? 1}\n${canonicalJson(payload)}`); };

export function createApprovalConsumptionStore({ rootDirectory, anchorRootDirectory, namespace, faults = {},
  validateUnderLock }) {
  if (!/^[A-Za-z0-9._-]+$/u.test(namespace ?? ''))
    throw new ContractError('APPROVAL_NAMESPACE_INVALID', 'Approval namespace must be a safe path segment');
  const base = join(rootDirectory, 'approval', namespace); const commits = join(base, 'consumptions');
  const anchorBase = join(anchorRootDirectory, namespace); const anchorPath = join(anchorBase, 'CONSUMPTION_ANCHOR');
  async function chain() {
    await ensureDirectoryTree(rootDirectory, ['approval', namespace, 'consumptions']);
    await ensureDirectoryTree(anchorRootDirectory, [namespace]);
    const names = (await readdir(commits)).filter(name => /^\d{12}\.json$/.test(name)).sort();
    let previous = null; const records = [];
    for (const [index, name] of names.entries()) {
      await assertRegularFileNoSymlink(join(commits, name));
      const record = parseStrictJson(await readFile(join(commits, name)), name); const sequence = index + 1;
      validateContract('APPROVAL_CONSUMPTION', record.schemaVersion, record);
      if (record.namespace !== namespace || record.sequence !== sequence ||
          record.previousDigest !== (previous?.consumptionDigest ?? null) ||
          digestOf(record) !== record.consumptionDigest) throw new ContractError('APPROVAL_CONSUMPTION_CORRUPT', 'Consumption chain is corrupt');
      records.push(record); previous = record;
    }
    const expectedProjection = { sequence: records.length,
      consumptionDigest: records.at(-1)?.consumptionDigest ?? null };
    let head = null;
    try {
      await assertRegularFileNoSymlink(join(base, 'CONSUMPTION_HEAD'));
      head = parseStrictJson(await readFile(join(base, 'CONSUMPTION_HEAD')), 'CONSUMPTION_HEAD');
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
    let anchor = null;
    try {
      await assertRegularFileNoSymlink(anchorPath);
      anchor = parseStrictJson(await readFile(anchorPath), 'CONSUMPTION_ANCHOR');
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (!anchor && (records.length || head))
      throw new ContractError('APPROVAL_CONSUMPTION_CORRUPT', 'Trusted consumption anchor is missing');
    if (anchor && (anchor.sequence > records.length || anchor.sequence < 0 ||
        anchor.consumptionDigest !== (anchor.sequence ? records[anchor.sequence - 1]?.consumptionDigest : null)))
      throw new ContractError('APPROVAL_CONSUMPTION_CORRUPT', 'Consumption chain no longer contains its trusted anchor');
    if (!anchor || anchor.sequence < records.length) await writeAtomicFile(anchorPath,
      Buffer.from(`${canonicalJson(expectedProjection)}\n`));
    if (!head || head.sequence !== expectedProjection.sequence ||
        head.consumptionDigest !== expectedProjection.consumptionDigest) {
      await writeAtomicFile(join(base, 'CONSUMPTION_HEAD'), Buffer.from(`${canonicalJson(expectedProjection)}\n`));
    }
    return records;
  }
  return Object.freeze({
    readAll: chain,
    async readOperation(expected) {
      const records = await chain();
      const record = records.find(item => item.schemaVersion === 2 && item.operationId === expected.operationId);
      if (!record) return null;
      for (const key of ['approvalId', 'operationId', 'intentDigest', 'contextDigest', 'purposeDigest']) {
        if (expected[key] !== undefined && record[key] !== expected[key])
          throw new ContractError('TRANSACTION_BINDING_MISMATCH', `Consumption does not match ${key}`);
      }
      if (expected.consumptionDigest && record.consumptionDigest !== expected.consumptionDigest)
        throw new ContractError('TRANSACTION_BINDING_MISMATCH', 'Consumption digest does not match');
      return Object.freeze(record);
    },
    async consume({ reference, expected }) {
      await ensureDirectoryTree(rootDirectory, ['approval', namespace, 'locks']);
      const lock = await acquireStageLock({ lockDirectory: join(base, 'locks/consume.lock') });
      try {
        const records = await chain();
        await faults.afterLockAcquired?.();
        const { approval, nowMs } = await validateUnderLock({ reference, expected });
        const { approvalId, nonce, contextDigest, purposeDigest } = approval;
        if (records.some(item => item.approvalId === approvalId || item.nonce === nonce))
          throw new ContractError('APPROVAL_ALREADY_CONSUMED', 'Approval or nonce was already consumed');
        const sequence = records.length + 1; const payload = { kind: 'APPROVAL_CONSUMPTION', schemaVersion: 1,
          producer: 'APPROVAL_CONSUMPTION_STORE', namespace, sequence,
          previousDigest: records.at(-1)?.consumptionDigest ?? null, approvalId, nonce, contextDigest, purposeDigest, consumedAtMs: nowMs };
        const record = { ...payload, consumptionDigest: digestOf(payload) };
        validateContract('APPROVAL_CONSUMPTION', 1, record);
        await faults.beforeRecordCommit?.(record);
        await writeAtomicFile(join(commits, `${String(sequence).padStart(12, '0')}.json`), Buffer.from(`${canonicalJson(record)}\n`));
        await faults.afterRecordCommit?.(record);
        await writeAtomicFile(anchorPath, Buffer.from(`${canonicalJson({ sequence, consumptionDigest: record.consumptionDigest })}\n`));
        await writeAtomicFile(join(base, 'CONSUMPTION_HEAD'), Buffer.from(`${canonicalJson({ sequence, consumptionDigest: record.consumptionDigest })}\n`));
        await faults.afterHeadCommit?.(record);
        return Object.freeze(record);
      } finally { await lock.release(); }
    },
    async consumeForOperation({ reference, expected, operation }) {
      await ensureDirectoryTree(rootDirectory, ['approval', namespace, 'locks']);
      const lock = await acquireStageLock({ lockDirectory: join(base, 'locks/consume.lock') });
      try {
        const records = await chain();
        const existingOperation = records.find(item => item.schemaVersion === 2 && item.operationId === operation.operationId);
        if (existingOperation) {
          const exact = existingOperation.approvalId === reference.approvalId &&
            existingOperation.intentDigest === operation.intentDigest;
          if (!exact) throw new ContractError('TRANSACTION_IDEMPOTENCY_CONFLICT',
            'Operation is already bound to a different approval or intent');
          return Object.freeze(existingOperation);
        }
        await faults.afterLockAcquired?.();
        const { approval, nowMs } = await validateUnderLock({ reference, expected });
        const { approvalId, nonce, contextDigest, purposeDigest } = approval;
        if (records.some(item => item.approvalId === approvalId || item.nonce === nonce))
          throw new ContractError('APPROVAL_ALREADY_CONSUMED', 'Approval or nonce was already consumed');
        const sequence = records.length + 1;
        const payload = { kind: 'APPROVAL_CONSUMPTION', schemaVersion: 2,
          producer: 'APPROVAL_CONSUMPTION_STORE', namespace, sequence,
          previousDigest: records.at(-1)?.consumptionDigest ?? null, approvalId, nonce,
          contextDigest, purposeDigest, operationId: operation.operationId,
          intentDigest: operation.intentDigest, consumedAtMs: nowMs };
        const record = { ...payload, consumptionDigest: digestOf(payload) };
        validateContract('APPROVAL_CONSUMPTION', 2, record);
        await faults.beforeRecordCommit?.(record);
        await writeAtomicFile(join(commits, `${String(sequence).padStart(12, '0')}.json`),
          Buffer.from(`${canonicalJson(record)}\n`));
        await faults.afterRecordCommit?.(record);
        const projection = { sequence, consumptionDigest: record.consumptionDigest };
        await writeAtomicFile(anchorPath, Buffer.from(`${canonicalJson(projection)}\n`));
        await writeAtomicFile(join(base, 'CONSUMPTION_HEAD'), Buffer.from(`${canonicalJson(projection)}\n`));
        await faults.afterHeadCommit?.(record);
        return Object.freeze(record);
      } finally { await lock.release(); }
    },
  });
}
