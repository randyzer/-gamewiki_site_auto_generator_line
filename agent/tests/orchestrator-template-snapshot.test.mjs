import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createOrchestrator, loadConfiguration } from '../src/orchestrator.mjs';
import { STAGE } from '../src/stages.mjs';
import { fixture, goodResult, offlineApprovalConsumer } from './helpers.mjs';

const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
const commitAll = (cwd, message) => {
  git(cwd, 'add', '.');
  git(cwd, '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '-m', message);
  return git(cwd, 'rev-parse', 'HEAD');
};

async function snapshotFixture(t) {
  const f = await fixture(t);
  const origin = join(f.root, 'origin');
  await mkdir(join(origin, 'template', 'temp1_based_demo'), { recursive: true });
  await writeFile(join(origin, 'template', 'temp1_based_demo', 'package.json'), '{"name":"demo"}');
  git(origin, 'init', '-q', '-b', 'main');
  const first = commitAll(origin, 'v1');
  const { templateRoots, ...configuration } = f.configuration;
  configuration.templateSource = { repository: 'file://' + origin, ref: 'main', subtree: 'template' };
  configuration.templateCacheRoot = join(f.root, 'template-cache');
  const contexts = [];
  const executor = async (skill, context) => { contexts.push({ skill, context }); return goodResult(skill, context); };
  return { f, origin, first, configuration, contexts, executor };
}

const manifest = async (configuration, id) =>
  JSON.parse(await readFile(join(configuration.workspace, 'runs', id, 'manifest.json'), 'utf8'));

test('workflow.json declares the fixed GitHub template source', async () => {
  const config = await loadConfiguration();
  assert.deepEqual(config.templateSource, { repository: 'https://github.com/randyzer/-gamewiki_site_auto_generator_line.git',
    ref: 'main', subtree: 'template' });
  assert.equal(config.templateRoots, undefined);
});

test('a new run records the pinned template commit and hands the snapshot to the template stage', async t => {
  const s = await snapshotFixture(t);
  const execute = createOrchestrator({ configuration: s.configuration, executor: s.executor, approvalConsumer: offlineApprovalConsumer });
  await execute({ id: 'snapshot-new', inputs: JSON.stringify(s.f.inputs) });
  const state = await manifest(s.configuration, 'snapshot-new');
  assert.equal(state.templateSnapshot.commit, s.first);
  assert.equal(state.templateSnapshot.repository, s.configuration.templateSource.repository);
  const templateStage = s.contexts.find(c => c.skill === STAGE.TEMPLATE_SELECTION).context;
  assert.deepEqual(templateStage.templateRoots, [join(s.configuration.templateCacheRoot, s.first, 'template')]);
  assert.equal(templateStage.templateSnapshot.commit, s.first);
});

test('a resumed run keeps its original template commit after the ref moves', async t => {
  const s = await snapshotFixture(t);
  const execute = createOrchestrator({ configuration: s.configuration, executor: s.executor, approvalConsumer: offlineApprovalConsumer });
  const pauseAfterKeywords = state => state.stages.find(st => st.skill === STAGE.KEYWORD_RESEARCH).status === 'PASSED';
  await execute({ id: 'snapshot-resume', inputs: JSON.stringify(s.f.inputs) }, { shouldPause: pauseAfterKeywords });
  await writeFile(join(s.origin, 'template', 'temp1_based_demo', 'package.json'), '{"name":"moved"}');
  commitAll(s.origin, 'v2');
  await execute({ id: 'snapshot-resume', inputs: JSON.stringify(s.f.inputs) });
  const templateStage = s.contexts.find(c => c.skill === STAGE.TEMPLATE_SELECTION).context;
  assert.equal(templateStage.templateSnapshot.commit, s.first);
  assert.equal((await manifest(s.configuration, 'snapshot-resume')).templateSnapshot.commit, s.first);
});

test('a modified template snapshot stops the resumed run with the changed path', async t => {
  const s = await snapshotFixture(t);
  const execute = createOrchestrator({ configuration: s.configuration, executor: s.executor, approvalConsumer: offlineApprovalConsumer });
  const pauseAfterHomepage = state => state.stages[0].status === 'PASSED';
  await execute({ id: 'snapshot-tamper', inputs: JSON.stringify(s.f.inputs) }, { shouldPause: pauseAfterHomepage });
  const state = await manifest(s.configuration, 'snapshot-tamper');
  await writeFile(join(state.templateSnapshot.templateRoot, 'temp1_based_demo', 'package.json'), '{"name":"tampered"}');
  await assert.rejects(execute({ id: 'snapshot-tamper', inputs: JSON.stringify(s.f.inputs) }),
    /TEMPLATE_SNAPSHOT_MODIFIED.*has changes: template\/temp1_based_demo\/package\.json/);
});

test('resuming a run created without a template snapshot fails with an explicit reason', async t => {
  const s = await snapshotFixture(t);
  const legacy = createOrchestrator({ configuration: { ...s.f.configuration }, executor: s.executor, approvalConsumer: offlineApprovalConsumer });
  await legacy({ id: 'snapshot-legacy', inputs: JSON.stringify(s.f.inputs) }, { shouldPause: state => state.stages[0].status === 'PASSED' });
  const execute = createOrchestrator({ configuration: s.configuration, executor: s.executor, approvalConsumer: offlineApprovalConsumer });
  await assert.rejects(execute({ id: 'snapshot-legacy', inputs: JSON.stringify(s.f.inputs) }),
    /TEMPLATE_SNAPSHOT_MISSING_IN_MANIFEST.*snapshot-legacy/);
});
