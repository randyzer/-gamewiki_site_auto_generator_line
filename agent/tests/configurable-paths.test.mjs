import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, realpath, mkdir, writeFile, readFile, rm, symlink, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { createPipeline, OFFLINE_STAGE4_READINESS_CAPABILITY } from '../src/pipeline.mjs';
import { createOrchestrator } from '../src/orchestrator.mjs';
import { stageWorkerPermissions, permissionProfileConfig } from '../src/worker-permissions.mjs';
import { describeRun } from '../src/terminal-run.mjs';
import { STAGE, STAGES } from '../src/stages.mjs';
import { AGENT_ROOT } from '../src/skill-lock.mjs';
import { sha256 } from '../src/files.mjs';
import { goodResult, withSyntheticStage4 } from './helpers.mjs';
import { createSkillExecutor } from '../src/skill-executor.mjs';
import { snapshotSiteEvidence } from '../src/site-evidence.mjs';

async function templateSnapshotContext(root) {
  const commit = 'd'.repeat(40), checkout = join(root, 'template-cache', commit);
  const templateRoot = join(checkout, 'template');
  await Promise.all([join(checkout, '.git'), templateRoot].map(path => mkdir(path, { recursive: true })));
  return { templateRoots: [templateRoot], templateSnapshot: {
    repository: 'https://example.invalid/templates.git', ref: 'main', subtree: 'template',
    commit, checkout, templateRoot,
  } };
}

async function fixture(t) {
  const root = await mkdtemp(join(await realpath(tmpdir()), 'config-paths-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const workspace = join(root, 'agent'), skills = join(root, 'codex-skills');
  await mkdir(workspace); await mkdir(skills);
  const inventory = [];
  for (const name of STAGES) {
    const source = join(skills, name + '.md'); await writeFile(source, name);
    inventory.push({ name, source, available: true, sha256: sha256(name) });
  }
  const inventoryPath = join(root, 'inventory.json');
  await writeFile(inventoryPath, JSON.stringify({ skillRoot: skills, skills: inventory }));
  const projectRoot = join(root, 'game dir');
  const researchDirectory = join(projectRoot, 'backgroundinformation');
  const rawKeywordsFile = join(researchDirectory, 'keyword-materials', '关键词.md');
  await mkdir(dirname(rawKeywordsFile), { recursive: true }); await writeFile(rawKeywordsFile, '# User keywords');
  const paths = { siteDirectory: join(projectRoot, 'site'), researchDirectory, rawKeywordsFile };
  const inputs = { gameIdentity: 'Path fixture', objective: 'offline', canonicalRequired: false, paths };
  const configuration = { workspace, inventoryPath, templateRoots: [],
    stage4ReadinessCapability: OFFLINE_STAGE4_READINESS_CAPABILITY };
  const contexts = [];
  const executor = withSyntheticStage4(async (skill, context) => {
    contexts.push(context); return goodResult(skill, context);
  });
  return { root, projectRoot, researchDirectory, rawKeywordsFile, paths, inputs, configuration, contexts, executor,
    create: extra => createPipeline({ ...configuration, inputs, executor, runId: 'paths', ...extra }) };
}

test('external user paths resolve and publish research before stage 4 handoff', async t => {
  const f = await fixture(t);
  // A configured template root is required by stage 3, even for this offline executor.
  f.configuration.templateRoots = [join(f.root, 'templates')]; await mkdir(f.configuration.templateRoots[0]);
  const execute = createOrchestrator({ configuration: f.configuration, approvalConsumer: async () => true,
    executor: withSyntheticStage4(async (skill, context) => {
      if (skill === STAGE.CONTENT_INTEGRATION) {
        const candidatePath = context.stage4Transaction.candidatePath;
        assert.equal(context.stage4Transaction.targetPath, join(f.projectRoot, 'site'));
        assert.equal(dirname(candidatePath), dirname(context.stage4Transaction.journalPath));
      }
      return f.executor(skill, context);
    }) });
  await execute({ id: 'paths', inputs: JSON.stringify(f.inputs) },
    { shouldPause: state => state.stages[3].status === 'PASSED' });
  const state = JSON.parse(await readFile(join(f.configuration.workspace, 'runs/paths/manifest.json')));
  assert.equal(state.stages[3].status, 'PASSED', state.stages[3].evidence.join(' '));
  assert.equal(state.inputs.projectPath, join(f.projectRoot, 'site'));
  assert.equal(state.paths.rawKeywordsFile, f.rawKeywordsFile);
  for (const name of ['HOMEPAGE_RESEARCH.md', 'ICON.zip', 'keyword-materials/keywords.json']) {
    const source = join(f.researchDirectory, name);
    assert.deepEqual(await readFile(join(f.projectRoot, 'site/backgroundinformation', name)), await readFile(source));
  }
  assert.equal(await readFile(f.rawKeywordsFile, 'utf8'), '# User keywords');
});

const invalid = [
  ['removed projectRoot', p => { p.projectRoot = '/legacy/root'; }, '/legacy/root'],
  ['relative path', p => { p.siteDirectory = 'relative/site'; }, 'relative/site'],
  ['unknown placeholder', p => { p.siteDirectory = '/game/{unknown}/site'; }, '/game/{unknown}/site'],
  ['research basename', p => { p.researchDirectory = '/game/research'; }, '/game/research'],
  ['site inside research', (p, f) => { p.siteDirectory = join(f.researchDirectory, 'site'); }, null],
  ['site equals research', (p, f) => { p.siteDirectory = f.researchDirectory; }, null],
  ['agent overlap', (p, f) => { p.siteDirectory = join(f.configuration.workspace, 'site'); }, null],
  ['skill overlap', (p, f) => { p.siteDirectory = join(f.root, 'codex-skills/site'); }, null],
  ['ancestor overlap', (p, f) => { p.siteDirectory = f.root; }, null],
  ['real agent overlap', p => { p.siteDirectory = join(AGENT_ROOT, 'workspaces/unsafe/site'); }, null],
  ['cache overlap', (p, f) => { p.siteDirectory = join(f.root, '.template-cache/site'); }, null],
  ['runs overlap', (p, f) => { p.siteDirectory = join(f.root, 'runs/site'); }, null],
];
for (const [name, change, value] of invalid) test(`reject ${name} and name the offending value`, async t => {
  const f = await fixture(t), paths = { ...f.paths }; change(paths, f);
  await assert.rejects(f.create({ inputs: { ...f.inputs, paths } }), error => {
    assert.ok(error.message.includes(value ?? paths.siteDirectory), error.message);
    if (name === 'research basename') assert.match(error.message, /homepage.*validate_outputs\.py:49/i);
    return true;
  });
});

test('new orchestrator run requires explicit siteDirectory', async t => {
  const f = await fixture(t); delete f.inputs.paths.siteDirectory;
  const execute = createOrchestrator({ configuration: f.configuration, executor: f.executor, approvalConsumer: async () => true });
  await assert.rejects(execute({ id: 'paths', inputs: JSON.stringify(f.inputs) }), /paths.siteDirectory/);
});

test('new run rejects occupied site without touching its files', async t => {
  const f = await fixture(t), site = join(f.projectRoot, 'site');
  await mkdir(site); await writeFile(join(site, 'keep'), 'user');
  await assert.rejects(f.create(), error => error.message.includes(site) && /empty/i.test(error.message));
  assert.equal(await readFile(join(site, 'keep'), 'utf8'), 'user');
});

test('paths reject symlink ancestors', async t => {
  const f = await fixture(t), alias = join(f.root, 'alias'); await symlink(f.projectRoot, alias);
  await assert.rejects(f.create({ inputs: { ...f.inputs, paths: { ...f.paths, siteDirectory: join(alias, 'site') } } }), /symlink|linked/i);
});

for (const identical of [true, false]) test(`stage 1 ${identical ? 'reuses identical' : 'rejects different'} existing research file`, async t => {
  const f = await fixture(t), target = join(f.researchDirectory, 'HOMEPAGE_RESEARCH.md');
  const bytes = identical ? 'OFFLINE TEST FIXTURE: ' + STAGE.HOMEPAGE_RESEARCH : 'user original';
  await writeFile(target, bytes); const before = await stat(target);
  const p = await f.create(); await p.advance();
  assert.equal(p.snapshot().stages[0].status, identical ? 'PASSED' : 'FAILED');
  assert.equal(await readFile(target, 'utf8'), bytes);
  assert.equal((await stat(target)).ino, before.ino);
  if (!identical) assert.ok(p.snapshot().stages[0].evidence.join(' ').includes(target));
});

test('path changes on retry invalidate research and downstream stages', async t => {
  const f = await fixture(t), p = await f.create(); await p.advance();
  const next = { ...f.paths, researchDirectory: join(f.root, 'other/backgroundinformation') };
  await p.updateUserInputs({ paths: next }, { retry: true });
  assert.equal(p.snapshot().stages[0].status, 'NOT_STARTED');
  assert.equal(p.snapshot().paths.researchDirectory, next.researchDirectory);
  await p.advance(); assert.equal(p.snapshot().stages[0].status, 'PASSED');
  await readFile(join(next.researchDirectory, 'HOMEPAGE_RESEARCH.md'));
});

test('old manifest without paths resumes with the legacy project path', async t => {
  const f = await fixture(t), p = await f.create();
  const manifest = p.manifestPath, state = JSON.parse(await readFile(manifest));
  delete state.paths; delete state.inputs.paths;
  state.inputs.projectPath = join(f.configuration.workspace, 'workspaces/paths/site');
  await writeFile(manifest, JSON.stringify(state));
  const resumed = await f.create({ resume: true, inputs: {} }); await resumed.advance();
  assert.equal(resumed.snapshot().stages[0].status, 'PASSED');
  assert.equal(resumed.snapshot().inputs.projectPath, state.inputs.projectPath);
});

test('terminal summary displays all resolved paths', async t => {
  const f = await fixture(t);
  const text = await describeRun({ command: 'run', runId: 'paths', inputs: f.inputs, configuration: f.configuration });
  for (const value of [join(f.projectRoot, 'site'), f.researchDirectory, f.rawKeywordsFile]) assert.ok(text.includes(value), text);
  assert.ok(text.includes(sha256(await readFile(f.rawKeywordsFile))));
});

test('permission matrix restricts research and site writes to their stages', async t => {
  const f = await fixture(t), site = join(f.projectRoot, 'site');
  const runDirectory = join(f.configuration.workspace, 'runs/permissions');
  const nativeDirectory = join(runDirectory, 'artifacts/0/1/native'); await mkdir(nativeDirectory, { recursive: true });
  const snapshotContext = await templateSnapshotContext(runDirectory);
  for (const [skill, mode] of [...STAGES.map(s => [s, 'plan']), [STAGE.DEPLOYMENT_PLAN, 'execute']]) {
    const context = { runDirectory, nativeDirectory,
      inputs: { projectPath: site, paths: { siteDirectory: site, researchDirectory: f.researchDirectory, rawKeywordsFile: f.rawKeywordsFile } },
      skillLock: { source: join(f.root, 'codex-skills', STAGES[0] + '.md') }, mode,
      permissions: { siteWrites: true, productionDeployment: mode === 'execute' },
      approvedPlan: { digest: 'a'.repeat(64), artifacts: [] },
      ...(skill === STAGE.TEMPLATE_SELECTION ? snapshotContext : {}) };
    const profile = await stageWorkerPermissions(skill, context, { writePaths: [f.projectRoot, site, f.researchDirectory, f.rawKeywordsFile] });
    const rules = JSON.parse(profile.config.match(/filesystem=\{(.*?)\},network/)[1].replaceAll('=', ':').replace(/^/, '{') + '}');
    assert.equal(rules[f.researchDirectory], [STAGE.HOMEPAGE_RESEARCH, STAGE.KEYWORD_RESEARCH].includes(skill) ? 'write' : 'read', skill);
    assert.equal(rules[site], skill === STAGE.CONTENT_INTEGRATION || mode === 'execute' ? 'write' : 'read', skill);
    assert.notEqual(rules[f.projectRoot], 'write', skill);
    assert.equal(rules[f.rawKeywordsFile], 'read', skill);
  }
});

test('keyword artifacts cannot replace the user original even on filename collision', async t => {
  const f = await fixture(t);
  const p = await f.create({ executor: async (skill, context) => {
    const result = await goodResult(skill, context);
    if (skill === STAGE.KEYWORD_RESEARCH) result.artifacts[0].sourcePath = f.rawKeywordsFile;
    return result;
  } });
  await p.advance(); await p.advance();
  assert.equal(p.snapshot().stages[1].status, 'FAILED');
  assert.equal(await readFile(f.rawKeywordsFile, 'utf8'), '# User keywords');
});

test('top-level rawKeywordsFile remains accepted with configured directories', async t => {
  const f = await fixture(t), paths = { ...f.paths }; delete paths.rawKeywordsFile;
  const p = await f.create({ inputs: { ...f.inputs, paths, rawKeywordsFile: f.rawKeywordsFile } });
  assert.equal(p.snapshot().paths.rawKeywordsFile, f.rawKeywordsFile);
});

test('audit worker writes native reports while the host publishes them for the unchanged Skill validator', async t => {
  const f = await fixture(t), site = join(f.projectRoot, 'site'); await mkdir(site);
  const runDirectory = join(f.configuration.workspace, 'runs/audit');
  const evidenceDirectory = join(site, 'docs/ui-ux-audit/audit');
  const names = ['UI_UX_AUDIT_REPORT.md', 'UI_UX_AUDIT.json', 'UI_UX_OPTIMIZATION_PLAN.md'];
  const execute = createSkillExecutor({ previewSite: async () => ({ url: 'http://localhost', stop: async () => {} }),
    auditSite: async () => {
      await mkdir(join(evidenceDirectory, 'screenshots'), { recursive: true });
      await writeFile(join(evidenceDirectory, 'screenshots/home.png'), 'synthetic');
      const interactionsPath = join(evidenceDirectory, 'HOST_UI_INTERACTIONS.json');
      const interactions = Buffer.from(JSON.stringify({ kind: 'HOST_UI_INTERACTIONS_V1', schemaVersion: 1,
        runId: 'audit', authorizedRoutes: ['/'], routes: [{ route: '/', inventory: {
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
      await writeFile(interactionsPath, interactions);
      return { ...(await snapshotSiteEvidence(evidenceDirectory)), routes: ['/'], interactionsPath,
        interactionsSha256: sha256(interactions) };
    }, run: async (_command, args, options) => {
      const context = JSON.parse(options.input.split('Task context: ')[1].split('\n')[0]);
      assert.ok(context.reportDirectory.startsWith(context.nativeDirectory));
      const config = args.find(value => value.startsWith('permissions.agent-worker='));
      assert.ok(config.includes(JSON.stringify(site) + '="read"'));
      assert.ok(!config.includes(JSON.stringify(evidenceDirectory) + '="write"'));
      await mkdir(context.reportDirectory, { recursive: true });
      for (const name of names) await writeFile(join(context.reportDirectory, name), name.endsWith('.json')
        ? JSON.stringify({ viewports: [360,390,768,1024,1440,1920], verdict: 'SHIP',
          routes: [{ route: '/', archetype: 'home', reason: 'fixture' }], findings: [],
          execution_acceptance: { kind: 'AUDIT_EXECUTION_ACCEPTANCE_V1', status: 'COMPLETE',
            host_interactions_sha256: context.hostEvidence.interactionsSha256 } }) : 'synthetic');
      await writeFile(args[args.indexOf('--output-last-message') + 1], JSON.stringify({ status: 'PARTIAL',
        stage4_completion: null, stage5_completion: { kind: 'STAGE5_AUDIT_HANDOFF_V1',
          audit_execution: 'COMPLETE', host_validation: 'REQUIRED', site_verdict: 'SHIP' },
        artifacts: names.map(kind => ({ kind, path: join(context.reportDirectory, kind) })), missing_inputs: [], evidence: ['synthetic'] }));
    }, validationOptions: { run: async (_command, args) => {
      assert.equal(args[args.indexOf('--run-dir') + 1], evidenceDirectory);
      for (const name of names) await readFile(join(evidenceDirectory, name));
      assert.equal(await readFile(join(site, 'docs/ui-ux-audit/LATEST'), 'utf8'), 'audit');
    } } });
  const result = await execute(STAGE.UI_UX_AUDIT, { runId: 'audit', outputDirectory: join(runDirectory, 'artifacts/4/1'),
    inputs: { gameIdentity: 'Path fixture', projectPath: site, paths: { siteDirectory: site, researchDirectory: f.researchDirectory, rawKeywordsFile: f.rawKeywordsFile } },
    permissions: { siteWrites: false }, mode: 'audit-only', requiredArtifacts: names,
    skillLock: { source: join(f.root, 'codex-skills', STAGE.UI_UX_AUDIT + '.md') } });
  assert.equal(result.status, 'PASSED');
});

test('external site native artifacts are reverified before stage 4', async t => {
  const f = await fixture(t); const template = join(f.root, 'templates'); await mkdir(template);
  const p = await f.create({ siteWrites: true, templateRoots: [template], executor: withSyntheticStage4(async (skill, context) => {
    const result = await goodResult(skill, context);
    if (skill === STAGE.TEMPLATE_SELECTION) {
      const item = result.artifacts[0];
      await mkdir(context.inputs.projectPath, { recursive: true });
      item.sourcePath = join(context.inputs.projectPath, 'template-report.md');
      item.sourceSha256 = sha256(item.content); await writeFile(item.sourcePath, item.content);
    }
    return result;
  }) });
  for (let i = 0; i < 4; i++) await p.advance();
  assert.equal(p.snapshot().stages[3].status, 'PASSED', p.snapshot().stages[3].evidence.join(' '));
});

test('template executor stages atomic copy inside run without a site write grant', async t => {
  const f = await fixture(t), site = join(f.projectRoot, 'site');
  let seen = false;
  const execute = createSkillExecutor({ run: async (_command, args, options) => {
    const context = JSON.parse(options.input.split('Task context: ')[1].split('\n')[0]);
    assert.equal(dirname(dirname(context.templateCopyDestination)), context.runDirectory);
    assert.match(options.input, /templateCopyDestination/);
    const config = args.find(value => value.startsWith('permissions.agent-worker='));
    assert.ok(config.includes(JSON.stringify(site) + '="read"'));
    assert.ok(config.includes(JSON.stringify(join(context.runDirectory, 'template-copy')) + '="write"'));
    assert.ok(!config.includes(JSON.stringify(dirname(site)) + '="write"'));
    seen = true;
    await writeFile(args[args.indexOf('--output-last-message') + 1], JSON.stringify({ status: 'BLOCKED', artifacts: [],
      missing_inputs: [], evidence: ['synthetic capture only'] }));
  } });
  const snapshotContext = await templateSnapshotContext(join(f.configuration.workspace, 'runs/template'));
  await execute(STAGE.TEMPLATE_SELECTION, { runId: 'template',
    outputDirectory: join(f.configuration.workspace, 'runs/template/artifacts/2/1'),
    inputs: { gameIdentity: 'Path fixture', projectPath: site, paths: {
      siteDirectory: site, researchDirectory: f.researchDirectory, rawKeywordsFile: f.rawKeywordsFile } },
    permissions: { siteWrites: true }, requiredArtifacts: [],
    skillLock: { source: join(f.root, 'codex-skills', STAGE.TEMPLATE_SELECTION + '.md') }, ...snapshotContext });
  assert.equal(seen, true);
});

test('stage 2 keeps original lineage readonly after substituting its run copy', async t => {
  const f = await fixture(t), lineage = join(f.researchDirectory, 'lineage.md');
  await writeFile(lineage, '# user lineage');
  const p = await f.create({ inputs: { ...f.inputs, keywordSourceLineageFile: lineage } });
  await p.advance(); await p.advance();
  const context = f.contexts[1], runDirectory = join(f.configuration.workspace, 'runs/paths');
  const nativeDirectory = join(context.outputDirectory, 'native'); await mkdir(nativeDirectory);
  const { config } = await stageWorkerPermissions(STAGE.KEYWORD_RESEARCH, { ...context, runDirectory, nativeDirectory });
  assert.ok(config.includes(JSON.stringify(lineage) + '="read"'), config);
});

test('raw keyword directory is rejected before homepage worker launch', async t => {
  const f = await fixture(t);
  await assert.rejects(f.create({ inputs: { ...f.inputs, paths: { ...f.paths, rawKeywordsFile: f.researchDirectory } } }),
    error => error.message.includes(f.researchDirectory) && /regular file/i.test(error.message));
  assert.equal(f.contexts.length, 0);
});

test('readonly input exceptions cannot override a credential deny or its descendants', () => {
  const config = permissionProfileConfig('agent-worker', { denyPaths: ['/synthetic/.codex'],
    readOnlyPaths: ['/synthetic/.codex', '/synthetic/.codex/auth.json'] });
  assert.ok(config.includes('"/synthetic/.codex"="deny"'), config);
  assert.ok(!config.includes('"/synthetic/.codex/auth.json"="read"'), config);
});

test('configured directories cannot add grants under the existing credential deny roots', async t => {
  const f = await fixture(t), runDirectory = join(f.configuration.workspace, 'runs/denied');
  const nativeDirectory = join(runDirectory, 'native'); await mkdir(nativeDirectory, { recursive: true });
  const protectedResearch = join(process.env.HOME, '.codex', 'backgroundinformation');
  await assert.rejects(stageWorkerPermissions(STAGE.HOMEPAGE_RESEARCH, { runDirectory, nativeDirectory,
    inputs: { projectPath: join(f.projectRoot, 'site'), paths: { researchDirectory: protectedResearch, rawKeywordsFile: f.rawKeywordsFile } },
    skillLock: { source: join(f.root, 'codex-skills', STAGES[0] + '.md') } }), /WORKER_PERMISSION.*DENIED/);
});
