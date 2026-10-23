import test from 'node:test';
import assert from 'node:assert/strict';
import { stage4ExecutionBudget } from '../src/stage4-budget.mjs';

test('Stage 4 execution budget defaults to thirty minutes', () => {
  assert.deepEqual(stage4ExecutionBudget(), {
    timeoutMs: 1800000,
    configurationSource: 'default',
  });
});

test('Stage 4 execution budget accepts an explicit ten-to-sixty minute timeout', () => {
  assert.deepEqual(stage4ExecutionBudget({ timeoutMs: 2400000 }), {
    timeoutMs: 2400000,
    configurationSource: 'run-inputs',
  });
  assert.equal(stage4ExecutionBudget({ timeoutMs: 600000 }).timeoutMs, 600000);
  assert.equal(stage4ExecutionBudget({ timeoutMs: 3600000 }).timeoutMs, 3600000);
});

test('Stage 4 execution budget rejects unknown fields and out-of-range values', () => {
  for (const value of [null, [], {}, { timeoutMs: 599999 }, { timeoutMs: 3600001 },
    { timeoutMs: 1800000, extra: true }])
    assert.throws(() => stage4ExecutionBudget(value), /STAGE4_BUDGET_INVALID/);
});
