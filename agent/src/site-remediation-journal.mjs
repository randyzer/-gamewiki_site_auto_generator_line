import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { canonicalJson, parseStrictJson } from './contracts/canonical-json.mjs';
import { ContractError } from './contracts/errors.mjs';
import { writeImmutableFile } from './state/atomic-file.mjs';
import {
  verifySiteRemediationAbort,
  verifySiteRemediationIntent,
  verifySiteRemediationPreview,
  verifySiteRemediationReceipt,
} from './site-remediation-records.mjs';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const TRANSACTION = /^site-remediation-([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/;

export function siteRemediationPaths(runDirectory, { previewId, transactionId }) {
  const match = TRANSACTION.exec(transactionId ?? '');
  if (!match || !UUID.test(previewId ?? '') || match[1] !== previewId) {
    throw new ContractError('SITE_REMEDIATION_IDENTITY_INVALID',
      'Preview and transaction identifiers must be one matching UUID');
  }
  const root = join(runDirectory, 'site-remediation');
  const transactionDirectory = join(root, 'transactions', transactionId);
  return Object.freeze({
    root,
    previewPath: join(root, 'previews', `${previewId}.json`),
    transactionDirectory,
    authorizationPath: join(transactionDirectory, 'authorization.json'),
    intentPath: join(transactionDirectory, 'intent.json'),
    postManifestPath: join(transactionDirectory, 'post-manifest.json'),
    reservationPath: join(transactionDirectory, 'reservation.json'),
    consumptionPath: join(transactionDirectory, 'consumption.json'),
    receiptPath: join(transactionDirectory, 'receipt.json'),
    abortPath: join(transactionDirectory, 'abort.json'),
  });
}

async function readOptional(path) {
  try { return parseStrictJson(await readFile(path), path); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

export async function persistSiteRemediationRecord(path, record) {
  const bytes = `${canonicalJson(record)}\n`;
  return persistSiteRemediationBytes(path, bytes);
}

export async function persistSiteRemediationBytes(path, bytes) {
  bytes = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  const created = await writeImmutableFile(path, bytes);
  if (created) return true;
  const existing = await readFile(path);
  if (!existing.equals(bytes)) {
    throw new ContractError('SITE_REMEDIATION_JOURNAL_CONFLICT',
      'Immutable site remediation record already exists with different bytes');
  }
  return false;
}

export async function classifySiteRemediation({ runDirectory, transactionId, manifestSha256 }) {
  const match = TRANSACTION.exec(transactionId ?? '');
  if (!match) throw new ContractError('SITE_REMEDIATION_IDENTITY_INVALID',
    'Invalid site remediation transaction identifier');
  const previewId = match[1];
  const paths = siteRemediationPaths(runDirectory, { previewId, transactionId });
  const [preview, intent, reservation, consumption, receipt, abort] = await Promise.all([
    readOptional(paths.previewPath), readOptional(paths.intentPath),
    readOptional(paths.reservationPath), readOptional(paths.consumptionPath),
    readOptional(paths.receiptPath), readOptional(paths.abortPath),
  ]);
  if (preview) verifySiteRemediationPreview(preview);
  if (!intent) return Object.freeze({ phase: 'NO_INTENT', preview, paths });
  verifySiteRemediationIntent(intent);
  if (!preview || intent.previewDigest !== preview.previewDigest) {
    return Object.freeze({ phase: 'RECOVERY_REQUIRED', preview, intent, paths });
  }
  const manifestIsPre = manifestSha256 === intent.expectedManifestSha256;
  const manifestIsPost = manifestSha256 === intent.postManifestSha256;
  if (abort) {
    verifySiteRemediationAbort(abort);
    return Object.freeze({ phase: manifestIsPre ? 'ABORTED' : 'RECOVERY_REQUIRED',
      preview, intent, reservation, abort, paths });
  }
  if (receipt) {
    verifySiteRemediationReceipt(receipt);
    return Object.freeze({ phase: manifestIsPost ? 'COMMITTED' : 'RECOVERY_REQUIRED',
      preview, intent, reservation, consumption, receipt, paths });
  }
  if (consumption) return Object.freeze({
    phase: manifestIsPost ? 'CONSUMED_NO_RECEIPT' : 'RECOVERY_REQUIRED',
    preview, intent, reservation, consumption, paths,
  });
  if (reservation) return Object.freeze({
    phase: manifestIsPost ? 'RESERVED_POST_COMMIT' :
      manifestIsPre ? 'RESERVED_PRE_COMMIT' : 'RECOVERY_REQUIRED',
    preview, intent, reservation, paths,
  });
  return Object.freeze({ phase: manifestIsPre ? 'INTENT_ONLY' : 'RECOVERY_REQUIRED',
    preview, intent, paths });
}

export async function pendingSiteRemediationTransaction({ runDirectory, manifestSha256 }) {
  const directory = join(runDirectory, 'site-remediation', 'transactions');
  let names;
  try { names = await readdir(directory); }
  catch (error) {
    if (error.code === 'ENOENT') {
      throw new ContractError('SITE_REMEDIATION_NOT_PENDING',
        'No site remediation transaction requires recovery');
    }
    throw error;
  }
  const pending = [];
  const classifiedTransactions = [];
  for (const transactionId of names.filter(name => TRANSACTION.test(name)).sort()) {
    const classified = await classifySiteRemediation({ runDirectory, transactionId,
      manifestSha256 });
    classifiedTransactions.push(classified);
    if (!['COMMITTED', 'ABORTED', 'NO_INTENT'].includes(classified.phase)) pending.push(classified);
  }
  if (pending.length === 0 && classifiedTransactions.length === 1 &&
      classifiedTransactions[0].phase === 'COMMITTED') return classifiedTransactions[0];
  if (pending.length !== 1) {
    throw new ContractError(pending.length === 0 ? 'SITE_REMEDIATION_NOT_PENDING' :
      'SITE_REMEDIATION_RECOVERY_CONFLICT', pending.length === 0 ?
      'No site remediation transaction requires recovery' :
      'Multiple site remediation transactions require manual reconciliation');
  }
  return pending[0];
}
