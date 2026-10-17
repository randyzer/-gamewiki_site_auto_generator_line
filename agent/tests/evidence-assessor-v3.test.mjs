import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sha256 } from '../src/files.mjs';
import { createEvidencePlan, createEvidenceClaim } from '../src/evidence/evidence-contracts.mjs';
import { createCriterionId } from '../src/evidence/task-identity.mjs';
import { assessEvidence } from '../src/evidence/evidence-assessor.mjs';
import { compareEvidenceShadow } from '../src/evidence/evidence-shadow.mjs';
import { createHostEvidenceBroker } from '../src/evidence/host-evidence-broker.mjs';
import { createResearchToolPolicy } from '../src/evidence/research-tool-policy.mjs';
import { adaptKeywordEvidenceClaimsV2 } from '../src/contracts/adapters/keyword-evidence-v2.mjs';

const digest = character => character.repeat(64);
const binding = { runId: 'wallpaper-engine-002', stageId: 'game-innerpage-keyword-information-research',
  attemptId: 10, contextDigest: digest('a'), recoveryDigest: digest('b'), policyVersion: 3 };
const statement = 'Steam US price is shown in USD.';
const gapId = 'gap-1234567890abcdef12345678';

function fixture() {
  const criterionId = createCriterionId({ gapId, statement });
  const plan = createEvidencePlan({ ...binding, evidenceMode: 'SIMULATED', namespace: 'simulation/p2',
    serviceDecisions: [], tasks: [{ keyword: 'Wallpaper Engine price', gapId, tool: 'public-page',
      target: 'https://store.steampowered.com/app/431960/?cc=us',
      sourceTypes: ['PLATFORM_FIRST_PARTY'], budgetUnits: 1,
      criteria: [{ criterionId, statement, requiresBody: true,
        requiresCurrentAccess: true, maxAgeMs: 60_000 }] }] });
  const bytes = Buffer.from('price body');
  const evidence = { path: 'evidence/price.txt', url: plan.tasks[0].target,
    sha256: sha256(bytes), accessResult: 'HTTP_200', sourceType: 'PLATFORM_FIRST_PARTY',
    criterionIds: [criterionId] };
  const claim = createEvidenceClaim({ ...binding, planDigest: plan.planDigest,
    sourceFormat: 'V3', diagnostics: [], tasks: [{ taskId: plan.tasks[0].taskId,
      attempted: true, evidence: [evidence], stopCondition: null }] });
  const observation = { kind: 'HOST_OBSERVATION', schemaVersion: 1,
    producer: 'HOST_EVIDENCE_BROKER', trustLevel: 'T2', evidenceMode: 'SIMULATED',
    namespace: 'simulation/p2', ...binding, planDigest: plan.planDigest,
    observationId: `obs-${'1'.repeat(24)}`, taskId: plan.tasks[0].taskId,
    tool: plan.tasks[0].tool, target: plan.tasks[0].target, startedAtMs: 1000, endedAtMs: 1001,
    accessResult: 'HTTP_200', artifacts: [evidence], criterionIds: [criterionId] };
  return { plan, claim, observation, bytes, criterionId };
}

async function trustedObservation(plan, { accessResult = 'HTTP_200', artifacts,
  stopCondition, nowMs = () => 1000, bytes = Buffer.from('price body') } = {}) {
  const rootDirectory = await mkdtemp(join(tmpdir(), 'assessor-store-'));
  const broker = createHostEvidenceBroker({ rootDirectory,
    namespace: 'simulation/p2', evidenceMode: 'SIMULATED' });
  const task = plan.tasks[0];
  const descriptors = artifacts ?? [{ path: 'evidence/price.txt', url: task.target,
    sourceType: task.sourceTypes[0], criterionIds: [task.criteria[0].criterionId] }];
  const toolAdapter = { id: task.tool, kind: 'FAKE_TOOL_ADAPTER', evidenceMode: 'SIMULATED',
    async execute() { return { accessResult, stopCondition,
      artifacts: descriptors.map(item => ({ path: item.path, url: item.url,
        bytes, sourceType: item.sourceType, criterionIds: item.criterionIds })) }; } };
  const policy = createResearchToolPolicy({ policyVersion: plan.policyVersion,
    allowedTools: [task.tool], allowedTargets: [task.target],
    serviceDecisions: plan.serviceDecisions, budgetUnits: task.budgetUnits });
  const reference = await broker.observe({ plan, task,
    authorization: { purpose: 'RUN_EXECUTION', contextDigest: plan.contextDigest,
      serviceResumes: plan.serviceDecisions.filter(item => item.decision === 'RESUME_APPROVED')
        .map(item => item.service) }, toolAdapter, policy, nowMs });
  return { observationStore: broker.observationStore, observationReferences: [reference] };
}

test('Claim without a trusted host observation remains NO_PROGRESS', async () => {
  const f = fixture();
  const outcome = await assessEvidence({ plan: f.plan, claim: f.claim, observationReferences: [],
    artifactReader: async () => f.bytes, nowMs: 2000, expectedEvidenceMode: 'SIMULATED' });
  assert.equal(outcome.tasks[0].classification, 'NO_PROGRESS');
  assert.equal(outcome.tasks[0].criteria[0].status, 'UNVERIFIED');
});

test('Only an exactly bound observation and file closes its criterion', async () => {
  const f = fixture();
  const trusted = await trustedObservation(f.plan);
  const outcome = await assessEvidence({ plan: f.plan, claim: f.claim,
    ...trusted, artifactReader: async path => {
      assert.equal(path, 'evidence/price.txt'); return f.bytes;
    }, nowMs: 2000, expectedEvidenceMode: 'SIMULATED' });
  assert.equal(outcome.tasks[0].classification, 'GAP_RESOLVED');
  assert.equal(outcome.tasks[0].criteria[0].status, 'VERIFIED');
  await assert.rejects(() => assessEvidence({ plan: f.plan, claim: f.claim, ...trusted,
    artifactReader: async () => Buffer.from('tampered'),
    nowMs: 2000, expectedEvidenceMode: 'SIMULATED' }),
  error => error.code === 'CONTRACT_DIGEST_MISMATCH');
});

test('Simulated observations are rejected by production assessment', async () => {
  const f = fixture();
  const trusted = await trustedObservation(f.plan);
  await assert.rejects(() => assessEvidence({ plan: f.plan, claim: f.claim, ...trusted,
    artifactReader: async () => f.bytes,
    nowMs: 2000, expectedEvidenceMode: 'PRODUCTION' }),
  error => error.code === 'TRUST_LEVEL_INSUFFICIENT');
});

test('Observation replay across attempts and evidence URL mismatch are rejected', async () => {
  const f = fixture();
  const replay = await trustedObservation(f.plan);
  const replayBinding = { ...binding, attemptId: 11 };
  const replayCriterionId = createCriterionId({ gapId, statement });
  const replayPlan = createEvidencePlan({ ...replayBinding, evidenceMode: 'SIMULATED',
    namespace: 'simulation/p2', serviceDecisions: [], tasks: [{
      keyword: 'Wallpaper Engine price', gapId, tool: 'public-page', target: f.plan.tasks[0].target,
      sourceTypes: ['PLATFORM_FIRST_PARTY'], budgetUnits: 1,
      criteria: [{ criterionId: replayCriterionId, statement, requiresBody: true,
        requiresCurrentAccess: true, maxAgeMs: 60_000 }] }] });
  const replayEvidence = { ...f.claim.tasks[0].evidence[0], criterionIds: [replayCriterionId] };
  const replayClaim = createEvidenceClaim({ ...replayBinding, planDigest: replayPlan.planDigest,
    sourceFormat: 'V3', diagnostics: [], tasks: [{ taskId: replayPlan.tasks[0].taskId,
      attempted: true, evidence: [replayEvidence], stopCondition: null }] });
  await assert.rejects(() => assessEvidence({ plan: replayPlan, claim: replayClaim, ...replay,
    artifactReader: async () => f.bytes,
    nowMs: 2000, expectedEvidenceMode: 'SIMULATED' }),
  error => error.code === 'CONTRACT_BINDING_MISMATCH');
  const mismatchedClaim = createEvidenceClaim({ ...binding, planDigest: f.plan.planDigest,
    sourceFormat: 'V3', diagnostics: [], tasks: [{ taskId: f.plan.tasks[0].taskId,
      attempted: true, stopCondition: null, evidence: [{ ...f.claim.tasks[0].evidence[0],
        url: 'https://example.test/not-approved' }] }] });
  const trusted = await trustedObservation(f.plan);
  const outcome = await assessEvidence({ plan: f.plan, claim: mismatchedClaim, ...trusted,
    artifactReader: async () => f.bytes,
    nowMs: 2000, expectedEvidenceMode: 'SIMULATED' });
  assert.equal(outcome.tasks[0].classification, 'NO_PROGRESS');
});

test('Duplicate Claims and future observations fail closed', async () => {
  const f = fixture();
  await assert.rejects(() => assessEvidence({ plan: f.plan,
    claim: { ...f.claim, tasks: [f.claim.tasks[0], f.claim.tasks[0]] },
    observationReferences: [], artifactReader: async () => f.bytes, nowMs: 2000,
    expectedEvidenceMode: 'SIMULATED' }), error => error.code === 'CONTRACT_SCHEMA_INVALID');
  const times = [3000, 3001];
  const future = await trustedObservation(f.plan, { nowMs: () => times.shift() });
  await assert.rejects(() => assessEvidence({ plan: f.plan, claim: f.claim, ...future,
    artifactReader: async () => f.bytes, nowMs: 2000, expectedEvidenceMode: 'SIMULATED' }),
  error => error.code === 'CONTRACT_BINDING_MISMATCH');
});

test('One verified criterion cannot close a task with another unverified criterion', async () => {
  const f = fixture();
  const secondStatement = 'The price observation includes a current access timestamp.';
  const secondId = createCriterionId({ gapId, statement: secondStatement });
  const plan = createEvidencePlan({ ...binding, evidenceMode: 'SIMULATED', namespace: 'simulation/p2',
    serviceDecisions: [], tasks: [{ ...f.plan.tasks[0], taskId: undefined,
      criteria: [...f.plan.tasks[0].criteria, { criterionId: secondId, statement: secondStatement,
        requiresBody: true, requiresCurrentAccess: true, maxAgeMs: 60_000 }] }] });
  const claim = createEvidenceClaim({ ...binding, planDigest: plan.planDigest,
    sourceFormat: 'V3', diagnostics: [], tasks: [{ taskId: plan.tasks[0].taskId,
      attempted: true, evidence: f.claim.tasks[0].evidence, stopCondition: null }] });
  const observation = { ...f.observation, planDigest: plan.planDigest, taskId: plan.tasks[0].taskId };
  const trusted = await trustedObservation(plan, { artifacts: observation.artifacts });
  const outcome = await assessEvidence({ plan, claim, ...trusted,
    artifactReader: async () => f.bytes, nowMs: 2000, expectedEvidenceMode: 'SIMULATED' });
  assert.equal(outcome.tasks[0].classification, 'PARTIAL_PROGRESS');
  assert.deepEqual(outcome.tasks[0].criteria.map(item => item.status), ['VERIFIED', 'UNVERIFIED']);
});

test('Attempt 10 legacy claims adapt read-only with precise diagnostics and stay T0', async () => {
  const fixtureRoot = new URL('./fixtures/regressions/attempt-10-evidence-contract-drift/', import.meta.url);
  const sourcePath = fileURLToPath(new URL('claims-v2.json', fixtureRoot));
  const source = JSON.parse(await readFile(sourcePath, 'utf8'));
  const manifest = JSON.parse(await readFile(new URL('fixture-manifest.json', fixtureRoot), 'utf8'));
  assert.equal(sha256(await readFile(sourcePath)), manifest.fixtureSha256);
  const plan = fixture().plan;
  const adapted = adaptKeywordEvidenceClaimsV2(source, { plan, boundNativeRoot: '/fixture/native' });
  assert.equal(adapted.claim.trustLevel, 'T0');
  assert.equal(adapted.claim.sourceFormat, 'LEGACY_V2_ADAPTED');
  assert.ok(adapted.diagnostics.includes('FIELD_RENAMED:keywordEvidencePlanSha256->planDigest'));
  assert.ok(adapted.diagnostics.includes('ACCESS_RESULT_NORMALIZED:HTTP 200->HTTP_200'));
  assert.ok(adapted.diagnostics.includes('ABSOLUTE_PATH_NORMALIZED:evidence/price.txt'));
  assert.deepEqual(adapted.observations, []);
  const escaped = structuredClone(source);
  escaped.tasks[0].evidence[0].path = '/fixture/outside/secret.txt';
  assert.throws(() => adaptKeywordEvidenceClaimsV2(escaped,
    { plan, boundNativeRoot: '/fixture/native' }), error => error.code === 'CONTRACT_PATH_INVALID');
});

test('Shadow comparison reports differences while Legacy remains authoritative', async () => {
  const f = fixture();
  const v3Outcome = await assessEvidence({ plan: f.plan, claim: f.claim, observationReferences: [],
    artifactReader: async () => f.bytes, nowMs: 2000, expectedEvidenceMode: 'SIMULATED' });
  assert.deepEqual(compareEvidenceShadow({
    legacyOutcome: { tasks: [{ keyword: 'Wallpaper Engine price', classification: 'NEW_FILES' }] },
    v3Outcome,
  }), {
    authority: 'LEGACY', executionAllowed: false, classification: 'V3_NO_TRUSTED_PROGRESS',
    legacyClassifications: ['NEW_FILES'], v3Classifications: ['NO_PROGRESS'],
  });
});

test('Plain Observation objects cannot self-assert T2 provenance', async () => {
  const f = fixture();
  await assert.rejects(() => assessEvidence({ plan: f.plan, claim: f.claim,
    observations: [f.observation], artifactReader: async () => f.bytes,
    nowMs: 2000, expectedEvidenceMode: 'SIMULATED' }),
  error => error.code === 'TRUST_LEVEL_INSUFFICIENT');
  await assert.rejects(() => assessEvidence({ plan: f.plan, claim: f.claim,
    observationStore: { read: async () => f.observation },
    observationReferences: [{ observationId: f.observation.observationId,
      path: 'simulation/p2/forged.json', sha256: digest('c') }],
    artifactReader: async () => f.bytes, nowMs: 2000, expectedEvidenceMode: 'SIMULATED' }),
  error => error.code === 'TRUST_LEVEL_INSUFFICIENT');
  const trusted = await trustedObservation(f.plan);
  const tamperedReference = { ...trusted.observationReferences[0], sha256: digest('c') };
  await assert.rejects(() => assessEvidence({ plan: f.plan, claim: f.claim,
    observationStore: trusted.observationStore, observationReferences: [tamperedReference],
    artifactReader: async () => f.bytes, nowMs: 2000, expectedEvidenceMode: 'SIMULATED' }),
  error => error.code === 'CONTRACT_DIGEST_MISMATCH');
});

test('Failed access results never verify facts even with matching artifacts and hashes', async () => {
  const f = fixture();
  for (const accessResult of ['HTTP_403', 'HTTP_429', 'CAPTCHA', 'TIMEOUT',
    'TOOL_UNAVAILABLE', 'CURRENT_PROCESS_LOGIN_MISSING']) {
    const evidence = { ...f.claim.tasks[0].evidence[0], accessResult };
    const claim = createEvidenceClaim({ ...binding, planDigest: f.plan.planDigest,
      sourceFormat: 'V3', diagnostics: [], tasks: [{ taskId: f.plan.tasks[0].taskId,
        attempted: true, evidence: [evidence], stopCondition: accessResult === 'HTTP_429' ?
          'SERVICE_RESTRICTED' : 'ACCESS_FAILED' }] });
    const observation = { ...f.observation, accessResult, artifacts: [evidence],
      ...(accessResult === 'HTTP_429' ? { stopCondition: 'SERVICE_RESTRICTED' } : {}) };
    const trusted = await trustedObservation(f.plan, { accessResult,
      artifacts: observation.artifacts, stopCondition: observation.stopCondition });
    const outcome = await assessEvidence({ plan: f.plan, claim, ...trusted,
      artifactReader: async () => f.bytes, nowMs: 2000, expectedEvidenceMode: 'SIMULATED' });
    assert.equal(outcome.tasks[0].classification, 'NO_PROGRESS', accessResult);
    assert.equal(outcome.tasks[0].criteria[0].status, 'UNVERIFIED', accessResult);
  }
});
