import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STAGE_IDENTITY_MAPPING_VERSION,
  assertCanonicalStageId,
  buildStageIdentityTable,
  coreStageIdentities,
  extensionStageIdentities,
  resolveStageIdentity,
  stageIdentityTable,
  stageIdentityValue,
} from '../../src/v2/stage-identity.mjs';
import { stageRegistry } from '../../src/v2/stage-registry.mjs';
import { ALL_STAGES, STAGES, stageName } from '../../src/stages.mjs';

const expected = [
  ['homepage-research', 'game-homepage-icon-research', 0, 'stage-1', true],
  ['keyword-research', 'game-innerpage-keyword-information-research', 1, 'stage-2', true],
  ['template-selection', 'game-site-template-selector', 2, 'stage-3', true],
  ['content-integration', 'game-site-content-integrator', 3, 'stage-4', true],
  ['ui-ux-audit', 'game-site-ui-ux-audit-optimizer', 4, 'stage-5', true],
  ['prelaunch-acceptance', 'game-site-prelaunch-gate', 5, 'stage-6', true],
  ['deployment-plan', 'game-site-deploy-and-measurement', 6, 'stage-7', true],
  ['advertising-plan', 'game-site-adsterra-ad-integration', 7, 'stage-8', false],
];

test('stage-identity-v1 maps all eight identities through explicit namespaces', () => {
  assert.equal(STAGE_IDENTITY_MAPPING_VERSION, 'stage-identity-v1');
  assert.equal(stageIdentityTable.length, 8);
  for (const [canonicalStageId, legacySkillName, legacyArrayIndex, shadowAlias, coreStage] of expected) {
    const identity = resolveStageIdentity({
      namespace: 'canonical-stage-id', value: canonicalStageId,
      mappingVersion: STAGE_IDENTITY_MAPPING_VERSION,
    });
    assert.deepEqual(identity, {
      mappingVersion: STAGE_IDENTITY_MAPPING_VERSION,
      canonicalStageId, legacySkillName, legacyArrayIndex, shadowAlias, coreStage,
    });
    assert.equal(resolveStageIdentity({ namespace: 'legacy-skill-name', value: legacySkillName }).canonicalStageId,
      canonicalStageId);
    assert.equal(resolveStageIdentity({ namespace: 'legacy-array-index', value: legacyArrayIndex }).canonicalStageId,
      canonicalStageId);
    assert.equal(resolveStageIdentity({ namespace: 'p3-shadow-alias', value: shadowAlias }).canonicalStageId,
      canonicalStageId);
    assert.equal(stageIdentityValue({ canonicalStageId, namespace: 'legacy-skill-name' }), legacySkillName);
    assert.equal(stageIdentityValue({ canonicalStageId, namespace: 'legacy-array-index' }), legacyArrayIndex);
    assert.equal(stageIdentityValue({ canonicalStageId, namespace: 'p3-shadow-alias' }), shadowAlias);
  }
  assert.equal(Object.isFrozen(stageIdentityTable), true);
  assert.equal(Object.isFrozen(stageIdentityTable[0]), true);
});

test('identity conversion rejects implicit namespaces, unknown values and version drift', () => {
  for (const request of [
    { value: 0 },
    { namespace: 'legacy-array-index', value: '0' },
    { namespace: 'p3-shadow-alias', value: 0 },
  ]) {
    assert.throws(() => resolveStageIdentity(request), error =>
      error.code === (request.namespace ? 'STAGE_ID_UNKNOWN' : 'STAGE_ID_NAMESPACE_REQUIRED'));
  }
  assert.throws(() => resolveStageIdentity({ namespace: 'legacy-array-index', value: 99 }), error =>
    error.code === 'STAGE_ID_UNKNOWN');
  assert.throws(() => resolveStageIdentity({
    namespace: 'canonical-stage-id', value: 'keyword-research', mappingVersion: 'stage-identity-v2',
  }), error => error.code === 'STAGE_ID_MAPPING_VERSION_MISMATCH');
  assert.throws(() => assertCanonicalStageId('game-innerpage-keyword-information-research'), error =>
    error.code === 'STAGE_ID_NON_CANONICAL');
});

test('custom identity tables fail closed on every duplicate namespace', () => {
  for (const key of ['canonicalStageId', 'legacySkillName', 'legacyArrayIndex', 'shadowAlias']) {
    const duplicate = expected.slice(0, 2).map((row, index) => ({
      mappingVersion: STAGE_IDENTITY_MAPPING_VERSION,
      canonicalStageId: row[0], legacySkillName: row[1], legacyArrayIndex: row[2], shadowAlias: row[3],
      coreStage: row[4],
      ...(index === 1 ? { [key]: expected[0][key === 'canonicalStageId' ? 0 : key === 'legacySkillName' ? 1 :
        key === 'legacyArrayIndex' ? 2 : 3] } : {}),
    }));
    assert.throws(() => buildStageIdentityTable(duplicate), error => error.code === 'STAGE_ID_AMBIGUOUS');
  }
});

test('custom identity tables require the exact mapping version', () => {
  const [canonicalStageId, legacySkillName, legacyArrayIndex, shadowAlias, coreStage] = expected[0];
  assert.throws(() => buildStageIdentityTable([{
    canonicalStageId, legacySkillName, legacyArrayIndex, shadowAlias, coreStage,
  }]), error => error.code === 'STAGE_ID_MAPPING_VERSION_MISMATCH');
});

test('registry exposes exactly seven core stages and isolates advertising', () => {
  assert.equal(coreStageIdentities.length, 7);
  assert.equal(extensionStageIdentities.length, 1);
  assert.deepEqual(coreStageIdentities.map(item => item.legacySkillName), STAGES);
  assert.deepEqual(stageIdentityTable.map(item => item.legacySkillName), ALL_STAGES);
  assert.deepEqual(stageRegistry.core.map(item => item.canonicalStageId), expected.slice(0, 7).map(row => row[0]));
  assert.deepEqual(stageRegistry.extensions.map(item => item.canonicalStageId), ['advertising-plan']);
  assert.equal(stageRegistry.isCore('advertising-plan'), false);
  assert.throws(() => stageRegistry.requireCore('advertising-plan'), error => error.code === 'STAGE_NOT_CORE');
  assert.equal(stageName(0), 'game-homepage-icon-research');
  assert.equal(stageName('game-innerpage-keyword-information-research'),
    'game-innerpage-keyword-information-research');
});
