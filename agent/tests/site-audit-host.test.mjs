import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fixture } from './helpers.mjs';
import { STAGE } from '../src/stages.mjs';
import { createSkillExecutor } from '../src/skill-executor.mjs';
import { runProcess } from '../src/process.mjs';
import { sha256 } from '../src/files.mjs';
import { validateHostInteractions } from '../src/stage5-audit-policy.mjs';

const host = await import('../src/site-audit-host.mjs').catch(() => ({}));
const evidence = await import('../src/site-evidence.mjs').catch(() => ({}));
export async function auditFixture(t) {
  const f = await fixture(t), runId = 'audit-host', runDirectory = join(f.configuration.workspace, 'runs', runId);
  const projectPath = join(f.root, 'site'), manifestPath = join(runDirectory, 'ROUTE_PUBLICATION_MANIFEST.json');
  await mkdir(runDirectory, { recursive: true }); await mkdir(projectPath);
  await writeFile(manifestPath, JSON.stringify({ kind: 'ROUTE_PUBLICATION_MANIFEST_V1', schemaVersion: 1,
    runId, gameIdentity: f.inputs.gameIdentity, siteRevision: f.inputs.siteRevision,
    domain: f.inputs.domain, researchHandoffSha256: null,
    pages: [{ route: '/', disposition: 'PUBLISH' }, { route: '/guide', disposition: 'PUBLISH' },
      { route: '/draft', disposition: 'DRAFT_ONLY', noindexRequired: true }],
    counts: { publish: 2, draftOnly: 1, omit: 0 } }));
  return { ...f, context: { runId, runDirectory, inputs: { ...f.inputs, projectPath },
    outputDirectory: join(runDirectory, 'artifacts/4/1'), requiredArtifacts: [], mode: 'audit-only',
    skillLock: { source: join(f.root, 'skills', STAGE.UI_UX_AUDIT + '.md') },
    permissions: { siteWrites: false, uiChanges: false },
    upstream: [{ skill: STAGE.CONTENT_INTEGRATION, artifacts: [{ kind: 'ROUTE_PUBLICATION_MANIFEST.json', path: manifestPath }] }] } };
}
async function writeAudit(directory) {
  await mkdir(join(directory, 'screenshots/home'), { recursive: true });
  await writeFile(join(directory, 'screenshots/home/desktop-1440.png'), 'synthetic screenshot');
  await writeFile(join(directory, 'AUTOMATED_AUDIT.json'), JSON.stringify({ viewports: [360,390,768,1024,1440,1920].map(width => ({ width })) }));
}
async function writeInteractions(path, { notTested = false, routes = ['/', '/guide'] } = {}) {
  const routeItems = routes.map(route => ({ route, inventory: {
    interactiveCount: notTested ? 1 : 0, internalLinkCount: 0, authorizedInternalLinkCount: 0,
    unlistedInternalLinkCount: 0, externalLinkCount: 0, formControlCount: 0,
    unclassifiedControlCount: notTested ? 1 : 0, mobileMenuControlCount: 0, searchControlCount: 0,
    themeToggleControlCount: 0, dialogDisclosureControlCount: 0,
    mobileMenu: 'ABSENT', search: 'ABSENT', themeToggle: 'ABSENT',
    dialogDisclosure: 'ABSENT',
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
    { category: 'unclassified-controls', status: notTested ? 'NOT_TESTED' : 'NOT_APPLICABLE',
      detail: notTested ? 'fixture unknown control' : 'fixture has no unknown controls' },
  ] }));
  await writeFile(path, JSON.stringify({ kind: 'HOST_UI_INTERACTIONS_V1', schemaVersion: 1,
    runId: 'audit-host', authorizedRoutes: routes, routes: routeItems,
    summary: { PASS: routes.length, FAIL: 0, NOT_APPLICABLE: routes.length * (notTested ? 8 : 9),
      NOT_TESTED: notTested ? routes.length : 0 },
    completion: notTested ? 'INCOMPLETE' : 'COMPLETE' }));
}
test('audit adapter uses locked script through module hook and published routes plus homepage', async t => {
  const f = await auditFixture(t); let calls = 0;
  const result = await host.collectSiteAudit(f.context, { run: async (command, args) => {
    calls++; assert.equal(command, process.execPath); assert.equal(args[0], '--import');
    assert.ok(args[1].endsWith('playwright-register.mjs'));
    if (args[2].endsWith('game_site_audit.mjs')) {
      assert.equal(args[2], join(f.root, 'skills/scripts/game_site_audit.mjs'));
      assert.equal(args[args.indexOf('--url') + 1], 'http://127.0.0.1:3001');
      assert.deepEqual(args.flatMap((v,i) => v === '--route' ? [args[i+1]] : []), ['/', '/guide']);
      await writeAudit(args[args.indexOf('--out') + 1]);
    } else {
      assert.ok(args[2].endsWith('site-audit-interactions.mjs'));
      await writeInteractions(args[args.indexOf('--output') + 1]);
    }
  }, url: 'http://127.0.0.1:3001' });
  assert.equal(calls, 2); assert.ok(result.files.every(file => /^[a-f0-9]{64}$/.test(file.sha256)));
  assert.ok(result.screenshotsDirectory.endsWith('/screenshots'));
  assert.ok(result.interactionsPath.endsWith('/HOST_UI_INTERACTIONS.json'));
  assert.match(result.interactionsSha256, /^[a-f0-9]{64}$/);
  await evidence.verifySiteEvidence(result);
  await writeFile(result.automatedAuditPath, '{}');
  await assert.rejects(evidence.verifySiteEvidence(result), /HOST_EVIDENCE_CHANGED/);
});
test('audit adapter rejects incomplete host interaction evidence', async t => {
  const f = await auditFixture(t);
  await assert.rejects(host.collectSiteAudit(f.context, { url: 'http://127.0.0.1:3001', run: async (_command, args) => {
    if (args[2].endsWith('game_site_audit.mjs')) await writeAudit(args[args.indexOf('--out') + 1]);
    else await writeInteractions(args[args.indexOf('--output') + 1], { notTested: true });
  } }), /SITE_AUDIT_INTERACTIONS_INCOMPLETE/);
});
test('host interaction validator requires every expected category, not only summary counts', async t => {
  const f = await auditFixture(t), path = join(f.root, 'interactions.json');
  await writeInteractions(path, { routes: ['/'] });
  const value = JSON.parse(await readFile(path));
  value.routes[0].checks = value.routes[0].checks.filter(item => item.category !== 'search-trigger');
  value.summary.NOT_APPLICABLE--;
  await writeFile(path, JSON.stringify(value));
  await assert.rejects(validateHostInteractions(path, sha256(await readFile(path)), 'audit-host', ['/']),
    /categories are incomplete/);
});
test('audit adapter rejects route escape and an incomplete viewport set', async t => {
  const f = await auditFixture(t), path = f.context.upstream[0].artifacts[0].path;
  const manifest = JSON.parse(await readFile(path));
  manifest.pages = [{ disposition: 'PUBLISH', route: '//external.invalid/' }];
  manifest.counts = { publish: 1, draftOnly: 0, omit: 0 };
  await writeFile(path, JSON.stringify(manifest));
  await assert.rejects(host.collectSiteAudit(f.context, { url: 'http://127.0.0.1:3001', run: async () => assert.fail('must not run') }), /ROUTE_PUBLICATION_INVALID/);
  manifest.pages = [{ disposition: 'PUBLISH', route: '/' }];
  manifest.counts = { publish: 1, draftOnly: 0, omit: 0 };
  await writeFile(path, JSON.stringify(manifest));
  await assert.rejects(host.collectSiteAudit(f.context, { url: 'http://127.0.0.1:3001', run: async (_c,args) => {
    const out = args[args.indexOf('--out') + 1]; await writeAudit(out);
    await writeFile(join(out, 'AUTOMATED_AUDIT.json'), '{"viewports":[{"width":390}]}');
  } }), /SITE_AUDIT_VIEWPORTS_INVALID/);
});
test('audit findings exit code 2 preserves completed evidence, other failures still reject', async t => {
  const f = await auditFixture(t);
  const bundle = await host.collectSiteAudit(f.context, { url: 'http://127.0.0.1:3001', run: async (_c,args) => {
    if (args[2].endsWith('game_site_audit.mjs')) {
      await writeAudit(args[args.indexOf('--out')+1]); throw Object.assign(Error('HIGH findings'), { exitCode: 2 });
    }
    await writeInteractions(args[args.indexOf('--output') + 1]);
  } });
  assert.equal(bundle.scriptExitCode, 2);
  await assert.rejects(host.collectSiteAudit(f.context, { url: 'http://127.0.0.1:3001', run: async () => { throw Object.assign(Error('browser launch failed'), { exitCode: 1 }); } }), /browser launch failed/);
});
test('module hook resolves playwright from an external script without editing the Skill', async t => {
  const f = await fixture(t), script = join(f.root, 'import-playwright.mjs');
  await writeFile(script, "const {chromium}=await import('playwright'); console.log(typeof chromium.launch);");
  const result = await runProcess(process.execPath, ['--import', new URL('../src/playwright-register.mjs', import.meta.url).pathname, script]);
  assert.equal(result.stdout.trim(), 'function');
});
test('audit executor builds preview, passes immutable evidence, permits view_image and always stops', async t => {
  const f = await auditFixture(t); let stops = 0;
  const execute = createSkillExecutor({ researchPython: process.execPath, previewSite: async path => {
    assert.equal(path, f.context.inputs.projectPath); return { url: 'http://127.0.0.1:3001', stop: async () => { stops++; } };
  }, auditSite: async context => { await writeAudit(join(context.inputs.projectPath, 'docs/ui-ux-audit', context.runId));
    return evidence.snapshotSiteEvidence(join(context.inputs.projectPath, 'docs/ui-ux-audit', context.runId));
  }, run: async (_c,args,options) => {
    const context = JSON.parse(options.input.split('Task context: ')[1].split('\n')[0]);
    assert.ok(context.hostEvidence.files.length); assert.match(options.input, /view_image/);
    const path = args.find(value => value.startsWith('shell_environment_policy.set='));
    assert.ok(path.indexOf(dirname(process.execPath)) < path.indexOf('/usr/bin'));
    assert.ok(args.find(value => value.startsWith('permissions.agent-worker='))
      .includes(JSON.stringify(dirname(dirname(process.execPath))) + '="read"'));
    assert.ok(options.input.includes(`Use ${process.execPath} for every Python Skill script`));
    assert.ok(args.includes('view_image')); assert.match(args.join(' '), /network=\{enabled=false\}/);
    assert.ok(!args.join(' ').includes(JSON.stringify(join(f.context.inputs.projectPath,'docs/ui-ux-audit')) + '="write"'));
    await writeFile(args[args.indexOf('--output-last-message')+1], JSON.stringify({ status: 'BLOCKED', artifacts: [], missing_inputs: [], evidence: ['synthetic review incomplete'] }));
  } });
  assert.equal((await execute(STAGE.UI_UX_AUDIT, f.context)).status, 'BLOCKED'); assert.equal(stops, 1);
});
test('host accepts a complete provisional audit while preserving a BLOCKED site verdict', async t => {
  const f = await auditFixture(t), requiredArtifacts = [
    'UI_UX_AUDIT_REPORT.md', 'UI_UX_AUDIT.json', 'UI_UX_OPTIMIZATION_PLAN.md'];
  f.context.requiredArtifacts = requiredArtifacts;
  const execute = createSkillExecutor({ researchPython: process.execPath,
    validationOptions: { run: async () => ({ exitCode: 0 }) },
    previewSite: async () => ({ url: 'http://127.0.0.1:3001', stop: async () => {} }),
    auditSite: async context => {
      const directory = join(context.inputs.projectPath, 'docs/ui-ux-audit', context.runId);
      await writeAudit(directory);
      const interactionsPath = join(directory, 'HOST_UI_INTERACTIONS.json');
      await writeInteractions(interactionsPath, { routes: ['/'] });
      const interactionsSha256 = sha256(await readFile(interactionsPath));
      return { ...(await evidence.snapshotSiteEvidence(directory)), routes: ['/'],
        interactionsPath, interactionsSha256 };
    },
    run: async (_command, args, options) => {
      const context = JSON.parse(options.input.split('Task context: ')[1].split('\n')[0]);
      const report = { schema_version: 1, game: context.inputs.gameIdentity, mode: 'audit-only', verdict: 'BLOCKED',
        execution_acceptance: { kind: 'AUDIT_EXECUTION_ACCEPTANCE_V1', status: 'COMPLETE',
          host_interactions_sha256: context.hostEvidence.interactionsSha256 },
        routes: [{ route: '/', archetype: 'home', reason: 'fixture' }],
        findings: [{ id: 'UX-001', severity: 'BLOCKER', route: '/', category: 'trust',
          evidence: 'Missing operator identity', impact: 'Launch trust requirement is absent',
          recommendation: 'Add verified operator details', verification: 'Review policy pages', status: 'OPEN' }],
        viewports: [360,390,768,1024,1440,1920],
        summary: { blocker: 1, high: 0, medium: 0, low: 0, note: 0 } };
      await writeFile(join(context.reportDirectory, 'UI_UX_AUDIT_REPORT.md'), '# Complete fixture audit');
      await writeFile(join(context.reportDirectory, 'UI_UX_OPTIMIZATION_PLAN.md'), '# Fix UX-001');
      await writeFile(join(context.reportDirectory, 'UI_UX_AUDIT.json'), JSON.stringify(report));
      await writeFile(args[args.indexOf('--output-last-message') + 1], JSON.stringify({
        status: 'PARTIAL', summary: 'Audit complete; site blocked', missing_inputs: [], evidence: ['fixture'],
        stage4_completion: null,
        stage5_completion: { kind: 'STAGE5_AUDIT_HANDOFF_V1', audit_execution: 'COMPLETE',
          host_validation: 'REQUIRED', site_verdict: 'BLOCKED' },
        artifacts: requiredArtifacts.map(kind => ({ kind, path: join(context.reportDirectory, kind) })),
      }));
    } });
  const result = await execute(STAGE.UI_UX_AUDIT, f.context);
  assert.equal(result.status, 'PASSED');
  assert.equal(result.stage5SiteVerdict, 'BLOCKED');
  assert.equal(await readFile(join(f.context.inputs.projectPath, 'docs/ui-ux-audit/LATEST'), 'utf8'), f.context.runId);
  assert.ok(result.artifacts.every(item => item.path.includes('/artifacts/4/1/')),
    'validated artifacts must be registered into the run snapshot');
});
test('host report publication rolls back reports and LATEST when validation fails', async t => {
  const f = await auditFixture(t), root = join(f.context.inputs.projectPath, 'docs/ui-ux-audit');
  const directory = join(root, f.context.runId), reportDirectory = join(f.context.runDirectory, 'native/reports');
  await mkdir(reportDirectory, { recursive: true });
  f.context.nativeDirectory = join(f.context.runDirectory, 'native');
  f.context.reportDirectory = reportDirectory;
  f.context.requiredArtifacts = ['UI_UX_AUDIT_REPORT.md', 'UI_UX_AUDIT.json', 'UI_UX_OPTIMIZATION_PLAN.md'];
  await mkdir(directory, { recursive: true });
  await writeFile(join(root, 'LATEST'), 'previous-run');
  const result = { artifacts: [] };
  for (const kind of f.context.requiredArtifacts) {
    const path = join(reportDirectory, kind); await writeFile(path, `new ${kind}`);
    result.artifacts.push({ kind, path });
  }
  await assert.rejects(host.publishSiteAuditReports(f.context, result, async () => {
    throw Error('synthetic validation failure');
  }), /synthetic validation failure/);
  assert.equal(await readFile(join(root, 'LATEST'), 'utf8'), 'previous-run');
  for (const kind of f.context.requiredArtifacts)
    await assert.rejects(readFile(join(directory, kind)), { code: 'ENOENT' });
  assert.deepEqual(result.artifacts.map(item => item.path),
    f.context.requiredArtifacts.map(kind => join(reportDirectory, kind)));
});
test('audit evidence mutation is rejected, worker failure still stops preview', async t => {
  for (const throws of [false, true]) {
    const f = await auditFixture(t); let stops = 0, path;
    const execute = createSkillExecutor({ previewSite: async () => ({ url: 'http://127.0.0.1:3001', stop: async () => { stops++; } }),
      auditSite: async context => {
        const directory = join(context.inputs.projectPath, 'docs/ui-ux-audit', context.runId); await writeAudit(directory);
        path = join(directory, 'AUTOMATED_AUDIT.json'); return evidence.snapshotSiteEvidence(directory);
      }, run: async (_c,args) => {
        if (throws) throw Error('synthetic worker failed');
        await writeFile(path, '{}');
        await writeFile(args[args.indexOf('--output-last-message')+1], JSON.stringify({ status: 'BLOCKED', artifacts: [], missing_inputs: [], evidence: ['fixture'] }));
      } });
    await assert.rejects(execute(STAGE.UI_UX_AUDIT, f.context), throws ? /synthetic worker failed/ : /HOST_EVIDENCE_CHANGED/);
    assert.equal(stops, 1);
  }
});
test('preview failure waits with useful sanitized recovery instructions; optimize never starts preview', async t => {
  const f = await auditFixture(t); let starts = 0;
  const execute = createSkillExecutor({ previewSite: async () => { starts++; throw Error('SITE_PREVIEW_FAILED: password=private-fixture'); }, run: async () => assert.fail('worker must not run') });
  const waiting = await execute(STAGE.UI_UX_AUDIT, f.context);
  assert.equal(waiting.status, 'WAITING_FOR_USER'); assert.ok(waiting.missing_inputs.length);
  assert.match(waiting.evidence.join(' '), /SITE_PREVIEW_FAILED/); assert.doesNotMatch(waiting.evidence.join(' '), /private-fixture/);
  assert.equal((await execute(STAGE.UI_UX_AUDIT, { ...f.context, mode: 'optimize' })).status, 'BLOCKED'); assert.equal(starts, 1);
});
