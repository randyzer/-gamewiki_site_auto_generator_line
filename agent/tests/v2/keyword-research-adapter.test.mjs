import test from 'node:test';
import assert from 'node:assert/strict';
import { createEvidencePlan } from '../../src/evidence/evidence-contracts.mjs';
import { createCriterionId } from '../../src/evidence/task-identity.mjs';
import { assessArchivedKeywordEvidence } from '../../src/v2/host/evidence-adapter.mjs';
import { classifyShadowDiff } from '../../src/v2/shadow-diff-classifier.mjs';
import { createShadowDiff } from '../../src/v2/shadow-comparator.mjs';
import { contractDefinition, validateContract } from '../../src/contracts/registry.mjs';
import { createKeywordLegacyIdentityBinding,
  createKeywordLegacySnapshot } from '../../src/v2/keyword-legacy-snapshot.mjs';

const sha = value => value.repeat(64);

function trustedIdentitySnapshot(overrides = {}) {
  const fixtureManifest = { sourceAttempt: overrides.sourceAttempt ?? 10 };
  const expected = { status: 'partial' };
  const lineage = { pendingIds: [36, 84, 96, 100] };
  const legacyIdentity = createKeywordLegacyIdentityBinding({ fixtureManifest, expected, lineage,
    originalNamespace: 'p3-shadow-alias', originalValue: 'stage-2',
    sourceAttempt: overrides.sourceAttempt ?? 10 });
  const adapterInput = { runId: overrides.runId ?? 'wallpaper-engine-002',
    canonicalStageId: 'keyword-research', mappingVersion: 'stage-identity-v1',
    contextDigest: overrides.contextDigest ?? sha('a') };
  return createKeywordLegacySnapshot({ adapterInput, sourceAttempt: overrides.sourceAttempt ?? 10,
    schemaBundleDigest: sha('d'), recoveryDigest: sha('e'), fixtureManifest, expected, lineage,
    legacyIdentity });
}

test('offline evidence replay preserves T0 claims and never invokes paused providers', async () => {
  const statement = 'Obtain a current first-party subtitle transcript.';
  const criterionId = createCriterionId({ gapId: 'gap-aaaaaaaaaaaaaaaaaaaaaaaa', statement });
  const plan = createEvidencePlan({
    evidenceMode: 'SIMULATED', namespace: 'p5-c/attempt-10', runId: 'wallpaper-engine-002',
    stageId: 'stage-2', attemptId: 10, contextDigest: sha('a'), recoveryDigest: sha('b'), policyVersion: 1,
    serviceDecisions: [{ service: 'youtube-subtitles', decision: 'PAUSED' }],
    tasks: [{ keyword: 'Wallpaper Engine tutorial', gapId: 'gap-aaaaaaaaaaaaaaaaaaaaaaaa',
      tool: 'yt-dlp', target: 'youtube-subtitles', sourceTypes: ['YOUTUBE_TRANSCRIPT'], budgetUnits: 1,
      criteria: [{ criterionId, statement, requiresBody: true, requiresCurrentAccess: true, maxAgeMs: 1000 }] }],
  });
  let providerCalls = 0;
  const legacyClaims = { kind: 'KEYWORD_EVIDENCE_CLAIMS_V2', runId: plan.runId, stage: plan.stageId,
    recoverySha256: plan.recoveryDigest, tasks: [{ keyword: 'Wallpaper Engine tutorial', evidence: [],
      stopCondition: 'SERVICE_RESTRICTED' }] };
  const result = await assessArchivedKeywordEvidence({ plan, legacyClaims, boundNativeRoot: '/offline/native',
    artifactReader: async () => Buffer.alloc(0), providers: {
      'youtube-subtitles': async () => { providerCalls += 1; },
      fallback: async () => { providerCalls += 1; },
    } });
  assert.equal(providerCalls, 0);
  assert.equal(result.claim.trustLevel, 'T0');
  assert.equal(result.outcome.trustLevel, 'T3');
  assert.equal(result.outcome.tasks[0].classification, 'NO_PROGRESS');
  assert.deepEqual(result.observationReferences, []);
});

test('shadow diff contract is closed and all six classifications fail closed correctly', () => {
  const expected = {
    MATCH: false,
    EXPECTED_FORMAT_DIFFERENCE: false,
    LEGACY_DEFECT: false,
    V2_DEFECT: true,
    V2_INCOMPATIBLE: true,
    UNKNOWN: true,
  };
  for (const [diffClass, blocking] of Object.entries(expected)) {
    assert.equal(classifyShadowDiff({ diffClass }).blocking, blocking);
  }
  assert.equal(classifyShadowDiff({ diffClass: 'LEGACY_DEFECT', safetyImpact: true }).blocking, true);
  const report = createShadowDiff({ runId: 'wallpaper-engine-002', canonicalStageId: 'keyword-research',
    mappingVersion: 'stage-identity-v1', attemptId: 10, contextDigest: sha('a'),
    legacySnapshotDigest: sha('b'), v2ResultDigest: sha('c'), comparisons: [
      { fieldPath: '/statusCounts', diffClass: 'MATCH', legacyValue: { PARTIAL: 25 },
        v2Value: { PARTIAL: 25 }, reasonCode: 'COUNTS_EQUAL', evidenceReferences: ['expected.json'] },
      { fieldPath: '/authority', diffClass: 'V2_DEFECT', legacyValue: 'LEGACY', v2Value: 'V2',
        reasonCode: 'AUTHORITY_CHANGED', evidenceReferences: ['adapter-result'] },
    ] });
  assert.equal(report.authoritative, 'LEGACY');
  assert.equal(report.blocking, true);
  assert.equal(report.diffs.length, 2);
  assert.throws(() => createShadowDiff({ runId: 'wallpaper-engine-002', canonicalStageId: 'keyword-research',
    mappingVersion: 'stage-identity-v1', attemptId: 10, contextDigest: sha('a'),
    legacySnapshotDigest: sha('b'), v2ResultDigest: sha('c'), comparisons: [
      { fieldPath: '/status', diffClass: 'MATCH', legacyValue: 'PARTIAL', v2Value: 'COMPLETED',
        reasonCode: 'FALSE_MATCH', evidenceReferences: [] },
    ] }), error => error.code === 'SHADOW_DIFF_CLASSIFICATION_INVALID');
  assert.throws(() => createShadowDiff({ runId: 'wallpaper-engine-002', canonicalStageId: 'keyword-research',
    mappingVersion: 'stage-identity-v1', attemptId: 10, contextDigest: sha('a'),
    legacySnapshotDigest: sha('b'), v2ResultDigest: sha('c'), comparisons: [
      { fieldPath: '/stage', diffClass: 'EXPECTED_FORMAT_DIFFERENCE', legacyValue: 'wrong-stage',
        v2Value: 'keyword-research', formatRule: 'STAGE_IDENTITY_ALIAS', reasonCode: 'FALSE_FORMAT',
        evidenceReferences: [] },
    ] }), error => error.code === 'SHADOW_DIFF_CLASSIFICATION_INVALID');
  assert.throws(() => createShadowDiff({ runId: 'wallpaper-engine-002', canonicalStageId: 'keyword-research',
    mappingVersion: 'stage-identity-v1', attemptId: 10, contextDigest: sha('a'),
    legacySnapshotDigest: sha('b'), v2ResultDigest: sha('c'), comparisons: [
      { fieldPath: '/status', diffClass: 'EXPECTED_FORMAT_DIFFERENCE', legacyValue: 'stage-2',
        v2Value: 'keyword-research', formatRule: 'STAGE_IDENTITY_ALIAS', reasonCode: 'WRONG_FIELD',
        evidenceReferences: ['identity-snapshot'] },
    ] }), error => error.code === 'SHADOW_DIFF_CLASSIFICATION_INVALID');
  const identitySnapshot = trustedIdentitySnapshot();
  const identityFormat = createShadowDiff({ runId: 'wallpaper-engine-002', canonicalStageId: 'keyword-research',
    mappingVersion: 'stage-identity-v1', attemptId: 10, contextDigest: sha('a'),
    legacySnapshotDigest: identitySnapshot.snapshotDigest, identitySnapshot, v2ResultDigest: sha('c'), comparisons: [
      { fieldPath: '/identity/stage', diffClass: 'EXPECTED_FORMAT_DIFFERENCE', legacyValue: 'stage-2',
        v2Value: 'keyword-research', formatRule: 'STAGE_IDENTITY_ALIAS', reasonCode: 'EXPLICIT_ALIAS',
        evidenceReferences: ['identity-snapshot'] },
    ] });
  assert.equal(identityFormat.blocking, false);
  for (const mutation of [
    { identitySnapshot: structuredClone(identitySnapshot) },
    { identitySnapshot, legacySnapshotDigest: sha('0') },
    { identitySnapshot, runId: 'other-run' },
    { identitySnapshot, attemptId: 11 },
    { identitySnapshot, contextDigest: sha('9') },
  ]) {
    assert.throws(() => createShadowDiff({ runId: 'wallpaper-engine-002', canonicalStageId: 'keyword-research',
      mappingVersion: 'stage-identity-v1', attemptId: 10, contextDigest: sha('a'),
      legacySnapshotDigest: identitySnapshot.snapshotDigest, v2ResultDigest: sha('c'), ...mutation,
      comparisons: [{ fieldPath: '/identity/stage', diffClass: 'EXPECTED_FORMAT_DIFFERENCE',
        legacyValue: 'stage-2', v2Value: 'keyword-research', formatRule: 'STAGE_IDENTITY_ALIAS',
        reasonCode: 'EXPLICIT_ALIAS', evidenceReferences: ['identity-snapshot'] }] }),
    error => ['KEYWORD_LEGACY_SNAPSHOT_UNTRUSTED', 'CONTRACT_BINDING_MISMATCH'].includes(error.code));
  }
  assert.equal(classifyShadowDiff({ diffClass: 'LEGACY_DEFECT', fieldPath: '/publicationEligibility',
    safetyImpact: false }).blocking, true);
  assert.equal(contractDefinition('SHADOW_DIFF', 1).schema.additionalProperties, false);
  assert.throws(() => validateContract('SHADOW_DIFF', 1, { ...report, extra: true }),
    error => error.code === 'CONTRACT_SCHEMA_INVALID');
});
