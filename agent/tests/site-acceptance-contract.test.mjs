import test from 'node:test';
import assert from 'node:assert/strict';
import { contractDefinition, validateContract } from '../src/contracts/registry.mjs';
import {
  canonicalContractDigest,
  createCurrentSiteBaseline,
  createImmutableIntegrationLineage,
  createSiteAcceptanceIdentity,
  verifyCurrentSiteBaseline,
  verifyImmutableIntegrationLineage,
  verifySiteAcceptanceIdentity,
} from '../src/site-acceptance-contract.mjs';

const digest = character => character.repeat(64);
const contracts = [
  ['IMMUTABLE_INTEGRATION_LINEAGE', 1],
  ['CURRENT_SITE_BASELINE', 1],
  ['SITE_ACCEPTANCE_IDENTITY', 1],
  ['SITE_REACCEPTANCE_AUTHORIZATION', 1],
  ['SITE_REACCEPTANCE_AUTHORIZATION_RESERVATION', 1],
  ['SITE_REACCEPTANCE_AUTHORIZATION_CONSUMPTION', 1],
  ['PUBLICATION_EVIDENCE_BODY', 1],
  ['DERIVED_PUBLICATION_ATTESTATION', 1],
];

test('PR-A contracts are registered as closed versioned schemas', () => {
  for (const [kind, version] of contracts) {
    const definition = contractDefinition(kind, version);
    assert.equal(definition.kind, kind);
    assert.equal(definition.schema.additionalProperties, false);
  }
  assert.throws(() => validateContract('SITE_ACCEPTANCE_IDENTITY', 1, {
    kind: 'SITE_ACCEPTANCE_IDENTITY', schemaVersion: 1, unexpected: digest('a'),
  }), error => error.code === 'CONTRACT_SCHEMA_INVALID');
});

const d = value => value.repeat(64).slice(0, 64);
const lineageInput = {
  runId: 'wallpaper-engine-002', siteRevision: 'v1', manifestSequence: 219,
  manifestSha256: d('a'), researchHandoffSha256: d('b'), researchApprovalDigest: d('c'),
  stage3CheckpointDigest: d('d'), stage3ArtifactDigests: [d('e')],
  stage4CheckpointDigest: d('f'), stage4ArtifactDigests: [d('1')],
  originalPublicationManifestSha256: d('2'), originalLaunchReadinessBindingDigest: d('3'),
  finalizedTransactionDigest: d('4'),
};
const baselineInput = {
  baselineKind: 'REACCEPTED_CURRENT_BASELINE', historicalEquivalence: false,
  digestPolicyVersion: 'project-content-v1', projectPath: '/site',
  files: [{ path: 'app/page.tsx', mode: 0o644, byteLength: 4, sha256: d('5') }],
  projectDigest: d('6'), routes: ['/'],
  protectedInputs: [{
    path: 'backgroundinformation/keywords.md', mode: 0o400, byteLength: 4, sha256: d('7'),
  }],
  historicalEvidenceGaps: ['FINAL_STAGE4_INVENTORY_UNAVAILABLE'],
};

test('lineage and baseline digests are canonical and independently verified', () => {
  const lineage = createImmutableIntegrationLineage(lineageInput);
  const reordered = createImmutableIntegrationLineage(
    Object.fromEntries(Object.entries(lineageInput).reverse()),
  );
  assert.equal(lineage.lineageDigest, reordered.lineageDigest);
  assert.equal(verifyImmutableIntegrationLineage(lineage), lineage);
  const baseline = createCurrentSiteBaseline(baselineInput);
  assert.equal(verifyCurrentSiteBaseline(baseline), baseline);
  assert.throws(() => verifyCurrentSiteBaseline({ ...baseline, projectDigest: d('8') }),
    error => error.code === 'SITE_ACCEPTANCE_DIGEST_MISMATCH');
});

test('legacy baseline cannot claim historical equivalence', () => {
  assert.throws(() => createCurrentSiteBaseline({ ...baselineInput, historicalEquivalence: true }),
    error => error.code === 'SITE_ACCEPTANCE_LEGACY_EQUIVALENCE_INVALID');
});

test('acceptance identity binds stable preview transaction identity and publication evidence', () => {
  const lineage = createImmutableIntegrationLineage(lineageInput);
  const baseline = createCurrentSiteBaseline(baselineInput);
  const identity = createSiteAcceptanceIdentity({ lineageDigest: lineage.lineageDigest,
    baselineDigest: baseline.baselineDigest, projectDigest: baseline.projectDigest,
    publicationEvidenceDigest: d('9'), remediationScopeDigest: d('a'),
    transactionId: 'site-remediation-11111111-1111-4111-8111-111111111111' });
  assert.equal(verifySiteAcceptanceIdentity(identity), identity);
  assert.throws(() => verifySiteAcceptanceIdentity({ ...identity, transactionId:
    'site-remediation-22222222-2222-4222-8222-222222222222' }),
  error => error.code === 'SITE_ACCEPTANCE_DIGEST_MISMATCH');
});

test('canonical digest rejects cycles before serialization', () => {
  const cyclic = {};
  cyclic.self = cyclic;
  assert.throws(() => canonicalContractDigest('TEST_VALUE_V1', cyclic),
    error => error.code === 'SITE_ACCEPTANCE_CYCLE');
});
