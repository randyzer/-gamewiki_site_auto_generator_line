import test from 'node:test';
import assert from 'node:assert/strict';
import { createSiteAcceptanceIdentity } from '../src/site-acceptance-contract.mjs';
import {
  createDerivedPublicationAttestation,
  createPublicationEvidenceBody,
  verifyDerivedPublicationAttestation,
  verifyPublicationEvidenceBody,
} from '../src/effective-publication-attestation.mjs';

const d = value => value.repeat(64).slice(0, 64);
const page = {
  route: '/', originalDisposition: 'PUBLISH', effectiveDisposition: 'PUBLISH',
  materialStatus: 'COMPLETED', robots: 'index', inSitemap: true, inNavigation: true,
  dynamicProof: 'STATIC',
};
const evidenceInput = {
  originalPublicationManifestSha256: d('1'), lineageDigest: d('2'),
  researchHandoffSha256: d('3'), researchApprovalDigest: d('4'),
  originalLaunchReadinessBindingDigest: d('5'), baselineKind: 'REACCEPTED_CURRENT_BASELINE',
  baselineDigest: d('6'), remediationScopeDigest: d('7'), projectDigest: d('8'),
  observedRoutes: ['/'], pages: [page], validationStatus: 'VERIFIED',
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

test('effective policy may narrow but never widen original rights', () => {
  const narrowed = createPublicationEvidenceBody({ ...evidenceInput,
    pages: [{ ...page, effectiveDisposition: 'DRAFT_ONLY', materialStatus: 'PARTIAL',
      robots: 'noindex', inSitemap: false, inNavigation: false }] });
  assert.equal(narrowed.pages[0].effectiveDisposition, 'DRAFT_ONLY');
  assert.throws(() => createPublicationEvidenceBody({ ...evidenceInput,
    pages: [{ ...page, originalDisposition: 'DRAFT_ONLY', effectiveDisposition: 'PUBLISH',
      materialStatus: 'PARTIAL' }] }), error => error.code === 'PUBLICATION_RIGHTS_WIDENED');
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
