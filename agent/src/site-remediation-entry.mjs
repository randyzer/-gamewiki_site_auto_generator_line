import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { parseStrictJson } from './contracts/canonical-json.mjs';
import { ContractError } from './contracts/errors.mjs';
import { readArtifact, sha256 } from './files.mjs';
import { sourceFiles } from './project-baseline.mjs';
import { projectContentDigest } from './project-content-digest.mjs';
import { discoverProjectRoutes } from './route-discovery.mjs';
import {
  canonicalContractDigest,
  createCurrentSiteBaseline,
  createImmutableIntegrationLineage,
  createSiteAcceptanceIdentity,
  createSiteReacceptanceAuthorization,
} from './site-acceptance-contract.mjs';
import {
  createDerivedPublicationAttestation,
  createPublicationEvidenceBody,
} from './effective-publication-attestation.mjs';
import { observeCurrentPublication } from './site-remediation-host.mjs';
import { siteRemediationObjectPath, siteRemediationPaths,
  pendingSiteRemediationTransaction } from './site-remediation-journal.mjs';
import { verifySiteRemediationPreview } from './site-remediation-records.mjs';
import { buildAndServe } from './site-preview-host.mjs';
import { createTrustedSiteRemediationController } from './site-remediation-transaction.mjs';
import { STAGE, findStage } from './stages.mjs';

const fail = (code, message) => new ContractError(code, message);
const historicalEvidenceGaps = Object.freeze(['FINAL_STAGE4_INVENTORY_UNAVAILABLE']);
const operatorSummary = 'Historical equivalence is not proven. This approval reaccepts the complete current site tree as a new trust boundary for Stage 5 through Stage 7 only; it does not approve research promotion, deployment, DNS changes, service resumption, or indexing.';

async function manifestState(workspace, runId) {
  const runDirectory = join(workspace, 'runs', runId);
  const manifestPath = join(runDirectory, 'manifest.json');
  const bytes = await readFile(manifestPath);
  const manifest = parseStrictJson(bytes, manifestPath);
  if (manifest.runId !== runId || manifest.workspace !== workspace ||
      manifest.deploymentExecuted !== false) {
    throw fail('SITE_REMEDIATION_MANIFEST_INVALID',
      'Run manifest identity or deployment state is invalid');
  }
  const projectPath = resolve(manifest.inputs?.projectPath ?? '');
  if (projectPath === resolve('.') || !manifest.inputs?.siteRevision) {
    throw fail('SITE_REMEDIATION_MANIFEST_INVALID', 'Project identity is missing');
  }
  return { runDirectory, manifestPath, manifest, bytes, projectPath };
}

async function verifiedArtifactDigests(stage, roots) {
  if (!stage?.artifacts?.length) {
    throw fail('SITE_REMEDIATION_LINEAGE_CHANGED', 'Accepted stage artifacts are missing');
  }
  const digests = [];
  for (const artifact of stage.artifacts) {
    const bytes = await readArtifact(resolve(artifact.path), roots);
    const digest = sha256(bytes);
    if (digest !== artifact.sha256) {
      throw fail('SITE_REMEDIATION_LINEAGE_CHANGED',
        `Accepted artifact changed: ${artifact.kind ?? artifact.path}`);
    }
    digests.push(digest);
  }
  return digests.sort();
}

async function immutableLineage(state, { manifestSequence, manifestSha256 }) {
  const research = findStage(state.manifest.stages, STAGE.KEYWORD_RESEARCH);
  const template = findStage(state.manifest.stages, STAGE.TEMPLATE_SELECTION);
  const integration = findStage(state.manifest.stages, STAGE.CONTENT_INTEGRATION);
  const handoff = research?.checkpoint?.researchHandoff;
  const publication = integration?.artifacts?.find(item =>
    item.kind === 'ROUTE_PUBLICATION_MANIFEST.json');
  if (research?.status !== 'PARTIAL' || handoff?.approved !== true ||
      template?.status !== 'PASSED' || integration?.status !== 'PASSED' || !publication ||
      !integration.checkpoint?.launchReadiness?.bindingDigest) {
    throw fail('SITE_REMEDIATION_UPSTREAM_INVALID',
      'Stage 2 through Stage 4 do not form an approved immutable lineage');
  }
  const roots = [state.workspace, state.projectPath];
  return createImmutableIntegrationLineage({ runId: state.manifest.runId,
    siteRevision: state.manifest.inputs.siteRevision, manifestSequence, manifestSha256,
    researchHandoffSha256: handoff.sha256, researchApprovalDigest: handoff.approvalSha256,
    stage3CheckpointDigest: canonicalContractDigest(
      'STAGE3_CHECKPOINT_V1', template.checkpoint),
    stage3ArtifactDigests: await verifiedArtifactDigests(template, roots),
    stage4CheckpointDigest: canonicalContractDigest(
      'STAGE4_CHECKPOINT_V1', integration.checkpoint),
    stage4ArtifactDigests: await verifiedArtifactDigests(integration, roots),
    originalPublicationManifestSha256: publication.sha256,
    originalLaunchReadinessBindingDigest: integration.checkpoint.launchReadiness.bindingDigest,
    finalizedTransactionDigest: integration.checkpoint.finalizedReconciliation?.previewDigest ?? null,
  });
}

async function originalPublication(state) {
  const integration = findStage(state.manifest.stages, STAGE.CONTENT_INTEGRATION);
  const artifact = integration.artifacts.find(item =>
    item.kind === 'ROUTE_PUBLICATION_MANIFEST.json');
  const bytes = await readArtifact(resolve(artifact.path), [state.workspace, state.projectPath]);
  if (sha256(bytes) !== artifact.sha256) {
    throw fail('SITE_REMEDIATION_LINEAGE_CHANGED',
      'Original publication manifest changed');
  }
  const manifest = parseStrictJson(bytes, artifact.path);
  if (manifest.kind !== 'ROUTE_PUBLICATION_MANIFEST_V1' ||
      manifest.runId !== state.manifest.runId || !Array.isArray(manifest.pages)) {
    throw fail('SITE_REMEDIATION_LINEAGE_CHANGED',
      'Original publication manifest identity is invalid');
  }
  return { manifest, sha256: artifact.sha256 };
}

async function currentBaseline(projectPath) {
  const files = (await sourceFiles(projectPath, { rejectSecrets: true })).map(file => ({
    path: file.path, mode: file.mode, byteLength: file.size, sha256: file.sha256,
  }));
  const discovered = await discoverProjectRoutes(projectPath);
  if (discovered.unprovable.length) {
    throw fail('SITE_REMEDIATION_ROUTE_UNPROVABLE',
      `Current route inventory contains unprovable entries: ${discovered.unprovable.join(', ')}`);
  }
  const protectedInputs = files.filter(file =>
    /^backgroundinformation\//.test(file.path));
  if (!files.length || !discovered.routes.length || !protectedInputs.length) {
    throw fail('SITE_REMEDIATION_BASELINE_INVALID',
      'Complete current tree, routes, and protected research inputs are required');
  }
  const baseline = createCurrentSiteBaseline({ baselineKind: 'REACCEPTED_CURRENT_BASELINE',
    historicalEquivalence: false, digestPolicyVersion: 'project-content-v1', projectPath,
    files, projectDigest: await projectContentDigest(projectPath),
    routes: discovered.routes, protectedInputs, historicalEvidenceGaps });
  return { baseline, currentRedirects: discovered.redirects };
}

function effectivePages(originalManifest, observation) {
  const original = new Map(originalManifest.pages
    .filter(page => page.route).map(page => [page.route, page]));
  return observation.pages.map(page => {
    const policy = original.get(page.route);
    if (!policy || !['PUBLISH', 'DRAFT_ONLY'].includes(policy.disposition)) {
      throw fail('PUBLICATION_RIGHTS_WIDENED',
        `Current route is not authorized by immutable Stage 4 policy: ${page.route}`);
    }
    return { route: page.route, originalDisposition: policy.disposition,
      effectiveDisposition: policy.disposition,
      materialStatus: policy.disposition === 'PUBLISH' ? 'COMPLETED' : 'PARTIAL',
      robots: page.robots, inSitemap: page.inSitemap, inNavigation: page.inNavigation,
      linkedFromPublicPages: page.linkedFromPublicPages,
      sourceFileExposed: page.sourceFileExposed, dynamicProof: page.dynamicProof };
  });
}

async function buildPreviewContext(state, { previewId, storedPreview = null }, dependencies) {
  const lineage = await immutableLineage(state, {
    manifestSequence: storedPreview?.manifestSequence ?? state.manifest.sequence,
    manifestSha256: storedPreview?.manifestSha256 ?? sha256(state.bytes),
  });
  if (storedPreview && lineage.lineageDigest !== storedPreview.lineageDigest) {
    throw fail('SITE_REMEDIATION_LINEAGE_CHANGED', 'Stored remediation lineage changed');
  }
  const publication = await originalPublication(state);
  let baseline, currentRedirects;
  if (storedPreview) {
    baseline = parseStrictJson(await readFile(siteRemediationObjectPath(
      state.runDirectory, storedPreview.baselineDigest)));
    currentRedirects = (await discoverProjectRoutes(state.projectPath)).redirects;
  } else ({ baseline, currentRedirects } = await currentBaseline(state.projectPath));
  const served = await dependencies.buildAndServe(state.projectPath);
  try {
    let evidenceBody, acceptanceIdentity, attestation;
    if (storedPreview) {
      evidenceBody = parseStrictJson(await readFile(siteRemediationObjectPath(
        state.runDirectory, storedPreview.publicationEvidenceDigest)));
      attestation = parseStrictJson(await readFile(siteRemediationObjectPath(
        state.runDirectory, storedPreview.attestationDigest)));
      acceptanceIdentity = createSiteAcceptanceIdentity({ lineageDigest: lineage.lineageDigest,
        baselineDigest: baseline.baselineDigest, projectDigest: baseline.projectDigest,
        publicationEvidenceDigest: evidenceBody.publicationEvidenceDigest,
        remediationScopeDigest: evidenceBody.remediationScopeDigest,
        transactionId: storedPreview.transactionId });
    } else {
      const observation = await dependencies.observeCurrentPublication({
        previewSession: served.session, publicationUrl: served.url,
        projectPath: state.projectPath, projectDigest: baseline.projectDigest,
        currentRoutes: baseline.routes, currentRedirects,
        originalPublicationManifest: publication.manifest,
      });
      const remediationScopeDigest = canonicalContractDigest(
        'LEGACY_CURRENT_BASELINE_SCOPE_V1', baseline.files);
      evidenceBody = createPublicationEvidenceBody({
        originalPublicationManifestSha256: publication.sha256,
        lineageDigest: lineage.lineageDigest,
        researchHandoffSha256: lineage.researchHandoffSha256,
        researchApprovalDigest: lineage.researchApprovalDigest,
        originalLaunchReadinessBindingDigest: lineage.originalLaunchReadinessBindingDigest,
        baselineKind: baseline.baselineKind, baselineDigest: baseline.baselineDigest,
        remediationScopeDigest, projectDigest: baseline.projectDigest,
        observedRoutes: observation.observedRoutes,
        pages: effectivePages(publication.manifest, observation),
        validationStatus: 'VERIFIED', indexingAuthorization: 'NOT_CLEARED',
        hostObservationDigest: observation.observationDigest,
        validatorVersion: observation.validatorVersion,
      });
      acceptanceIdentity = createSiteAcceptanceIdentity({
        lineageDigest: lineage.lineageDigest, baselineDigest: baseline.baselineDigest,
        projectDigest: baseline.projectDigest,
        publicationEvidenceDigest: evidenceBody.publicationEvidenceDigest,
        remediationScopeDigest, transactionId: `site-remediation-${previewId}`,
      });
      attestation = createDerivedPublicationAttestation({ evidenceBody, acceptanceIdentity });
    }
    const hostEvidence = { projectPath: state.projectPath, lineage, baseline,
      publicationEvidence: evidenceBody, acceptanceIdentity, attestation,
      originalPublicationManifest: publication.manifest, previewSession: served.session,
      publicationUrl: served.url, currentRedirects };
    return { hostEvidence, stop: served.stop, input: {
      mode: 'LEGACY_CURRENT_BASELINE', lineageDigest: lineage.lineageDigest,
      researchApprovalDigest: lineage.researchApprovalDigest,
      oldProjectDigest: storedPreview?.oldProjectDigest ??
        findStage(state.manifest.stages, STAGE.UI_UX_AUDIT)?.checkpoint?.projectDigest,
      newProjectDigest: baseline.projectDigest, baselineDigest: baseline.baselineDigest,
      remediationScopeDigest: evidenceBody.remediationScopeDigest,
      publicationEvidenceDigest: evidenceBody.publicationEvidenceDigest,
      attestationDigest: attestation.attestationDigest,
      acceptanceRevision: acceptanceIdentity.acceptanceRevision,
      protectedInputsDigest: baseline.protectedInputsDigest,
      historicalEvidenceGaps: baseline.historicalEvidenceGaps,
      operatorSummarySha256: sha256(Buffer.from(operatorSummary)),
    } };
  } catch (error) {
    await served.stop();
    throw error;
  }
}

function defaults(overrides) {
  return { uuid: randomUUID, buildAndServe, observeCurrentPublication,
    createTrustedController: createTrustedSiteRemediationController, ...overrides };
}

export async function previewProductionSiteRemediation({ workspace, runId }, overrides = {}) {
  const dependencies = defaults(overrides);
  const state = { ...(await manifestState(resolve(workspace), runId)),
    workspace: resolve(workspace) };
  const previewId = dependencies.uuid();
  const context = await buildPreviewContext(state, { previewId }, dependencies);
  try {
    const controller = dependencies.createTrustedController({ workspace: state.workspace,
      runId, hostEvidence: context.hostEvidence, uuid: () => previewId });
    return await controller.preview(context.input);
  } finally { await context.stop(); }
}

async function storedPreviewState(workspace, runId, previewId) {
  const state = { ...(await manifestState(resolve(workspace), runId)),
    workspace: resolve(workspace) };
  const transactionId = `site-remediation-${previewId}`;
  const paths = siteRemediationPaths(state.runDirectory, { previewId, transactionId });
  const preview = verifySiteRemediationPreview(parseStrictJson(await readFile(paths.previewPath)));
  return { state, preview };
}

export async function confirmProductionSiteRemediation({ workspace, runId, previewId,
  confirmationCode }, overrides = {}) {
  const dependencies = defaults(overrides);
  const { state, preview } = await storedPreviewState(workspace, runId, previewId);
  const context = await buildPreviewContext(state, { previewId, storedPreview: preview },
    dependencies);
  try {
    const previewSnapshotSha256 = sha256(await readFile(siteRemediationPaths(
      state.runDirectory, { previewId, transactionId: preview.transactionId }).previewPath));
    const authorization = createSiteReacceptanceAuthorization({ runId, previewId,
      previewSnapshotSha256, manifestSequence: preview.manifestSequence,
      manifestSha256: preview.manifestSha256, mode: preview.mode,
      lineageDigest: preview.lineageDigest, oldProjectDigest: preview.oldProjectDigest,
      newProjectDigest: preview.newProjectDigest, baselineDigest: preview.baselineDigest,
      remediationScopeDigest: preview.remediationScopeDigest,
      publicationEvidenceDigest: preview.publicationEvidenceDigest,
      attestationDigest: preview.attestationDigest,
      acceptanceRevision: preview.acceptanceRevision,
      operatorSummarySha256: preview.operatorSummarySha256,
      transactionId: preview.transactionId });
    const controller = dependencies.createTrustedController({ workspace: state.workspace,
      runId, hostEvidence: context.hostEvidence });
    return await controller.confirm({ previewId, confirmationCode, authorization });
  } finally { await context.stop(); }
}

export async function recoverProductionSiteRemediation({ workspace, runId }, overrides = {}) {
  const dependencies = defaults(overrides);
  const state = { ...(await manifestState(resolve(workspace), runId)),
    workspace: resolve(workspace) };
  const classified = await pendingSiteRemediationTransaction({ runDirectory: state.runDirectory,
    manifestSha256: sha256(state.bytes) });
  const preview = classified.preview;
  if (!preview) throw fail('SITE_REMEDIATION_RECOVERY_REQUIRED',
    'Pending transaction has no immutable preview');
  const context = await buildPreviewContext(state, { previewId: preview.previewId,
    storedPreview: preview }, dependencies);
  try {
    const controller = dependencies.createTrustedController({ workspace: state.workspace,
      runId, hostEvidence: context.hostEvidence });
    return await controller.recover({ transactionId: preview.transactionId });
  } finally { await context.stop(); }
}
