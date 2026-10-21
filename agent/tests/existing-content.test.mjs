import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, access, chmod, readdir, symlink } from 'node:fs/promises';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { prepareExistingProject } from '../src/existing-project.mjs';
import { sha256, treeFiles } from '../src/files.mjs';
import { runProcess } from '../src/process.mjs';

const nativeRoot = fileURLToPath(new URL('../../codex-skills/game-site-content-integrator/', import.meta.url));
const game = 'Offline Fixture';
const keyword = game + ' beginner guide';
const icons = ['apple-touch-icon.png', 'favicon-32x32.png', 'favicon-16x16.png', 'favicon.ico', 'site.webmanifest', 'android-chrome-192x192.png', 'android-chrome-512x512.png'];
async function api() {
  let adapter, validator;
  try { adapter = await import('../src/existing-content-adapter.mjs'); validator = await import('../src/existing-content-validator.mjs'); }
  catch (error) { if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error; }
  assert.equal(typeof adapter?.prepareExistingContent, 'function', 'existing-project native adaptation must exist');
  assert.equal(typeof validator?.validateExistingContentArtifacts, 'function');
  return { ...adapter, ...validator };
}
async function put(file, bytes) { await mkdir(dirname(file), { recursive: true }); await writeFile(file, bytes); return file; }
async function setup(t, { scripts = { check: 'node --check scripts/offline-check.mjs', build: 'astro build' }, files = {} } = {}) {
  const root = await mkdtemp(fileURLToPath(new URL('../.existing-content-test-', import.meta.url)));
  t.after(() => rm(root, { recursive: true, force: true }));
  const source = join(root, 'source'), project = join(root, 'candidate'), runDirectory = join(root, 'run');
  await mkdir(source); await mkdir(runDirectory);
  execFileSync('git', ['init', '-q', source]);
  await put(join(source, 'package.json'), JSON.stringify({ dependencies: { astro: '6' }, scripts }));
  await put(join(source, 'package-lock.json'), '{"name":"offline-fixture","lockfileVersion":3}');
  await put(join(source, 'scripts/offline-check.mjs'), '// OFFLINE STRUCTURAL FIXTURE\n');
  for (const [name, bytes] of Object.entries(files)) await put(join(source, name), bytes);
  await put(join(source, 'src/pages/index.astro'), '<h1>Offline Fixture only</h1>');
  await put(join(source, 'game.config.ts'), 'export const origin = "https://fixture.test";');
  execFileSync('git', ['-C', source, 'add', '.']);
  execFileSync('git', ['-C', source, '-c', 'user.name=Offline Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'offline baseline']);
  const rawKeywordsFile = await put(join(source, 'background_information/关键词.md'), '- ' + keyword);
  const sourceEntry = { path: source, protectedPaths: ['background_information'] };
  const { baseline } = await prepareExistingProject({ targetId: 'fixture', allowlist: { targets: { fixture: sourceEntry } }, runDirectory, candidateProjectPath: project, rawKeywordsFile });
  const nativeDirectory = join(runDirectory, 'native'); await mkdir(nativeDirectory);
  const skillFiles = [];
  for (const file of await treeFiles(nativeRoot)) skillFiles.push([relative(nativeRoot, file), sha256(await readFile(file))]);
  const context = { runId: 'offline-content', runDirectory, nativeDirectory,
    inputs: { mode: 'existing-project', targetId: 'fixture', gameIdentity: game, projectPath: project, sourceProjectPath: source,
      rawKeywordsFile, researchRootName: 'background_information', canonicalOrigin: 'https://fixture.test', canonicalRequired: true },
    existingProject: { baseline, sourceEntry }, templateRoots: [join(root, 'templates')], permissions: { siteWrites: true, advertisingScripts: false },
    skillLock: { name: 'game-site-content-integrator', source: join(nativeRoot, 'SKILL.md'), sha256: sha256(await readFile(join(nativeRoot, 'SKILL.md'))),
      contractVersion: 1, version: 'tree-sha256:' + sha256(JSON.stringify(skillFiles)) }, upstream: [{ skill: 'game-homepage-icon-research', status: 'PASSED', artifacts: [] }, { skill: 'game-innerpage-keyword-information-research', status: 'PASSED', artifacts: [] }] };
  const homepageRoot = join(project, 'background_information'), keywordsRoot = join(homepageRoot, 'keyword-materials');
  context.researchHandoff = { homepageRoot, keywordsRoot };
  async function research(index, kind, filename, content) {
    const target = join(index === 0 ? homepageRoot : keywordsRoot, filename), snapshot = join(runDirectory, 'upstream', String(index), filename);
    await put(target, content); await put(snapshot, content);
    context.upstream[index].artifacts.push({ kind, path: snapshot, sourcePath: target, sha256: sha256(content), sourceSha256: sha256(content),
      runId: context.runId, projectPath: project, gameIdentity: game });
  }
  await research(0, 'HOMEPAGE_RESEARCH.md', game + '攻略站首页调研信息.md', '# Offline Fixture 首页调研\nOFFLINE STRUCTURAL FIXTURE, no market research\n```json\n{"metadata":{"title":"Offline Fixture"}}\n```');
  const zip = join(nativeDirectory, 'fixture.zip');
  await runProcess('python3', ['-c', 'import zipfile,sys\nwith zipfile.ZipFile(sys.argv[1],"w") as z:\n for n in sys.argv[2:]: z.writestr(n,"OFFLINE STRUCTURAL FIXTURE")', zip, ...icons]);
  await research(0, 'ICON.zip', game + '图标.zip', await readFile(zip));
  await research(1, 'keywords.json', 'keywords.json', JSON.stringify({ categories: [{ category: 'Guide', keywords: [keyword] }] }));
  await research(1, '关键词处理记录.md', '关键词处理记录.md', '# 关键词处理记录\n- 游戏名: Offline Fixture\n- 原始关键词文件: ' + rawKeywordsFile + '\n## 保留与规范化\n| ' + keyword + ' | ' + keyword + ' | 保留 | 用户文件 |\n## 同义词合并\n无\n## 排除项\n无');
  await research(1, '关键词素材汇总.md', '关键词素材汇总.md', '# 关键词素材汇总\n| ' + keyword + ' | Guide | COMPLETED | 1 | 0 | 1 | 0 | ' + keyword + '素材.md |');
  const material = '# ' + keyword + ' 素材\n- 游戏名: Offline Fixture\n- 关键词: ' + keyword + '\n- 状态: COMPLETED\n- 调研日期: 2026-10-13\n## 搜索意图\nOffline fixture only\n## Google / 网页素材\n- URL: https://example.test/official\n- 访问日期: 2026-10-13\n- 适用版本: offline-v1\n## YouTube 素材\n无\n## 官方素材\nSynthetic source only\n## 交叉验证结果\nSynthetic fixture only\n## 可用于内页的内容框架\nOffline fixture only\n## 调研限制\nNo real research';
  await research(1, 'keyword-material:' + keyword, keyword + '素材.md', material);
  return { root, context, research, source, project, runDirectory, keyword, icons };
}
// This compiler only copies static fixture HTML. It is not an Astro build or real research.
async function offlineBuild(context) {
  const project = context.inputs.projectPath;
  async function compile(directory, relativeRoot = '') {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name), rel = join(relativeRoot, entry.name);
      if (entry.isDirectory()) await compile(path, rel);
      else if (entry.name.endsWith('.astro')) {
        const text = await readFile(path, 'utf8');
        assert.ok(text.startsWith('<html>'), 'OFFLINE compiler rejected invalid fixture source');
        await put(join(project, 'dist', rel.replace(/\.astro$/, '') , 'index.html'), text);
      }
    }
  }
  await compile(join(project, 'src/pages'));
  // Fixture index.astro maps to / rather than /index.
  const homepage = join(project, 'dist/index/index.html');
  await put(join(project, 'dist/index.html'), await readFile(homepage));
  await rm(join(project, 'dist/index'), { recursive: true });
  for (const name of ['robots.txt', 'sitemap.xml']) await put(join(project, 'dist', name), await readFile(join(project, 'public', name)));
  return { fixture: 'OFFLINE STRUCTURAL COMPILER; not Astro or market research' };
}
async function integrated(f) {
  const { context, keyword, project } = f;
  const title = keyword + ': First Steps';
  const description = keyword + ' for this offline structural fixture. ' + 'Synthetic validation evidence only. '.repeat(3);
  const trimmed = description.slice(0, 150);
  const page = { keyword, category: 'Guide', material_file: keyword + '素材.md', material_status: 'COMPLETED', outcome: 'PUBLISHED',
    route: '/guides/beginner', source_file: 'src/pages/guides/beginner.astro', title_length: title.length, description_length: trimmed.length, last_verified: '2026-10-13', notes: [] };
  const manifest = { schema_version: 1, game, counts: { keywords: 1, published: 1, draft: 0, blocked: 0 }, pages: [page] };
  const html = (route, titleText, descriptionText) => '<html><head><title>' + titleText + '</title><meta name="description" content="' + descriptionText + '"><link rel="canonical" href="https://fixture.test' + route + '"><meta property="og:url" content="https://fixture.test' + route + '"></head><body>OFFLINE FIXTURE</body></html>';
  await put(join(project, 'src/pages/index.astro'), html('/', 'Offline Fixture', 'Offline structural fixture only'));
  await put(join(project, page.source_file), html(page.route, title, trimmed));
  await put(join(project, 'public/robots.txt'), 'User-agent: *\nAllow: /\nSitemap: https://fixture.test/sitemap.xml\n');
  await put(join(project, 'public/sitemap.xml'), '<urlset><url><loc>https://fixture.test/</loc></url><url><loc>https://fixture.test/guides/beginner</loc></url></urlset>');
  for (const name of f.icons) await put(join(project, 'public', name), 'OFFLINE STRUCTURAL FIXTURE');
  const byKind = new Map();
  for (const [kind, content] of Object.entries({
    'CONTENT_PAGE_MANIFEST.json': JSON.stringify(manifest),
    'CONTENT_INTEGRATION_REPORT.md': '# Content integration\nOFFLINE FIXTURE\nFinal status: COMPLETED\n',
    'CONTENT_PROVENANCE.md': '# Provenance\n' + keyword + '\n' + keyword + '素材.md\nhttps://example.test/official\noffline-v1\n2026-10-13',
    'CONTENT_GAPS.md': '# Gaps\nOFFLINE FIXTURE: none in structural checks'
  })) { const path = await put(join(project, 'docs', kind), content); byKind.set(kind, { path, bytes: Buffer.from(content) }); }
  await offlineBuild(context);
  return { byKind, manifest, page };
}

test('real executor applies existing adoption before worker and validates generated output through the artifact adapter', async t => {
  const f=await setup(t);
  const {createSkillExecutor}=await import('../src/skill-executor.mjs');
  const {prepareExistingContent}=await import('../src/existing-content-adapter.mjs');
  const {STAGES,ARTIFACTS}=await import('../src/pipeline.mjs');
  const outputDirectory=join(f.runDirectory,'artifacts/3/1');
  const readinessPath=join(outputDirectory,'host-readiness/STAGE4_READINESS_ATTESTATION.json');
  await mkdir(dirname(readinessPath),{recursive:true});await writeFile(readinessPath,'{}',{mode:0o400});
  const attestation={readiness:'READY'};
  const context={...f.context,outputDirectory,nativeDirectory:join(outputDirectory,'native'),requiredArtifacts:ARTIFACTS[3],
    existingContent:await prepareExistingContent(f.context),stage4Readiness:{path:readinessPath,digest:'a'.repeat(64),
      fileSha256:'b'.repeat(64),attestation}};
  let workerCalled=false;
  const executor=createSkillExecutor({validationOptions:{existingContentBuild:offlineBuild},
    verifyStage4Readiness:async binding=>binding.attestation,run:async(_command,args,options)=>{
    workerCalled=true;
    assert.ok(args.includes('--ignore-user-config'));
    assert.equal(args.includes('--sandbox'),false);
    assert.ok(args.includes('default_permissions="agent-worker"'));
    assert.equal(args.includes('--add-dir'),false);
    const profile=args.find(value=>value.startsWith('permissions.agent-worker='));
    assert.ok(profile.includes(JSON.stringify(f.project)+'="write"'));
    assert.equal(profile.includes(JSON.stringify(f.context.existingProject.sourceEntry.path)+'="write"'),false);
    assert.match(options.input,/EXISTING_PROJECT_CONTENT_ADAPTER_V1/);
    assert.match(options.input,/Never create synthetic template evidence/);
    const {byKind}=await integrated(f);
    await writeFile(args[args.indexOf('--output-last-message')+1],JSON.stringify({status:'PASSED',summary:'OFFLINE INTEGRATION FIXTURE',
      evidence:['OFFLINE EXECUTOR FIXTURE, real native validation'],missing_inputs:[],artifacts:[...byKind].map(([kind,item])=>({kind,path:item.path}))}));
  }});
  const result=await executor(STAGES[3],context);
  assert.equal(workerCalled,true);assert.equal(result.status,'PASSED');
  assert.ok(result.artifacts.some(item=>item.kind==='EXISTING_CONTENT_VALIDATION.json'));
  assert.equal(await readFile(f.context.inputs.rawKeywordsFile,'utf8'),'- '+keyword);
});

test('existing content records truthful adoption of legacy research without fake template evidence', async t => {
  const f = await setup(t), { prepareExistingContent } = await api();
  const result = await prepareExistingContent(f.context);
  assert.equal(result.contract.id, 'EXISTING_PROJECT_CONTENT_ADAPTER_V1');
  assert.equal(result.preflight.ready, true);
  assert.equal(result.adoption.baseline.digest, f.context.existingProject.baseline.digest);
  assert.equal(result.adoption.research.root, f.context.researchHandoff.homepageRoot);
  assert.equal(result.adoption.nativeCopiedTemplatePreflightPassed, false);
  assert.equal(result.adoption.sourceWrites, false);
  for (const name of ['TEMPLATE_SELECTION_REPORT.md', 'template-copy-manifest.json']) await assert.rejects(access(join(f.project, 'docs', name)), { code: 'ENOENT' });
  assert.match(await readFile(result.adoptionMarkdownPath, 'utf8'), /EXISTING_PROJECT_CONTENT_ADAPTER_V1/);
  await prepareExistingContent(f.context);
});

test('adoption rejects source drift and baseline version tampering before candidate writes', async t => {
  const f = await setup(t), { prepareExistingContent } = await api();
  await writeFile(join(f.source, 'src/pages/index.astro'), 'changed source');
  await assert.rejects(prepareExistingContent(f.context), /baseline drift/i);
  await assert.rejects(access(join(f.project, 'docs/EXISTING_PROJECT_ADOPTION.json')), { code: 'ENOENT' });
  const stalePolicy = await setup(t); stalePolicy.context.existingProject.baseline.snapshotPolicyVersion = 99;
  await assert.rejects(prepareExistingContent(stalePolicy.context), /snapshot policy\/baseline version/i);
});

test('adoption rejects research ambiguity, missing processing records and handoff tampering', async t => {
  const { prepareExistingContent } = await api();
  const ambiguous = await setup(t); await mkdir(join(ambiguous.project, 'backgroundinformation'));
  await assert.rejects(prepareExistingContent(ambiguous.context), /Ambiguous research roots/);
  const missing = await setup(t); await rm(join(missing.context.researchHandoff.keywordsRoot, '关键词处理记录.md'));
  await assert.rejects(prepareExistingContent(missing.context), /processing record|处理记录/);
  const tampered = await setup(t); await writeFile(join(tampered.context.researchHandoff.keywordsRoot, keyword + '素材.md'), '- 状态: COMPLETED');
  await assert.rejects(prepareExistingContent(tampered.context), /hash mismatch|handoff/i);
});

test('unsafe icon members and changed skill lock fail the explicit contract', async t => {
  const { prepareExistingContent } = await api();
  const f = await setup(t); f.context.skillLock.version = 'tree-sha256:' + '0'.repeat(64);
  await assert.rejects(prepareExistingContent(f.context), /skill.*version|lock.*mismatch/i);
  const unsafe = await setup(t), zip = join(unsafe.context.nativeDirectory, 'unsafe.zip');
  await runProcess('python3', ['-c', 'import zipfile,sys\nwith zipfile.ZipFile(sys.argv[1],"w") as z:\n z.writestr("../escape.txt","offline")\n for n in sys.argv[2:]: z.writestr(n,"offline")', zip, ...icons]);
  unsafe.context.upstream[0].artifacts = unsafe.context.upstream[0].artifacts.filter(a => a.kind !== 'ICON.zip');
  await unsafe.research(0, 'ICON.zip', game + '图标.zip', await readFile(zip));
  await assert.rejects(prepareExistingContent(unsafe.context), /unsafe path|icon ZIP/i);
});

test('validation runs actual native integration checks with explicit origin and legacy root', async t => {
  const f = await setup(t), { prepareExistingContent, validateExistingContentArtifacts } = await api();
  f.context.existingContent = await prepareExistingContent(f.context);
  const { byKind } = await integrated(f);
  const validation = await validateExistingContentArtifacts(f.context, { byKind, build: offlineBuild });
  assert.equal(validation.native.valid, true);
  assert.equal(validation.seo.origin, 'https://fixture.test');
  assert.equal(validation.nativeCopiedTemplatePreflightPassed, false);
});

test('validation rejects mismatched material lineage and refuses blocked research publication', async t => {
  const f = await setup(t), { prepareExistingContent, validateExistingContentArtifacts } = await api();
  f.context.existingContent = await prepareExistingContent(f.context);
  const { byKind, manifest } = await integrated(f);
  manifest.pages[0].material_file = 'unrelated素材.md';
  const item = byKind.get('CONTENT_PAGE_MANIFEST.json'); item.bytes = Buffer.from(JSON.stringify(manifest)); await writeFile(item.path, item.bytes);
  await assert.rejects(validateExistingContentArtifacts(f.context, { byKind, build: offlineBuild }), /material lineage/i);
  manifest.pages[0].material_file = keyword + '素材.md'; manifest.pages[0].material_status = 'BLOCKED';
  item.bytes = Buffer.from(JSON.stringify(manifest)); await writeFile(item.path, item.bytes);
  await assert.rejects(validateExistingContentArtifacts(f.context, { byKind, build: offlineBuild }), /material status/i);
});

test('validation rejects sitemap extra drafts, stale canonical host and undisclosed native failure', async t => {
  const { prepareExistingContent, validateExistingContentArtifacts } = await api();
  const extra = await setup(t); extra.context.existingContent = await prepareExistingContent(extra.context); const output = await integrated(extra);
  await put(join(extra.project, 'public/sitemap.xml'), '<urlset><url><loc>https://fixture.test/</loc></url><url><loc>https://fixture.test/guides/beginner</loc></url><url><loc>https://fixture.test/drafts/unverified</loc></url></urlset>');
  await offlineBuild(extra.context);
  await assert.rejects(validateExistingContentArtifacts(extra.context, { byKind: output.byKind, build: offlineBuild }), /sitemap.*published|sitemap.*route/i);
  const stale = await setup(t); stale.context.existingContent = await prepareExistingContent(stale.context); const staleOutput = await integrated(stale);
  const rendered = join(stale.project, 'src/pages/guides/beginner.astro'); await writeFile(rendered, (await readFile(rendered, 'utf8')).replaceAll('https://fixture.test/guides/beginner', 'https://old.test/guides/beginner'));
  await offlineBuild(stale.context);
  await assert.rejects(validateExistingContentArtifacts(stale.context, { byKind: staleOutput.byKind, build: offlineBuild }), /canonical.*origin/i);
  const nativeFailure = await setup(t); nativeFailure.context.existingContent = await prepareExistingContent(nativeFailure.context); const nativeOutput = await integrated(nativeFailure);
  await assert.rejects(validateExistingContentArtifacts(nativeFailure.context, { byKind: nativeOutput.byKind, build: offlineBuild, run: async () => { throw Error('native validation failed'); } }), /native validation failed/);
});

test('generated Astro SEO without rendered evidence is CONTRACT_INCOMPATIBLE, never a false pass', async t => {
  const f = await setup(t), { prepareExistingContent, validateExistingContentArtifacts } = await api();
  f.context.existingContent = await prepareExistingContent(f.context); const { byKind } = await integrated(f); await rm(join(f.project, 'dist'), { recursive: true });
  await assert.rejects(validateExistingContentArtifacts(f.context, { byKind, build: async () => {} }), error => error.code === 'CONTRACT_INCOMPATIBLE' && /rendered/i.test(error.message));
});

test('a candidate Git metadata file is rejected instead of being silently excluded', async t => {
  const f = await setup(t), { prepareExistingContent } = await api();
  await put(join(f.project, '.git'), 'gitdir: /offline/fixture');
  await assert.rejects(prepareExistingContent(f.context), /without Git metadata/);
});

test('a draft route requires noindex and cannot appear in navigation or sitemap', async t => {
  const f = await setup(t), { prepareExistingContent, validateExistingContentArtifacts } = await api();
  f.context.existingContent = await prepareExistingContent(f.context);
  const { byKind, manifest } = await integrated(f);
  manifest.pages[0].outcome = 'DRAFT'; manifest.counts.published = 0; manifest.counts.draft = 1;
  const item = byKind.get('CONTENT_PAGE_MANIFEST.json'); item.bytes = Buffer.from(JSON.stringify(manifest)); await writeFile(item.path, item.bytes);
  await put(join(f.project, 'public/sitemap.xml'), '<urlset><url><loc>https://fixture.test/</loc></url></urlset>');
  await offlineBuild(f.context);
  await assert.rejects(validateExistingContentArtifacts(f.context, { byKind, build: offlineBuild }), /draft.*noindex/i);
  const rendered = join(f.project, 'src/pages/guides/beginner.astro'); await writeFile(rendered, (await readFile(rendered, 'utf8')).replace('<head>', '<head><meta name="robots" content="noindex,nofollow">'));
  await offlineBuild(f.context);
  assert.equal((await validateExistingContentArtifacts(f.context, { byKind, build: offlineBuild })).native.valid, true);
  const homepage = join(f.project, 'src/pages/index.astro'); await writeFile(homepage, (await readFile(homepage, 'utf8')).replace('</body>', '<a href="/guides/beginner">draft fixture</a></body>'));
  await offlineBuild(f.context);
  await assert.rejects(validateExistingContentArtifacts(f.context, { byKind, build: offlineBuild }), /draft.*navigation/i);
});

test('installed favicon bytes must match the adopted ZIP', async t => {
  const f = await setup(t), { prepareExistingContent, validateExistingContentArtifacts } = await api();
  f.context.existingContent = await prepareExistingContent(f.context); const { byKind } = await integrated(f);
  await writeFile(join(f.project, 'public/favicon.ico'), 'tampered offline fixture');
  await assert.rejects(validateExistingContentArtifacts(f.context, { byKind, build: offlineBuild }), /favicon differs/);
});

test('fake copy evidence and modified adoption records are rejected after the worker', async t => {
  const f = await setup(t), { prepareExistingContent, validateExistingContentArtifacts } = await api();
  f.context.existingContent = await prepareExistingContent(f.context); const { byKind } = await integrated(f);
  await put(join(f.project, 'docs/template-copy-manifest.json'), '{"fabricated":true}');
  await assert.rejects(validateExistingContentArtifacts(f.context, { byKind, build: offlineBuild }), /synthetic template evidence/i);
  await rm(join(f.project, 'docs/template-copy-manifest.json'));
  const adopted = f.context.existingContent.adoptionJsonPath, value = JSON.parse(await readFile(adopted)); value.research.materials[0].status = 'PARTIAL'; await writeFile(adopted, JSON.stringify(value));
  await assert.rejects(validateExistingContentArtifacts(f.context, { byKind, build: offlineBuild }), /changed adoption/);
});

test('native validation failures preserve the exact read-only diagnostic report', async t => {
  const f = await setup(t), { prepareExistingContent, validateExistingContentArtifacts } = await api();
  f.context.existingContent = await prepareExistingContent(f.context); const { byKind } = await integrated(f);
  await put(join(f.project, 'src/unverified.ts'), 'export const unverified = "待确认";');
  await assert.rejects(validateExistingContentArtifacts(f.context, { byKind, build: offlineBuild }), /public implementation contains 待确认: src\/unverified.ts/);
  const native = JSON.parse(await readFile(join(f.context.nativeDirectory, 'EXISTING_CONTENT_NATIVE_VALIDATION.json')));
  assert.equal(native.valid, false);
  assert.ok(native.errors.some(error => error.includes('src/unverified.ts')));
});

async function adoptedFixture(t, options) {
  const f = await setup(t, options), { prepareExistingContent } = await api();
  f.context.existingContent = await prepareExistingContent(f.context);
  return { ...f, output: await integrated(f) };
}

test('worker cannot alter candidate raw keywords or protected baseline files, including modes', async t => {
  const { validateExistingContentArtifacts } = await api();
  for (const [name, mutate] of [
    ['raw bytes', f => writeFile(join(f.project, 'background_information/关键词.md'), '- OFFLINE altered keyword')],
    ['raw mode', f => chmod(join(f.project, 'background_information/关键词.md'), 0o777)],
    ['protected bytes', f => writeFile(join(f.project, 'background_information/legacy.md'), 'OFFLINE altered protected file')],
    ['protected mode', f => chmod(join(f.project, 'background_information/legacy.md'), 0o777)],
    ['protected deletion', f => rm(join(f.project, 'background_information/legacy.md'))]
  ]) await t.test(name, async child => {
    const f = await adoptedFixture(child, { files: { 'background_information/legacy.md': 'OFFLINE protected baseline' } });
    await mutate(f);
    await assert.rejects(validateExistingContentArtifacts(f.context, { byKind: f.output.byKind, build: offlineBuild }), /protected.*changed|immutable.*baseline/i);
    assert.equal(await readFile(f.context.inputs.rawKeywordsFile, 'utf8'), '- ' + keyword);
  });
});

test('worker cannot alter dependency lockfile bytes, modes or set', async t => {
  const { validateExistingContentArtifacts } = await api();
  for (const [name, mutate] of [
    ['lock bytes', f => writeFile(join(f.project, 'package-lock.json'), '{"lockfileVersion":2}')],
    ['lock mode', f => chmod(join(f.project, 'package-lock.json'), 0o777)],
    ['lock deletion', f => rm(join(f.project, 'package-lock.json'))],
    ['extra lock', f => put(join(f.project, 'pnpm-lock.yaml'), 'OFFLINE EXTRA LOCK')]
  ]) await t.test(name, async child => {
    const f = await adoptedFixture(child); await mutate(f);
    await assert.rejects(validateExistingContentArtifacts(f.context, { byKind: f.output.byKind, build: offlineBuild }), /dependency lock|lockfile/i);
  });
});

test('worker cannot introduce Git metadata or credential paths after adoption', async t => {
  const { validateExistingContentArtifacts } = await api();
  for (const [name, mutate] of [
    ['Git file', f => put(join(f.project, '.git'), 'gitdir: /offline/nonexistent/.git')],
    ['Git directory', f => mkdir(join(f.project, '.git'))],
    ['credential path', f => put(join(f.project, '.env'), 'OFFLINE FIXTURE ONLY')]
  ]) await t.test(name, async child => {
    const f = await adoptedFixture(child); await mutate(f);
    await assert.rejects(validateExistingContentArtifacts(f.context, { byKind: f.output.byKind, build: offlineBuild }), /Git metadata|credential path/i);
  });
});

test('a candidate dependency root cannot link to the read-only source project', async t => {
  const f = await adoptedFixture(t), { validateExistingContentArtifacts } = await api();
  await symlink(f.source, join(f.project, 'node_modules'));
  await assert.rejects(validateExistingContentArtifacts(f.context, { byKind: f.output.byKind, build: offlineBuild }), /linked path/i);
});

test('a draft without route cannot be published as a non-keyword site page', async t => {
  const f = await adoptedFixture(t), { validateExistingContentArtifacts } = await api();
  const { manifest, page, byKind } = f.output;
  manifest.site_pages = [{ outcome: 'PUBLISHED', route: page.route, source_file: page.source_file }];
  page.outcome = 'DRAFT'; delete page.route; manifest.counts.published = 0; manifest.counts.draft = 1;
  const item = byKind.get('CONTENT_PAGE_MANIFEST.json'); item.bytes = Buffer.from(JSON.stringify(manifest)); await writeFile(item.path, item.bytes);
  await assert.rejects(validateExistingContentArtifacts(f.context, { byKind, build: offlineBuild }), /draft|non-keyword.*source|site_pages/i);
});

test('site_pages cannot disguise a rendered draft by naming another baseline source', async t => {
  const f = await adoptedFixture(t), { validateExistingContentArtifacts } = await api();
  const { manifest, page, byKind } = f.output;
  manifest.site_pages = [{ outcome: 'PUBLISHED', route: page.route, source_file: 'src/pages/index.astro' }];
  page.outcome = 'DRAFT'; delete page.route; manifest.counts.published = 0; manifest.counts.draft = 1;
  const item = byKind.get('CONTENT_PAGE_MANIFEST.json'); item.bytes = Buffer.from(JSON.stringify(manifest)); await writeFile(item.path, item.bytes);
  await assert.rejects(validateExistingContentArtifacts(f.context, { byKind, build: offlineBuild }), /draft|source.*route|site_pages/i);
});

test('static Astro manifest routes must correspond to the declared source file', async t => {
  const f = await adoptedFixture(t), { validateExistingContentArtifacts } = await api();
  f.output.page.source_file = 'src/pages/index.astro';
  const item = f.output.byKind.get('CONTENT_PAGE_MANIFEST.json'); item.bytes = Buffer.from(JSON.stringify(f.output.manifest)); await writeFile(item.path, item.bytes);
  await assert.rejects(validateExistingContentArtifacts(f.context, { byKind: f.output.byKind, build: offlineBuild }), /source.*route|route.*source/i);
});

test('an explicitly retained original non-keyword Astro page can remain public', async t => {
  const about = '<html><head><title>Offline Fixture about</title><link rel="canonical" href="https://fixture.test/about"></head><body>OFFLINE ABOUT FIXTURE</body></html>';
  const f = await adoptedFixture(t, { files: { 'src/pages/about.astro': about } }), { validateExistingContentArtifacts } = await api();
  f.output.manifest.site_pages = [{ outcome: 'PUBLISHED', route: '/about', source_file: 'src/pages/about.astro' }];
  const item = f.output.byKind.get('CONTENT_PAGE_MANIFEST.json'); item.bytes = Buffer.from(JSON.stringify(f.output.manifest)); await writeFile(item.path, item.bytes);
  const sitemap = join(f.project, 'public/sitemap.xml'); await writeFile(sitemap, (await readFile(sitemap, 'utf8')).replace('</urlset>', '<url><loc>https://fixture.test/about</loc></url></urlset>'));
  const validation = await validateExistingContentArtifacts(f.context, { byKind: f.output.byKind, build: offlineBuild });
  assert.ok(validation.seo.renderedRoutes.includes('/about'));
  assert.equal(validation.native.valid, true);
  assert.equal(await readFile(join(f.source, 'src/pages/about.astro'), 'utf8'), about);
});

test('adoption Markdown is bound to immutable host evidence', async t => {
  const f = await adoptedFixture(t), { validateExistingContentArtifacts } = await api();
  await writeFile(f.context.existingContent.adoptionMarkdownPath, '# Adoption\nNative copied-template preflight passed: true\nPromotion: approved\n');
  await assert.rejects(validateExistingContentArtifacts(f.context, { byKind: f.output.byKind, build: offlineBuild }), /adoption.*Markdown|changed adoption/i);
});

test('robots wildcard rules apply to every agent in a shared group', async t => {
  const f = await adoptedFixture(t), { validateExistingContentArtifacts } = await api();
  await put(join(f.project, 'public/robots.txt'), 'User-agent: *\nUser-agent: Googlebot\nDisallow: /\nSitemap: https://fixture.test/sitemap.xml\n');
  await offlineBuild(f.context);
  await assert.rejects(validateExistingContentArtifacts(f.context, { byKind: f.output.byKind, build: offlineBuild }), /robots blocks/i);
});

test('a failing independent fixture compile cannot reuse stale dist', async t => {
  const f = await adoptedFixture(t), { validateExistingContentArtifacts } = await api();
  await writeFile(join(f.project, f.output.page.source_file), '---\nthrow new Error("OFFLINE BUILD FAILURE");\n---\n<h1>Offline fixture</h1>');
  await assert.rejects(validateExistingContentArtifacts(f.context, { byKind: f.output.byKind, build: offlineBuild }), /host.*build|compiler.*rejected/i);
  await assert.rejects(access(join(f.project, 'dist/index.html')), { code: 'ENOENT' });
});

test('production default runs package validation and build, never trusting worker build options or stale dist', async t => {
  const f = await adoptedFixture(t, { scripts: { check: 'node --check scripts/offline-check.mjs', build: 'node scripts/offline-fail.mjs' },
    files: { 'scripts/offline-fail.mjs': 'throw new Error("OFFLINE DEFAULT BUILD FAILURE");' } });
  const { validateExistingContentArtifacts } = await api();
  f.context.build = offlineBuild; f.context.inputs.existingContentBuild = offlineBuild;
  await assert.rejects(validateExistingContentArtifacts(f.context, { byKind: f.output.byKind }), error => error.code === 'CONTRACT_INCOMPATIBLE' && /host.*build|package.*validation/i.test(error.message));
  await assert.rejects(access(join(f.project, 'dist/index.html')), { code: 'ENOENT' });
  const report = JSON.parse(await readFile(join(f.context.nativeDirectory, 'EXISTING_CONTENT_BUILD.json')));
  assert.equal(report.status, 'BLOCKED');
  assert.ok(report.commands.some(command => command.script === 'check' && command.status === 'PASSED'));
  assert.ok(report.commands.some(command => command.script === 'build' && command.status === 'FAILED'));
});

test('production default executes a successful offline package build and replaces all worker dist', async t => {
  const compiler = 'import assert from "node:assert/strict";\nimport {mkdir,writeFile,readFile,rm,readdir} from "node:fs/promises";\n' +
    'import {join,dirname} from "node:path";\n' + put.toString() + '\n' + offlineBuild.toString() +
    '\nawait readFile(".astro/offline-check.marker");\nawait offlineBuild({inputs:{projectPath:process.cwd()}});\n';
  const f = await adoptedFixture(t, { scripts: { check: 'node scripts/offline-check.mjs', build: 'node scripts/offline-compile.mjs' }, files: {
    'scripts/offline-check.mjs': 'import {mkdir,writeFile} from "node:fs/promises";\nawait mkdir(".astro",{recursive:true});\nawait writeFile(".astro/offline-check.marker","OFFLINE STRUCTURAL CHECK");\n',
    'scripts/offline-compile.mjs': compiler
  } });
  const { validateExistingContentArtifacts } = await api();
  await put(join(f.project, 'dist/stale/index.html'), '<html>OFFLINE STALE WORKER DIST</html>');
  const validation = await validateExistingContentArtifacts(f.context, { byKind: f.output.byKind });
  assert.equal(validation.hostBuild.builder, 'host-package-scripts');
  assert.equal(validation.hostBuild.status, 'PASSED');
  assert.deepEqual(validation.hostBuild.commands.map(item => [item.script, item.status]), [['check', 'PASSED'], ['build', 'PASSED']]);
  await assert.rejects(access(join(f.project, 'dist/stale/index.html')), { code: 'ENOENT' });
  assert.equal(validation.native.valid, true);
});

test('host rebuild clears old output and rejects silent or SSR-only build output', async t => {
  const { validateExistingContentArtifacts } = await api();
  for (const [name, build] of [
    ['no output', async context => { await assert.rejects(access(join(context.inputs.projectPath, 'dist')), { code: 'ENOENT' }); }],
    ['SSR output', async context => { await put(join(context.inputs.projectPath, 'dist/server/entry.mjs'), '// OFFLINE SSR fixture'); }]
  ]) await t.test(name, async child => {
    const f = await adoptedFixture(child);
    await assert.rejects(validateExistingContentArtifacts(f.context, { byKind: f.output.byKind, build }), error => error.code === 'CONTRACT_INCOMPATIBLE' && /rendered|static|SSR/i.test(error.message));
  });
});
