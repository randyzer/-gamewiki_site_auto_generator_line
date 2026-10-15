import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink, readdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';

const moduleURL = new URL('../src/pipeline.mjs', import.meta.url);
const hash = value => createHash('sha256').update(value).digest('hex');
let api;
test('orchestration module exposes offline factory', async () => {
  try { api = await import(moduleURL); } catch (error) {
    if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
  }
  assert.equal(typeof api?.createPipeline, 'function');
});

async function fixture(t, overrides = {}) {
  api ??= await import(moduleURL);
  const root = await mkdtemp(resolve('.pipeline-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const source = join(root, 'skills');
  const workspace = join(root, 'workspace');
  const template = join(root, 'templates');
  await Promise.all([source, workspace, template].map(p => mkdir(p)));
  const skills = [];
  for (const name of [...api.STAGES, api.AD_STAGE]) {
    const path = join(source, `${name}.md`);
    await writeFile(path, name);
    skills.push({ name, source: path, sha256: hash(name), available: true });
  }
  const inventoryPath = join(root, 'inventory.json');
  await writeFile(inventoryPath, JSON.stringify({ skillRoot: source, skills }));
  const keywords = join(root, 'raw.md');
  await writeFile(keywords, '# User keywords\n- Example walkthrough\n');
  const inputs = {
    gameIdentity: 'Example / PC / full release', projectPath: join(workspace, 'site'),
    objective: 'Create guide site', rawKeywordsFile: keywords,
    canonicalRequired: false, domain: 'example.test', repo: 'owner/repo',
    branch: 'main', dns: { provider: 'Example DNS', recordsReviewed: true },
    siteRevision: 'reviewed-tree-1', deploymentPlanAuthorized: true,
    ...overrides,
  };
  const calls = [];
  const good = (skill, context) => ({
    status: 'PASSED', evidence: ['Offline fixture evidence'], missing_inputs: [],
    artifacts: context.requiredArtifacts.map(kind => ({
      kind, path: join(context.outputDirectory, kind), runId: context.runId,
      projectPath: context.inputs.projectPath, gameIdentity: context.inputs.gameIdentity,
      content: kind === 'PRELAUNCH_ACCEPTANCE.json'
        ? JSON.stringify({ disposition: '可以上线', siteRevision: inputs.siteRevision, domain: inputs.domain })
        : kind.endsWith('.json') ? '{}' : `Evidence for ${skill}`,
    })),
  });
  const options = { workspace, inventoryPath, templateRoots: [template], inputs,
    executor: async (skill, context) => { calls.push({ skill, context }); return good(skill, context); } };
  return { root, source, workspace, template, inputs, calls, options, good,
    create: extra => api.createPipeline({ ...options, ...extra }) };
}
async function advance(pipeline, count) {
  for (let i = 0; i < count; i++) await pipeline.advance();
  return pipeline.snapshot();
}

test('seven stages are ordered and missing startup inputs never call executor or create site', async t => {
  const f = await fixture(t, { gameIdentity: '', objective: '' });
  const p = await f.create();
  await p.advance();
  const s = p.snapshot();
  assert.equal(s.stages[0].status, 'WAITING_FOR_USER');
  assert.deepEqual(s.stages.slice(0, 7).map(s => s.skill), api.STAGES);
  assert.equal(f.calls.length, 0);
  assert.equal((await readdir(f.workspace)).includes('site'), false);
  const list = p.inputChecklist();
  assert.equal(list.find(x => x.key === 'gameIdentity').timing, 'now');
  assert.equal(list.find(x => x.key === 'rawKeywordsFile').timing, 'later');
});

test('stage contexts and input checklist identify stages by name', async t => {
  const f = await fixture(t), p = await f.create();
  await p.advance();
  assert.equal(f.calls[0].context.stage, 'game-homepage-icon-research');
  assert.equal(p.inputChecklist().find(item => item.key === 'domain').skill, 'game-site-prelaunch-gate');
  const { summarize } = await import('../src/orchestrator.mjs');
  const state = p.snapshot();
  state.stages.find(stage => stage.skill === 'game-site-deploy-and-measurement').checkpoint.planDigest = 'named-plan';
  state.stages.reverse();
  const result = summarize(state);
  assert.equal(result.stage, 'game-site-deploy-and-measurement');
  assert.equal(result.plan_digest, 'named-plan');
});

test('homepage stage accepts the icon source fields already validated by the entry', async t => {
  const f = await fixture(t);
  const iconSourcePng = join(f.root, 'approved-icon.png');
  await writeFile(iconSourcePng, 'SYNTHETIC_ICON_BYTES');
  const p = await f.create({ inputs: { ...f.inputs, iconSourcePng,
    iconSourceMethod: 'USER_ATTESTED_ORIGINAL_GENERATED_ARTWORK' } });
  await p.advance();
  assert.equal(p.snapshot().stages[0].status, 'PASSED');
  assert.equal(f.calls[0].context.inputs.iconSourcePng, iconSourcePng);
  assert.equal(f.calls[0].context.inputs.iconSourceMethod, 'USER_ATTESTED_ORIGINAL_GENERATED_ARTWORK');
});

test('UI optimization accepts its stage name and rejects approval for another stage', async t => {
  const f = await fixture(t, { uiMode: 'optimize' }), p = await f.create();
  await advance(p, 5);
  const approval = { approved: true, projectPath: f.inputs.projectPath, scope: 'spacing only',
    runId: p.snapshot().runId, stage: 'game-site-content-integrator', siteRevision: f.inputs.siteRevision, files: ['app/page.tsx'] };
  await p.updateUserInputs({ uiApproval: approval }); await p.advance();
  assert.equal(p.snapshot().stages[4].status, 'WAITING_FOR_USER');
  await p.updateUserInputs({ uiApproval: { ...approval, stage: 'game-site-ui-ux-audit-optimizer' } });
  await p.advance();
  assert.equal(p.snapshot().stages[4].status, 'PASSED');
  assert.equal(f.calls.at(-1).context.permissions.uiChanges, true);
});

test('failed stages persist their operation, reason and safe code and retain diagnostics after retry', async t => {
  const f = await fixture(t);
  const p = await f.create({ executor: async () => { throw Object.assign(Error('Missing template file; token=PRIVATE_DIAGNOSTIC_VALUE'), { code: 'ENOENT' }); } });
  await p.advance();
  const failed = p.snapshot().stages[0];
  assert.equal(failed.diagnostic.stage, 'game-homepage-icon-research');
  assert.equal(failed.diagnostic.operation, 'execute-skill');
  assert.equal(failed.diagnostic.code, 'ENOENT');
  assert.match(failed.diagnostic.reason, /Missing template file/);
  assert.match(failed.evidence.join(' '), /Missing template file/);
  assert.ok(failed.diagnostic.recordPath.startsWith(p.manifestPath.slice(0, -'manifest.json'.length)));
  assert.doesNotMatch(await readFile(failed.diagnostic.recordPath, 'utf8'), /PRIVATE_DIAGNOSTIC_VALUE/);
  assert.doesNotMatch(await readFile(p.manifestPath, 'utf8'), /PRIVATE_DIAGNOSTIC_VALUE/);
  const restored = await f.create({ runId: p.snapshot().runId, resume: true, inputs: {} });
  assert.deepEqual(restored.snapshot().stages[0].diagnostic, failed.diagnostic);
  await restored.updateUserInputs({}, { retry: true }); await restored.advance();
  assert.equal(restored.snapshot().stages[0].diagnostic, undefined);
  assert.deepEqual(restored.snapshot().stages[0].history.find(item => item.to === 'FAILED').diagnostic, failed.diagnostic);
});

test('artifact validation failures identify the missing role instead of generic executor failure', async t => {
  const f = await fixture(t);
  const p = await f.create({ executor: async (s, c) => ({ ...f.good(s, c), artifacts: [] }) });
  await p.advance();
  const failed = p.snapshot().stages[0];
  assert.equal(failed.diagnostic.operation, 'validate-artifacts');
  assert.match(failed.diagnostic.reason, /Missing required artifact: HOMEPAGE_RESEARCH.md/);
});

test('artifact write failure and worker-reported failure both retain the actual reason', async t => {
  const f = await fixture(t);
  const p = await f.create({ executor: async (s, c) => {
    const result = f.good(s, c);
    await writeFile(result.artifacts[0].path, 'existing worker file'); return result;
  } });
  await p.advance();
  assert.equal(p.snapshot().stages[0].diagnostic.operation, 'save-artifacts');
  assert.equal(p.snapshot().stages[0].diagnostic.code, 'EEXIST');
  const p2 = await f.create({ executor: async () => ({ status: 'FAILED', artifacts: [], missing_inputs: [], evidence: ['Required image-generation tool is missing'] }) });
  await p2.advance();
  assert.match(p2.snapshot().stages[0].diagnostic.reason, /image-generation tool is missing/);
});

test('invalid inventory JSON cannot leak the parser input into a manifest or failure diagnostic', async t => {
  const f = await fixture(t);
  await writeFile(f.options.inventoryPath, "'FAKE1234'");
  const p = await f.create();
  assert.doesNotMatch(await readFile(p.manifestPath, 'utf8'), /FAKE1234/);
  await p.advance();
  const failed = p.snapshot().stages[0];
  assert.equal(failed.status, 'BLOCKED');
  assert.match(failed.diagnostic.reason, /Invalid JSON/);
  assert.doesNotMatch(await readFile(failed.diagnostic.recordPath, 'utf8'), /FAKE1234/);
});

test('keywords require explicitly supplied nonempty Markdown and wait until explicit update', async t => {
  const f = await fixture(t, { rawKeywordsFile: undefined });
  const p = await f.create();
  await advance(p, 3);
  assert.equal(f.calls.length, 1);
  assert.equal(p.snapshot().stages[1].status, 'WAITING_FOR_USER');
  await p.updateUserInputs({ rawKeywordsFile: join(f.root, 'raw.md') });
  await p.advance();
  assert.equal(p.snapshot().stages[1].status, 'PASSED');
});

test('UI changes require scoped approval; default context is audit-only', async t => {
  const f = await fixture(t, { uiMode: 'optimize' });
  const p = await f.create();
  await advance(p, 5);
  assert.equal(f.calls.length, 4);
  assert.equal(p.snapshot().stages[4].status, 'WAITING_FOR_USER');
  await p.updateUserInputs({ uiApproval: { approved: true, projectPath: f.inputs.projectPath, scope: 'spacing only',
    runId: p.snapshot().runId, stage: 4, siteRevision: f.inputs.siteRevision, files: ['app/page.tsx'] } });
  await p.advance();
  assert.equal(f.calls.at(-1).context.permissions.uiChanges, true);
});

test('transition history records READY and IN_PROGRESS with durable checkpoint', async t => {
  const f = await fixture(t);
  const p = await f.create();
  await p.advance();
  const stage = p.snapshot().stages[0];
  assert.deepEqual(stage.history.map(x => x.to), ['READY', 'IN_PROGRESS', 'PASSED']);
  assert.equal(stage.checkpoint.attempt, 1);
  const disk = JSON.parse(await readFile(p.manifestPath, 'utf8'));
  assert.deepEqual(disk.stages[0], stage);
  const copy = p.snapshot(); copy.stages[0].status = 'FAILED';
  assert.equal(p.snapshot().stages[0].status, 'PASSED');
});

test('wrong project artifact fails without persisting executor artifacts', async t => {
  const f = await fixture(t);
  const p = await f.create({ executor: async (s, c) => {
    const result = f.good(s, c); result.artifacts[0].projectPath = '/wrong'; return result;
  } });
  await p.advance();
  assert.equal(p.snapshot().stages[0].status, 'FAILED');
  assert.deepEqual(p.snapshot().stages[0].artifacts, []);
});

test('resume reads checkpoint and never re-invokes a passed stage', async t => {
  const f = await fixture(t);
  const p = await f.create(); await p.advance();
  const resumed = await f.create({ runId: p.snapshot().runId, resume: true });
  await resumed.advance();
  assert.deepEqual(f.calls.map(x => x.skill), api.STAGES.slice(0, 2));
});

test('SHA mismatch blocks before invoking a skill', async t => {
  const f = await fixture(t);
  await writeFile(join(f.source, `${api.STAGES[0]}.md`), 'changed');
  const p = await f.create(); await p.advance();
  assert.equal(p.snapshot().stages[0].status, 'BLOCKED');
  assert.match(p.snapshot().stages[0].evidence.join(' '), /SHA256/);
  assert.equal(f.calls.length, 0);
});

test('mid-run source or inventory changes block locked execution', async t => {
  const f = await fixture(t);
  const p = await f.create(); await p.advance();
  await writeFile(join(f.source, `${api.STAGES[1]}.md`), 'changed');
  await p.advance();
  assert.equal(p.snapshot().stages[1].status, 'BLOCKED');
  assert.equal(f.calls.length, 1);
});

test('deploy always produces a plan and waits, even when executor says PASSED', async t => {
  const f = await fixture(t);
  const p = await f.create(); await advance(p, 9);
  const state = p.snapshot();
  assert.equal(f.calls.length, 7);
  assert.equal(state.stages[6].status, 'WAITING_FOR_USER');
  assert.equal(f.calls[4].context.mode, 'audit-only');
  assert.equal(f.calls[6].context.mode, 'plan');
  for (const key of ['gitPush', 'dns', 'productionDeployment', 'gsc', 'ga4', 'advertisingScripts']) {
    assert.equal(f.calls[6].context.permissions[key], false);
  }
  assert.equal(state.deploymentExecuted, false);
  assert.equal(state.stages[7].status, 'SKIPPED');
});

test('deployment inputs and plan authorization are collected only at deployment', async t => {
  const f = await fixture(t, { repo: '', dns: undefined, deploymentPlanAuthorized: false });
  const p = await f.create(); await advance(p, 7);
  assert.equal(f.calls.length, 6);
  assert.deepEqual(p.snapshot().stages[6].missing_inputs.sort(), ['deploymentPlanAuthorized', 'dns', 'repo']);
});

test('optional ads require explicit enable, user code and approval, and stay plan-only', async t => {
  const f = await fixture(t, { adsEnabled: true });
  const p = await f.create(); await advance(p, 7);
  const digest = p.snapshot().stages[6].checkpoint.planDigest;
  await p.updateUserInputs({ deploymentPlanApproval: { approved: true, digest } });
  await advance(p, 2);
  assert.equal(p.snapshot().stages[7].status, 'WAITING_FOR_USER');
  assert.equal(f.calls.length, 7);
  await p.updateUserInputs({ adCode: '<script src="https://ads.example.test/a.js"></script>',
    liveUrl: 'https://example.test', adApproval: { approved: true, projectPath: f.inputs.projectPath, scope: 'plan footer ad' } });
  await p.advance();
  assert.equal(f.calls.at(-1).skill, api.AD_STAGE);
  assert.equal(f.calls.at(-1).context.mode, 'plan-only');
  assert.equal(f.calls.at(-1).context.permissions.advertisingScripts, false);
});

for (const status of ['PARTIAL', 'BLOCKED', 'FAILED']) {
  test(`${status} never advances and retry requires explicit user input`, async t => {
    const f = await fixture(t); let count = 0;
    const p = await f.create({ executor: async (s, c) => {
      count++; return { ...f.good(s, c), status };
    } });
    await advance(p, 3);
    assert.equal(count, 1);
    assert.equal(p.snapshot().stages[0].status, status);
    assert.equal(p.snapshot().stages[1].status, 'NOT_STARTED');
  });
}

test('missing required artifacts and invalid output status fail closed', async t => {
  for (const result of [ { status: 'PASSED', artifacts: [], evidence: ['x'], missing_inputs: [] },
    { status: 'SKIPPED', artifacts: [], evidence: [], missing_inputs: [] } ]) {
    const f = await fixture(t); const p = await f.create({ executor: async () => result });
    await p.advance(); assert.equal(p.snapshot().stages[0].status, 'FAILED');
  }
});

test('output path escape and symlink ancestors are rejected', async t => {
  const f = await fixture(t);
  const p = await f.create({ executor: async (s, c) => {
    const out = f.good(s, c); out.artifacts[0].path = join(f.root, 'escaped.md'); return out;
  } });
  await p.advance(); assert.equal(p.snapshot().stages[0].status, 'FAILED');
  const alias = join(f.workspace, 'alias'); await symlink(f.template, alias);
  await assert.rejects(f.create({ inputs: { ...f.inputs, projectPath: join(alias, 'site') } }), /symlink/i);
});

test('template-source and project/workspace overlap are unsafe', async t => {
  const f = await fixture(t);
  await assert.rejects(f.create({ inputs: { ...f.inputs, projectPath: f.template } }), /workspace|protected/i);
  await assert.rejects(f.create({ inputs: { ...f.inputs, projectPath: f.workspace } }), /overlap|workspace/i);
});

test('concurrent instances invoke stage once and reject stale operations', async t => {
  const f = await fixture(t);
  let release; const pending = new Promise(r => { release = r; });
  const p = await f.create({ executor: async (s, c) => { await pending; return f.good(s, c); } });
  const second = await f.create({ runId: p.snapshot().runId, resume: true });
  const running = p.advance();
  await assert.rejects(p.advance(), /busy/i);
  // Wait for the durable invocation marker, without relying on a wall-clock delay.
  for (let i = 0; i < 1000; i++) {
    const disk = JSON.parse(await readFile(p.manifestPath, 'utf8'));
    if (disk.stages[0].status === 'IN_PROGRESS') break;
    await new Promise(r => setImmediate(r));
  }
  await assert.rejects(second.advance(), /busy|stale/i);
  release(); await running;
  await assert.rejects(second.advance(), /stale/i);
});

test('changed upstream artifact blocks subsequent stage', async t => {
  const f = await fixture(t); const p = await f.create(); await p.advance();
  await writeFile(p.snapshot().stages[0].artifacts[0].path, 'tampered');
  await p.advance(); assert.equal(p.snapshot().stages[1].status, 'BLOCKED');
});

test('canonical-required content waits for confirmed origin', async t => {
  const f = await fixture(t, { canonicalRequired: true });
  const p = await f.create(); await advance(p, 4);
  assert.equal(p.snapshot().stages[3].status, 'WAITING_FOR_USER');
  await p.updateUserInputs({ canonicalOrigin: 'https://example.test' });
  await p.advance(); assert.equal(p.snapshot().stages[3].status, 'PASSED');
});

test('prelaunch no-go cannot enter deployment planning', async t => {
  const f = await fixture(t);
  const p = await f.create({ executor: async (s, c) => {
    const out = f.good(s, c);
    if (s === api.STAGES[5]) out.artifacts.find(a => a.kind === 'PRELAUNCH_ACCEPTANCE.json').content =
      JSON.stringify({ disposition: '暂不建议上线', domain: f.inputs.domain, siteRevision: f.inputs.siteRevision });
    return out;
  } });
  await advance(p, 7); assert.equal(p.snapshot().stages[5].status, 'BLOCKED');
  assert.equal(p.snapshot().stages[6].status, 'NOT_STARTED');
});

test('explicit retry retains attempt history and can resume partial work', async t => {
  const f = await fixture(t); let first = true;
  const p = await f.create({ executor: async (s, c) => {
    const out = f.good(s, c); if (first) { first = false; out.status = 'PARTIAL'; } return out;
  } });
  await p.advance(); await p.updateUserInputs({}, { retry: true }); await p.advance();
  assert.equal(p.snapshot().stages[0].status, 'PASSED');
  assert.equal(p.snapshot().stages[0].checkpoint.attempt, 2);
});

test('later input updates do not repeat a pending deployment plan', async t => {
  const f = await fixture(t, { adsEnabled: true });
  const p = await f.create(); await advance(p, 7);
  await p.updateUserInputs({ adCode: '<script>/* supplied */</script>' });
  await p.advance();
  await p.updateUserInputs({ adCode: '<script>/* supplied */</script>' });
  await p.advance();
  assert.equal(f.calls.length, 7);
  assert.equal(p.snapshot().stages[6].status, 'WAITING_FOR_USER');
});

test('unreadable inventory produces a persisted BLOCKED run', async t => {
  const f = await fixture(t);
  const p = await f.create({ inventoryPath: join(f.root, 'missing.json') });
  await p.advance();
  assert.equal(p.snapshot().stages[0].status, 'BLOCKED');
  assert.equal(f.calls.length, 0);
  assert.match((await readFile(p.manifestPath, 'utf8')), /ENOENT/);
});

test('empty and non-Markdown keyword files cannot execute keyword stage', async t => {
  for (const filename of ['empty.md', 'keywords.txt']) {
    const f = await fixture(t); const path = join(f.root, filename);
    await writeFile(path, filename === 'empty.md' ? '' : 'keyword');
    const p = await f.create({ inputs: { ...f.inputs, rawKeywordsFile: path } });
    await advance(p, 2);
    assert.equal(p.snapshot().stages[1].status, 'WAITING_FOR_USER');
    assert.equal(f.calls.length, 1);
  }
});

test('inventory metadata drift is rejected even with unchanged source files', async t => {
  const f = await fixture(t); const p = await f.create(); await p.advance();
  const inventory = JSON.parse(await readFile(f.options.inventoryPath, 'utf8'));
  inventory.generatedAt = 'changed'; await writeFile(f.options.inventoryPath, JSON.stringify(inventory));
  await p.advance(); assert.equal(p.snapshot().stages[1].status, 'BLOCKED');
});

test('nonempty template target blocks without modifying its contents', async t => {
  const f = await fixture(t); await mkdir(f.inputs.projectPath);
  await writeFile(join(f.inputs.projectPath, 'keep.txt'), 'user content');
  const p = await f.create(); await advance(p, 3);
  assert.equal(p.snapshot().stages[2].status, 'BLOCKED');
  assert.equal(await readFile(join(f.inputs.projectPath, 'keep.txt'), 'utf8'), 'user content');
});

test('artifact symlink targets and executor exceptions fail closed', async t => {
  const f = await fixture(t);
  const p = await f.create({ executor: async (s, c) => {
    await symlink(f.template, join(c.outputDirectory, 'alias'));
    const out = f.good(s, c); out.artifacts[0].path = join(c.outputDirectory, 'alias', 'report.md'); return out;
  } });
  await p.advance(); assert.equal(p.snapshot().stages[0].status, 'FAILED');
  assert.deepEqual(await readdir(f.template), []);
  const p2 = await f.create({ executor: async () => { throw new Error('token=PRIVATE_TEST_VALUE'); } });
  await p2.advance(); assert.equal(p2.snapshot().stages[0].status, 'FAILED');
  assert.equal((await readFile(p2.manifestPath, 'utf8')).includes('PRIVATE_TEST_VALUE'), false);
});

test('plan approval rejects mismatched digest and changed keyword input', async t => {
  const f = await fixture(t); const p = await f.create(); await advance(p, 7);
  await assert.rejects(p.updateUserInputs({ deploymentPlanApproval: { approved: true, digest: 'wrong' } }), /digest/);
  await writeFile(f.inputs.rawKeywordsFile, 'changed keywords');
  await assert.rejects(p.updateUserInputs({ deploymentPlanApproval: {
    approved: true, digest: p.snapshot().stages[6].checkpoint.planDigest,
  } }), /keywords/i);
});

test('executor WAITING persists across resume until user updates inputs', async t => {
  const f = await fixture(t); let calls = 0;
  const executor = async (s, c) => {
    calls++; return calls === 1 ? { status: 'WAITING_FOR_USER', artifacts: [], evidence: ['Need domain'], missing_inputs: ['domain'] } : f.good(s, c);
  };
  const p = await f.create({ executor }); await p.advance();
  const restored = await f.create({ executor, inputs: {}, runId: p.snapshot().runId, resume: true });
  await restored.advance(); assert.equal(calls, 1);
  await restored.updateUserInputs({ domain: 'example.test' }); await restored.advance();
  assert.equal(calls, 2); assert.equal(restored.snapshot().stages[0].status, 'PASSED');
});

test('revision updates invalidate passed UI and downstream checkpoints', async t => {
  const f = await fixture(t); const p = await f.create(); await advance(p, 7);
  await p.updateUserInputs({ siteRevision: 'reviewed-tree-2' });
  assert.equal(p.snapshot().stages[3].status, 'PASSED');
  assert.deepEqual(p.snapshot().stages.slice(4, 7).map(s => s.status), ['NOT_STARTED', 'NOT_STARTED', 'NOT_STARTED']);
});

test('interrupted checkpoint is blocked rather than automatically replayed', async t => {
  const f = await fixture(t); const p = await f.create();
  const disk = p.snapshot(); disk.stages[0].status = 'IN_PROGRESS'; disk.stages[0].checkpoint.attempt = 1;
  await writeFile(p.manifestPath, JSON.stringify(disk));
  const resumed = await f.create({ runId: disk.runId, resume: true }); await resumed.advance();
  assert.equal(resumed.snapshot().stages[0].status, 'BLOCKED'); assert.equal(f.calls.length, 0);
});

test('site file changes after UI audit invalidate downstream execution', async t => {
  const f = await fixture(t); const p = await f.create(); await advance(p, 5);
  await mkdir(f.inputs.projectPath); await writeFile(join(f.inputs.projectPath, 'index.html'), 'changed site');
  await p.advance();
  assert.equal(p.snapshot().stages[5].status, 'BLOCKED');
  assert.equal(f.calls.length, 5);
});

test('input invalidation resets failed downstream checkpoints without corrupting resume', async t => {
  const f = await fixture(t);
  const p = await f.create({ executor: async (s, c) => s === api.STAGES[5]
    ? { ...f.good(s, c), status: 'FAILED' } : f.good(s, c) });
  await advance(p, 6);
  await p.updateUserInputs({ siteRevision: 'revision-2' });
  const restored = await f.create({ runId: p.snapshot().runId, resume: true, inputs: {} });
  assert.deepEqual(restored.snapshot().stages.slice(4, 7).map(s => s.status), ['NOT_STARTED', 'NOT_STARTED', 'NOT_STARTED']);
});

test('same keyword path with new bytes invalidates keyword stage and downstream', async t => {
  const f = await fixture(t); const p = await f.create(); await advance(p, 3);
  await writeFile(f.inputs.rawKeywordsFile, '# Revised user keywords');
  await p.updateUserInputs({ rawKeywordsFile: f.inputs.rawKeywordsFile }, { retry: true });
  assert.equal(p.snapshot().stages[0].status, 'PASSED');
  assert.equal(p.snapshot().stages[1].status, 'NOT_STARTED');
});

test('READY checkpoint resumes without invalid READY-to-READY transition', async t => {
  const f = await fixture(t); const p = await f.create();
  const disk = p.snapshot(); disk.stages[0].status = 'READY';
  await writeFile(p.manifestPath, JSON.stringify(disk));
  const restored = await f.create({ runId: disk.runId, resume: true });
  await restored.advance();
  assert.equal(restored.snapshot().stages[0].status, 'PASSED');
});

test('UI optimization approval is bound to run, stage, revision and explicit files', async t => {
  const f = await fixture(t, { uiMode: 'optimize' }); const p = await f.create();
  await advance(p, 5);
  const valid = { approved: true, projectPath: f.inputs.projectPath, scope: 'spacing', runId: p.snapshot().runId,
    stage: 4, siteRevision: f.inputs.siteRevision, files: ['app/page.tsx'] };
  for (const wrong of [{ runId: 'another' }, { stage: 6 }, { siteRevision: 'stale' }, { files: ['../../outside'] }]) {
    await p.updateUserInputs({ uiApproval: { ...valid, ...wrong } }); await p.advance();
    assert.equal(p.snapshot().stages[4].status, 'WAITING_FOR_USER');
    assert.equal(f.calls.length, 4);
  }
});

test('M3 manual favicon handoff uses existing WAITING_FOR_USER and resumes only on explicit retry',async t=>{
 const f=await fixture(t);
 let ready=false,calls=0;
 const p=await f.create({executor:async(skill,ctx)=>{
   calls++;
   if(!ready)return {status:'WAITING_FOR_USER',evidence:['M3_AWAITING_USER_ATTESTATION'],
      missing_inputs:['faviconManualApproval'],artifacts:[]};
   return f.good(skill,ctx);
 }});
 await p.advance();
 assert.equal(p.snapshot().stages[0].status,'WAITING_FOR_USER');
 assert.deepEqual(p.snapshot().stages[0].missing_inputs,['faviconManualApproval']);
 assert.equal(calls,1);
 ready=true;
 await p.advance();
 assert.equal(p.snapshot().stages[0].status,'WAITING_FOR_USER');
 assert.equal(calls,1,'pipeline never resumes just because files appeared');
 await p.updateUserInputs({}, {retry:true});
 assert.equal(p.snapshot().stages[0].status,'NOT_STARTED');
 await p.advance();
 assert.equal(p.snapshot().stages[0].status,'PASSED');
 assert.equal(calls,2);
 assert.ok(p.snapshot().stages[0].history.some(e=>e.to==='WAITING_FOR_USER'));
});
