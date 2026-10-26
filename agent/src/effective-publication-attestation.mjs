import { deepFreeze } from './contracts/canonical-json.mjs';
import { ContractError } from './contracts/errors.mjs';
import { validateContract } from './contracts/registry.mjs';
import {
  canonicalContractDigest,
  verifySiteAcceptanceIdentity,
} from './site-acceptance-contract.mjs';

export const PUBLICATION_POLICY_VERSION = 'effective-publication-v1';

const rank = new Map([['OMIT', 0], ['DRAFT_ONLY', 1], ['PUBLISH', 2]]);
const selfFields = [
  'acceptanceRevision', 'attestationDigest', 'publicationEvidenceDigest', 'evidenceBody',
];

function verifyPage(page) {
  if (rank.get(page.effectiveDisposition) > rank.get(page.originalDisposition)) {
    throw new ContractError('PUBLICATION_RIGHTS_WIDENED',
      'Effective publication rights exceed Stage 4');
  }
  if (page.dynamicProof === 'UNPROVEN') {
    throw new ContractError('PUBLICATION_POLICY_INVALID',
      'Unproven routes cannot be accepted');
  }
  if (page.effectiveDisposition === 'PUBLISH' &&
      (page.materialStatus !== 'COMPLETED' || page.robots !== 'index')) {
    throw new ContractError('PUBLICATION_POLICY_INVALID',
      'Published routes require completed indexed material');
  }
  if (page.effectiveDisposition === 'DRAFT_ONLY' &&
      (page.materialStatus !== 'PARTIAL' || page.robots !== 'noindex' ||
       page.inSitemap || page.inNavigation)) {
    throw new ContractError('PUBLICATION_POLICY_INVALID',
      'Draft routes must stay noindex and undiscoverable');
  }
  if (page.effectiveDisposition === 'OMIT' && (page.inSitemap || page.inNavigation)) {
    throw new ContractError('PUBLICATION_POLICY_INVALID',
      'Omitted routes cannot be exposed');
  }
}

function verifyRouteCoverage(observedRoutes, pages) {
  const observed = new Set(observedRoutes);
  const byRoute = new Map();
  for (const page of pages) {
    if (byRoute.has(page.route)) {
      throw new ContractError('PUBLICATION_ROUTE_DUPLICATE',
        'Publication page routes must be unique');
    }
    byRoute.set(page.route, page);
  }
  for (const route of observed) {
    const page = byRoute.get(route);
    if (!page) {
      throw new ContractError('PUBLICATION_ROUTE_COVERAGE_INVALID',
        'Every observed route requires an effective publication disposition');
    }
    if (page.effectiveDisposition === 'OMIT') {
      throw new ContractError('PUBLICATION_POLICY_INVALID',
        'An omitted route cannot remain publicly observable');
    }
  }
  for (const page of pages) {
    if (page.effectiveDisposition !== 'OMIT' && !observed.has(page.route)) {
      throw new ContractError('PUBLICATION_ROUTE_COVERAGE_INVALID',
        'Every published or draft route must appear in the observed inventory');
    }
  }
}

function verifyAcceptanceBinding(evidenceBody, acceptanceIdentity) {
  if (acceptanceIdentity.publicationEvidenceDigest !== evidenceBody.publicationEvidenceDigest ||
      acceptanceIdentity.lineageDigest !== evidenceBody.lineageDigest ||
      acceptanceIdentity.baselineDigest !== evidenceBody.baselineDigest ||
      acceptanceIdentity.projectDigest !== evidenceBody.projectDigest ||
      acceptanceIdentity.remediationScopeDigest !== evidenceBody.remediationScopeDigest) {
    throw new ContractError('PUBLICATION_ACCEPTANCE_BINDING_MISMATCH',
      'Acceptance identity does not bind this publication evidence');
  }
}

export function createPublicationEvidenceBody(input) {
  if (selfFields.some(field => Object.hasOwn(input, field))) {
    throw new ContractError('PUBLICATION_EVIDENCE_SELF_REFERENCE',
      'Publication evidence body cannot contain derived identity fields');
  }
  const observedRoutes = structuredClone(input.observedRoutes).sort();
  const pages = structuredClone(input.pages)
    .sort((left, right) => left.route.localeCompare(right.route));
  pages.forEach(verifyPage);
  if (new Set(observedRoutes).size !== observedRoutes.length ||
      new Set(pages.map(item => item.route)).size !== pages.length) {
    throw new ContractError('PUBLICATION_ROUTE_DUPLICATE',
      'Observed publication routes must be unique');
  }
  verifyRouteCoverage(observedRoutes, pages);
  const body = {
    ...structuredClone(input),
    kind: 'PUBLICATION_EVIDENCE_BODY',
    schemaVersion: 1,
    producer: 'EFFECTIVE_PUBLICATION_ATTESTATION',
    policyVersion: PUBLICATION_POLICY_VERSION,
    observedRoutes,
    routeInventoryDigest: canonicalContractDigest(
      'EFFECTIVE_ROUTE_INVENTORY_V1', observedRoutes,
    ),
    pages,
  };
  const value = {
    ...body,
    publicationEvidenceDigest: canonicalContractDigest('PUBLICATION_EVIDENCE_BODY_V1', body),
  };
  validateContract(value.kind, value.schemaVersion, value);
  return deepFreeze(value);
}

export function verifyPublicationEvidenceBody(value) {
  validateContract('PUBLICATION_EVIDENCE_BODY', 1, value);
  if (value.policyVersion !== PUBLICATION_POLICY_VERSION) {
    throw new ContractError('PUBLICATION_POLICY_INVALID', 'Publication policy version changed');
  }
  value.pages.forEach(verifyPage);
  verifyRouteCoverage(value.observedRoutes, value.pages);
  if (canonicalContractDigest('EFFECTIVE_ROUTE_INVENTORY_V1', value.observedRoutes) !==
      value.routeInventoryDigest) {
    throw new ContractError('PUBLICATION_EVIDENCE_DIGEST_MISMATCH',
      'Observed route inventory digest changed');
  }
  const { publicationEvidenceDigest, ...body } = value;
  if (canonicalContractDigest('PUBLICATION_EVIDENCE_BODY_V1', body) !==
      publicationEvidenceDigest) {
    throw new ContractError('PUBLICATION_EVIDENCE_DIGEST_MISMATCH',
      'Publication evidence digest changed');
  }
  return value;
}

export function createDerivedPublicationAttestation({ evidenceBody, acceptanceIdentity }) {
  verifyPublicationEvidenceBody(evidenceBody);
  verifySiteAcceptanceIdentity(acceptanceIdentity);
  verifyAcceptanceBinding(evidenceBody, acceptanceIdentity);
  const envelope = {
    kind: 'DERIVED_PUBLICATION_ATTESTATION',
    schemaVersion: 1,
    producer: 'EFFECTIVE_PUBLICATION_ATTESTATION',
    evidenceBody: structuredClone(evidenceBody),
    publicationEvidenceDigest: evidenceBody.publicationEvidenceDigest,
    acceptanceRevision: acceptanceIdentity.acceptanceRevision,
  };
  const value = {
    ...envelope,
    attestationDigest: canonicalContractDigest('DERIVED_PUBLICATION_ATTESTATION_V1', envelope),
  };
  validateContract(value.kind, value.schemaVersion, value);
  return deepFreeze(value);
}

export function verifyDerivedPublicationAttestation(value, { acceptanceIdentity }) {
  validateContract('DERIVED_PUBLICATION_ATTESTATION', 1, value);
  verifyPublicationEvidenceBody(value.evidenceBody);
  verifySiteAcceptanceIdentity(acceptanceIdentity);
  verifyAcceptanceBinding(value.evidenceBody, acceptanceIdentity);
  if (value.publicationEvidenceDigest !== value.evidenceBody.publicationEvidenceDigest ||
      value.acceptanceRevision !== acceptanceIdentity.acceptanceRevision) {
    throw new ContractError('PUBLICATION_ACCEPTANCE_BINDING_MISMATCH',
      'Derived attestation is stale or belongs to another acceptance');
  }
  const { attestationDigest, ...envelope } = value;
  if (canonicalContractDigest('DERIVED_PUBLICATION_ATTESTATION_V1', envelope) !==
      attestationDigest) {
    throw new ContractError('PUBLICATION_ATTESTATION_DIGEST_MISMATCH',
      'Attestation digest changed');
  }
  return value;
}
