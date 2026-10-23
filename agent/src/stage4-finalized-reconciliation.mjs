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
  return durableBytes(path, Buffer.from(JSON.stringify(value, null, 2) + '\n'));
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

async function assess({ workspace, runId, expected = null, ignoreRunLock = false }) {
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(runId)) throw fail('MANUAL_RECONCILIATION_REQUIRED', 'unsafe run id');
  workspace = resolve(workspace);
  const runDirectory = join(workspace, 'runs', runId);
  const manifestPath = join(runDirectory, 'manifest.json');
  if (!ignoreRunLock && await exists(join(runDirectory, '.lock')))
    throw fail('MANUAL_RECONCILIATION_REQUIRED', 'run lock exists');
  const manifestBytes = await regularBytes(manifestPath, [workspace]);
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
  const journalBytes = await regularBytes(paths.journalPath, [dirname(projectPath)]);
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
  if (await exists(receiptPath)) {
    const receipt = JSON.parse((await regularBytes(receiptPath, [workspace])).toString('utf8'));
    const current = await regularBytes(join(runDirectory, 'manifest.json'), [workspace]);
    if (receipt.previewDigest === preview.previewDigest && receipt.postManifestSha256 === sha256(current))
      return { status: 'APPLIED', idempotent: true, receiptPath, manifestSha256: receipt.postManifestSha256 };
    throw fail('MANUAL_RECONCILIATION_REQUIRED', 'receipt state mismatch');
  }
  const lockPath = join(runDirectory, '.lock');
  const backupDirectory = join(runDirectory, 'reconciliations', 'backups', previewId);
  const intentPath = join(runDirectory, 'reconciliations', 'intents', `${previewId}.json`);
  let lock;
  try { lock = await open(lockPath, 'wx', 0o600); await lock.writeFile(`reconcile:${previewId}\n`); await lock.sync(); }
  catch (error) { if (error.code === 'EEXIST') throw fail('MANUAL_RECONCILIATION_REQUIRED', 'run lock exists'); throw error; }
  try {
    if (await exists(intentPath)) {
      const intent = JSON.parse((await regularBytes(intentPath, [workspace])).toString('utf8'));
      if (intent.previewDigest !== preview.previewDigest || intent.manifestSha256 !== preview.expected.manifestSha256 ||
          intent.journalSha256 !== preview.expected.journalSha256)
        throw fail('MANUAL_RECONCILIATION_REQUIRED', 'reconciliation intent identity mismatch');
      const originalManifest = await regularBytes(join(backupDirectory, 'manifest.json'), [workspace]);
      const originalJournal = await regularBytes(join(backupDirectory, 'journal.json'), [workspace]);
      if (sha256(originalManifest) !== intent.manifestSha256 || sha256(originalJournal) !== intent.journalSha256)
        throw fail('MANUAL_RECONCILIATION_REQUIRED', 'reconciliation backup mismatch');
      await durableBytes(join(runDirectory, 'manifest.json'), originalManifest);
      const original = JSON.parse(originalManifest.toString('utf8'));
      const transaction = findStage(original.stages, STAGE.CONTENT_INTEGRATION).checkpoint.stage4Transaction;
      await durableBytes(transaction.journalPath, originalJournal);
    }
    const assessment = await assess({ workspace, runId, expected: preview.expected, ignoreRunLock: true });
    await mkdir(backupDirectory, { recursive: true, mode: 0o700 });
    await writeOnceOrVerify(join(backupDirectory, 'manifest.json'), assessment.manifestBytes);
    await writeOnceOrVerify(join(backupDirectory, 'journal.json'), assessment.journalBytes);
    await durableJson(intentPath, { schemaVersion: 1, kind: 'STAGE4_FINALIZED_RECONCILIATION_INTENT_V1',
      previewId, previewDigest: preview.previewDigest, manifestSha256: assessment.evidence.manifestSha256,
      journalSha256: assessment.evidence.journalSha256, createdAt: new Date().toISOString() });

    const reconciledAt = new Date().toISOString();
    const journal = { ...assessment.journal,
      projectContentPolicyVersion: PROJECT_CONTENT_POLICY_VERSION,
      finalizedProjectDigest: assessment.evidence.projectDigest,
      reconciliationPreviewId: previewId, reconciledAt };
    await durableJson(assessment.paths.journalPath, journal);
    await fault('after-journal');

    const manifest = JSON.parse(JSON.stringify(assessment.manifest));
    const stage4 = findStage(manifest.stages, STAGE.CONTENT_INTEGRATION);
    const stage5 = findStage(manifest.stages, STAGE.UI_UX_AUDIT);
    const lastPass = [...stage4.history].reverse().find(item => item.to === 'PASSED');
    if (!lastPass) throw fail('MANUAL_RECONCILIATION_REQUIRED', 'Stage 4 PASS history missing');
    stage4.history.push(historyEntry(stage4, 'PASSED', [
      `Authenticated finalized Stage 4 transaction reconciled by preview ${previewId}.`,
    ], reconciledAt));
    stage4.status = 'PASSED'; stage4.evidence = lastPass.evidence; stage4.missing_inputs = [];
    stage4.checkpoint.updatedAt = reconciledAt; stage4.checkpoint.next = 'Advance next stage';
    stage4.checkpoint.finalizedReconciliation = { previewId, previewDigest: preview.previewDigest,
      projectDigest: assessment.evidence.projectDigest };
    stage5.history.push(historyEntry(stage5, 'BLOCKED', [
      'Interrupted Stage 5 invocation reconciled; explicit retry is required.',
    ], reconciledAt));
    stage5.status = 'BLOCKED'; stage5.evidence = [
      'Interrupted Stage 5 invocation reconciled; explicit retry is required.',
    ]; stage5.missing_inputs = [];
    stage5.checkpoint.updatedAt = reconciledAt; stage5.checkpoint.next = 'Review checkpoint';
    manifest.sequence += 1;
    await durableJson(assessment.manifestPath, manifest);
    await fault('after-manifest');
    const postManifestBytes = await regularBytes(assessment.manifestPath, [workspace]);
    const receipt = { schemaVersion: 1, kind: 'STAGE4_FINALIZED_RECONCILIATION_RECEIPT_V1',
      previewId, previewDigest: preview.previewDigest, runId, reconciledAt,
      preManifestSha256: assessment.evidence.manifestSha256,
      postManifestSha256: sha256(postManifestBytes), journalSha256: sha256(await readFile(assessment.paths.journalPath)),
      backupDirectory };
    await durableJson(receiptPath, receipt);
    return { status: 'APPLIED', idempotent: false, receiptPath,
      manifestSha256: receipt.postManifestSha256 };
  } finally {
    await lock.close();
    await unlink(lockPath).catch(error => { if (error.code !== 'ENOENT') throw error; });
  }
}
