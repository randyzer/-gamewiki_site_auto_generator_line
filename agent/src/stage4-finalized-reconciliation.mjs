import { randomUUID } from 'node:crypto';
import { access, lstat, mkdir, open, readFile, rename, unlink } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { inside, safePath, sha256 } from './files.mjs';
import { sourceFiles } from './project-baseline.mjs';
import { projectContentDigest, PROJECT_CONTENT_POLICY_VERSION } from './project-content-digest.mjs';
import { stage4SiteFiles, stage4TransactionPaths } from './stage4-site-transaction.mjs';
import { STAGE, findStage } from './stages.mjs';

const fail = (code, detail = '') => Object.assign(Error(`${code}${detail ? `: ${detail}` : ''}`), { code });
const digestFiles = files => sha256(JSON.stringify(files));
const hashPattern = /^[a-f0-9]{64}$/;
const jsonBytes = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');

async function exists(path) {
  try { await access(path); return true; }
  catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}

async function regularBytes(path, roots) {
  await safePath(path, roots);
  const info = await lstat(path);
  if (!info.isFile() || info.nlink !== 1) throw fail('MANUAL_RECONCILIATION_REQUIRED', `unsafe file ${path}`);
  return readFile(path);
}

async function syncDirectory(path) {
  const handle = await open(path, 'r');
  try { await handle.sync(); }
  catch (error) { if (!['EINVAL', 'ENOTSUP', 'EBADF'].includes(error.code)) throw error; }
  finally { await handle.close(); }
}

async function durableJson(path, value) {
  return durableBytes(path, jsonBytes(value));
}

async function durableBytes(path, bytes) {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  const temporary = `${path}.${randomUUID()}.tmp`;
  const handle = await open(temporary, 'wx', 0o600);
  try { await handle.writeFile(bytes); await handle.sync(); }
  finally { await handle.close(); }
  await rename(temporary, path);
  await syncDirectory(dirname(path));
}

async function writeOnceOrVerify(path, bytes) {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  try {
    const handle = await open(path, 'wx', 0o400);
    try { await handle.writeFile(bytes); await handle.sync(); }
    finally { await handle.close(); }
    await syncDirectory(dirname(path));
  }
  catch (error) {
    if (error.code !== 'EEXIST' || sha256(await readFile(path)) !== sha256(bytes)) throw error;
  }
}

function historyEntry(stage, to, evidence, at) {
  return { from: stage.status, to, at, evidence, artifacts: stage.artifacts.map(item => ({
    path: item.path, sha256: item.sha256,
  })), skillSha256: null, next: to === 'PASSED' ? 'Advance next stage' : 'Review checkpoint' };
}

async function assess({ workspace, runId, expected = null, ignoreRunLock = false,
  suppliedManifestBytes = null, suppliedJournalBytes = null }) {
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(runId)) throw fail('MANUAL_RECONCILIATION_REQUIRED', 'unsafe run id');
  workspace = resolve(workspace);
  const runDirectory = join(workspace, 'runs', runId);
  const manifestPath = join(runDirectory, 'manifest.json');
  if (!ignoreRunLock && await exists(join(runDirectory, '.lock')))
    throw fail('MANUAL_RECONCILIATION_REQUIRED', 'run lock exists');
  const manifestBytes = suppliedManifestBytes ?? await regularBytes(manifestPath, [workspace]);
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  if (manifest.runId !== runId || manifest.workspace !== workspace || manifest.deploymentExecuted !== false)
    throw fail('MANUAL_RECONCILIATION_REQUIRED', 'manifest identity or deployment state mismatch');
  const stage4 = findStage(manifest.stages, STAGE.CONTENT_INTEGRATION);
  const stage5 = findStage(manifest.stages, STAGE.UI_UX_AUDIT);
  if (stage4?.status !== 'BLOCKED' || stage5?.status !== 'IN_PROGRESS' ||
      manifest.stages.slice(5, 7).some(stage => stage.status !== 'NOT_STARTED'))
    throw fail('MANUAL_RECONCILIATION_REQUIRED', 'unexpected stage state pattern');
  const transaction = stage4.checkpoint?.stage4Transaction;
  const projectPath = resolve(manifest.inputs?.projectPath ?? '');
  if (!transaction || transaction.runId !== runId || !Number.isSafeInteger(transaction.attempt) ||
      !hashPattern.test(transaction.candidateDigest ?? '') || projectPath === resolve('.'))
    throw fail('MANUAL_RECONCILIATION_REQUIRED', 'Stage 4 transaction identity missing');
  const paths = stage4TransactionPaths({ targetPath: projectPath, runId, attempt: transaction.attempt });
  if (transaction.journalPath !== paths.journalPath)
    throw fail('MANUAL_RECONCILIATION_REQUIRED', 'journal path mismatch');
  const journalBytes = suppliedJournalBytes ??
    await regularBytes(paths.journalPath, [dirname(projectPath)]);
  const journal = JSON.parse(journalBytes.toString('utf8'));
  if (journal.state !== 'FINALIZED' || journal.runId !== runId || journal.attempt !== transaction.attempt ||
      journal.targetPath !== projectPath || journal.candidateDigest !== transaction.candidateDigest ||
      journal.manifestSequence > manifest.sequence ||
      ['root', 'candidatePath', 'backupPath', 'abandonedPath', 'journalPath', 'lockPath']
        .some(key => journal[key] !== ({ ...paths, targetPath: projectPath })[key]))
    throw fail('MANUAL_RECONCILIATION_REQUIRED', 'finalized journal identity mismatch');
  if (await exists(paths.candidatePath) || await exists(paths.backupPath) ||
      await exists(paths.abandonedPath) || await exists(paths.lockPath))
    throw fail('MANUAL_RECONCILIATION_REQUIRED', 'transaction residue exists');

  const currentFiles = await stage4SiteFiles(projectPath);
  const legacyStage4Files = currentFiles.filter(file =>
    !/^docs\/ui-ux-audit(?:\/|$)/.test(file.path));
  if (digestFiles(legacyStage4Files) !== transaction.candidateDigest)
    throw fail('MANUAL_RECONCILIATION_REQUIRED', 'Stage 4 source differs from finalized candidate');

  const hostArtifact = stage4.artifacts.find(item => item.kind === 'STAGE4_HOST_VALIDATION.json');
  if (!hostArtifact || !hashPattern.test(hostArtifact.sha256 ?? ''))
    throw fail('MANUAL_RECONCILIATION_REQUIRED', 'Stage 4 Host validation artifact missing');
  for (const path of [hostArtifact.path, hostArtifact.sourcePath].filter(Boolean)) {
    const bytes = await regularBytes(resolve(path), [workspace]);
    if (sha256(bytes) !== hostArtifact.sha256)
      throw fail('MANUAL_RECONCILIATION_REQUIRED', 'Stage 4 Host validation hash mismatch');
  }

  const auditRoot = join(projectPath, 'docs', 'ui-ux-audit', runId);
  const auditReportPath = join(runDirectory, 'artifacts', '4', String(stage5.checkpoint.attempt),
    'native', 'reports', 'UI_UX_AUDIT.json');
  const auditReportBytes = await regularBytes(auditReportPath, [workspace]);
  const auditReport = JSON.parse(auditReportBytes.toString('utf8'));
  if (!Array.isArray(auditReport.evidence) || auditReport.evidence.length === 0)
    throw fail('MANUAL_RECONCILIATION_REQUIRED', 'Stage 5 evidence list missing');
  const recorded = new Map();
  for (const item of auditReport.evidence) {
    const path = resolve(item.path ?? '');
    if (!inside(auditRoot, path) || path === auditRoot || !hashPattern.test(item.sha256 ?? '') || recorded.has(path))
      throw fail('MANUAL_RECONCILIATION_REQUIRED', 'Stage 5 evidence identity invalid');
    const bytes = await regularBytes(path, [projectPath]);
    if (sha256(bytes) !== item.sha256)
      throw fail('MANUAL_RECONCILIATION_REQUIRED', `Stage 5 evidence hash mismatch: ${path}`);
    recorded.set(path, item.sha256);
  }
  const auditFiles = await sourceFiles(auditRoot, { rejectSecrets: true });
  if (auditFiles.length !== recorded.size || auditFiles.some(file =>
    recorded.get(join(auditRoot, file.path)) !== file.sha256))
    throw fail('MANUAL_RECONCILIATION_REQUIRED', 'unrecorded or missing Stage 5 site evidence');

  const protectedFiles = [];
  const candidates = [manifest.inputs?.rawKeywordsFile,
    ...Object.values(manifest.inputCopies ?? {}).map(item => item?.copyPath)].filter(Boolean);
  for (const path of [...new Set(candidates.map(path => resolve(path)))]) {
    const roots = inside(workspace, path) ? [workspace] : [projectPath];
    const bytes = await regularBytes(path, roots);
    protectedFiles.push({ path, sha256: sha256(bytes) });
  }
  protectedFiles.sort((a, b) => a.path.localeCompare(b.path));
  const evidence = {
    manifestSha256: sha256(manifestBytes), journalSha256: sha256(journalBytes),
    candidateDigest: transaction.candidateDigest,
    projectDigest: await projectContentDigest(projectPath),
    hostValidationSha256: hostArtifact.sha256,
    auditReport: { path: auditReportPath, sha256: sha256(auditReportBytes) },
    auditEvidence: [...recorded].sort(([a], [b]) => a.localeCompare(b)).map(([path, hash]) => ({ path, sha256: hash })),
    protectedFiles,
  };
  if (expected && JSON.stringify(evidence) !== JSON.stringify(expected))
    throw fail('RECONCILIATION_PREVIEW_STALE', 'bound evidence changed');
  return { workspace, runDirectory, manifestPath, manifest, manifestBytes, stage4, stage5,
    projectPath, paths, journal, journalBytes, evidence };
}

function proposedState({ assessment, preview, reconciledAt, backupDirectory }) {
  const journal = { ...assessment.journal,
    projectContentPolicyVersion: PROJECT_CONTENT_POLICY_VERSION,
    finalizedProjectDigest: assessment.evidence.projectDigest,
    reconciliationPreviewId: preview.previewId, reconciledAt };
  const journalBytes = jsonBytes(journal);
  const manifest = JSON.parse(JSON.stringify(assessment.manifest));
  const stage4 = findStage(manifest.stages, STAGE.CONTENT_INTEGRATION);
  const stage5 = findStage(manifest.stages, STAGE.UI_UX_AUDIT);
  const lastPass = [...stage4.history].reverse().find(item => item.to === 'PASSED');
  if (!lastPass) throw fail('MANUAL_RECONCILIATION_REQUIRED', 'Stage 4 PASS history missing');
  stage4.history.push(historyEntry(stage4, 'PASSED', [
    `Authenticated finalized Stage 4 transaction reconciled by preview ${preview.previewId}.`,
  ], reconciledAt));
  stage4.status = 'PASSED'; stage4.evidence = lastPass.evidence; stage4.missing_inputs = [];
  stage4.checkpoint.updatedAt = reconciledAt; stage4.checkpoint.next = 'Advance next stage';
  stage4.checkpoint.finalizedReconciliation = { previewId: preview.previewId,
    previewDigest: preview.previewDigest, projectDigest: assessment.evidence.projectDigest };
  stage5.history.push(historyEntry(stage5, 'BLOCKED', [
    'Interrupted Stage 5 invocation reconciled; explicit retry is required.',
  ], reconciledAt));
  stage5.status = 'BLOCKED'; stage5.evidence = [
    'Interrupted Stage 5 invocation reconciled; explicit retry is required.',
  ]; stage5.missing_inputs = [];
  stage5.checkpoint.updatedAt = reconciledAt; stage5.checkpoint.next = 'Review checkpoint';
  manifest.sequence += 1;
  const manifestBytes = jsonBytes(manifest);
  const receipt = { schemaVersion: 1, kind: 'STAGE4_FINALIZED_RECONCILIATION_RECEIPT_V1',
    previewId: preview.previewId, previewDigest: preview.previewDigest, runId: preview.runId,
    reconciledAt, preManifestSha256: assessment.evidence.manifestSha256,
    postManifestSha256: sha256(manifestBytes), journalSha256: sha256(journalBytes), backupDirectory };
  return { journalBytes, manifestBytes, receipt, receiptBytes: jsonBytes(receipt) };
}

async function replayState({ assessment, intent, proposed, receiptPath }) {
  const currentManifest = await regularBytes(assessment.manifestPath, [assessment.workspace]);
  const currentJournal = await regularBytes(assessment.paths.journalPath, [dirname(assessment.projectPath)]);
  const manifestSha256 = sha256(currentManifest), journalSha256 = sha256(currentJournal);
  const hasReceipt = await exists(receiptPath);
  if (hasReceipt) {
    const receiptBytes = await regularBytes(receiptPath, [assessment.workspace]);
    if (sha256(receiptBytes) === sha256(proposed.receiptBytes) &&
        manifestSha256 === intent.postManifestSha256 && journalSha256 === intent.postJournalSha256)
      return 'RECEIPT_COMMITTED';
    throw fail('MANUAL_RECONCILIATION_REQUIRED', 'conflicting reconciliation receipt state');
  }
  if (manifestSha256 === intent.preManifestSha256 && journalSha256 === intent.preJournalSha256)
    return 'PRE_COMMIT';
  if (manifestSha256 === intent.preManifestSha256 && journalSha256 === intent.postJournalSha256)
    return 'JOURNAL_COMMITTED';
  if (manifestSha256 === intent.postManifestSha256 && journalSha256 === intent.postJournalSha256)
    return 'MANIFEST_COMMITTED';
  throw fail('MANUAL_RECONCILIATION_REQUIRED', 'unrecognized reconciliation replay state');
}

export async function previewFinalizedStage4Reconciliation({ workspace, runId }) {
  const assessment = await assess({ workspace, runId });
  const previewId = randomUUID();
  const payload = { schemaVersion: 1, kind: 'STAGE4_FINALIZED_RECONCILIATION_PREVIEW_V1',
    previewId, runId, createdAt: new Date().toISOString(), expected: assessment.evidence,
    proposed: { stage4: 'PASSED', stage5: 'BLOCKED', laterStages: 'NOT_STARTED',
      deploymentExecuted: false } };
  payload.previewDigest = sha256(JSON.stringify(payload));
  const confirmationCode = sha256(`${payload.previewDigest}:${runId}`).slice(0, 16);
  const previewPath = join(assessment.runDirectory, 'reconciliations', 'previews', `${previewId}.json`);
  await durableJson(previewPath, payload);
  return { status: 'PREVIEW', previewId, confirmationCode, previewPath,
    manifestSha256: assessment.evidence.manifestSha256, proposed: payload.proposed };
}

export async function applyFinalizedStage4Reconciliation({ workspace, runId, previewId,
  confirmationCode, fault = () => {} }) {
  workspace = resolve(workspace);
  const runDirectory = join(workspace, 'runs', runId);
  const previewPath = join(runDirectory, 'reconciliations', 'previews', `${previewId}.json`);
  const previewBytes = await regularBytes(previewPath, [workspace]);
  const preview = JSON.parse(previewBytes.toString('utf8'));
  if (preview.kind !== 'STAGE4_FINALIZED_RECONCILIATION_PREVIEW_V1' || preview.previewId !== previewId ||
      preview.runId !== runId || preview.previewDigest !== sha256(JSON.stringify({
        schemaVersion: preview.schemaVersion, kind: preview.kind, previewId: preview.previewId,
        runId: preview.runId, createdAt: preview.createdAt, expected: preview.expected, proposed: preview.proposed,
      })) || confirmationCode !== sha256(`${preview.previewDigest}:${runId}`).slice(0, 16))
    throw fail('RECONCILIATION_CONFIRMATION_INVALID');
  const receiptPath = join(runDirectory, 'reconciliations', 'receipts', `${previewId}.json`);
  const lockPath = join(runDirectory, '.lock');
  const backupDirectory = join(runDirectory, 'reconciliations', 'backups', previewId);
  const intentPath = join(runDirectory, 'reconciliations', 'intents', `${previewId}.json`);
  let lock;
  try { lock = await open(lockPath, 'wx', 0o600); await lock.writeFile(`reconcile:${previewId}\n`); await lock.sync(); }
  catch (error) { if (error.code === 'EEXIST') throw fail('MANUAL_RECONCILIATION_REQUIRED', 'run lock exists'); throw error; }
  try {
    let intent, assessment, proposed;
    if (!await exists(intentPath)) {
      assessment = await assess({ workspace, runId, expected: preview.expected, ignoreRunLock: true });
      await mkdir(backupDirectory, { recursive: true, mode: 0o700 });
      await writeOnceOrVerify(join(backupDirectory, 'manifest.json'), assessment.manifestBytes);
      await writeOnceOrVerify(join(backupDirectory, 'journal.json'), assessment.journalBytes);
      const reconciledAt = new Date().toISOString();
      proposed = proposedState({ assessment, preview, reconciledAt, backupDirectory });
      intent = { schemaVersion: 1, kind: 'STAGE4_FINALIZED_RECONCILIATION_INTENT_V1',
        previewId, previewDigest: preview.previewDigest, reconciledAt,
        preManifestSha256: assessment.evidence.manifestSha256,
        preJournalSha256: assessment.evidence.journalSha256,
        postManifestSha256: sha256(proposed.manifestBytes),
        postJournalSha256: sha256(proposed.journalBytes), createdAt: reconciledAt };
      await durableJson(intentPath, intent);
    } else {
      intent = JSON.parse((await regularBytes(intentPath, [workspace])).toString('utf8'));
      if (intent.kind !== 'STAGE4_FINALIZED_RECONCILIATION_INTENT_V1' ||
          intent.previewId !== previewId || intent.previewDigest !== preview.previewDigest ||
          intent.preManifestSha256 !== preview.expected.manifestSha256 ||
          intent.preJournalSha256 !== preview.expected.journalSha256 ||
          !hashPattern.test(intent.postManifestSha256 ?? '') ||
          !hashPattern.test(intent.postJournalSha256 ?? ''))
        throw fail('MANUAL_RECONCILIATION_REQUIRED', 'reconciliation intent identity mismatch');
      const originalManifest = await regularBytes(join(backupDirectory, 'manifest.json'), [workspace]);
      const originalJournal = await regularBytes(join(backupDirectory, 'journal.json'), [workspace]);
      if (sha256(originalManifest) !== intent.preManifestSha256 ||
          sha256(originalJournal) !== intent.preJournalSha256)
        throw fail('MANUAL_RECONCILIATION_REQUIRED', 'reconciliation backup mismatch');
      assessment = await assess({ workspace, runId, expected: preview.expected, ignoreRunLock: true,
        suppliedManifestBytes: originalManifest, suppliedJournalBytes: originalJournal });
      proposed = proposedState({ assessment, preview, reconciledAt: intent.reconciledAt, backupDirectory });
      if (sha256(proposed.manifestBytes) !== intent.postManifestSha256 ||
          sha256(proposed.journalBytes) !== intent.postJournalSha256)
        throw fail('MANUAL_RECONCILIATION_REQUIRED', 'reconciliation proposal mismatch');
    }
    const state = await replayState({ assessment, intent, proposed, receiptPath });
    if (state === 'RECEIPT_COMMITTED') return { status: 'APPLIED', idempotent: true,
      receiptPath, manifestSha256: intent.postManifestSha256 };
    if (state === 'PRE_COMMIT') {
      await durableBytes(assessment.paths.journalPath, proposed.journalBytes);
      await fault('after-journal');
    }
    if (['PRE_COMMIT', 'JOURNAL_COMMITTED'].includes(state)) {
      await durableBytes(assessment.manifestPath, proposed.manifestBytes);
      await fault('after-manifest');
    }
    await writeOnceOrVerify(receiptPath, proposed.receiptBytes);
    return { status: 'APPLIED', idempotent: false, receiptPath,
      manifestSha256: intent.postManifestSha256 };
  } finally {
    await lock.close();
    await unlink(lockPath).catch(error => { if (error.code !== 'ENOENT') throw error; });
  }
}
