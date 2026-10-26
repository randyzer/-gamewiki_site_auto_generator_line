import { canonicalJson, deepFreeze } from './contracts/canonical-json.mjs';
import { ContractError } from './contracts/errors.mjs';
import { validateContract } from './contracts/registry.mjs';
import {
  canonicalContractDigest,
  createSiteAcceptanceIdentity,
  verifyCurrentSiteBaseline,
} from './site-acceptance-contract.mjs';
import {
  verifyDerivedPublicationAttestation,
  verifyPublicationEvidenceBody,
} from './effective-publication-attestation.mjs';
import { verifyCommittedSiteRemediation } from './site-remediation-transaction.mjs';
import { STAGE, findStage } from './stages.mjs';

const digest = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const fail = (code, message) => new ContractError(code, message);

function stage4Provenance(manifest) {
  const stage = findStage(manifest.stages, STAGE.CONTENT_INTEGRATION);
  const publication = stage.artifacts.find(item =>
    item.kind === 'ROUTE_PUBLICATION_MANIFEST.json');
  return {
    originalPublicationManifestSha256: digest(publication?.sha256) ? publication.sha256 : null,
    originalLaunchReadinessBindingDigest:
      digest(stage.checkpoint?.launchReadiness?.bindingDigest)
        ? stage.checkpoint.launchReadiness.bindingDigest : null,
  };
}

function createEnvelope(body) {
  const canonicalBlockers = [...new Set(body.unresolvedBlockers)].sort();
  const unsigned = {
    ...body,
    kind: 'EFFECTIVE_SITE_ACCEPTANCE',
    schemaVersion: 1,
    producer: 'EFFECTIVE_SITE_ACCEPTANCE_RESOLVER',
    unresolvedBlockers: canonicalBlockers,
  };
  const value = {
    ...unsigned,
    envelopeDigest: canonicalContractDigest('EFFECTIVE_SITE_ACCEPTANCE_V1', unsigned),
  };
  validateContract(value.kind, value.schemaVersion, value);
  return deepFreeze(value);
}

function verifyCommittedEvidenceGraph(committed, marker, projectDigest) {
  const { preview, intent, receipt, immutableObjects } = committed ?? {};
  const { baseline, publicationEvidence, attestation } = immutableObjects ?? {};
  if (!preview || !intent || !receipt || !baseline || !publicationEvidence || !attestation) {
    throw fail('EFFECTIVE_SITE_ACCEPTANCE_INVALID',
      'Committed remediation acceptance is missing immutable evidence objects');
  }
  verifyCurrentSiteBaseline(baseline);
  verifyPublicationEvidenceBody(publicationEvidence);
  const acceptanceIdentity = createSiteAcceptanceIdentity({
    lineageDigest: publicationEvidence.lineageDigest,
    baselineDigest: baseline.baselineDigest,
    projectDigest: baseline.projectDigest,
    publicationEvidenceDigest: publicationEvidence.publicationEvidenceDigest,
    remediationScopeDigest: publicationEvidence.remediationScopeDigest,
    transactionId: marker.transactionId,
  });
  verifyDerivedPublicationAttestation(attestation, { acceptanceIdentity });
  const expectedObjectDigests = [baseline.baselineDigest,
    publicationEvidence.publicationEvidenceDigest, attestation.attestationDigest,
    intent.postManifestSha256].sort();
  if (preview.newProjectDigest !== projectDigest || baseline.projectDigest !== projectDigest ||
      preview.previewDigest !== marker.previewDigest ||
      preview.transactionId !== marker.transactionId ||
      preview.baselineDigest !== baseline.baselineDigest ||
      preview.publicationEvidenceDigest !== publicationEvidence.publicationEvidenceDigest ||
      preview.attestationDigest !== attestation.attestationDigest ||
      preview.lineageDigest !== publicationEvidence.lineageDigest ||
      preview.remediationScopeDigest !== publicationEvidence.remediationScopeDigest ||
      preview.acceptanceRevision !== acceptanceIdentity.acceptanceRevision ||
      marker.acceptanceRevision !== acceptanceIdentity.acceptanceRevision ||
      marker.baselineDigest !== baseline.baselineDigest ||
      marker.protectedInputsDigest !== baseline.protectedInputsDigest ||
      receipt.acceptanceRevision !== acceptanceIdentity.acceptanceRevision ||
      canonicalJson(intent.committedObjectDigests) !== canonicalJson(expectedObjectDigests)) {
    throw fail('EFFECTIVE_SITE_ACCEPTANCE_INVALID',
      'Committed remediation evidence graph is stale or substituted');
  }
  return { preview, receipt, baseline, publicationEvidence, attestation, acceptanceIdentity };
}

export function verifyEffectiveSiteAcceptance(value) {
  validateContract('EFFECTIVE_SITE_ACCEPTANCE', 1, value);
  const canonicalBlockers = [...new Set(value.unresolvedBlockers)].sort();
  if (canonicalJson(value.unresolvedBlockers) !== canonicalJson(canonicalBlockers)) {
    throw fail('EFFECTIVE_SITE_ACCEPTANCE_NON_CANONICAL',
      'Unresolved blockers must be unique and canonically sorted');
  }
  const { envelopeDigest, ...unsigned } = value;
  if (canonicalContractDigest('EFFECTIVE_SITE_ACCEPTANCE_V1', unsigned) !== envelopeDigest) {
    throw fail('EFFECTIVE_SITE_ACCEPTANCE_DIGEST_MISMATCH',
      'Effective site acceptance envelope changed');
  }
  if (value.mode === 'REMEDIATED' &&
      (![value.baselineDigest, value.receiptDigest, value.attestationDigest]
        .every(digest) || value.launchReadiness !== 'NOT_CLEARED')) {
    throw fail('EFFECTIVE_SITE_ACCEPTANCE_INVALID',
      'Remediated acceptance requires committed current evidence and fresh clearance');
  }
  return value;
}

export async function resolveEffectiveSiteAcceptance({
  runDirectory,
  manifest,
  projectDigest,
  verifyCommitted = verifyCommittedSiteRemediation,
}) {
  if (!manifest || !Array.isArray(manifest.stages) ||
      typeof manifest.inputs?.siteRevision !== 'string' || !manifest.inputs.siteRevision ||
      !digest(projectDigest)) {
    throw fail('EFFECTIVE_SITE_ACCEPTANCE_INVALID',
      'Manifest identity and current project digest are required');
  }
  const provenance = stage4Provenance(manifest);
  if (!manifest.siteAcceptance) {
    const lineageDigest = canonicalContractDigest('ORDINARY_SITE_LINEAGE_V1', {
      runId: manifest.runId,
      siteRevision: manifest.inputs.siteRevision,
      ...provenance,
    });
    const acceptanceRevision = canonicalContractDigest('ORDINARY_SITE_ACCEPTANCE_V1', {
      lineageDigest,
      projectDigest,
    });
    return createEnvelope({ mode: 'ORDINARY', siteRevision: manifest.inputs.siteRevision,
      acceptanceRevision, projectDigest, lineageDigest, baselineDigest: null,
      receiptDigest: null, attestationDigest: null, ...provenance,
      launchReadiness: 'NOT_CLEARED', unresolvedBlockers: [] });
  }

  if (manifest.siteAcceptance.projectDigest !== projectDigest) {
    throw fail('EFFECTIVE_SITE_ACCEPTANCE_STALE',
      'Current project does not match the committed remediation baseline');
  }
  const committed = await verifyCommitted({ runDirectory, manifest });
  const marker = manifest.siteAcceptance;
  const verified = verifyCommittedEvidenceGraph(committed, marker, projectDigest);
  const { preview, receipt, attestation } = verified;
  if (!digest(preview.lineageDigest) || !digest(attestation.attestationDigest) ||
      !digest(receipt.receiptDigest)) {
    throw fail('EFFECTIVE_SITE_ACCEPTANCE_INVALID',
      'Committed remediation evidence does not bind the current acceptance');
  }
  return createEnvelope({ mode: 'REMEDIATED', siteRevision: manifest.inputs.siteRevision,
    acceptanceRevision: marker.acceptanceRevision, projectDigest,
    lineageDigest: preview.lineageDigest, baselineDigest: marker.baselineDigest,
    receiptDigest: receipt.receiptDigest, attestationDigest: attestation.attestationDigest,
    ...provenance, launchReadiness: 'NOT_CLEARED',
    unresolvedBlockers: ['CURRENT_LAUNCH_READINESS_REVALIDATION_REQUIRED',
      ...(preview.historicalEvidenceGaps ?? [])] });
}
