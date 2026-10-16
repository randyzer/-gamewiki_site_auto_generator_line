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
    [1, 2, 3, 4, 5, 8, 12], [1, 2, 3, 4, 5, 6, 7, 8, 12, 13],
    [1, 2, 3, 4, 5, 8, 12], [1, 2, 3, 4, 5, 8, 9, 12],
    [1, 2, 3, 4, 5, 8, 9, 10, 12], [1, 2, 3, 4, 5, 8, 9, 12],
    [1, 2, 3, 4, 5, 6, 11],
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

test('missing, unexpected and duplicated command events fail rather than shifting results', async () => {
  const { createReport, recordStage } = await implementation();
  for (const events of [[], [{ command: 'other', output: 'ok', exitCode: 0 }],
    [{ command: 'wanted', output: 'ok', exitCode: 0 }, { command: 'wanted', output: 'ok', exitCode: 0 }]]) {
    const report = createReport();
    recordStage(report, 1, [{ id: 'P1', command: 'wanted', expectedExit: 0 }], events);
    assert.equal(report.stages[0].probes[0].status, 'FAIL');
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
    [1, 'No such file or directory', 'FAIL'], [0, 'wrote file', 'FAIL']]) {
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
