import test from 'node:test';
import assert from 'node:assert/strict';
import { projectLegacyManifest } from '../src/state/manifest-projector.mjs';
import { createRequestScopeAssessment } from '../src/state/request-scope.mjs';
import { stageState } from './state-helpers.mjs';

const cases = [
  ['not-started', stageState({ phase: 'NOT_STARTED', reason: null, artifact: 'UNVERIFIED', gate: 'NOT_EVALUATED' }), {}, 'NOT_STARTED', false],
  ['ready', stageState({ phase: 'READY', reason: null, artifact: 'UNVERIFIED', gate: 'NOT_EVALUATED' }), {}, 'READY', false],
  ['running', stageState({ phase: 'RUNNING', reason: null, artifact: 'UNVERIFIED', gate: 'NOT_EVALUATED' }), {}, 'IN_PROGRESS', false],
  ['invalid', stageState({ reason: 'FAILED', artifact: 'INVALID', gate: 'DENIED' }), {}, 'FAILED', false],
  ['timeout-partial', stageState({ reason: 'TIMEOUT', artifact: 'VALIDATED_PARTIAL', gate: 'DENIED' }), { failureCategory: 'EXECUTION_ERROR' }, 'PARTIAL', false],
  ['blocked-empty', stageState({ reason: 'BLOCKED', artifact: 'UNVERIFIED', gate: 'DENIED' }), {}, 'BLOCKED', false],
  ['complete-waiting', stageState({ reason: 'SUCCEEDED', artifact: 'VALIDATED_COMPLETE', gate: 'WAITING_FOR_APPROVAL' }), {}, 'WAITING_FOR_USER', false],
  ['complete', stageState({ reason: 'SUCCEEDED', artifact: 'VALIDATED_COMPLETE', gate: 'ELIGIBLE' }),
    { requestScope: createRequestScopeAssessment({ required: ['STAGE_ACCEPTANCE'], satisfied: ['STAGE_ACCEPTANCE'] }) }, 'PASSED', true],
];

for (const [name, state, metadata, status, stageSatisfied] of cases) test(`manifest projection: ${name}`, () => {
  const projected = projectLegacyManifest({ state, ...metadata });
  assert.equal(projected.status, status);
  assert.equal(projected.stageSatisfied, stageSatisfied);
  assert.match(projected.projectionRuleId, /^V2_/);
});

test('complete artifacts fail closed until the exact request scope is satisfied', () => {
  const state = stageState({ reason: 'SUCCEEDED', artifact: 'VALIDATED_COMPLETE', gate: 'ELIGIBLE' });
  const missing = projectLegacyManifest({ state,
    requestScope: createRequestScopeAssessment({ required: ['STAGE_ACCEPTANCE'], satisfied: [] }) });
  assert.equal(missing.status, 'WAITING_FOR_USER'); assert.equal(missing.stageSatisfied, false);
  const deployment = projectLegacyManifest({ state, requestScope: createRequestScopeAssessment({
    required: ['DEPLOYMENT_PLAN', 'DEPLOYMENT_EXECUTED'], satisfied: ['DEPLOYMENT_PLAN'] }) });
  assert.equal(deployment.status, 'WAITING_FOR_USER'); assert.equal(deployment.stageSatisfied, false);
});

test('partial handoff approval authorizes only downstream and never upgrades stage', () => {
  const projected = projectLegacyManifest({ state: stageState({ gate: 'APPROVED' }),
    handoffApproval: { bindingVerified: true } });
  assert.equal(projected.status, 'PARTIAL');
  assert.equal(projected.stageSatisfied, false);
  assert.equal(projected.downstreamAuthorized, true);
});
