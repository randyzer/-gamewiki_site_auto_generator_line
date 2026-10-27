import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveEffectiveSiteAcceptance,
  verifyEffectiveSiteAcceptance,
} from '../src/effective-site-acceptance.mjs';
import {
  createCurrentSiteBaseline,
  createSiteAcceptanceIdentity,
} from '../src/site-acceptance-contract.mjs';
import {
  createDerivedPublicationAttestation,
  createPublicationEvidenceBody,
} from '../src/effective-publication-attestation.mjs';

const d = character => character.repeat(64);
const stage = (skill, status = 'PASSED') => ({
  skill, status, artifacts: [], checkpoint: {}, evidence: [], missing_inputs: [], history: [],
});
const manifest = () => {
  const stages = [
    stage('game-homepage-icon-research'),
    stage('game-innerpage-keyword-information-research', 'PARTIAL'),
    stage('game-site-template-selector'),
    stage('game-site-content-integrator'),
    stage('game-site-ui-ux-audit-optimizer', 'NOT_STARTED'),
    stage('game-site-prelaunch-gate', 'NOT_STARTED'),
    stage('game-site-deploy-and-measurement', 'NOT_STARTED'),
    stage('game-site-advertising', 'SKIPPED'),
  ];
  stages[3].artifacts = [{ kind: 'ROUTE_PUBLICATION_MANIFEST.json', sha256: d('1') }];
  stages[3].checkpoint.launchReadiness = { bindingDigest: d('2') };
  return { schemaVersion: 1, runId: 'run', sequence: 4,
    inputs: { siteRevision: 'site-v1' }, deploymentExecuted: false, stages };
};

function remediatedFixture() {
  const transactionId = 'site-remediation-11111111-1111-4111-8111-111111111111';
  const projectDigest = d('6');
  const baseline = createCurrentSiteBaseline({ baselineKind: 'REACCEPTED_CURRENT_BASELINE',
    historicalEquivalence: false, digestPolicyVersion: 'project-content-v1',
    projectPath: '/project', files: [{ path: 'app/page.tsx', mode: 0o644,
      byteLength: 1, sha256: d('0') }], projectDigest, routes: ['/'],
    protectedInputs: [{ path: 'backgroundinformation/keywords.md', mode: 0o644,
      byteLength: 1, sha256: d('1') }],
    historicalEvidenceGaps: ['FINAL_STAGE4_INVENTORY_UNAVAILABLE'] });
  const publicationEvidence = createPublicationEvidenceBody({
    originalPublicationManifestSha256: d('1'), lineageDigest: d('9'),
    researchHandoffSha256: d('2'), researchApprovalDigest: d('3'),
    originalLaunchReadinessBindingDigest: d('2'), baselineKind: baseline.baselineKind,
    baselineDigest: baseline.baselineDigest, remediationScopeDigest: d('7'), projectDigest,
    observedRoutes: ['/'], pages: [{ route: '/', originalDisposition: 'PUBLISH',
      effectiveDisposition: 'PUBLISH', materialStatus: 'COMPLETED', robots: 'noindex',
      inSitemap: true, inNavigation: true, linkedFromPublicPages: true,
      sourceFileExposed: false, dynamicProof: 'STATIC' }], validationStatus: 'VERIFIED',
    indexingAuthorization: 'NOT_CLEARED', hostObservationDigest: d('8'),
    validatorVersion: 'host-route-v1' });
  const acceptanceIdentity = createSiteAcceptanceIdentity({ lineageDigest: d('9'),
    baselineDigest: baseline.baselineDigest, projectDigest,
    publicationEvidenceDigest: publicationEvidence.publicationEvidenceDigest,
    remediationScopeDigest: d('7'), transactionId });
  const attestation = createDerivedPublicationAttestation({ evidenceBody: publicationEvidence,
    acceptanceIdentity });
  const preview = { lineageDigest: d('9'), newProjectDigest: projectDigest,
    previewDigest: d('8'),
    baselineDigest: baseline.baselineDigest,
    publicationEvidenceDigest: publicationEvidence.publicationEvidenceDigest,
    remediationScopeDigest: d('7'), attestationDigest: attestation.attestationDigest,
    acceptanceRevision: acceptanceIdentity.acceptanceRevision,
    historicalEvidenceGaps: ['FINAL_STAGE4_INVENTORY_UNAVAILABLE'], transactionId };
  const intent = { postManifestSha256: d('e'), committedObjectDigests: [
    baseline.baselineDigest, publicationEvidence.publicationEvidenceDigest,
    attestation.attestationDigest, d('e'),
  ].sort() };
  const receipt = { receiptDigest: d('b'),
    acceptanceRevision: acceptanceIdentity.acceptanceRevision };
  const immutableObjects = { baseline, publicationEvidence, attestation,
    acceptanceIdentity };
  const current = manifest();
  current.siteAcceptance = { policyVersion: 'site-remediation-transaction-v1', transactionId,
    acceptanceRevision: acceptanceIdentity.acceptanceRevision,
    baselineDigest: baseline.baselineDigest, projectDigest,
    protectedInputsDigest: baseline.protectedInputsDigest, previewDigest: d('8'), acceptedAtMs: 1 };
  return { current, projectDigest, committed: { preview, intent, receipt, immutableObjects } };
}

test('ordinary acceptance is deterministic and does not claim remediation evidence', async () => {
  const value = await resolveEffectiveSiteAcceptance({ manifest: manifest(),
    runDirectory: '/unused', projectDigest: d('3') });
  assert.equal(value.mode, 'ORDINARY');
  assert.equal(value.projectDigest, d('3'));
  assert.equal(value.baselineDigest, null);
  assert.equal(value.receiptDigest, null);
  assert.equal(verifyEffectiveSiteAcceptance(value), value);
  assert.deepEqual(value.unresolvedBlockers, []);
});

test('remediated acceptance binds the committed receipt and current project', async () => {
  const { current, committed, projectDigest } = remediatedFixture();
  const value = await resolveEffectiveSiteAcceptance({ manifest: current,
    runDirectory: '/run', projectDigest, verifyCommitted: async () => committed });
  assert.equal(value.mode, 'REMEDIATED');
  assert.equal(value.receiptDigest, d('b'));
  assert.equal(value.attestationDigest, committed.immutableObjects.attestation.attestationDigest);
  assert.equal(value.launchReadiness, 'NOT_CLEARED');
  assert.deepEqual(value.unresolvedBlockers, [
    'CURRENT_LAUNCH_READINESS_REVALIDATION_REQUIRED',
    'FINAL_STAGE4_INVENTORY_UNAVAILABLE',
  ]);
});

test('remediated acceptance rejects stale project and substituted receipt identity', async () => {
  const { current, committed, projectDigest } = remediatedFixture();
  const verifyCommitted = async () => ({ ...committed,
    receipt: { ...committed.receipt, acceptanceRevision: d('f') } });
  await assert.rejects(() => resolveEffectiveSiteAcceptance({ manifest: current,
    runDirectory: '/run', projectDigest: d('0'), verifyCommitted }),
  error => error.code === 'EFFECTIVE_SITE_ACCEPTANCE_STALE');
  await assert.rejects(() => resolveEffectiveSiteAcceptance({ manifest: current,
    runDirectory: '/run', projectDigest, verifyCommitted }),
  error => error.code === 'EFFECTIVE_SITE_ACCEPTANCE_INVALID');
});

test('remediated acceptance rejects missing or substituted immutable evidence objects', async () => {
  const { current, committed, projectDigest } = remediatedFixture();
  await assert.rejects(() => resolveEffectiveSiteAcceptance({ manifest: current,
    runDirectory: '/run', projectDigest,
    verifyCommitted: async () => ({ ...committed, immutableObjects: null }) }),
  error => error.code === 'EFFECTIVE_SITE_ACCEPTANCE_INVALID');
  await assert.rejects(() => resolveEffectiveSiteAcceptance({ manifest: current,
    runDirectory: '/run', projectDigest,
    verifyCommitted: async () => ({ ...committed, immutableObjects: {
      ...committed.immutableObjects,
      attestation: { ...committed.immutableObjects.attestation, attestationDigest: d('f') },
    } }) }),
  error => ['PUBLICATION_ATTESTATION_DIGEST_MISMATCH',
    'EFFECTIVE_SITE_ACCEPTANCE_INVALID'].includes(error.code));
});

test('effective acceptance digest rejects mutation', async () => {
  const value = await resolveEffectiveSiteAcceptance({ manifest: manifest(),
    runDirectory: '/unused', projectDigest: d('3') });
  assert.throws(() => verifyEffectiveSiteAcceptance({ ...value, projectDigest: d('f') }),
    error => error.code === 'EFFECTIVE_SITE_ACCEPTANCE_DIGEST_MISMATCH');
});
