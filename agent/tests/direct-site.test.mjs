import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, realpath, mkdir, writeFile, readFile, rm, chmod, stat, readdir, copyFile, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, relative } from 'node:path';
import { createPipeline } from '../src/pipeline.mjs';
import { resolveInputPaths } from '../src/paths.mjs';
import { createSkillExecutor } from '../src/skill-executor.mjs';
import { stageWorkerPermissions } from '../src/worker-permissions.mjs';
import { STAGE, STAGES } from '../src/stages.mjs';
import { sha256 } from '../src/files.mjs';
import { fixture as pipelineFixture, goodResult } from './helpers.mjs';

const mergeApi = await import('../src/template-merge.mjs').catch(error => {
  if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
  return {};
});
async function merge(context, options) {
  assert.equal(typeof mergeApi.mergeTemplateCopy, 'function', 'host template merge must exist');
  return mergeApi.mergeTemplateCopy(context, options);
}
async function fixture(t) {
  const root = await mkdtemp(join(await realpath(tmpdir()), 'direct-site-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const runDirectory = join(root, 'agent/runs/test'), siteDirectory = join(root, 'game_WallpaperEngine');
  const researchDirectory = join(siteDirectory, 'backgroundinformation');
  const rawKeywordsFile = join(researchDirectory, 'keyword-materials/关键词.md');
  const source = join(runDirectory, 'template-copy/site');
  await mkdir(dirname(rawKeywordsFile), { recursive: true });
  await writeFile(rawKeywordsFile, '# original user keywords');
  await writeFile(join(siteDirectory, '.DS_Store'), 'mac metadata');
  const files = { 'package.json': '{}', 'app/page.tsx': 'export default function Page() {}',
    'docs/TEMPLATE_SELECTION_REPORT.md': '# selection', 'docs/TEMPLATE_RESIDUE_SCAN.json': '{}' };
  for (const [name, bytes] of Object.entries(files)) {
    await mkdir(dirname(join(source, name)), { recursive: true }); await writeFile(join(source, name), bytes);
  }
  await chmod(join(source, 'app/page.tsx'), 0o755);
  const manifest = { schema_version: 1, game: 'fixture', destination: source, source_unchanged: true,
    destination_verified: true, custom: { retained: true }, files: Object.fromEntries(Object.entries(files).map(([p,b]) => [p,sha256(b)])) };
  await writeFile(join(source, 'docs/template-copy-manifest.json'), JSON.stringify(manifest));
  return { root, source, manifest, context: { runDirectory, inputs: { projectPath: siteDirectory,
    paths: { siteDirectory, researchDirectory, rawKeywordsFile } } } };
}
async function snapshot(root) {
  const files = {};
  async function walk(path) {
    for (const entry of await readdir(path, { withFileTypes: true })) {
      const file = join(path, entry.name);
      if (entry.isDirectory()) await walk(file);
      else files[relative(root, file)] = sha256(await readFile(file));
    }
  }
  await walk(root); return files;
}

test('host merges directly into populated user root, preserving research, modes and manifest fields', async t => {
  const f = await fixture(t), { paths } = f.context.inputs;
  const original = await snapshot(paths.siteDirectory);
  const receipt = await merge(f.context);
  assert.equal(receipt.status, 'MERGED'); assert.equal(receipt.sourceDirectory, f.source);
  assert.equal(receipt.siteDirectory, paths.siteDirectory); assert.equal(receipt.fileCount, 5);
  assert.equal(receipt.files.length, 5);
  for (const [name, digest] of Object.entries(original)) assert.equal(sha256(await readFile(join(paths.siteDirectory, name))), digest);
  const manifest = JSON.parse(await readFile(join(paths.siteDirectory, 'docs/template-copy-manifest.json')));
  assert.deepEqual(manifest, { ...f.manifest, destination: paths.siteDirectory });
  assert.equal((await stat(join(paths.siteDirectory, 'app/page.tsx'))).mode & 0o777, 0o755);
  await assert.rejects(stat(f.source), { code: 'ENOENT' });
  assert.deepEqual(JSON.parse(await readFile(join(f.context.runDirectory, 'TEMPLATE_MERGE_RECEIPT.json'))), receipt);
  for (const file of receipt.files) {
    assert.equal(file.status, 'COPIED'); assert.equal(file.sourceSha256.length, 64); assert.equal(file.destinationSha256.length, 64);
  }
});

for (const name of ['package.json', 'docs/template-copy-manifest.json', 'app/page.tsx'])
  test(`merge prechecks all conflicts without modifying any site bytes: ${name}`, async t => {
    const f = await fixture(t), site = f.context.inputs.projectPath;
    await mkdir(dirname(join(site, name)), { recursive: true }); await writeFile(join(site, name), 'user bytes');
    const before = await snapshot(site);
    await assert.rejects(merge(f.context), error => error.message.includes(join(site, name)));
    assert.deepEqual(await snapshot(site), before); await stat(f.source);
  });

test('merge can reuse an existing docs directory', async t => {
  const f = await fixture(t); await mkdir(join(f.context.inputs.projectPath, 'docs'));
  await merge(f.context); await stat(join(f.context.inputs.projectPath, 'docs/TEMPLATE_SELECTION_REPORT.md'));
});

test('template files under backgroundinformation reject before any site writes', async t => {
  const f = await fixture(t); await mkdir(join(f.source, 'backgroundinformation'));
  await writeFile(join(f.source, 'backgroundinformation/template.md'), 'forbidden');
  const before = await snapshot(f.context.inputs.projectPath);
  await assert.rejects(merge(f.context), /backgroundinformation/);
  assert.deepEqual(await snapshot(f.context.inputs.projectPath), before);
});

test('failed merge retains source and a receipt naming every created or attempted file', async t => {
  const f = await fixture(t); let count = 0;
  await assert.rejects(merge(f.context, { copy: async (...args) => {
    if (++count === 2) throw Error('synthetic disk failure');
    return copyFile(...args);
  } }), /synthetic disk failure/);
  const receipt = JSON.parse(await readFile(join(f.context.runDirectory, 'TEMPLATE_MERGE_RECEIPT.json')));
  assert.equal(receipt.status, 'FAILED'); assert.equal(receipt.files.filter(f => f.status === 'COPIED').length, 1);
  assert.equal(receipt.files.filter(f => f.status === 'COPYING').length, 1);
  for (const file of receipt.files.filter(f => f.status === 'COPIED')) await stat(file.destination);
  await stat(f.source); assert.equal(await readFile(f.context.inputs.paths.rawKeywordsFile, 'utf8'), '# original user keywords');
  assert.ok(Array.isArray(receipt.directories), 'receipt must record created directories');
  assert.ok(receipt.directories.some(dir => dir.path === join(f.context.inputs.projectPath, 'app') && dir.status === 'CREATED'));
  for (const dir of receipt.directories.filter(dir => dir.status === 'CREATED')) assert.equal((await stat(dir.path)).isDirectory(), true);
});

test('temporary cleanup failure keeps a MERGED receipt and reports pending cleanup', async t => {
  const f = await fixture(t);
  const receipt = await merge(f.context, { remove: async () => { throw Error('synthetic cleanup denied'); } });
  assert.equal(receipt.status, 'MERGED'); assert.ok(receipt.cleanup, 'receipt must record cleanup independently');
  assert.equal(receipt.cleanup.status, 'FAILED');
  assert.match(receipt.cleanup.error, /synthetic cleanup denied/); await stat(f.source);
  assert.equal(receipt.files.filter(file => file.status === 'COPIED').length, receipt.fileCount);
  assert.equal(JSON.parse(await readFile(join(f.context.runDirectory, 'TEMPLATE_MERGE_RECEIPT.json'))).status, 'MERGED');
});

test('unlisted worker files cannot be promoted through the host merge', async t => {
  const f = await fixture(t); await writeFile(join(f.source, '.env.local'), 'synthetic extra worker file');
  const before = await snapshot(f.context.inputs.projectPath);
  await assert.rejects(merge(f.context), /\.env\.local/);
  assert.deepEqual(await snapshot(f.context.inputs.projectPath), before);
});

for (const status of ['PARTIAL', 'WAITING_FOR_USER', 'BLOCKED'])
  test(`stage 3 preserves ${status} evidence and missing inputs with temporary artifacts`, async t => {
    const f = await fixture(t);
    const executor = createSkillExecutor({ run: async (_command, args) => {
      await writeFile(args[args.indexOf('--output-last-message') + 1], JSON.stringify({ status,
        missing_inputs: status === 'WAITING_FOR_USER' ? ['templateSelection'] : [], evidence: ['worker needs template clarification'],
        artifacts: [{ kind: 'TEMPLATE_SELECTION_REPORT.md', path: join(f.source, 'docs/TEMPLATE_SELECTION_REPORT.md') }] }));
    } });
    const result = await executor(STAGE.TEMPLATE_SELECTION, { ...f.context, runId: 'test',
      outputDirectory: join(f.context.runDirectory, 'artifacts/2/1'), permissions: { siteWrites: false },
      requiredArtifacts: ['TEMPLATE_SELECTION_REPORT.md'], skillLock: { source: join(f.root, 'skill/SKILL.md') } });
    assert.equal(result.status, status); assert.deepEqual(result.evidence, ['worker needs template clarification']);
    assert.deepEqual(result.missing_inputs, status === 'WAITING_FOR_USER' ? ['templateSelection'] : []);
    await stat(f.source);
  });

test('new run accepts only research and .DS_Store in the user root', async t => {
  const f = await pipelineFixture(t), researchDirectory = join(f.root, 'game/backgroundinformation');
  await mkdir(researchDirectory, { recursive: true }); await writeFile(join(f.root, 'game/.DS_Store'), 'metadata');
  const p = await createPipeline({ ...f.configuration, executor: goodResult, inputs: { ...f.inputs,
    paths: { siteDirectory: join(f.root, 'game'), researchDirectory, rawKeywordsFile: f.inputs.rawKeywordsFile } } });
  assert.equal(p.snapshot().inputs.projectPath, join(f.root, 'game'));
});
for (const name of ['README.md', 'node_modules']) test(`new run lists forbidden entry ${name}`, async t => {
  const f = await pipelineFixture(t), siteDirectory = f.inputs.paths.siteDirectory;
  await mkdir(siteDirectory); if (name === 'node_modules') await mkdir(join(siteDirectory, name));
  else await writeFile(join(siteDirectory, name), 'user');
  await assert.rejects(createPipeline({ ...f.configuration, executor: goodResult, inputs: f.inputs }),
    error => error.message.includes(name));
});

for (const [field, value] of [['siteDirectory', 'relative/path'], ['projectRoot', '/legacy/root'], ['siteDirectory', '/x/{projectRoot}']])
  test(`new path inputs reject ${field}=${value}`, () => {
    assert.throws(() => resolveInputPaths({ paths: { siteDirectory: '/game', researchDirectory: '/game/backgroundinformation',
      rawKeywordsFile: '/game/backgroundinformation/keywords.md', [field]: value } }), error => error.message.includes(value));
  });
test('site inside research is still rejected', () => {
  assert.throws(() => resolveInputPaths({ paths: { siteDirectory: '/game/backgroundinformation/site',
    researchDirectory: '/game/backgroundinformation', rawKeywordsFile: '/game/keywords.md' } }), /\/game\/backgroundinformation\/site/);
});

test('stage 3 grants only template-copy writes and keeps site and research readonly', async t => {
  const f = await fixture(t), { paths } = f.context.inputs;
  const nativeDirectory = join(f.context.runDirectory, 'artifacts/2/1/native'); await mkdir(nativeDirectory, { recursive: true });
  for (const skill of [STAGE.TEMPLATE_SELECTION, STAGE.CONTENT_INTEGRATION]) {
    const profile = await stageWorkerPermissions(skill, { ...f.context, nativeDirectory, permissions: { siteWrites: true },
      skillLock: { source: join(f.root, 'skill/SKILL.md') } }, { writePaths: [paths.siteDirectory, paths.researchDirectory] });
    const rules = JSON.parse('{' + profile.config.match(/filesystem=\{(.*?)\},network/)[1].replaceAll('=', ':') + '}');
    assert.equal(rules[paths.siteDirectory], skill === STAGE.TEMPLATE_SELECTION ? 'read' : 'write');
    assert.equal(rules[paths.researchDirectory], 'read');
    if (skill === STAGE.TEMPLATE_SELECTION) assert.equal(rules[join(f.context.runDirectory, 'template-copy')], 'write');
  }
});

test('old manifest carrying projectRoot and site subdirectory still resumes', async t => {
  const f = await pipelineFixture(t);
  const p = await createPipeline({ ...f.configuration, inputs: f.inputs, executor: goodResult });
  const state = p.snapshot(); state.inputs.paths.projectRoot = f.root; state.paths.projectRoot = f.root;
  await writeFile(p.manifestPath, JSON.stringify(state));
  const resumed = await createPipeline({ ...f.configuration, inputs: {}, executor: goodResult, runId: state.runId, resume: true });
  await resumed.advance(); assert.equal(resumed.snapshot().stages[0].status, 'PASSED');
});

test('old run can resolve its original placeholder inputs only against the recorded paths', () => {
  const legacyPaths = { projectRoot: '/legacy/game', siteDirectory: '/legacy/game/site',
    researchDirectory: '/legacy/game/backgroundinformation', rawKeywordsFile: '/legacy/game/backgroundinformation/关键词.md' };
  const resolved = resolveInputPaths({ paths: { projectRoot: legacyPaths.projectRoot, siteDirectory: '{projectRoot}/site',
    researchDirectory: '{projectRoot}/backgroundinformation', rawKeywordsFile: '{projectRoot}/backgroundinformation/关键词.md' } }, { legacyPaths });
  assert.deepEqual(resolved.paths, legacyPaths);
});

test('source symlinks cannot enter a host merge', async t => {
  const f = await fixture(t);
  await symlink(f.context.inputs.paths.rawKeywordsFile, join(f.source, 'alias'));
  const before = await snapshot(f.context.inputs.projectPath);
  await assert.rejects(merge(f.context), /Linked path/);
  assert.deepEqual(await snapshot(f.context.inputs.projectPath), before);
});

test('new run reports at most ten forbidden entries', async t => {
  const f = await pipelineFixture(t), site = f.inputs.paths.siteDirectory; await mkdir(site);
  for (let i = 0; i < 12; i++) await writeFile(join(site, `bad-${String(i).padStart(2, '0')}`), 'user');
  await assert.rejects(createPipeline({ ...f.configuration, inputs: f.inputs, executor: goodResult }), error => {
    assert.equal((error.message.match(/bad-\d\d/g) ?? []).length, 10); return true;
  });
});

for (const name of ['.git/config', '.codex/config.toml', '.agents/skills/unsafe.md', '.aws/config'])
  test(`host merge preserves the worker's protected-directory boundary: ${name}`, async t => {
    const f = await fixture(t); await mkdir(dirname(join(f.source, name)), { recursive: true });
    await writeFile(join(f.source, name), 'untrusted worker file');
    const before = await snapshot(f.context.inputs.projectPath);
    await assert.rejects(merge(f.context), error => error.message.includes(join(f.context.inputs.projectPath, name.split('/')[0])));
    assert.deepEqual(await snapshot(f.context.inputs.projectPath), before);
  });

test('configured template worker returns temporary artifacts; host relocates them before native validation', async t => {
  const f = await fixture(t); await rm(f.source, { recursive: true });
  const executor = createSkillExecutor({ run: async (_command, args, options) => {
    const c = JSON.parse(options.input.split('Task context: ')[1].split('\n')[0]);
    assert.equal(c.templateCopyDestination, f.source);
    assert.ok(!options.input.includes('.template-staging'));
    await mkdir(join(f.source, 'docs'), { recursive: true });
    await writeFile(join(f.source, 'package.json'), '{}');
    await writeFile(join(f.source, 'docs/TEMPLATE_SELECTION_REPORT.md'), 'selection');
    await writeFile(join(f.source, 'docs/TEMPLATE_RESIDUE_SCAN.json'), '{}');
    await writeFile(join(f.source, 'docs/template-copy-manifest.json'), JSON.stringify({ game: 'fixture', destination: f.source,
      source_unchanged: true, destination_verified: true, files: { 'package.json': sha256('{}') } }));
    await writeFile(args[args.indexOf('--output-last-message') + 1], JSON.stringify({ status: 'PASSED', missing_inputs: [],
      evidence: ['offline worker'], artifacts: ['TEMPLATE_SELECTION_REPORT.md', 'TEMPLATE_RESIDUE_SCAN.json', 'template-copy-manifest.json']
        .map(kind => ({ kind, path: join(f.source, 'docs', kind) })) }));
  } });
  const result = await executor(STAGE.TEMPLATE_SELECTION, { ...f.context, runId: 'test',
    inputs: { ...f.context.inputs, gameIdentity: 'fixture' }, outputDirectory: join(f.context.runDirectory, 'artifacts/2/1'),
    permissions: { siteWrites: true }, requiredArtifacts: ['TEMPLATE_SELECTION_REPORT.md', 'TEMPLATE_RESIDUE_SCAN.json', 'template-copy-manifest.json'],
    skillLock: { source: join(f.root, 'skill/SKILL.md') } });
  assert.equal(result.status, 'PASSED');
  for (const artifact of result.artifacts) assert.equal(dirname(artifact.sourcePath), join(f.context.inputs.projectPath, 'docs'));
});
