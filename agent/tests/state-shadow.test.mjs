import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runStage2StateShadow } from '../src/state/state-shadow.mjs';
import { candidateInput, event } from './state-helpers.mjs';
import { createRequestScopeAssessment } from '../src/state/request-scope.mjs';

test('Attempt 10 shadow preserves partial research and never mutates legacy manifest', async t => {
  const root = await mkdtemp(join(tmpdir(), 'p3-shadow-')); t.after(() => import('node:fs/promises').then(fs => fs.rm(root, { recursive: true, force: true })));
  const legacy = join(root, 'manifest.json'); const legacyBytes = Buffer.from('{"sequence":48,"status":"PARTIAL"}\n');
  await import('node:fs/promises').then(fs => fs.writeFile(legacy, legacyBytes));
  const input = await candidateInput(root, {
    requestScope: createRequestScopeAssessment({ required: ['STAGE_2_ACCEPTANCE'], satisfied: [] }),
    errors: [{ category: 'CONTRACT_ERROR', code: 'RESEARCH_HANDOFF_INVALID', message: 'handoff rejected' }],
    events: [event('ATTEMPT_STARTED', 1), event('WORKER_STOPPED', 2), event('EVIDENCE_CLASSIFIED', 3),
      event('CONTRACT_REJECTED', 4), event('STAGE_CHECKPOINT_COMMITTED', 5)],
  });
  const fixture = JSON.parse(await readFile(new URL('./fixtures/regressions/attempt-10-state-projection/fixture-manifest.json', import.meta.url)));
  const result = await runStage2StateShadow({ shadowRoot: join(root, 'state-shadow'), candidateInput: input,
    regression: { ...fixture.counts, pendingLines: fixture.pendingLines, handoffError: fixture.handoffError } });
  assert.equal(result.projection.status, 'PARTIAL');
  assert.equal(result.projection.stageSatisfied, false);
  assert.equal(result.projection.failureCategory, 'CONTRACT_ERROR');
  assert.equal(result.regression.completed, 2);
  assert.deepEqual(result.regression.pendingLines, [36, 84, 96, 100]);
  assert.deepEqual(await readFile(legacy), legacyBytes);
});
