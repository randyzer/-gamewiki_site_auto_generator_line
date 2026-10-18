import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { canonicalJson, parseStrictJson } from '../contracts/canonical-json.mjs';
import { ContractError } from '../contracts/errors.mjs';
import { validateContract } from '../contracts/registry.mjs';
import { assertRegularFileNoSymlink } from '../state/storage-boundary.mjs';

const sha256 = value => createHash('sha256').update(value).digest('hex');

export function approvalRecordDigest(record) {
  const { recordDigest: ignored, ...payload } = record;
  return sha256(`AGENT_APPROVAL_RECORD_V1\n${canonicalJson(payload)}`);
}

export function createApprovalStore({ rootDirectory, namespace, mode }) {
  if (!/^[A-Za-z0-9._-]+$/u.test(namespace ?? ''))
    throw new ContractError('APPROVAL_NAMESPACE_INVALID', 'Approval namespace must be a safe path segment');
  const directory = join(rootDirectory, 'approval', namespace, 'records');
  return Object.freeze({
    async read(reference) {
      validateContract('APPROVAL_REFERENCE', 1, reference);
      if (reference?.namespace !== namespace || reference?.mode !== mode)
        throw new ContractError('APPROVAL_MODE_MISMATCH', 'Approval namespace or mode does not match');
      const path = join(directory, `${reference.approvalId}.json`); await assertRegularFileNoSymlink(path);
      const record = parseStrictJson(await readFile(path), path);
      validateContract('APPROVAL_RECORD', 1, record);
      if (record.namespace !== namespace || record.mode !== mode || record.approvalId !== reference.approvalId ||
          approvalRecordDigest(record) !== record.recordDigest || record.recordDigest !== reference.recordDigest)
        throw new ContractError('APPROVAL_RECORD_CORRUPT', 'Approval record digest mismatch');
      return record;
    },
  });
}
