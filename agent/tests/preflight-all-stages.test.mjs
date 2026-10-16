import test from 'node:test';
import assert from 'node:assert/strict';
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { STAGES } from '../src/stages.mjs';

const moduleUrl = new URL('../../scripts/preflight-all-stages.mjs', import.meta.url);
async function implementation() {
  assert.equal(await access(moduleUrl).then(() => true, () => false), true,
    'all-stage environment selfcheck implementation is required');
  return import(moduleUrl);
}

test('probe matrix defines P1–P13 and applicability for all seven formal stages', async () => {
  const { PROBE_MATRIX } = await implementation();
  assert.deepEqual(PROBE_MATRIX.map(row => row.skill), STAGES);
  const applicable = [
    [1, 2, 4, 5, 8, 12], [1, 2, 4, 5, 6, 7, 8, 12, 13],
    [1, 2, 4, 5, 8, 12], [1, 2, 3, 4, 5, 8, 9, 12],
    [1, 2, 3, 4, 5, 8, 9, 12], [1, 2, 3, 4, 5, 8, 9, 12],
    [2, 3, 4, 5],
  ];
  for (const [index, row] of PROBE_MATRIX.entries()) {
    assert.deepEqual(row.probes.map(probe => probe.id), Array.from({ length: 13 }, (_, i) => `P${i + 1}`));
    assert.deepEqual(row.probes.filter(probe => probe.applicable).map(probe => Number(probe.id.slice(1))), applicable[index]);
  }
});

test('report JSON and table redact secret values from commands, outputs and errors', async () => {
  const { createReport, recordStage, serializeReport, formatTable } = await implementation();
  const secret = 'fake-serper-selfcheck-canary';
  const environment = { SERPER_API_KEY: secret, OTHER_SECRET: 'fake-other-canary' };
  const report = createReport();
  recordStage(report, 1, [{ id: 'P1', command: `check ${secret}`, expectedExit: 0 }], [
    { command: `check ${secret}`, output: `unexpected ${secret}\n${environment.OTHER_SECRET}`, exitCode: 1 },
  ], { error: `worker error ${secret}`, environment });
  const json = serializeReport(report, environment);
  const table = formatTable(JSON.parse(json));
  assert.equal(json.includes(secret), false);
  assert.equal(json.includes(environment.OTHER_SECRET), false);
  assert.equal(table.includes(secret), false);
  assert.match(json, /REDACTED/);
  assert.match(JSON.parse(json).stages[0].probes[0].commands[0].output, /REDACTED/);
});

test('any FAIL produces a nonzero exit status; an entirely passing matrix returns zero', async () => {
  const { createReport, recordStage, reportExitCode } = await implementation();
  const report = createReport();
  assert.notEqual(reportExitCode(report), 0, 'unexecuted applicable probes fail closed');
  for (let stage = 1; stage <= 7; stage++) {
    const probes = report.stages[stage - 1].probes.filter(probe => probe.status !== 'N/A');
    const commands = probes.map(probe => ({ id: probe.id, command: `check-${probe.id}`, expectedExit: 0 }));
    recordStage(report, stage, commands, commands.map(item => ({ command: item.command, output: 'ok', exitCode: 0 })));
  }
  assert.equal(reportExitCode(report), 0);
  recordStage(report, 7, [{ id: 'P1', command: 'broken', expectedExit: 0 }], [
    { command: 'broken', output: 'failed', exitCode: 1 },
  ]);
  assert.notEqual(reportExitCode(report), 0);
});

test('missing and duplicated command events remain INCONCLUSIVE rather than proving failure or success', async () => {
  const { createReport, recordStage } = await implementation();
  for (const events of [[], [{ command: 'other', output: 'ok', exitCode: 0 }],
    [{ command: 'wanted', output: 'ok', exitCode: 0 }, { command: 'wanted', output: 'ok', exitCode: 0 }]]) {
    const report = createReport();
    recordStage(report, 1, [{ id: 'P1', command: 'wanted', expectedExit: 0 }], events);
    assert.equal(report.stages[0].probes[0].status, 'INCONCLUSIVE');
  }
});

test('equivalent shell wrapper escaping maps to the same exact probe body', async () => {
  const { createReport, recordStage } = await implementation();
  const body = `printf 'value\\n'; probe_path=$(command -v git); print -r -- "$probe_path"`;
  const quote = value => "'" + value.replaceAll("'", "'\"'\"'") + "'";
  const command = '/bin/zsh -c ' + quote(body);
  const alternative = '/bin/zsh -c ' + "'" + command.replaceAll("'", "'\\''") + "'";
  const report = createReport();
  recordStage(report, 1, [{ id: 'P1', command }], [{ command: alternative, exitCode: 0, output: 'ok' }]);
  assert.equal(report.stages[0].probes[0].status, 'PASS');
});

test('all command events are retained, including unexpected events, without invalidating proven probes', async () => {
  const { createReport, recordStage, serializeReport, reportExitCode } = await implementation();
  const secret = 'fake-serper-unmatched-canary';
  const environment = { SERPER_API_KEY: secret };
  const report = createReport();
  const events = [{ command: 'wanted', output: 'ok', exitCode: 0 },
    { command: 'unexpected', output: secret, exitCode: 3 }];
  recordStage(report, 1, [{ id: 'P1', command: 'wanted' }], events, { environment });
  assert.ok(Array.isArray(report.stages[0].commandEvents), 'report must preserve every command event');
  assert.equal(report.stages[0].commandEvents.length, 2);
  assert.equal(report.stages[0].unexpectedCommands.length, 1);
  assert.equal(report.stages[0].probes[0].status, 'PASS');
  assert.notEqual(reportExitCode(report), 0);
  assert.equal(serializeReport(report, environment).includes(secret), false);
});

test('denied-write checks require permission denial, not a missing tool or file', async () => {
  const { createReport, recordStage } = await implementation();
  for (const [exitCode, output, expected] of [[1, 'Permission denied', 'PASS'],
    [1, 'Operation not permitted', 'PASS'], [127, 'command not found', 'FAIL'],
    [1, 'No such file or directory', 'FAIL'], [0, 'wrote file', 'FAIL'],
    [null, 'Permission denied', 'INCONCLUSIVE']]) {
    const report = createReport();
    recordStage(report, 3, [{ id: 'P12', command: 'write', expectedExit: 'denied' }],
      [{ command: 'write', exitCode, output }]);
    assert.equal(report.stages[2].probes.find(probe => probe.id === 'P12').status, expected);
  }
});

test('Skill and TLS probes use the executor-pinned Python even when PATH resolves python3 elsewhere', async () => {
  const { buildProbeCommands } = await implementation();
  const pythonPath = '/fixed/runtime/bin/python3.14';
  const context = { runDirectory: '/temporary/run',
    inputs: { rawKeywordsFile: '/temporary/run/keywords.md', paths: { researchDirectory: '/temporary/research' } },
    skillLock: { source: new URL('../../codex-skills/game-innerpage-keyword-information-research/SKILL.md', import.meta.url).pathname } };
  const commands = await buildProbeCommands(2, { context, shellPath: '/usr/bin:/bin', pythonPath });
  for (const command of commands.filter(item => ['P1', 'P6', 'P8'].includes(item.id)))
    assert.ok(command.command.includes(pythonPath), 'must preserve the executor-pinned interpreter');
  assert.equal(commands.filter(item => item.id === 'P4').length, 6);
  assert.equal(commands.filter(item => item.id === 'P8').length, 2);
  assert.ok(commands.find(item => item.id === 'P1').command.includes('command -v python3'));
  assert.equal(commands.find(item => item.variable === 'HOME').expectedOutput, 'HOME=present');
});

test('selection launches only one formal stage and runs only selected Git probes', async t => {
  const { runSelfcheck, reportExitCode } = await implementation();
  const reportsDirectory = await mkdtemp(join(tmpdir(), 'selfcheck-select-'));
  t.after(() => rm(reportsDirectory, { recursive: true, force: true }));
  let calls = 0;
  const report = await runSelfcheck({ reportsDirectory, stages: [4], probes: ['P3', 'P9'],
    executorOptions: { researchPython: process.execPath },
    executeWorker: async (_command, args, options, commands) => {
      calls++;
      assert.deepEqual(commands.map(item => item.id), ['P3', 'P9']);
      assert.match(args.find(arg => arg.startsWith('permissions.agent-worker=')), /network=\{enabled=false\}/);
      return { exitCode: 0, events: commands.map(item => ({ command: item.command, exitCode: 0,
        output: item.id === 'P3' ? `git version 2.50.1\n${item.entry}\n` : item.workspace + '\n' })) };
    } });
  assert.equal(calls, 1);
  assert.equal(reportExitCode(report), 0);
  assert.deepEqual(report.selection, { stages: [4], probes: ['P3', 'P9'] });
  assert.ok(report.stages.filter(row => row.stage !== 4).every(row => !row.workerLaunched));
});

test('invalid or empty probe selection rejects before any worker launch', async () => {
  const { runSelfcheck } = await implementation();
  for (const selection of [{ stages: [] }, { stages: [8] }, { stages: [4, 4] },
    { probes: [] }, { probes: ['P99'] }, { stages: [7], probes: ['P11'] }]) {
    await assert.rejects(runSelfcheck({ ...selection, executeWorker: async () => {
      assert.fail('invalid selection must never start a worker');
    } }), /SELFCHECK_SELECTION_INVALID/);
  }
});

test('a working system Git is judged by execution and selected entry, not its path name', async () => {
  const { createReport, recordStage, reportExitCode } = await implementation();
  const report = createReport({ stages: [4], probes: ['P3'] });
  const definition = { id: 'P3', command: 'git-version', expectation: 'git-entry', entry: '/usr/bin/git' };
  recordStage(report, 4, [definition], [{ command: definition.command, exitCode: 0,
    output: 'git version 2.50.1\n/usr/bin/git\n' }]);
  assert.equal(reportExitCode(report), 0);
  recordStage(report, 4, [definition], [{ command: definition.command, exitCode: 0,
    output: 'git version 2.50.1\n/unexpected/git\n' }]);
  assert.equal(reportExitCode(report), 1);
  recordStage(report, 4, [definition], []);
  assert.equal(report.stages[3].probes.find(item => item.id === 'P3').status, 'INCONCLUSIVE');
  assert.equal(reportExitCode(report), 1);
});

test('stage 6 records a successful missing-git preflight as silent-pass failure', async () => {
  const { createReport, recordStage } = await implementation();
  const report = createReport();
  recordStage(report, 6, [{ id: 'P9', command: 'no-git-preflight', expectation: 'missing-git-rejected' }], [
    { command: 'no-git-preflight', exitCode: 0, output: '{"ready": true, "git_clean": null}' },
  ]);
  const probe = report.stages[5].probes.find(item => item.id === 'P9');
  assert.equal(probe.status, 'FAIL');
  assert.match(probe.lastLine, /preflight 静默放过/);
});

test('streaming runner retains more than 8KB of events and terminates timed out workers', async t => {
  const { runWorkerEvents } = await implementation();
  const root = await mkdtemp(join(tmpdir(), 'selfcheck-runner-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const script = join(root, 'worker.mjs');
  await writeFile(script, `for(let i=0;i<30;i++) console.log(JSON.stringify({type:'item.completed',item:{type:'command_execution',command:'check-'+i,aggregated_output:'x'.repeat(600),exit_code:0}}));`);
  const result = await runWorkerEvents(process.execPath, [script], { cwd: root, timeoutMs: 5000 });
  assert.equal(result.events.length, 30);
  assert.equal(result.events.at(-1).output.length, 600);
  await writeFile(script, 'setInterval(() => {}, 1000);');
  const timeout = await runWorkerEvents(process.execPath, [script], { cwd: root, timeoutMs: 50 });
  assert.equal(timeout.error, 'WORKER_TIMEOUT');
});

test('runner keeps completed probes when a later command times out and redacts before returning', async t => {
  const { runWorkerEvents } = await implementation();
  const root = await mkdtemp(join(tmpdir(), 'selfcheck-partial-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const secret = 'fake-serper-stream-canary';
  const script = join(root, 'worker.mjs');
  await writeFile(script, `console.log(JSON.stringify({type:'item.completed',item:{type:'command_execution',command:'check',aggregated_output:process.env.SERPER_API_KEY,exit_code:0}}));setInterval(()=>{},1000);`);
  const result = await runWorkerEvents(process.execPath, [script], {
    cwd: root, env: { ...process.env, SERPER_API_KEY: secret }, timeoutMs: 500,
  });
  assert.equal(result.error, 'WORKER_TIMEOUT');
  assert.equal(result.events.length, 1);
  assert.equal(JSON.stringify(result).includes(secret), false);
});

test('runner diagnoses a normal turn without command evidence without persisting final prose', async t => {
  const { runWorkerEvents } = await implementation();
  const root = await mkdtemp(join(tmpdir(), 'selfcheck-event-summary-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const script = join(root, 'worker.mjs');
  const privateProse = 'private final explanation must never be saved';
  const rows = [{ type: 'thread.started', thread_id: 'private-thread-id' }, { type: 'turn.started' },
    { type: 'item.completed', item: { id: 'private-item-id', type: 'agent_message', text: JSON.stringify({
      status: 'BLOCKED', summary: privateProse, evidence: ['Shell tools are not available'], missing_inputs: [], artifacts: [],
    }) } }, { type: 'turn.completed', usage: { input_tokens: 10 } }];
  await writeFile(script, `for (const row of ${JSON.stringify(rows)}) console.log(JSON.stringify(row));`);
  const result = await runWorkerEvents(process.execPath, [script]);
  assert.equal(result.exitCode, 0);
  assert.deepEqual(result.events, []);
  assert.equal(result.diagnostics.eventCounts['turn.completed'], 1);
  assert.equal(result.diagnostics.itemCounts.agent_message, 1);
  assert.equal(result.diagnostics.finalResult.status, 'BLOCKED');
  assert.equal(result.diagnostics.finalResult.mentionsToolCapabilityProblem, true);
  assert.equal(result.diagnostics.finalResult.evidenceCount, 1);
  const stored = JSON.stringify(result);
  for (const forbidden of [privateProse, 'private-thread-id', 'private-item-id', 'Shell tools are not available'])
    assert.equal(stored.includes(forbidden), false);
});

test('diagnostics bound metadata, hash unknown labels and IDs, and never promote tool results to command proof', async t => {
  const { runWorkerEvents } = await implementation();
  const root = await mkdtemp(join(tmpdir(), 'selfcheck-unknown-events-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const script = join(root, 'worker.mjs'), canary = 'private-unknown-label';
  await writeFile(script, `console.log('invalid JSON private prose');
    console.log('null'); console.log('[]');
    for (let i=0; i<150; i++) console.log(JSON.stringify({type:'item.completed',item:{id:'private-call-id',type:'mcp_tool_call',tool:'exec_command',status:'failed',error:'private error',result:{command:'git --version',exit_code:0,output:'git version 2.50.1'}}}));
    for (let i=0; i<80; i++) console.log(JSON.stringify({type:${JSON.stringify(canary)}+i,item:{type:${JSON.stringify(canary)}}}));`);
  const result = await runWorkerEvents(process.execPath, [script]);
  assert.equal(result.events.length, 0, 'a nested MCP result is not command completion evidence');
  assert.equal(result.diagnostics.invalidJsonLines, 1);
  assert.equal(result.diagnostics.invalidEventShapes, 2);
  assert.equal(result.diagnostics.itemCounts.mcp_tool_call, 150);
  assert.equal(result.diagnostics.items.length, 128);
  assert.equal(result.diagnostics.truncatedItems, 22);
  assert.ok(Object.keys(result.diagnostics.eventCounts).length <= 65);
  assert.equal(result.diagnostics.items[0].errorPresent, true);
  assert.equal(result.diagnostics.items[0].status, 'failed');
  assert.match(result.diagnostics.items[0].itemIdSha256, /^[a-f0-9]{64}$/);
  const stored = JSON.stringify(result);
  for (const forbidden of [canary, 'private-call-id', 'private error', 'private prose', 'git version 2.50.1'])
    assert.equal(stored.includes(forbidden), false);
});

test('orchestration persists worker diagnostics alongside inconclusive probe evidence', async t => {
  const { runSelfcheck, reportExitCode } = await implementation();
  const reportsDirectory = await mkdtemp(join(tmpdir(), 'selfcheck-diagnostics-report-'));
  t.after(() => rm(reportsDirectory, { recursive: true, force: true }));
  const diagnostics = { eventCounts: { 'turn.completed': 1 }, itemCounts: { agent_message: 1 },
    finalResult: { status: 'BLOCKED', format: 'STRUCTURED' } };
  const report = await runSelfcheck({ stages: [4], probes: ['P3', 'P9'], reportsDirectory,
    executorOptions: { researchPython: process.execPath },
    executeWorker: async () => ({ exitCode: 0, events: [], diagnostics }) });
  assert.deepEqual(report.stages[3].workerDiagnostics, diagnostics);
  assert.equal(reportExitCode(report), 1);
  assert.equal(report.stages[3].probes.find(probe => probe.id === 'P3').status, 'INCONCLUSIVE');
});

test('observed item.completed/error is reported even when the worker exits zero', async t => {
  const { runWorkerEvents } = await implementation();
  const root = await mkdtemp(join(tmpdir(), 'selfcheck-error-item-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const script = join(root, 'worker.mjs');
  await writeFile(script, `console.log(JSON.stringify({type:'item.completed',item:{type:'error',id:'synthetic-error'}}));`);
  const result = await runWorkerEvents(process.execPath, [script]);
  assert.equal(result.exitCode, 0);
  assert.equal(result.error, 'WORKER_REPORTED_ERROR_ITEM');
  assert.equal(result.diagnostics.items[0].errorPresent, true);
  assert.deepEqual(result.events, []);
});

test('orchestration continues after a launch failure, preserves permissions and cleans temporary inputs', async t => {
  const { runSelfcheck, serializeReport } = await implementation();
  const reports = await mkdtemp(join(tmpdir(), 'selfcheck-report-test-'));
  t.after(() => rm(reports, { recursive: true, force: true }));
  const launched = [];
  const report = await runSelfcheck({ reportsDirectory: reports,
    executorOptions: { researchPython: process.execPath },
    executeWorker: async (_command, args, options, commands) => {
      launched.push({ args, options, commands });
      if (launched.length === 1) return { events: [], error: 'WORKER_TIMEOUT', exitCode: null };
      return { events: commands.map(item => ({ command: item.command, output: 'ok', exitCode: 0 })), exitCode: 0 };
    },
  });
  assert.equal(report.stages.length, 7);
  assert.ok(launched.length >= 6, 'all stages except missing keyword credentials must reach the worker');
  for (const launch of launched) {
    assert.ok(launch.args.includes('default_permissions="agent-worker"'));
    assert.ok(launch.args.some(arg => arg.startsWith('permissions.agent-worker=')));
    assert.equal(launch.options.timeoutMs, 300000);
    assert.ok(launch.commands.every(item => item.command.startsWith('/bin/zsh -c ')));
  }
  assert.equal(report.temporaryRootRemoved, true);
  assert.equal(await access(report.temporaryRoot).then(() => true, () => false), false);
  assert.equal(await readFile(report.reportPath, 'utf8'), serializeReport(report));
});
