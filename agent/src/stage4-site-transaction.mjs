import { randomUUID } from 'node:crypto';
import { open, mkdir, readFile, writeFile, rename, rm, stat, lstat, chmod, copyFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { sourceFiles } from './project-baseline.mjs';
import { safePath, sha256 } from './files.mjs';

const fail = (code, detail = '') => Object.assign(Error(`${code}${detail ? `: ${detail}` : ''}`), { code });
const digestFiles = files => sha256(JSON.stringify(files));
const journalVersion = 1;

async function exists(path) {
  try { return await lstat(path); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

async function syncDirectory(path) {
  const handle = await open(path, 'r');
  try { await handle.sync(); }
  catch (error) { if (!['EINVAL', 'ENOTSUP', 'EBADF'].includes(error.code)) throw error; }
  finally { await handle.close(); }
}

async function durableJson(path, value) {
  const temporary = `${path}.${randomUUID()}.tmp`;
  const handle = await open(temporary, 'wx', 0o600);
  try {
    await handle.writeFile(JSON.stringify(value, null, 2) + '\n');
    await handle.sync();
  } finally { await handle.close(); }
  await rename(temporary, path);
  await syncDirectory(dirname(path));
}

export async function stage4SiteFiles(root) {
  return sourceFiles(root, { rejectSecrets: true });
}

export async function stage4SiteDigest(root) {
  return digestFiles(await stage4SiteFiles(root));
}

export function stage4TransactionPaths({ targetPath, runId, attempt }) {
  targetPath = resolve(targetPath);
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(runId) || !Number.isSafeInteger(attempt) || attempt < 1)
    throw fail('STAGE4_TRANSACTION_ID_INVALID');
  const root = join(dirname(targetPath), `.${basename(targetPath)}.agent-stage4-${runId}-${attempt}`);
  return { root, candidatePath: join(root, 'candidate'), backupPath: join(root, 'backup'),
    abandonedPath: join(root, 'uncommitted-promoted'),
    journalPath: join(root, 'journal.json'), lockPath: join(root, '.lock') };
}

async function copySourceTree(source, destination, files) {
  await mkdir(destination, { recursive: false, mode: 0o700 });
  for (const file of files) {
    const from = join(source, file.path), to = join(destination, file.path);
    await safePath(from, [source]); await safePath(to, [destination]);
    await mkdir(dirname(to), { recursive: true, mode: 0o700 });
    await copyFile(from, to); await chmod(to, file.mode);
  }
}

function manifestMatches(journal, manifestStage) {
  const identity = manifestStage?.checkpoint?.stage4Transaction;
  return manifestStage?.status === 'PASSED' && identity?.runId === journal.runId &&
    identity?.attempt === journal.attempt && identity?.candidateDigest === journal.candidateDigest;
}

async function loadJournal(paths) {
  try { return JSON.parse(await readFile(paths.journalPath, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return null; throw fail('STAGE4_TRANSACTION_JOURNAL_INVALID', error.message); }
}

async function writeState(paths, journal, state, extra = {}) {
  Object.assign(journal, extra, { state, updatedAt: new Date().toISOString() });
  await durableJson(paths.journalPath, journal);
}

async function digestIfDirectory(path) {
  const meta = await exists(path);
  if (!meta) return null;
  if (!meta.isDirectory() || meta.isSymbolicLink()) throw fail('STAGE4_TRANSACTION_PATH_INVALID', path);
  return stage4SiteDigest(path);
}

async function removeAbandoned(paths, journal) {
  const abandonedDigest = await digestIfDirectory(paths.abandonedPath);
  if (abandonedDigest === null) return;
  if (abandonedDigest !== journal.candidateDigest)
    throw fail('STAGE4_RECOVERY_REQUIRED', 'uncommitted promoted digest mismatch');
  await rm(paths.abandonedPath, { recursive: true, force: true });
  await syncDirectory(paths.root);
}

async function restoreBackup(paths, journal, fault = () => {}) {
  if (await exists(paths.targetPath)) throw fail('STAGE4_RECOVERY_REQUIRED', 'target exists while restoring backup');
  if (await digestIfDirectory(paths.backupPath) !== journal.baselineDigest)
    throw fail('STAGE4_RECOVERY_REQUIRED', 'backup digest mismatch');
  await writeState(paths, journal, 'ROLLBACK_INTENT');
  await fault('after-rollback-restore-intent');
  await rename(paths.backupPath, paths.targetPath); await syncDirectory(dirname(paths.targetPath));
  await fault('after-backup-restore-rename');
  await rm(paths.candidatePath, { recursive: true, force: true });
  await rm(paths.lockPath, { force: true });
  await writeState(paths, journal, 'ROLLED_BACK');
}

async function rollbackPromoted(paths, journal, fault = () => {}) {
  const [targetDigest, candidateDigest, backupDigest, abandonedDigest] = await Promise.all([
    digestIfDirectory(paths.targetPath), digestIfDirectory(paths.candidatePath),
    digestIfDirectory(paths.backupPath), digestIfDirectory(paths.abandonedPath),
  ]);
  if (targetDigest !== journal.candidateDigest || candidateDigest !== null ||
      backupDigest !== journal.baselineDigest || abandonedDigest !== null)
    throw fail('STAGE4_RECOVERY_REQUIRED', 'promoted rollback disk state mismatch');
  await writeState(paths, journal, 'ROLLBACK_INTENT');
  await fault('after-rollback-intent');
  await rename(paths.targetPath, paths.abandonedPath); await syncDirectory(dirname(paths.targetPath));
  await fault('after-promoted-abandon-rename');
  await restoreBackup(paths, journal, fault);
  await removeAbandoned(paths, journal);
}

async function finalizeRecovered(paths, journal) {
  if (await digestIfDirectory(paths.targetPath) !== journal.candidateDigest)
    throw fail('STAGE4_RECOVERY_REQUIRED', 'promoted target digest mismatch');
  const backupDigest = await digestIfDirectory(paths.backupPath);
  if (backupDigest !== null && backupDigest !== journal.baselineDigest)
    throw fail('STAGE4_RECOVERY_REQUIRED', 'backup digest mismatch');
  await rm(paths.backupPath, { recursive: true, force: true });
  await rm(paths.candidatePath, { recursive: true, force: true });
  await rm(paths.lockPath, { force: true });
  await syncDirectory(paths.root);
  await writeState(paths, journal, 'FINALIZED');
}

export async function prepareStage4SiteTransaction({ targetPath, runId, attempt,
  readinessDigest, skillLockSha256, fault = () => {} }) {
  targetPath = resolve(targetPath);
  if (!/^[a-f0-9]{64}$/.test(readinessDigest ?? '') || !/^[a-f0-9]{64}$/.test(skillLockSha256 ?? ''))
    throw fail('STAGE4_TRANSACTION_BINDING_INVALID');
  await safePath(targetPath, [targetPath]);
  const targetMeta = await lstat(targetPath);
  if (!targetMeta.isDirectory() || targetMeta.isSymbolicLink()) throw fail('STAGE4_TRANSACTION_TARGET_INVALID');
  const computed = stage4TransactionPaths({ targetPath, runId, attempt });
  const paths = { ...computed, targetPath };
  if (await exists(paths.root)) throw fail('STAGE4_TRANSACTION_EXISTS', paths.root);
  await mkdir(paths.root, { mode: 0o700 });
  const lockOwner = `${process.pid}:${randomUUID()}`;
  const lock = await open(paths.lockPath, 'wx', 0o600); await lock.writeFile(`${lockOwner}\n`); await lock.sync(); await lock.close();
  const files = await stage4SiteFiles(targetPath), baselineDigest = digestFiles(files);
  await copySourceTree(targetPath, paths.candidatePath, files);
  if (await stage4SiteDigest(paths.candidatePath) !== baselineDigest)
    throw fail('STAGE4_CANDIDATE_COPY_INVALID');
  const devices = await Promise.all([targetPath, paths.candidatePath, paths.root].map(path => stat(path).then(item => item.dev)));
  if (new Set(devices).size !== 1) throw fail('STAGE4_TRANSACTION_CROSS_DEVICE');
  const journal = { schemaVersion: journalVersion, kind: 'STAGE4_SITE_TRANSACTION_V1', runId, attempt,
    targetPath, ...computed, baselineDigest, readinessDigest, skillLockSha256,
    candidateDigest: null, validationDigest: null, manifestSequence: null,
    createdAt: new Date().toISOString(), state: 'PREPARED' };
  await durableJson(paths.journalPath, journal);
  const binding = Object.freeze({ kind: journal.kind, runId, attempt, targetPath,
    ...computed, baselineDigest, readinessDigest, skillLockSha256 });

  const verifyTargetUnchanged = async () => {
    if (await stage4SiteDigest(targetPath) !== baselineDigest) throw fail('STAGE4_TARGET_DRIFT');
    return true;
  };
  const api = {
    binding,
    verifyTargetUnchanged,
    async markValidated(candidateDigest, validationDigest) {
      if (journal.state !== 'PREPARED' || !/^[a-f0-9]{64}$/.test(candidateDigest ?? '') ||
          !/^[a-f0-9]{64}$/.test(validationDigest ?? '')) throw fail('STAGE4_TRANSACTION_STATE_INVALID');
      if (await stage4SiteDigest(paths.candidatePath) !== candidateDigest) throw fail('STAGE4_CANDIDATE_DRIFT');
      await verifyTargetUnchanged();
      await writeState(paths, journal, 'VALIDATED', { candidateDigest, validationDigest });
    },
    async promote() {
      if (journal.state !== 'VALIDATED') throw fail('STAGE4_TRANSACTION_STATE_INVALID');
      if ((await readFile(paths.lockPath, 'utf8')).trim() !== lockOwner) throw fail('STAGE4_TRANSACTION_LOCK_LOST');
      await verifyTargetUnchanged();
      if (await stage4SiteDigest(paths.candidatePath) !== journal.candidateDigest) throw fail('STAGE4_CANDIDATE_DRIFT');
      await writeState(paths, journal, 'BACKUP_INTENT'); await fault('after-backup-intent');
      await rename(targetPath, paths.backupPath); await syncDirectory(dirname(targetPath));
      await fault('after-target-backup-rename');
      await writeState(paths, journal, 'TARGET_BACKED_UP');
      await writeState(paths, journal, 'PROMOTE_INTENT'); await fault('after-promote-intent');
      await rename(paths.candidatePath, targetPath); await syncDirectory(dirname(targetPath));
      await fault('after-candidate-promotion-rename');
      await writeState(paths, journal, 'PROMOTED');
      if (await stage4SiteDigest(targetPath) !== journal.candidateDigest ||
          await stage4SiteDigest(paths.backupPath) !== baselineDigest) throw fail('STAGE4_PROMOTION_VERIFY_FAILED');
      return { state: journal.state, candidateDigest: journal.candidateDigest };
    },
    async markManifestCommitted(manifestSequence) {
      if (journal.state !== 'PROMOTED' || !Number.isSafeInteger(manifestSequence) || manifestSequence < 0)
        throw fail('STAGE4_TRANSACTION_STATE_INVALID');
      await writeState(paths, journal, 'MANIFEST_COMMITTED', { manifestSequence });
    },
    async finalize() {
      if (!['PROMOTED', 'MANIFEST_COMMITTED'].includes(journal.state)) throw fail('STAGE4_TRANSACTION_STATE_INVALID');
      await finalizeRecovered(paths, journal);
    },
    async abort(reason = 'aborted') {
      if (['PREPARED', 'VALIDATED'].includes(journal.state)) {
        await verifyTargetUnchanged(); await rm(paths.candidatePath, { recursive: true, force: true });
        await rm(paths.lockPath, { force: true }); await writeState(paths, journal, 'ABORTED', { reason }); return;
      }
      if (['BACKUP_INTENT', 'TARGET_BACKED_UP', 'PROMOTE_INTENT', 'PROMOTED'].includes(journal.state)) {
        const recovered = await recoverStage4SiteTransaction({ targetPath, runId, attempt, manifestStage: null });
        if (recovered.status !== 'ROLLED_BACK') throw fail('STAGE4_RECOVERY_REQUIRED');
        return;
      }
      if (!['ABORTED', 'ROLLED_BACK', 'FINALIZED'].includes(journal.state)) throw fail('STAGE4_TRANSACTION_STATE_INVALID');
    },
  };
  return api;
}

export async function recoverStage4SiteTransaction({ targetPath, runId, attempt, manifestStage,
  fault = () => {} }) {
  targetPath = resolve(targetPath);
  const computed = stage4TransactionPaths({ targetPath, runId, attempt });
  const paths = { ...computed, targetPath };
  const journal = await loadJournal(paths);
  if (!journal) return { status: 'NONE', evidence: [] };
  if (journal.schemaVersion !== journalVersion || journal.kind !== 'STAGE4_SITE_TRANSACTION_V1' ||
      journal.targetPath !== targetPath || journal.runId !== runId || journal.attempt !== attempt ||
      ['root', 'candidatePath', 'backupPath', 'abandonedPath', 'journalPath', 'lockPath']
        .some(key => journal[key] !== paths[key]) ||
      !/^[a-f0-9]{64}$/.test(journal.baselineDigest ?? ''))
    return { status: 'RECOVERY_REQUIRED', evidence: ['STAGE4_TRANSACTION_IDENTITY_MISMATCH'] };
  try {
    if (journal.state === 'FINALIZED') {
      if (await digestIfDirectory(targetPath) !== journal.candidateDigest || await exists(paths.backupPath) ||
          await exists(paths.candidatePath)) throw fail('STAGE4_RECOVERY_REQUIRED', 'finalized disk state mismatch');
      await rm(paths.lockPath, { force: true });
      return { status: 'FINALIZED', evidence: [] };
    }
    if (journal.state === 'ABORTED') return { status: 'ABORTED', evidence: [] };
    if (journal.state === 'ROLLED_BACK') {
      if (await digestIfDirectory(targetPath) !== journal.baselineDigest)
        throw fail('STAGE4_RECOVERY_REQUIRED', 'rolled-back target digest mismatch');
      await removeAbandoned(paths, journal);
      await rm(paths.candidatePath, { recursive: true, force: true }); await rm(paths.lockPath, { force: true });
      return { status: 'ROLLED_BACK', evidence: [] };
    }
    if (journal.state === 'ROLLBACK_INTENT') {
      const [targetDigest, candidateDigest, backupDigest, abandonedDigest] = await Promise.all([
        digestIfDirectory(targetPath), digestIfDirectory(paths.candidatePath),
        digestIfDirectory(paths.backupPath), digestIfDirectory(paths.abandonedPath),
      ]);
      if (targetDigest === journal.candidateDigest && candidateDigest === null &&
          backupDigest === journal.baselineDigest && abandonedDigest === null) {
        await rollbackPromoted(paths, journal, fault); return { status: 'ROLLED_BACK', evidence: [] };
      }
      if (targetDigest === journal.baselineDigest && backupDigest === null) {
        if (candidateDigest !== null && candidateDigest !== journal.candidateDigest)
          throw fail('STAGE4_RECOVERY_REQUIRED', 'candidate digest mismatch during rollback');
        if (abandonedDigest !== null && abandonedDigest !== journal.candidateDigest)
          throw fail('STAGE4_RECOVERY_REQUIRED', 'uncommitted promoted digest mismatch');
        await removeAbandoned(paths, journal);
        await rm(paths.candidatePath, { recursive: true, force: true }); await rm(paths.lockPath, { force: true });
        await writeState(paths, journal, 'ROLLED_BACK'); return { status: 'ROLLED_BACK', evidence: [] };
      }
      if (targetDigest === null && backupDigest === journal.baselineDigest &&
          candidateDigest === null && abandonedDigest === journal.candidateDigest) {
        await restoreBackup(paths, journal, fault); await removeAbandoned(paths, journal);
        return { status: 'ROLLED_BACK', evidence: [] };
      }
      if (targetDigest === null && backupDigest === journal.baselineDigest && abandonedDigest === null) {
        await restoreBackup(paths, journal, fault); return { status: 'ROLLED_BACK', evidence: [] };
      }
      throw fail('STAGE4_RECOVERY_REQUIRED', 'ambiguous rollback intent');
    }
    if (['PREPARED', 'VALIDATED'].includes(journal.state)) {
      if (await digestIfDirectory(targetPath) !== journal.baselineDigest || await exists(paths.backupPath))
        throw fail('STAGE4_RECOVERY_REQUIRED', 'unexpected pre-promotion disk state');
      await rm(paths.candidatePath, { recursive: true, force: true }); await rm(paths.lockPath, { force: true });
      await writeState(paths, journal, 'ABORTED'); return { status: 'ABORTED', evidence: [] };
    }
    if (journal.state === 'BACKUP_INTENT') {
      const [targetDigest, backupDigest] = await Promise.all([digestIfDirectory(targetPath), digestIfDirectory(paths.backupPath)]);
      if (targetDigest === journal.baselineDigest && backupDigest === null) {
        await rm(paths.candidatePath, { recursive: true, force: true }); await rm(paths.lockPath, { force: true });
        await writeState(paths, journal, 'ABORTED'); return { status: 'ABORTED', evidence: [] };
      }
      if (targetDigest === null && backupDigest === journal.baselineDigest) {
        await restoreBackup(paths, journal); return { status: 'ROLLED_BACK', evidence: [] };
      }
      throw fail('STAGE4_RECOVERY_REQUIRED', 'ambiguous backup intent');
    }
    if (journal.state === 'TARGET_BACKED_UP') {
      if (await exists(targetPath)) throw fail('STAGE4_RECOVERY_REQUIRED', 'target unexpectedly exists');
      await restoreBackup(paths, journal); return { status: 'ROLLED_BACK', evidence: [] };
    }
    if (journal.state === 'PROMOTE_INTENT') {
      const [targetDigest, candidateDigest, backupDigest] = await Promise.all([
        digestIfDirectory(targetPath), digestIfDirectory(paths.candidatePath), digestIfDirectory(paths.backupPath)]);
      if (backupDigest !== journal.baselineDigest) throw fail('STAGE4_RECOVERY_REQUIRED', 'backup digest mismatch');
      if (targetDigest === null && candidateDigest === journal.candidateDigest) {
        await restoreBackup(paths, journal); return { status: 'ROLLED_BACK', evidence: [] };
      }
      if (targetDigest === journal.candidateDigest && candidateDigest === null) {
        if (manifestMatches(journal, manifestStage)) {
          await finalizeRecovered(paths, journal); return { status: 'FINALIZED', evidence: [] };
        }
        await rollbackPromoted(paths, journal, fault); return { status: 'ROLLED_BACK', evidence: [] };
      }
      throw fail('STAGE4_RECOVERY_REQUIRED', 'ambiguous promote intent');
    }
    if (['PROMOTED', 'MANIFEST_COMMITTED'].includes(journal.state)) {
      if (manifestMatches(journal, manifestStage)) {
        await finalizeRecovered(paths, journal); return { status: 'FINALIZED', evidence: [] };
      }
      await rollbackPromoted(paths, journal, fault); return { status: 'ROLLED_BACK', evidence: [] };
    }
    throw fail('STAGE4_RECOVERY_REQUIRED', `unknown journal state ${journal.state}`);
  } catch (error) {
    return { status: 'RECOVERY_REQUIRED', evidence: [error.message] };
  }
}
