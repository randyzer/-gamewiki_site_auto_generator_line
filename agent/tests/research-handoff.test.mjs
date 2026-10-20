import test from 'node:test';
import assert from 'node:assert/strict';
import { chmod, cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { captureKeywordRecovery } from '../src/keyword-recovery.mjs';
import { createResearchHandoffCandidate, researchHandoffApprovalTemplate,
  verifyResearchHandoffApproval, verifyResearchHandoffCandidate } from '../src/research-handoff.mjs';
import { prepareResearchHandoff } from '../src/handoff.mjs';
import { STAGE } from '../src/stages.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');

async function fixture(t, { skillSyntax = false } = {}) {
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
  await writeFile(join(native, 'Complete guide素材.md'), skillSyntax
    ? '- 关键词: Complete guide\n- 状态: COMPLETED\n### 待确认\n- Core fact remains unknown.\n'
    : '- 关键词: Complete guide\n- 状态: COMPLETED\n');
  await writeFile(join(native, 'Partial guide素材.md'), skillSyntax
    ? '- 关键词: Partial guide\n- 状态: PARTIAL\n- 缺口: missing fact\n### 待确认\n- missing fact\n- second fact\n'
    : '- 关键词: Partial guide\n- 状态: PARTIAL\n- 缺口: missing fact\n');
  await writeFile(join(native, 'Blocked guide素材.md'), skillSyntax
    ? '- 关键词: Blocked guide\n- 状态: BLOCKED\n### 待确认\n- unavailable source\n- 无\n'
    : '- 关键词: Blocked guide\n- 状态: BLOCKED\n- 缺口: unavailable source\n');
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
  assert.deepEqual(Object.keys(candidate.materials[0]),
    ['keyword', 'path', 'sha256', 'status', 'gaps', 'publicationDisposition']);
  assert.deepEqual(candidate.pendingRows, [{ row: 3, rawKeyword: 'ambiguous raw' }]);
  assert.equal(candidate.approval, null);
  assert.match(candidate.bindings.materialStateSha256, /^[a-f0-9]{64}$/);
  const approval = researchHandoffApprovalTemplate(reference, candidate);
  assert.match(verifyResearchHandoffApproval(approval, reference, candidate), /^[a-f0-9]{64}$/);
  await assert.rejects(async () => verifyResearchHandoffApproval({ ...approval,
    pendingRowsSha256: '0'.repeat(64) }, reference, candidate), /exactly match/);
});

test('Skill pending sections retain provenance and safely downgrade invalid completed material', async t => {
  const f = await fixture(t, { skillSyntax: true });
  const reference = await createResearchHandoffCandidate({ ...f, attempt: 1,
    siteRevision: 'rev-1', domain: 'example.test' });
  const candidate = await verifyResearchHandoffCandidate(reference, { ...f, attempt: 1,
    siteRevision: 'rev-1', domain: 'example.test' });
  const complete = candidate.materials.find(item => item.keyword === 'Complete guide');
  assert.equal(complete.status, 'PARTIAL');
  assert.equal(complete.publicationDisposition, 'DRAFT_ONLY');
  assert.equal(complete.sourceContract.declaredStatus, 'COMPLETED');
  assert.equal(complete.sourceContract.contractStatus, 'INVALID');
  assert.deepEqual(complete.sourceContract.diagnostics, ['PENDING_SEMANTICS_UNCLASSIFIED']);
  assert.deepEqual(complete.gaps, ['Core fact remains unknown.']);
  assert.deepEqual(complete.sourceContract.gapDetails[0].sources.map(item => item.classification),
    ['UNCLASSIFIED']);

  const partial = candidate.materials.find(item => item.keyword === 'Partial guide');
  assert.deepEqual(partial.gaps, ['missing fact', 'second fact']);
  assert.deepEqual(partial.sourceContract.gapDetails[0].sources.map(item => item.sourceSyntax), ['mixed']);
  assert.equal(candidate.materials.find(item => item.keyword === 'Blocked guide')
    .publicationDisposition, 'OMIT');
});

test('attempt 10 fixture normalizes all 31 materials without changing fixture bytes', async t => {
  const root = await mkdtemp(resolve('.research-handoff-attempt10-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const fixtureRoot = resolve('tests/fixtures/regressions/attempt-10-material-gap-format');
  const manifest = JSON.parse(await readFile(join(fixtureRoot, 'fixture-manifest.json')));
  for (const item of manifest.materials) {
    assert.equal(hash(await readFile(join(fixtureRoot, item.fixturePath))), item.fixtureSha256);
  }
  const runId = 'attempt10-replay', runDirectory = join(root, runId);
  const outputDirectory = join(runDirectory, 'artifacts/1/1'), native = join(outputDirectory, 'native');
  await mkdir(native, { recursive: true });
  await cp(join(fixtureRoot, 'materials'), native, { recursive: true });
  const names = (await readdir(native)).filter(name => name.endsWith('素材.md')).sort();
  await writeFile(join(native, 'keywords.json'), JSON.stringify({ categories: [
    { category: 'Wallpaper Engine', keywords: names.map(name => name.slice(0, -'素材.md'.length)) },
  ] }));
  await cp(join(fixtureRoot, 'lineage.json'), join(native, 'RAW_LINEAGE.json'));
  const raw = join(root, 'raw.md'), skill = join(root, 'skill.md');
  await writeFile(raw, '# Keywords'); await writeFile(skill, 'locked');
  const context = { runId, runDirectory, outputDirectory, inputs: {
    rawKeywordsFile: raw, gameIdentity: 'Wallpaper Engine / PC', siteRevision: 'rev-10',
    domain: 'example.test',
  }, checkpoint: {}, skillLock: { source: skill } };
  const recoveryRef = await captureKeywordRecovery(context, { reason: 'WORKER_STOPPED' });
  const reference = await createResearchHandoffCandidate({ runId, runDirectory, recoveryRef, attempt: 1,
    siteRevision: 'rev-10', domain: 'example.test' });
  const candidate = await verifyResearchHandoffCandidate(reference, { runId, runDirectory, attempt: 1,
    siteRevision: 'rev-10', domain: 'example.test' });
  assert.deepEqual(Object.fromEntries(['PARTIAL', 'BLOCKED'].map(status => [status,
    candidate.materials.filter(item => item.status === status).length])), { PARTIAL: 27, BLOCKED: 4 });
  assert.equal(candidate.materials.filter(item => item.sourceContract?.declaredStatus === 'COMPLETED' &&
    item.sourceContract.contractStatus === 'INVALID').length, 2);
  assert.equal(candidate.materials.filter(item => item.publicationDisposition === 'PUBLISH').length, 0);
});

test('malformed metadata and keyword/file identity mismatch fail closed', async t => {
  for (const body of [
    '- 关键词: Other guide\n- 状态: PARTIAL\n### 待确认\n- missing\n',
    '- 关键词: Partial guide\n- 状态: PARTIAL\n- 状态: BLOCKED\n### 待确认\n- missing\n',
  ]) {
    const f = await fixture(t);
    const manifest = JSON.parse(await readFile(f.recoveryRef.manifestPath));
    const descriptor = manifest.files.find(item => item.path === 'Partial guide素材.md');
    const materialPath = join(dirname(f.recoveryRef.manifestPath), 'data', descriptor.path);
    await chmod(materialPath, 0o600); await writeFile(materialPath, body);
    descriptor.bytes = Buffer.byteLength(body); descriptor.sha256 = hash(body);
    await chmod(f.recoveryRef.manifestPath, 0o600);
    const bytes = JSON.stringify(manifest, null, 2) + '\n';
    await writeFile(f.recoveryRef.manifestPath, bytes);
    f.recoveryRef.sha256 = hash(bytes);
    await assert.rejects(createResearchHandoffCandidate({ ...f, attempt: 1,
      siteRevision: 'rev-1', domain: 'example.test' }), /RESEARCH_HANDOFF_INVALID/);
  }
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

test('approved candidate continuously verifies recovery manifest and file bytes', async t => {
  const fileChanged = await fixture(t);
  const reference = await createResearchHandoffCandidate({ ...fileChanged, attempt: 1,
    siteRevision: 'rev-1', domain: 'example.test' });
  const materialPath = join(dirname(fileChanged.recoveryRef.manifestPath), 'data', 'Partial guide素材.md');
  await chmod(materialPath, 0o600);
  await writeFile(materialPath, '- 状态: PARTIAL\n- 缺口: changed after approval\n');
  await assert.rejects(verifyResearchHandoffCandidate(reference, { ...fileChanged, attempt: 1,
    siteRevision: 'rev-1', domain: 'example.test' }), /recovery file changed/);

  const manifestChanged = await fixture(t);
  const second = await createResearchHandoffCandidate({ ...manifestChanged, attempt: 1,
    siteRevision: 'rev-1', domain: 'example.test' });
  await chmod(manifestChanged.recoveryRef.manifestPath, 0o600);
  await writeFile(manifestChanged.recoveryRef.manifestPath, '{}');
  await assert.rejects(verifyResearchHandoffCandidate(second, { ...manifestChanged, attempt: 1,
    siteRevision: 'rev-1', domain: 'example.test' }), /recovery manifest digest/);
});

test('approved partial research is copied from the verified recovery snapshot for content integration', async t => {
  const f = await fixture(t), projectPath = join(f.root, 'site'); await mkdir(projectPath);
  const reference = await createResearchHandoffCandidate({ ...f, attempt: 1,
    siteRevision: 'rev-1', domain: 'example.test' });
  const manifest = await verifyResearchHandoffCandidate(reference, { ...f, attempt: 1,
    siteRevision: 'rev-1', domain: 'example.test' });
  const prepared = await prepareResearchHandoff({ runId: f.runId, runDirectory: f.runDirectory,
    inputs: { projectPath }, researchHandoff: { reference: { ...reference, approved: true }, manifest },
    upstream: [{ skill: STAGE.HOMEPAGE_RESEARCH, artifacts: [] },
      { skill: STAGE.KEYWORD_RESEARCH, artifacts: [] }] });
  assert.equal(prepared.manifest.kind, 'RESEARCH_HANDOFF_MANIFEST_V1');
  assert.equal(await readFile(join(prepared.keywordsRoot, 'Partial guide素材.md'), 'utf8'),
    '- 关键词: Partial guide\n- 状态: PARTIAL\n- 缺口: missing fact\n');
  assert.equal(JSON.parse(await readFile(join(prepared.keywordsRoot, 'keywords.json')))
    .categories[0].keywords.length, 3);
});
