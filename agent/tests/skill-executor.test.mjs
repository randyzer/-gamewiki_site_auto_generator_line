import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { fixture } from './helpers.mjs';
import { createSkillExecutor } from '../src/skill-executor.mjs';
import { ARTIFACTS, STAGES } from '../src/pipeline.mjs';
import { prepareResearchHandoff, publishDeploymentPlan } from '../src/handoff.mjs';
import { sha256 } from '../src/files.mjs';

test('non-browser executor preserves its sandbox and BLOCKED output without fabricating artifacts', async t => {
  const f = await fixture(t); let invoked;
  const context = { runId: 'worker-fixture', inputs: { ...f.inputs, projectPath: join(f.configuration.workspace, 'site') },
    outputDirectory: join(f.configuration.workspace, 'runs/worker-fixture/artifacts/2/1'), requiredArtifacts: ARTIFACTS[2],
    skillLock: { source: join(f.root, 'skills', STAGES[2] + '.md') }, upstream: [], mode: 'audit-only', templateRoots: f.configuration.templateRoots,
    permissions: { siteWrites: false, productionDeployment: false } };
  const executor = createSkillExecutor({ command: 'offline-codex-fixture', run: async (command, args, options) => {
    invoked = { command, args, options };
    await writeFile(args[args.indexOf('--output-last-message') + 1], JSON.stringify({ status: 'BLOCKED', summary: 'Offline fixture unavailable browser',
      evidence: ['Offline transport fixture'], missing_inputs: [], artifacts: [] }));
  } });
  const result = await executor(STAGES[2], context);
  assert.equal(result.status, 'BLOCKED'); assert.deepEqual(result.artifacts, []);
  assert.ok(invoked.args.includes('--ignore-user-config'));
  assert.equal(invoked.args.includes('--sandbox'), false);
  assert.ok(invoked.args.includes('default_permissions="agent-worker"'));
  assert.ok(!invoked.args.includes('--add-dir'));
  assert.equal(invoked.options.env.FEISHU_APP_SECRET, undefined);
  assert.equal(invoked.options.env.BSK_AUTO_START, '0');
  assert.match(invoked.options.input, /Do not invoke browser commands/);
  assert.match(invoked.options.input, /actual callable image-generation tool/);
  assert.match(invoked.options.input, /No commit, push/);
});

test('research handoff preserves native filenames, verifies bytes and never overwrites conflicts', async t => {
  const f = await fixture(t), runDirectory = join(f.configuration.workspace, 'runs/fixture');
  await mkdir(runDirectory, { recursive: true });
  const projectPath = join(f.configuration.workspace, 'site'); await mkdir(projectPath);
  const snapshot = join(runDirectory, '0-native.md'); await writeFile(snapshot, '# Offline research');
  const artifact = { kind: 'HOMEPAGE_RESEARCH.md', path: snapshot, sourcePath: join(runDirectory, 'Offline Fixture攻略站首页调研信息.md'),
    sha256: sha256('# Offline research'), runId: 'fixture', projectPath, gameIdentity: f.inputs.gameIdentity };
  const context = { runId: 'fixture', runDirectory, inputs: { ...f.inputs, projectPath }, upstream: [{ skill: STAGES[0], artifacts: [artifact] }, { skill: STAGES[1], artifacts: [] }] };
  const output = await prepareResearchHandoff(context);
  const file = join(output.homepageRoot, 'Offline Fixture攻略站首页调研信息.md');
  assert.equal(await readFile(file, 'utf8'), '# Offline research');
  await prepareResearchHandoff(context);
  await writeFile(file, 'user changed research');
  await assert.rejects(prepareResearchHandoff(context), /conflicts/);
});

test('real adapter rejects fabricated empty directories as PASSED', async t => {
  const f = await fixture(t);
  const outputDirectory = join(f.configuration.workspace, 'runs/fake/artifacts/0/1');
  const executor = createSkillExecutor({ run: async (_cmd, args) => {
    const output = args[args.indexOf('--output-last-message') + 1];
    await writeFile(output, JSON.stringify({ status: 'PASSED', summary: 'fake', evidence: ['fake'], missing_inputs: [], artifacts: [{ kind: 'TEMPLATE_SELECTION_REPORT.md', path: outputDirectory }] }));
  } });
  await assert.rejects(executor(STAGES[2], { runId: 'fake', inputs: { ...f.inputs, projectPath: join(f.configuration.workspace, 'site') },
    outputDirectory, requiredArtifacts: ARTIFACTS[2], skillLock: { source: join(f.root, 'skills', STAGES[2] + '.md') }, upstream: [],
    mode: 'audit-only', permissions: { siteWrites: false } }), /outside allowed roots|regular artifact/);
});

test('worker result failures identify parsing and native validation separately', async t => {
  const f = await fixture(t);
  const context = { runId: 'diagnostic', inputs: { ...f.inputs, projectPath: join(f.configuration.workspace, 'site') },
    outputDirectory: join(f.configuration.workspace, 'runs/diagnostic/artifacts/2/1'),
    requiredArtifacts: ARTIFACTS[2], skillLock: { source: join(f.root, 'skills', STAGES[2] + '.md') },
    upstream: [], mode: 'audit-only', permissions: { siteWrites: false } };
  for (const [bytes, operation] of [
    ['invalid-json', 'read-worker-result'],
    [JSON.stringify({ status: 'PASSED', evidence: ['fixture'], missing_inputs: [], artifacts: [] }), 'validate-native-artifacts'],
  ]) {
    const executor = createSkillExecutor({ run: async (_command, args) => {
      await writeFile(args[args.indexOf('--output-last-message') + 1], bytes);
    } });
    await assert.rejects(executor(STAGES[2], context), error => {
      assert.equal(error.diagnosticOperation, operation);
      if (operation === 'read-worker-result') {
        assert.equal(error.code, 'ARTIFACT_INVALID_JSON');
        assert.match(error.message, /worker-result\.json/);
      }
      return true;
    });
  }
});

test('real optimize blocks before any worker or broad write grant', async t => {
  const f = await fixture(t); let invoked = false;
  const executor = createSkillExecutor({ run: async () => { invoked = true; } });
  const result = await executor(STAGES[4], { runId: 'ui', mode: 'optimize', outputDirectory: join(f.configuration.workspace, 'artifacts'),
    skillLock: { source: join(f.root, 'skills', STAGES[4] + '.md') }, requiredArtifacts: ARTIFACTS[4], upstream: [],
    inputs: { ...f.inputs, projectPath: join(f.configuration.workspace, 'site') }, permissions: { siteWrites: true, uiChanges: true } });
  assert.equal(result.status, 'BLOCKED'); assert.equal(invoked, false);
});

test('scoped browser launch permission cannot substitute for a supported command approval broker', async t => {
  const f=await fixture(t);const {AGENT_ROOT}=await import('../src/skill-lock.mjs');
  const policy=await readFile(join(AGENT_ROOT,'config/bsk-command-policy.json'));
  const context={runId:'scoped',inputs:{...f.inputs,projectPath:join(f.configuration.workspace,'site')},
    outputDirectory:join(f.configuration.workspace,'runs/scoped/artifacts/0/1'),requiredArtifacts:ARTIFACTS[0],checkpoint:{attempt:1},
    skillLock:{source:join(f.root,'skills',STAGES[0]+'.md')},upstream:[],permissions:{siteWrites:false}};
  let args;
  const run=async(_command,argv)=>{args=argv;await writeFile(argv[argv.indexOf('--output-last-message')+1],JSON.stringify({status:'BLOCKED',summary:'OFFLINE TOOL FIXTURE',evidence:['offline'],missing_inputs:[],artifacts:[]}));};
  const approval={type:'scoped-bsk-launch',runId:'scoped',expiresAt:Date.now()+10000,policySha256:sha256(policy)};
  const invalid=await createSkillExecutor({run,browserLaunchApproval:{...approval,runId:'wrong'}})(STAGES[0],context);
  assert.equal(invalid.status,'BLOCKED');assert.equal(args,undefined);
  const result=await createSkillExecutor({run,browserLaunchApproval:approval})(STAGES[0],context);
  assert.equal(args,undefined);assert.equal(result.status,'BLOCKED');
  assert.match(result.evidence[0],/APPROVAL_CAPABILITY_UNAVAILABLE/);assert.deepEqual(result.artifacts,[]);
});

test('browser stages without a stage adapter block before worker launch', async t=>{
  const f=await fixture(t);let calls=0;
  for(const index of [0,4,5])for(const approval of [null,{type:'invalid'},
    {type:'scoped-bsk-launch',runId:'browser',expiresAt:Date.now()-1},
    {type:'scoped-bsk-launch',runId:'browser',expiresAt:Date.now()+10000}]) {
    const result=await createSkillExecutor({run:async()=>{calls++;throw Error('Unauthorized worker launch');},browserLaunchApproval:approval})(STAGES[index],{
      runId:'browser',mode:'audit-only',inputs:{...f.inputs,projectPath:join(f.configuration.workspace,'site')},
      outputDirectory:join(f.configuration.workspace,'runs/browser/artifacts/'+index+'/1'),requiredArtifacts:ARTIFACTS[index],
      skillLock:{source:join(f.root,'skills',STAGES[index]+'.md')},permissions:{siteWrites:false}});
    assert.equal(result.status,'BLOCKED');assert.match(result.evidence[0],/APPROVAL_CAPABILITY_UNAVAILABLE/);assert.deepEqual(result.artifacts,[]);
  }
  assert.equal(calls,0);
});

test('keyword research runs the locked Skill CLI with stage-scoped network and environment credentials', async t => {
  const f = await fixture(t), root = join(f.configuration.workspace, 'runs/keyword-network');
  let invoked;
  const executor = createSkillExecutor({ environment: {
    PATH: '/synthetic', HOME: process.env.HOME, CODEX_HOME: process.env.CODEX_HOME,
    SERPER_API_KEY: 'SYNTHETIC_SECRET'
  }, researchPython: process.execPath, researchYtDlp: process.execPath,
  run: async (_command, args, options) => {
    invoked = { args, options };
    await writeFile(args[args.indexOf('--output-last-message') + 1], JSON.stringify({
      status: 'BLOCKED', artifacts: [], missing_inputs: [], evidence: ['SYNTHETIC RESEARCH STOP'] }));
  } });
  const result = await executor(STAGES[1], { runId: 'keyword-network',
    inputs: { ...f.inputs, projectPath: join(f.configuration.workspace, 'site') },
    outputDirectory: join(root, 'artifacts/1/1'), requiredArtifacts: ARTIFACTS[1],
    skillLock: { source: join(f.root, 'skills', STAGES[1] + '.md') }, upstream: [],
    permissions: { siteWrites: false } });
  assert.equal(result.status, 'BLOCKED');
  assert.equal(invoked.options.env.SERPER_API_KEY, 'SYNTHETIC_SECRET');
  assert.match(invoked.args.find(value => value.startsWith('permissions.agent-worker=')), /network=\{enabled=true\}/);
  assert.match(invoked.options.input, /Use the Skill serper command/);
  assert.match(invoked.options.input, /host-tools\/keyword-research\/yt-dlp/);
  assert.equal(invoked.options.input.includes('SYNTHETIC_SECRET'), false);
});

test('validated deployment plan is published to native docs with identical snapshot bytes and no worker site grant', async t => {
  const f = await fixture(t); const projectPath = join(f.configuration.workspace, 'site'); let invoked;
  const executor = createSkillExecutor({ run: async (_command, args, options) => {
    invoked = { args, options };
    const output = args[args.indexOf('--output-last-message') + 1];
    const plan = { schema_version: 1, status: 'AWAITING_CONFIRMATION', confirmation: { status: 'AWAITING_CONFIRMATION' },
      project: { path: projectPath, repository: f.inputs.repo, branch: f.inputs.branch },
      domain: { production_origin: 'https://' + f.inputs.domain }, github_sync: { push_authorized: false },
      architecture: {}, hosting: {}, measurement: {}, checks: [], risks: [], rollback: [] };
    const artifacts = [];
    for (const [kind, bytes] of [['DEPLOYMENT_PLAN.md', '# Offline fixture plan'], ['DEPLOYMENT_PLAN.json', JSON.stringify(plan)]]) {
      const path = join(options.cwd, kind); await writeFile(path, bytes); artifacts.push({ kind, path });
    }
    await writeFile(output, JSON.stringify({ status: 'PASSED', evidence: ['Offline worker fixture'], missing_inputs: [], artifacts }));
  } });
  const context = { runId: 'plan', inputs: { ...f.inputs, projectPath }, outputDirectory: join(f.configuration.workspace, 'runs/plan/artifacts/6/1'),
    requiredArtifacts: ARTIFACTS[6], skillLock: { source: join(f.root, 'skills', STAGES[6] + '.md') },
    upstream: [], mode: 'plan-only', permissions: { siteWrites: false, productionDeployment: false } };
  const result = await executor(STAGES[6], context);
  assert.ok(!invoked.args.includes('--add-dir'));
  for (const artifact of result.artifacts) {
    assert.equal(artifact.sourcePath, join(projectPath, 'docs', artifact.kind));
    const bytes = await readFile(artifact.sourcePath);
    assert.equal(bytes.toString('base64'), artifact.content); assert.equal(sha256(bytes), artifact.sourceSha256);
  }
  await executor(STAGES[6], context);
  await writeFile(join(projectPath, 'docs/DEPLOYMENT_PLAN.md'), 'unconfirmed user plan');
  await assert.rejects(executor(STAGES[6], context), /conflicts/);
  assert.equal(await readFile(join(projectPath, 'docs/DEPLOYMENT_PLAN.md'), 'utf8'), 'unconfirmed user plan');
});

test('deployment plan publication rolls back newly created files after a write failure', async t => {
  const f = await fixture(t); const projectPath = join(f.configuration.workspace, 'site');
  const result = { artifacts: ['DEPLOYMENT_PLAN.md', 'DEPLOYMENT_PLAN.json'].map(kind => ({ kind, content: 'offline fixture', encoding: 'utf8' })) };
  let count = 0;
  await assert.rejects(publishDeploymentPlan({ inputs: { projectPath } }, result, { write: async (...args) => {
    if (++count === 2) throw Error('Offline disk failure'); return writeFile(...args);
  } }), /disk failure/);
  await assert.rejects(access(join(projectPath, 'docs/DEPLOYMENT_PLAN.md')), { code: 'ENOENT' });
  await assert.rejects(access(join(projectPath, 'docs/DEPLOYMENT_PLAN.json')), { code: 'ENOENT' });
});
