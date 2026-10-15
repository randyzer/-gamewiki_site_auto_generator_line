import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile, symlink } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fixture } from './helpers.mjs';
import { STAGES, ARTIFACTS } from '../src/pipeline.mjs';
import { validateNativeArtifacts } from '../src/artifact-validator.mjs';
import { runProcess } from '../src/process.mjs';
import { sha256 } from '../src/files.mjs';
import { prepareResearchHandoff } from '../src/handoff.mjs';

async function nativeFixture(t, index) {
  const f = await fixture(t), project = join(f.configuration.workspace, 'site');
  const nativeDirectory = join(f.configuration.workspace, 'native');
  await mkdir(nativeDirectory); await mkdir(project);
  const context = { runId: 'offline-contract', nativeDirectory, runDirectory: f.configuration.workspace,
    outputDirectory: join(f.configuration.workspace, 'snapshot'), mode: 'audit-only',
    templateRoots: f.configuration.templateRoots,
    skillLock: { source: fileURLToPath(new URL('../../codex-skills/' + STAGES[index] + '/SKILL.md', import.meta.url)) },
    inputs: { ...f.inputs, projectPath: project, gameIdentity: 'Offline Fixture' }, requiredArtifacts: ARTIFACTS[index], upstream: [] };
  const result = { status: 'PASSED', evidence: ['OFFLINE structural fixture; no research performed'], missing_inputs: [], artifacts: [] };
  const add = async (kind, content, file = join(nativeDirectory, kind)) => {
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, typeof content === 'string' || Buffer.isBuffer(content) ? content : JSON.stringify(content));
    result.artifacts.push({ kind, path: file }); return file;
  };
  for (const kind of ARTIFACTS[index].filter(k => k.endsWith('.md') && k !== 'KEYWORD_MATERIALS.md')) await add(kind, '# Offline fixture\nOffline Fixture guide: synthetic evidence, not real research');
  if (index === 0) {
    const data = { home: { meta: { title: 'Offline fixture' }, hero: { stats: [] }, start: { cards: [{}, {}, {}, {}] }, aboutGame: { stats: [] } },
      metadata: { title: 'Offline fixture', description: 'x'.repeat(150), keywords: 'fixture' }, sidebarCodes: {} };
    result.artifacts = [];
    await add('HOMEPAGE_RESEARCH.md', '# Offline fixture only\n```json\n' + JSON.stringify(data) + '\n```', join(nativeDirectory, 'backgroundinformation/Offline Fixture攻略站首页调研信息.md'));
    const zip = join(nativeDirectory, 'backgroundinformation/Offline Fixture图标.zip');
    await runProcess('python3', [fileURLToPath(new URL('./fixtures/favicon-binary-fixture.py', import.meta.url)), zip]);
    result.artifacts.push({ kind: 'ICON.zip', path: zip });
  }
  if (index === 1) {
    await add('keywords.json', { categories: [{ category: 'Guide', keywords: ['Offline Fixture guide'] }] });
    const headings = ['搜索意图', 'Google / 网页素材', 'YouTube 素材', '官方素材', '交叉验证结果', '可用于内页的内容框架', '调研限制'];
    await writeFile(join(nativeDirectory, 'Offline Fixture guide素材.md'), '- 关键词: Offline Fixture guide\n- 状态: COMPLETED\n' + headings.map(h => '## ' + h + '\nOffline test fixture only').join('\n'));
  }
  if (index === 2) {
    await writeFile(join(project, 'index.html'), 'offline fixture');
    await add('template-copy-manifest.json', { schema_version: 1, game: context.inputs.gameIdentity, destination: project, source_unchanged: true, destination_verified: true, files: { 'index.html': sha256('offline fixture') } });
    await add('TEMPLATE_RESIDUE_SCAN.json', { findings: [] });
  }
  if (index === 3) {
    const upstreamPath = join(nativeDirectory, 'keywords.json');
    await writeFile(upstreamPath, JSON.stringify({ categories: [{ category: 'Guide', keywords: ['Offline Fixture guide'] }] }));
    context.upstream = [{ skill: STAGES[0] }, { skill: STAGES[1], artifacts: [{ kind: 'keywords.json', path: upstreamPath }] }];
    await writeFile(join(project, 'index.html'), 'offline fixture');
    await add('CONTENT_PAGE_MANIFEST.json', { schema_version: 1, game: context.inputs.gameIdentity,
      counts: { keywords: 1, published: 1, draft: 0, blocked: 0 },
      pages: [{ keyword: 'Offline Fixture guide', outcome: 'PUBLISHED', route: '/', source_file: 'index.html', material_file: 'Offline Fixture guide素材.md', material_status: 'COMPLETED' }] });
  }
  if (index === 4) {
    const dir = join(project, 'docs/ui-ux-audit', context.runId);
    result.artifacts = [];
    for (const kind of ARTIFACTS[index].filter(k => k.endsWith('.md'))) await add(kind, '# Offline fixture', join(dir, kind));
    await add('UI_UX_AUDIT.json', { schema_version: 1, game: context.inputs.gameIdentity, mode: 'audit-only', verdict: 'SHIP', routes: [{ route: '/', archetype: 'home', reason: 'fixture' }],
      findings: [], viewports: [360, 390, 768, 1024, 1440, 1920], summary: { blocker: 0, high: 0, medium: 0, low: 0, note: 0 } }, join(dir, 'UI_UX_AUDIT.json'));
    await mkdir(join(dir, 'screenshots')); await writeFile(join(dir, 'screenshots/offline.png'), 'Offline screenshot fixture');
    await writeFile(join(dirname(dir), 'LATEST'), context.runId);
  }
  if (index === 5) await add('PRELAUNCH_ACCEPTANCE.json', { schema_version: '1.0', run_id: context.runId, game: context.inputs.gameIdentity,
    project_path: project, expected_domain: 'https://' + context.inputs.domain, mode: 'audit-only', coverage: { routes_expected: 1, routes_checked: 1, limitations: [] },
    pages: [{ path: '/' }], checks: [], seo_url_audit: { robots: { status: 'PASS' }, sitemap: { status: 'PASS' } }, findings: [], repairs: [], disposition: '可以上线' });
  if (index === 6) await add('DEPLOYMENT_PLAN.json', { schema_version: 1, status: 'AWAITING_CONFIRMATION', confirmation: { status: 'AWAITING_CONFIRMATION' },
    project: { path: project, repository: context.inputs.repo, branch: context.inputs.branch }, domain: { production_origin: 'https://' + context.inputs.domain },
    github_sync: { push_authorized: false }, architecture: {}, hosting: {}, measurement: {}, checks: [], risks: [], rollback: [] });
  return { ...f, context, result, validate: () => validateNativeArtifacts(STAGES[index], context, result) };
}

for (let i = 0; i < 7; i++) test('native stage contract accepts structural fixture: ' + STAGES[i], async t => {
  const f = await nativeFixture(t, i); const result = await f.validate();
  assert.equal(result.status, 'PASSED'); assert.ok(result.artifacts.length >= ARTIFACTS[i].length);
  assert.ok(result.artifacts.every(a => a.sourcePath && (a.sourceSha256 || a.kind === 'KEYWORD_MATERIALS.md')));
});
test('homepage rejects directories, invalid ZIP and missing native fields', async t => {
  const f = await nativeFixture(t, 0); const zip = f.result.artifacts.find(a => a.kind === 'ICON.zip');
  await writeFile(zip.path, 'not a zip'); await assert.rejects(f.validate());
  zip.path = f.context.nativeDirectory; await assert.rejects(f.validate(), /regular artifact/);
});
test('symlink escape is rejected before invoking validators', async t => {
  const f = await nativeFixture(t, 0); const alias = join(f.context.nativeDirectory, 'alias');
  await symlink(f.inputs.rawKeywordsFile, alias); f.result.artifacts[0].path = alias;
  await assert.rejects(f.validate(), /Linked path/);
});
test('partial keyword material cannot be labeled PASSED', async t => {
  const f = await nativeFixture(t, 1), file = join(f.context.nativeDirectory, 'Offline Fixture guide素材.md');
  await writeFile(file, (await readFile(file, 'utf8')).replace('COMPLETED', 'PARTIAL'));
  await assert.rejects(f.validate(), /Incomplete keyword/);
});
test('template mismatch and nonexistent content source fail validation', async t => {
  const f = await nativeFixture(t, 2); await writeFile(join(f.context.inputs.projectPath, 'index.html'), 'tampered');
  await assert.rejects(f.validate(), /content mismatch/);
  const content = await nativeFixture(t, 3); const item = content.result.artifacts.find(a => a.kind === 'CONTENT_PAGE_MANIFEST.json');
  const data = JSON.parse(await readFile(item.path)); data.pages[0].source_file = '../outside'; await writeFile(item.path, JSON.stringify(data));
  await assert.rejects(content.validate(), /outside/);
});
test('prelaunch wrong origin and unresolved P1 cannot enter deployment planning', async t => {
  const f = await nativeFixture(t, 5); const item = f.result.artifacts.find(a => a.kind === 'PRELAUNCH_ACCEPTANCE.json');
  const data = JSON.parse(await readFile(item.path)); data.expected_domain = 'https://wrong.test'; await writeFile(item.path, JSON.stringify(data));
  await assert.rejects(f.validate(), /identity mismatch/);
  data.expected_domain = 'https://' + f.inputs.domain;
  data.findings = [{ id: 'PL-1', severity: 'P1', status: 'OPEN', page: '/', evidence: 'fixture', recommendation: 'fix' }];
  await writeFile(item.path, JSON.stringify(data)); await assert.rejects(f.validate());
});
test('deployment cannot report itself approved or use another domain', async t => {
  const f = await nativeFixture(t, 6); const item = f.result.artifacts.find(a => a.kind === 'DEPLOYMENT_PLAN.json');
  const data = JSON.parse(await readFile(item.path)); data.status = 'APPROVED'; await writeFile(item.path, JSON.stringify(data));
  await assert.rejects(f.validate(), /await confirmation/);
});

test('complete handoff passes the native content-integrator preflight and is idempotent', async t => {
  const homepage = await nativeFixture(t, 0), keywords = await nativeFixture(t, 1);
  const context = homepage.context;
  const stages = [];
  for (const [index, fixture] of [homepage, keywords].entries()) {
    const result = await fixture.validate(); const artifacts = [];
    for (const [number, item] of result.artifacts.entries()) {
      const path = join(context.runDirectory, 'handoff-snapshots', String(index), String(number));
      await mkdir(dirname(path), { recursive: true }); await writeFile(path, Buffer.from(item.content, 'base64'));
      artifacts.push({ ...item, path, projectPath: context.inputs.projectPath, sha256: sha256(Buffer.from(item.content, 'base64')) });
    }
    stages.push({ skill: STAGES[index], artifacts });
  }
  context.upstream = stages;
  await prepareResearchHandoff(context); await prepareResearchHandoff(context);
  const project = context.inputs.projectPath;
  await mkdir(join(project, 'app')); await mkdir(join(project, 'docs'));
  await writeFile(join(project, 'package.json'), '{}');
  await writeFile(join(project, 'docs/TEMPLATE_SELECTION_REPORT.md'), 'Offline fixture');
  await writeFile(join(project, 'docs/template-copy-manifest.json'), JSON.stringify({ destination: project }));
  const output = join(context.runDirectory, 'preflight.json');
  const script = fileURLToPath(new URL('../../codex-skills/game-site-content-integrator/scripts/preflight.py', import.meta.url));
  await runProcess('python3', [script, '--game', context.inputs.gameIdentity, '--workspace', project, '--output', output]);
  const data = JSON.parse(await readFile(output));
  assert.equal(data.ready, true);
  assert.equal(data.resolved_inputs.keywords, join(project, 'backgroundinformation/keyword-materials/keywords.json'));
});
