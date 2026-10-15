import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createPipeline } from '../src/pipeline.mjs';
import { STAGE } from '../src/stages.mjs';
import { fixture, goodResult } from './helpers.mjs';

const DEPLOY = 6;
const PRODUCTION_PERMISSIONS = ['gitPush', 'dns', 'productionDeployment', 'gsc', 'ga4'];

async function setup(t, { deploymentExecution = true, execute } = {}) {
  const f = await fixture(t);
  const calls = [];
  const executor = async (skill, context) => {
    calls.push({ skill, context: structuredClone(context) });
    if (skill === STAGE.DEPLOYMENT_PLAN && context.mode === 'execute' && execute) return execute(context);
    return goodResult(skill, context);
  };
  const inputs = { ...f.inputs, projectPath: f.inputs.paths.siteDirectory };
  const pipeline = await createPipeline({ ...f.configuration, inputs, executor, siteWrites: true, deploymentExecution });
  const toPlan = async () => {
    for (let i = 0; i < 7; i++) await pipeline.advance();
    return pipeline.snapshot().stages[DEPLOY].checkpoint.planDigest;
  };
  return { f, calls, pipeline, toPlan, projectPath: inputs.projectPath };
}

test('stage 7 first produces a plan with every production permission off and waits for approval', async t => {
  const s = await setup(t);
  const digest = await s.toPlan();
  const plan = s.calls.find(c => c.skill === STAGE.DEPLOYMENT_PLAN).context;
  assert.equal(plan.mode, 'plan');
  for (const key of PRODUCTION_PERMISSIONS) assert.equal(plan.permissions[key], false);
  assert.deepEqual(plan.requiredArtifacts, ['DEPLOYMENT_PLAN.md', 'DEPLOYMENT_PLAN.json']);
  const state = s.pipeline.snapshot();
  assert.equal(state.stages[DEPLOY].status, 'WAITING_FOR_USER');
  assert.deepEqual(state.stages[DEPLOY].missing_inputs, ['deploymentPlanApproval']);
  assert.match(digest, /^[0-9a-f]{64}$/);
  assert.equal(state.deploymentExecuted, false);
});

test('approving the exact plan digest runs the same stage again in execute mode with production permissions', async t => {
  const s = await setup(t);
  const digest = await s.toPlan();
  await s.pipeline.updateUserInputs({ deploymentPlanApproval: { approved: true, digest } });
  assert.equal(s.pipeline.snapshot().stages[DEPLOY].status, 'NOT_STARTED');
  await s.pipeline.advance();
  const execution = s.calls.at(-1).context;
  assert.equal(s.calls.at(-1).skill, STAGE.DEPLOYMENT_PLAN);
  assert.equal(execution.mode, 'execute');
  assert.equal(execution.approvedPlan.digest, digest);
  assert.deepEqual(execution.approvedPlan.artifacts.map(a => a.kind), ['DEPLOYMENT_PLAN.md', 'DEPLOYMENT_PLAN.json']);
  for (const key of PRODUCTION_PERMISSIONS) assert.equal(execution.permissions[key], true);
  assert.equal(execution.permissions.advertisingScripts, false);
  assert.equal(execution.permissions.siteWrites, true);
  assert.deepEqual(execution.requiredArtifacts, ['DEPLOYMENT_REPORT.md', 'DEPLOYMENT_REPORT.json']);
  const state = s.pipeline.snapshot();
  assert.equal(state.stages[DEPLOY].status, 'PASSED');
  assert.deepEqual(state.stages[DEPLOY].artifacts.map(a => a.kind),
    ['DEPLOYMENT_PLAN.md', 'DEPLOYMENT_PLAN.json', 'DEPLOYMENT_REPORT.md', 'DEPLOYMENT_REPORT.json']);
  assert.equal(state.deploymentExecuted, true);
});

test('without deploymentExecution an approval only acknowledges the plan (frozen G0 and Feishu paths)', async t => {
  const s = await setup(t, { deploymentExecution: false });
  const digest = await s.toPlan();
  await s.pipeline.updateUserInputs({ deploymentPlanApproval: { approved: true, digest } });
  await s.pipeline.advance();
  const state = s.pipeline.snapshot();
  assert.equal(state.stages[DEPLOY].status, 'PASSED');
  assert.equal(s.calls.filter(c => c.skill === STAGE.DEPLOYMENT_PLAN).length, 1);
  assert.equal(state.deploymentExecuted, false);
});

test('a plan changed after approval blocks before any production action', async t => {
  const s = await setup(t);
  const digest = await s.toPlan();
  await s.pipeline.updateUserInputs({ deploymentPlanApproval: { approved: true, digest } });
  const plan = s.pipeline.snapshot().stages[DEPLOY].artifacts.find(a => a.kind === 'DEPLOYMENT_PLAN.json');
  await writeFile(plan.path, '{"edited":"after approval"}');
  await s.pipeline.advance();
  const state = s.pipeline.snapshot();
  assert.equal(state.stages[DEPLOY].status, 'BLOCKED');
  assert.match(state.stages[DEPLOY].evidence.join('\n'), /SHA256 changed/);
  assert.equal(s.calls.filter(c => c.context.mode === 'execute').length, 0);
  assert.equal(state.deploymentExecuted, false);
});

test('execution may add .vercel and a measurement tag after the UI audit without failing', async t => {
  const s = await setup(t, { execute: async context => {
    await mkdir(join(context.inputs.projectPath, '.vercel'), { recursive: true });
    await writeFile(join(context.inputs.projectPath, '.vercel', 'project.json'), '{"projectId":"SYNTHETIC"}');
    await writeFile(join(context.inputs.projectPath, 'ga4.html'), '<!-- SYNTHETIC GA4 tag -->');
    return goodResult(STAGE.DEPLOYMENT_PLAN, context);
  } });
  const digest = await s.toPlan();
  await s.pipeline.updateUserInputs({ deploymentPlanApproval: { approved: true, digest } });
  await s.pipeline.advance();
  assert.equal(s.pipeline.snapshot().stages[DEPLOY].status, 'PASSED');
  assert.match(await readFile(join(s.projectPath, 'ga4.html'), 'utf8'), /GA4/);
  assert.match(await readFile(join(s.projectPath, '.vercel', 'project.json'), 'utf8'), /SYNTHETIC/);
});

test('a failed execution is recorded as possibly deployed, and retry starts over from a new plan', async t => {
  const s = await setup(t, { execute: async () =>
    ({ status: 'BLOCKED', artifacts: [], missing_inputs: [], evidence: ['SYNTHETIC: DNS provider rejected the change'] }) });
  const digest = await s.toPlan();
  await s.pipeline.updateUserInputs({ deploymentPlanApproval: { approved: true, digest } });
  await s.pipeline.advance();
  let state = s.pipeline.snapshot();
  assert.equal(state.stages[DEPLOY].status, 'BLOCKED');
  // Effects of a partial run are unknown, so the run must not claim nothing was deployed.
  assert.equal(state.deploymentExecuted, true);
  await s.pipeline.updateUserInputs({}, { retry: true });
  state = s.pipeline.snapshot();
  assert.equal(state.stages[DEPLOY].checkpoint.approvedPlanDigest, undefined);
  assert.equal(state.inputs.deploymentPlanApproval, undefined);
  await s.pipeline.advance();
  assert.equal(s.calls.at(-1).context.mode, 'plan');
  assert.equal(s.pipeline.snapshot().stages[DEPLOY].status, 'WAITING_FOR_USER');
});

test('an approval for a different digest is rejected and nothing executes', async t => {
  const s = await setup(t);
  await s.toPlan();
  await assert.rejects(s.pipeline.updateUserInputs({ deploymentPlanApproval: { approved: true, digest: 'f'.repeat(64) } }), /digest/);
  assert.equal(s.calls.filter(c => c.context.mode === 'execute').length, 0);
});
