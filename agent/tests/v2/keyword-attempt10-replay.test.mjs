import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanonicalHandoff } from '../../src/handoff-v2/canonical-handoff.mjs';
import {
  keywordReplayPayloadDigest,
  replayKeywordResearchAttempt,
} from '../../src/v2/adapters/keyword-research.mjs';

const fixtureRoot = fileURLToPath(new URL('../fixtures/regressions/attempt-10-material-gap-format/', import.meta.url));
const sha = value => value.repeat(64);

async function fixture() {
  const fixtureManifest = JSON.parse(await readFile(join(fixtureRoot, 'fixture-manifest.json'), 'utf8'));
  const expected = JSON.parse(await readFile(join(fixtureRoot, 'expected.json'), 'utf8'));
  const lineage = JSON.parse(await readFile(join(fixtureRoot, 'lineage.json'), 'utf8'));
  const materialBytes = new Map();
  for (const item of fixtureManifest.materials) {
    materialBytes.set(item.fixturePath, await readFile(join(fixtureRoot, item.fixturePath)));
  }
  return { fixtureManifest, expected, lineage, materialBytes };
}

test('attempt 10 replay produces a trusted canonical result without upgrading content authority', async () => {
  const payload = await fixture();
  const payloadDigest = keywordReplayPayloadDigest(payload);
  const adapterInput = { kind: 'STAGE_ADAPTER_INPUT', schemaVersion: 1, producer: 'V2_OFFLINE_HOST', mode: 'OFFLINE',
    runId: 'wallpaper-engine-002', canonicalStageId: 'keyword-research', mappingVersion: 'stage-identity-v1',
    contextDigest: sha('a'), featureGate: 'shadow', gateBindingDigest: sha('b'), payloadDigest };
  const replay = replayKeywordResearchAttempt({ adapterInput, sourceAttempt: 10, ...payload,
    recoveryDigest: sha('c'), schemaBundleDigest: sha('d'), evidenceOutcomeDigest: sha('e'),
    siteRevision: sha('f'), domain: 'wallpaper-engine.example' });

  assert.deepEqual(replay.summary.statusCounts, { COMPLETED: 2, PARTIAL: 25, BLOCKED: 4 });
  assert.deepEqual(replay.summary.contractValidityCounts, { VALID: 29, INVALID: 2 });
  assert.deepEqual(replay.summary.contractIncompatibleFiles, [
    'Wallpaper Engine Steam ID素材.md',
    'Wallpaper Engine for mac素材.md',
  ]);
  assert.equal(replay.summary.unresolvedGapCount, 68);
  assert.equal(replay.summary.unclassifiedItemCount, 2);
  assert.deepEqual(replay.validatedResult.pendingRows, [36, 84, 96, 100]);
  assert.equal(replay.validatedResult.materials.length, 31);
  assert.equal(new Set(replay.validatedResult.materials.map(item => item.keyword)).size, 31);
  assert.ok(replay.validatedResult.materials.every(item => item.contentAccepted === false));
  assert.equal(replay.stageResult.canonicalStageId, 'keyword-research');
  assert.equal(replay.stageResult.authoritative, false);
  assert.equal(replay.stageResult.status, 'PARTIAL');
  assert.deepEqual(replay.identitySnapshot, {
    kind: 'KEYWORD_LEGACY_SNAPSHOT', schemaVersion: 1, producer: 'V2_OFFLINE_HOST', mode: 'OFFLINE',
    runId: 'wallpaper-engine-002', contextDigest: sha('a'), schemaBundleDigest: sha('d'), recoveryDigest: sha('c'), mappingVersion: 'stage-identity-v1',
    canonicalStageId: 'keyword-research', originalNamespace: 'p3-shadow-alias', originalValue: 'stage-2',
    legacySkillName: 'game-innerpage-keyword-information-research', legacyArrayIndex: 1, sourceAttempt: 10,
    sourceDigest: replay.identitySnapshot.sourceDigest, snapshotDigest: replay.identitySnapshot.snapshotDigest,
  });

  const handoff = createCanonicalHandoff({ validatedInput: replay.validatedResult, consumerStage: 'stage-3' });
  const dispositions = Object.groupBy(handoff.materials, item => item.publicationEligibility);
  assert.equal(dispositions.UNPROVEN.length, 2);
  assert.equal(dispositions.DRAFT_ONLY.length, 25);
  assert.equal(dispositions.OMIT.length, 4);
  assert.equal(handoff.authorizationStatus, 'REQUIRED');
});

test('attempt 10 replay rejects digest drift and non-canonical stage identities', async () => {
  const payload = await fixture();
  const base = { kind: 'STAGE_ADAPTER_INPUT', schemaVersion: 1, producer: 'V2_OFFLINE_HOST', mode: 'OFFLINE',
    runId: 'wallpaper-engine-002', canonicalStageId: 'keyword-research', mappingVersion: 'stage-identity-v1',
    contextDigest: sha('a'), featureGate: 'shadow', gateBindingDigest: sha('b'),
    payloadDigest: keywordReplayPayloadDigest(payload) };
  const options = { sourceAttempt: 10, ...payload, recoveryDigest: sha('c'), schemaBundleDigest: sha('d'),
    evidenceOutcomeDigest: sha('e'), siteRevision: sha('f'), domain: 'wallpaper-engine.example' };
  assert.throws(() => replayKeywordResearchAttempt({ adapterInput: { ...base, payloadDigest: sha('0') }, ...options }),
    error => error.code === 'CONTRACT_DIGEST_MISMATCH');
  assert.throws(() => replayKeywordResearchAttempt({ adapterInput: { ...base, canonicalStageId: 'stage-2' }, ...options }),
    error => ['CONTRACT_SCHEMA_INVALID', 'STAGE_ID_NON_CANONICAL'].includes(error.code));
  const first = payload.fixtureManifest.materials[0];
  payload.materialBytes.set(first.fixturePath, Buffer.from('tampered'));
  assert.throws(() => replayKeywordResearchAttempt({ adapterInput: base, ...options, materialBytes: payload.materialBytes }),
    error => error.code === 'CONTRACT_DIGEST_MISMATCH');
});
