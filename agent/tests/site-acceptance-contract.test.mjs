import test from 'node:test';
import assert from 'node:assert/strict';
import { contractDefinition, validateContract } from '../src/contracts/registry.mjs';
import {
  canonicalContractDigest,
  createAuthorizationConsumption,
  createAuthorizationReservation,
  createCurrentSiteBaseline,
  createImmutableIntegrationLineage,
  createSiteReacceptanceAuthorization,
  createSiteAcceptanceIdentity,
  verifyAuthorizationConsumption,
  verifyAuthorizationReservation,
  verifyCurrentSiteBaseline,
  verifyImmutableIntegrationLineage,
  verifySiteReacceptanceAuthorization,
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

test('baseline verification rejects reordered arrays even with recomputed digests', () => {
  const baseline = createCurrentSiteBaseline({
    ...baselineInput,
    files: [
      ...baselineInput.files,
      { path: 'app/layout.tsx', mode: 0o644, byteLength: 8, sha256: d('8') },
    ],
    routes: ['/', '/en/'],
    protectedInputs: [
      ...baselineInput.protectedInputs,
      { path: 'backgroundinformation/icon.png', mode: 0o400, byteLength: 8,
        sha256: d('9') },
    ],
    historicalEvidenceGaps: [
      'FINAL_STAGE4_INVENTORY_UNAVAILABLE',
      'ORIGINAL_CHANGE_AUTHORIZATION_UNAVAILABLE',
    ],
  });

  for (const [field, digestField, tag] of [
    ['files', 'inventoryDigest', 'SITE_FILE_INVENTORY_V1'],
    ['routes', 'routeInventoryDigest', 'SITE_ROUTE_INVENTORY_V1'],
    ['protectedInputs', 'protectedInputsDigest', 'SITE_PROTECTED_INPUTS_V1'],
    ['historicalEvidenceGaps', null, null],
  ]) {
    const { baselineDigest: _baselineDigest, ...canonicalBody } = baseline;
    const body = {
      ...canonicalBody,
      [field]: [...baseline[field]].reverse(),
    };
    if (digestField) body[digestField] = canonicalContractDigest(tag, body[field]);
    const reordered = {
      ...body,
      baselineDigest: canonicalContractDigest('CURRENT_SITE_BASELINE_V1', body),
    };
    assert.throws(() => verifyCurrentSiteBaseline(reordered),
      error => error.code === 'SITE_ACCEPTANCE_NON_CANONICAL');
  }
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

test('authorization fixes one preview-bound transaction identity', () => {
  const authorization = createSiteReacceptanceAuthorization({
    runId: 'wallpaper-engine-002',
    previewId: '11111111-1111-4111-8111-111111111111',
    previewSnapshotSha256: d('1'), manifestSequence: 219, manifestSha256: d('2'),
    mode: 'LEGACY_CURRENT_BASELINE', lineageDigest: d('3'), oldProjectDigest: d('4'),
    newProjectDigest: d('5'), baselineDigest: d('6'), remediationScopeDigest: d('7'),
    publicationEvidenceDigest: d('8'), attestationDigest: d('9'), acceptanceRevision: d('a'),
    operatorSummarySha256: d('b'),
    transactionId: 'site-remediation-11111111-1111-4111-8111-111111111111',
  });
  assert.equal(verifySiteReacceptanceAuthorization(authorization), authorization);
  const reservation = createAuthorizationReservation({ authorization,
    confirmationIdentity: 'preview-snapshot:11111111-1111-4111-8111-111111111111',
    intentDigest: d('c'), reservedAtMs: 1 });
  assert.equal(verifyAuthorizationReservation(reservation, { authorization }), reservation);
  const consumption = createAuthorizationConsumption({ authorization, reservation,
    preManifestSha256: d('2'), postManifestSha256: d('d'), committedSequence: 220,
    acceptanceRevision: authorization.acceptanceRevision,
    committedObjectDigests: [d('e'), d('f')], consumedAtMs: 2 });
  assert.equal(verifyAuthorizationConsumption(consumption, { authorization, reservation,
    expectedPostState: {
      postManifestSha256: d('d'), committedSequence: 220,
      acceptanceRevision: authorization.acceptanceRevision,
      committedObjectDigests: [d('e'), d('f')],
    },
  }), consumption);
});

test('consumption verification requires and matches trusted expected post-state', () => {
  const authorization = createSiteReacceptanceAuthorization({ runId: 'run',
    previewId: '11111111-1111-4111-8111-111111111111', previewSnapshotSha256: d('1'),
    manifestSequence: 1, manifestSha256: d('2'), mode: 'EXACT_REMEDIATION',
    lineageDigest: d('3'), oldProjectDigest: d('4'), newProjectDigest: d('5'),
    baselineDigest: d('6'), remediationScopeDigest: d('7'), publicationEvidenceDigest: d('8'),
    attestationDigest: d('9'), acceptanceRevision: d('a'), operatorSummarySha256: d('b'),
    transactionId: 'site-remediation-11111111-1111-4111-8111-111111111111' });
  const reservation = createAuthorizationReservation({ authorization,
    confirmationIdentity: 'interactive-confirmation', intentDigest: d('c'), reservedAtMs: 1 });
  const consumption = createAuthorizationConsumption({ authorization, reservation,
    preManifestSha256: d('2'), postManifestSha256: d('d'), committedSequence: 2,
    acceptanceRevision: d('a'), committedObjectDigests: [d('e')], consumedAtMs: 2 });

  assert.throws(() => verifyAuthorizationConsumption(consumption,
    { authorization, reservation }),
  error => error.code === 'SITE_ACCEPTANCE_POST_STATE_REQUIRED');
  assert.throws(() => verifyAuthorizationConsumption(consumption, {
    authorization,
    reservation,
    expectedPostState: {
      postManifestSha256: d('f'), committedSequence: 2,
      acceptanceRevision: d('a'), committedObjectDigests: [d('e')],
    },
  }), error => error.code === 'SITE_ACCEPTANCE_POST_STATE_MISMATCH');
});

test('reservation and consumption reject substituted transaction identities and replay', () => {
  const authorization = createSiteReacceptanceAuthorization({ runId: 'run',
    previewId: '11111111-1111-4111-8111-111111111111', previewSnapshotSha256: d('1'),
    manifestSequence: 1, manifestSha256: d('2'), mode: 'EXACT_REMEDIATION',
    lineageDigest: d('3'), oldProjectDigest: d('4'), newProjectDigest: d('5'),
    baselineDigest: d('6'), remediationScopeDigest: d('7'), publicationEvidenceDigest: d('8'),
    attestationDigest: d('9'), acceptanceRevision: d('a'), operatorSummarySha256: d('b'),
    transactionId: 'site-remediation-11111111-1111-4111-8111-111111111111' });
  const reservation = createAuthorizationReservation({ authorization,
    confirmationIdentity: 'interactive-confirmation', intentDigest: d('c'), reservedAtMs: 1 });
  assert.throws(() => verifyAuthorizationReservation({ ...reservation,
    transactionId: 'site-remediation-22222222-2222-4222-8222-222222222222' }, { authorization }),
  error => error.code === 'SITE_ACCEPTANCE_TRANSACTION_MISMATCH');
  assert.throws(() => createAuthorizationConsumption({ authorization, reservation,
    preManifestSha256: authorization.manifestSha256, postManifestSha256: d('d'),
    committedSequence: authorization.manifestSequence + 2,
    acceptanceRevision: authorization.acceptanceRevision,
    committedObjectDigests: [d('e')], consumedAtMs: 2 }),
  error => error.code === 'SITE_ACCEPTANCE_TRANSACTION_MISMATCH');
});

test('acceptance rejects every changed identity component', () => {
  const validAcceptanceInput = {
    lineageDigest: d('0'), baselineDigest: d('1'), projectDigest: d('2'),
    publicationEvidenceDigest: d('3'), remediationScopeDigest: d('4'),
    transactionId: 'site-remediation-11111111-1111-4111-8111-111111111111',
  };
  for (const [field, changed] of [
    ['lineageDigest', d('5')],
    ['baselineDigest', d('6')],
    ['projectDigest', d('7')],
    ['publicationEvidenceDigest', d('8')],
    ['remediationScopeDigest', d('9')],
  ]) {
    const identity = createSiteAcceptanceIdentity(validAcceptanceInput);
    assert.throws(() => verifySiteAcceptanceIdentity({ ...identity, [field]: changed }),
      error => error.code === 'SITE_ACCEPTANCE_DIGEST_MISMATCH');
  }
});

test('closed builders reject unknown and caller-supplied derived fields', () => {
  assert.throws(() => createImmutableIntegrationLineage({ ...lineageInput, unexpected: true }),
    error => error.code === 'CONTRACT_SCHEMA_INVALID');
  assert.throws(() => createImmutableIntegrationLineage({ ...lineageInput, lineageDigest: d('1') }),
    error => error.code === 'SITE_ACCEPTANCE_DERIVED_FIELD_INVALID');
  assert.throws(() => createCurrentSiteBaseline({ ...baselineInput, baselineDigest: d('2') }),
    error => error.code === 'SITE_ACCEPTANCE_DERIVED_FIELD_INVALID');
});

test('consumption rejects duplicate objects and a reservation from another authorization', () => {
  const input = { runId: 'run', previewId: '11111111-1111-4111-8111-111111111111',
    previewSnapshotSha256: d('1'), manifestSequence: 1, manifestSha256: d('2'),
    mode: 'EXACT_REMEDIATION', lineageDigest: d('3'), oldProjectDigest: d('4'),
    newProjectDigest: d('5'), baselineDigest: d('6'), remediationScopeDigest: d('7'),
    publicationEvidenceDigest: d('8'), attestationDigest: d('9'), acceptanceRevision: d('a'),
    operatorSummarySha256: d('b'),
    transactionId: 'site-remediation-11111111-1111-4111-8111-111111111111' };
  const authorization = createSiteReacceptanceAuthorization(input);
  const reservation = createAuthorizationReservation({ authorization,
    confirmationIdentity: 'interactive-confirmation', intentDigest: d('c'), reservedAtMs: 1 });
  assert.throws(() => createAuthorizationConsumption({ authorization, reservation,
    preManifestSha256: d('2'), postManifestSha256: d('d'), committedSequence: 2,
    acceptanceRevision: d('a'), committedObjectDigests: [d('e'), d('e')], consumedAtMs: 2 }),
  error => error.code === 'SITE_ACCEPTANCE_DUPLICATE');

  const otherAuthorization = createSiteReacceptanceAuthorization({ ...input,
    previewId: '22222222-2222-4222-8222-222222222222',
    transactionId: 'site-remediation-22222222-2222-4222-8222-222222222222' });
  assert.throws(() => verifyAuthorizationReservation(reservation,
    { authorization: otherAuthorization }),
  error => error.code === 'SITE_ACCEPTANCE_TRANSACTION_MISMATCH');
});
