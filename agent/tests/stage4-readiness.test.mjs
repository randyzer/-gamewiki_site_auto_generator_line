import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { chmod, mkdir, mkdtemp, readFile, realpath, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

import {
  createStage4ReadinessGate,
  verifyStage4ReadinessBinding,
} from '../src/stage4-readiness.mjs';
import { createStage4DirtyApprovalVerifier } from '../src/stage4-dirty-approval.mjs';
import { consumeRunPreviewSnapshot, createRunPreviewSnapshot } from '../src/run-preview-snapshot.mjs';
import { runProcess } from '../src/process.mjs';

const sha256 = value => createHash('sha256').update(value).digest('hex');

async function fixture(t, result = {}) {
  const root = await mkdtemp(resolve('.stage4-readiness-test-'));
  t.after(async () => {
    await chmod(join(root, 'runs/example/artifacts/3/4/host-readiness'), 0o700).catch(() => {});
    await chmod(join(root, 'runs/example/artifacts/5/host-readiness'), 0o700).catch(() => {});
    await rm(root, { recursive: true, force: true });
  });
  const projectPath = join(root, 'site');
  const nativeDirectory = join(root, 'runs/example/artifacts/3/4/native');
  const outputDirectory = dirname(nativeDirectory);
  const skillRoot = join(root, 'skills/game-site-content-integrator');
  const preflightPath = join(skillRoot, 'scripts/preflight.py');
  const source = join(skillRoot, 'SKILL.md');
  const templateRoot = join(root, 'template-cache', 'template');
  await Promise.all([
    mkdir(join(projectPath, 'app'), { recursive: true }),
    mkdir(join(projectPath, 'docs'), { recursive: true }),
    mkdir(join(projectPath, 'backgroundinformation/keyword-materials'), { recursive: true }),
    mkdir(join(skillRoot, 'scripts'), { recursive: true }),
    mkdir(templateRoot, { recursive: true }),
    mkdir(nativeDirectory, { recursive: true }),
  ]);
  await Promise.all([
    writeFile(join(projectPath, 'package.json'), '{}'),
    writeFile(join(projectPath, 'app/page.tsx'), 'fixture'),
    writeFile(source, '# fixture skill'),
    writeFile(preflightPath, '# fixture preflight'),
  ]);
  const preflightResult = {
    schema_version: 1,
    game: 'Wallpaper Engine',
    workspace: projectPath,
    page_roots: [join(projectPath, 'app')],
    resolved_inputs: {
      background_dir: join(projectPath, 'backgroundinformation'),
      homepage_research: join(projectPath, 'backgroundinformation/Wallpaper Engine攻略站首页调研信息.md'),
      icon_zip: join(projectPath, 'backgroundinformation/Wallpaper Engine图标.zip'),
      keywords: join(projectPath, 'backgroundinformation/keyword-materials/keywords.json'),
      materials_dir: join(projectPath, 'backgroundinformation/keyword-materials'),
      template_selection_report: join(projectPath, 'docs/TEMPLATE_SELECTION_REPORT.md'),
      template_copy_manifest: join(projectPath, 'docs/template-copy-manifest.json'),
    },
    keyword_count: 2,
    materials: [],
    icon_zip: { members: [], missing: [] },
    git: { is_repo: false, root: null, changes: [] },
    confirmation_required: false,
    errors: [],
    warnings: ['workspace is not inside a Git repository'],
    ready: true,
    ...result,
  };
  const run = async (_command, args) => {
    const output = args[args.indexOf('--output') + 1];
    await writeFile(output, JSON.stringify(preflightResult));
    return { exitCode: preflightResult.ready ? 0 : preflightResult.errors.length ? 2 : 3, stdout: output };
  };
  const context = {
    runId: 'wallpaper-engine-002',
    stage: 'game-site-content-integrator',
    outputDirectory,
    nativeDirectory,
    inputs: { gameIdentity: 'Wallpaper Engine', projectPath, mode: 'new-site' },
    upstream: [],
    checkpoint: { attempt: 4, inputDigest: '1'.repeat(64) },
    templateSnapshot: { commit: 'a'.repeat(40), templateRoot },
    skillLock: {
      source,
      sha256: sha256('# fixture skill'),
      files: [{ path: preflightPath, sha256: sha256('# fixture preflight') }],
    },
  };
  return { context, preflightPath, preflightResult, projectPath, run };
}

test('Host accepts a locked ready non-Git site and writes a bound read-only attestation', async t => {
  const f = await fixture(t);
  const gate = createStage4ReadinessGate({ run: f.run, pythonCommand: process.execPath,
    gitCommand: '/usr/bin/git', clock: () => 1_700_000_000_000 });

  const outcome = await gate('game-site-content-integrator', f.context);

  assert.equal(outcome.status, 'READY');
  assert.equal(outcome.binding.attestation.readiness, 'READY');
  assert.equal(outcome.binding.attestation.git.isRepo, false);
  assert.equal(outcome.binding.attestation.projectPath, f.projectPath);
  assert.equal(outcome.binding.attestation.preflightScriptSha256, sha256('# fixture preflight'));
  assert.equal((await readFile(outcome.binding.path, 'utf8')).length > 0, true);
  assert.deepEqual(await verifyStage4ReadinessBinding(outcome.binding, f.context), outcome.binding.attestation);
});

test('Host blocks before Worker when the locked preflight is not ready', async t => {
  const f = await fixture(t, { ready: false, errors: ['package.json missing'], warnings: [] });
  const gate = createStage4ReadinessGate({ run: f.run, pythonCommand: process.execPath,
    gitCommand: '/usr/bin/git' });

  const outcome = await gate('game-site-content-integrator', f.context);

  assert.equal(outcome.status, 'BLOCKED');
  assert.match(outcome.evidence.join('\n'), /package\.json missing/);
  assert.equal(outcome.binding, undefined);
});

test('Host rejects an attestation changed after readiness evaluation', async t => {
  const f = await fixture(t);
  const gate = createStage4ReadinessGate({ run: f.run, pythonCommand: process.execPath,
    gitCommand: '/usr/bin/git' });
  const outcome = await gate('game-site-content-integrator', f.context);
  await chmod(outcome.binding.path, 0o600);
  await writeFile(outcome.binding.path, '{}');

  await assert.rejects(verifyStage4ReadinessBinding(outcome.binding, f.context),
    error => error.code === 'STAGE4_READINESS_ATTESTATION_CHANGED');
});

test('Host rejects an attestation replaced by a symbolic link', async t => {
  const f = await fixture(t);
  const gate = createStage4ReadinessGate({ run: f.run, pythonCommand: process.execPath,
    gitCommand: '/usr/bin/git' });
  const outcome = await gate('game-site-content-integrator', f.context);
  const replacement = join(dirname(outcome.binding.path), 'replacement.json');
  await chmod(dirname(outcome.binding.path), 0o700);
  await writeFile(replacement, await readFile(outcome.binding.path));
  await rm(outcome.binding.path);
  const { symlink } = await import('node:fs/promises');
  await symlink(replacement, outcome.binding.path);

  await assert.rejects(verifyStage4ReadinessBinding(outcome.binding, f.context),
    error => error.code === 'STAGE4_READINESS_ATTESTATION_CHANGED');
});

test('Host rejects a replaced attestation parent and cross-attempt replay', async t => {
  const f = await fixture(t);
  const gate = createStage4ReadinessGate({ run: f.run, pythonCommand: process.execPath,
    gitCommand: '/usr/bin/git' });
  const outcome = await gate('game-site-content-integrator', f.context);
  await assert.rejects(verifyStage4ReadinessBinding(outcome.binding, { ...f.context,
    checkpoint: { ...f.context.checkpoint, attempt: f.context.checkpoint.attempt + 1 } }),
  error => error.code === 'STAGE4_READINESS_BINDING_MISMATCH');

  const parent = dirname(outcome.binding.path), backup = `${parent}-original`;
  await chmod(parent, 0o700);
  await rename(parent, backup);
  await mkdir(parent, { mode: 0o700 });
  await writeFile(outcome.binding.path, await readFile(join(backup, 'STAGE4_READINESS_ATTESTATION.json')),
    { mode: 0o400 });
  await assert.rejects(verifyStage4ReadinessBinding(outcome.binding, f.context),
    error => error.code === 'STAGE4_READINESS_ATTESTATION_CHANGED');
  await chmod(backup, 0o700);
});

test('dirty-worktree approval requires a trusted single-use preview consumption and exact attempt', async t => {
  const root = await mkdtemp(resolve('.stage4-approval-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const runId = 'approval-fixture';
  const projectPath = resolve(root, 'site'), repositoryRoot = projectPath;
  const approval = { kind: 'STAGE4_DIRTY_WORKTREE_APPROVAL_V1', schemaVersion: 1, approved: true,
    runId, stage: 'game-site-content-integrator', attempt: 4, projectPath, repositoryRoot,
    headSha: 'a'.repeat(40), baselineDigest: 'b'.repeat(64) };
  assert.throws(() => createStage4DirtyApprovalVerifier({ previewConsumption: {},
    approvedInputs: { stage4DirtyWorktreeApproval: approval } }), /untrusted preview consumption/);

  let preview = 0;
  const consumed = async ({ command = 'retry', previewRunId = runId, inputs = {
    stage4DirtyWorktreeApproval: approval } } = {}) => {
    preview++;
    const inputPath = join(root, `inputs-${preview}.json`);
    const bytes = Buffer.from(JSON.stringify(inputs, null, 2) + '\n');
    await writeFile(inputPath, bytes);
    const snapshot = await createRunPreviewSnapshot({
      previewRoot: join(root, 'runs/.preview-approvals', previewRunId), command, runId: previewRunId,
      inputDocument: { path: inputPath, bytes, data: JSON.parse(bytes) }, summary: 'approve exact dirty baseline',
      confirmationCode: String(preview).padStart(16, '0'), manifestBytes: Buffer.from('manifest'),
    });
    return {
      consumption: await consumeRunPreviewSnapshot(snapshot),
      approvedInputs: snapshot.effectiveInputDocument.data,
    };
  };
  const mismatch = await consumed();
  const verifier = createStage4DirtyApprovalVerifier({ previewConsumption: mismatch.consumption,
    approvedInputs: mismatch.approvedInputs });
  assert.throws(() => verifier({ ...approval, attempt: 5 }), /does not match the current Git baseline/);
  assert.throws(() => createStage4DirtyApprovalVerifier({ previewConsumption: mismatch.consumption,
    approvedInputs: mismatch.approvedInputs }), /already claimed/);

  const crossRun = await consumed({ previewRunId: 'another-run' });
  assert.throws(() => createStage4DirtyApprovalVerifier({ previewConsumption: crossRun.consumption,
    approvedInputs: crossRun.approvedInputs }), /does not match the approved retry input document/);
  const wrongCommand = await consumed({ command: 'run' });
  assert.throws(() => createStage4DirtyApprovalVerifier({ previewConsumption: wrongCommand.consumption,
    approvedInputs: wrongCommand.approvedInputs }), /does not match the approved retry input document/);
  const wrongInputs = await consumed();
  assert.throws(() => createStage4DirtyApprovalVerifier({ previewConsumption: wrongInputs.consumption,
    approvedInputs: { stage4DirtyWorktreeApproval: approval, unexpected: true } }),
  /effective inputs do not match trusted snapshot/);

  const valid = await consumed();
  const equivalentInputs = {
    stage4DirtyWorktreeApproval: Object.fromEntries(Object.entries(approval).reverse()),
  };
  const verifier2 = createStage4DirtyApprovalVerifier({ previewConsumption: valid.consumption,
    approvedInputs: equivalentInputs });
  const accepted = verifier2(approval);
  assert.equal(accepted.kind, 'STAGE4_DIRTY_WORKTREE_APPROVAL_CONSUMPTION_V1');
  assert.throws(() => verifier2(approval), /already consumed/);
  assert.throws(() => createStage4DirtyApprovalVerifier({ previewConsumption: valid.consumption,
    approvedInputs: equivalentInputs }), /already claimed/);
});

test('dirty Git state waits for an exact bound approval before Host materialization', async t => {
  const f = await fixture(t);
  const changes = [' M app/page.tsx'];
  let prepared = 0, calls = 0;
  const run = async (_command, args) => {
    if (!args.includes('--output')) return { exitCode: 0, stdout: 'a'.repeat(40) + '\n' };
    calls++;
    const output = args[args.indexOf('--output') + 1];
    const confirmed = args.includes('--allow-dirty-after-confirmation');
    await writeFile(output, JSON.stringify({
      ...f.preflightResult,
      git: { is_repo: true, root: f.projectPath, changes },
      confirmation_required: !confirmed,
      warnings: confirmed ? [] : ['Git worktree has uncommitted changes; user confirmation is required before writes'],
      ready: confirmed,
    }));
    if (!confirmed) {
      const error = Error('confirmation required'); error.exitCode = 3; throw error;
    }
    return { exitCode: 0 };
  };
  const gate = createStage4ReadinessGate({ run, pythonCommand: process.execPath,
    gitCommand: '/usr/bin/git', prepare: async () => { prepared++; return { preparedByHost: true }; } });

  const waiting = await gate('game-site-content-integrator', f.context);
  assert.equal(waiting.status, 'WAITING_FOR_USER');
  assert.deepEqual(waiting.missing_inputs, ['stage4DirtyWorktreeApproval']);
  assert.equal(prepared, 0);
  assert.equal(calls, 1);

  const secondOutput = join(dirname(dirname(f.context.outputDirectory)), '5');
  await mkdir(join(secondOutput, 'native'), { recursive: true });
  const context = { ...f.context, outputDirectory: secondOutput, nativeDirectory: join(secondOutput, 'native'),
    checkpoint: { ...f.context.checkpoint, attempt: 5 } };
  const approvedGate = createStage4ReadinessGate({ run, pythonCommand: process.execPath,
    gitCommand: '/usr/bin/git', prepare: async () => { prepared++; return { preparedByHost: true }; },
    dirtyWorktreeApprovalVerifier: expected => {
      assert.equal(expected.attempt, 5);
      assert.equal(expected.projectPath, f.projectPath);
      assert.match(expected.baselineDigest, /^[a-f0-9]{64}$/);
      return Object.freeze({ kind: 'STAGE4_DIRTY_WORKTREE_APPROVAL_CONSUMPTION_V1',
        previewId: '11111111-1111-4111-8111-111111111111', snapshotSha256: 'b'.repeat(64),
        approvalDigest: 'c'.repeat(64) });
    } });
  const ready = await approvedGate('game-site-content-integrator', context);
  assert.equal(ready.status, 'READY');
  assert.equal(prepared, 1);
  assert.equal(ready.contextPatch.preparedByHost, true);
  assert.equal(calls, 3);
});

test('Host rejects dirty Git content drift after approval and before Worker dispatch', async t => {
  const f = await fixture(t);
  const changes = [' M app/page.tsx'];
  const run = async (_command, args) => {
    if (!args.includes('--output')) return { exitCode: 0, stdout: 'a'.repeat(40) + '\n' };
    const output = args[args.indexOf('--output') + 1];
    const confirmed = args.includes('--allow-dirty-after-confirmation');
    await writeFile(output, JSON.stringify({ ...f.preflightResult,
      git: { is_repo: true, root: f.projectPath, changes },
      confirmation_required: !confirmed,
      warnings: confirmed ? [] : ['Git worktree has uncommitted changes; user confirmation is required before writes'],
      ready: confirmed }));
    if (!confirmed) { const error = Error('confirmation required'); error.exitCode = 3; throw error; }
    return { exitCode: 0 };
  };
  const gate = createStage4ReadinessGate({ run, pythonCommand: process.execPath,
    gitCommand: '/usr/bin/git',
    prepare: async () => { await writeFile(join(f.projectPath, 'app/page.tsx'), 'changed after approval'); },
    dirtyWorktreeApprovalVerifier: () => Object.freeze({
      kind: 'STAGE4_DIRTY_WORKTREE_APPROVAL_CONSUMPTION_V1',
      previewId: '11111111-1111-4111-8111-111111111111', snapshotSha256: 'b'.repeat(64),
      approvalDigest: 'c'.repeat(64),
    }) });

  await assert.rejects(gate('game-site-content-integrator', f.context),
    error => error.code === 'STAGE4_DIRTY_WORKTREE_APPROVAL_STALE');
});

test('Host rejects a new Git change appearing after dirty-worktree approval', async t => {
  const f = await fixture(t);
  const originalChanges = [' M app/page.tsx'];
  let preflightCalls = 0;
  const run = async (_command, args) => {
    if (!args.includes('--output')) return { exitCode: 0, stdout: 'a'.repeat(40) + '\n' };
    preflightCalls++;
    const output = args[args.indexOf('--output') + 1];
    const confirmed = args.includes('--allow-dirty-after-confirmation');
    const changes = confirmed ? [...originalChanges, '?? app/new.tsx'] : originalChanges;
    await writeFile(output, JSON.stringify({ ...f.preflightResult,
      git: { is_repo: true, root: f.projectPath, changes },
      confirmation_required: !confirmed,
      warnings: confirmed ? [] : ['Git worktree has uncommitted changes; user confirmation is required before writes'],
      ready: confirmed }));
    if (!confirmed) { const error = Error('confirmation required'); error.exitCode = 3; throw error; }
    return { exitCode: 0 };
  };
  const gate = createStage4ReadinessGate({ run, pythonCommand: process.execPath,
    gitCommand: '/usr/bin/git',
    prepare: async () => { await writeFile(join(f.projectPath, 'app/new.tsx'), 'new after approval'); },
    dirtyWorktreeApprovalVerifier: () => Object.freeze({
      kind: 'STAGE4_DIRTY_WORKTREE_APPROVAL_CONSUMPTION_V1',
      previewId: '11111111-1111-4111-8111-111111111111', snapshotSha256: 'b'.repeat(64),
      approvalDigest: 'c'.repeat(64),
    }) });

  await assert.rejects(gate('game-site-content-integrator', f.context),
    error => error.code === 'STAGE4_DIRTY_WORKTREE_APPROVAL_STALE');
  assert.equal(preflightCalls, 2);
});

test('approved Git baseline uses the target subdirectory scope through pre-dispatch verification', async t => {
  const f = await fixture(t);
  const repositoryRoot = dirname(f.projectPath);
  const changes = ['M  app/page.tsx', 'R  app/old.tsx -> app/renamed.tsx', '?? app/new/'];
  await mkdir(join(f.projectPath, 'app/new'), { recursive: true });
  await Promise.all([
    writeFile(join(f.projectPath, 'app/renamed.tsx'), 'renamed'),
    writeFile(join(f.projectPath, 'app/new/item.tsx'), 'new'),
  ]);
  const run = async (_command, args) => {
    if (args.includes('status')) {
      assert.deepEqual(args.slice(0, 2), ['-C', f.projectPath]);
      return { exitCode: 0, stdout: `${changes.join('\n')}\n` };
    }
    if (!args.includes('--output')) return { exitCode: 0, stdout: 'a'.repeat(40) + '\n' };
    const output = args[args.indexOf('--output') + 1];
    const confirmed = args.includes('--allow-dirty-after-confirmation');
    await writeFile(output, JSON.stringify({ ...f.preflightResult,
      git: { is_repo: true, root: repositoryRoot, changes },
      confirmation_required: !confirmed,
      warnings: confirmed ? [] : ['Git worktree has uncommitted changes; user confirmation is required before writes'],
      ready: confirmed }));
    if (!confirmed) { const error = Error('confirmation required'); error.exitCode = 3; throw error; }
    return { exitCode: 0 };
  };
  const gate = createStage4ReadinessGate({ run, pythonCommand: process.execPath,
    gitCommand: '/usr/bin/git', dirtyWorktreeApprovalVerifier: () => Object.freeze({
      kind: 'STAGE4_DIRTY_WORKTREE_APPROVAL_CONSUMPTION_V1',
      previewId: '11111111-1111-4111-8111-111111111111', snapshotSha256: 'b'.repeat(64),
      approvalDigest: 'c'.repeat(64),
    }) });

  const outcome = await gate('game-site-content-integrator', f.context);
  assert.equal(outcome.status, 'READY');
  await outcome.binding.verifyCurrentState(f.context);
});

test('real locked preflight accepts a complete synthetic non-Git site before Worker dispatch', async t => {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'stage4-real-preflight-')));
  t.after(async () => {
    await chmod(join(root, 'run/artifacts/3/1/host-readiness'), 0o700).catch(() => {});
    await rm(root, { recursive: true, force: true });
  });
  const projectPath = join(root, 'site'), outputDirectory = join(root, 'run/artifacts/3/1');
  const nativeDirectory = join(outputDirectory, 'native'), templateRoot = join(root, 'template');
  const background = join(projectPath, 'backgroundinformation'), materials = join(background, 'keyword-materials');
  const docs = join(projectPath, 'docs'), icons = join(root, 'icons');
  await Promise.all([mkdir(join(projectPath, 'app'), { recursive: true }), mkdir(materials, { recursive: true }),
    mkdir(docs, { recursive: true }), mkdir(nativeDirectory, { recursive: true }), mkdir(templateRoot), mkdir(icons)]);
  const iconNames = ['apple-touch-icon.png', 'favicon-32x32.png', 'favicon-16x16.png', 'favicon.ico',
    'site.webmanifest', 'android-chrome-192x192.png', 'android-chrome-512x512.png'];
  await Promise.all(iconNames.map(name => writeFile(join(icons, name), 'fixture')));
  await runProcess('/usr/bin/zip', ['-q', join(background, 'Wallpaper Engine图标.zip'), ...iconNames], { cwd: icons });
  await Promise.all([
    writeFile(join(projectPath, 'package.json'), '{}'),
    writeFile(join(background, 'Wallpaper Engine攻略站首页调研信息.md'), '# fixture'),
    writeFile(join(materials, 'keywords.json'), JSON.stringify({ categories: [
      { category: 'Guide', keywords: ['Wallpaper Engine guide'] },
    ] })),
    writeFile(join(materials, 'Wallpaper Engine guide素材.md'), '- 状态: COMPLETED\n'),
    writeFile(join(docs, 'TEMPLATE_SELECTION_REPORT.md'), '# fixture'),
    writeFile(join(docs, 'template-copy-manifest.json'), JSON.stringify({ destination: projectPath })),
  ]);
  const skillRoot = resolve('../codex-skills/game-site-content-integrator');
  const source = join(skillRoot, 'SKILL.md'), preflightPath = join(skillRoot, 'scripts/preflight.py');
  const context = { runId: 'real-stage4-fixture', outputDirectory, nativeDirectory,
    inputs: { gameIdentity: 'Wallpaper Engine', projectPath, mode: 'new-site' }, upstream: [],
    checkpoint: { attempt: 1 }, templateSnapshot: { commit: 'a'.repeat(40), templateRoot },
    skillLock: { source, sha256: sha256(await readFile(source)), files: [
      { path: preflightPath, sha256: sha256(await readFile(preflightPath)) },
    ] } };
  const gate = createStage4ReadinessGate({ run: runProcess, pythonCommand: '/opt/homebrew/bin/python3',
    gitCommand: '/opt/homebrew/bin/git' });

  const outcome = await gate('game-site-content-integrator', context);

  assert.equal(outcome.status, 'READY');
  assert.equal(outcome.binding.attestation.git.isRepo, false);
  assert.equal(outcome.binding.attestation.readiness, 'READY');
});
