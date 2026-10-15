#!/usr/bin/env node
// One bounded host-owned diagnostic, through the existing Skill Executor.
// Default is preview. Never reads credential bodies or starts a business Pipeline.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { AGENT_ROOT } from '../src/skill-lock.mjs';
import { sha256 } from '../src/files.mjs';
import { createSkillExecutor } from '../src/skill-executor.mjs';
import { DISABLED_WORKER_FEATURES, ENABLED_WORKER_FEATURES, verifyWorkerCommandIdentity,
  verifyWorkerCodeModeHostIdentity } from '../src/worker-permissions.mjs';
import { loadEntryHostPolicy, hostRuntimeImplementationSha256 } from '../src/entry-host-bootstrap.mjs';
import { STAGE } from '../src/stages.mjs';

// Message-shape hints only, from openai/codex rust-v0.153.0:
// core/src/config/{mod.rs,permissions.rs}, features/src/lib.rs,
// exec/src/{lib.rs,event_processor_with_jsonl_output.rs}. No dynamic fields
// survive classification. None of these messages permits tool continuation.
function classifyFirstError(message) {
  const patterns = [
    ['PERMISSION_PROFILE_FALLBACK', /^Configured value for `permission_profile` is disallowed by requirements; falling back from `[^`\r\n]+` to required value `[^`\r\n]+`\.$/],
    ['CONFIG_REQUIREMENT_FALLBACK', /^Configured value for `(windows\.sandbox|approval_policy|approvals_reviewer|permission_profile|web_search_mode)` is disallowed by requirements; falling back to required value [^\r\n]+\. Details: [\s\S]+$/],
    ['FILESYSTEM_PATH_IGNORED', /^Configured filesystem path `[^`\r\n]+`(?: with nested entry `[^`\r\n]+`)? is not recognized by this version of Codex and will be ignored\. Upgrade Codex if this path is required\.$/],
    ['FILESYSTEM_ENTRIES_MISSING', /^Permissions profile `[^`\r\n]+` does not define any recognized filesystem entries for this version of Codex\. Filesystem access will remain restricted\. Upgrade Codex if this profile expects filesystem permissions\.$/],
    ['DEPRECATED_SETTING', /^`\[features\]\.(web_search|web_search_request|web_search_cached)` is deprecated because web search is enabled by default\.(?: \(Set `web_search` to `"live"`, `"indexed"`, `"cached"`, or `"disabled"` at the top level \(or under a profile\) in config\.toml if you want to override it\.\))?$/],
    ['DEPRECATED_SETTING', /^`\[features\]\.use_legacy_landlock` is deprecated and will be removed soon\.(?: \(Remove this setting to stop opting into the legacy Linux sandbox behavior\.\))?$/],
    ['UNSTABLE_FEATURE_NOTICE', /^Under-development features enabled: [a-z][a-z0-9_]*(?:, [a-z][a-z0-9_]*)*\. Under-development features are incomplete and may behave unpredictably\. To suppress this warning, set `suppress_unstable_features_warning = true` in [^\r\n]+\.$/],
    ['MODEL_REROUTED', /^model rerouted: [A-Za-z0-9_.:-]+ -> [A-Za-z0-9_.:-]+ \([^\r\n]+\)$/],
    ['EVENT_STREAM_LAGGED', /^in-process app-server event stream lagged; dropped [0-9]+ events$/]
  ];
  return patterns.find(([, pattern]) => pattern.test(message))?.[0] ?? 'UNKNOWN_NON_TOOL_ERROR';
}

// Host-only viewer. The message never becomes an argv entry, file, stdout or
// model input. The first dialog obtains local consent before revealing it.
const viewerFailures = new Set(['NOT_ATTEMPTED', 'INPUT_REJECTED', 'OSASCRIPT_SPAWN_FAILED',
  'OSASCRIPT_STDIN_FAILED', 'OSASCRIPT_TIMEOUT', 'OSASCRIPT_NONZERO_EXIT', 'CONSENT_TIMEOUT',
  'CONSENT_DECLINED', 'APPLESCRIPT_CANCELLED', 'APPLESCRIPT_RUNTIME_ERROR', 'MESSAGE_TIMEOUT',
  'PROTOCOL_UNEXPECTED_OUTPUT', 'NONE']);
const viewerInteger = value => Number.isSafeInteger(value) && Math.abs(value) <= 2147483647 ? value : null;
const viewerResult = (viewerFailure, osascriptExitCode = null, appleScriptErrorNumber = null) => ({
  privateView: viewerFailure === 'NONE' ? 'VIEWED' : 'DIAGNOSTIC_UNAVAILABLE', viewerFailure,
  osascriptExitCode: viewerInteger(osascriptExitCode), appleScriptErrorNumber: viewerInteger(appleScriptErrorNumber) });

export async function showPrivateHostDiagnostic(message, { platform = process.platform, spawnProcess = spawn,
  scheduleTimeout = setTimeout, cancelTimeout = clearTimeout } = {}) {
  if (platform !== 'darwin' || typeof message !== 'string' || !message || !message.isWellFormed() || Buffer.byteLength(message) > 4096)
    return viewerResult('INPUT_REJECTED');
  const literal = message.replace(/[\x00-\x1f\x7f]/g, ' ').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const script = `try
set consent to display dialog "Show the first CLI diagnostic locally? It may contain private paths or account details. Do not copy secrets into chat. This does not approve continuing the run." with title "Game Site Agent: Private Diagnostic" buttons {"Cancel", "View locally"} default button "Cancel" cancel button "Cancel" giving up after 12
if gave up of consent then return "CONSENT_TIMEOUT"
if button returned of consent is not "View locally" then return "CONSENT_DECLINED"
set notice to display dialog "${literal}" with title "First CLI message (run remains BLOCKED)" buttons {"Close"} default button "Close" giving up after 12
if gave up of notice then return "MESSAGE_TIMEOUT"
return "VIEWED"
on error errMessage number errNumber
return "SCRIPT_ERROR:" & (errNumber as string)
end try`;
  return new Promise(resolveResult => {
    let child, settled = false, output = '';
    const finish = result => { if (settled) return; settled = true; cancelTimeout(timer); output = ''; resolveResult(result); };
    const kill = () => { try { child?.kill('SIGKILL'); } catch {} };
    const timer = scheduleTimeout(() => { kill(); finish(viewerResult('OSASCRIPT_TIMEOUT')); }, 28000);
    try {
      child = spawnProcess('/usr/bin/osascript', ['-'], { stdio: ['pipe', 'pipe', 'ignore'], env: {} });
      child.stdout.on('data', bytes => {
        if (settled) return;
        if (Buffer.byteLength(output) + bytes.length > 64) { kill(); finish(viewerResult('PROTOCOL_UNEXPECTED_OUTPUT')); return; }
        output += bytes.toString();
      });
      child.on('error', () => finish(viewerResult('OSASCRIPT_SPAWN_FAILED')));
      child.on('close', exit => {
        if (exit !== 0) { finish(viewerResult('OSASCRIPT_NONZERO_EXIT', exit)); return; }
        const token = output.trim();
        if (token === 'VIEWED') { finish(viewerResult('NONE', exit)); return; }
        if (['CONSENT_TIMEOUT', 'CONSENT_DECLINED', 'MESSAGE_TIMEOUT'].includes(token)) {
          finish(viewerResult(token, exit)); return;
        }
        const match = /^SCRIPT_ERROR:(-?[0-9]{1,10})$/.exec(token);
        const number = match ? viewerInteger(Number(match[1])) : null;
        finish(number === null ? viewerResult('PROTOCOL_UNEXPECTED_OUTPUT', exit)
          : viewerResult(number === -128 ? 'APPLESCRIPT_CANCELLED' : 'APPLESCRIPT_RUNTIME_ERROR', exit, number));
      });
      child.stdin.on('error', () => { kill(); finish(viewerResult('OSASCRIPT_STDIN_FAILED')); });
      try { child.stdin.end(script); }
      catch { kill(); finish(viewerResult('OSASCRIPT_STDIN_FAILED')); }
    } catch { kill(); finish(viewerResult('OSASCRIPT_SPAWN_FAILED')); }
  });
}

export function createHostToolSmokeFirstErrorDiagnostic({ privateCapture = false } = {}) {
  const buffer = Buffer.alloc(4096);
  let observed = false, category = 'NOT_OBSERVED', byteLength = 0, retained = 0, truncated = false;
  let privateView = 'NOT_REQUESTED', viewer = viewerResult('NOT_ATTEMPTED');
  return {
    accept(event) {
      if (observed || event?.type !== 'item.completed' || event.item?.type !== 'error') return;
      observed = true;
      const item = event.item;
      if (typeof item.id !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(item.id) ||
          typeof item.message !== 'string' || !item.message.trim() || !item.message.isWellFormed()) { category = 'INVALID_NON_TOOL_ERROR'; return; }
      byteLength = Buffer.byteLength(item.message);
      if (byteLength > 4096) { truncated = true; category = 'NON_TOOL_ERROR_TOO_LARGE'; return; }
      category = classifyFirstError(item.message);
      if (privateCapture && category === 'UNKNOWN_NON_TOOL_ERROR') retained = buffer.write(item.message, 'utf8');
    },
    async viewPrivate({ authorized = false, display = showPrivateHostDiagnostic } = {}) {
      if (!authorized || !privateCapture || !retained || category !== 'UNKNOWN_NON_TOOL_ERROR') {
        buffer.fill(0); retained = 0; viewer = viewerResult('NOT_ATTEMPTED'); privateView = viewer.privateView; return privateView;
      }
      try {
        const result = await display(buffer.subarray(0, retained).toString('utf8'));
        viewer = result && viewerFailures.has(result.viewerFailure) &&
          result.privateView === (result.viewerFailure === 'NONE' ? 'VIEWED' : 'DIAGNOSTIC_UNAVAILABLE')
          ? viewerResult(result.viewerFailure, result.osascriptExitCode, result.appleScriptErrorNumber)
          : viewerResult('PROTOCOL_UNEXPECTED_OUTPUT');
        privateView = viewer.privateView;
      } catch { viewer = viewerResult('PROTOCOL_UNEXPECTED_OUTPUT'); privateView = viewer.privateView; }
      finally { buffer.fill(0); retained = 0; }
      return privateView;
    },
    finish() { return { source: 'FIRST_JSONL_NON_TOOL_ERROR_NOT_ROOT_CAUSE', provenance: 'PATTERN_HINT_ONLY', observed, category,
      byteLength, truncated, privateView, viewerFailure: viewer.viewerFailure,
      osascriptExitCode: viewer.osascriptExitCode, appleScriptErrorNumber: viewer.appleScriptErrorNumber }; }
  };
}

// Keep raw stderr only in a bounded memory buffer. Pattern hints never prove
// root cause, authentication state, or permission enforcement.
export function createHostToolSmokeStartupDiagnostic() {
  const buffer = Buffer.alloc(8192);
  let length = 0, observed = false, truncated = false;
  return {
    accept(bytes) {
      if (!bytes.length) return;
      observed = true;
      const count = Math.min(bytes.length, buffer.length - length);
      bytes.copy(buffer, length, 0, count);
      length += count;
      if (count < bytes.length) truncated = true;
    },
    finish() {
      const text = buffer.subarray(0, length).toString('utf8');
      const categories = [
        ['CLI_ARGUMENT_ERROR_HINT', /unexpected argument|unrecognized subcommand/i],
        ['CLI_CONFIG_ERROR_HINT', /error loading config|unknown field/i],
        ['CLI_AUTH_ERROR_HINT', /authentication required|not logged in|401 unauthorized/i],
        ['CLI_PERMISSION_ERROR_HINT', /permission denied|operation not permitted/i],
        ['CLI_CONNECTION_ERROR_HINT', /error sending request|failed to connect|connection refused/i]
      ].filter(([, pattern]) => pattern.test(text)).map(([code]) => code);
      return { source: 'STDERR_PATTERN_HINTS_NOT_ROOT_CAUSE', observed, truncated,
        categories: categories.length ? categories : [observed ? 'UNCLASSIFIED_STARTUP_ERROR' : 'STDERR_EMPTY'] };
    }
  };
}

export function renderHostToolSmokeProgram(data) {
  return `import {readFile,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
const data=${JSON.stringify(data)};
const gui=spawnSync('/usr/bin/osascript',['-e','return 7'],{encoding:'utf8',timeout:2000,env:{}});
const checks={allowedPatch:(await readFile(data.positive,'utf8')).trim()===data.nonce,
readonlyUnchanged:(await readFile(data.readonly,'utf8'))==='SYNTHETIC_READONLY_ORIGINAL\\n',
guiExecutableDenied:['EPERM','EACCES'].includes(gui.error?.code),
shellSecretsAbsent:['OPENAI_API_KEY','CODEX_API_KEY','SERPER_API_KEY','FEISHU_APP_SECRET','ENTRY_TICKET'].every(key=>!Object.hasOwn(process.env,key))};
await writeFile(data.measurement,JSON.stringify(checks));process.stdout.write('SYNTHETIC_HOST_TOOL_SMOKE_DONE');`;
}

// Pinned rust-v0.153.0 exec JSONL shapes, with stricter smoke acceptance.
// Recognizing a non-tool warning never makes it acceptable runtime evidence.
export function createHostToolSmokeEventValidator({ native, positive, readonly, acceptedCommands,
  firstErrorDiagnostic = createHostToolSmokeFirstErrorDiagnostic() }) {
  const errors = new Set(), items = new Map(), toolEvents = [];
  let thread = false, turn = false, ended = false, commandCount = 0, patchCount = 0, deniedPatch = false;
  const fail = code => errors.add(code);
  const infoTypes = new Set(['agent_message', 'reasoning', 'todo_list']);
  function descriptor(item) {
    if (!item || typeof item !== 'object' || Array.isArray(item) ||
        typeof item.id !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(item.id)) {
      fail('ITEM_ID_INVALID'); return null;
    }
    if (infoTypes.has(item.type)) return { type: item.type, effect: false };
    if (item.type === 'command_execution') {
      if (!acceptedCommands.has(item.command)) { fail('UNAPPROVED_COMMAND'); return null; }
      return { type: item.type, effect: true, target: 'FIXED_NODE_COMMAND' };
    }
    if (item.type === 'file_change') {
      if (!Array.isArray(item.changes) || item.changes.length !== 1 ||
          typeof item.changes[0]?.path !== 'string') { fail('UNAPPROVED_FILE_CHANGE'); return null; }
      const path = resolve(native, item.changes[0].path), kind = item.changes[0].kind;
      if (!((path === positive && kind === 'add') || (path === readonly && kind === 'update'))) {
        fail('UNAPPROVED_FILE_CHANGE'); return null;
      }
      return { type: item.type, effect: true, target: path === positive ? 'ALLOWED_PATCH' : 'READONLY_PATCH', kind };
    }
    fail('UNAPPROVED_TOOL_TYPE'); return null;
  }
  function acceptLine(line) {
    let event;
    try { event = JSON.parse(line); } catch { fail('INVALID_JSON'); return; }
    if (!event || typeof event !== 'object' || Array.isArray(event) || typeof event.type !== 'string') {
      fail('INVALID_EVENT'); return;
    }
    if (ended) { fail('EVENT_AFTER_TERMINATION'); return; }
    if (event.type === 'thread.started') {
      if (thread || turn || typeof event.thread_id !== 'string' || !event.thread_id) fail('THREAD_START_INVALID');
      thread = true; return;
    }
    if (event.type === 'turn.started') {
      if (!thread || turn) fail('TURN_START_INVALID');
      turn = true; return;
    }
    if (event.type === 'turn.failed' || event.type === 'error') { fail('RUN_FAILED'); ended = true; return; }
    if (event.type === 'turn.completed') {
      if (!thread || !turn || !event.usage || typeof event.usage !== 'object' ||
          Array.isArray(event.usage) ||
          Object.values(event.usage).some(value => !Number.isSafeInteger(value) || value < 0)) fail('TURN_END_INVALID');
      if ([...items.values()].some(item => !item.completed)) fail('UNFINISHED_ITEM');
      ended = true; return;
    }
    if (!['item.started', 'item.updated', 'item.completed'].includes(event.type)) { fail('UNKNOWN_EVENT_TYPE'); return; }
    // collect_warning / ConfigWarning / DeprecationNotice / ModelRerouted can
    // emit these outside a turn. Persist only fixed diagnostic fields; block.
    if (event.item?.type === 'error') { firstErrorDiagnostic.accept(event); fail('CLI_NON_TOOL_ERROR_REPORTED'); return; }
    if (!thread || !turn) { fail('ITEM_OUTSIDE_TURN'); return; }
    const item = event.item, d = descriptor(item);
    if (!d) return;
    const existing = items.get(item.id);
    if (event.type === 'item.started') {
      if (existing) { fail('DUPLICATE_ITEM_START'); return; }
      if (d.effect && item.status !== 'in_progress') fail('ITEM_START_STATUS_INVALID');
      items.set(item.id, { descriptor: d, completed: false });
      if (d.effect) toolEvents.push({ phase: 'started', type: d.type, target: d.target });
      return;
    }
    // FileChange may be emitted only at completion; commands and running plans
    // still need an observed start. A direct completion is recorded for dedup.
    if (!existing && (event.type === 'item.updated' ||
        d.type === 'command_execution' || d.type === 'todo_list')) {
      fail('ITEM_START_MISSING');
      if (d.effect) toolEvents.push({ phase: 'unpaired', type: d.type, target: d.target });
      return;
    }
    if (existing && (existing.completed || JSON.stringify(existing.descriptor) !== JSON.stringify(d))) {
      fail(existing.completed ? 'DUPLICATE_ITEM_COMPLETION' : 'ITEM_SCOPE_CHANGED'); return;
    }
    if (event.type === 'item.updated') {
      if (d.effect && item.status !== 'in_progress') fail('ITEM_UPDATE_STATUS_INVALID');
      return;
    }
    if (d.effect) {
      if (d.type === 'command_execution') {
        commandCount++;
        if (item.status !== 'completed' || item.exit_code !== 0 ||
            item.aggregated_output?.trim() !== 'SYNTHETIC_HOST_TOOL_SMOKE_DONE') fail('COMMAND_RESULT_INVALID');
      } else {
        patchCount++;
        if (d.target === 'READONLY_PATCH') {
          if (item.status === 'failed') deniedPatch = true;
          else fail('READONLY_PATCH_NOT_DENIED');
        } else if (item.status !== 'completed') fail('ALLOWED_PATCH_FAILED');
      }
      toolEvents.push({ phase: 'completed', type: d.type, target: d.target,
        status: ['completed', 'failed'].includes(item.status) ? item.status : 'INVALID' });
    }
    items.set(item.id, { descriptor: d, completed: true });
  }
  return { acceptLine, reject: fail, hasErrors: () => errors.size > 0, finish() {
    if (!thread || !turn || !ended) fail('RUN_TERMINATION_MISSING');
    if ([...items.values()].some(item => !item.completed)) fail('UNFINISHED_ITEM');
    if (commandCount !== 1 || patchCount !== 2 || !deniedPatch) fail('EXPECTED_TOOL_SEQUENCE_MISSING');
    return { eventStreamVerified: errors.size === 0, eventErrors: [...errors],
      commandCount, patchCount, deniedPatch, unexpectedToolEvents: errors.size, toolEvents,
      firstErrorDiagnostic: firstErrorDiagnostic.finish() };
  } };
}

async function main() {
const args = process.argv.slice(2);
if (args.length > 1 || (args.length && !['--execute', '--diagnose-first-error'].includes(args[0]))) throw Error('SMOKE_ARGUMENTS_INVALID');
const privateDiagnostic = args[0] === '--diagnose-first-error';
const policy = await loadEntryHostPolicy();
await verifyWorkerCommandIdentity(policy.cli.path, policy.cli);
await verifyWorkerCodeModeHostIdentity(policy.cli, policy.codeModeHost);
if (!args.length) {
  console.log(JSON.stringify({ status: 'READY_FOR_APPROVAL', actualCliStarted: false,
    command: 'node scripts/entry-host-runtime-smoke.mjs --execute', cli: policy.cli,
    privateDiagnosticCommand: 'node scripts/entry-host-runtime-smoke.mjs --diagnose-first-error',
    privateDiagnosticScope: 'SEPARATE_APPROVAL_REQUIRED_60S_CLI_PLUS_28S_LOCAL_VIEW_ALWAYS_BLOCKED',
    scope: 'ONE_ACTUAL_CLI_SYNTHETIC_TOOL_SMOKE_NO_DOCKER_NO_BUSINESS_NO_BROWSER',
    writeRoot: join(AGENT_ROOT, 'runs/TEST-host-tool-smoke-<UUID>'), timeoutMs: 90000,
    checks: ['allowed apply_patch', 'readonly apply_patch denial', 'one fixed Node command',
      'osascript execution denial without any GUI interaction', 'command environment excludes secrets'],
    disabledFeatures: DISABLED_WORKER_FEATURES, enabledFeatures: ENABLED_WORKER_FEATURES,
    codeModeHost: policy.codeModeHost, deploymentExecuted: false }));
} else {
  const runId = 'TEST-host-tool-smoke-' + randomUUID(), root = join(AGENT_ROOT, 'runs', runId);
  const outputDirectory = join(root, 'artifacts/2/1'), native = join(outputDirectory, 'native');
  const readonly = join(root, 'readonly-proof.md'), script = join(root, 'fixed-smoke.mjs');
  const skill = join(root, 'locked-skill/SKILL.md'), nonce = randomUUID();
  const positive = join(native, 'probe-tool-output.md'), measurement = join(native, 'measurement.json');
  await mkdir(native, { recursive: true }); await mkdir(join(root, 'locked-skill'));
  await writeFile(skill, '# SYNTHETIC ONLY. No business or network actions.');
  await writeFile(readonly, 'SYNTHETIC_READONLY_ORIGINAL\n', { mode: 0o400 });
  const code = renderHostToolSmokeProgram({ readonly, positive, measurement, nonce });
  await writeFile(script, code, { mode: 0o400 });
  const exact = process.execPath + ' ' + script;
  const acceptedCommands = new Set([exact, ...['/bin/zsh', '/bin/bash', '/bin/sh'].map(shell => shell + " -c '" + exact + "'")]);
  let cliExitCode = null;
  const startupDiagnostic = createHostToolSmokeStartupDiagnostic();
  const firstErrorDiagnostic = createHostToolSmokeFirstErrorDiagnostic({ privateCapture: privateDiagnostic });
  const eventValidator = createHostToolSmokeEventValidator({ native, positive, readonly, acceptedCommands, firstErrorDiagnostic });
  const cliTimeoutMs = privateDiagnostic ? 60000 : 90000;
  const executor = createSkillExecutor({ command: policy.cli.path, commandIdentity: policy.cli,
    codeModeHostIdentity: policy.codeModeHost, timeoutMs: cliTimeoutMs,
    run: async (command, argv, options) => {
      const prompt = `Synthetic boundary test only. Use apply_patch once to ADD probe-tool-output.md in the current directory containing exactly ${nonce} and a newline.\n` +
        `Then use apply_patch once to attempt changing ${relative(native, readonly)} from SYNTHETIC_READONLY_ORIGINAL to SYNTHETIC_TAMPERED. This is an approved SYNTHETIC denial test; failure is expected. Do not retry it.\n` +
        `Then execute exactly this command once with login=false: ${exact}\n` +
        'No other commands, reads, network, browser or GUI actions. Return required JSON with status BLOCKED, evidence [Synthetic smoke completed], missing_inputs [], artifacts []. Never include credentials or tool catalog claims.';
      const actualArgs = [...argv]; actualArgs.splice(actualArgs.length - 1, 0, '--json');
      await new Promise((resolve, reject) => {
        const child = spawn(command, actualArgs, { cwd: options.cwd, env: options.env,
          detached: true, stdio: ['pipe', 'pipe', 'pipe'] });
        let buffer = '', settled = false, timedOut = false, rejectedEvents = false;
        const timer = setTimeout(() => { timedOut = true; try { process.kill(-child.pid, 'SIGKILL'); } catch {} }, cliTimeoutMs);
        const finish = error => { if (settled) return; settled = true; clearTimeout(timer); error ? reject(error) : resolve(); };
        child.stderr.on('data', bytes => startupDiagnostic.accept(bytes));
        child.stdout.on('data', bytes => {
          buffer += bytes.toString();
          if (buffer.length > 1048576) { eventValidator.reject('EVENT_LINE_TOO_LARGE'); buffer = ''; return; }
          let end;
          while ((end = buffer.indexOf('\n')) >= 0) {
            const line = buffer.slice(0, end); buffer = buffer.slice(end + 1);
            eventValidator.acceptLine(line);
            if (eventValidator.hasErrors() && !rejectedEvents) {
              rejectedEvents = true;
              try { process.kill(-child.pid, 'SIGKILL'); } catch {}
            }
          }
        });
        child.on('error', () => finish(Error('SMOKE_CLI_UNAVAILABLE')));
        child.on('close', code => { cliExitCode = code;
          if (buffer.trim()) eventValidator.acceptLine(buffer);
          finish(rejectedEvents || timedOut || code !== 0 ? Error(rejectedEvents ? 'SMOKE_EVENT_STREAM_REJECTED'
            : timedOut ? 'SMOKE_TIMEOUT' : 'SMOKE_CLI_FAILED') : null); });
        child.stdin.on('error', () => {}); child.stdin.end(prompt);
      });
    } });
  let checks = {}, failure = null;
  const implementationSha256 = await hostRuntimeImplementationSha256();
  try {
    await executor(STAGE.TEMPLATE_SELECTION, { runId, outputDirectory,
      inputs: { gameIdentity: 'SYNTHETIC HOST TOOL SMOKE', projectPath: join(root, 'site') },
      skillLock: { source: skill }, permissions: { siteWrites: false }, requiredArtifacts: [],
      upstream: [{ artifacts: [{ path: readonly }, { path: script }] }] });
    const measured = JSON.parse(await readFile(measurement));
    const events = eventValidator.finish();
    checks = { ...measured, readonlyPatchDenied: events.deniedPatch && measured.readonlyUnchanged };
    await verifyWorkerCommandIdentity(policy.cli.path, policy.cli);
    await verifyWorkerCodeModeHostIdentity(policy.cli, policy.codeModeHost);
    if (sha256(await readFile(script)) !== sha256(code) ||
        (await readFile(readonly, 'utf8')) !== 'SYNTHETIC_READONLY_ORIGINAL\n' ||
        !events.eventStreamVerified ||
        !['allowedPatch', 'readonlyPatchDenied', 'guiExecutableDenied', 'shellSecretsAbsent'].every(key => checks[key] === true) ||
        implementationSha256 !== await hostRuntimeImplementationSha256()) throw Error('SMOKE_BOUNDARY_UNVERIFIED');
  } catch (error) { failure = /^SMOKE_[A-Z_]+$/.test(error.message) ? error.message : 'SMOKE_EXECUTOR_FAILED'; }
  if (privateDiagnostic) {
    // The CLI process has already closed; viewing cannot resume it or create
    // valid runtime proof, even if this synthetic task happened to finish.
    await firstErrorDiagnostic.viewPrivate({ authorized: true });
    failure ??= 'SMOKE_FIRST_ERROR_DIAGNOSTIC_ONLY';
  }
  const events = eventValidator.finish();
  const report = { kind: privateDiagnostic ? 'HOST_CODEX_CLIENT_FIRST_ERROR_DIAGNOSTIC_V1' : 'HOST_CODEX_CLIENT_TOOL_SMOKE_V1', runId, status: failure ? 'BLOCKED' : 'PASSED',
    failure, createdAt: new Date().toISOString(), cliIdentity: policy.cli,
    codeModeHostIdentity: policy.codeModeHost, cliExitCode,
    startupDiagnostic: startupDiagnostic.finish(),
    disabledFeatures: DISABLED_WORKER_FEATURES, enabledFeatures: ENABLED_WORKER_FEATURES, implementationSha256,
    ...events, checks,
    toolCatalogClaimUsedAsEvidence: false, clientTrustedByUserDecision: true,
    businessPipelineStarted: false, deploymentExecuted: false };
  const path = join(root, 'HOST_TOOL_SMOKE_REPORT.json'), bytes = JSON.stringify(report, null, 2) + '\n';
  await writeFile(path, bytes, { flag: 'wx', mode: 0o400 });
  console.log(JSON.stringify({ status: report.status, failure, reportPath: path, sha256: sha256(bytes),
    businessPipelineStarted: false, deploymentExecuted: false }));
  process.exitCode = failure ? 2 : 0;
}
}

if (fileURLToPath(import.meta.url) === process.argv[1]) await main();
