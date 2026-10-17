import test from 'node:test';
import assert from 'node:assert/strict';
import { validateContract, contractDefinition } from '../src/contracts/registry.mjs';
import { createEvidencePlan, createEvidenceClaim } from '../src/evidence/evidence-contracts.mjs';
import { createCriterionId, createTaskId } from '../src/evidence/task-identity.mjs';

const digest = character => character.repeat(64);
const binding = Object.freeze({
  runId: 'wallpaper-engine-002', stageId: 'game-innerpage-keyword-information-research',
  attemptId: 10, contextDigest: digest('a'), recoveryDigest: digest('b'), policyVersion: 3,
});

function taskInput(overrides = {}) {
  const gapId = 'gap-1234567890abcdef12345678';
  const criterionId = createCriterionId({ gapId, statement: 'Steam US price is shown in USD.' });
  return {
    keyword: 'Wallpaper Engine price', gapId, tool: 'public-page',
    target: 'https://store.steampowered.com/app/431960/?cc=us',
    sourceTypes: ['PLATFORM_FIRST_PARTY'], budgetUnits: 1,
    criteria: [{ criterionId, statement: 'Steam US price is shown in USD.',
      requiresBody: true, requiresCurrentAccess: true, maxAgeMs: 86_400_000 }],
    ...overrides,
  };
}

test('Evidence V3 contracts have one registered producer and validator', () => {
  assert.deepEqual(['EVIDENCE_PLAN', 'EVIDENCE_CLAIM', 'HOST_OBSERVATION', 'EVIDENCE_OUTCOME']
    .map(kind => {
      const definition = contractDefinition(kind, kind === 'HOST_OBSERVATION' ? 1 : 3);
      return [kind, definition.producer, definition.validator];
    }), [
      ['EVIDENCE_PLAN', 'HOST_PLAN_BUILDER', 'CONTRACT_REGISTRY'],
      ['EVIDENCE_CLAIM', 'WORKER', 'CONTRACT_REGISTRY'],
      ['HOST_OBSERVATION', 'HOST_EVIDENCE_BROKER', 'CONTRACT_REGISTRY'],
      ['EVIDENCE_OUTCOME', 'EVIDENCE_ASSESSOR', 'CONTRACT_REGISTRY'],
    ]);
});

test('Plan and Claim share stable task and criterion identities', () => {
  const plan = createEvidencePlan({ ...binding, evidenceMode: 'SIMULATED',
    namespace: 'simulation/p2', serviceDecisions: [], tasks: [taskInput()] });
  const task = plan.tasks[0];
  assert.equal(task.taskId, createTaskId({ ...binding, keyword: task.keyword,
    gapId: task.gapId, tool: task.tool, target: task.target }));
  const claim = createEvidenceClaim({ ...binding, planDigest: plan.planDigest,
    sourceFormat: 'V3', tasks: [{ taskId: task.taskId, attempted: true, evidence: [],
      stopCondition: 'NO_HOST_OBSERVATION' }], diagnostics: [] });
  assert.equal(validateContract('EVIDENCE_PLAN', 3, plan), plan);
  assert.equal(validateContract('EVIDENCE_CLAIM', 3, claim), claim);
});

test('Contract validation rejects path escape, unknown fields, and version drift', () => {
  const plan = createEvidencePlan({ ...binding, evidenceMode: 'SIMULATED', namespace: 'simulation/p2',
    serviceDecisions: [], tasks: [taskInput()] });
  const base = { ...binding, planDigest: plan.planDigest, sourceFormat: 'V3', diagnostics: [],
    tasks: [{ taskId: plan.tasks[0].taskId, attempted: true, stopCondition: null,
      evidence: [{ path: 'evidence/ok.txt', url: plan.tasks[0].target, sha256: digest('c'),
        accessResult: 'HTTP_200', sourceType: 'PLATFORM_FIRST_PARTY',
        criterionIds: [plan.tasks[0].criteria[0].criterionId] }] }] };
  assert.throws(() => createEvidenceClaim({ ...base, tasks: [{ ...base.tasks[0], evidence: [
    { ...base.tasks[0].evidence[0], path: '../secret.txt' },
  ] }] }), error => error.code === 'CONTRACT_PATH_INVALID');
  const claim = createEvidenceClaim(base);
  assert.throws(() => validateContract('EVIDENCE_CLAIM', 3, { ...claim, surprise: true }),
    error => error.code === 'CONTRACT_SCHEMA_INVALID');
  assert.throws(() => validateContract('EVIDENCE_CLAIM', 2, claim),
    error => error.code === 'CONTRACT_VERSION_UNSUPPORTED');
});
