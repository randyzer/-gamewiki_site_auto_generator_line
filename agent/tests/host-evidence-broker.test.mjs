import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createEvidencePlan } from '../src/evidence/evidence-contracts.mjs';
import { createCriterionId } from '../src/evidence/task-identity.mjs';
import { createResearchToolPolicy } from '../src/evidence/research-tool-policy.mjs';
import { createHostObservationStore } from '../src/evidence/host-observation-store.mjs';
import { createHostEvidenceBroker } from '../src/evidence/host-evidence-broker.mjs';

const digest = character => character.repeat(64);
const binding = { runId: 'run', stageId: 'keyword', attemptId: 10,
  contextDigest: digest('a'), recoveryDigest: digest('b'), policyVersion: 3 };

function planFor(tool = 'public-page', serviceDecisions = []) {
  const gapId = 'gap-1234567890abcdef12345678';
  const statement = 'Approved source body supports the criterion.';
  return createEvidencePlan({ ...binding, evidenceMode: 'SIMULATED', namespace: 'simulation/p2',
    serviceDecisions, tasks: [{ keyword: 'keyword', gapId, tool,
      target: 'https://example.test/source', sourceTypes: ['FIRST_PARTY'], budgetUnits: 1,
      criteria: [{ criterionId: createCriterionId({ gapId, statement }), statement,
        requiresBody: true, requiresCurrentAccess: true, maxAgeMs: 60_000 }] }] });
}

async function harness({ plan = planFor(), adapterResult, writer } = {}) {
  const root = await mkdtemp(join(tmpdir(), 'evidence-store-'));
  const calls = [];
  const adapter = { id: plan.tasks[0].tool, kind: 'FAKE_TOOL_ADAPTER', evidenceMode: 'SIMULATED', async execute(input) {
    calls.push(input); return adapterResult ?? { accessResult: 'HTTP_200',
      artifacts: [{ path: 'evidence/source.txt', url: input.task.target,
        bytes: Buffer.from('source body'), sourceType: 'FIRST_PARTY',
        criterionIds: [input.task.criteria[0].criterionId] }] };
  } };
  const policy = createResearchToolPolicy({ policyVersion: 3,
    allowedTools: [plan.tasks[0].tool], allowedTargets: [plan.tasks[0].target],
    serviceDecisions: plan.serviceDecisions, budgetUnits: 2 });
  const broker = createHostEvidenceBroker({ rootDirectory: root,
    namespace: 'simulation/p2', evidenceMode: 'SIMULATED', writer });
  return { root, calls, adapter, policy, broker, store: broker.observationStore };
}

test('Broker writes an immutable simulated observation through an injected adapter', async () => {
  const plan = planFor(), h = await harness({ plan });
  const reference = await h.broker.observe({ plan, task: plan.tasks[0],
    authorization: { purpose: 'RUN_EXECUTION', contextDigest: binding.contextDigest },
    toolAdapter: h.adapter, policy: h.policy, nowMs: () => 1000 });
  assert.equal(h.calls.length, 1);
  assert.equal(h.store.append, undefined);
  const observation = await h.store.read(reference);
  assert.equal(observation.trustLevel, 'T2');
  assert.equal(observation.evidenceMode, 'SIMULATED');
  assert.match(reference.path, /^simulation\/p2\//);
  await writeFile(join(h.root, reference.path), '{}');
  await assert.rejects(() => h.store.read(reference), error => error.code === 'CONTRACT_DIGEST_MISMATCH');
});

test('Paused service, unapproved fallback, and exhausted budget never call the adapter', async () => {
  const paused = planFor('youtube-subtitles', [{ service: 'youtube-subtitles', decision: 'PAUSED' }]);
  const h = await harness({ plan: paused });
  await assert.rejects(() => h.broker.observe({ plan: paused, task: paused.tasks[0],
    authorization: { purpose: 'RUN_EXECUTION', contextDigest: binding.contextDigest },
    toolAdapter: h.adapter, policy: h.policy }),
  error => error.code === 'SERVICE_PAUSED');
  assert.equal(h.calls.length, 0);
  await assert.rejects(() => h.broker.observe({ plan: paused, task: paused.tasks[0],
    authorization: { purpose: 'RUN_EXECUTION', contextDigest: binding.contextDigest },
    toolAdapter: { ...h.adapter, id: 'curl' }, policy: h.policy }),
  error => error.code === 'POLICY_DENIED');
  assert.equal(h.calls.length, 0);
  const active = planFor();
  const budget = await harness({ plan: active });
  budget.policy = createResearchToolPolicy({ policyVersion: 3,
    allowedTools: [active.tasks[0].tool], allowedTargets: [active.tasks[0].target],
    serviceDecisions: [], budgetUnits: 0 });
  await assert.rejects(() => budget.broker.observe({ plan: active, task: active.tasks[0],
    authorization: { purpose: 'RUN_EXECUTION', contextDigest: binding.contextDigest },
    toolAdapter: budget.adapter, policy: budget.policy }),
  error => error.code === 'BUDGET_EXHAUSTED');
  assert.equal(budget.calls.length, 0);
});

test('Service resume requires a purpose-scoped resume authorization', async () => {
  const plan = planFor('youtube-subtitles',
    [{ service: 'youtube-subtitles', decision: 'RESUME_APPROVED' }]);
  const h = await harness({ plan });
  await assert.rejects(() => h.broker.observe({ plan, task: plan.tasks[0],
    authorization: { purpose: 'RUN_EXECUTION', contextDigest: binding.contextDigest },
    toolAdapter: h.adapter, policy: h.policy }),
  error => error.code === 'POLICY_DENIED');
  assert.equal(h.calls.length, 0);
});

test('HTTP 429 records a stop and prevents every later service call', async () => {
  const plan = planFor('youtube-subtitles', [{ service: 'youtube-subtitles', decision: 'ACTIVE' }]);
  const h = await harness({ plan, adapterResult: { accessResult: 'HTTP_429', artifacts: [] } });
  const input = { plan, task: plan.tasks[0],
    authorization: { purpose: 'RUN_EXECUTION', contextDigest: binding.contextDigest },
    toolAdapter: h.adapter, policy: h.policy, nowMs: () => 1000 };
  const reference = await h.broker.observe(input);
  assert.equal((await h.store.read(reference)).stopCondition, 'SERVICE_RESTRICTED');
  await assert.rejects(() => h.broker.observe(input), error => error.code === 'SERVICE_PAUSED');
  assert.equal(h.calls.length, 1);
});

test('Observation write failure yields no trusted reference', async () => {
  const plan = planFor();
  const h = await harness({ plan, writer: async () => { throw Error('disk full'); } });
  await assert.rejects(() => h.broker.observe({ plan, task: plan.tasks[0],
    authorization: { purpose: 'RUN_EXECUTION', contextDigest: binding.contextDigest },
    toolAdapter: h.adapter, policy: h.policy }), /disk full/);
  assert.deepEqual(await h.store.list(), []);
});

test('Store rejects reference traversal and overlap with a worker-writable root', async () => {
  const root = await mkdtemp(join(tmpdir(), 'evidence-store-'));
  assert.throws(() => createHostEvidenceBroker({ rootDirectory: root,
    workerWritableRoots: [root], namespace: 'simulation/p2', evidenceMode: 'SIMULATED' }),
  error => error.code === 'CONTRACT_PATH_INVALID');
  assert.throws(() => createHostObservationStore({ rootDirectory: root,
    namespace: 'simulation/p2', evidenceMode: 'SIMULATED' }),
  error => error.code === 'TRUST_LEVEL_INSUFFICIENT');
  const store = createHostEvidenceBroker({ rootDirectory: root,
    namespace: 'simulation/p2', evidenceMode: 'SIMULATED' }).observationStore;
  await assert.rejects(() => store.read({ observationId: `obs-${'1'.repeat(24)}`,
    path: '../outside.json', sha256: digest('c') }), error => error.code === 'CONTRACT_PATH_INVALID');
});

test('Broker rejects production plans, non-fake adapters, and mismatched Policy snapshots', async () => {
  const plan = planFor(), h = await harness({ plan });
  const common = { plan, task: plan.tasks[0],
    authorization: { purpose: 'RUN_EXECUTION', contextDigest: binding.contextDigest },
    policy: h.policy };
  await assert.rejects(() => h.broker.observe({ ...common,
    toolAdapter: { ...h.adapter, kind: 'REAL_TOOL_ADAPTER' } }),
  error => error.code === 'POLICY_DENIED');
  assert.equal(h.calls.length, 0);
  const wrongPolicy = createResearchToolPolicy({ policyVersion: 4,
    allowedTools: [plan.tasks[0].tool], allowedTargets: [plan.tasks[0].target],
    serviceDecisions: [], budgetUnits: 2 });
  await assert.rejects(() => h.broker.observe({ ...common, toolAdapter: h.adapter,
    policy: wrongPolicy }), error => error.code === 'CONTRACT_BINDING_MISMATCH');
  assert.equal(h.calls.length, 0);
  const productionPlan = { ...plan, evidenceMode: 'PRODUCTION', namespace: 'production/p2' };
  productionPlan.planDigest = (await import('../src/evidence/evidence-contracts.mjs'))
    .computeEvidencePlanDigest(productionPlan);
  await assert.rejects(() => h.broker.observe({ ...common, plan: productionPlan,
    task: productionPlan.tasks[0], toolAdapter: h.adapter }),
  error => error.code === 'TRUST_LEVEL_INSUFFICIENT');
});

test('Broker rejects adapter output outside approved URL, source type, or criterion', async () => {
  const plan = planFor();
  for (const artifact of [
    { path: 'evidence/source.txt', url: 'https://example.test/other', bytes: 'x',
      sourceType: 'FIRST_PARTY', criterionIds: [plan.tasks[0].criteria[0].criterionId] },
    { path: 'evidence/source.txt', url: plan.tasks[0].target, bytes: 'x',
      sourceType: 'THIRD_PARTY', criterionIds: [plan.tasks[0].criteria[0].criterionId] },
    { path: 'evidence/source.txt', url: plan.tasks[0].target, bytes: 'x',
      sourceType: 'FIRST_PARTY', criterionIds: [`criterion-${'f'.repeat(24)}`] },
  ]) {
    const h = await harness({ plan, adapterResult: { accessResult: 'HTTP_200', artifacts: [artifact] } });
    await assert.rejects(() => h.broker.observe({ plan, task: plan.tasks[0],
      authorization: { purpose: 'RUN_EXECUTION', contextDigest: binding.contextDigest },
      toolAdapter: h.adapter, policy: h.policy }),
    error => error.code === 'CONTRACT_BINDING_MISMATCH');
    assert.deepEqual(await h.store.list(), []);
  }
});
