import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { AGENT_ROOT } from '../src/skill-lock.mjs';
import { createSkillExecutor } from '../src/skill-executor.mjs';
import { snapshotSiteEvidence } from '../src/site-evidence.mjs';

async function hostFixture(t) {
  const runId = 'host-fixture-' + randomUUID(), runDirectory = join(AGENT_ROOT, 'runs', runId);
  const outputDirectory = join(runDirectory, 'artifacts/0/1');
  await mkdir(outputDirectory, { recursive: true });
  t.after(() => rm(runDirectory, { recursive: true, force: true }));
  return { runDirectory, context: { runId, outputDirectory, inputs: { gameIdentity: 'Bodycam',
    projectPath: join(AGENT_ROOT, 'workspaces', runId, 'site') }, mode: 'audit-only', requiredArtifacts: [],
    skillLock: { source: join(AGENT_ROOT, 'config/workflow.json') }, permissions: { siteWrites: false } } };
}
const reply = (args, result) => writeFile(args[args.indexOf('--output-last-message') + 1], JSON.stringify(result));
const blocked = { status: 'BLOCKED', artifacts: [], missing_inputs: [], evidence: ['Native outputs incomplete'] };
const waiting = { status: 'WAITING_FOR_USER', artifacts: [], missing_inputs: ['homepageSourceCaptures'], evidence: ['Need public sources'] };
async function capture(context) {
  const directory = join(context.runDirectory, 'homepage-sources/captures'); await mkdir(directory, { recursive: true });
  const manifestPath = join(directory, 'CAPTURES.json'); await writeFile(manifestPath, '{"captures":[]}');
  return { ...await snapshotSiteEvidence(directory), manifestPath };
}

test('offline homepage planning needs neither Mac browser consent nor G0 commands', async t => {
  const f = await hostFixture(t); let workers = 0;
  const forbidden = () => assert.fail('G0 adapter is detached');
  const result = await createSkillExecutor({ browserHumanDialog: true, requestBrowserLaunch: forbidden,
    collectBrowserEvidence: forbidden, inspectHomepageReadiness: forbidden,
    run: async (_c,args) => { workers++; await reply(args, blocked); } })('game-homepage-icon-research', f.context);
  assert.equal(result.status, 'BLOCKED'); assert.equal(workers, 1);
});
test('captured public evidence goes to the same worker without MCP or credentials', async t => {
  const f = await hostFixture(t); let workers = 0;
  const result = await createSkillExecutor({ captureHomepageSources: capture,
    run: async (_c,args,options) => {
      workers++; assert.ok(args.includes('--ignore-user-config')); assert.ok(!args.join(' ').includes('mcp_servers.scoped_game_bsk'));
      assert.equal(options.env.FEISHU_APP_SECRET, undefined); assert.equal(options.env.GAME_SITE_BROWSER_HUMAN_DIALOG, undefined);
      if (workers === 2) assert.match(options.input, /CAPTURES.json/);
      await reply(args, workers === 1 ? waiting : blocked);
    } })('game-homepage-icon-research', f.context);
  assert.equal(result.status, 'BLOCKED'); assert.equal(workers, 2);
});
test('a host capture failure does not dispatch a second worker', async t => {
  const f = await hostFixture(t); let workers = 0;
  const result = await createSkillExecutor({ captureHomepageSources: async () => { throw Error('HOST_CAPTURE_UNAVAILABLE'); },
    run: async (_c,args) => { workers++; await reply(args, waiting); } })('game-homepage-icon-research', f.context);
  assert.equal(result.status, 'WAITING_FOR_USER'); assert.match(result.evidence.join(' '), /HOST_CAPTURE_UNAVAILABLE/); assert.equal(workers, 1);
});
test('legacy official-source scope is not required for initial source planning', async t => {
  const f = await hostFixture(t); let workers = 0;
  const result = await createSkillExecutor({ collectHomepageSourceEvidence: () => assert.fail('legacy scope must not be consulted'),
    run: async (_c,args) => { workers++; await reply(args, blocked); } })('game-homepage-icon-research', f.context);
  assert.equal(result.status, 'BLOCKED'); assert.equal(workers, 1);
});
test('human browser opt-in cannot authorize optimize mode or source edits', async t => {
  const f = await hostFixture(t); let calls = 0;
  for (const stage of ['game-site-ui-ux-audit-optimizer', 'game-site-prelaunch-gate']) {
    const result = await createSkillExecutor({ browserHumanDialog: true, previewSite: async () => { calls++; },
      run: async () => { calls++; } })(stage, { ...f.context, mode: 'optimize' });
    assert.equal(result.status, 'BLOCKED');
  }
  assert.equal(calls, 0);
});
test('worker mutation of the homepage capture manifest is detected', async t => {
  const f = await hostFixture(t); let path, workers = 0;
  const executor = createSkillExecutor({ captureHomepageSources: async context => { const bundle = await capture(context); path = bundle.manifestPath; return bundle; },
    run: async (_c,args) => { workers++; if (workers === 2) await writeFile(path, '{"forged":true}'); await reply(args, workers === 1 ? waiting : blocked); } });
  await assert.rejects(executor('game-homepage-icon-research', f.context), /HOST_EVIDENCE_CHANGED/);
});
test('failed public sources remain evidence limitations instead of a synthetic successful research stage', async t => {
  const f = await hostFixture(t); let workers = 0;
  const result = await createSkillExecutor({ captureHomepageSources: async context => {
    const bundle = await capture(context); await writeFile(bundle.manifestPath, '{"captures":[{"status":"FAILED","reason":"network unavailable"}]}');
    return { ...await snapshotSiteEvidence(bundle.directory), manifestPath: bundle.manifestPath };
  }, run: async (_c,args,options) => {
    workers++; if (workers === 2) { assert.match(options.input, /rejected\/failed pages/); assert.doesNotMatch(options.input, /homepageMediaEvidencePath/); }
    await reply(args, workers === 1 ? waiting : blocked);
  } })('game-homepage-icon-research', f.context);
  assert.equal(result.status, 'BLOCKED'); assert.deepEqual(result.artifacts, []); assert.equal(workers, 2);
});
