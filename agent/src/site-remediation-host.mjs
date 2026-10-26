import { lstat, readFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';
import { canonicalJson } from './contracts/canonical-json.mjs';
import { ContractError } from './contracts/errors.mjs';
import { sha256 } from './files.mjs';
import { sourceFiles } from './project-baseline.mjs';
import { projectContentDigest } from './project-content-digest.mjs';
import { discoverProjectRoutes } from './route-discovery.mjs';
import {
  verifyCurrentSiteBaseline,
  verifyImmutableIntegrationLineage,
  verifySiteAcceptanceIdentity,
} from './site-acceptance-contract.mjs';
import { verifyEffectivePublication } from './route-publication.mjs';
import { STAGE, findStage } from './stages.mjs';

const fail = (code, message) => new ContractError(code, message);
const evidenceFields = Object.freeze([
  'lineageDigest', 'researchApprovalDigest', 'oldProjectDigest', 'newProjectDigest',
  'baselineDigest', 'remediationScopeDigest', 'publicationEvidenceDigest',
  'attestationDigest', 'acceptanceRevision', 'protectedInputsDigest',
  'operatorSummarySha256',
]);
const canonical = values => [...values]
  .sort((left, right) => canonicalJson(left).localeCompare(canonicalJson(right)));

function verifyManifestLineage(lineage, manifest) {
  if (!manifest) return;
  const research = findStage(manifest.stages, STAGE.KEYWORD_RESEARCH);
  const template = findStage(manifest.stages, STAGE.TEMPLATE_SELECTION);
  const integration = findStage(manifest.stages, STAGE.CONTENT_INTEGRATION);
  const publication = integration.artifacts.find(item =>
    item.kind === 'ROUTE_PUBLICATION_MANIFEST.json');
  const stage3Artifacts = template.artifacts.map(item => item.sha256).sort();
  const stage4Artifacts = integration.artifacts.map(item => item.sha256).sort();
  if (lineage.runId !== manifest.runId ||
      lineage.siteRevision !== manifest.inputs?.siteRevision ||
      lineage.researchHandoffSha256 !== research.checkpoint?.researchHandoff?.sha256 ||
      lineage.researchApprovalDigest !== research.checkpoint?.researchHandoff?.approvalSha256 ||
      canonicalJson(lineage.stage3ArtifactDigests) !== canonicalJson(stage3Artifacts) ||
      canonicalJson(lineage.stage4ArtifactDigests) !== canonicalJson(stage4Artifacts) ||
      lineage.originalPublicationManifestSha256 !== publication?.sha256 ||
      lineage.originalLaunchReadinessBindingDigest !==
        integration.checkpoint?.launchReadiness?.bindingDigest) {
    throw fail('SITE_REMEDIATION_LINEAGE_CHANGED',
      'Immutable Stage 2 through Stage 4 evidence differs from the reviewed lineage');
  }
}

async function verifyProtectedInputs(projectPath, expected) {
  const current = [];
  for (const entry of expected) {
    const path = resolve(projectPath, entry.path);
    const rel = relative(projectPath, path);
    if (rel === '..' || rel.startsWith('../') || isAbsolute(rel)) {
      throw fail('SITE_REMEDIATION_PROTECTED_INPUT_CHANGED',
        'Protected input escapes the project');
    }
    let info;
    try { info = await lstat(path); }
    catch {
      throw fail('SITE_REMEDIATION_PROTECTED_INPUT_CHANGED',
        `Protected input is missing: ${entry.path}`);
    }
    if (!info.isFile() || info.isSymbolicLink() || info.nlink !== 1) {
      throw fail('SITE_REMEDIATION_PROTECTED_INPUT_CHANGED',
        `Protected input is not a regular unlinked file: ${entry.path}`);
    }
    current.push({ path: entry.path, mode: info.mode & 0o777, byteLength: info.size,
      sha256: sha256(await readFile(path)) });
  }
  if (canonicalJson(canonical(current)) !== canonicalJson(expected)) {
    throw fail('SITE_REMEDIATION_PROTECTED_INPUT_CHANGED',
      'Protected research input identity changed');
  }
}

export async function collectSiteRemediationHostEvidence({ projectPath, lineage, baseline,
  publicationEvidence: evidenceBody, acceptanceIdentity, attestation, expected,
  originalPublicationManifest, manifest = null }) {
  verifyImmutableIntegrationLineage(lineage);
  verifyManifestLineage(lineage, manifest);
  verifyCurrentSiteBaseline(baseline);
  verifySiteAcceptanceIdentity(acceptanceIdentity);
  if (baseline.projectPath !== projectPath || evidenceBody.lineageDigest !== lineage.lineageDigest ||
      acceptanceIdentity.lineageDigest !== lineage.lineageDigest || !expected || evidenceFields.some(field =>
    typeof expected[field] !== 'string')) {
    throw fail('SITE_REMEDIATION_HOST_EVIDENCE_INVALID',
      'Host evidence inputs are incomplete');
  }
  await verifyProtectedInputs(projectPath, baseline.protectedInputs);
  const currentFiles = (await sourceFiles(projectPath)).map(file => ({ path: file.path,
    mode: file.mode, byteLength: file.size, sha256: file.sha256 }));
  const currentProjectDigest = await projectContentDigest(projectPath);
  if (canonicalJson(canonical(currentFiles)) !== canonicalJson(baseline.files) ||
      currentProjectDigest !== baseline.projectDigest) {
    throw fail('SITE_REMEDIATION_PROJECT_BASELINE_CHANGED',
      'Current project differs from the accepted complete baseline');
  }
  const discovered = await discoverProjectRoutes(projectPath);
  if (discovered.unprovable.length) {
    throw fail('SITE_REMEDIATION_ROUTE_UNPROVABLE',
      `Current route inventory contains unprovable entries: ${discovered.unprovable.join(', ')}`);
  }
  const routes = [...discovered.routes].sort();
  if (canonicalJson(routes) !== canonicalJson(baseline.routes)) {
    throw fail('SITE_REMEDIATION_ROUTE_INVENTORY_CHANGED',
      'Current route inventory differs from the accepted baseline');
  }
  verifyEffectivePublication({ originalManifest: originalPublicationManifest, evidenceBody,
    attestation, acceptanceIdentity, currentRoutes: routes });
  const observed = {
    ...expected,
    lineageDigest: evidenceBody.lineageDigest,
    researchApprovalDigest: evidenceBody.researchApprovalDigest,
    newProjectDigest: currentProjectDigest,
    baselineDigest: baseline.baselineDigest,
    remediationScopeDigest: evidenceBody.remediationScopeDigest,
    publicationEvidenceDigest: evidenceBody.publicationEvidenceDigest,
    attestationDigest: attestation.attestationDigest,
    acceptanceRevision: acceptanceIdentity.acceptanceRevision,
    protectedInputsDigest: baseline.protectedInputsDigest,
  };
  if (evidenceFields.some(field => observed[field] !== expected[field])) {
    throw fail('SITE_REMEDIATION_EVIDENCE_STALE',
      'Host-recomputed evidence differs from the approved snapshot');
  }
  return Object.freeze(observed);
}
