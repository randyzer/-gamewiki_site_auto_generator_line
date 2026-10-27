import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canonicalContractDigest,
  createSiteAcceptanceIdentity,
} from '../src/site-acceptance-contract.mjs';
import {
  createDerivedPublicationAttestation,
  createPublicationEvidenceBody,
  verifyDerivedPublicationAttestation,
  verifyPublicationEvidenceBody,
} from '../src/effective-publication-attestation.mjs';
import { verifyEffectivePublication } from '../src/route-publication.mjs';

const d = value => value.repeat(64).slice(0, 64);
const page = {
  route: '/', originalDisposition: 'PUBLISH', effectiveDisposition: 'PUBLISH',
  materialStatus: 'COMPLETED', robots: 'index', inSitemap: true, inNavigation: true,
  linkedFromPublicPages: true, sourceFileExposed: false, dynamicProof: 'STATIC',
};
const evidenceInput = {
  originalPublicationManifestSha256: d('1'), lineageDigest: d('2'),
  researchHandoffSha256: d('3'), researchApprovalDigest: d('4'),
  originalLaunchReadinessBindingDigest: d('5'), baselineKind: 'REACCEPTED_CURRENT_BASELINE',
  baselineDigest: d('6'), remediationScopeDigest: d('7'), projectDigest: d('8'),
  observedRoutes: ['/'], pages: [page], validationStatus: 'VERIFIED',
  indexingAuthorization: 'CLEARED', hostObservationDigest: d('a'),
  validatorVersion: 'host-route-v1',
};

test('publication evidence digest precedes acceptance revision and final attestation', () => {
  const evidenceBody = createPublicationEvidenceBody(evidenceInput);
  assert.equal(verifyPublicationEvidenceBody(evidenceBody), evidenceBody);
  assert.equal(Object.hasOwn(evidenceBody, 'acceptanceRevision'), false);
  assert.equal(Object.hasOwn(evidenceBody, 'attestationDigest'), false);
  const identity = createSiteAcceptanceIdentity({ lineageDigest: evidenceBody.lineageDigest,
    baselineDigest: evidenceBody.baselineDigest, projectDigest: evidenceBody.projectDigest,
    publicationEvidenceDigest: evidenceBody.publicationEvidenceDigest,
    remediationScopeDigest: evidenceBody.remediationScopeDigest,
    transactionId: 'site-remediation-11111111-1111-4111-8111-111111111111' });
  const attestation = createDerivedPublicationAttestation({
    evidenceBody, acceptanceIdentity: identity,
  });
  assert.equal(verifyDerivedPublicationAttestation(attestation, { acceptanceIdentity: identity }),
    attestation);
});

test('publication verification rejects reordered routes and pages with valid recomputed digests', () => {
  const evidenceBody = createPublicationEvidenceBody({
    ...evidenceInput,
    observedRoutes: ['/', '/en/'],
    pages: [page, { ...page, route: '/en/' }],
  });

  for (const field of ['observedRoutes', 'pages']) {
    const { publicationEvidenceDigest: _digest, ...canonicalBody } = evidenceBody;
    const body = {
      ...canonicalBody,
      [field]: [...evidenceBody[field]].reverse(),
    };
    if (field === 'observedRoutes') {
      body.routeInventoryDigest = canonicalContractDigest(
        'EFFECTIVE_ROUTE_INVENTORY_V1', body.observedRoutes,
      );
    }
    const reordered = {
      ...body,
      publicationEvidenceDigest: canonicalContractDigest('PUBLICATION_EVIDENCE_BODY_V1', body),
    };
    assert.throws(() => verifyPublicationEvidenceBody(reordered),
      error => error.code === 'PUBLICATION_EVIDENCE_NON_CANONICAL');
  }
});

test('effective policy may narrow but never widen original rights', () => {
  const narrowed = createPublicationEvidenceBody({ ...evidenceInput,
    pages: [{ ...page, effectiveDisposition: 'DRAFT_ONLY', materialStatus: 'PARTIAL',
      robots: 'noindex', inSitemap: false, inNavigation: false,
      linkedFromPublicPages: false }] });
  assert.equal(narrowed.pages[0].effectiveDisposition, 'DRAFT_ONLY');
  assert.throws(() => createPublicationEvidenceBody({ ...evidenceInput,
    pages: [{ ...page, originalDisposition: 'DRAFT_ONLY', effectiveDisposition: 'PUBLISH',
      materialStatus: 'PARTIAL' }] }), error => error.code === 'PUBLICATION_RIGHTS_WIDENED');
});

test('publication eligibility remains noindex until indexing authorization is cleared', () => {
  const noindexPage = {
    ...page,
    robots: 'noindex',
    linkedFromPublicPages: true,
    sourceFileExposed: false,
  };
  const evidenceBody = createPublicationEvidenceBody({
    ...evidenceInput,
    indexingAuthorization: 'NOT_CLEARED',
    hostObservationDigest: d('a'),
    pages: [noindexPage],
  });
  assert.equal(evidenceBody.pages[0].effectiveDisposition, 'PUBLISH');
  assert.equal(evidenceBody.pages[0].robots, 'noindex');
  assert.throws(() => createPublicationEvidenceBody({
    ...evidenceInput,
    indexingAuthorization: 'NOT_CLEARED',
    hostObservationDigest: d('a'),
    pages: [{ ...noindexPage, robots: 'index' }],
  }), error => error.code === 'PUBLICATION_INDEXING_NOT_AUTHORIZED');
});

test('Host observation evidence rejects public links and source exposure for restricted material', () => {
  const publishPage = {
    ...page,
    robots: 'noindex',
    linkedFromPublicPages: true,
    sourceFileExposed: false,
  };
  const omittedPage = {
    ...page,
    route: '/blocked',
    originalDisposition: 'OMIT',
    effectiveDisposition: 'OMIT',
    materialStatus: 'BLOCKED',
    robots: 'noindex',
    inSitemap: false,
    inNavigation: false,
    linkedFromPublicPages: false,
    sourceFileExposed: false,
  };
  const input = {
    ...evidenceInput,
    indexingAuthorization: 'NOT_CLEARED',
    hostObservationDigest: d('a'),
    pages: [publishPage, omittedPage],
  };
  assert.equal(createPublicationEvidenceBody(input).hostObservationScopes.length, 3);
  assert.throws(() => createPublicationEvidenceBody({
    ...input,
    pages: [publishPage, { ...omittedPage, linkedFromPublicPages: true }],
  }), error => error.code === 'PUBLICATION_POLICY_INVALID');
  assert.throws(() => createPublicationEvidenceBody({
    ...input,
    pages: [publishPage, { ...omittedPage, sourceFileExposed: true }],
  }), error => error.code === 'PUBLICATION_POLICY_INVALID');
});

test('draft, blocked, unproven and self-referential evidence fails closed', () => {
  assert.throws(() => createPublicationEvidenceBody({ ...evidenceInput,
    pages: [{ ...page, originalDisposition: 'DRAFT_ONLY', effectiveDisposition: 'DRAFT_ONLY',
      materialStatus: 'PARTIAL', robots: 'index' }] }),
  error => error.code === 'PUBLICATION_POLICY_INVALID');
  assert.throws(() => createPublicationEvidenceBody({ ...evidenceInput,
    pages: [{ ...page, originalDisposition: 'OMIT', effectiveDisposition: 'OMIT',
      materialStatus: 'BLOCKED', inNavigation: true }] }),
  error => error.code === 'PUBLICATION_POLICY_INVALID');
  assert.throws(() => createPublicationEvidenceBody({ ...evidenceInput,
    pages: [{ ...page, dynamicProof: 'UNPROVEN' }] }),
  error => error.code === 'PUBLICATION_POLICY_INVALID');
  assert.throws(() => createPublicationEvidenceBody({ ...evidenceInput,
    acceptanceRevision: d('9') }), error => error.code === 'PUBLICATION_EVIDENCE_SELF_REFERENCE');
});

test('publication evidence rejects uncovered observations and observed omitted blockers', () => {
  assert.throws(() => createPublicationEvidenceBody({ ...evidenceInput,
    observedRoutes: ['/', '/uncovered'] }),
  error => error.code === 'PUBLICATION_ROUTE_COVERAGE_INVALID');
  assert.throws(() => createPublicationEvidenceBody({ ...evidenceInput,
    pages: [{ ...page, originalDisposition: 'OMIT', effectiveDisposition: 'OMIT',
      materialStatus: 'BLOCKED', robots: 'noindex', inSitemap: false, inNavigation: false }] }),
  error => error.code === 'PUBLICATION_POLICY_INVALID');
});

test('derived attestation rejects evidence and acceptance binding mutations', () => {
  const evidenceBody = createPublicationEvidenceBody(evidenceInput);
  const identity = createSiteAcceptanceIdentity({ lineageDigest: evidenceBody.lineageDigest,
    baselineDigest: evidenceBody.baselineDigest, projectDigest: evidenceBody.projectDigest,
    publicationEvidenceDigest: evidenceBody.publicationEvidenceDigest,
    remediationScopeDigest: evidenceBody.remediationScopeDigest,
    transactionId: 'site-remediation-11111111-1111-4111-8111-111111111111' });
  const attestation = createDerivedPublicationAttestation({ evidenceBody, acceptanceIdentity: identity });
  assert.throws(() => verifyDerivedPublicationAttestation({ ...attestation,
    publicationEvidenceDigest: d('f') }, { acceptanceIdentity: identity }),
  error => error.code === 'PUBLICATION_ACCEPTANCE_BINDING_MISMATCH');
  const { acceptanceRevision: _acceptanceRevision, ...identityInput } = identity;
  assert.throws(() => verifyDerivedPublicationAttestation(attestation, {
    acceptanceIdentity: createSiteAcceptanceIdentity({ ...identityInput,
      transactionId: 'site-remediation-22222222-2222-4222-8222-222222222222' }),
  }), error => error.code === 'PUBLICATION_ACCEPTANCE_BINDING_MISMATCH');
});

test('effective publication remains bounded by the immutable Stage 4 manifest', () => {
  const evidenceBody = createPublicationEvidenceBody(evidenceInput);
  const identity = createSiteAcceptanceIdentity({ lineageDigest: evidenceBody.lineageDigest,
    baselineDigest: evidenceBody.baselineDigest, projectDigest: evidenceBody.projectDigest,
    publicationEvidenceDigest: evidenceBody.publicationEvidenceDigest,
    remediationScopeDigest: evidenceBody.remediationScopeDigest,
    transactionId: 'site-remediation-11111111-1111-4111-8111-111111111111' });
  const attestation = createDerivedPublicationAttestation({ evidenceBody,
    acceptanceIdentity: identity });
  const originalManifest = { pages: [{ route: '/', disposition: 'PUBLISH' }] };
  assert.equal(verifyEffectivePublication({ originalManifest, evidenceBody, attestation,
    acceptanceIdentity: identity, currentRoutes: ['/'] }).publicationEvidenceDigest,
  evidenceBody.publicationEvidenceDigest);
  assert.throws(() => verifyEffectivePublication({ originalManifest, evidenceBody: {
    ...evidenceBody, observedRoutes: ['/', '/extra'] }, attestation,
  acceptanceIdentity: identity, currentRoutes: ['/', '/extra'] }),
  error => ['PUBLICATION_EVIDENCE_DIGEST_MISMATCH',
    'PUBLICATION_ROUTE_COVERAGE_INVALID'].includes(error.code));
  assert.throws(() => verifyEffectivePublication({ originalManifest: { pages: [] },
    evidenceBody, attestation, acceptanceIdentity: identity, currentRoutes: ['/'] }),
  error => error.code === 'PUBLICATION_RIGHTS_WIDENED');
});
