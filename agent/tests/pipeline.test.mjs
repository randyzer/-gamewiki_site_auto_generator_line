import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink, readdir, chmod, stat } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createSkillExecutor } from '../src/skill-executor.mjs';
import { createStage4ReadinessGate } from '../src/stage4-readiness.mjs';
import { snapshotSiteEvidence } from '../src/site-evidence.mjs';
import { captureStoppedKeywordAttempt } from '../src/keyword-recovery.mjs';
import { createKeywordExecutionReceipt } from '../src/keyword-execution-receipt.mjs';
import { researchHandoffApprovalTemplate } from '../src/research-handoff.mjs';
import { prepareResearchHandoff } from '../src/handoff.mjs';
import { inspectResearchHandoffCheckpointRecovery,
  researchHandoffCheckpointRecoveryIntent } from '../src/research-handoff-recovery.mjs';
import { stage4SiteDigest } from '../src/stage4-site-transaction.mjs';

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
    if (name === api.STAGES[3]) {
      const skillRoot = join(source, name);
      const path = join(skillRoot, 'SKILL.md');
      const preflightPath = join(skillRoot, 'scripts/preflight.py');
      await mkdir(join(skillRoot, 'scripts'), { recursive: true });
      await Promise.all([
        writeFile(path, name),
        writeFile(preflightPath, 'locked stage 4 preflight'),
      ]);
      skills.push({ name, source: path, sha256: hash(name), available: true,
        files: [
          { path, sha256: hash(name) },
          { path: preflightPath, sha256: hash('locked stage 4 preflight') },
        ] });
      continue;
    }
    const path = join(source, `${name}.md`);
    await writeFile(path, name);
    skills.push({ name, source: path, sha256: hash(name), available: true,
      files: [{ path, sha256: hash(name) }] });
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
  const stagePreflight = async (skill, context) => skill === api.STAGES[3]
    ? { status: 'READY', binding: { kind: 'OFFLINE_STAGE4_READINESS_BINDING_V1',
      runId: context.runId, stage: skill, attempt: context.checkpoint.attempt } }
    : { status: 'NOT_APPLICABLE' };
  const options = { workspace, inventoryPath, templateRoots: [template], inputs,
    stage4ReadinessCapability: api.OFFLINE_STAGE4_READINESS_CAPABILITY, stagePreflight,
    installSiteDependencies: async () => ({ exitCode: 0, synthetic: true }),
    executor: async (skill, context) => { calls.push({ skill, context }); return good(skill, context); } };
  return { root, source, workspace, template, inputs, calls, options, good,
    create: extra => api.createPipeline({ ...options, ...extra }) };
}
async function advance(pipeline, count) {
  for (let i = 0; i < count; i++) await pipeline.advance();
  return pipeline.snapshot();
}

async function writeFixtureRecoveryLineage(nativeDirectory, { skillSyntax = false } = {}) {
  await writeFile(join(nativeDirectory, 'RAW_LINEAGE.json'), JSON.stringify({ pendingIds: [], rows: [
    { id: '1', raw: 'example walkthrough', final: 'Example walkthrough' },
  ] }));
  await writeFile(join(nativeDirectory, 'keywords.json'), JSON.stringify({ categories: [
    { category: 'Guide', keywords: ['Example walkthrough'] },
  ] }));
  await writeFile(join(nativeDirectory, 'Example walkthrough素材.md'),
    skillSyntax
      ? '- 关键词: Example walkthrough\n- 状态: PARTIAL\n### 待确认\n- Missing official fact\n'
      : '- 关键词: Example walkthrough\n- 状态: PARTIAL\n- 缺口: Missing official fact\n');
}

async function directSiteFixture(t) {
  const external = await mkdtemp('/private/tmp/stage4-direct-pipeline-');
  t.after(() => rm(external, { recursive: true, force: true }));
  const siteDirectory = join(external, 'site'), researchDirectory = join(siteDirectory, 'backgroundinformation');
  await mkdir(researchDirectory, { recursive: true });
  const f = await fixture(t, { paths: { siteDirectory, researchDirectory,
    rawKeywordsFile: join(external, 'keywords.md') }, rawKeywordsFile: join(external, 'keywords.md'),
    projectPath: siteDirectory });
  await writeFile(f.inputs.rawKeywordsFile, '# User keywords\n- Example walkthrough\n');
  const order = [];
  const executor = async (skill, context) => {
    if (skill === api.STAGES[3]) {
      order.push('worker');
      assert.equal(context.inputs.projectPath, siteDirectory, 'readiness context keeps the real target');
      assert.equal(context.stage4Transaction.targetPath, siteDirectory);
      await writeFile(join(context.stage4Transaction.candidatePath, 'worker-change.txt'), 'validated candidate\n');
      const result = f.good(skill, { ...context,
        inputs: { ...context.inputs, projectPath: context.stage4Transaction.candidatePath } });
      return result;
    }
    return f.good(skill, context);
  };
  const installSiteDependencies = async projectPath => {
    order.push('install'); assert.notEqual(projectPath, siteDirectory);
    assert.ok(projectPath.includes('.site.agent-stage4-')); return { exitCode: 0, projectPath };
  };
  const validateStage4 = async ({ candidatePath, nativeDirectory }) => {
    order.push('host-validate');
    const reportPath = join(nativeDirectory, 'STAGE4_HOST_VALIDATION.json');
    await mkdir(nativeDirectory, { recursive: true }); await writeFile(reportPath, '{"status":"PASSED"}\n');
    return { status: 'PASSED', reportPath, reportSha256: hash('{"status":"PASSED"}\n'),
      candidateDigest: await stage4SiteDigest(candidatePath), commands: ['build'] };
  };
  return { ...f, external, siteDirectory, researchDirectory, order, executor,
    installSiteDependencies, validateStage4 };
}

test('direct-site Stage 4 validates an isolated candidate and promotes only after Host PASS', async t => {
  const f = await directSiteFixture(t);
  const p = await f.create({ executor: f.executor, installSiteDependencies: f.installSiteDependencies,
    validateStage4: f.validateStage4 });
  const state = await advance(p, 4);
  assert.equal(state.stages[3].status, 'PASSED', JSON.stringify(state.stages[3].evidence));
  assert.deepEqual(f.order, ['install', 'worker', 'host-validate']);
  assert.equal(await readFile(join(f.siteDirectory, 'worker-change.txt'), 'utf8'), 'validated candidate\n');
  assert.equal(state.stages[3].checkpoint.stage4Transaction.kind, 'STAGE4_SITE_TRANSACTION_V1');
  const journal = JSON.parse(await readFile(state.stages[3].checkpoint.stage4Transaction.journalPath, 'utf8'));
  assert.equal(journal.state, 'FINALIZED');
  assert.ok(state.stages[3].artifacts.some(item => item.kind === 'STAGE4_HOST_VALIDATION.json'));
});

test('direct-site Stage 4 accepts a Host-validated provisional Worker handoff', async t => {
  const f = await directSiteFixture(t);
  const executor = async (skill, context) => {
    if (skill !== api.STAGES[3]) return f.good(skill, context);
    await writeFile(join(context.stage4Transaction.candidatePath, 'worker-change.txt'), 'validated candidate\n');
    const result = f.good(skill, { ...context,
      inputs: { ...context.inputs, projectPath: context.stage4Transaction.candidatePath } });
    return { ...result, status: 'PARTIAL',
      stage4WorkerArtifactsValidated: true,
      evidence: ['Worker-owned gates passed; Host technical validation is pending.'] };
  };
  const p = await f.create({ executor, installSiteDependencies: f.installSiteDependencies,
    validateStage4: f.validateStage4 });

  const state = await advance(p, 4);

  assert.equal(state.stages[3].status, 'PASSED', JSON.stringify(state.stages[3].evidence));
  assert.deepEqual(f.order, ['install', 'host-validate']);
  assert.equal(await readFile(join(f.siteDirectory, 'worker-change.txt'), 'utf8'), 'validated candidate\n');
  assert.ok(state.stages[3].artifacts.some(item => item.kind === 'STAGE4_HOST_VALIDATION.json'));
});

test('direct-site Stage 4 never upgrades an ordinary PARTIAL result', async t => {
  const f = await directSiteFixture(t); let hostCalls = 0;
  const executor = async (skill, context) => {
    if (skill !== api.STAGES[3]) return f.good(skill, context);
    await writeFile(join(context.stage4Transaction.candidatePath, 'uncommitted.txt'), 'must disappear\n');
    const result = f.good(skill, { ...context,
      inputs: { ...context.inputs, projectPath: context.stage4Transaction.candidatePath } });
    return { ...result, status: 'PARTIAL', artifacts: [],
      evidence: ['Legal operator identity is still unresolved.'] };
  };
  const p = await f.create({ executor, installSiteDependencies: f.installSiteDependencies,
    validateStage4: async input => { hostCalls++; return f.validateStage4(input); } });
  await advance(p, 3);
  const before = await stage4SiteDigest(f.siteDirectory);

  const state = await advance(p, 1);

  assert.equal(state.stages[3].status, 'PARTIAL');
  assert.equal(hostCalls, 0);
  assert.equal(await stage4SiteDigest(f.siteDirectory), before);
  await assert.rejects(readFile(join(f.siteDirectory, 'uncommitted.txt')));
});

test('direct-site Stage 4 provisional handoff rolls back when Host validation fails', async t => {
  const f = await directSiteFixture(t);
  const executor = async (skill, context) => {
    if (skill !== api.STAGES[3]) return f.good(skill, context);
    await writeFile(join(context.stage4Transaction.candidatePath, 'uncommitted.txt'), 'must disappear\n');
    const result = f.good(skill, { ...context,
      inputs: { ...context.inputs, projectPath: context.stage4Transaction.candidatePath } });
    return { ...result, status: 'PARTIAL', stage4WorkerArtifactsValidated: true,
      evidence: ['Worker-owned gates passed; Host technical validation is pending.'] };
  };
  const p = await f.create({ executor, installSiteDependencies: f.installSiteDependencies,
    validateStage4: async () => { throw Error('synthetic Host build failure'); } });
  await advance(p, 3);
  const before = await stage4SiteDigest(f.siteDirectory);

  const state = await advance(p, 1);

  assert.equal(state.stages[3].status, 'FAILED');
  assert.match(state.stages[3].diagnostic.reason, /synthetic Host build failure/);
  assert.equal(await stage4SiteDigest(f.siteDirectory), before);
  await assert.rejects(readFile(join(f.siteDirectory, 'uncommitted.txt')));
});

test('direct-site Stage 4 rebinds nested research to the candidate before handoff', async t => {
  const f = await directSiteFixture(t);
  await writeFile(join(f.researchDirectory, '首页调研信息.md'), '');
  let handoffContext;
  const p = await f.create({ executor: f.executor, installSiteDependencies: f.installSiteDependencies,
    validateStage4: f.validateStage4,
    prepareStage4Handoff: async context => {
      handoffContext = context;
      return prepareResearchHandoff(context);
    } });
  const state = await advance(p, 4);
  assert.equal(state.stages[3].status, 'PASSED', JSON.stringify(state.stages[3].evidence));
  assert.equal(handoffContext.inputs.paths.researchDirectory,
    join(handoffContext.inputs.projectPath, 'backgroundinformation'));
  assert.notEqual(handoffContext.inputs.paths.researchDirectory, f.researchDirectory);
  assert.equal((await stat(join(f.researchDirectory, '首页调研信息.md'))).size, 0);
});

test('direct-site Stage 4 preserves readiness authority while deriving candidate handoff', async t => {
  const f = await directSiteFixture(t);
  const authorityHandoff = { reference: { kind: 'authority-reference' },
    manifest: { kind: 'authority-manifest' } };
  const authorityHandoffJson = JSON.stringify(authorityHandoff);
  const candidateHandoff = { reference: { kind: 'candidate-reference' },
    manifest: { kind: 'candidate-manifest' } };
  const stagePreflight = async (skill, context) => {
    if (skill !== api.STAGES[3]) return { status: 'NOT_APPLICABLE' };
    const binding = {
      path: join(context.outputDirectory, 'host-readiness/STAGE4_READINESS_ATTESTATION.json'),
      digest: 'a'.repeat(64), fileSha256: 'b'.repeat(64),
      attestation: { kind: 'STAGE4_READINESS_ATTESTATION', runId: context.runId,
        stage: skill, attempt: context.checkpoint.attempt, readiness: 'READY' },
      verifyCurrentState: async verificationContext => {
        assert.equal(JSON.stringify(verificationContext.researchHandoff), authorityHandoffJson,
          'readiness must keep verifying the approved authority handoff');
      },
    };
    return { status: 'READY', binding, contextPatch: { researchHandoff: authorityHandoff } };
  };
  const executor = async (skill, context) => {
    if (skill !== api.STAGES[3]) return f.good(skill, context);
    assert.equal(JSON.stringify(context.researchHandoff), authorityHandoffJson);
    assert.deepEqual(context.stage4CandidateResearchHandoff, candidateHandoff);
    await writeFile(join(context.stage4Transaction.candidatePath, 'worker-change.txt'), 'validated candidate\n');
    return f.good(skill, { ...context,
      inputs: { ...context.inputs, projectPath: context.stage4Transaction.candidatePath } });
  };
  const p = await f.create({ stage4ReadinessCapability: undefined, stagePreflight, executor,
    installSiteDependencies: f.installSiteDependencies, validateStage4: f.validateStage4,
    prepareStage4Handoff: async () => candidateHandoff });

  const state = await advance(p, 4);

  assert.equal(state.stages[3].status, 'PASSED', JSON.stringify(state.stages[3].evidence));
});

test('direct-site Stage 4 worker failure discards candidate and preserves the target', async t => {
  const f = await directSiteFixture(t);
  const executor = async (skill, context) => {
    if (skill !== api.STAGES[3]) return f.good(skill, context);
    await writeFile(join(context.stage4Transaction.candidatePath, 'uncommitted.txt'), 'must disappear\n');
    return { status: 'FAILED', artifacts: [], missing_inputs: [], evidence: ['synthetic worker failure'] };
  };
  const p = await f.create({ executor, installSiteDependencies: f.installSiteDependencies,
    validateStage4: async () => assert.fail('Host validation must not run') });
  await advance(p, 3);
  const before = await stage4SiteDigest(f.siteDirectory);
  const state = await advance(p, 1);
  assert.equal(state.stages[3].status, 'FAILED');
  assert.equal(await stage4SiteDigest(f.siteDirectory), before);
  await assert.rejects(readFile(join(f.siteDirectory, 'uncommitted.txt')));
});

test('Pipeline records audit-only Git capability failure as BLOCKED after independent host checks', async t => {
  for (const index of [4, 5]) {
    const f = await fixture(t);
    let checked = 0;
    const collect = async context => {
      checked++;
      const area = join(context.nativeDirectory, 'independent-host');
      await mkdir(area); await writeFile(join(area, 'evidence.txt'), 'SYNTHETIC independent evidence');
      return snapshotSiteEvidence(area);
    };
    const execute = createSkillExecutor({ workerGit: join(f.root, 'missing-git'), researchPython: process.execPath,
      previewSite: async () => ({ url: 'http://127.0.0.1:1', stop: async () => {} }),
      auditSite: collect, prelaunchSite: collect, run: async () => assert.fail('must not launch worker') });
    const p = await f.create({ executor: (skill, context) => skill === api.STAGES[index]
      ? execute(skill, context) : f.good(skill, context) });
    const state = await advance(p, index + 1);
    const stage = state.stages[index];
    assert.equal(checked, 1);
    assert.equal(stage.status, 'BLOCKED', JSON.stringify(stage.evidence));
    assert.match(stage.evidence.join('\n'), /GIT_STATE_UNKNOWN/);
    assert.equal(stage.diagnostic.operation, 'worker-reported-failure');
    assert.deepEqual(stage.missing_inputs, []);
  }
});

test('host installs once after template passes, before content; retry preserves installation manifest', async t => {
  const f = await fixture(t), order = [];
  const p = await f.create({ installSiteDependencies: async (project, options) => {
    order.push('install'); assert.equal(project, f.inputs.projectPath);
    assert.ok(options.manifestPath.endsWith('site-dependencies.json'));
    return { exitCode: 0, command: ['pnpm', 'install', '--frozen-lockfile'] };
  }, executor: async (skill, context) => {
    order.push(skill);
    if (skill === api.STAGES[3]) return { status: 'WAITING_FOR_USER', evidence: ['fixture'], missing_inputs: ['canonicalOrigin'], artifacts: [] };
    return f.good(skill, context);
  } });
  await advance(p, 4);
  assert.deepEqual(order.slice(-3), [api.STAGES[2], 'install', api.STAGES[3]]);
  assert.equal(p.snapshot().stages[3].checkpoint.dependencies.exitCode, 0);
  await p.updateUserInputs({ canonicalOrigin: 'https://example.test' }, { retry: true });
  await p.advance();
  assert.equal(order.filter(item => item === 'install').length, 1);
});

test('Stage 4 Host readiness runs before dependency installation and Worker dispatch', async t => {
  const f = await fixture(t), order = [];
  let binding;
  const p = await f.create({
    stagePreflight: async (skill, context) => {
      if (skill !== api.STAGES[3]) return { status: 'NOT_APPLICABLE' };
      order.push('readiness');
      assert.equal(context.inputs.projectPath, f.inputs.projectPath);
      binding = { kind: 'OFFLINE_STAGE4_READINESS_BINDING_V1', runId: context.runId,
        stage: skill, attempt: context.checkpoint.attempt };
      return { status: 'READY', binding, contextPatch: { researchHandoff: { manifest: 'host-owned' } } };
    },
    installSiteDependencies: async () => { order.push('install'); return { exitCode: 0 }; },
    executor: async (skill, context) => {
      order.push(skill);
      if (skill === api.STAGES[3]) {
        assert.deepEqual(context.stage4Readiness, binding);
        assert.deepEqual(context.researchHandoff, { manifest: 'host-owned' });
      }
      return f.good(skill, context);
    },
  });

  await advance(p, 4);

  assert.deepEqual(order.slice(-4), [api.STAGES[2], 'readiness', 'install', api.STAGES[3]]);
  assert.match(p.snapshot().stages[3].checkpoint.readinessDigest, /^[a-f0-9]{64}$/);
});

test('production pipeline passes verified locked Skill file descriptors to Stage 4 readiness', async t => {
  const f = await fixture(t);
  let descriptor;
  const p = await f.create({
    stage4ReadinessCapability: undefined,
    stagePreflight: async (skill, context) => {
      if (skill !== api.STAGES[3]) return { status: 'NOT_APPLICABLE' };
      descriptor = context.skillLock.files?.find(file => file.path.endsWith('/scripts/preflight.py'));
      return { status: 'BLOCKED', evidence: ['fixture readiness stop'], missing_inputs: [] };
    },
  });

  await advance(p, 4);

  assert.deepEqual(descriptor, {
    path: join(f.source, api.STAGES[3], 'scripts/preflight.py'),
    sha256: hash('locked stage 4 preflight'),
  });
  const manifest = JSON.parse(await readFile(join(f.workspace, 'runs', p.snapshot().runId,
    'manifest.json'), 'utf8'));
  assert.equal(Object.hasOwn(manifest.lock.skills[3], 'files'), false,
    'runtime descriptors must not rewrite the compatible persisted lock');
});

test('production Stage 4 uses one runtime context for readiness creation and verification', async t => {
  const f = await fixture(t);
  let readinessNativeDirectory, verificationNativeDirectory;
  const p = await f.create({
    stage4ReadinessCapability: undefined,
    stagePreflight: async (skill, context) => {
      if (skill !== api.STAGES[3]) return { status: 'NOT_APPLICABLE' };
      readinessNativeDirectory = context.nativeDirectory;
      const binding = {
        path: join(context.outputDirectory, 'host-readiness', 'STAGE4_READINESS_ATTESTATION.json'),
        digest: 'a'.repeat(64),
        fileSha256: 'b'.repeat(64),
        attestation: { kind: 'STAGE4_READINESS_ATTESTATION', runId: context.runId,
          stage: skill, attempt: context.checkpoint.attempt, readiness: 'READY' },
        verifyCurrentState: async verificationContext => {
          verificationNativeDirectory = verificationContext.nativeDirectory;
          assert.equal(verificationContext.runDirectory, join(f.workspace, 'runs', context.runId));
        },
      };
      return { status: 'READY', binding };
    },
  });

  const state = await advance(p, 4);

  assert.equal(state.stages[3].status, 'PASSED');
  assert.equal(readinessNativeDirectory, verificationNativeDirectory);
  assert.equal(readinessNativeDirectory,
    join(f.workspace, 'runs', state.runId, 'artifacts', '3', '1', 'native'));
});

test('production Stage 4 completes the real readiness gate before Worker dispatch', async t => {
  const f = await fixture(t);
  await mkdir(f.inputs.projectPath, { recursive: true });
  await writeFile(join(f.template, 'package.json'), '{"name":"stage4-template"}');
  execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: f.template });
  execFileSync('git', ['add', '.'], { cwd: f.template });
  execFileSync('git', ['-c', 'user.name=test', '-c', 'user.email=test@example.invalid',
    'commit', '-q', '-m', 'fixture'], { cwd: f.template });
  const templateCommit = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: f.template, encoding: 'utf8',
  }).trim();
  let workerCalls = 0;
  const stage4Run = async (_command, args) => {
    const output = args[args.indexOf('--output') + 1];
    await writeFile(output, JSON.stringify({
      schema_version: 1,
      game: f.inputs.gameIdentity,
      workspace: f.inputs.projectPath,
      page_roots: [f.inputs.projectPath],
      resolved_inputs: {
        background_dir: null,
        homepage_research: null,
        icon_zip: null,
        keywords: null,
        materials_dir: null,
        template_selection_report: null,
        template_copy_manifest: null,
      },
      keyword_count: 0,
      materials: [],
      icon_zip: { members: [], missing: [] },
      git: { is_repo: false, root: null, changes: [] },
      confirmation_required: false,
      errors: [],
      warnings: [],
      ready: true,
    }));
    return { exitCode: 0 };
  };
  const gate = createStage4ReadinessGate({
    run: stage4Run,
    pythonCommand: process.execPath,
    gitCommand: '/usr/bin/git',
    clock: () => 1_700_000_000_000,
  });
  const p = await f.create({
    templateSnapshot: {
      checkout: f.template,
      commit: templateCommit,
      templateRoot: f.template,
    },
    stage4ReadinessCapability: undefined,
    stagePreflight: gate,
    executor: async (skill, context) => {
      if (skill === api.STAGES[3]) {
        workerCalls++;
        assert.equal(context.stage4Readiness.attestation.nativeDirectory, context.nativeDirectory);
      }
      return f.good(skill, context);
    },
  });
  const state = await advance(p, 4);
  await chmod(join(f.workspace, 'runs', state.runId, 'artifacts', '3', '1',
    'host-readiness'), 0o700);

  assert.equal(state.stages[3].status, 'PASSED', JSON.stringify(state.stages[3]));
  assert.equal(workerCalls, 1);
  assert.match(state.stages[3].checkpoint.readinessDigest, /^[a-f0-9]{64}$/);
});

test('executor rejects conflicting runtime directories before Stage 4 readiness work', async t => {
  const f = await fixture(t);
  let stage4RunCalls = 0;
  const executor = createSkillExecutor({
    researchPython: process.execPath,
    stage4Run: async () => { stage4RunCalls++; },
  });
  await assert.rejects(executor.stagePreflight(api.STAGES[3], {
    runId: 'runtime-context-mismatch',
    runDirectory: join(f.root, 'wrong-run'),
    outputDirectory: join(f.workspace, 'runs/runtime-context-mismatch/artifacts/3/1'),
  }), /STAGE_RUNTIME_CONTEXT_MISMATCH/);
  assert.equal(stage4RunCalls, 0);
});

test('production Stage 4 fails closed without a Host readiness provider', async t => {
  const f = await fixture(t); let installed = 0, workers = 0;
  const p = await f.create({ stage4ReadinessCapability: undefined, stagePreflight: undefined,
    installSiteDependencies: async () => { installed++; return { exitCode: 0 }; },
    executor: async (skill, context) => { if (skill === api.STAGES[3]) workers++; return f.good(skill, context); } });
  const state = await advance(p, 4);
  assert.equal(state.stages[3].status, 'BLOCKED');
  assert.match(state.stages[3].evidence.join('\n'), /HOST_STAGE4_READINESS_PROVIDER_REQUIRED/);
  assert.equal(installed, 0);
  assert.equal(workers, 0);
});

test('a serialized OFFLINE_TEST configuration value cannot bypass the production Stage 4 gate', async t => {
  const f = await fixture(t); let workers = 0;
  const p = await f.create({ stage4ReadinessCapability: undefined, stage4ReadinessMode: 'OFFLINE_TEST',
    stagePreflight: undefined,
    executor: async (skill, context) => { if (skill === api.STAGES[3]) workers++; return f.good(skill, context); } });
  const state = await advance(p, 4);
  assert.equal(state.stages[3].status, 'BLOCKED');
  assert.match(state.stages[3].evidence.join('\n'), /HOST_STAGE4_READINESS_PROVIDER_REQUIRED/);
  assert.equal(workers, 0);
});

test('a JSON-shaped imitation cannot recreate the offline Stage 4 capability', async t => {
  const f = await fixture(t);
  await assert.rejects(f.create({ stage4ReadinessCapability: {
    kind: 'OFFLINE_STAGE4_READINESS_CAPABILITY' } }), /Invalid Stage 4 readiness capability/);
});

test('production Stage 4 rejects NOT_APPLICABLE and READY without an authoritative binding', async t => {
  for (const readiness of [{ status: 'NOT_APPLICABLE' }, { status: 'READY' }]) {
    const f = await fixture(t); let workers = 0;
    const p = await f.create({ stage4ReadinessCapability: undefined,
      stagePreflight: async skill => skill === api.STAGES[3] ? readiness : { status: 'NOT_APPLICABLE' },
      executor: async (skill, context) => { if (skill === api.STAGES[3]) workers++; return f.good(skill, context); } });
    const state = await advance(p, 4);
    assert.equal(state.stages[3].status, 'BLOCKED');
    assert.equal(workers, 0);
  }
});

test('Stage 4 blocked Host readiness skips dependency installation and Worker dispatch', async t => {
  const f = await fixture(t); let installed = 0, contentWorkers = 0;
  const p = await f.create({
    stagePreflight: async skill => skill === api.STAGES[3]
      ? { status: 'BLOCKED', evidence: ['HOST_STAGE4_READINESS_BLOCKED'], missing_inputs: [] }
      : { status: 'NOT_APPLICABLE' },
    installSiteDependencies: async () => { installed++; return { exitCode: 0 }; },
    executor: async (skill, context) => {
      if (skill === api.STAGES[3]) contentWorkers++;
      return f.good(skill, context);
    },
  });

  const state = await advance(p, 4);

  assert.equal(state.stages[3].status, 'BLOCKED');
  assert.equal(installed, 0);
  assert.equal(contentWorkers, 0);
});

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

test('Stage 2 PARTIAL advances only after exact immutable handoff approval', async t => {
  const f = await fixture(t);
  let templateContext;
  const executor = async (skill, context) => {
    if (skill !== api.STAGES[1]) {
      if (skill === api.STAGES[2]) templateContext = context;
      return f.good(skill, context);
    }
    const native = join(context.outputDirectory, 'native');
    await mkdir(native, { recursive: true });
    await writeFixtureRecoveryLineage(native, { skillSyntax: true });
    const runDirectory = join(f.workspace, 'runs', context.runId);
    const recovery = await (await import('../src/keyword-recovery.mjs')).captureKeywordRecovery({
      ...context, runDirectory, nativeDirectory: native,
    }, { reason: 'WORKER_STOPPED' });
    await writeFile(join(context.outputDirectory, 'keyword-recovery.json'), JSON.stringify(recovery));
    return { status: 'PARTIAL', artifacts: [], evidence: ['incomplete research'], missing_inputs: [] };
  };
  const pipeline = await f.create({ executor });
  await advance(pipeline, 2);
  const state = pipeline.snapshot(), stage = state.stages[1];
  assert.equal(stage.status, 'PARTIAL');
  assert.equal(state.stages[2].status, 'NOT_STARTED');
  assert.equal(stage.checkpoint.researchHandoff.kind, 'RESEARCH_HANDOFF_MANIFEST_V1');
  assert.equal(stage.checkpoint.researchHandoff.approved, false);
  assert.equal(stage.artifacts.length, 0);
  const candidate = JSON.parse(await readFile(stage.checkpoint.researchHandoff.path));
  assert.equal(candidate.materials[0].publicationDisposition, 'DRAFT_ONLY');
  assert.equal(candidate.materials[0].sourceContract.declaredStatus, 'PARTIAL');
  assert.equal(candidate.materials[0].sourceContract.contractStatus, 'VALID');
  assert.equal(candidate.approval, null);

  const resumed = await f.create({ runId: state.runId, resume: true, inputs: {}, executor });
  await resumed.advance();
  assert.equal(resumed.snapshot().stages[2].status, 'NOT_STARTED');
  const approval = researchHandoffApprovalTemplate(stage.checkpoint.researchHandoff, candidate);
  await assert.rejects(resumed.updateUserInputs({ researchHandoffApproval: {
    ...approval, domain: 'other.test',
  } }), /exactly match/);
  await resumed.updateUserInputs({ researchHandoffApproval: approval });
  assert.equal(resumed.snapshot().stages[1].status, 'PARTIAL');
  assert.equal(resumed.snapshot().stages[1].checkpoint.researchHandoff.approved, true);
  await resumed.advance();
  const advanced = resumed.snapshot();
  assert.equal(advanced.stages[2].status, 'PASSED');
  assert.equal(templateContext.researchHandoff.manifest.bindings.pendingRowsSha256,
    candidate.bindings.pendingRowsSha256);
  assert.equal(templateContext.upstream[1].status, 'PARTIAL');
});

test('retry recovers a Stage 2 handoff checkpoint failure without invoking the worker again', async t => {
  const f = await fixture(t);
  const executor = async (skill, context) => {
    if (skill !== api.STAGES[1]) return f.good(skill, context);
    const native = join(context.outputDirectory, 'native');
    await mkdir(native, { recursive: true });
    await writeFixtureRecoveryLineage(native, { skillSyntax: true });
    await writeFile(join(native, 'worker-result.json'), JSON.stringify({
      status: 'PARTIAL', evidence: ['SYNTHETIC incomplete research'], missing_inputs: [], artifacts: [],
    }));
    const recovery = await (await import('../src/keyword-recovery.mjs')).captureKeywordRecovery({
      ...context, runDirectory: join(f.workspace, 'runs', context.runId), nativeDirectory: native,
    }, { reason: 'WORKER_STOPPED' });
    await writeFile(join(context.outputDirectory, 'keyword-recovery.json'), JSON.stringify(recovery));
    return { status: 'PARTIAL', artifacts: [], evidence: ['SYNTHETIC incomplete research'], missing_inputs: [] };
  };
  const pipeline = await f.create({ executor });
  await advance(pipeline, 2);
  const runId = pipeline.snapshot().runId;
  const manifestPath = pipeline.manifestPath;
  const manifest = JSON.parse(await readFile(manifestPath));
  const keywordStage = manifest.stages[1];
  keywordStage.status = 'FAILED';
  delete keywordStage.checkpoint.researchHandoff;
  keywordStage.diagnostic = {
    stage: api.STAGES[1], attempt: 1, operation: 'save-stage-checkpoint', code: 'ERROR',
    reason: 'RESEARCH_HANDOFF_INVALID: material gaps: legacy material', at: new Date().toISOString(),
    recordPath: join(f.workspace, 'runs', runId, 'diagnostics', 'synthetic.json'),
  };
  keywordStage.evidence = ['SYNTHETIC checkpoint save failure'];
  await rm(join(f.workspace, 'runs', runId, 'research-handoffs'), { recursive: true, force: true });
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

  const checkpointRecovery = await inspectResearchHandoffCheckpointRecovery({
    manifest: JSON.parse(await readFile(manifestPath)), runDirectory: join(f.workspace, 'runs', runId), runId,
  });
  const callsBefore = f.calls.length;
  const resumed = await f.create({ runId, resume: true, inputs: {}, executor });
  await resumed.updateUserInputs({}, { retry: true,
    checkpointRecoveryIntent: researchHandoffCheckpointRecoveryIntent(checkpointRecovery) });
  const recovered = resumed.snapshot().stages[1];
  assert.equal(f.calls.length, callsBefore, 'checkpoint recovery must not invoke the worker');
  assert.equal(recovered.status, 'PARTIAL');
  assert.equal(recovered.checkpoint.attempt, 1);
  assert.equal(recovered.checkpoint.researchHandoff.approved, false);
  assert.equal(recovered.diagnostic, undefined);
  assert.match(recovered.evidence.join('\n'), /recovered from attempt 1/i);
  await resumed.advance();
  assert.equal(resumed.snapshot().stages[2].status, 'NOT_STARTED',
    'an unapproved recovered handoff must not advance to Stage 3');
});

test('approved research handoff is invalidated by bound revision changes', async t => {
  const f = await fixture(t);
  const executor = async (skill, context) => {
    if (skill !== api.STAGES[1]) return f.good(skill, context);
    const native = join(context.outputDirectory, 'native');
    await mkdir(native, { recursive: true }); await writeFixtureRecoveryLineage(native);
    const recovery = await (await import('../src/keyword-recovery.mjs')).captureKeywordRecovery({
      ...context, runDirectory: join(f.workspace, 'runs', context.runId), nativeDirectory: native,
    }, { reason: 'WORKER_STOPPED' });
    await writeFile(join(context.outputDirectory, 'keyword-recovery.json'), JSON.stringify(recovery));
    return { status: 'PARTIAL', artifacts: [], evidence: ['incomplete research'], missing_inputs: [] };
  };
  const p = await f.create({ executor }); await advance(p, 2);
  const handoff = p.snapshot().stages[1].checkpoint.researchHandoff;
  const candidate = JSON.parse(await readFile(handoff.path));
  await p.updateUserInputs({ researchHandoffApproval: researchHandoffApprovalTemplate(handoff, candidate) });
  await p.updateUserInputs({ siteRevision: 'reviewed-tree-2' });
  assert.equal(p.snapshot().stages[1].status, 'NOT_STARTED');
  assert.equal(p.snapshot().stages[1].checkpoint.researchHandoff, undefined);
  assert.equal(p.snapshot().inputs.researchHandoffApproval, undefined);
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

for (const generated of ['tsconfig.tsbuildinfo', 'next-env.d.ts', 'app/cache.tsbuildinfo']) {
  test(`generated ${generated} after UI audit does not invalidate prelaunch`, async t => {
    const f = await fixture(t), p = await f.create(); await advance(p, 5);
    await mkdir(join(f.inputs.projectPath, 'app'), { recursive: true });
    await writeFile(join(f.inputs.projectPath, generated), 'generated by build/typecheck');
    await p.advance();
    assert.equal(p.snapshot().stages[5].status, 'PASSED');
  });
}

test('ordinary app source edits after UI audit still block prelaunch', async t => {
  const f = await fixture(t), p = await f.create(); await advance(p, 3);
  await mkdir(join(f.inputs.projectPath, 'app'), { recursive: true });
  await writeFile(join(f.inputs.projectPath, 'app/page.tsx'), 'original source');
  await advance(p, 2);
  await writeFile(join(f.inputs.projectPath, 'app/page.tsx'), 'changed source');
  await p.advance();
  assert.equal(p.snapshot().stages[5].status, 'BLOCKED');
  assert.match(p.snapshot().stages[5].evidence.join(' '), /Project files changed after UI audit/);
  assert.equal(f.calls.length, 5);
});

test('pipeline exposes its project digest for host verification', async t => {
  const f = await fixture(t), p = await f.create(); await advance(p, 5);
  assert.equal(typeof p.projectDigest, 'function');
  assert.equal(await p.projectDigest(), p.snapshot().stages[4].checkpoint.projectDigest);
});

test('pipeline UI to prelaunch passes when prelaunchSite generates typecheck artifacts', async t => {
  const f = await fixture(t); let captures = 0;
  const prelaunch = createSkillExecutor({
    previewSite: async () => ({ url: 'http://127.0.0.1:32111', stop: async () => {} }),
    prelaunchSite: async context => {
      captures++;
      await writeFile(join(context.inputs.projectPath, 'tsconfig.tsbuildinfo'), 'typecheck cache');
      await writeFile(join(context.inputs.projectPath, 'next-env.d.ts'), 'generated declarations');
      const directory = join(context.inputs.projectPath, 'docs/prelaunch', context.runId, 'host-evidence');
      await mkdir(directory, { recursive: true });
      await writeFile(join(directory, 'HOST_EVIDENCE.json'), '{"synthetic":true}');
      return { ...await snapshotSiteEvidence(directory), routes: ['/'], routePublicationViolations: [] };
    },
    validationOptions: { run: async () => ({ exitCode: 0 }) },
    run: async (_command, args, options) => {
      const context = JSON.parse(options.input.split('Task context: ')[1].split('\n')[0]);
      const artifacts = [];
      for (const kind of context.requiredArtifacts) {
        const path = join(context.nativeDirectory, kind);
        const content = kind === 'PRELAUNCH_ACCEPTANCE.json' ? JSON.stringify({
          run_id: context.runId, game: context.inputs.gameIdentity, project_path: context.inputs.projectPath,
          expected_domain: 'https://' + context.inputs.domain, disposition: '可以上线',
          coverage: { routes_expected: 1, routes_checked: 1 }, pages: [{ path: '/' }],
        }) : '# Synthetic prelaunch report';
        await writeFile(path, content); artifacts.push({ kind, path });
      }
      await writeFile(args[args.indexOf('--output-last-message') + 1], JSON.stringify({
        status: 'PASSED', artifacts, evidence: ['Synthetic worker report'], missing_inputs: [],
      }));
    },
  });
  const p = await f.create({ executor: (skill, context) => skill === api.STAGES[5] ? prelaunch(skill, context) : f.good(skill, context) });
  await advance(p, 5);
  const before = p.snapshot().stages[4].checkpoint.projectDigest;
  await p.advance();
  assert.equal(captures, 1);
  assert.equal(p.snapshot().stages[5].status, 'PASSED');
  assert.equal(await p.projectDigest(), before);
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

test('keyword worker receives immutable run-local copies without original source paths', async t => {
  const f = await fixture(t);
  const lineage = join(f.root, 'source-lineage.md');
  await writeFile(lineage, '# Source lineage\n- synthetic source\n');
  f.inputs.keywordSourceLineageFile = lineage;
  const p = await f.create(); await advance(p, 2);
  const state = p.snapshot(), context = f.calls[1].context;
  const raw = state.inputCopies.rawKeywordsFile;
  const sourceLineage = state.inputCopies.keywordSourceLineageFile;
  assert.equal(raw.originalPath, f.inputs.rawKeywordsFile);
  assert.equal(sourceLineage.originalPath, lineage);
  assert.equal(raw.copyPath, join(f.workspace, 'runs', state.runId, 'inputs', 'raw-raw.md'));
  assert.equal(sourceLineage.copyPath, join(f.workspace, 'runs', state.runId, 'inputs', 'lineage-source-lineage.md'));
  assert.equal(context.inputs.rawKeywordsFile, raw.copyPath);
  assert.equal(context.inputs.keywordSourceLineageFile, sourceLineage.copyPath);
  assert.equal(context.inputCopyPaths.rawKeywordsFile, raw.copyPath);
  assert.equal(JSON.stringify(context).includes(f.inputs.rawKeywordsFile), false);
  assert.equal(JSON.stringify(context).includes(lineage), false);
  assert.equal(await readFile(raw.copyPath, 'utf8'), await readFile(f.inputs.rawKeywordsFile, 'utf8'));
  assert.equal(await readFile(sourceLineage.copyPath, 'utf8'), await readFile(lineage, 'utf8'));
  assert.equal((await stat(raw.copyPath)).mode & 0o777, 0o400);
  assert.equal((await stat(sourceLineage.copyPath)).mode & 0o777, 0o400);
  assert.equal(raw.sha256, hash(await readFile(raw.copyPath)));
  assert.equal(sourceLineage.sha256, hash(await readFile(sourceLineage.copyPath)));
});

test('direct pipeline recovery rejects incomplete historical service decisions before invoking the worker', async t => {
  const f = await fixture(t);
  let keywordCalls = 0;
  const executor = async (skill, context) => {
    f.calls.push({ skill, context });
    if (skill !== api.STAGES[1]) return f.good(skill, context);
    keywordCalls++;
    const native = join(context.outputDirectory, 'native');
    await mkdir(native, { recursive: true });
    await writeFile(join(native, 'evidence.txt'), 'saved evidence');
    await writeFixtureRecoveryLineage(native);
    await writeFile(join(native, 'SERVICE_BLOCKERS.json'), JSON.stringify({ resumeAuthorized: false, stops: [
      { provider: 'youtube', operation: 'youtube-subs', reason: 'HTTP 429' },
      { provider: 'steamcommunity.com', operation: 'selected public page open', reason: 'HTTP 429' },
    ] }));
    return { status: 'BLOCKED', artifacts: [], evidence: ['SYNTHETIC provider stops'], missing_inputs: [] };
  };
  const first = await f.create({ executor });
  await advance(first, 2);
  assert.equal(keywordCalls, 1);
  const runId = first.snapshot().runId;
  const runDirectory = join(f.workspace, 'runs', runId);
  const recovery = await captureStoppedKeywordAttempt(runDirectory, 1);
  const planPath = join(f.root, 'incomplete-service-plan.json');
  const planBytes = Buffer.from(JSON.stringify({ kind: 'KEYWORD_EVIDENCE_PLAN_V2', runId,
    stage: api.STAGES[1], recoverySha256: recovery.sha256,
    serviceStops: ['youtube-subtitles'], serviceResumes: [],
    tasks: [{ keyword: 'Example walkthrough', rawRows: [1], gap: 'Missing official fact',
      tool: 'serper', target: 'Example walkthrough official documentation',
      expectedEvidence: 'First-party page body for the missing fact',
      acceptanceCriteria: ['Official body supports the missing example fact.'],
      stopConditions: ['OFFICIAL_SOURCE_UNAVAILABLE'],
      sourceRequirements: { allowedSourceTypes: ['FIRST_PARTY'], requiresBody: true,
        requiresCurrentAccess: true }, fallbackDisposition: 'KEEP_PARTIAL',
      expectedStatusTransition: { from: 'PARTIAL', to: 'COMPLETED' } }], pendingRows: [] }));
  await writeFile(planPath, planBytes);
  const patch = { keywordRecovery: recovery, keywordRecoveryDecision: { mode: 'recover' },
    keywordServiceStops: ['youtube-subtitles'], keywordServiceResumes: [],
    keywordEvidencePlan: { path: planPath, sha256: hash(planBytes) } };
  const manifestBytes = await readFile(first.manifestPath);
  const receipt = createKeywordExecutionReceipt({ runId, inputsFile: join(f.root, 'retry-inputs.json'),
    inputsFileBytes: Buffer.from(JSON.stringify(patch)), inputs: patch, manifestBytes,
    confirmationBinding: 'confirmation-code:fixture' });
  const resumed = await f.create({ runId, resume: true, inputs: {}, executor,
    keywordExecutionReceipt: receipt, keywordExecutionInputs: patch });
  await resumed.updateUserInputs(patch, { retry: true });
  await assert.rejects(resumed.advance(), /KEYWORD_SERVICE_DECISION_REQUIRED.*steam-community/);
  assert.equal(keywordCalls, 1, 'incomplete recovery decisions must fail before the worker is called');
});

test('direct pipeline recovery waits for an explicit evidence plan before invoking the worker', async t => {
  const f = await fixture(t);
  let keywordCalls = 0;
  const executor = async (skill, context) => {
    f.calls.push({ skill, context });
    if (skill !== api.STAGES[1]) return f.good(skill, context);
    keywordCalls++;
    const native = join(context.outputDirectory, 'native');
    await mkdir(native, { recursive: true });
    await writeFile(join(native, 'evidence.txt'), 'saved evidence');
    await writeFixtureRecoveryLineage(native);
    return { status: 'PARTIAL', artifacts: [], evidence: ['SYNTHETIC incomplete research'], missing_inputs: [] };
  };
  const first = await f.create({ executor });
  await advance(first, 2);
  assert.equal(keywordCalls, 1);
  const runId = first.snapshot().runId;
  const recovery = await captureStoppedKeywordAttempt(join(f.workspace, 'runs', runId), 1);
  const patch = { keywordRecovery: recovery, keywordRecoveryDecision: { mode: 'recover' },
    keywordServiceStops: [], keywordServiceResumes: [] };
  const manifestBytes = await readFile(first.manifestPath);
  const receipt = { runId, decision: { mode: 'recover' }, manifestSha256: hash(manifestBytes) };
  const resumed = await f.create({ runId, resume: true, inputs: {}, executor,
    keywordExecutionReceipt: receipt, keywordExecutionInputs: patch });
  await resumed.updateUserInputs(patch, { retry: true });
  const state = await resumed.advance();
  assert.equal(state.stages[1].status, 'WAITING_FOR_USER');
  assert.deepEqual(state.stages[1].missing_inputs, ['keywordEvidencePlan']);
  assert.equal(keywordCalls, 1, 'missing evidence plan must stop before the worker is called');
});

test('resume blocks on a changed or out-of-run keyword input copy and names the file', async t => {
  for (const failure of ['changed', 'outside']) {
    const f = await fixture(t), p = await f.create(); await advance(p, 2);
    const disk = JSON.parse(await readFile(p.manifestPath, 'utf8'));
    const copy = disk.inputCopies.rawKeywordsFile.copyPath;
    if (failure === 'changed') {
      await chmod(copy, 0o600); await writeFile(copy, 'tampered copy'); await chmod(copy, 0o400);
    } else {
      const outside = join(f.root, 'outside-copy.md');
      await writeFile(outside, await readFile(copy));
      disk.inputCopies.rawKeywordsFile.copyPath = outside;
      await writeFile(p.manifestPath, JSON.stringify(disk));
    }
    const restored = await f.create({ runId: disk.runId, resume: true, inputs: {} });
    await restored.advance();
    const blocked = restored.snapshot().stages[2];
    assert.equal(blocked.status, 'BLOCKED');
    assert.match(blocked.evidence.join('\n'), new RegExp(failure === 'changed' ? 'raw-raw\\.md' : 'outside-copy\\.md'));
  }
});

test('manifest validation rejects a malformed inputCopies field', async t => {
  const f = await fixture(t), p = await f.create();
  const disk = JSON.parse(await readFile(p.manifestPath, 'utf8'));
  disk.inputCopies = [];
  await writeFile(p.manifestPath, JSON.stringify(disk));
  await assert.rejects(f.create({ runId: disk.runId, resume: true, inputs: {} }), /Invalid inputCopies manifest field/);
});

test('legacy manifest without inputCopies remains resumable', async t => {
  const f = await fixture(t), p = await f.create();
  const disk = JSON.parse(await readFile(p.manifestPath, 'utf8'));
  delete disk.inputCopies;
  await writeFile(p.manifestPath, JSON.stringify(disk));
  const restored = await f.create({ runId: disk.runId, resume: true, inputs: {} });
  await advance(restored, 2);
  assert.equal(restored.snapshot().stages[1].status, 'PASSED');
  assert.ok(restored.snapshot().inputCopies.rawKeywordsFile);
});

test('retry after original keyword bytes change rebuilds the run-local copy', async t => {
  const f = await fixture(t), p = await f.create(); await advance(p, 2);
  const before = p.snapshot().inputCopies.rawKeywordsFile.sha256;
  await writeFile(f.inputs.rawKeywordsFile, '# Revised user keywords\n- changed\n');
  await p.updateUserInputs({ rawKeywordsFile: f.inputs.rawKeywordsFile }, { retry: true });
  assert.equal(p.snapshot().stages[1].status, 'NOT_STARTED');
  await p.advance();
  const after = p.snapshot().inputCopies.rawKeywordsFile;
  assert.notEqual(after.sha256, before);
  assert.equal(await readFile(after.copyPath, 'utf8'), '# Revised user keywords\n- changed\n');
});

test('original keyword changes still block downstream stages even when the copy is unchanged', async t => {
  const f = await fixture(t), p = await f.create(); await advance(p, 2);
  await writeFile(f.inputs.rawKeywordsFile, '# changed outside the run');
  await p.advance();
  assert.equal(p.snapshot().stages[2].status, 'BLOCKED');
  assert.match(p.snapshot().stages[2].evidence.join('\n'), /Raw keywords changed/);
  assert.equal(f.calls.length, 2);
});

test('keyword input copy filename rejects traversal-like and control characters with the value', () => {
  for (const value of ['bad/name.md', 'bad..name.md', 'bad\nname.md']) {
    assert.throws(() => api.inputCopyFilename('raw', value), error => {
      assert.match(error.message, /Invalid keyword input filename/);
      assert.ok(error.message.includes(JSON.stringify(value)));
      return true;
    });
  }
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
