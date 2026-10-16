import { spawn } from 'node:child_process';
import { constants } from 'node:fs';
import { access, mkdtemp, mkdir, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join, resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createSkillExecutor } from '../agent/src/skill-executor.mjs';
import { runProcess } from '../agent/src/process.mjs';
import { snapshotSiteEvidence } from '../agent/src/site-evidence.mjs';
import { STAGE, STAGES } from '../agent/src/stages.mjs';

const repository = dirname(dirname(fileURLToPath(import.meta.url)));
const quote = value => `'${value.replaceAll("'", `'"'"'`)}'`;
const sensitiveName = /password|passwd|secret|token|cookie|credential|private.?key|api.?key|authorization/i;
const labels = ['解释器', 'node', 'git', '环境变量', 'TMPDIR', 'TLS', 'yt-dlp',
  'Skill Python', '工作区 git', 'Playwright', '部署工具', '写权限边界', '只读输入'];
const applicability = [
  [1, 2, 3, 4, 5, 8, 12], [1, 2, 3, 4, 5, 6, 7, 8, 12, 13],
  [1, 2, 3, 4, 5, 8, 12], [1, 2, 3, 4, 5, 8, 9, 12],
  [1, 2, 3, 4, 5, 8, 9, 10, 12], [1, 2, 3, 4, 5, 8, 9, 12],
  [1, 2, 3, 4, 5, 6, 11],
];

export const PROBE_MATRIX = Object.freeze(STAGES.map((skill, index) => Object.freeze({
  stage: index + 1, skill,
  probes: Object.freeze(labels.map((label, i) => Object.freeze({
    id: `P${i + 1}`, label, applicable: applicability[index].includes(i + 1),
  }))),
})));

function redact(value, environment = process.env) {
  let text = String(value ?? '');
  const secrets = Object.entries(environment).filter(([key, secret]) => sensitiveName.test(key) && secret)
    .map(([, secret]) => String(secret)).sort((a, b) => b.length - a.length);
  for (const secret of secrets) text = text.split(secret).join('[REDACTED]');
  return text.replace(/\b(?:Bearer|Basic)\s+[^\s,"']+/gi, '[REDACTED AUTHORIZATION]')
    .replace(/\b(?:sk-|gh[pousr]_|github_pat_|xox[baprs]-)[A-Za-z0-9_-]{8,}/g, '[REDACTED TOKEN]');
}

function redactObject(value, environment) {
  if (typeof value === 'string') return redact(value, environment);
  if (Array.isArray(value)) return value.map(item => redactObject(item, environment));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value)
    .map(([key, item]) => [key, redactObject(item, environment)]));
  return value;
}

export function createReport() {
  return { startedAt: new Date().toISOString(), temporaryRootRemoved: false,
    notes: [
      'Environment probes only; no research, site build, browser, deployment or authentication actions.',
      'P4: research variables present only in stage 2; HOME missing, TMPDIR present in all stages.',
      'P12: research writes tested in stages 1–6; stage 7 uses only its explicit probe allowlist.',
      'Stages 5/6 use explicitly synthetic host evidence and a no-op preview adapter to reach the real worker without a build/browser.',
      'Stage 7 uses formal plan permissions; no execute-mode tool or network grants are added.',
    ],
    stages: PROBE_MATRIX.map(row => ({ stage: row.stage, skill: row.skill, workerLaunched: false,
      probes: row.probes.map(probe => ({ id: probe.id, label: probe.label,
        status: probe.applicable ? 'FAIL' : 'N/A', commands: [],
        ...(probe.applicable ? { lastLine: 'Not executed' } : {}) })),
    })),
  };
}

// Decode only shell wrapper arguments, without evaluating substitutions or changing
// the probe body. The CLI may render nested single quotes as either '"'"' or '\''.
function shellWords(text) {
  const words = [];
  let word = '', quoted = null, started = false;
  for (let i = 0; i < text.length; i++) {
    const character = text[i];
    if (quoted === "'") {
      if (character === "'") quoted = null;
      else word += character;
    } else if (character === '\\' && quoted !== "'") {
      if (i + 1 === text.length) return null;
      const next = text[i + 1];
      if (!quoted || ['$', '`', '"', '\\', '\n'].includes(next)) {
        i++;
        if (next !== '\n') word += next;
      } else word += character;
      started = true;
    } else if (quoted === '"') {
      if (character === '"') quoted = null;
      else word += character;
    } else if (character === "'" || character === '"') {
      quoted = character;
      started = true;
    } else if (/\s/.test(character)) {
      if (started) { words.push(word); word = ''; started = false; }
    } else { word += character; started = true; }
  }
  if (quoted) return null;
  if (started) words.push(word);
  return words;
}

function commandBody(command) {
  for (let depth = 0; depth < 3; depth++) {
    const words = shellWords(command);
    if (words?.length !== 3 || !['/bin/zsh', '/bin/bash', '/bin/sh'].includes(words[0]) || words[1] !== '-c') break;
    command = words[2];
  }
  return command;
}

function commandMatches(actual, expected) {
  return typeof actual === 'string' && commandBody(actual) === commandBody(expected);
}

function checkCommand(definition, event) {
  if (!event) return { status: 'FAIL', lastLine: 'Command event missing', exitCode: null, output: '' };
  const output = event.output ?? '';
  let passed = event.exitCode === (definition.expectedExit ?? 0), note;
  if (definition.expectedExit === 'denied')
    passed = Number.isInteger(event.exitCode) && event.exitCode !== 0 && /Permission denied|Operation not permitted|Read-only file system/i.test(output);
  if (definition.expectedOutput !== undefined) passed &&= output.trim() === definition.expectedOutput;
  if (definition.expectation === 'http-status') passed &&= /^\d{3}$/.test(output.trim());
  if (definition.expectation === 'clean-git') passed &&= output.trim() === definition.workspace;
  if (definition.expectation === 'missing-git-rejected') {
    passed = Number.isInteger(event.exitCode) && event.exitCode !== 0 && /git/i.test(output);
    if (event.exitCode === 0) { passed = false; note = 'preflight 静默放过'; }
  }
  return { ...event, status: passed ? 'PASS' : 'FAIL', ...(note ? { note } : {}),
    lastLine: note ? `${output.trim().split('\n').at(-1) || '(no output)'}; ${note}`
      : output.trim().split('\n').at(-1) || `(no output; exit ${event.exitCode})` };
}

export function recordStage(report, stage, definitions, events, { error, environment = process.env } = {}) {
  const row = report.stages[stage - 1];
  row.commandEvents = redactObject(events, environment);
  row.unexpectedCommands = row.commandEvents.filter(event => !definitions.some(definition => commandMatches(event.command, definition.command)));
  delete row.error;
  if (error || row.unexpectedCommands.length) row.error = redact(error || 'Unexpected command event', environment);
  for (const probe of row.probes.filter(item => item.status !== 'N/A')) {
    const expected = definitions.filter(definition => definition.id === probe.id);
    probe.commands = expected.map(definition => {
      const matches = events.filter(event => commandMatches(event.command, definition.command));
      const checked = checkCommand(definition, matches.length === 1 ? matches[0] : null);
      if (matches.length > 1) checked.lastLine = 'Duplicate command events';
      if (!matches.length && row.error) checked.lastLine += `; ${row.error.split('\n').at(-1)}`;
      return redactObject({ ...definition, ...checked, expectedCommand: definition.command }, environment);
    });
    const failed = probe.commands.filter(command => command.status === 'FAIL');
    probe.status = expected.length && !failed.length ? 'PASS' : 'FAIL';
    if (probe.status === 'FAIL') probe.lastLine = failed.at(-1)?.lastLine || row.error || 'Command definition missing';
    else delete probe.lastLine;
  }
  row.status = row.error || row.probes.some(probe => probe.status === 'FAIL') ? 'FAIL' : 'PASS';
}

export function serializeReport(report, environment = process.env) {
  return JSON.stringify(redactObject(report, environment), null, 2) + '\n';
}

export function reportExitCode(report) {
  return report.stages.some(stage => stage.error || stage.probes.some(probe => probe.status === 'FAIL')) ? 1 : 0;
}

export function formatTable(report) {
  const cell = value => String(value).replaceAll('|', '\\|').replace(/[\r\n]/g, ' ');
  return [
    `| 阶段 | ${labels.map((label, i) => `P${i + 1} ${label}`).join(' | ')} |`,
    `| --- | ${labels.map(() => '---').join(' | ')} |`,
    ...report.stages.map(stage => `| ${stage.stage} | ${stage.probes.map(probe => cell(
      probe.status === 'FAIL' ? `FAIL — ${probe.lastLine}` : probe.status)).join(' | ')} |`),
  ].join('\n');
}

// The production runProcess truncates stdout at 8KB. Parse complete events in memory;
// never write raw events or the model's final response to disk.
export function runWorkerEvents(command, args, { cwd, input = '', env = process.env, timeoutMs = 300000 } = {}) {
  return new Promise(resolveResult => {
    const events = [];
    const child = spawn(command, args, { cwd, env, detached: process.platform !== 'win32', stdio: ['pipe', 'pipe', 'pipe'] });
    let error, stderr = '', timedOut = false, killTimer, terminationFailed = false;
    const kill = signal => {
      try { process.platform === 'win32' ? child.kill(signal) : process.kill(-child.pid, signal); }
      catch (failure) { if (failure.code !== 'ESRCH') terminationFailed = true; }
    };
    const timer = setTimeout(() => {
      timedOut = true;
      kill('SIGTERM');
      killTimer = setTimeout(() => kill('SIGKILL'), 500);
    }, timeoutMs);
    const lines = createInterface({ input: child.stdout, crlfDelay: Infinity });
    lines.on('line', line => {
      let event;
      try { event = JSON.parse(line); } catch { return; }
      if (event.type === 'item.completed' && event.item?.type === 'command_execution')
        events.push(redactObject({ command: event.item.command, output: event.item.aggregated_output ?? '',
          exitCode: event.item.exit_code }, env));
      if (event.type === 'error' || event.type === 'turn.failed')
        error = redact(event.message ?? event.error?.message ?? 'Worker turn failed', env);
    });
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', failure => { error = redact(`WORKER_START_FAILED: ${failure.message}`, env); });
    child.stdin.on('error', () => { error ??= 'WORKER_INPUT_FAILED'; });
    child.on('close', (exitCode, signal) => {
      clearTimeout(timer);
      // A timed-out parent may exit before its descendants. Keep the group kill scheduled.
      const finish = () => resolveResult({ events, exitCode,
        ...(timedOut || error || exitCode !== 0 || terminationFailed ? {
          error: terminationFailed ? 'WORKER_TERMINATION_FAILED' : timedOut ? 'WORKER_TIMEOUT'
            : error || `WORKER_EXIT_NONZERO: ${exitCode ?? signal}`,
        } : {}), ...(stderr ? { stderr: redact(stderr, env) } : {}) });
      if (timedOut) setTimeout(finish, 550);
      else { clearTimeout(killTimer); finish(); }
    });
    child.stdin.end(input);
  });
}

async function fixedCommand(name, searchPath) {
  for (const directory of searchPath.split(delimiter).filter(path => path.startsWith('/'))) {
    const path = join(directory, name);
    try { await access(path, constants.X_OK); return path; } catch { /* no fallback outside formal PATH */ }
  }
  return null;
}

async function pythonScripts(directory) {
  const scripts = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) scripts.push(...await pythonScripts(path));
    else if (entry.isFile() && entry.name.endsWith('.py')) scripts.push(path);
  }
  return scripts.sort();
}

export async function buildProbeCommands(stage, { context, shellPath, pythonPath }) {
  const commands = [];
  const add = (id, body, checks = {}) => commands.push({ id, command: `/bin/zsh -c ${quote(body)}`,
    expectedExit: 0, ...checks });
  const unavailable = name => `print -r -- ${quote(`No fixed ${name} executable in the formal stage PATH`)}; exit 127`;
  const python = pythonPath ?? await fixedCommand('python3', shellPath);
  const node = await fixedCommand('node', shellPath);
  const git = await fixedCommand('git', shellPath);
  const versionAndPath = (name, path, forbidden) => path
    ? `${quote(path)} --version; probe_rc=$?; probe_path=$(command -v ${name}); path_rc=$?; print -r -- "$probe_path"; [ "$probe_rc" -eq 0 ] && [ "$path_rc" -eq 0 ] && [ "$probe_path" != ${quote(forbidden)} ]`
    : unavailable(name);
  add('P1', versionAndPath('python3', python, '/usr/bin/python3'));
  add('P2', node ? `${quote(node)} --version` : unavailable('node'));
  add('P3', versionAndPath('git', git, '/usr/bin/git'));
  for (const name of ['SERPER_API_KEY', 'DYLD_LIBRARY_PATH', 'SSL_CERT_FILE', 'ZDOTDIR', 'HOME', 'TMPDIR']) {
    const present = name === 'TMPDIR' || (stage === 2 && name !== 'HOME');
    add('P4', `[ -n "\${${name}-}" ] && echo ${name}=present || echo ${name}=missing`,
      { variable: name, expectedOutput: `${name}=${present ? 'present' : 'missing'}` });
  }
  add('P5', 'probe_file=$(/usr/bin/mktemp "${TMPDIR:?}/env-selfcheck.XXXXXX") && /bin/rm "$probe_file"');
  if ([2, 7].includes(stage)) {
    const url = stage === 2 ? 'https://www.youtube.com' : 'https://api.github.com';
    const code = `import ssl,urllib.request; print(urllib.request.urlopen(${JSON.stringify(url)}, context=ssl.create_default_context(), timeout=20).status)`;
    add('P6', python ? `${quote(python)} -c ${quote(code)}` : unavailable('python3'), { expectation: 'http-status' });
  }
  if (stage === 2) add('P7', `${quote(join(context.runDirectory, 'host-tools/keyword-research/yt-dlp'))} --version`);
  if (stage <= 6) {
    for (const path of await pythonScripts(dirname(context.skillLock.source))) {
      const source = await readFile(path, 'utf8');
      const hasHelp = /ArgumentParser\s*\(/.test(source) && !/add_help\s*=\s*False/.test(source);
      const args = hasHelp ? `${quote(path)} --help`
        : `-c ${quote('import ast,sys;ast.parse(open(sys.argv[1]).read())')} ${quote(path)}`;
      add('P8', python ? `${quote(python)} ${args}` : unavailable('python3'), { script: path, method: hasHelp ? 'help' : 'ast' });
    }
  }
  if ([4, 5, 6].includes(stage)) {
    const workspace = context.inputs.projectPath;
    add('P9', git ? `${quote(git)} -C ${quote(workspace)} rev-parse --show-toplevel && ${quote(git)} -C ${quote(workspace)} status --porcelain`
      : unavailable('git'), { expectation: 'clean-git', workspace });
    if (stage === 6) {
      const path = join(dirname(context.skillLock.source), 'scripts/preflight.py');
      const noGitPath = join(context.nativeDirectory, 'no-git-path');
      await mkdir(noGitPath);
      add('P9', python ? `export PATH=${quote(noGitPath)}; if command -v git >/dev/null 2>&1; then print 'git still on PATH'; exit 0; fi; ${quote(python)} ${quote(path)} --game 'Environment Selfcheck' --project ${quote(workspace)} --domain-unconfirmed --preview-url http://127.0.0.1:1`
        : unavailable('python3'), { expectation: 'missing-git-rejected' });
    }
  }
  if (stage === 5) add('P10', node ? `${quote(node)} -e ${quote("require.resolve('playwright')")}` : unavailable('node'));
  if (stage === 7) for (const name of ['gh', 'vercel', 'git']) {
    const path = await fixedCommand(name, shellPath);
    add('P11', path ? `${quote(path)} --version` : unavailable(name), { tool: name });
  }
  if (stage <= 6) {
    if ([3, 4, 5, 6].includes(stage)) add('P12', `printf 'selfcheck\\n' > ${quote(join(context.inputs.projectPath, 'env-selfcheck-write'))}`,
      { target: 'siteDirectory', expectedExit: stage === 4 ? 0 : 'denied' });
    add('P12', `printf 'selfcheck\\n' > ${quote(join(context.inputs.paths.researchDirectory, 'env-selfcheck-write'))}`,
      { target: 'researchDirectory', expectedExit: [1, 2].includes(stage) ? 0 : 'denied' });
  }
  if (stage === 2) add('P13', `printf 'selfcheck\\n' >> ${quote(context.inputs.rawKeywordsFile)}`, { expectedExit: 'denied' });
  return commands;
}

async function prepareFixture(root, stage) {
  const stageRoot = join(root, `stage-${stage}`), runDirectory = join(stageRoot, 'run');
  const siteDirectory = join(stageRoot, 'site'), researchDirectory = join(stageRoot, 'research');
  const outputDirectory = join(runDirectory, 'artifacts', String(stage - 1), '1');
  await Promise.all([siteDirectory, researchDirectory, outputDirectory].map(path => mkdir(path, { recursive: true })));
  const rawKeywordsFile = join(runDirectory, 'keywords.md');
  await writeFile(rawKeywordsFile, '# Environment selfcheck temporary input\n', { mode: 0o600 });
  const git = await fixedCommand('git', process.env.PATH ?? '');
  if (!git) throw Error('Host git unavailable for temporary committed fixture');
  const env = { PATH: process.env.PATH, HOME: stageRoot, GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_GLOBAL: '/dev/null', GIT_TERMINAL_PROMPT: '0' };
  const gitOptions = { cwd: siteDirectory, env, timeoutMs: 10000 };
  await runProcess(git, ['-c', 'core.hooksPath=/dev/null', 'init', '--quiet'], gitOptions);
  await runProcess(git, ['-c', 'core.hooksPath=/dev/null', '-c', 'commit.gpgsign=false',
    '-c', 'user.name=Environment Selfcheck', '-c', 'user.email=selfcheck@example.invalid',
    'commit', '--quiet', '--allow-empty', '-m', 'Temporary environment selfcheck fixture'], gitOptions);
  return { runId: `ENV_SELFCHECK-stage-${stage}`, runDirectory, outputDirectory,
    nativeDirectory: join(outputDirectory, 'native'), mode: stage === 7 ? 'plan' : 'audit-only',
    skillLock: { source: join(repository, 'codex-skills', STAGES[stage - 1], 'SKILL.md') },
    requiredArtifacts: [], upstream: [STAGE.HOMEPAGE_RESEARCH, STAGE.KEYWORD_RESEARCH]
      .map(skill => ({ skill, artifacts: [] })),
    inputs: { gameIdentity: 'Environment Selfcheck', objective: 'Environment probes only',
      projectPath: siteDirectory, rawKeywordsFile, paths: { siteDirectory, researchDirectory, rawKeywordsFile } },
    permissions: { siteWrites: [3, 4].includes(stage), productionDeployment: false },
  };
}

function workerPrompt(commands) {
  return [
    'Environment verification only. Do not perform research, build a site, read Skills or instructions, deploy, login, use browsers, or inspect credentials.',
    `Make exactly ${commands.length} sequential shell tool calls, in the order below, one command per tool call.`,
    'Execute each complete line verbatim with login=false, yield_time_ms=10000, max_output_tokens=10000. Each line already uses /bin/zsh -c. Do not combine, rewrite, retry or add commands. Continue after all failures.',
    'If a call returns a session ID, poll only that same session until it exits, then continue. Never run an extra diagnostic or repair.',
    'Never print, inspect, copy, persist, or report any credential value. Environment probes may report only present or missing.',
    '```sh', ...commands.map(item => item.command), '```',
    'After every command has completed, return status BLOCKED, summary "Environment probes complete", evidence [], missing_inputs [], artifacts []. Do not write any files except those explicitly touched by the listed probes.',
  ].join('\n');
}

export async function runSelfcheck({ reportsDirectory = join(repository, 'agent/runs'),
  executorOptions = {}, executeWorker = runWorkerEvents, onProgress = () => {} } = {}) {
  const environment = executorOptions.environment ?? process.env;
  const report = createReport();
  const root = await mkdtemp(join(await realpath(tmpdir()), 'stage-env-selfcheck-'));
  report.temporaryRoot = root;
  report.reportPath = join(reportsDirectory, `ENV_SELFCHECK_${report.startedAt.replace(/[:.]/g, '-')}.json`);
  try {
    for (const row of report.stages) {
      onProgress(`Stage ${row.stage}/7: ${row.skill}`);
      let definitions = [], events = [], workerError;
      try {
        const context = await prepareFixture(root, row.stage);
        const syntheticEvidence = async () => {
          const directory = join(context.nativeDirectory, 'synthetic-host-evidence');
          await mkdir(directory, { recursive: true });
          await writeFile(join(directory, 'SYNTHETIC.txt'), 'Environment verification fixture; no site audit performed.\n');
          return snapshotSiteEvidence(directory);
        };
        const executor = createSkillExecutor({ ...executorOptions, timeoutMs: 300000,
          previewSite: async () => ({ url: 'http://127.0.0.1:1', stop: async () => {} }),
          auditSite: syntheticEvidence, prelaunchSite: syntheticEvidence,
          run: async (command, args, options) => {
            row.workerLaunched = true;
            row.permissionProfile = args.find(arg => arg.startsWith('permissions.agent-worker='));
            const pathConfig = args.find(arg => arg.startsWith('shell_environment_policy.set='));
            const shellPath = JSON.parse(pathConfig.match(/PATH=("(?:\\.|[^"\\])*")/)[1]);
            const pythonPath = options.input.match(/^Use (.+) for every Python Skill script\./m)?.[1];
            definitions = await buildProbeCommands(row.stage, { context, shellPath, pythonPath });
            const jsonArgs = [...args];
            jsonArgs.splice(1, 0, '--json');
            const outputIndex = jsonArgs.indexOf('--output-last-message');
            const outputPath = jsonArgs[outputIndex + 1];
            // The host supplies the adapter result; the model's final text is never persisted.
            jsonArgs.splice(outputIndex, 2);
            const execution = await executeWorker(command, jsonArgs,
              { ...options, input: workerPrompt(definitions) }, definitions);
            events = execution.events;
            workerError = execution.error;
            row.workerExitCode = execution.exitCode;
            if (execution.stderr) row.workerStderr = redact(execution.stderr, environment);
            await writeFile(outputPath, JSON.stringify({ status: 'BLOCKED', summary: 'Environment verification only',
              evidence: [], missing_inputs: [], artifacts: [] }), { mode: 0o600 });
          },
        });
        const result = await executor(row.skill, context);
        if (!row.workerLaunched) workerError = result.evidence?.join('\n') || 'Worker did not launch';
      } catch (error) { workerError = redact(error.message, environment); }
      recordStage(report, row.stage, definitions, events, { error: workerError, environment });
      onProgress(`Stage ${row.stage}/7: ${row.probes.filter(probe => probe.status === 'FAIL').length} FAIL`);
    }
  } finally {
    try { await rm(root, { recursive: true, force: true }); report.temporaryRootRemoved = true; }
    catch (error) { report.cleanupError = redact(error.message, environment); report.stages[0].error = 'Temporary cleanup failed'; }
    report.finishedAt = new Date().toISOString();
    await mkdir(reportsDirectory, { recursive: true });
    await writeFile(report.reportPath, serializeReport(report, environment), { mode: 0o600, flag: 'wx' });
  }
  return JSON.parse(serializeReport(report, environment));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const report = await runSelfcheck({ onProgress: message => process.stderr.write(message + '\n') });
    console.log(formatTable(report));
    console.log(`Report: ${report.reportPath}`);
    process.exitCode = reportExitCode(report);
  } catch (error) {
    console.error(redact(error.message));
    process.exitCode = 1;
  }
}
