import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contractDefinition, validateContract } from '../../src/contracts/registry.mjs';
import { createCanonicalHandoff, createTestValidatedInputHarness,
  assertConsumableHandoff } from '../../src/handoff-v2/canonical-handoff.mjs';
import { projectLegacyManifest } from '../../src/state/manifest-projector.mjs';
import { createStageCommitCandidate } from '../../src/state/stage-commit-candidate.mjs';
import { candidateInput } from '../state-helpers.mjs';

const agentRoot = fileURLToPath(new URL('../../', import.meta.url));
const historicalManifestPath = join(agentRoot, 'runs/wallpaper-engine-002/manifest.json');
const attempt10RecoveryPath = join(agentRoot,
  'runs/wallpaper-engine-002/keyword-recovery/10/f71097b7-f3b6-4cfc-b512-de91fb1f5d90/manifest.json');
const protectedAttempt10Digests = Object.freeze({
  manifest: '44aad1d5ed4746e8a71521e0943d48c97ba0060bc95ff767396a759c17dd3864',
  recovery: 'bc9b35a86851af43103846cb5c35b9a793e29faf0f159001d57dfa5009b60fa7',
});
const sha256 = value => createHash('sha256').update(value).digest('hex');
const sha = value => value.repeat(64);

test('published Stage Commit contracts contain object integrity but no artifact acceptance authority', () => {
  for (const [kind, version] of [
    ['STAGE_COMMIT_CANDIDATE', 1], ['STAGE_COMMIT_CANDIDATE', 2],
    ['STAGE_COMMIT_RECORD', 1], ['STAGE_COMMIT_RECORD', 2],
  ]) {
    const schema = contractDefinition(kind, version).schema;
    assert.equal(schema.additionalProperties, false);
    assert.ok(schema.properties.objects);
    for (const field of ['acceptedArtifactSetDigest', 'acceptedArtifacts', 'acceptance', 'artifactClass']) {
      assert.equal(Object.hasOwn(schema.properties, field), false, `${kind}:${version}:${field}`);
      assert.equal(Object.hasOwn(schema.properties.objects.items.properties, field), false,
        `${kind}:${version}:objects:${field}`);
    }
  }
});

test('candidate creation verifies staged bytes, digest, length and unique roles without accepting them', async t => {
  const root = await mkdtemp(join(tmpdir(), 'p6-f2-c3-b-candidate-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const input = await candidateInput(root);
  const candidate = await createStageCommitCandidate(input);
  assert.equal(candidate.objects.length, 1);
  assert.equal(candidate.objects[0].role, 'EVIDENCE_OUTCOME');
  assert.equal(Object.hasOwn(candidate, 'acceptedArtifactSetDigest'), false);
  assert.equal(Object.hasOwn(candidate.objects[0], 'acceptance'), false);

  await assert.rejects(createStageCommitCandidate({ ...input,
    objects: [{ ...input.objects[0], sha256: sha('0') }] }),
  error => error.code === 'CONTRACT_DIGEST_MISMATCH');
  await assert.rejects(createStageCommitCandidate({ ...input,
    objects: [{ ...input.objects[0], byteLength: input.objects[0].byteLength + 1 }] }),
  error => error.code === 'CONTRACT_DIGEST_MISMATCH');
  await assert.rejects(createStageCommitCandidate({ ...input,
    objects: [input.objects[0], { ...input.objects[0], sourcePath: input.objects[0].sourcePath }] }),
  error => error.code === 'STATE_CANDIDATE_INVALID');
});

test('legacy projection never upgrades partial, blocked, failed or waiting states to passed', () => {
  const state = (reason, artifact, gate = 'NOT_EVALUATED') => ({
    execution: { phase: 'STOPPED', reason }, artifact: { status: artifact },
    gate: { status: gate, approvalDigest: null },
  });
  const cases = [
    projectLegacyManifest({ state: state('PARTIAL', 'VALIDATED_PARTIAL', 'WAITING_FOR_APPROVAL') }),
    projectLegacyManifest({ state: state('BLOCKED', 'UNVERIFIED') }),
    projectLegacyManifest({ state: state('FAILED', 'UNVERIFIED') }),
    projectLegacyManifest({ state: state('SUCCEEDED', 'VALIDATED_COMPLETE', 'WAITING_FOR_APPROVAL') }),
  ];
  assert.deepEqual(cases.map(item => item.status),
    ['PARTIAL', 'BLOCKED', 'FAILED', 'WAITING_FOR_USER']);
  assert.ok(cases.every(item => item.stageSatisfied === false && item.downstreamAuthorized === false));
});

test('attempt-10 remains failed diagnostic recovery rather than accepted stage output', async t => {
  const [manifestBytes, recoveryBytes] = await Promise.all([
    readFile(historicalManifestPath).catch(error => error.code === 'ENOENT' ? null : Promise.reject(error)),
    readFile(attempt10RecoveryPath).catch(error => error.code === 'ENOENT' ? null : Promise.reject(error)),
  ]);
  if (manifestBytes === null || recoveryBytes === null) {
    t.skip('external attempt-10 run or recovery history is unavailable in this checkout');
    return;
  }
  assert.equal(sha256(manifestBytes), protectedAttempt10Digests.manifest);
  assert.equal(sha256(recoveryBytes), protectedAttempt10Digests.recovery);
  const manifest = JSON.parse(manifestBytes);
  const recovery = JSON.parse(recoveryBytes);
  assert.equal(manifest.stages[1].checkpoint.attempt, 10);
  assert.equal(manifest.stages[1].status, 'FAILED');
  assert.deepEqual(manifest.stages[1].artifacts, []);
  assert.equal(recovery.countsAsStageArtifact, false);
  assert.equal(recovery.contentValidated, false);
});

test('Accepted Artifact Set-shaped JSON has no registered production authority', () => {
  const proposed = {
    kind: 'ACCEPTED_ARTIFACT_SET', schemaVersion: 1, producer: 'PRODUCTION_ACCEPTANCE_AUTHORITY',
    runId: 'prospective-run', stageId: 'keyword-research', attemptId: 1,
    contextDigest: sha('1'), candidateDigest: sha('2'), artifacts: [], setDigest: sha('3'),
  };
  assert.throws(() => contractDefinition(proposed.kind, proposed.schemaVersion),
    error => error.code === 'CONTRACT_KIND_UNKNOWN');
  assert.throws(() => validateContract(proposed.kind, proposed.schemaVersion, proposed),
    error => error.code === 'CONTRACT_KIND_UNKNOWN');
});

test('existing handoff logic requires approval for partial content and excludes blocked content', () => {
  const validated = createTestValidatedInputHarness().validate({
    runId: 'prospective-accepted-set-run', stageId: 'stage-2', attemptId: 1,
    contextDigest: sha('4'), schemaBundleDigest: sha('5'), recoveryDigest: sha('6'),
    evidenceOutcomeDigest: sha('7'), siteRevision: sha('8'), domain: 'example.invalid', pendingRows: [],
    materials: [
      { keywordId: 'completed', keyword: 'completed', canonicalStatus: 'COMPLETED', gapIds: [],
        sourceDigest: sha('9'), contentAccepted: true },
      { keywordId: 'partial', keyword: 'partial', canonicalStatus: 'PARTIAL', gapIds: ['gap-1'],
        sourceDigest: sha('a'), contentAccepted: false },
      { keywordId: 'blocked', keyword: 'blocked', canonicalStatus: 'BLOCKED', gapIds: ['gap-2'],
        sourceDigest: sha('b'), contentAccepted: false },
    ],
  });
  const handoff = createCanonicalHandoff({ validatedInput: validated, consumerStage: 'stage-4' });
  assert.deepEqual(handoff.materials.map(item => item.publicationEligibility),
    ['ELIGIBLE', 'DRAFT_ONLY', 'OMIT']);
  assert.equal(handoff.authorizationStatus, 'REQUIRED');
  assert.throws(() => assertConsumableHandoff(handoff),
    error => error.code === 'HANDOFF_APPROVAL_REQUIRED');
});

test.todo('a future Accepted Artifact Set contains only formally ACCEPTED business objects');
test.todo('future accepted entries exactly match descriptors in the same committed candidate');
test.todo('future acceptance rejects duplicate roles, missing references and digest or length drift');
test.todo('an orphan Accepted Artifact Set is never authoritative before a verified Stage Commit');
test.todo('recovery, diagnostics and simulated validation never gain production acceptance authority');
test.todo('crash recovery and legacy projection reconstruct acceptance only from a verified committed set');
