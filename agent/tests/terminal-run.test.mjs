import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFile, readFile, access } from 'node:fs/promises';
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

for (const answer of ['n', '', 'yes please', 'Y ', null]) {
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
