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
  await p.updateUserInputs({ uiApproval: { approved: true, projectPath: f.inputs.projectPath, scope: 'spacing only' } });
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
  assert.equal(f.calls[6].context.mode, 'plan-only');
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
