import test from 'node:test';
import assert from 'node:assert/strict';
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { captureKeywordRecovery } from '../src/keyword-recovery.mjs';
import { createResearchHandoffCandidate, researchHandoffApprovalTemplate,
  verifyResearchHandoffApproval, verifyResearchHandoffCandidate } from '../src/research-handoff.mjs';

async function fixture(t) {
  const root = await mkdtemp(resolve('.research-handoff-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const runId = 'handoff-run', runDirectory = join(root, runId);
  const outputDirectory = join(runDirectory, 'artifacts/1/1'), native = join(outputDirectory, 'native');
  await mkdir(native, { recursive: true });
  const raw = join(root, 'raw.md'), skill = join(root, 'skill.md');
  await writeFile(raw, '# Keywords'); await writeFile(skill, 'locked');
  await writeFile(join(native, 'RAW_LINEAGE.json'), JSON.stringify({ pendingIds: [3], rows: [
    { id: '1', raw: 'complete raw', final: 'Complete guide' },
    { id: '2', raw: 'partial raw', final: 'Partial guide' },
    { id: '3', raw: 'ambiguous raw', final: null },
    { id: '4', raw: 'blocked raw', final: 'Blocked guide' },
  ] }));
  await writeFile(join(native, 'keywords.json'), JSON.stringify({ categories: [{ category: 'Guide',
    keywords: ['Complete guide', 'Partial guide', 'Blocked guide'] }] }));
  await writeFile(join(native, 'Complete guide素材.md'), '- 状态: COMPLETED\n');
  await writeFile(join(native, 'Partial guide素材.md'), '- 状态: PARTIAL\n- 缺口: missing fact\n');
  await writeFile(join(native, 'Blocked guide素材.md'), '- 状态: BLOCKED\n- 缺口: unavailable source\n');
  const context = { runId, runDirectory, outputDirectory, inputs: {
    rawKeywordsFile: raw, gameIdentity: 'Example / PC', siteRevision: 'rev-1', domain: 'example.test',
  }, checkpoint: {}, skillLock: { source: skill } };
  const recoveryRef = await captureKeywordRecovery(context, { reason: 'WORKER_STOPPED' });
  return { root, runId, runDirectory, recoveryRef };
}

test('candidate binds every material, pending row and publication disposition without approval', async t => {
  const f = await fixture(t);
  const reference = await createResearchHandoffCandidate({ ...f, attempt: 1,
    siteRevision: 'rev-1', domain: 'example.test' });
  assert.equal(reference.approved, false);
  const candidate = await verifyResearchHandoffCandidate(reference, { ...f, attempt: 1,
    siteRevision: 'rev-1', domain: 'example.test' });
  assert.deepEqual(candidate.materials.map(item => [item.keyword, item.status, item.publicationDisposition]), [
    ['Blocked guide', 'BLOCKED', 'OMIT'],
    ['Complete guide', 'COMPLETED', 'PUBLISH'],
    ['Partial guide', 'PARTIAL', 'DRAFT_ONLY'],
  ]);
  assert.deepEqual(candidate.pendingRows, [{ row: 3, rawKeyword: 'ambiguous raw' }]);
  assert.equal(candidate.approval, null);
  assert.match(candidate.bindings.materialStateSha256, /^[a-f0-9]{64}$/);
  const approval = researchHandoffApprovalTemplate(reference, candidate);
  assert.match(verifyResearchHandoffApproval(approval, reference, candidate), /^[a-f0-9]{64}$/);
  await assert.rejects(async () => verifyResearchHandoffApproval({ ...approval,
    pendingRowsSha256: '0'.repeat(64) }, reference, candidate), /exactly match/);
});

test('candidate rejects missing materials and detects immutable byte tampering', async t => {
  const missing = await fixture(t);
  const recovery = JSON.parse(await readFile(missing.recoveryRef.manifestPath, 'utf8'));
  recovery.files = recovery.files.filter(file => file.path !== 'Blocked guide素材.md');
  await chmod(missing.recoveryRef.manifestPath, 0o600);
  await writeFile(missing.recoveryRef.manifestPath, JSON.stringify(recovery));
  await assert.rejects(createResearchHandoffCandidate({ ...missing, attempt: 1,
    siteRevision: 'rev-1', domain: 'example.test' }), /recovery manifest digest/);

  const changed = await fixture(t);
  const reference = await createResearchHandoffCandidate({ ...changed, attempt: 1,
    siteRevision: 'rev-1', domain: 'example.test' });
  await chmod(reference.path, 0o600); await writeFile(reference.path, '{}');
  await assert.rejects(verifyResearchHandoffCandidate(reference, { ...changed, attempt: 1,
    siteRevision: 'rev-1', domain: 'example.test' }), /candidate digest changed/);
});
