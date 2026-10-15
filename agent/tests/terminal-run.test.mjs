import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFile, readFile, access, mkdir, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { runFromTerminal, describeRun } from '../src/terminal-run.mjs';
import { STAGE } from '../src/stages.mjs';
import { sha256 } from '../src/files.mjs';
import { fixture, goodResult } from './helpers.mjs';

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

const manifestPath = (f, id) => join(f.configuration.workspace, 'runs', id, 'manifest.json');

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
  return { code: match[1], text: io.text() };
}

const confirmRun = (s, code, { command = 'run', runId = 'code-run', io = terminal(null, { isTTY: false }) } = {}) =>
  runFromTerminal({ command, runId, inputsFile: s.inputsFile, configuration: s.f.configuration,
    executor: s.executor, confirm: code, ...io });

test('preview prints the exact summary and deterministic SHA256 code without creating runs or executing', async t => {
  const s = await setup(t);
  const before = await readdir(s.f.configuration.workspace);
  const first = await preview(s), second = await preview(s);
  assert.equal(first.code, second.code);
  const summary = await describeRun({ command: 'run', runId: 'code-run', inputs: s.f.inputs, configuration: s.f.configuration });
  const keys = new Set();
  JSON.stringify(s.f.inputs, (key, value) => { keys.add(key); return value; });
  const normalized = JSON.stringify(s.f.inputs, [...keys].sort());
  assert.equal(first.code, sha256('run' + 'code-run' + summary + normalized).slice(0, 16));
  assert.equal(first.text, summary + `Confirmation code: ${first.code}\n`);
  assert.deepEqual(await readdir(s.f.configuration.workspace), before);
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
  await assert.rejects(access(join(s.f.configuration.workspace, 'runs')), { code: 'ENOENT' });
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
    await assert.rejects(access(join(s.f.configuration.workspace, 'runs')), { code: 'ENOENT' });
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
