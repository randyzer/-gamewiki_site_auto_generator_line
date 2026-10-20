import test from 'node:test';
import assert from 'node:assert/strict';
import { rmSync } from 'node:fs';
import { writeFile, readFile, access, mkdir, chmod, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { runFromTerminal, describeRun } from '../src/terminal-run.mjs';
import { STAGE } from '../src/stages.mjs';
import { sha256 } from '../src/files.mjs';
import { fixture, goodResult } from './helpers.mjs';
import { captureKeywordRecovery, captureStoppedKeywordAttempt } from '../src/keyword-recovery.mjs';
import { researchHandoffApprovalTemplate } from '../src/research-handoff.mjs';

function terminal(answer, { isTTY = true } = {}) {
  const stdin = Readable.from(answer === null ? [] : [answer + '\n']);
  stdin.isTTY = isTTY;
  const lines = [];
  return { stdin, stdout: { write: text => { lines.push(text); return true; } }, text: () => lines.join('') };
}

async function setup(t) {
  const f = await fixture(t);
  const inputsFile = join(f.root, 'inputs.json');
  await writeFile(inputsFile, JSON.stringify(f.inputs));
  const calls = [];
  const executor = async (skill, context) => { calls.push(skill); return goodResult(skill, context); };
  return { f, inputsFile, calls, executor };
}

async function evidencePlan(f, runId, recoverySha256, { serviceStops = [], serviceResumes = [], suffix = '' } = {}) {
  const plan = {
    kind: 'KEYWORD_EVIDENCE_PLAN_V2', runId, stage: STAGE.KEYWORD_RESEARCH, recoverySha256,
    serviceStops, serviceResumes,
    tasks: [{ keyword: 'Fixture guide', rawRows: [1], gap: 'Verify one missing official fact' + suffix,
      tool: 'serper', target: 'Fixture guide official documentation' + suffix,
      expectedEvidence: 'A first-party page body supporting the missing fact',
      acceptanceCriteria: ['Official body supports the missing fixture fact.'],
      stopConditions: ['OFFICIAL_SOURCE_UNAVAILABLE'],
      sourceRequirements: { allowedSourceTypes: ['FIRST_PARTY'], requiresBody: true,
        requiresCurrentAccess: true }, fallbackDisposition: 'KEEP_PARTIAL',
      expectedStatusTransition: { from: 'PARTIAL', to: 'COMPLETED' } }],
    pendingRows: [],
  };
  const bytes = Buffer.from(JSON.stringify(plan, null, 2) + '\n');
  const path = join(f.root, `keyword-evidence-plan${suffix || ''}.json`);
  await writeFile(path, bytes);
  return { path, sha256: sha256(bytes) };
}

async function writeRecoveryLineage(nativeDirectory) {
  await writeFile(join(nativeDirectory, 'RAW_LINEAGE.json'), JSON.stringify({ pendingIds: [], rows: [
    { id: '1', raw: 'fixture guide', final: 'Fixture guide' },
  ] }));
  await writeFile(join(nativeDirectory, 'keywords.json'), JSON.stringify({ categories: [
    { category: 'Guide', keywords: ['Fixture guide'] },
  ] }));
  await writeFile(join(nativeDirectory, 'Fixture guide素材.md'),
    '- 关键词: Fixture guide\n- 状态: PARTIAL\n- 缺口: Verify one missing official fact\n');
}

const manifestPath = (f, id) => join(f.configuration.workspace, 'runs', id, 'manifest.json');

async function prepareHandoffCheckpointFailure(s, runId) {
  const executor = async (skill, context) => {
    s.calls.push(skill);
    if (skill !== STAGE.KEYWORD_RESEARCH) return goodResult(skill, context);
    const native = join(context.outputDirectory, 'native');
    await mkdir(native, { recursive: true });
    await writeRecoveryLineage(native);
    await writeFile(join(native, 'worker-result.json'), JSON.stringify({
      status: 'PARTIAL', evidence: ['SYNTHETIC incomplete research'], missing_inputs: [], artifacts: [],
    }));
    const recovery = await captureKeywordRecovery({ ...context,
      runDirectory: join(s.f.configuration.workspace, 'runs', runId), nativeDirectory: native,
    }, { reason: 'WORKER_STOPPED' });
    await writeFile(join(context.outputDirectory, 'keyword-recovery.json'), JSON.stringify(recovery));
    return { status: 'PARTIAL', artifacts: [], evidence: ['SYNTHETIC incomplete research'], missing_inputs: [] };
  };
  await runFromTerminal({ command: 'run', inputsFile: s.inputsFile, runId,
    configuration: s.f.configuration, executor, ...terminal('y') });
  const path = manifestPath(s.f, runId);
  const manifest = JSON.parse(await readFile(path));
  const keywordStage = manifest.stages[1];
  keywordStage.status = 'FAILED';
  delete keywordStage.checkpoint.researchHandoff;
  keywordStage.diagnostic = {
    stage: STAGE.KEYWORD_RESEARCH, attempt: 1, operation: 'save-stage-checkpoint', code: 'ERROR',
    reason: 'RESEARCH_HANDOFF_INVALID: material gaps: legacy material', at: new Date().toISOString(),
    recordPath: join(s.f.configuration.workspace, 'runs', runId, 'diagnostics', 'synthetic.json'),
  };
  keywordStage.evidence = ['SYNTHETIC checkpoint save failure'];
  const runDirectory = join(s.f.configuration.workspace, 'runs', runId);
  await rm(join(runDirectory, 'research-handoffs'), { recursive: true, force: true });
  await writeFile(path, JSON.stringify(manifest, null, 2) + '\n');
  await writeFile(s.inputsFile, '{}');
  return { path, runDirectory, outputDirectory: join(runDirectory, 'artifacts/1/1') };
}

test('summary shows game, keyword file digest, Skill tree, template source and stages before asking', async t => {
  const s = await setup(t);
  const io = terminal('n');
  await runFromTerminal({ command: 'run', inputsFile: s.inputsFile, runId: 'term-summary',
    configuration: s.f.configuration, executor: s.executor, ...io });
  const text = io.text();
  assert.match(text, /Offline Fixture/);
  assert.ok(text.includes(sha256(await readFile(s.f.inputs.rawKeywordsFile))));
  assert.ok(text.includes(s.f.inputs.rawKeywordsFile));
  for (const stage of [STAGE.HOMEPAGE_RESEARCH, STAGE.DEPLOYMENT_PLAN]) assert.ok(text.includes(stage));
  assert.match(text, /Start this run\? \[y\/N\]/);
});

test('answering y starts the pipeline and returns the stage summary', async t => {
  const s = await setup(t);
  const result = await runFromTerminal({ command: 'run', inputsFile: s.inputsFile, runId: 'term-yes',
    configuration: s.f.configuration, executor: s.executor, ...terminal('y') });
  assert.equal(s.calls[0], STAGE.HOMEPAGE_RESEARCH);
  assert.equal(result.run_id, 'term-yes');
  await access(manifestPath(s.f, 'term-yes'));
});

for (const answer of ['n', '', 'yes please', 'Y', 'Y ', 'y ', ' y', null]) {
  test(`answer ${JSON.stringify(answer)} does not start anything`, async t => {
    const s = await setup(t);
    const result = await runFromTerminal({ command: 'run', inputsFile: s.inputsFile, runId: 'term-no',
      configuration: s.f.configuration, executor: s.executor, ...terminal(answer) });
    assert.equal(result.status, 'CANCELLED');
    assert.equal(s.calls.length, 0);
    await assert.rejects(access(manifestPath(s.f, 'term-no')), { code: 'ENOENT' });
  });
}

test('a non-interactive stdin is refused before any work', async t => {
  const s = await setup(t);
  await assert.rejects(runFromTerminal({ command: 'run', inputsFile: s.inputsFile, runId: 'term-pipe',
    configuration: s.f.configuration, executor: s.executor, ...terminal('y', { isTTY: false }) }),
  /TERMINAL_CONFIRMATION_REQUIRED/);
  assert.equal(s.calls.length, 0);
  await assert.rejects(access(join(s.f.configuration.workspace, 'runs', 'term-pipe')), { code: 'ENOENT' });
});

test('retry resumes the same run after a new confirmation', async t => {
  const s = await setup(t);
  const pausing = async (skill, context) => {
    s.calls.push(skill);
    return skill === STAGE.KEYWORD_RESEARCH
      ? { status: 'BLOCKED', artifacts: [], missing_inputs: [], evidence: ['SYNTHETIC keyword tool unavailable'] }
      : goodResult(skill, context);
  };
  const first = await runFromTerminal({ command: 'run', inputsFile: s.inputsFile, runId: 'term-retry',
    configuration: s.f.configuration, executor: pausing, ...terminal('y') });
  assert.equal(first.status, 'BLOCKED');
  const io = terminal('y');
  const second = await runFromTerminal({ command: 'retry', inputsFile: s.inputsFile, runId: 'term-retry',
    configuration: s.f.configuration, executor: s.executor, ...io });
  assert.match(io.text(), /Retry existing run term-retry/);
  assert.notEqual(second.stage, STAGE.KEYWORD_RESEARCH);
  assert.equal(s.calls.filter(skill => skill === STAGE.HOMEPAGE_RESEARCH).length, 1);
});

test('run refuses an existing run id and retry refuses a missing one', async t => {
  const s = await setup(t);
  await runFromTerminal({ command: 'run', inputsFile: s.inputsFile, runId: 'term-exists',
    configuration: s.f.configuration, executor: s.executor, ...terminal('y') });
  await assert.rejects(runFromTerminal({ command: 'run', inputsFile: s.inputsFile, runId: 'term-exists',
    configuration: s.f.configuration, executor: s.executor, ...terminal('y') }), /RUN_ALREADY_EXISTS.*term-exists.*retry/);
  await assert.rejects(runFromTerminal({ command: 'retry', inputsFile: s.inputsFile, runId: 'term-missing',
    configuration: s.f.configuration, executor: s.executor, ...terminal('y') }), /RUN_NOT_FOUND.*term-missing/);
});

test('invalid inputs fail with the offending value before prompting', async t => {
  const s = await setup(t);
  await writeFile(s.inputsFile, '[]');
  const io = terminal('y');
  await assert.rejects(runFromTerminal({ command: 'run', inputsFile: s.inputsFile, runId: 'term-bad',
    configuration: s.f.configuration, executor: s.executor, ...io }), /RUN_INPUTS_INVALID.*JSON object/);
  assert.equal(io.text(), '');
  await assert.rejects(runFromTerminal({ command: 'run', inputsFile: s.inputsFile, runId: '../escape',
    configuration: s.f.configuration, executor: s.executor, ...io }), /RUN_ID_INVALID.*\.\.\/escape/);
});

test('describeRun reports a missing keyword file instead of a digest', async t => {
  const s = await setup(t);
  const text = await describeRun({ command: 'run', runId: 'x', inputs: { ...s.f.inputs, rawKeywordsFile: '/no/such/file.md' },
    configuration: s.f.configuration });
  assert.match(text, /\/no\/such\/file\.md \(MISSING\)/);
});

test('preview exposes the keyword budget and binds the current retry manifest', async t => {
  const s = await setup(t);
  await runFromTerminal({ command: 'run', inputsFile: s.inputsFile, runId: 'budget-preview',
    configuration: s.f.configuration, executor: s.executor, ...terminal('y') });
  const inputs = { ...s.f.inputs, keywordResearchBudget: { timeoutMs: 1200000, handoffMarginMs: 180000 } };
  await writeFile(s.inputsFile, JSON.stringify(inputs));
  const io = terminal(null, { isTTY: false });
  const before = await runFromTerminal({ command: 'retry', inputsFile: s.inputsFile, runId: 'budget-preview',
    configuration: s.f.configuration, executor: s.executor, preview: true, ...io });
  assert.match(io.text(), /Keyword research budget: 1200000 ms; handoff margin: 180000 ms; source: run-inputs/);
  const path = manifestPath(s.f, 'budget-preview'), manifest = JSON.parse(await readFile(path));
  manifest.sequence++;
  await writeFile(path, JSON.stringify(manifest));
  const after = await runFromTerminal({ command: 'retry', inputsFile: s.inputsFile, runId: 'budget-preview',
    configuration: s.f.configuration, executor: s.executor, preview: true, ...terminal(null, { isTTY: false }) });
  assert.notEqual(before.confirmation_code, after.confirmation_code);
});

test('retry preview validates selected recovery bytes and confirms selection and provider stops', async t => {
  const s = await setup(t), runId = 'selected-recovery';
  const pausing = async (skill, context) => skill === STAGE.KEYWORD_RESEARCH
    ? { status: 'BLOCKED', artifacts: [], missing_inputs: [], evidence: ['SYNTHETIC stop'] } : goodResult(skill, context);
  await runFromTerminal({ command: 'run', inputsFile: s.inputsFile, runId,
    configuration: s.f.configuration, executor: pausing, ...terminal('y') });
  const runDirectory = join(s.f.configuration.workspace, 'runs', runId), native = join(runDirectory, 'artifacts/1/1/native');
  await mkdir(native, { recursive: true });
  await writeFile(join(native, 'one.txt'), 'public evidence one');
  await writeFile(join(native, 'two.txt'), 'public evidence two');
  await writeRecoveryLineage(native);
  const ref = await captureStoppedKeywordAttempt(runDirectory, 1);
  const plan = await evidencePlan(s.f, runId, ref.sha256, { serviceStops: ['youtube-subtitles'] });
  const inputs = { ...s.f.inputs, keywordRecovery: ref, keywordRecoveryDecision: { mode: 'recover' },
    keywordServiceStops: ['youtube-subtitles'], keywordEvidencePlan: plan };
  const preview = async value => {
    await writeFile(s.inputsFile, JSON.stringify(value));
    const io = terminal(null, { isTTY: false });
    const result = await runFromTerminal({ command: 'retry', inputsFile: s.inputsFile, runId,
      configuration: s.f.configuration, executor: s.executor, preview: true, ...io });
    return { ...result, text: io.text() };
  };
  const first = await preview(inputs);
  assert.ok(first.text.includes(ref.sha256));
  assert.match(first.text, /Suspended services \(all keywords\): youtube-subtitles/);
  const second = await preview({ ...inputs, keywordRecovery: { ...ref,
    files: ['one.txt', 'RAW_LINEAGE.json', 'keywords.json', 'Fixture guide素材.md'] } });
  assert.notEqual(first.confirmation_code, second.confirmation_code);
  const thirdPlan = await evidencePlan(s.f, runId, ref.sha256, { suffix: '-third' });
  const third = await preview({ ...inputs, keywordServiceStops: [], keywordEvidencePlan: thirdPlan });
  assert.notEqual(first.confirmation_code, third.confirmation_code);
  const target = join(ref.manifestPath, '..', 'data/one.txt');
  await chmod(target, 0o600); await writeFile(target, 'tampered data');
  await assert.rejects(preview(inputs), /RECOVERY/);
  assert.equal(s.calls.length, 0, 'preview never invokes the executor');
  const manifest = JSON.parse(await readFile(manifestPath(s.f, runId)));
  assert.equal(manifest.stages[1].status, 'BLOCKED');
  assert.equal(manifest.stages[1].checkpoint.attempt, 1);
});

test('retry preview requires an explicit current decision for every recovered provider stop', async t => {
  const s = await setup(t), runId = 'recovered-provider-stops';
  const pausing = async (skill, context) => skill === STAGE.KEYWORD_RESEARCH
    ? { status: 'BLOCKED', artifacts: [], missing_inputs: [], evidence: ['SYNTHETIC stop'] } : goodResult(skill, context);
  await runFromTerminal({ command: 'run', inputsFile: s.inputsFile, runId,
    configuration: s.f.configuration, executor: pausing, ...terminal('y') });
  const runDirectory = join(s.f.configuration.workspace, 'runs', runId);
  const native = join(runDirectory, 'artifacts/1/1/native');
  await mkdir(native, { recursive: true });
  await writeFile(join(native, 'evidence.txt'), 'saved evidence');
  await writeRecoveryLineage(native);
  await writeFile(join(native, 'SERVICE_BLOCKERS.json'), JSON.stringify({ resumeAuthorized: false, stops: [
    { provider: 'youtube', operation: 'youtube-subs', reason: 'HTTP 429' },
    { provider: 'steamcommunity.com', operation: 'selected public page open', reason: 'HTTP 429' },
  ] }));
  const ref = await captureStoppedKeywordAttempt(runDirectory, 1);
  const common = { ...s.f.inputs, keywordRecovery: ref, keywordRecoveryDecision: { mode: 'recover' } };
  const preview = async value => {
    await writeFile(s.inputsFile, JSON.stringify(value));
    const io = terminal(null, { isTTY: false });
    const result = await runFromTerminal({ command: 'retry', inputsFile: s.inputsFile, runId,
      configuration: s.f.configuration, executor: s.executor, preview: true, ...io });
    return { ...result, text: io.text() };
  };

  await assert.rejects(preview(common), /KEYWORD_SERVICE_DECISION_REQUIRED.*steam-community.*youtube-subtitles/);
  await assert.rejects(preview({ ...common, keywordServiceStops: ['youtube-subtitles'], keywordServiceResumes: [] }),
    /KEYWORD_SERVICE_DECISION_REQUIRED.*steam-community/);

  const suspendedPlan = await evidencePlan(s.f, runId, ref.sha256,
    { serviceStops: ['steam-community', 'youtube-subtitles'], suffix: '-suspended' });
  const suspended = await preview({ ...common,
    keywordServiceStops: ['steam-community', 'youtube-subtitles'], keywordServiceResumes: [],
    keywordEvidencePlan: suspendedPlan });
  assert.match(suspended.text, /Recovered service restrictions: steam-community, youtube-subtitles/);
  assert.match(suspended.text, /Explicitly resumed services: \(none\)/);

  const resumedPlan = await evidencePlan(s.f, runId, ref.sha256,
    { serviceStops: ['steam-community'], serviceResumes: ['youtube-subtitles'], suffix: '-resumed' });
  const resumed = await preview({ ...common,
    keywordServiceStops: ['steam-community'], keywordServiceResumes: ['youtube-subtitles'],
    keywordEvidencePlan: resumedPlan });
  assert.notEqual(suspended.confirmation_code, resumed.confirmation_code);
  assert.match(resumed.text, /Explicitly resumed services: youtube-subtitles/);
  await assert.rejects(preview({ ...common,
    keywordServiceStops: ['youtube-subtitles'], keywordServiceResumes: ['youtube-subtitles', 'steam-community'] }),
  /KEYWORD_SERVICE_DECISION_INVALID/);
});

test('recovery preview refuses to launch without a bound incremental evidence plan', async t => {
  const s = await setup(t), runId = 'recovery-evidence-plan';
  const pausing = async (skill, context) => skill === STAGE.KEYWORD_RESEARCH
    ? { status: 'PARTIAL', artifacts: [], missing_inputs: [], evidence: ['SYNTHETIC incomplete research'] }
    : goodResult(skill, context);
  await runFromTerminal({ command: 'run', inputsFile: s.inputsFile, runId,
    configuration: s.f.configuration, executor: pausing, ...terminal('y') });
  const runDirectory = join(s.f.configuration.workspace, 'runs', runId);
  const native = join(runDirectory, 'artifacts/1/1/native');
  await mkdir(native, { recursive: true });
  await writeFile(join(native, 'evidence.txt'), 'saved evidence');
  await writeRecoveryLineage(native);
  const recovery = await captureStoppedKeywordAttempt(runDirectory, 1);
  const common = { ...s.f.inputs, keywordRecovery: recovery, keywordRecoveryDecision: { mode: 'recover' },
    keywordServiceStops: [], keywordServiceResumes: [] };
  await writeFile(s.inputsFile, JSON.stringify(common));
  await assert.rejects(runFromTerminal({ command: 'retry', inputsFile: s.inputsFile, runId,
    configuration: s.f.configuration, executor: s.executor, preview: true,
    ...terminal(null, { isTTY: false }) }), /KEYWORD_EVIDENCE_PLAN_REQUIRED/);

  const plan = await evidencePlan(s.f, runId, recovery.sha256);
  await writeFile(s.inputsFile, JSON.stringify({ ...common, keywordEvidencePlan: plan }));
  const io = terminal(null, { isTTY: false });
  const first = await runFromTerminal({ command: 'retry', inputsFile: s.inputsFile, runId,
    configuration: s.f.configuration, executor: s.executor, preview: true, ...io });
  assert.match(io.text(), /Keyword evidence plan: .*keyword-evidence-plan\.json/);
  assert.match(io.text(), /Evidence tasks: 1/);
  const changedPlan = await evidencePlan(s.f, runId, recovery.sha256, { suffix: '-changed' });
  await writeFile(s.inputsFile, JSON.stringify({ ...common, keywordEvidencePlan: changedPlan }));
  const second = await runFromTerminal({ command: 'retry', inputsFile: s.inputsFile, runId,
    configuration: s.f.configuration, executor: s.executor, preview: true,
    ...terminal(null, { isTTY: false }) });
  assert.notEqual(first.confirmation_code, second.confirmation_code);
  assert.equal(s.calls.length, 0, 'preview never invokes the executor');
  await rm(s.inputsFile);
  await rm(changedPlan.path);
  const result = await runFromTerminal({ command: 'retry', previewId: second.preview_id,
    confirm: second.confirmation_code, runId, configuration: s.f.configuration,
    executor: s.executor, ...terminal(null, { isTTY: false }) });
  assert.notEqual(result.status, 'FAILED');
  const completed = JSON.parse(await readFile(manifestPath(s.f, runId)));
  assert.equal(completed.stages[1].checkpoint.executionReceipt.kind, 'KEYWORD_RECOVERY_EXECUTION_V2');
  assert.equal(completed.stages[1].checkpoint.executionReceipt.previewSnapshot.previewId, second.preview_id);
});

test('a stopped keyword attempt with a recovery snapshot requires an explicit recovery decision', async t => {
  const s = await setup(t), runId = 'recovery-decision';
  const stopped = async (skill, context) => {
    s.calls.push(skill);
    if (skill !== STAGE.KEYWORD_RESEARCH) return goodResult(skill, context);
    await mkdir(context.outputDirectory, { recursive: true });
    await writeFile(join(context.outputDirectory, 'keyword-recovery.json'), JSON.stringify({ synthetic: true }));
    return { status: 'FAILED', artifacts: [], missing_inputs: [], evidence: ['SYNTHETIC stopped research'] };
  };
  await runFromTerminal({ command: 'run', inputsFile: s.inputsFile, runId,
    configuration: s.f.configuration, executor: stopped, ...terminal('y') });

  await assert.rejects(runFromTerminal({ command: 'retry', inputsFile: s.inputsFile, runId,
    configuration: s.f.configuration, executor: s.executor, preview: true, ...terminal(null, { isTTY: false }) }),
  /KEYWORD_RECOVERY_DECISION_REQUIRED/);

  const inheritedPath = manifestPath(s.f, runId);
  const inherited = JSON.parse(await readFile(inheritedPath));
  inherited.inputs.keywordRecoveryDecision = { mode: 'fresh' };
  await writeFile(inheritedPath, JSON.stringify(inherited));
  await assert.rejects(runFromTerminal({ command: 'retry', inputsFile: s.inputsFile, runId,
    configuration: s.f.configuration, executor: s.executor, preview: true, ...terminal(null, { isTTY: false }) }),
  /KEYWORD_RECOVERY_DECISION_REQUIRED/, 'the current input file must make the decision explicitly');

  await writeFile(s.inputsFile, JSON.stringify({ ...s.f.inputs, keywordRecoveryDecision: { mode: 'fresh' } }));
  const previewIo = terminal(null, { isTTY: false });
  const previewResult = await runFromTerminal({ command: 'retry', inputsFile: s.inputsFile, runId,
    configuration: s.f.configuration, executor: s.executor, preview: true, ...previewIo });
  assert.match(previewIo.text(), /Keyword recovery decision: fresh/);
  const confirmed = await runFromTerminal({ command: 'retry', inputsFile: s.inputsFile, runId,
    configuration: s.f.configuration, executor: s.executor, confirm: previewResult.confirmation_code,
    ...terminal(null, { isTTY: false }) });
  assert.notEqual(confirmed.status, 'FAILED');
  const manifest = JSON.parse(await readFile(manifestPath(s.f, runId)));
  assert.equal(manifest.stages[1].checkpoint.executionReceipt.decision.mode, 'fresh');
  assert.match(manifest.stages[1].checkpoint.executionReceipt.inputsFileSha256, /^[a-f0-9]{64}$/);
  assert.match(manifest.stages[1].checkpoint.executionReceipt.manifestSha256, /^[a-f0-9]{64}$/);
});

test('retry preview recovers only a failed Stage 2 handoff checkpoint and does not start a new attempt', async t => {
  const s = await setup(t), runId = 'handoff-checkpoint-recovery';
  const { path } = await prepareHandoffCheckpointFailure(s, runId);

  const previewIo = terminal(null, { isTTY: false });
  const preview = await runFromTerminal({ command: 'retry', inputsFile: s.inputsFile, runId,
    configuration: s.f.configuration, executor: s.executor, preview: true, ...previewIo });
  assert.match(previewIo.text(), /Recover Stage 2 research handoff checkpoint from attempt 1/);
  assert.match(previewIo.text(), /No keyword research worker will run/);
  const callsBefore = s.calls.length;
  const result = await runFromTerminal({ command: 'retry', previewId: preview.preview_id,
    confirm: preview.confirmation_code, runId, configuration: s.f.configuration,
    executor: async () => assert.fail('checkpoint recovery must not invoke a worker'),
    ...terminal(null, { isTTY: false }) });
  assert.equal(s.calls.length, callsBefore);
  assert.equal(result.status, 'PARTIAL');
  const recovered = JSON.parse(await readFile(path)).stages[1];
  assert.equal(recovered.checkpoint.attempt, 1);
  assert.equal(recovered.checkpoint.researchHandoff.approved, false);
  assert.equal(JSON.parse(await readFile(path)).deploymentExecuted, false);
});

test('exact PARTIAL handoff approval previews and continues without rerunning keyword research', async t => {
  const s = await setup(t), runId = 'handoff-approval-preview';
  await prepareHandoffCheckpointFailure(s, runId);
  const recoveryPreview = await runFromTerminal({ command: 'retry', inputsFile: s.inputsFile, runId,
    configuration: s.f.configuration, executor: s.executor, preview: true,
    ...terminal(null, { isTTY: false }) });
  await runFromTerminal({ command: 'retry', previewId: recoveryPreview.preview_id,
    confirm: recoveryPreview.confirmation_code, runId, configuration: s.f.configuration,
    executor: async () => assert.fail('checkpoint recovery must not invoke a worker'),
    ...terminal(null, { isTTY: false }) });

  const recovered = JSON.parse(await readFile(manifestPath(s.f, runId)));
  const handoff = recovered.stages[1].checkpoint.researchHandoff;
  const candidate = JSON.parse(await readFile(handoff.path));
  const approval = researchHandoffApprovalTemplate(handoff, candidate);
  await writeFile(s.inputsFile, JSON.stringify({ researchHandoffApproval: approval,
    siteRevision: recovered.inputs.siteRevision }));
  await assert.rejects(runFromTerminal({ command: 'retry', inputsFile: s.inputsFile, runId,
    configuration: s.f.configuration, executor: s.executor, preview: true,
    ...terminal(null, { isTTY: false }) }), /RESEARCH_HANDOFF_APPROVAL_INVALID/);
  await writeFile(s.inputsFile, JSON.stringify({ researchHandoffApproval: {
    ...approval, handoffSha256: 'a'.repeat(64),
  } }));
  await assert.rejects(runFromTerminal({ command: 'retry', inputsFile: s.inputsFile, runId,
    configuration: s.f.configuration, executor: s.executor, preview: true,
    ...terminal(null, { isTTY: false }) }), /exactly match/);

  await writeFile(s.inputsFile, JSON.stringify({ researchHandoffApproval: approval }));
  const previewIo = terminal(null, { isTTY: false });
  const preview = await runFromTerminal({ command: 'retry', inputsFile: s.inputsFile, runId,
    configuration: s.f.configuration, executor: s.executor, preview: true, ...previewIo });
  assert.match(previewIo.text(), /Approve Stage 2 PARTIAL research handoff from attempt 1/);
  assert.match(previewIo.text(), /DRAFT_ONLY: 1; OMIT: 0; PUBLISH: 0/);
  assert.match(previewIo.text(), /may run real downstream workers starting with game-site-template-selector/);
  assert.match(previewIo.text(), /does not authorize deployment/);
  const keywordCalls = s.calls.filter(skill => skill === STAGE.KEYWORD_RESEARCH).length;
  await runFromTerminal({ command: 'retry', previewId: preview.preview_id,
    confirm: preview.confirmation_code, runId, configuration: s.f.configuration,
    executor: s.executor, ...terminal(null, { isTTY: false }) });
  const approved = JSON.parse(await readFile(manifestPath(s.f, runId)));
  assert.equal(approved.stages[1].status, 'PARTIAL');
  assert.equal(approved.stages[1].checkpoint.researchHandoff.approved, true);
  assert.equal(s.calls.filter(skill => skill === STAGE.KEYWORD_RESEARCH).length, keywordCalls);
  assert.notEqual(approved.stages[2].status, 'NOT_STARTED');
  assert.equal(approved.deploymentExecuted, false);
});

test('checkpoint-recovery confirmation fails closed when preview evidence changes', async t => {
  const scenarios = [
    ['recovery reference changes', async ({ outputDirectory }) => {
      const path = join(outputDirectory, 'keyword-recovery.json');
      const ref = JSON.parse(await readFile(path));
      ref.sha256 = 'a'.repeat(64);
      await writeFile(path, JSON.stringify(ref));
    }],
    ['failure diagnostic changes', async ({ path }) => {
      const manifest = JSON.parse(await readFile(path));
      manifest.stages[1].diagnostic.reason = 'RESEARCH_HANDOFF_INVALID: changed after preview';
      await writeFile(path, JSON.stringify(manifest));
    }],
    ['worker result disappears', async ({ outputDirectory }) => {
      await rm(join(outputDirectory, 'native', 'worker-result.json'));
    }],
    ['recovery reference disappears', async ({ outputDirectory }) => {
      await rm(join(outputDirectory, 'keyword-recovery.json'));
    }],
  ];
  for (const [index, [name, mutate]] of scenarios.entries()) await t.test(name, async subtest => {
    const s = await setup(subtest), runId = `checkpoint-fail-closed-${index}`;
    const prepared = await prepareHandoffCheckpointFailure(s, runId);
    const preview = await runFromTerminal({ command: 'retry', inputsFile: s.inputsFile, runId,
      configuration: s.f.configuration, executor: s.executor, preview: true,
      ...terminal(null, { isTTY: false }) });
    await mutate(prepared);
    let workerCalls = 0;
    await assert.rejects(runFromTerminal({ command: 'retry', previewId: preview.preview_id,
      confirm: preview.confirmation_code, runId, configuration: s.f.configuration,
      executor: async () => { workerCalls++; throw Error('WORKER_RETRY_MUST_NOT_RUN'); },
      ...terminal(null, { isTTY: false }) }));
    assert.equal(workerCalls, 0, 'ineligible checkpoint recovery must never fall through to a worker retry');
    const after = JSON.parse(await readFile(prepared.path));
    assert.equal(after.stages[1].status, 'FAILED');
    assert.equal(after.stages[1].checkpoint.attempt, 1);
    assert.equal(after.deploymentExecuted, false);
  });
});

test('checkpoint-recovery intent cannot fall through after confirmation', async t => {
  const s = await setup(t), runId = 'checkpoint-post-confirmation-stale';
  const prepared = await prepareHandoffCheckpointFailure(s, runId);
  const preview = await runFromTerminal({ command: 'retry', inputsFile: s.inputsFile, runId,
    configuration: s.f.configuration, executor: s.executor, preview: true,
    ...terminal(null, { isTTY: false }) });
  let workerCalls = 0;
  const executor = async () => { workerCalls++; throw Error('WORKER_RETRY_MUST_NOT_RUN'); };
  let invalidated = false;
  Object.defineProperty(executor, 'installDependencies', { get() {
    if (!invalidated) {
      rmSync(join(prepared.outputDirectory, 'native', 'worker-result.json'));
      invalidated = true;
    }
    return undefined;
  } });
  await assert.rejects(runFromTerminal({ command: 'retry', previewId: preview.preview_id,
    confirm: preview.confirmation_code, runId, configuration: s.f.configuration, executor,
    ...terminal(null, { isTTY: false }) }), /RESEARCH_HANDOFF_CHECKPOINT_RECOVERY_STALE/);
  assert.equal(workerCalls, 0, 'confirmed checkpoint recovery must never become a worker retry');
  const after = JSON.parse(await readFile(prepared.path));
  assert.equal(after.stages[1].status, 'FAILED');
  assert.equal(after.stages[1].checkpoint.attempt, 1);
  assert.equal(after.deploymentExecuted, false);
});

test('a terminal run executes the approved plan on retry and reports the deployment', async t => {
  const s = await setup(t);
  const first = await runFromTerminal({ command: 'run', inputsFile: s.inputsFile, runId: 'term-deploy',
    configuration: s.f.configuration, executor: s.executor, ...terminal('y') });
  assert.equal(first.status, 'WAITING_FOR_USER');
  assert.equal(first.stage, STAGE.DEPLOYMENT_PLAN);
  assert.deepEqual(first.missing_inputs, ['deploymentPlanApproval']);
  const inputs = { ...s.f.inputs, deploymentPlanApproval: { approved: true, digest: first.plan_digest } };
  await writeFile(s.inputsFile, JSON.stringify(inputs));
  const io = terminal('y');
  const second = await runFromTerminal({ command: 'retry', inputsFile: s.inputsFile, runId: 'term-deploy',
    configuration: s.f.configuration, executor: s.executor, ...io });
  // The operator must see that this "y" approves a production deployment of exactly this plan.
  assert.match(io.text(), new RegExp(`DEPLOY TO PRODUCTION: approves plan ${first.plan_digest}`));
  assert.ok(io.text().includes(join(s.f.inputs.paths.siteDirectory, 'docs', 'DEPLOYMENT_PLAN.md')));
  assert.equal(second.status, 'PASSED');
  assert.equal(second.deployment_executed, true);
  assert.equal(s.calls.filter(skill => skill === STAGE.DEPLOYMENT_PLAN).length, 2);
  const report = await readFile(join(s.f.configuration.workspace, 'runs', 'term-deploy', 'AGENT_RUN_REPORT.md'), 'utf8');
  assert.match(report, /Production deployed: true/);
});

async function preview(s, { command = 'run', runId = 'code-run' } = {}) {
  const io = terminal(null, { isTTY: false });
  const result = await runFromTerminal({ command, runId, inputsFile: s.inputsFile,
    configuration: s.f.configuration, executor: s.executor, preview: true, ...io });
  const match = io.text().match(/Confirmation code: ([a-f0-9]{16})\n$/);
  assert.ok(match, io.text());
  assert.equal(result.status, 'PREVIEW');
  assert.doesNotMatch(io.text(), /Start this run/);
  assert.match(result.preview_id, /^[a-f0-9-]{36}$/);
  return { code: match[1], previewId: result.preview_id, text: io.text() };
}

const confirmRun = (s, code, { command = 'run', runId = 'code-run', io = terminal(null, { isTTY: false }) } = {}) =>
  runFromTerminal({ command, runId, inputsFile: s.inputsFile, configuration: s.f.configuration,
    executor: s.executor, confirm: code, ...io });

const confirmSnapshot = (s, preview, { command = 'run', runId = 'code-run',
  io = terminal(null, { isTTY: false }) } = {}) => runFromTerminal({ command, runId,
  previewId: preview.previewId, configuration: s.f.configuration, executor: s.executor,
  confirm: preview.code, ...io });

test('snapshot confirmation survives removal of the caller-owned inputs file', async t => {
  const s = await setup(t);
  const approved = await preview(s, { runId: 'durable-inputs' });
  await assert.rejects(runFromTerminal({ command: 'run', runId: 'durable-inputs',
    previewId: approved.previewId, confirm: 'wrong-code', configuration: s.f.configuration,
    executor: s.executor, ...terminal(null, { isTTY: false }) }), /CONFIRMATION_CODE_MISMATCH/);
  await rm(s.inputsFile);
  const result = await confirmSnapshot(s, approved, { runId: 'durable-inputs' });
  assert.equal(result.run_id, 'durable-inputs');
  assert.equal(s.calls[0], STAGE.HOMEPAGE_RESEARCH);
  await access(manifestPath(s.f, 'durable-inputs'));
});

test('two CLI processes cannot execute the same snapshot confirmation twice', async t => {
  const s = await setup(t), runId = 'snapshot-concurrent-cli';
  const approved = await preview(s, { runId });
  const configurationPath = join(s.f.root, 'configuration.json');
  const markerPath = join(s.f.root, 'executor-pids.txt');
  const childPath = join(s.f.root, 'confirm-child.mjs');
  await writeFile(configurationPath, JSON.stringify(s.f.configuration));
  await writeFile(childPath, `
import { appendFile, readFile } from 'node:fs/promises';
import { runFromTerminal } from ${JSON.stringify(new URL('../src/terminal-run.mjs', import.meta.url).href)};
import { goodResult } from ${JSON.stringify(new URL('./helpers.mjs', import.meta.url).href)};
const configuration = JSON.parse(await readFile(process.argv[2], 'utf8'));
const executor = async (skill, context) => {
  await appendFile(process.argv[6], process.pid + '\\n');
  await new Promise(resolve => setTimeout(resolve, 25));
  return goodResult(skill, context);
};
try {
  const result = await runFromTerminal({ command: 'run', previewId: process.argv[3],
    confirm: process.argv[4], runId: process.argv[5], configuration, executor });
  process.stdout.write(JSON.stringify(result));
} catch (error) {
  process.stderr.write(error.message + '\\n');
  process.exitCode = 1;
}
`);
  const invoke = () => new Promise(resolve => {
    const child = spawn(process.execPath, [childPath, configurationPath, approved.previewId,
      approved.code, runId, markerPath], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('close', code => resolve({ code, stdout, stderr }));
  });
  const results = await Promise.all([invoke(), invoke()]);
  assert.equal(results.filter(result => result.code === 0).length, 1, JSON.stringify(results));
  assert.equal(results.filter(result => result.code !== 0 &&
    /RUN_PREVIEW_ALREADY_CONSUMED|RUN_ALREADY_EXISTS/.test(result.stderr)).length, 1, JSON.stringify(results));
  const executorPids = (await readFile(markerPath, 'utf8')).trim().split('\n');
  assert.equal(new Set(executorPids).size, 1, 'only one CLI process may invoke the executor');
});

test('snapshot confirmation rejects manifest drift before invoking the executor', async t => {
  const s = await setup(t), runId = 'snapshot-manifest-drift';
  await runFromTerminal({ command: 'run', inputsFile: s.inputsFile, runId,
    configuration: s.f.configuration, executor: s.executor, ...terminal('y') });
  const approved = await preview(s, { command: 'retry', runId });
  const path = manifestPath(s.f, runId), original = await readFile(path);
  const manifest = JSON.parse(original);
  manifest.sequence++;
  await writeFile(path, JSON.stringify(manifest));
  const before = s.calls.length;
  await assert.rejects(confirmSnapshot(s, approved, { command: 'retry', runId }),
    /RUN_PREVIEW_STALE/);
  assert.equal(s.calls.length, before);
  await writeFile(path, original);
  const resumed = await confirmSnapshot(s, approved, { command: 'retry', runId });
  assert.notEqual(resumed.status, 'FAILED');
});

test('preview prints the exact summary and deterministic SHA256 code without creating a manifest or executing', async t => {
  const s = await setup(t);
  const first = await preview(s), second = await preview(s);
  assert.equal(first.code, second.code);
  const summary = await describeRun({ command: 'run', runId: 'code-run', inputs: s.f.inputs, configuration: s.f.configuration });
  const keys = new Set();
  JSON.stringify(s.f.inputs, (key, value) => { keys.add(key); return value; });
  const normalized = JSON.stringify(s.f.inputs, [...keys].sort());
  assert.equal(first.code, sha256('run' + 'code-run' + summary + normalized).slice(0, 16));
  assert.equal(first.text, summary + `Preview ID: ${first.previewId}\nConfirmation code: ${first.code}\n`);
  assert.notEqual(first.previewId, second.previewId);
  await assert.rejects(access(manifestPath(s.f, 'code-run')), { code: 'ENOENT' });
  assert.equal(s.calls.length, 0);
});

test('the current code starts without interactive stdin and logs the confirmation method', async t => {
  const s = await setup(t);
  const { code } = await preview(s);
  const io = terminal(null, { isTTY: false });
  const result = await confirmRun(s, code, { io });
  assert.equal(result.run_id, 'code-run');
  assert.equal(s.calls[0], STAGE.HOMEPAGE_RESEARCH);
  await access(manifestPath(s.f, 'code-run'));
  assert.match(io.text(), /Confirmation method: confirmation-code\n/);
  assert.doesNotMatch(io.text(), /Start this run/);
});

test('wrong and empty codes refuse even interactive y, include both codes, and create no run', async t => {
  const s = await setup(t);
  const { code } = await preview(s);
  for (const supplied of ['wrong-code', '']) {
    await assert.rejects(confirmRun(s, supplied, { io: terminal('y') }), error => {
      assert.match(error.message, /CONFIRMATION_CODE_MISMATCH/);
      assert.ok(error.message.includes(JSON.stringify(supplied)));
      assert.ok(error.message.includes(code));
      assert.match(error.message, /inputs\.json.*RUN_ID.*command/);
      return true;
    });
  }
  assert.equal(s.calls.length, 0);
  await assert.rejects(access(manifestPath(s.f, 'code-run')), { code: 'ENOENT' });
});

for (const [field, value] of [['objective', 'Changed objective'], ['domain', 'changed.test'], ['repo', 'changed/repo'],
  ['extra', { nested: ['changed', null, true, 1] }]]) {
  test(`changing ${field} invalidates a code even when absent from the summary`, async t => {
    const s = await setup(t);
    const old = await preview(s);
    await writeFile(s.inputsFile, JSON.stringify({ ...s.f.inputs, [field]: value }));
    const current = await preview(s);
    assert.notEqual(current.code, old.code);
    await assert.rejects(confirmRun(s, old.code), error => {
      assert.ok(error.message.includes(old.code));
      assert.ok(error.message.includes(current.code));
      return true;
    });
    assert.equal(s.calls.length, 0);
    await assert.rejects(access(manifestPath(s.f, 'code-run')), { code: 'ENOENT' });
  });
}

test('recursive object key order and whitespace do not change codes; array order does', async t => {
  const s = await setup(t);
  const extra = JSON.parse('{"z":[{"b":2,"a":1},null,true],"a":{"10":"ten","2":"two","__proto__":{"b":2,"a":1}}}');
  const original = { ...s.f.inputs, extra };
  await writeFile(s.inputsFile, JSON.stringify(original));
  const first = await preview(s);
  const reverse = value => Array.isArray(value) ? value.map(reverse) : value && typeof value === 'object'
    ? Object.fromEntries(Object.entries(value).reverse().map(([key, item]) => [key, reverse(item)])) : value;
  await writeFile(s.inputsFile, JSON.stringify(reverse(original), null, 4) + '\n');
  assert.equal((await preview(s)).code, first.code);
  extra.z.reverse();
  await writeFile(s.inputsFile, JSON.stringify(original));
  assert.notEqual((await preview(s)).code, first.code);
});

test('RUN_ID and command type are bound into each code', async t => {
  const s = await setup(t);
  const first = await preview(s);
  assert.notEqual((await preview(s, { runId: 'other-run' })).code, first.code);
  const directory = join(s.f.configuration.workspace, 'runs', 'code-run');
  await mkdir(directory, { recursive: true });
  const bytes = JSON.stringify({ inputs: s.f.inputs });
  await writeFile(join(directory, 'manifest.json'), bytes);
  const retry = await preview(s, { command: 'retry' });
  assert.notEqual(retry.code, first.code);
  await assert.rejects(confirmRun(s, first.code, { command: 'retry' }), error =>
    error.message.includes(first.code) && error.message.includes(retry.code));
  assert.equal(await readFile(join(directory, 'manifest.json'), 'utf8'), bytes);
  assert.equal(s.calls.length, 0);
});

test('deployment approval changes retry code; stale code leaves manifest untouched and current code deploys', async t => {
  const s = await setup(t);
  const first = await runFromTerminal({ command: 'run', runId: 'code-run', inputsFile: s.inputsFile,
    configuration: s.f.configuration, executor: s.executor, ...terminal('y') });
  assert.equal(first.status, 'WAITING_FOR_USER');
  const old = await preview(s, { command: 'retry' });
  const before = await readFile(manifestPath(s.f, 'code-run'), 'utf8');
  const callsBefore = s.calls.length;
  await writeFile(s.inputsFile, JSON.stringify({ ...s.f.inputs,
    deploymentPlanApproval: { approved: true, digest: first.plan_digest } }));
  const current = await preview(s, { command: 'retry' });
  assert.notEqual(current.code, old.code);
  assert.match(current.text, /DEPLOY TO PRODUCTION/);
  await assert.rejects(confirmRun(s, old.code, { command: 'retry' }), error =>
    error.message.includes(old.code) && error.message.includes(current.code));
  assert.equal(s.calls.length, callsBefore);
  assert.equal(await readFile(manifestPath(s.f, 'code-run'), 'utf8'), before);
  const result = await confirmRun(s, current.code, { command: 'retry' });
  assert.equal(result.status, 'PASSED');
  assert.equal(result.deployment_executed, true);
});

test('preview and confirm cannot be combined', async t => {
  const s = await setup(t);
  await assert.rejects(runFromTerminal({ command: 'run', runId: 'code-run', inputsFile: s.inputsFile,
    configuration: s.f.configuration, executor: s.executor, preview: true, confirm: 'anything', ...terminal('y') }),
  /RUN_ARGUMENTS_INVALID/);
  assert.equal(s.calls.length, 0);
  await assert.rejects(access(join(s.f.configuration.workspace, 'runs')), { code: 'ENOENT' });
});
