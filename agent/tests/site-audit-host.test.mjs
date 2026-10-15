import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fixture } from './helpers.mjs';
import { STAGE } from '../src/stages.mjs';
import { createSkillExecutor } from '../src/skill-executor.mjs';
import { runProcess } from '../src/process.mjs';

const host = await import('../src/site-audit-host.mjs').catch(() => ({}));
const evidence = await import('../src/site-evidence.mjs').catch(() => ({}));
export async function auditFixture(t) {
  const f = await fixture(t), runId = 'audit-host', runDirectory = join(f.configuration.workspace, 'runs', runId);
  const projectPath = join(f.root, 'site'), manifestPath = join(runDirectory, 'CONTENT_PAGE_MANIFEST.json');
  await mkdir(runDirectory, { recursive: true }); await mkdir(projectPath);
  await writeFile(manifestPath, JSON.stringify({ pages: [{ route: '/guide', outcome: 'PUBLISHED' }, { route: '/draft', outcome: 'DRAFT' }] }));
  return { ...f, context: { runId, runDirectory, inputs: { ...f.inputs, projectPath },
    outputDirectory: join(runDirectory, 'artifacts/4/1'), requiredArtifacts: [], mode: 'audit-only',
    skillLock: { source: join(f.root, 'skills', STAGE.UI_UX_AUDIT + '.md') },
    permissions: { siteWrites: false, uiChanges: false },
    upstream: [{ skill: STAGE.CONTENT_INTEGRATION, artifacts: [{ kind: 'CONTENT_PAGE_MANIFEST.json', path: manifestPath }] }] } };
}
async function writeAudit(directory) {
  await mkdir(join(directory, 'screenshots/home'), { recursive: true });
  await writeFile(join(directory, 'screenshots/home/desktop-1440.png'), 'synthetic screenshot');
  await writeFile(join(directory, 'AUTOMATED_AUDIT.json'), JSON.stringify({ viewports: [360,390,768,1024,1440,1920].map(width => ({ width })) }));
}
test('audit adapter uses locked script through module hook and published routes plus homepage', async t => {
  const f = await auditFixture(t); let calls = 0;
  const result = await host.collectSiteAudit(f.context, { run: async (command, args) => {
    calls++; assert.equal(command, process.execPath); assert.equal(args[0], '--import');
    assert.ok(args[1].endsWith('playwright-register.mjs'));
    assert.equal(args[2], join(f.root, 'skills/scripts/game_site_audit.mjs'));
    assert.equal(args[args.indexOf('--url') + 1], 'http://127.0.0.1:3001');
    assert.deepEqual(args.flatMap((v,i) => v === '--route' ? [args[i+1]] : []), ['/', '/guide']);
    await writeAudit(args[args.indexOf('--out') + 1]);
  }, url: 'http://127.0.0.1:3001' });
  assert.equal(calls, 1); assert.ok(result.files.every(file => /^[a-f0-9]{64}$/.test(file.sha256)));
  assert.ok(result.screenshotsDirectory.endsWith('/screenshots'));
  await evidence.verifySiteEvidence(result);
  await writeFile(result.automatedAuditPath, '{}');
  await assert.rejects(evidence.verifySiteEvidence(result), /HOST_EVIDENCE_CHANGED/);
});
test('audit adapter rejects route escape and an incomplete viewport set', async t => {
  const f = await auditFixture(t), path = f.context.upstream[0].artifacts[0].path;
  await writeFile(path, JSON.stringify({ pages: [{ outcome: 'PUBLISHED', route: '//external.invalid/' }] }));
  await assert.rejects(host.collectSiteAudit(f.context, { url: 'http://127.0.0.1:3001', run: async () => assert.fail('must not run') }), /SITE_ROUTE_INVALID/);
  await writeFile(path, JSON.stringify({ pages: [] }));
  await assert.rejects(host.collectSiteAudit(f.context, { url: 'http://127.0.0.1:3001', run: async (_c,args) => {
    const out = args[args.indexOf('--out') + 1]; await writeAudit(out);
    await writeFile(join(out, 'AUTOMATED_AUDIT.json'), '{"viewports":[{"width":390}]}');
  } }), /SITE_AUDIT_VIEWPORTS_INVALID/);
});
test('module hook resolves playwright from an external script without editing the Skill', async t => {
  const f = await fixture(t), script = join(f.root, 'import-playwright.mjs');
  await writeFile(script, "const {chromium}=await import('playwright'); console.log(typeof chromium.launch);");
  const result = await runProcess(process.execPath, ['--import', new URL('../src/playwright-register.mjs', import.meta.url).pathname, script]);
  assert.equal(result.stdout.trim(), 'function');
});
test('audit executor builds preview, passes immutable evidence, permits view_image and always stops', async t => {
  const f = await auditFixture(t); let stops = 0;
  const execute = createSkillExecutor({ previewSite: async path => {
    assert.equal(path, f.context.inputs.projectPath); return { url: 'http://127.0.0.1:3001', stop: async () => { stops++; } };
  }, auditSite: async context => { await writeAudit(join(context.inputs.projectPath, 'docs/ui-ux-audit', context.runId));
    return evidence.snapshotSiteEvidence(join(context.inputs.projectPath, 'docs/ui-ux-audit', context.runId));
  }, run: async (_c,args,options) => {
    const context = JSON.parse(options.input.split('Task context: ')[1].split('\n')[0]);
    assert.ok(context.hostEvidence.files.length); assert.match(options.input, /view_image/);
    assert.ok(args.includes('view_image')); assert.match(args.join(' '), /network=\{enabled=false\}/);
    assert.ok(!args.join(' ').includes(JSON.stringify(join(f.context.inputs.projectPath,'docs/ui-ux-audit')) + '="write"'));
    await writeFile(args[args.indexOf('--output-last-message')+1], JSON.stringify({ status: 'BLOCKED', artifacts: [], missing_inputs: [], evidence: ['synthetic review incomplete'] }));
  } });
  assert.equal((await execute(STAGE.UI_UX_AUDIT, f.context)).status, 'BLOCKED'); assert.equal(stops, 1);
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
