import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { createCurrentSiteBaseline, createSiteAcceptanceIdentity,
  createSiteReacceptanceAuthorization } from '../src/site-acceptance-contract.mjs';
import { createDerivedPublicationAttestation,
  createPublicationEvidenceBody } from '../src/effective-publication-attestation.mjs';
import {
  createSiteRemediationController,
  OFFLINE_SITE_REMEDIATION_CAPABILITY,
  verifyCommittedSiteRemediation,
} from '../src/site-remediation-transaction.mjs';
import { ALL_STAGES, STAGE } from '../src/stages.mjs';

const d = character => character.repeat(64);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const stage = (skill, status, attempt) => ({
  skill, status,
  artifacts: status === 'PASSED' ? [{ path: `/artifact/${skill}`, sha256: d('1') }] : [],
  evidence: [`evidence-${skill}`], missing_inputs: [], history: [],
  checkpoint: { attempt, inputDigest: d('2'), updatedAt: '2026-10-26T00:00:00.000Z',
    next: 'Advance next stage' },
});

async function fixture(t) {
  const workspace = await mkdtemp(join(tmpdir(), 'site-remediation-transaction-'));
  t.after(() => rm(workspace, { recursive: true, force: true }));
  const runId = 'wallpaper-engine-002';
  const runDirectory = join(workspace, 'runs', runId);
  await mkdir(runDirectory, { recursive: true });
  const statuses = ['PASSED', 'PARTIAL', 'PASSED', 'PASSED', 'PASSED', 'PASSED',
    'WAITING_FOR_USER', 'SKIPPED'];
  const stages = ALL_STAGES.map((skill, index) => stage(skill, statuses[index], index + 1));
  stages[1].checkpoint.researchHandoff = {
    kind: 'RESEARCH_HANDOFF_V2', approved: true, approvalSha256: d('3'),
  };
  stages[4].checkpoint.projectDigest = d('4');
  stages[6].checkpoint.planDigest = d('5');
  const manifest = {
    schemaVersion: 1, runId, workspace, inventoryPath: '/inventory.json', templateRoots: [],
    createdAt: '2026-10-26T00:00:00.000Z', sequence: 219,
    inputs: { siteRevision: 'site-v1', researchHandoffApproval: { approved: true },
      deploymentPlanApproval: { approved: true }, launchReadinessClearance: { approved: true } },
    inputCopies: {}, lock: { skills: [] }, lockError: null, deploymentExecuted: false, stages,
  };
  const manifestPath = join(runDirectory, 'manifest.json');
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  const evidenceDirectory = join(workspace, 'synthetic-host-evidence');
  await mkdir(evidenceDirectory);
  const evidencePaths = {
    project: join(evidenceDirectory, 'project.bin'),
    protectedInputs: join(evidenceDirectory, 'protected-inputs.bin'),
    stage4: join(evidenceDirectory, 'stage4-evidence.bin'),
    publication: join(evidenceDirectory, 'publication-evidence.bin'),
  };
  await Promise.all([
    writeFile(evidencePaths.project, 'project-v2'),
    writeFile(evidencePaths.protectedInputs, 'protected-inputs-v1'),
    writeFile(evidencePaths.stage4, 'stage4-evidence-v1'),
    writeFile(evidencePaths.publication, 'publication-evidence-v1'),
  ]);
  const liveDigest = path => readFile(path).then(sha256);
  const previewInput = {
    mode: 'LEGACY_CURRENT_BASELINE', lineageDigest: await liveDigest(evidencePaths.stage4),
    researchApprovalDigest: d('3'), oldProjectDigest: d('4'),
    newProjectDigest: await liveDigest(evidencePaths.project), baselineDigest: d('8'),
    remediationScopeDigest: d('9'),
    publicationEvidenceDigest: await liveDigest(evidencePaths.publication),
    attestationDigest: d('b'), acceptanceRevision: d('c'),
    protectedInputsDigest: await liveDigest(evidencePaths.protectedInputs),
    historicalEvidenceGaps: ['FINAL_STAGE4_INVENTORY_UNAVAILABLE'],
    operatorSummarySha256: d('e'),
  };
  const evidenceProvider = async () => ({
    lineageDigest: await liveDigest(evidencePaths.stage4),
    researchApprovalDigest: d('3'), oldProjectDigest: d('4'),
    newProjectDigest: await liveDigest(evidencePaths.project), baselineDigest: d('8'),
    remediationScopeDigest: d('9'),
    publicationEvidenceDigest: await liveDigest(evidencePaths.publication),
    attestationDigest: d('b'), acceptanceRevision: d('c'),
    protectedInputsDigest: await liveDigest(evidencePaths.protectedInputs),
    operatorSummarySha256: d('e'),
  });
  const createController = extra => createSiteRemediationController({ workspace, runId,
    capability: OFFLINE_SITE_REMEDIATION_CAPABILITY, evidenceProvider, now: () => 1,
    uuid: () => '11111111-1111-4111-8111-111111111111', ...extra });
  return { workspace, runId, runDirectory, manifestPath, manifest,
    controller: createController({}), createController, evidencePaths, previewInput };
}

function authorization(result) {
  const p = result.preview;
  return createSiteReacceptanceAuthorization({
    runId: p.runId, previewId: p.previewId,
    previewSnapshotSha256: result.previewSnapshotSha256,
    manifestSequence: p.manifestSequence, manifestSha256: p.manifestSha256,
    mode: p.mode, lineageDigest: p.lineageDigest, oldProjectDigest: p.oldProjectDigest,
    newProjectDigest: p.newProjectDigest, baselineDigest: p.baselineDigest,
    remediationScopeDigest: p.remediationScopeDigest,
    publicationEvidenceDigest: p.publicationEvidenceDigest,
    attestationDigest: p.attestationDigest, acceptanceRevision: p.acceptanceRevision,
    operatorSummarySha256: p.operatorSummarySha256, transactionId: p.transactionId,
  });
}

test('production controller is blocked until PR-C supplies trusted Host evidence', async t => {
  const f = await fixture(t);
  const production = createSiteRemediationController({ workspace: f.workspace, runId: f.runId });
  await assert.rejects(() => production.preview(f.previewInput),
    error => error.code === 'SITE_REMEDIATION_HOST_PROVIDER_REQUIRED');
});

test('offline capability cannot attest a production workspace', async () => {
  const controller = createSiteRemediationController({
    workspace: join(process.cwd(), 'synthetic-production-workspace'), runId: 'real-run',
    capability: OFFLINE_SITE_REMEDIATION_CAPABILITY, evidenceProvider: async () => ({}),
  });
  await assert.rejects(() => controller.preview({}),
    error => error.code === 'SITE_REMEDIATION_OFFLINE_SCOPE_INVALID');
});

test('preview rejects a linked manifest before reading Host-bound state', async t => {
  const f = await fixture(t);
  const outside = join(f.workspace, 'outside-manifest.json');
  await writeFile(outside, await readFile(f.manifestPath));
  await rm(f.manifestPath);
  await symlink(outside, f.manifestPath);
  await assert.rejects(() => f.controller.preview(f.previewInput),
    error => error.code === 'SITE_REMEDIATION_STORAGE_UNSAFE');
});

test('preview rejects caller publication evidence not observed by the Host provider', async t => {
  const f = await fixture(t);
  await assert.rejects(() => f.controller.preview({ ...f.previewInput,
    publicationEvidenceDigest: d('f') }),
  error => error.code === 'SITE_REMEDIATION_EVIDENCE_STALE');
});

test('transaction persists and rereads the complete immutable acceptance graph', async t => {
  const f = await fixture(t);
  const projectDigest = f.previewInput.newProjectDigest;
  const baseline = createCurrentSiteBaseline({ baselineKind: 'REACCEPTED_CURRENT_BASELINE',
    historicalEquivalence: false, digestPolicyVersion: 'project-content-v1',
    projectPath: '/synthetic/project', files: [{ path: 'app/page.tsx', mode: 0o644,
      byteLength: 1, sha256: d('0') }], projectDigest, routes: ['/'],
    protectedInputs: [{ path: 'backgroundinformation/keywords.md', mode: 0o644,
      byteLength: 1, sha256: d('1') }], historicalEvidenceGaps: [] });
  const publicationEvidence = createPublicationEvidenceBody({
    originalPublicationManifestSha256: d('1'),
    lineageDigest: f.previewInput.lineageDigest, researchHandoffSha256: d('2'),
    researchApprovalDigest: f.previewInput.researchApprovalDigest,
    originalLaunchReadinessBindingDigest: d('3'), baselineKind: baseline.baselineKind,
    baselineDigest: baseline.baselineDigest,
    remediationScopeDigest: f.previewInput.remediationScopeDigest, projectDigest,
    observedRoutes: ['/'], pages: [{ route: '/', originalDisposition: 'PUBLISH',
      effectiveDisposition: 'PUBLISH', materialStatus: 'COMPLETED', robots: 'noindex',
      inSitemap: true, inNavigation: true, linkedFromPublicPages: true,
      sourceFileExposed: false, dynamicProof: 'STATIC' }], validationStatus: 'VERIFIED',
    indexingAuthorization: 'NOT_CLEARED', hostObservationDigest: d('4'),
    validatorVersion: 'host-route-v1' });
  const transactionId = 'site-remediation-11111111-1111-4111-8111-111111111111';
  const acceptanceIdentity = createSiteAcceptanceIdentity({
    lineageDigest: f.previewInput.lineageDigest, baselineDigest: baseline.baselineDigest,
    projectDigest, publicationEvidenceDigest: publicationEvidence.publicationEvidenceDigest,
    remediationScopeDigest: f.previewInput.remediationScopeDigest, transactionId });
  const attestation = createDerivedPublicationAttestation({ evidenceBody: publicationEvidence,
    acceptanceIdentity });
  const previewInput = { ...f.previewInput, baselineDigest: baseline.baselineDigest,
    publicationEvidenceDigest: publicationEvidence.publicationEvidenceDigest,
    attestationDigest: attestation.attestationDigest,
    acceptanceRevision: acceptanceIdentity.acceptanceRevision,
    protectedInputsDigest: baseline.protectedInputsDigest };
  const evidenceProvider = async () => ({ ...previewInput,
    immutableObjects: { baseline, publicationEvidence, attestation } });
  const controller = f.createController({ evidenceProvider });
  const result = await controller.preview(previewInput);
  await controller.confirm({ previewId: result.preview.previewId,
    confirmationCode: result.confirmationCode, authorization: authorization(result) });
  const updated = JSON.parse(await readFile(f.manifestPath));
  const committed = await verifyCommittedSiteRemediation({ runDirectory: f.runDirectory,
    manifest: updated });
  assert.equal(committed.immutableObjects.baseline.baselineDigest, baseline.baselineDigest);
  assert.equal(committed.immutableObjects.publicationEvidence.publicationEvidenceDigest,
    publicationEvidence.publicationEvidenceDigest);
  assert.equal(committed.immutableObjects.attestation.attestationDigest,
    attestation.attestationDigest);
});

test('confirmation atomically preserves Stage 1-4 and invalidates only Stage 5-7', async t => {
  const f = await fixture(t);
  const result = await f.controller.preview(f.previewInput);
  await assert.rejects(() => f.controller.confirm({ previewId: result.preview.previewId,
    confirmationCode: 'wrong-code', authorization: authorization(result) }),
  error => error.code === 'SITE_REMEDIATION_CONFIRMATION_MISMATCH');
  const beforeInvalid = await readdir(join(f.runDirectory, 'site-remediation', 'transactions'))
    .catch(error => error.code === 'ENOENT' ? [] : Promise.reject(error));
  assert.deepEqual(beforeInvalid, []);

  const committed = await f.controller.confirm({ previewId: result.preview.previewId,
    confirmationCode: result.confirmationCode, authorization: authorization(result) });
  assert.equal(committed.status, 'COMMITTED');
  const updated = JSON.parse(await readFile(f.manifestPath));
  assert.equal(updated.sequence, 220);
  assert.deepEqual(updated.stages.slice(0, 4), f.manifest.stages.slice(0, 4));
  assert.equal(updated.stages[1].status, 'PARTIAL');
  for (const index of [4, 5, 6]) {
    assert.equal(updated.stages[index].status, 'NOT_STARTED');
    assert.deepEqual(updated.stages[index].artifacts, []);
  }
  assert.deepEqual(updated.stages[7], f.manifest.stages[7]);
  assert.equal(updated.deploymentExecuted, false);
  assert.equal(updated.inputs.siteRevision, 'site-v1');
  assert.equal(Object.hasOwn(updated.inputs, 'deploymentPlanApproval'), false);
  assert.equal(Object.hasOwn(updated.inputs, 'launchReadinessClearance'), false);
  assert.equal(updated.siteAcceptance.acceptanceRevision, d('c'));
  assert.equal((await verifyCommittedSiteRemediation({ runDirectory: f.runDirectory,
    manifest: updated })).receipt.receiptDigest, committed.receipt.receiptDigest);

  const replay = await f.controller.confirm({ previewId: result.preview.previewId,
    confirmationCode: result.confirmationCode, authorization: authorization(result) });
  assert.equal(replay.status, 'COMMITTED');
  assert.equal(JSON.parse(await readFile(f.manifestPath)).sequence, 220);
});

test('committed identity permits later Stage 5 progression but rejects protected-state tampering', async t => {
  const f = await fixture(t);
  const result = await f.controller.preview(f.previewInput);
  await f.controller.confirm({ previewId: result.preview.previewId,
    confirmationCode: result.confirmationCode, authorization: authorization(result) });
  const progressed = JSON.parse(await readFile(f.manifestPath));
  progressed.sequence += 1;
  progressed.inputs.uiApproval = { approved: true };
  progressed.stages[4].status = 'READY';
  progressed.stages[4].evidence = ['Legitimate Stage 5 progression'];
  await verifyCommittedSiteRemediation({ runDirectory: f.runDirectory,
    manifest: progressed });

  const tampered = structuredClone(progressed);
  tampered.deploymentExecuted = true;
  await assert.rejects(() => verifyCommittedSiteRemediation({
    runDirectory: f.runDirectory, manifest: tampered }),
  error => error.code === 'SITE_REMEDIATION_COMMIT_INVALID');
  const markerTampered = structuredClone(progressed);
  markerTampered.siteAcceptance.projectDigest = d('f');
  await assert.rejects(() => verifyCommittedSiteRemediation({
    runDirectory: f.runDirectory, manifest: markerTampered }),
  error => error.code === 'SITE_REMEDIATION_COMMIT_INVALID');
});

test('recovery completes a crash after manifest commit without a second transition', async t => {
  const f = await fixture(t);
  const preview = await f.controller.preview(f.previewInput);
  const crashing = f.createController({ now: () => 2,
    fault: phase => { if (phase === 'afterManifestCommit') throw Error('synthetic crash'); } });
  await assert.rejects(() => crashing.confirm({ previewId: preview.preview.previewId,
    confirmationCode: preview.confirmationCode, authorization: authorization(preview) }),
  /synthetic crash/);
  assert.equal(JSON.parse(await readFile(f.manifestPath)).sequence, 220);
  const recovered = await f.controller.recover({ transactionId: preview.preview.transactionId });
  assert.equal(recovered.status, 'COMMITTED');
  assert.equal(JSON.parse(await readFile(f.manifestPath)).sequence, 220);
  assert.equal(recovered.receipt.postManifestSha256, sha256(await readFile(f.manifestPath)));
});

test('recovery rejects unrelated manifest drift', async t => {
  const f = await fixture(t);
  const preview = await f.controller.preview(f.previewInput);
  const crashing = f.createController({ now: () => 2,
    fault: phase => { if (phase === 'afterIntent') throw Error('synthetic crash'); } });
  await assert.rejects(() => crashing.confirm({ previewId: preview.preview.previewId,
    confirmationCode: preview.confirmationCode, authorization: authorization(preview) }),
  /synthetic crash/);
  const changed = JSON.parse(await readFile(f.manifestPath));
  changed.sequence += 7;
  await writeFile(f.manifestPath, `${JSON.stringify(changed, null, 2)}\n`);
  await assert.rejects(() => f.controller.recover({ transactionId: preview.preview.transactionId }),
    error => error.code === 'SITE_REMEDIATION_RECOVERY_REQUIRED');
});

for (const [label, evidenceKey] of [
  ['changed project', 'project'],
  ['changed protected research', 'protectedInputs'],
  ['changed Stage 4 evidence', 'stage4'],
]) {
  test(`pre-commit recovery rejects ${label}`, async t => {
    const f = await fixture(t);
    const preview = await f.controller.preview(f.previewInput);
    const crashing = f.createController({ now: () => 2,
      fault: phase => { if (phase === 'afterReservation') throw Error('synthetic crash'); } });
    await assert.rejects(() => crashing.confirm({ previewId: preview.preview.previewId,
      confirmationCode: preview.confirmationCode, authorization: authorization(preview) }),
    /synthetic crash/);
    await writeFile(f.evidencePaths[evidenceKey], `${label}-v2`);
    await assert.rejects(() => f.controller.recover({
      transactionId: preview.preview.transactionId }),
    error => error.code === 'SITE_REMEDIATION_EVIDENCE_STALE');
    const transactionDirectory = join(f.runDirectory, 'site-remediation', 'transactions',
      preview.preview.transactionId);
    const abort = JSON.parse(await readFile(join(transactionDirectory, 'abort.json')));
    assert.equal(abort.phase, 'RESERVED_PRE_COMMIT');
    assert.equal(abort.reasonCode, 'SITE_REMEDIATION_EVIDENCE_STALE');
  });
}

test('every durable crash boundary recovers idempotently', async t => {
  for (const phase of ['afterIntent', 'afterReservation', 'beforeManifestCommit',
    'afterManifestCommit', 'afterConsumption', 'afterReceipt']) {
    await t.test(phase, async t => {
      const f = await fixture(t);
      const preview = await f.controller.preview(f.previewInput);
      let crashed = false;
      const crashing = f.createController({ now: () => 2,
        fault: current => {
          if (!crashed && current === phase) { crashed = true; throw Error(`crash:${phase}`); }
        } });
      await assert.rejects(() => crashing.confirm({ previewId: preview.preview.previewId,
        confirmationCode: preview.confirmationCode, authorization: authorization(preview) }),
      new RegExp(`crash:${phase}`));
      const recovered = await f.controller.recover({});
      assert.equal(recovered.status, 'COMMITTED');
      assert.equal(JSON.parse(await readFile(f.manifestPath)).sequence, 220);
      assert.equal((await readdir(f.runDirectory)).some(name =>
        name.startsWith('.site-remediation-') && name.endsWith('.tmp')), false);
      const replay = await f.controller.recover({ transactionId: preview.preview.transactionId });
      assert.equal(replay.receipt.receiptDigest, recovered.receipt.receiptDigest);
    });
  }
});
