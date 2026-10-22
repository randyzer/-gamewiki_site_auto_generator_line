import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, access } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { prepareStage4SiteTransaction, recoverStage4SiteTransaction,
  stage4SiteDigest } from '../src/stage4-site-transaction.mjs';

async function fixture(t) {
  const root = await mkdtemp(resolve('.stage4-transaction-test-'));
  const targetPath = join(root, 'site');
  await mkdir(join(targetPath, 'src'), { recursive: true });
  await writeFile(join(targetPath, 'src/index.js'), 'export const version = 1;\n');
  await writeFile(join(targetPath, 'package.json'), '{"scripts":{"build":"node build.mjs"}}\n');
  t.after(() => rm(root, { recursive: true, force: true }));
  return { root, targetPath };
}

const options = targetPath => ({ targetPath, runId: 'wallpaper-engine-002', attempt: 8,
  readinessDigest: 'a'.repeat(64), skillLockSha256: 'b'.repeat(64) });

test('candidate is isolated and abort leaves target byte-identical', async t => {
  const { targetPath } = await fixture(t);
  const before = await stage4SiteDigest(targetPath);
  const tx = await prepareStage4SiteTransaction(options(targetPath));
  assert.equal(await stage4SiteDigest(tx.binding.candidatePath), before);
  await writeFile(join(tx.binding.candidatePath, 'src/index.js'), 'export const version = 2;\n');
  assert.equal(await stage4SiteDigest(targetPath), before);
  await tx.abort('synthetic worker failure');
  assert.equal(await stage4SiteDigest(targetPath), before);
  await assert.rejects(access(tx.binding.candidatePath));
});

test('validated candidate promotes only after target and candidate digests are rechecked', async t => {
  const { targetPath } = await fixture(t);
  const tx = await prepareStage4SiteTransaction(options(targetPath));
  await writeFile(join(tx.binding.candidatePath, 'src/index.js'), 'export const version = 2;\n');
  const candidateDigest = await stage4SiteDigest(tx.binding.candidatePath);
  await tx.markValidated(candidateDigest, 'c'.repeat(64));
  await tx.promote();
  assert.equal(await stage4SiteDigest(targetPath), candidateDigest);
  await tx.markManifestCommitted(42);
  await tx.finalize();
  const journal = JSON.parse(await readFile(tx.binding.journalPath, 'utf8'));
  assert.equal(journal.state, 'FINALIZED');
});

test('target drift blocks promotion before either directory is renamed', async t => {
  const { targetPath } = await fixture(t);
  const tx = await prepareStage4SiteTransaction(options(targetPath));
  const candidateDigest = await stage4SiteDigest(tx.binding.candidatePath);
  await tx.markValidated(candidateDigest, 'c'.repeat(64));
  await writeFile(join(targetPath, 'src/index.js'), 'drift\n');
  await assert.rejects(tx.promote(), /TARGET_DRIFT/);
  assert.equal(await readFile(join(targetPath, 'src/index.js'), 'utf8'), 'drift\n');
});

test('recovery disambiguates a completed backup rename from durable BACKUP_INTENT', async t => {
  const { targetPath } = await fixture(t);
  const tx = await prepareStage4SiteTransaction({ ...options(targetPath),
    fault: point => { if (point === 'after-target-backup-rename') throw Error('SYNTHETIC_CRASH'); } });
  const baseline = tx.binding.baselineDigest;
  await tx.markValidated(await stage4SiteDigest(tx.binding.candidatePath), 'c'.repeat(64));
  await assert.rejects(tx.promote(), /SYNTHETIC_CRASH/);
  const recovered = await recoverStage4SiteTransaction({ ...options(targetPath), manifestStage: null });
  assert.equal(recovered.status, 'ROLLED_BACK');
  assert.equal(await stage4SiteDigest(targetPath), baseline);
});

test('durable intents recover crashes before either promotion rename', async t => {
  for (const point of ['after-backup-intent', 'after-promote-intent']) {
    const { targetPath } = await fixture(t);
    const tx = await prepareStage4SiteTransaction({ ...options(targetPath), attempt: point === 'after-backup-intent' ? 9 : 10,
      fault: current => { if (current === point) throw Error('SYNTHETIC_CRASH'); } });
    await writeFile(join(tx.binding.candidatePath, 'src/index.js'), `export const point = ${JSON.stringify(point)};\n`);
    await tx.markValidated(await stage4SiteDigest(tx.binding.candidatePath), 'c'.repeat(64));
    await assert.rejects(tx.promote(), /SYNTHETIC_CRASH/);
    const recovered = await recoverStage4SiteTransaction({ targetPath, runId: 'wallpaper-engine-002',
      attempt: tx.binding.attempt, manifestStage: null });
    assert.ok(['ABORTED', 'ROLLED_BACK'].includes(recovered.status));
    assert.equal(await stage4SiteDigest(targetPath), tx.binding.baselineDigest);
  }
});

test('manifest PASSED wins when promotion completed before journal caught up', async t => {
  const { targetPath } = await fixture(t);
  const tx = await prepareStage4SiteTransaction({ ...options(targetPath),
    fault: point => { if (point === 'after-candidate-promotion-rename') throw Error('SYNTHETIC_CRASH'); } });
  await writeFile(join(tx.binding.candidatePath, 'src/index.js'), 'export const version = 2;\n');
  const candidateDigest = await stage4SiteDigest(tx.binding.candidatePath);
  await tx.markValidated(candidateDigest, 'c'.repeat(64));
  await assert.rejects(tx.promote(), /SYNTHETIC_CRASH/);
  const manifestStage = { status: 'PASSED', checkpoint: { stage4Transaction: {
    runId: 'wallpaper-engine-002', attempt: 8, candidateDigest,
  } } };
  const recovered = await recoverStage4SiteTransaction({ ...options(targetPath), manifestStage });
  assert.equal(recovered.status, 'FINALIZED');
  assert.equal(await stage4SiteDigest(targetPath), candidateDigest);
  const repeated = await recoverStage4SiteTransaction({ ...options(targetPath), manifestStage });
  assert.equal(repeated.status, 'FINALIZED');
});

test('recovery is idempotent after rollback cleanup was interrupted', async t => {
  const { targetPath } = await fixture(t);
  const tx = await prepareStage4SiteTransaction({ ...options(targetPath),
    fault: point => { if (point === 'after-candidate-promotion-rename') throw Error('SYNTHETIC_CRASH'); } });
  await writeFile(join(tx.binding.candidatePath, 'src/index.js'), 'export const version = 2;\n');
  await tx.markValidated(await stage4SiteDigest(tx.binding.candidatePath), 'c'.repeat(64));
  await assert.rejects(tx.promote(), /SYNTHETIC_CRASH/);
  const first = await recoverStage4SiteTransaction({ ...options(targetPath), manifestStage: null });
  assert.equal(first.status, 'ROLLED_BACK');
  const second = await recoverStage4SiteTransaction({ ...options(targetPath), manifestStage: null });
  assert.equal(second.status, 'ROLLED_BACK');
  assert.equal(await stage4SiteDigest(targetPath), tx.binding.baselineDigest);
});

test('rollback intent recovers every promoted rollback rename window idempotently', async t => {
  const points = ['after-rollback-intent', 'after-promoted-abandon-rename', 'after-backup-restore-rename'];
  for (const [index, point] of points.entries()) {
    const { targetPath } = await fixture(t);
    const attempt = 20 + index;
    const tx = await prepareStage4SiteTransaction({ ...options(targetPath), attempt });
    await writeFile(join(tx.binding.candidatePath, 'src/index.js'), `export const crash = ${JSON.stringify(point)};\n`);
    await tx.markValidated(await stage4SiteDigest(tx.binding.candidatePath), 'c'.repeat(64));
    await tx.promote();

    const interrupted = await recoverStage4SiteTransaction({ targetPath, runId: 'wallpaper-engine-002',
      attempt, manifestStage: null, fault: current => { if (current === point) throw Error('SYNTHETIC_CRASH'); } });
    assert.equal(interrupted.status, 'RECOVERY_REQUIRED');

    const recovered = await recoverStage4SiteTransaction({ targetPath, runId: 'wallpaper-engine-002',
      attempt, manifestStage: null });
    assert.equal(recovered.status, 'ROLLED_BACK');
    assert.equal(await stage4SiteDigest(targetPath), tx.binding.baselineDigest);
    assert.equal((await recoverStage4SiteTransaction({ targetPath, runId: 'wallpaper-engine-002',
      attempt, manifestStage: null })).status, 'ROLLED_BACK');
  }
});

test('recovery never deletes a tampered abandoned promoted tree', async t => {
  const { targetPath } = await fixture(t);
  const attempt = 23;
  const tx = await prepareStage4SiteTransaction({ ...options(targetPath), attempt });
  await writeFile(join(tx.binding.candidatePath, 'src/index.js'), 'export const version = 23;\n');
  await tx.markValidated(await stage4SiteDigest(tx.binding.candidatePath), 'c'.repeat(64));
  await tx.promote();
  const interrupted = await recoverStage4SiteTransaction({ targetPath, runId: 'wallpaper-engine-002',
    attempt, manifestStage: null,
    fault: point => { if (point === 'after-promoted-abandon-rename') throw Error('SYNTHETIC_CRASH'); } });
  assert.equal(interrupted.status, 'RECOVERY_REQUIRED');
  await writeFile(join(tx.binding.abandonedPath, 'src/index.js'), 'tampered\n');
  const recovered = await recoverStage4SiteTransaction({ targetPath, runId: 'wallpaper-engine-002',
    attempt, manifestStage: null });
  assert.equal(recovered.status, 'RECOVERY_REQUIRED');
  assert.equal(await readFile(join(tx.binding.abandonedPath, 'src/index.js'), 'utf8'), 'tampered\n');
});

test('manifest PASSED finalizes PROMOTED and repeated recovery cleans a stale lock', async t => {
  const { targetPath } = await fixture(t);
  const attempt = 24;
  const tx = await prepareStage4SiteTransaction({ ...options(targetPath), attempt });
  await writeFile(join(tx.binding.candidatePath, 'src/index.js'), 'export const version = 24;\n');
  const candidateDigest = await stage4SiteDigest(tx.binding.candidatePath);
  await tx.markValidated(candidateDigest, 'c'.repeat(64));
  await tx.promote();
  const manifestStage = { status: 'PASSED', checkpoint: { stage4Transaction: {
    runId: 'wallpaper-engine-002', attempt, candidateDigest,
  } } };
  assert.equal((await recoverStage4SiteTransaction({ targetPath, runId: 'wallpaper-engine-002',
    attempt, manifestStage })).status, 'FINALIZED');
  await writeFile(tx.binding.lockPath, 'stale-lock\n');
  assert.equal((await recoverStage4SiteTransaction({ targetPath, runId: 'wallpaper-engine-002',
    attempt, manifestStage })).status, 'FINALIZED');
  await assert.rejects(access(tx.binding.lockPath));
});

test('rollback and finalization recover after their directory rename already completed', async t => {
  const rollback = await fixture(t);
  const tx = await prepareStage4SiteTransaction(options(rollback.targetPath));
  await tx.markValidated(await stage4SiteDigest(tx.binding.candidatePath), 'c'.repeat(64));
  await assert.rejects(prepareStage4SiteTransaction(options(rollback.targetPath)), /TRANSACTION_EXISTS/);
  await writeFile(tx.binding.lockPath, 'lost-owner\n');
  await assert.rejects(tx.promote(), /LOCK_LOST/);
  await tx.abort('lock test cleanup');

  const finalized = await fixture(t);
  const committed = await prepareStage4SiteTransaction({ ...options(finalized.targetPath), attempt: 11 });
  await writeFile(join(committed.binding.candidatePath, 'src/index.js'), 'export const version = 3;\n');
  const candidateDigest = await stage4SiteDigest(committed.binding.candidatePath);
  await committed.markValidated(candidateDigest, 'c'.repeat(64)); await committed.promote();
  await committed.markManifestCommitted(43);
  await rm(committed.binding.backupPath, { recursive: true });
  const manifestStage = { status: 'PASSED', checkpoint: { stage4Transaction: {
    runId: 'wallpaper-engine-002', attempt: 11, candidateDigest,
  } } };
  const recovered = await recoverStage4SiteTransaction({ targetPath: finalized.targetPath,
    runId: 'wallpaper-engine-002', attempt: 11, manifestStage });
  assert.equal(recovered.status, 'FINALIZED');
});

test('recovery rejects journal path tampering without touching either tree', async t => {
  const { targetPath } = await fixture(t);
  const tx = await prepareStage4SiteTransaction({ ...options(targetPath), attempt: 12 });
  const journal = JSON.parse(await readFile(tx.binding.journalPath, 'utf8'));
  journal.backupPath = join(dirname(tx.binding.backupPath), 'attacker-controlled');
  await writeFile(tx.binding.journalPath, JSON.stringify(journal));
  const result = await recoverStage4SiteTransaction({ targetPath, runId: 'wallpaper-engine-002',
    attempt: 12, manifestStage: null });
  assert.equal(result.status, 'RECOVERY_REQUIRED');
  assert.equal(await stage4SiteDigest(targetPath), tx.binding.baselineDigest);
  assert.equal(await stage4SiteDigest(tx.binding.candidatePath), tx.binding.baselineDigest);
});

