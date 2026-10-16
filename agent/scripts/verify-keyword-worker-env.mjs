import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { createSkillExecutor } from '../src/skill-executor.mjs';
import { runProcess } from '../src/process.mjs';
import { STAGE } from '../src/stages.mjs';

if (!process.env.SERPER_API_KEY) throw Error('SERPER_API_KEY is missing from the current host process');
const reportPath = process.argv[2] ? resolve(process.argv[2]) : null;
if (!reportPath) throw Error('Usage: node scripts/verify-keyword-worker-env.mjs REPORT_JSON');

const agentDirectory = dirname(dirname(fileURLToPath(import.meta.url)));
const repository = dirname(agentDirectory);
const skillDirectory = join(repository, 'codex-skills/game-innerpage-keyword-information-research');
const researchCli = join(skillDirectory, 'scripts/research_cli.py');
const fixedPython = '/opt/homebrew/bin/python3';
const root = await mkdtemp(join(await realpath(tmpdir()), 'keyword-worker-env-'));
const runDirectory = join(root, 'runs/keyword-worker-env');
const outputDirectory = join(runDirectory, 'artifacts/1/1');
const wrapper = join(runDirectory, 'host-tools/keyword-research/yt-dlp');
const siteDirectory = join(root, 'site');
const researchDirectory = join(root, 'research');
const rawKeywordsFile = join(runDirectory, 'keywords.md');
const report = { temporaryRoot: root, temporaryRootRemoved: false };
const credentialValues = [process.env.SERPER_API_KEY, process.env.YTDLP_COOKIES_FILE].filter(Boolean);
const quote = value => `'${value.replaceAll("'", `'"'"'`)}'`;
const resolvedPython = await realpath(fixedPython);
const pythonCommand = code => `${resolvedPython} -c ${quote(code)}`;
const expectedCommands = [
  pythonCommand('import ssl; print(ssl.OPENSSL_VERSION)'),
  pythonCommand('import urllib.request; print(urllib.request.urlopen("https://www.youtube.com", timeout=20).status)'),
  pythonCommand('import urllib.error, urllib.request; exec("try:\\n print(urllib.request.urlopen(\\"https://google.serper.dev\\", timeout=20).status)\\nexcept urllib.error.HTTPError as error:\\n print(error.code)")'),
];
assert.ok(expectedCommands.every(command => !command.includes('\n')), 'verification commands must stay one line each');

function assertNoCredentialValue(value, label) {
  for (const credential of credentialValues)
    assert.ok(!value.includes(credential), `${label} exposed a credential value`);
}

function commandEvents(stdout) {
  return stdout.split('\n').filter(Boolean).flatMap(line => {
    let event;
    try { event = JSON.parse(line); } catch { return []; }
    const item = event.item;
    if (event.type !== 'item.completed' || item?.type !== 'command_execution') return [];
    return [{ command: item.command, output: item.aggregated_output, exitCode: item.exit_code }];
  });
}

try {
  report.sourceSha256 = Object.fromEntries(await Promise.all([
    'src/skill-executor.mjs', 'src/keyword-ytdlp.mjs', 'src/worker-permissions.mjs',
    'scripts/verify-keyword-worker-env.mjs',
  ].map(async path => [path, createHash('sha256').update(await readFile(join(agentDirectory, path))).digest('hex')])));
  await Promise.all([mkdir(siteDirectory, { recursive: true }), mkdir(researchDirectory, { recursive: true }),
    mkdir(dirname(rawKeywordsFile), { recursive: true })]);
  await writeFile(rawKeywordsFile, '# Environment verification only\n');
  const executeRealWorker = async (command, args, options) => {
    const joined = args.join(' ');
    assert.match(joined, /shell_environment_policy\.inherit="all"/);
    assert.match(joined, /shell_environment_policy\.include_only=\["PATH","TMPDIR","SERPER_API_KEY"/);
    assertNoCredentialValue(joined, 'worker launch arguments');
    report.permissionProfile = args.find(value => value.startsWith('permissions.agent-worker='));
    const prompt = [
      'This is an environment verification, not research. Make exactly three sequential shell tool calls, one for each line below, in order. Execute every line in its own tool call even if an earlier command fails; do not omit, combine, rewrite, retry, or add shell setup. Set yield_time_ms=10000 and max_output_tokens=2000 for each call. Capture all output and the exit code of each call.',
      '```sh', ...expectedCommands, '```',
      'Return status BLOCKED, summary "Environment verification complete", no artifacts or missing inputs, and evidence containing the complete command output. Never print or inspect any credential value.',
    ].join('\n');
    const jsonArgs = [...args];
    jsonArgs.splice(1, 0, '--json');
    const execution = await runProcess(command, jsonArgs, { ...options, input: prompt });
    assertNoCredentialValue(execution.stdout, 'worker events');
    const events = commandEvents(execution.stdout);
    assertNoCredentialValue(JSON.stringify(events), 'recorded command output');
    report.commands = events;
    return execution;
  };
  const executor = createSkillExecutor({ researchPython: fixedPython, run: executeRealWorker });
  const result = await executor(STAGE.KEYWORD_RESEARCH, {
    runId: 'keyword-worker-env', outputDirectory, requiredArtifacts: [], upstream: [],
    skillLock: { source: join(skillDirectory, 'SKILL.md') }, mode: 'verification',
    inputs: { gameIdentity: 'Environment Verification', objective: 'Verify command environment only',
      projectPath: siteDirectory, rawKeywordsFile,
      paths: { siteDirectory, researchDirectory, rawKeywordsFile } },
    permissions: { siteWrites: false, productionDeployment: false },
  });
  const evidence = result.evidence.join('\n');
  assertNoCredentialValue(evidence, 'worker result');
  assert.equal(result.status, 'BLOCKED');
  assert.equal(report.commands?.length, 3, 'worker must execute exactly three commands');
  assert.ok(report.commands.every(command => command.exitCode === 0));
  for (const [index, expected] of expectedCommands.entries()) {
    const actual = report.commands[index].command;
    assert.ok(actual === expected || ['/bin/zsh', '/bin/bash', '/bin/sh']
      .some(shell => actual === `${shell} -c ${quote(expected)}` ||
        actual === `${shell} -c ${JSON.stringify(expected)}`), 'unexpected worker command');
  }
  assert.match(report.commands[0].output.trim(), /^OpenSSL\s+\S+/);
  assert.equal(report.commands[1].output.trim(), '200');
  assert.equal(report.commands[2].output.trim(), '403');
  report.acceptance = 'PASSED';
  report.status = result.status;
  report.wrapper = wrapper;
  report.fixedPython = resolvedPython;
  report.researchCli = researchCli;
  report.evidence = result.evidence;
} finally {
  await rm(root, { recursive: true, force: true });
  report.temporaryRootRemoved = true;
  const serialized = JSON.stringify(report, null, 2) + '\n';
  assertNoCredentialValue(serialized, 'verification report');
  await writeFile(reportPath, serialized);
}

console.log(JSON.stringify(report, null, 2));
