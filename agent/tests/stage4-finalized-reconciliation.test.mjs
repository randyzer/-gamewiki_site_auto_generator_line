import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { sha256 } from '../src/files.mjs';
import { ALL_STAGES, STAGE } from '../src/stages.mjs';
import { stage4SiteFiles, stage4TransactionPaths,
  recoverStage4SiteTransaction } from '../src/stage4-site-transaction.mjs';
import { previewFinalizedStage4Reconciliation,
  applyFinalizedStage4Reconciliation } from '../src/stage4-finalized-reconciliation.mjs';

const digestFiles = files => sha256(JSON.stringify(files));

async function fixture(t) {
  const root = await mkdtemp(resolve('.stage4-reconcile-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const workspace = join(root, 'workspace'), runId = 'legacy-run', runDirectory = join(workspace, 'runs', runId);
  const projectPath = join(root, 'site');
  await mkdir(join(projectPath, 'src'), { recursive: true });
  await mkdir(runDirectory, { recursive: true });
  await writeFile(join(projectPath, 'src/index.js'), 'export const site = true;\n');
  const rawKeywordsFile = join(projectPath, 'keywords.md');
  await writeFile(rawKeywordsFile, '# Keywords\n');
  const candidateDigest = digestFiles(await stage4SiteFiles(projectPath));
  const attempt = 7, paths = stage4TransactionPaths({ targetPath: projectPath, runId, attempt });
  await mkdir(paths.root, { recursive: true });
  const journal = { schemaVersion: 1, kind: 'STAGE4_SITE_TRANSACTION_V1', runId, attempt,
    targetPath: projectPath, ...paths, baselineDigest: 'a'.repeat(64), readinessDigest: 'b'.repeat(64),
    skillLockSha256: 'c'.repeat(64), candidateDigest, validationDigest: 'd'.repeat(64),
    manifestSequence: 10, createdAt: '2026-01-01T00:00:00.000Z', state: 'FINALIZED',
    updatedAt: '2026-01-01T00:01:00.000Z' };
  await writeFile(paths.journalPath, JSON.stringify(journal));

  const hostValidationPath = join(runDirectory, 'artifacts/3/7/STAGE4_HOST_VALIDATION.json');
  await mkdir(join(hostValidationPath, '..'), { recursive: true });
  await writeFile(hostValidationPath, '{"status":"PASSED"}\n');
  const hostSha = sha256(await readFile(hostValidationPath));

  const auditRoot = join(projectPath, 'docs/ui-ux-audit', runId);
  await mkdir(join(auditRoot, 'screenshots'), { recursive: true });
  const auditPaths = [join(auditRoot, 'AUTOMATED_AUDIT.json'), join(auditRoot, 'screenshots/home.png')];
  await writeFile(auditPaths[0], '{"status":"PASSED"}\n');
  await writeFile(auditPaths[1], 'png fixture\n');
  const evidence = [];
  for (const path of auditPaths) evidence.push({ path, sha256: sha256(await readFile(path)) });
  const auditReportPath = join(runDirectory, 'artifacts/4/1/native/reports/UI_UX_AUDIT.json');
  await mkdir(join(auditReportPath, '..'), { recursive: true });
  await writeFile(auditReportPath, JSON.stringify({ evidence }));

  const stages = ALL_STAGES.map(skill => ({ skill, status: 'NOT_STARTED', artifacts: [], evidence: [],
    missing_inputs: [], history: [], checkpoint: { attempt: 0, inputDigest: null, updatedAt: null, next: 'Validate stage inputs' } }));
  for (let i = 0; i < 3; i++) stages[i].status = 'PASSED';
  const stage4 = stages[3];
  stage4.status = 'BLOCKED'; stage4.checkpoint = { attempt, inputDigest: 'e'.repeat(64), updatedAt: journal.updatedAt,
    next: 'Review checkpoint', stage4Transaction: { kind: journal.kind, runId, attempt, candidateDigest,
      journalPath: paths.journalPath } };
  stage4.artifacts = [{ kind: 'STAGE4_HOST_VALIDATION.json', path: hostValidationPath,
    sourcePath: hostValidationPath, sha256: hostSha, sourceSha256: hostSha }];
  stage4.history = [{ from: 'IN_PROGRESS', to: 'PASSED', at: journal.updatedAt,
    evidence: ['Stage 4 Host validation passed'], artifacts: [], skillSha256: null, next: 'Advance next stage' },
  { from: 'NOT_STARTED', to: 'BLOCKED', at: journal.updatedAt,
    evidence: ['STAGE4_RECOVERY_REQUIRED'], artifacts: [], skillSha256: null, next: 'Review checkpoint' }];
  const stage5 = stages[4]; stage5.status = 'IN_PROGRESS'; stage5.checkpoint = {
    attempt: 1, inputDigest: 'f'.repeat(64), updatedAt: journal.updatedAt, next: 'Review checkpoint' };
  stage5.history = [{ from: 'READY', to: 'IN_PROGRESS', at: journal.updatedAt,
    evidence: [], artifacts: [], skillSha256: null, next: 'Review checkpoint' }];
  stages[7].status = 'SKIPPED';
  const manifest = { schemaVersion: 1, runId, workspace, sequence: 12,
    inputs: { projectPath, rawKeywordsFile }, inputCopies: {}, deploymentExecuted: false, stages };
  const manifestPath = join(runDirectory, 'manifest.json');
  await writeFile(manifestPath, JSON.stringify(manifest));
  return { workspace, runId, runDirectory, projectPath, paths, manifestPath, auditPaths };
}

test('preview and confirmation reconcile a finalized Stage 4 with interrupted Stage 5', async t => {
  const f = await fixture(t);
  const preview = await previewFinalizedStage4Reconciliation(f);
  assert.equal(preview.status, 'PREVIEW');
  const applied = await applyFinalizedStage4Reconciliation({ ...f, previewId: preview.previewId,
    confirmationCode: preview.confirmationCode });
  assert.equal(applied.status, 'APPLIED'); assert.equal(applied.idempotent, false);
  const manifest = JSON.parse(await readFile(f.manifestPath, 'utf8'));
  assert.equal(manifest.stages[3].status, 'PASSED');
  assert.equal(manifest.stages[4].status, 'BLOCKED');
  assert.deepEqual(manifest.stages.slice(5, 7).map(stage => stage.status), ['NOT_STARTED', 'NOT_STARTED']);
  assert.equal(manifest.deploymentExecuted, false);
  const recovered = await recoverStage4SiteTransaction({ targetPath: f.projectPath, runId: f.runId,
    attempt: 7, manifestStage: manifest.stages[3] });
  assert.equal(recovered.status, 'FINALIZED');
  const repeated = await applyFinalizedStage4Reconciliation({ ...f, previewId: preview.previewId,
    confirmationCode: preview.confirmationCode });
  assert.equal(repeated.idempotent, true);
});

test('confirmation rejects a stale preview after Stage 4 source changes', async t => {
  const f = await fixture(t);
  const preview = await previewFinalizedStage4Reconciliation(f);
  await writeFile(join(f.projectPath, 'src/index.js'), 'tampered\n');
  await assert.rejects(applyFinalizedStage4Reconciliation({ ...f, previewId: preview.previewId,
    confirmationCode: preview.confirmationCode }), /RECONCILIATION|Stage 4 source/);
  assert.equal(JSON.parse(await readFile(f.manifestPath, 'utf8')).stages[4].status, 'IN_PROGRESS');
});

test('preview fails closed when Stage 5 site evidence is not hash-bound', async t => {
  const f = await fixture(t);
  await writeFile(f.auditPaths[1], 'tampered screenshot\n');
  await assert.rejects(previewFinalizedStage4Reconciliation(f), /MANUAL_RECONCILIATION_REQUIRED/);
});

for (const crashPoint of ['after-journal', 'after-manifest']) {
  test(`confirmation resumes safely after ${crashPoint}`, async t => {
    const f = await fixture(t);
    const preview = await previewFinalizedStage4Reconciliation(f);
    await assert.rejects(applyFinalizedStage4Reconciliation({ ...f, previewId: preview.previewId,
      confirmationCode: preview.confirmationCode,
      fault: point => { if (point === crashPoint) throw Error('SYNTHETIC_CRASH'); } }), /SYNTHETIC_CRASH/);
    const applied = await applyFinalizedStage4Reconciliation({ ...f, previewId: preview.previewId,
      confirmationCode: preview.confirmationCode });
    assert.equal(applied.status, 'APPLIED');
    const manifest = JSON.parse(await readFile(f.manifestPath, 'utf8'));
    assert.equal(manifest.stages[3].status, 'PASSED');
    assert.equal(manifest.stages[4].status, 'BLOCKED');
  });
}
