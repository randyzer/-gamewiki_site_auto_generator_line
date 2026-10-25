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
import { prepareResearchHandoff, publishResearchArtifacts } from '../src/handoff.mjs';

async function nativeFixture(t, index) {
  const f = await fixture(t), project = f.inputs.paths.siteDirectory;
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
    const interactions = Buffer.from(JSON.stringify({ kind: 'HOST_UI_INTERACTIONS_V1', schemaVersion: 1,
      runId: context.runId, authorizedRoutes: ['/'], routes: [{ route: '/', inventory: {
        interactiveCount: 0, internalLinkCount: 0, authorizedInternalLinkCount: 0, unlistedInternalLinkCount: 0,
        externalLinkCount: 0, formControlCount: 0, unclassifiedControlCount: 0,
        mobileMenuControlCount: 0, searchControlCount: 0, themeToggleControlCount: 0,
        dialogDisclosureControlCount: 0, mobileMenu: 'ABSENT', search: 'ABSENT',
        themeToggle: 'ABSENT', dialogDisclosure: 'ABSENT',
      }, checks: [
        { category: 'route-load', status: 'PASS', detail: 'fixture route loaded' },
        { category: 'internal-navigation', status: 'NOT_APPLICABLE', detail: 'fixture has no links' },
        { category: 'mobile-menu', status: 'NOT_APPLICABLE', detail: 'fixture has no menu' },
        { category: 'keyboard-focus-return', status: 'NOT_APPLICABLE', detail: 'fixture has no menu' },
        { category: 'search-trigger', status: 'NOT_APPLICABLE', detail: 'fixture has no search' },
        { category: 'search-query', status: 'NOT_APPLICABLE', detail: 'fixture has no search' },
        { category: 'search-empty-state', status: 'NOT_APPLICABLE', detail: 'fixture has no search' },
        { category: 'theme-toggle', status: 'NOT_APPLICABLE', detail: 'fixture has no theme toggle' },
        { category: 'dialog-disclosure', status: 'NOT_APPLICABLE', detail: 'fixture has no disclosure' },
        { category: 'unclassified-controls', status: 'NOT_APPLICABLE', detail: 'fixture has no unknown controls' },
      ] }], summary: { PASS: 1, FAIL: 0, NOT_APPLICABLE: 9, NOT_TESTED: 0 }, completion: 'COMPLETE' }));
    const interactionsPath = join(dir, 'HOST_UI_INTERACTIONS.json');
    await writeFile(interactionsPath, interactions);
    context.hostEvidence = { interactionsPath, interactionsSha256: sha256(interactions), routes: ['/'] };
    await add('UI_UX_AUDIT.json', { schema_version: 1, game: context.inputs.gameIdentity, mode: 'audit-only', verdict: 'SHIP',
      execution_acceptance: { kind: 'AUDIT_EXECUTION_ACCEPTANCE_V1', status: 'COMPLETE', host_interactions_sha256: sha256(interactions) },
      routes: [{ route: '/', archetype: 'home', reason: 'fixture' }],
      findings: [], viewports: [360, 390, 768, 1024, 1440, 1920], summary: { blocker: 0, high: 0, medium: 0, low: 0, note: 0 } }, join(dir, 'UI_UX_AUDIT.json'));
    await mkdir(join(dir, 'screenshots')); await writeFile(join(dir, 'screenshots/offline.png'), 'Offline screenshot fixture');
    await writeFile(join(dirname(dir), 'LATEST'), context.runId);
  }
  if (index === 5) {
    context.launchReadiness = { kind: 'STAGE6_PRELAUNCH_CONTEXT_V1', status: 'CLEARED',
      contextDigest: 'a'.repeat(64), unresolvedBlockers: [] };
    await add('PRELAUNCH_ACCEPTANCE.json', { schema_version: '1.0', run_id: context.runId, game: context.inputs.gameIdentity,
      project_path: project, expected_domain: 'https://' + context.inputs.domain, mode: 'audit-only', coverage: { routes_expected: 1, routes_checked: 1, limitations: [] },
      pages: [{ path: '/' }], checks: [], seo_url_audit: { robots: { status: 'PASS' }, sitemap: { status: 'PASS' } }, findings: [], repairs: [], disposition: '可以上线',
      execution_acceptance: { kind: 'PRELAUNCH_EXECUTION_ACCEPTANCE_V1', status: 'COMPLETE',
        context_digest: context.launchReadiness.contextDigest, launch_readiness: 'CLEARED', unresolved_blockers: [] } });
  }
  if (index === 6) await add('DEPLOYMENT_PLAN.json', { schema_version: 1, status: 'AWAITING_CONFIRMATION', confirmation: { status: 'AWAITING_CONFIRMATION' },
    project: { path: project, repository: context.inputs.repo, branch: context.inputs.branch }, domain: { production_origin: 'https://' + context.inputs.domain },
    github_sync: { push_authorized: false }, architecture: {}, hosting: {}, measurement: {}, checks: [], risks: [], rollback: [] });
  return { ...f, context, result, validate: () => validateNativeArtifacts(STAGES[index], context, result) };
}

for (let i = 0; i < 7; i++) test('native stage contract accepts structural fixture: ' + STAGES[i], async t => {
  const f = await nativeFixture(t, i); const result = await f.validate();
  assert.equal(result.status, 'PASSED'); assert.ok(result.artifacts.length >= ARTIFACTS[i].length);
  assert.ok(result.artifacts.every(a => a.sourcePath && (a.sourceSha256 ||
    ['KEYWORD_MATERIALS.md', 'ROUTE_PUBLICATION_MANIFEST.json'].includes(a.kind))));
});
test('keyword validator reads the same run-local copy as the worker', async t => {
  const f = await nativeFixture(t, 1);
  const copy = join(f.context.runDirectory, 'inputs', 'raw-keywords.md');
  await mkdir(dirname(copy), { recursive: true });
  await writeFile(copy, '# copied keyword bytes');
  f.context.inputCopyPaths = { rawKeywordsFile: copy };
  const calls = [];
  await validateNativeArtifacts(STAGES[1], f.context, f.result, { run: async (command, args) => {
    calls.push([command, args]); return { exitCode: 0 };
  } });
  const args = calls.find(([, values]) => values.some(value => value.endsWith('validate_outputs.py')))?.[1];
  assert.equal(args[args.indexOf('--raw-keywords') + 1], copy);
});
test('UI report must include the exact six required viewport widths', async t => {
  const f = await nativeFixture(t, 4), path = f.result.artifacts.find(a => a.kind === 'UI_UX_AUDIT.json').path;
  const audit = JSON.parse(await readFile(path)); audit.viewports = [390, 1440];
  await writeFile(path, JSON.stringify(audit));
  await assert.rejects(f.validate(), /UI audit viewport coverage mismatch/);
});
test('complete UI audit may preserve a BLOCKED site verdict for Stage 6', async t => {
  const f = await nativeFixture(t, 4), path = f.result.artifacts.find(a => a.kind === 'UI_UX_AUDIT.json').path;
  const audit = JSON.parse(await readFile(path));
  audit.verdict = 'BLOCKED';
  audit.findings = [{ id: 'UX-001', severity: 'BLOCKER', route: '/', category: 'trust',
    evidence: 'Missing operator identity', impact: 'Launch trust requirement is absent',
    recommendation: 'Add verified operator details', verification: 'Review the published policy pages', status: 'OPEN' }];
  audit.summary.blocker = 1;
  await writeFile(path, JSON.stringify(audit));
  const validated = await f.validate();
  assert.equal(validated.status, 'PASSED');
  assert.equal(JSON.parse(Buffer.from(validated.artifacts.find(a => a.kind === 'UI_UX_AUDIT.json').content, 'base64')).verdict, 'BLOCKED');
});
test('UI audit cannot omit a failed Host interaction or a captured route', async t => {
  const f = await nativeFixture(t, 4), interactionsPath = f.context.hostEvidence.interactionsPath;
  const interactions = JSON.parse(await readFile(interactionsPath));
  interactions.routes[0].inventory.search = 'PRESENT';
  interactions.routes[0].inventory.searchControlCount = 1;
  const query = interactions.routes[0].checks.find(item => item.category === 'search-query');
  query.status = 'PASS'; query.detail = 'Query was exercised';
  const emptyState = interactions.routes[0].checks.find(item => item.category === 'search-empty-state');
  emptyState.status = 'FAIL'; emptyState.detail = 'No empty state';
  interactions.summary = { PASS: 2, FAIL: 1, NOT_APPLICABLE: 7, NOT_TESTED: 0 };
  const bytes = Buffer.from(JSON.stringify(interactions)); await writeFile(interactionsPath, bytes);
  f.context.hostEvidence.interactionsSha256 = sha256(bytes);
  const auditPath = f.result.artifacts.find(a => a.kind === 'UI_UX_AUDIT.json').path;
  const audit = JSON.parse(await readFile(auditPath));
  audit.execution_acceptance.host_interactions_sha256 = sha256(bytes);
  await writeFile(auditPath, JSON.stringify(audit));
  await assert.rejects(f.validate(), /omitted failed host interaction/);
  f.context.hostEvidence.routes = ['/', '/missing'];
  await assert.rejects(f.validate(), /route authorization boundary mismatch/);
});
test('prelaunch report must cover exactly the routes captured by the host', async t => {
  const f = await nativeFixture(t, 5);
  f.context.hostEvidence = { routes: ['/', '/missing-from-report'], routePublicationViolations: [] };
  await assert.rejects(f.validate(), /Prelaunch host route coverage mismatch/);
});
test('complete prelaunch audit preserves Host launch blockers without claiming deployment clearance', async t => {
  const f = await nativeFixture(t, 5);
  const blockers = [{ source: 'STAGE5_UI_AUDIT', code: 'UX-001', severity: 'BLOCKER',
    route: '/', status: 'OPEN' }];
  f.context.launchReadiness = { ...f.context.launchReadiness, status: 'NOT_CLEARED',
    contextDigest: 'b'.repeat(64), unresolvedBlockers: blockers };
  const reportPath = f.result.artifacts.find(a => a.kind === 'PRELAUNCH_ACCEPTANCE.json').path;
  const report = JSON.parse(await readFile(reportPath));
  report.disposition = '暂不建议上线';
  report.execution_acceptance = { kind: 'PRELAUNCH_EXECUTION_ACCEPTANCE_V1', status: 'COMPLETE',
    context_digest: f.context.launchReadiness.contextDigest, launch_readiness: 'NOT_CLEARED',
    unresolved_blockers: blockers };
  await writeFile(reportPath, JSON.stringify(report));
  const validated = await f.validate();
  assert.equal(validated.status, 'PASSED');
});
test('complete prelaunch audit accepts exact Host route violations while remaining not cleared', async t => {
  const f = await nativeFixture(t, 5);
  const violations = [{ code: 'PUBLISHED_ROUTE_NOINDEX', route: '/' }];
  const blockers = violations.map(violation => ({ source: 'STAGE6_ROUTE_PUBLICATION',
    code: violation.code, severity: 'BLOCKER', violation }));
  f.context.launchReadiness = { ...f.context.launchReadiness, status: 'NOT_CLEARED',
    contextDigest: 'b'.repeat(64), unresolvedBlockers: blockers };
  const evidencePath = join(f.context.inputs.projectPath, 'HOST_EVIDENCE.json');
  await writeFile(evidencePath, JSON.stringify({ routePublication: {
    manifestKind: 'ROUTE_PUBLICATION_MANIFEST_V1', violations } }));
  f.context.hostEvidence = { routes: ['/'], routePublicationViolations: violations, evidencePath };
  const reportPath = f.result.artifacts.find(a => a.kind === 'PRELAUNCH_ACCEPTANCE.json').path;
  const report = JSON.parse(await readFile(reportPath));
  report.disposition = '暂不建议上线';
  report.route_publication = { manifestKind: 'ROUTE_PUBLICATION_MANIFEST_V1', violations };
  report.execution_acceptance = { kind: 'PRELAUNCH_EXECUTION_ACCEPTANCE_V1', status: 'COMPLETE',
    context_digest: f.context.launchReadiness.contextDigest, launch_readiness: 'NOT_CLEARED',
    unresolved_blockers: blockers };
  await writeFile(reportPath, JSON.stringify(report));
  assert.equal((await f.validate()).status, 'PASSED');

  report.route_publication.violations = [];
  await writeFile(reportPath, JSON.stringify(report));
  await assert.rejects(f.validate(), /route publication.*mismatch/i);
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

test('keyword PARTIAL accepts only canonical top-level roles and registers no official artifacts', async t => {
  const f = await nativeFixture(t, 1);
  f.result.status = 'PARTIAL';
  const result = await f.validate();
  assert.equal(result.status, 'PARTIAL');
  assert.deepEqual(result.artifacts, []);
});

test('keyword material roles remain host-owned and malformed PARTIAL descriptors are rejected', async t => {
  const f = await nativeFixture(t, 1);
  f.result.status = 'PARTIAL';
  const material = join(f.context.nativeDirectory, 'Offline Fixture guide素材.md');
  f.result.artifacts.push({ kind: 'keyword-material:Offline Fixture guide', path: material });
  await assert.rejects(f.validate(), /host-derived|Unexpected keyword artifact role/);

  f.result.artifacts.at(-1).kind = 'KEYWORD_MATERIALS.md';
  f.result.artifacts.push({ kind: 'KEYWORD_MATERIALS.md', path: material });
  await assert.rejects(f.validate(), /Duplicate artifact role/);
});
test('approved partial handoff derives a draft-only route manifest without a formal keyword artifact', async t => {
  const f = await nativeFixture(t, 3);
  const contentItem = f.result.artifacts.find(item => item.kind === 'CONTENT_PAGE_MANIFEST.json');
  const content = JSON.parse(await readFile(contentItem.path));
  Object.assign(content.pages[0], { outcome: 'DRAFT', route: '/draft-guide',
    material_status: 'PARTIAL' });
  content.counts = { keywords: 1, published: 0, draft: 1, blocked: 0 };
  await writeFile(contentItem.path, JSON.stringify(content));
  f.context.upstream.find(stage => stage.skill === STAGES[1]).artifacts = [];
  f.context.researchHandoff = {
    reference: { sha256: 'a'.repeat(64), approved: true },
    manifest: { kind: 'RESEARCH_HANDOFF_MANIFEST_V1', materials: [{
      keyword: 'Offline Fixture guide', status: 'PARTIAL', publicationDisposition: 'DRAFT_ONLY',
    }] },
  };
  const validated = await f.validate();
  const routeArtifact = validated.artifacts.find(item => item.kind === 'ROUTE_PUBLICATION_MANIFEST.json');
  const publication = JSON.parse(Buffer.from(routeArtifact.content, 'base64'));
  assert.equal(publication.pages.find(page => page.keyword === 'Offline Fixture guide').disposition,
    'DRAFT_ONLY');
  assert.equal(publication.pages.find(page => page.keyword === 'Offline Fixture guide').noindexRequired,
    true);
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

test('non-executing deployment plan preserves unresolved blockers and cannot await deployment approval', async t => {
  const f = await nativeFixture(t, 6);
  const blockers = [{ source: 'STAGE5_UI_AUDIT', code: 'UX-001', severity: 'BLOCKER',
    route: '/', status: 'OPEN' }];
  f.context.launchReadiness = { deploymentAuthorized: false, unresolvedBlockers: blockers };
  const item = f.result.artifacts.find(a => a.kind === 'DEPLOYMENT_PLAN.json');
  const data = JSON.parse(await readFile(item.path));
  data.status = 'BLOCKED'; data.confirmation.status = 'NOT_AUTHORIZED_FOR_DEPLOYMENT';
  data.unresolved_blockers = blockers;
  await writeFile(item.path, JSON.stringify(data));
  assert.equal((await f.validate()).status, 'PASSED');
  data.unresolved_blockers = [];
  await writeFile(item.path, JSON.stringify(data));
  await assert.rejects(f.validate(), /preserve every Host launch blocker/);
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
  for (const stage of stages) await publishResearchArtifacts(context, stage.skill, stage.artifacts);
  await prepareResearchHandoff(context); await prepareResearchHandoff(context);
  const project = context.inputs.projectPath;
  await mkdir(join(project, 'app')); await mkdir(join(project, 'docs'));
  await writeFile(join(project, 'package.json'), '{}');
  await writeFile(join(project, 'docs/TEMPLATE_SELECTION_REPORT.md'), 'Offline fixture');
  await writeFile(join(project, 'docs/template-copy-manifest.json'), JSON.stringify({ destination: project }));
  const output = join(context.runDirectory, 'preflight.json');
  const script = fileURLToPath(new URL('../../codex-skills/game-site-content-integrator/scripts/preflight.py', import.meta.url));
  await runProcess('python3', [script, '--game', context.inputs.gameIdentity, '--workspace', project,
    '--template-root', context.templateRoots[0], '--output', output]);
  const data = JSON.parse(await readFile(output));
  assert.equal(data.ready, true);
  assert.equal(data.resolved_inputs.keywords, join(project, 'backgroundinformation/keyword-materials/keywords.json'));
});

async function deploymentReport(t, report) {
  const f = await nativeFixture(t, 6);
  const json = f.result.artifacts.find(a => a.kind === 'DEPLOYMENT_PLAN.json');
  const dir = dirname(json.path);
  const md = join(dir, 'DEPLOYMENT_REPORT.md'), data = join(dir, 'DEPLOYMENT_REPORT.json');
  await writeFile(md, '# Offline deployment report');
  await writeFile(data, JSON.stringify(report));
  f.context.mode = 'execute';
  f.context.requiredArtifacts = ['DEPLOYMENT_REPORT.md', 'DEPLOYMENT_REPORT.json'];
  f.result.artifacts = [{ kind: 'DEPLOYMENT_REPORT.md', path: md }, { kind: 'DEPLOYMENT_REPORT.json', path: data }];
  return f;
}

test('an execution pass is validated against the deployment report, not the plan', async t => {
  const f = await deploymentReport(t, { deployment: 'PRODUCTION LIVE', production_url: 'https://example.test' });
  f.context.inputs.domain = 'example.test';
  const result = await f.validate();
  assert.equal(result.status, 'PASSED');
  assert.deepEqual(result.artifacts.map(a => a.kind), ['DEPLOYMENT_REPORT.md', 'DEPLOYMENT_REPORT.json']);
});

test('a PASSED execution must report a live deployment on the task domain', async t => {
  const notLive = await deploymentReport(t, { deployment: 'PREVIEW VERIFIED', production_url: 'https://example.test' });
  notLive.context.inputs.domain = 'example.test';
  await assert.rejects(notLive.validate(), /DEPLOYMENT_REPORT_INVALID: deployment is "PREVIEW VERIFIED"/);
  const otherDomain = await deploymentReport(t, { deployment: 'PRODUCTION LIVE', production_url: 'https://elsewhere.test' });
  otherDomain.context.inputs.domain = 'example.test';
  await assert.rejects(otherDomain.validate(), /DEPLOYMENT_REPORT_INVALID: production_url "https:\/\/elsewhere\.test"/);
});
