import { createHash, randomUUID } from 'node:crypto';
import { lstat, mkdir, open, readFile, rename, unlink } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { canonicalJson, parseStrictJson } from './contracts/canonical-json.mjs';
import { ContractError } from './contracts/errors.mjs';
import { acquireRunLock } from './run-lock.mjs';
import {
  createAuthorizationConsumption,
  createAuthorizationReservation,
  verifyAuthorizationConsumption,
  verifyAuthorizationReservation,
  verifySiteReacceptanceAuthorization,
} from './site-acceptance-contract.mjs';
import {
  createSiteRemediationIntent,
  createSiteRemediationPreview,
  createSiteRemediationReceipt,
  SITE_REMEDIATION_INVALIDATED_STAGES,
  SITE_REMEDIATION_PRESERVED_STAGES,
  verifySiteRemediationIntent,
  verifySiteRemediationPreview,
  verifySiteRemediationReceipt,
} from './site-remediation-records.mjs';
import {
  classifySiteRemediation,
  pendingSiteRemediationTransaction,
  persistSiteRemediationBytes,
  persistSiteRemediationRecord,
  siteRemediationPaths,
} from './site-remediation-journal.mjs';
import { syncDirectory } from './state/atomic-file.mjs';
import { ALL_STAGES, STAGE } from './stages.mjs';

export const OFFLINE_SITE_REMEDIATION_CAPABILITY = Object.freeze({
  kind: 'OFFLINE_SITE_REMEDIATION_CAPABILITY',
});

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const fail = (code, message) => new ContractError(code, message);
const clone = value => structuredClone(value);

function validateManifestForRemediation(manifest, { runId, expectedResearchApprovalDigest,
  expectedOldProjectDigest }) {
  if (manifest?.schemaVersion !== 1 || manifest.runId !== runId ||
      !Number.isSafeInteger(manifest.sequence) || manifest.sequence < 0 ||
      manifest.deploymentExecuted !== false || !Array.isArray(manifest.stages) ||
      manifest.stages.length !== ALL_STAGES.length ||
      manifest.stages.some((stage, index) => stage.skill !== ALL_STAGES[index])) {
    throw fail('SITE_REMEDIATION_MANIFEST_INVALID',
      'Run manifest is not eligible for site remediation');
  }
  const [homepage, research, template, integration] = manifest.stages;
  if (homepage.status !== 'PASSED' ||
      !(research.status === 'PARTIAL' && research.checkpoint?.researchHandoff?.approved === true) ||
      !['PASSED', 'SKIPPED'].includes(template.status) || integration.status !== 'PASSED') {
    throw fail('SITE_REMEDIATION_UPSTREAM_INVALID',
      'Stage 1-4 are not in the approved remediation baseline state');
  }
  if (research.checkpoint.researchHandoff.approvalSha256 !== expectedResearchApprovalDigest) {
    throw fail('SITE_REMEDIATION_RESEARCH_APPROVAL_CHANGED',
      'Stage 2 research approval changed since Host assessment');
  }
  const recordedProject = manifest.stages[4]?.checkpoint?.projectDigest;
  if (recordedProject && recordedProject !== expectedOldProjectDigest) {
    throw fail('SITE_REMEDIATION_PROJECT_BASELINE_CHANGED',
      'Accepted Stage 5 project baseline changed since Host assessment');
  }
  return manifest;
}

function bindAuthorization(authorization, preview, previewSnapshotSha256) {
  verifySiteReacceptanceAuthorization(authorization);
  const expected = {
    runId: preview.runId,
    previewId: preview.previewId,
    previewSnapshotSha256,
    manifestSequence: preview.manifestSequence,
    manifestSha256: preview.manifestSha256,
    mode: preview.mode,
    lineageDigest: preview.lineageDigest,
    oldProjectDigest: preview.oldProjectDigest,
    newProjectDigest: preview.newProjectDigest,
    baselineDigest: preview.baselineDigest,
    remediationScopeDigest: preview.remediationScopeDigest,
    publicationEvidenceDigest: preview.publicationEvidenceDigest,
    attestationDigest: preview.attestationDigest,
    acceptanceRevision: preview.acceptanceRevision,
    operatorSummarySha256: preview.operatorSummarySha256,
    transactionId: preview.transactionId,
  };
  for (const [field, value] of Object.entries(expected)) {
    if (authorization[field] !== value) {
      throw fail('SITE_REMEDIATION_AUTHORIZATION_MISMATCH',
        `Authorization does not bind the preview field: ${field}`);
    }
  }
  return authorization;
}

function resetDownstream(manifest, preview, acceptedAtMs) {
  const post = clone(manifest);
  const at = new Date(acceptedAtMs).toISOString();
  for (const name of SITE_REMEDIATION_INVALIDATED_STAGES) {
    const stage = post.stages.find(item => item.skill === name);
    stage.history.push({
      from: stage.status,
      to: 'NOT_STARTED',
      at,
      evidence: [`Invalidated by approved site remediation ${preview.transactionId}.`],
      artifacts: stage.artifacts.map(artifact => ({ path: artifact.path, sha256: artifact.sha256 })),
      skillSha256: post.lock?.skills?.find(item => item.name === name)?.sha256 ?? null,
      next: 'Re-run against the accepted current site baseline',
    });
    stage.status = 'NOT_STARTED';
    stage.artifacts = [];
    stage.evidence = [`Invalidated by approved site remediation ${preview.transactionId}.`];
    stage.missing_inputs = [];
    stage.checkpoint = {
      attempt: stage.checkpoint.attempt,
      inputDigest: null,
      updatedAt: at,
      next: 'Re-run against the accepted current site baseline',
    };
    delete stage.diagnostic;
  }
  delete post.inputs.deploymentPlanApproval;
  delete post.inputs.launchReadinessClearance;
  post.sequence = manifest.sequence + 1;
  post.deploymentExecuted = false;
  post.siteAcceptance = {
    policyVersion: 'site-remediation-transaction-v1',
    transactionId: preview.transactionId,
    previewDigest: preview.previewDigest,
    acceptanceRevision: preview.acceptanceRevision,
    baselineDigest: preview.baselineDigest,
    projectDigest: preview.newProjectDigest,
    protectedInputsDigest: preview.protectedInputsDigest,
    acceptedAtMs,
  };
  return post;
}

async function atomicManifestCommit(manifestPath, bytes, fault) {
  const directory = dirname(manifestPath);
  const temporary = join(directory, `.site-remediation-${randomUUID()}.tmp`);
  let handle;
  try {
    handle = await open(temporary, 'wx', 0o600);
    await handle.writeFile(bytes);
    await handle.sync();
    await handle.close(); handle = null;
    await fault('beforeManifestCommit');
    await rename(temporary, manifestPath);
    await syncDirectory(directory);
  } finally {
    if (handle) await handle.close();
    await unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error; });
  }
}

async function readRecord(path) {
  return parseStrictJson(await readFile(path), path);
}

async function assertStorageBoundary(root, ...paths) {
  try {
    const resolvedRoot = resolve(root);
    const rootInfo = await lstat(resolvedRoot);
    if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink()) throw Error('Unsafe storage root');
    for (const path of paths) {
      const rel = relative(resolvedRoot, resolve(path));
      if (rel === '..' || rel.startsWith('../')) throw Error('Storage path escapes its run root');
      let current = resolvedRoot;
      for (const segment of rel.split('/').filter(Boolean)) {
        current = join(current, segment);
        try {
          const info = await lstat(current);
          if (info.isSymbolicLink() || (info.isFile() && info.nlink !== 1)) {
            throw Error('Linked path is not allowed');
          }
        } catch (error) { if (error.code !== 'ENOENT') throw error; }
      }
    }
  } catch (error) {
    throw fail('SITE_REMEDIATION_STORAGE_UNSAFE', error.message);
  }
}

export async function verifyCommittedSiteRemediation({ runDirectory, manifest }) {
  const marker = manifest?.siteAcceptance;
  if (!marker) return null;
  if (marker.policyVersion !== 'site-remediation-transaction-v1' ||
      typeof marker.transactionId !== 'string') {
    throw fail('SITE_REMEDIATION_COMMIT_INVALID', 'Invalid site acceptance marker');
  }
  const previewId = marker.transactionId.replace(/^site-remediation-/, '');
  const paths = siteRemediationPaths(runDirectory, {
    previewId, transactionId: marker.transactionId,
  });
  await assertStorageBoundary(runDirectory, paths.root, paths.previewPath,
    paths.transactionDirectory, paths.authorizationPath, paths.intentPath,
    paths.reservationPath, paths.consumptionPath, paths.receiptPath, paths.postManifestPath);
  const [record, authorization, intent, reservation, consumption, receipt, postBytes] =
    await Promise.all([
      readRecord(paths.previewPath), readRecord(paths.authorizationPath),
      readRecord(paths.intentPath), readRecord(paths.reservationPath),
      readRecord(paths.consumptionPath), readRecord(paths.receiptPath),
      readFile(paths.postManifestPath),
    ]);
  verifySiteRemediationPreview(record);
  bindAuthorization(authorization, record, sha256(await readFile(paths.previewPath)));
  verifySiteRemediationIntent(intent);
  verifyAuthorizationReservation(reservation, { authorization });
  verifyAuthorizationConsumption(consumption, { authorization, reservation,
    expectedPostState: {
      postManifestSha256: intent.postManifestSha256,
      committedSequence: intent.committedSequence,
      acceptanceRevision: intent.acceptanceRevision,
      committedObjectDigests: intent.committedObjectDigests,
    } });
  verifySiteRemediationReceipt(receipt);
  const post = parseStrictJson(postBytes, paths.postManifestPath);
  if (sha256(postBytes) !== intent.postManifestSha256 ||
      canonicalJson(manifest.stages.slice(0, 4)) !== canonicalJson(post.stages.slice(0, 4)) ||
      canonicalJson(marker) !== canonicalJson(post.siteAcceptance) ||
      marker.acceptanceRevision !== receipt.acceptanceRevision ||
      marker.previewDigest !== record.previewDigest ||
      marker.transactionId !== receipt.transactionId ||
      manifest.inputs?.siteRevision !== post.inputs?.siteRevision) {
    throw fail('SITE_REMEDIATION_COMMIT_INVALID',
      'Current manifest does not preserve the committed site remediation identity');
  }
  return Object.freeze({ preview: record, intent, receipt, postManifest: post });
}

export function createSiteRemediationController({ workspace, runId, capability,
  now = Date.now, uuid = randomUUID, fault = async () => {} } = {}) {
  if (typeof workspace !== 'string' || resolve(workspace) !== workspace ||
      !/^[A-Za-z0-9_-]{1,100}$/.test(runId ?? '')) {
    throw fail('SITE_REMEDIATION_CONFIGURATION_INVALID',
      'Absolute workspace and safe runId are required');
  }
  const trustedHost = capability === OFFLINE_SITE_REMEDIATION_CAPABILITY;
  const runDirectory = join(workspace, 'runs', runId);
  const manifestPath = join(runDirectory, 'manifest.json');
  const lockPath = join(runDirectory, '.lock');

  function requireHost() {
    if (!trustedHost) throw fail('SITE_REMEDIATION_HOST_PROVIDER_REQUIRED',
      'PR-C trusted Host evidence provider is required');
  }

  async function preview(input) {
    requireHost();
    await assertStorageBoundary(workspace, runDirectory, manifestPath);
    const manifestBytes = await readFile(manifestPath);
    const manifest = parseStrictJson(manifestBytes, manifestPath);
    validateManifestForRemediation(manifest, { runId,
      expectedResearchApprovalDigest: input.researchApprovalDigest,
      expectedOldProjectDigest: input.oldProjectDigest });
    const previewId = uuid();
    const transactionId = `site-remediation-${previewId}`;
    const record = createSiteRemediationPreview({
      ...clone(input), runId, transactionId, previewId,
      manifestSequence: manifest.sequence, manifestSha256: sha256(manifestBytes),
      createdAtMs: now(),
    });
    const paths = siteRemediationPaths(runDirectory, { previewId, transactionId });
    await assertStorageBoundary(runDirectory, paths.root, paths.previewPath,
      paths.transactionDirectory);
    await persistSiteRemediationRecord(paths.previewPath, record);
    const previewSnapshotSha256 = sha256(await readFile(paths.previewPath));
    const confirmationCode = sha256(`${record.previewDigest}:${runId}`).slice(0, 16);
    return Object.freeze({ status: 'PREVIEW', preview: record, previewSnapshotSha256,
      confirmationCode, previewPath: paths.previewPath });
  }

  async function finishTransaction({ phase, preview: record, intent, reservation,
    consumption, receipt, paths }) {
    let currentPhase = phase;
    let currentReservation = reservation;
    let currentConsumption = consumption;
    if (['RECOVERY_REQUIRED', 'ABORTED', 'NO_INTENT'].includes(currentPhase)) {
      throw fail('SITE_REMEDIATION_RECOVERY_REQUIRED',
        `Site remediation cannot continue from ${currentPhase}`);
    }
    const authorization = await readRecord(paths.authorizationPath);
    bindAuthorization(authorization, record, sha256(await readFile(paths.previewPath)));
    verifySiteRemediationIntent(intent);
    if (currentPhase === 'COMMITTED') {
      verifyAuthorizationReservation(currentReservation, { authorization });
      verifyAuthorizationConsumption(currentConsumption, { authorization,
        reservation: currentReservation, expectedPostState: {
          postManifestSha256: intent.postManifestSha256,
          committedSequence: intent.committedSequence,
          acceptanceRevision: intent.acceptanceRevision,
          committedObjectDigests: intent.committedObjectDigests,
        } });
      verifySiteRemediationReceipt(receipt);
      const bindings = {
        previewDigest: record.previewDigest,
        intentDigest: intent.intentDigest,
        reservationDigest: currentReservation.reservationDigest,
        consumptionDigest: currentConsumption.consumptionDigest,
        preManifestSha256: intent.expectedManifestSha256,
        postManifestSha256: intent.postManifestSha256,
        committedSequence: intent.committedSequence,
        acceptanceRevision: intent.acceptanceRevision,
      };
      if (Object.entries(bindings).some(([field, value]) => receipt[field] !== value)) {
        throw fail('SITE_REMEDIATION_RECOVERY_REQUIRED',
          'Committed receipt does not match its transaction records');
      }
      return Object.freeze({ status: 'COMMITTED', receipt });
    }
    if (currentPhase === 'INTENT_ONLY') {
      currentReservation = createAuthorizationReservation({ authorization,
        confirmationIdentity: `preview-snapshot:${record.previewId}:${record.previewDigest}`,
        intentDigest: intent.intentDigest, reservedAtMs: now() });
      await persistSiteRemediationRecord(paths.reservationPath, currentReservation);
      await fault('afterReservation');
      currentPhase = 'RESERVED_PRE_COMMIT';
    } else verifyAuthorizationReservation(currentReservation, { authorization });
    if (currentPhase === 'RESERVED_PRE_COMMIT') {
      const postBytes = await readFile(paths.postManifestPath);
      if (sha256(postBytes) !== intent.postManifestSha256) {
        throw fail('SITE_REMEDIATION_RECOVERY_REQUIRED', 'Stored post-manifest digest changed');
      }
      await atomicManifestCommit(manifestPath, postBytes, fault);
      await fault('afterManifestCommit');
      currentPhase = 'RESERVED_POST_COMMIT';
    }
    if (currentPhase === 'RESERVED_POST_COMMIT') {
      currentConsumption = createAuthorizationConsumption({ authorization,
        reservation: currentReservation, preManifestSha256: intent.expectedManifestSha256,
        postManifestSha256: intent.postManifestSha256,
        committedSequence: intent.committedSequence,
        acceptanceRevision: intent.acceptanceRevision,
        committedObjectDigests: intent.committedObjectDigests, consumedAtMs: now() });
      await persistSiteRemediationRecord(paths.consumptionPath, currentConsumption);
      await fault('afterConsumption');
      currentPhase = 'CONSUMED_NO_RECEIPT';
    }
    if (currentPhase === 'CONSUMED_NO_RECEIPT') {
      verifyAuthorizationConsumption(currentConsumption, { authorization,
        reservation: currentReservation, expectedPostState: {
          postManifestSha256: intent.postManifestSha256,
          committedSequence: intent.committedSequence,
          acceptanceRevision: intent.acceptanceRevision,
          committedObjectDigests: intent.committedObjectDigests,
        } });
      receipt = createSiteRemediationReceipt({ runId, transactionId: record.transactionId,
        previewId: record.previewId, previewDigest: record.previewDigest,
        intentDigest: intent.intentDigest, reservationDigest: currentReservation.reservationDigest,
        consumptionDigest: currentConsumption.consumptionDigest,
        preManifestSha256: intent.expectedManifestSha256,
        postManifestSha256: intent.postManifestSha256,
        committedSequence: intent.committedSequence,
        acceptanceRevision: intent.acceptanceRevision,
        preservedStages: SITE_REMEDIATION_PRESERVED_STAGES,
        invalidatedStages: SITE_REMEDIATION_INVALIDATED_STAGES,
        deploymentExecuted: false, committedAtMs: now() });
      await persistSiteRemediationRecord(paths.receiptPath, receipt);
      await fault('afterReceipt');
    }
    return Object.freeze({ status: 'COMMITTED', receipt });
  }

  async function recoverLocked(transactionId) {
    const manifestSha256 = sha256(await readFile(manifestPath));
    const classified = await classifySiteRemediation({ runDirectory, transactionId,
      manifestSha256 });
    return finishTransaction(classified);
  }

  async function confirm({ previewId, confirmationCode, authorization }) {
    requireHost();
    const transactionId = `site-remediation-${previewId}`;
    const paths = siteRemediationPaths(runDirectory, { previewId, transactionId });
    await assertStorageBoundary(runDirectory, paths.root, paths.previewPath,
      paths.transactionDirectory, paths.authorizationPath, paths.intentPath,
      paths.reservationPath, paths.consumptionPath, paths.receiptPath, paths.postManifestPath);
    const record = verifySiteRemediationPreview(await readRecord(paths.previewPath));
    const expectedCode = sha256(`${record.previewDigest}:${runId}`).slice(0, 16);
    if (confirmationCode !== expectedCode) {
      throw fail('SITE_REMEDIATION_CONFIRMATION_MISMATCH',
        'Confirmation code does not match the immutable preview');
    }
    const previewSnapshotSha256 = sha256(await readFile(paths.previewPath));
    bindAuthorization(authorization, record, previewSnapshotSha256);
    const lock = await acquireRunLock({ lockPath, runId });
    try {
      const existing = await classifySiteRemediation({ runDirectory, transactionId,
        manifestSha256: sha256(await readFile(manifestPath)) });
      if (existing.phase !== 'NO_INTENT') return finishTransaction(existing);
      const preBytes = await readFile(manifestPath);
      if (sha256(preBytes) !== record.manifestSha256) {
        throw fail('SITE_REMEDIATION_PREVIEW_STALE', 'Manifest changed after preview');
      }
      const manifest = parseStrictJson(preBytes, manifestPath);
      validateManifestForRemediation(manifest, { runId,
        expectedResearchApprovalDigest: record.researchApprovalDigest,
        expectedOldProjectDigest: record.oldProjectDigest });
      const acceptedAtMs = now();
      const post = resetDownstream(manifest, record, acceptedAtMs);
      const postBytes = Buffer.from(`${JSON.stringify(post, null, 2)}\n`);
      const postManifestSha256 = sha256(postBytes);
      await persistSiteRemediationRecord(paths.authorizationPath, authorization);
      await persistSiteRemediationBytes(paths.postManifestPath, postBytes);
      const intent = createSiteRemediationIntent({ runId, transactionId,
        previewId, previewDigest: record.previewDigest,
        authorizationDigest: authorization.authorizationDigest,
        expectedManifestSequence: record.manifestSequence,
        expectedManifestSha256: record.manifestSha256, postManifestSha256,
        committedSequence: post.sequence, acceptanceRevision: record.acceptanceRevision,
        committedObjectDigests: [record.baselineDigest, record.publicationEvidenceDigest,
          record.attestationDigest, postManifestSha256], createdAtMs: acceptedAtMs });
      await persistSiteRemediationRecord(paths.intentPath, intent);
      await fault('afterIntent');
      return finishTransaction({ phase: 'INTENT_ONLY', preview: record, intent, paths });
    } finally { await lock.release(); }
  }

  async function recover({ transactionId }) {
    requireHost();
    await assertStorageBoundary(workspace, runDirectory, manifestPath,
      join(runDirectory, 'site-remediation'));
    const lock = await acquireRunLock({ lockPath, runId });
    try {
      const manifestSha256 = sha256(await readFile(manifestPath));
      const classified = transactionId ? await classifySiteRemediation({ runDirectory,
        transactionId, manifestSha256 }) : await pendingSiteRemediationTransaction({
        runDirectory, manifestSha256 });
      if (classified.phase === 'RECOVERY_REQUIRED') {
        throw fail('SITE_REMEDIATION_RECOVERY_REQUIRED',
          'Manifest does not match the transaction pre-state or post-state');
      }
      return finishTransaction(classified);
    } finally { await lock.release(); }
  }

  return Object.freeze({ manifestPath, preview, confirm, recover });
}
