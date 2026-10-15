import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fixture } from './helpers.mjs';

test('candidate diff protects keywords and promotion dry-run binds exact digest and source baseline', async t => {
  const f = await fixture(t), source = join(f.root, 'source'); await mkdir(source);
  execFileSync('git', ['init', '-q', source]); await writeFile(join(source, 'page.txt'), 'old');
  execFileSync('git', ['-C', source, 'add', 'page.txt']);
  execFileSync('git', ['-C', source, '-c', 'user.name=fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'baseline']);
  const keywords = join(source, 'keywords.md'); await writeFile(keywords, 'user keywords');
  const entry = { path: source, protectedPaths: ['keywords.md'] };
  const { captureBaseline } = await import('../src/project-baseline.mjs');
  const baseline = await captureBaseline(entry, keywords), candidate = join(f.configuration.workspace, 'candidate'); await mkdir(candidate);
  await writeFile(join(candidate, 'page.txt'), 'new'); await writeFile(join(candidate, 'keywords.md'), 'user keywords');
  let api; try { api = await import('../src/candidate-diff.mjs'); } catch (e) { if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e; }
  assert.equal(typeof api?.candidateDiff, 'function');
  const diff = await api.candidateDiff(baseline, candidate);
  assert.equal(diff.changes.length, 1); assert.equal(diff.changes[0].type, 'MODIFY');
  const { promotionPlan, dryRunPromotion } = await import('../src/promotion-gate.mjs');
  const plan = promotionPlan({ targetId: 'fixture', runId: 'r1', baseline, diff });
  const approval = { type: 'promotion-review', owner: 'owner', targetId: plan.targetId, runId: plan.runId,
    baselineDigest: plan.baselineDigest, candidateDigest: plan.candidateDigest, filesDigest: plan.filesDigest,
    head: plan.head, statusDigest: plan.statusDigest, expiresAt: Date.now() + 10000, used: false };
  await assert.rejects(dryRunPromotion(plan, baseline, entry, diff, { owner: 'owner', approval: { ...approval, type: 'deployment-plan' } }), /approval/);
  for (const expiresAt of [undefined, null, NaN, Infinity, '2099-01-01', Date.now() - 1])
    await assert.rejects(dryRunPromotion(plan, baseline, entry, diff, { owner: 'owner', approval: { ...approval, expiresAt } }), /approval/);
  assert.equal((await dryRunPromotion(plan, baseline, entry, diff, { owner: 'owner', approval })).sourceWrites, false);
  await writeFile(join(candidate, 'keywords.md'), 'tampered');
  const blocked = await api.candidateDiff(baseline, candidate); assert.ok(blocked.blockers.length > 0);
  await writeFile(join(source, 'page.txt'), 'user new changes');
  await assert.rejects(dryRunPromotion(plan, baseline, entry, diff, { owner: 'owner', approval }), /drift/);
});
