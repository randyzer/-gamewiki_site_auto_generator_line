import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { EventEmitter } from 'node:events';
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as smoke from '../scripts/entry-host-runtime-smoke.mjs';

test('pinned warning templates produce hints only, remain blocked and never serialize dynamic values', () => {
  const examples = [
    ['CONFIG_REQUIREMENT_FALLBACK', 'Configured value for `approval_policy` is disallowed by requirements; falling back to required value Never. Details: SYNTHETIC_SECRET'],
    ['PERMISSION_PROFILE_FALLBACK', 'Configured value for `permission_profile` is disallowed by requirements; falling back from `SYNTHETIC_SECRET` to required value `locked`.'],
    ['FILESYSTEM_PATH_IGNORED', 'Configured filesystem path `:SYNTHETIC_SECRET` is not recognized by this version of Codex and will be ignored. Upgrade Codex if this path is required.'],
    ['FILESYSTEM_PATH_IGNORED', 'Configured filesystem path `:future` with nested entry `SYNTHETIC_SECRET` is not recognized by this version of Codex and will be ignored. Upgrade Codex if this path is required.'],
    ['FILESYSTEM_ENTRIES_MISSING', 'Permissions profile `SYNTHETIC_SECRET` does not define any recognized filesystem entries for this version of Codex. Filesystem access will remain restricted. Upgrade Codex if this profile expects filesystem permissions.'],
    ['DEPRECATED_SETTING', '`[features].web_search_request` is deprecated because web search is enabled by default.'],
    ['DEPRECATED_SETTING', '`[features].use_legacy_landlock` is deprecated and will be removed soon. (Remove this setting to stop opting into the legacy Linux sandbox behavior.)'],
    ['UNSTABLE_FEATURE_NOTICE', 'Under-development features enabled: shell_zsh_fork. Under-development features are incomplete and may behave unpredictably. To suppress this warning, set `suppress_unstable_features_warning = true` in /private/SYNTHETIC_SECRET.'],
    ['MODEL_REROUTED', 'model rerouted: synthetic-a -> synthetic-b (SYNTHETIC_SECRET)'],
    ['EVENT_STREAM_LAGGED', 'in-process app-server event stream lagged; dropped 1 events']
  ];
  for (const [category, message] of examples) {
    const diagnostic = smoke.createHostToolSmokeFirstErrorDiagnostic();
    const parser = smoke.createHostToolSmokeEventValidator({ ...eventOptions, firstErrorDiagnostic: diagnostic });
    parser.acceptLine(JSON.stringify({ type: 'item.completed', item: { id: 'first', type: 'error', message } }));
    const result = parser.finish();
    assert.equal(result.firstErrorDiagnostic.category, category);
    assert.equal(result.eventStreamVerified, false);
    assert.equal(result.eventErrors.includes('CLI_NON_TOOL_ERROR_REPORTED'), true);
    assert.equal(JSON.stringify(result).includes('SYNTHETIC_SECRET'), false);
  }
  for (const message of ['model rerouted: missing fields', 'warning deprecated permissions',
    '`[features].made_up` is deprecated because web search is enabled by default.',
    'Configured value for `SYNTHETIC_SECRET` is disallowed by requirements; falling back to required value x. Details: y',
    'in-process app-server event stream lagged; dropped many events']) {
    const diagnostic = smoke.createHostToolSmokeFirstErrorDiagnostic();
    diagnostic.accept({ type: 'item.completed', item: { id: 'first', type: 'error', message } });
    assert.equal(diagnostic.finish().category, 'UNKNOWN_NON_TOOL_ERROR');
  }
});

test('first error diagnostics retain only one bounded message and never serialize its contents', async () => {
  assert.equal(typeof smoke.createHostToolSmokeFirstErrorDiagnostic, 'function');
  const diagnostic = smoke.createHostToolSmokeFirstErrorDiagnostic({ privateCapture: true });
  diagnostic.accept({ type: 'item.completed', item: { id: 'first', type: 'error', message: 'SYNTHETIC_TOKEN /private/synthetic account@example.invalid' } });
  diagnostic.accept({ type: 'item.completed', item: { id: 'second', type: 'error', message: 'SECOND_MESSAGE' } });
  let displayed;
  assert.equal(await diagnostic.viewPrivate({ authorized: true, display: async message => {
    displayed = message; return { privateView: 'VIEWED', viewerFailure: 'NONE', osascriptExitCode: 0, appleScriptErrorNumber: null };
  } }), 'VIEWED');
  assert.match(displayed, /^SYNTHETIC_TOKEN/); assert.equal(displayed.includes('SECOND_MESSAGE'), false);
  const report = JSON.stringify(diagnostic.finish());
  for (const secret of ['SYNTHETIC_TOKEN', '/private/synthetic', 'example.invalid', 'SECOND_MESSAGE'])
    assert.equal(report.includes(secret), false);
  assert.equal(await diagnostic.viewPrivate({ authorized: true, display: async () => { throw Error('must be cleared'); } }), 'DIAGNOSTIC_UNAVAILABLE');
});

test('private message delivery is opt-in and oversize, malformed or missing error messages never display', async () => {
  assert.equal(typeof smoke.createHostToolSmokeFirstErrorDiagnostic, 'function');
  for (const item of [{ id: 'bad', type: 'error' }, { id: 'bad', type: 'error', message: '界'.repeat(1400) },
    { id: '', type: 'error', message: 'SYNTHETIC' }]) {
    const diagnostic = smoke.createHostToolSmokeFirstErrorDiagnostic({ privateCapture: true });
    diagnostic.accept({ type: 'item.completed', item });
    assert.equal(await diagnostic.viewPrivate({ authorized: true, display: async () => { throw Error('must not display'); } }), 'DIAGNOSTIC_UNAVAILABLE');
    assert.equal(diagnostic.finish().privateView, 'DIAGNOSTIC_UNAVAILABLE');
  }
  for (const enabled of [false, true]) {
    const diagnostic = smoke.createHostToolSmokeFirstErrorDiagnostic({ privateCapture: enabled });
    diagnostic.accept({ type: 'item.completed', item: { id: 'first', type: 'error', message: 'SYNTHETIC' } });
    assert.equal(await diagnostic.viewPrivate({ authorized: false, display: async () => { throw Error('not authorized'); } }), 'DIAGNOSTIC_UNAVAILABLE');
  }
});

test('trusted private viewer sends escaped message through stdin only and discards subprocess output', async () => {
  assert.equal(typeof smoke.showPrivateHostDiagnostic, 'function');
  let command, argv, input;
  const spawnProcess = (cmd, args) => {
    command = cmd; argv = args;
    const child = new EventEmitter(); child.stdout = new EventEmitter(); child.stdin = new EventEmitter();
    child.kill = () => {};
    child.stdin.end = script => { input = script; queueMicrotask(() => {
      child.stdout.emit('data', Buffer.from('VIEWED\n')); child.emit('close', 0);
    }); };
    return child;
  };
  assert.deepEqual(await smoke.showPrivateHostDiagnostic('SYNTHETIC "quoted" \\ value\nline', { platform: 'darwin', spawnProcess }),
    { privateView: 'VIEWED', viewerFailure: 'NONE', osascriptExitCode: 0, appleScriptErrorNumber: null });
  assert.equal(command, '/usr/bin/osascript'); assert.deepEqual(argv, ['-']);
  assert.ok(input.includes('SYNTHETIC \\"quoted\\"'));
  assert.equal(argv.join(' ').includes('SYNTHETIC'), false);
  assert.equal((await smoke.showPrivateHostDiagnostic('SYNTHETIC', { platform: 'linux', spawnProcess })).viewerFailure, 'INPUT_REJECTED');
  assert.equal((await smoke.showPrivateHostDiagnostic('SYNTHETIC', { platform: 'darwin',
    spawnProcess: () => { throw Error('SYNTHETIC_SECRET /private/path'); } })).viewerFailure, 'OSASCRIPT_SPAWN_FAILED');
  const declined = (...args) => {
    const child = spawnProcess(...args);
    child.stdin.end = () => queueMicrotask(() => { child.stdout.emit('data', Buffer.from('SYNTHETIC_SECRET')); child.emit('close', 1); });
    return child;
  };
  assert.equal((await smoke.showPrivateHostDiagnostic('SYNTHETIC', { platform: 'darwin', spawnProcess: declined })).viewerFailure, 'OSASCRIPT_NONZERO_EXIT');
});

function fakeViewerProcess({ output = 'VIEWED\n', exitCode = 0, mode, capture = () => {} } = {}) {
  return () => {
    const child = new EventEmitter(); child.stdout = new EventEmitter(); child.stdin = new EventEmitter();
    child.kill = () => {};
    child.stdin.end = script => {
      capture(script);
      if (mode === 'stdin-throw') throw Error('SYNTHETIC_SECRET');
      queueMicrotask(() => {
        if (mode === 'spawn') { child.emit('error', Error('SYNTHETIC_SECRET')); return; }
        if (mode === 'stdin') { child.stdin.emit('error', Error('SYNTHETIC_SECRET')); return; }
        if (mode === 'timeout') return;
        child.stdout.emit('data', Buffer.from(output)); child.emit('close', exitCode);
      });
    };
    return child;
  };
}

test('viewer failures preserve distinct fixed reasons and numeric codes without raw subprocess data', async () => {
  for (const [setup, reason, number] of [
    [{ mode: 'spawn' }, 'OSASCRIPT_SPAWN_FAILED', null],
    [{ mode: 'stdin' }, 'OSASCRIPT_STDIN_FAILED', null],
    [{ mode: 'stdin-throw' }, 'OSASCRIPT_STDIN_FAILED', null],
    [{ exitCode: 1 }, 'OSASCRIPT_NONZERO_EXIT', null],
    [{ output: 'CONSENT_TIMEOUT\n' }, 'CONSENT_TIMEOUT', null],
    [{ output: 'CONSENT_DECLINED\n' }, 'CONSENT_DECLINED', null],
    [{ output: 'SCRIPT_ERROR:-128\n' }, 'APPLESCRIPT_CANCELLED', -128],
    [{ output: 'SCRIPT_ERROR:-1743\n' }, 'APPLESCRIPT_RUNTIME_ERROR', -1743],
    [{ output: 'MESSAGE_TIMEOUT\n' }, 'MESSAGE_TIMEOUT', null],
    [{ output: 'SYNTHETIC_SECRET /private/path https://example.invalid/?token=secret' }, 'PROTOCOL_UNEXPECTED_OUTPUT', null],
    [{ output: 'SCRIPT_ERROR:999999999999999999999' }, 'PROTOCOL_UNEXPECTED_OUTPUT', null],
    [{ output: 'VIEWED' + ' '.repeat(1000) }, 'PROTOCOL_UNEXPECTED_OUTPUT', null]
  ]) {
    const result = await smoke.showPrivateHostDiagnostic('SYNTHETIC', { platform: 'darwin', spawnProcess: fakeViewerProcess(setup) });
    assert.equal(result.privateView, 'DIAGNOSTIC_UNAVAILABLE'); assert.equal(result.viewerFailure, reason);
    assert.equal(result.appleScriptErrorNumber, number);
    const bytes = JSON.stringify(result);
    for (const privateText of ['SYNTHETIC_SECRET', '/private/path', 'example.invalid', 'token=secret']) assert.equal(bytes.includes(privateText), false);
  }
  let timeoutCallback;
  const pending = smoke.showPrivateHostDiagnostic('SYNTHETIC', { platform: 'darwin', spawnProcess: fakeViewerProcess({ mode: 'timeout' }),
    scheduleTimeout: (fn, milliseconds) => { assert.equal(milliseconds, 28000); timeoutCallback = fn; return 1; }, cancelTimeout: () => {} });
  timeoutCallback();
  assert.equal((await pending).viewerFailure, 'OSASCRIPT_TIMEOUT');
});

test('viewer rejects malformed Unicode and persists only validated viewer result fields', async () => {
  const malformed = '\ud800';
  const rejected = await smoke.showPrivateHostDiagnostic(malformed, { platform: 'darwin', spawnProcess: () => { throw Error('must not spawn'); } });
  assert.equal(rejected.viewerFailure, 'INPUT_REJECTED');
  const invalid = smoke.createHostToolSmokeFirstErrorDiagnostic({ privateCapture: true });
  invalid.accept({ type: 'item.completed', item: { type: 'error', id: 'first', message: malformed } });
  assert.equal(invalid.finish().category, 'INVALID_NON_TOOL_ERROR');
  const diagnostic = smoke.createHostToolSmokeFirstErrorDiagnostic({ privateCapture: true });
  diagnostic.accept({ type: 'item.completed', item: { type: 'error', id: 'first', message: 'SYNTHETIC_SECRET' } });
  await diagnostic.viewPrivate({ authorized: true, display: async () => ({ privateView: 'DIAGNOSTIC_UNAVAILABLE',
    viewerFailure: 'APPLESCRIPT_RUNTIME_ERROR', osascriptExitCode: 0, appleScriptErrorNumber: -1743, raw: 'SYNTHETIC_SECRET' }) });
  assert.equal(diagnostic.finish().viewerFailure, 'APPLESCRIPT_RUNTIME_ERROR');
  assert.equal(diagnostic.finish().appleScriptErrorNumber, -1743);
  assert.equal(JSON.stringify(diagnostic.finish()).includes('SYNTHETIC_SECRET'), false);
});

test('current viewer scripts compile on macOS with synthetic text only and are never executed', { skip: process.platform !== 'darwin' }, async () => {
  const scripts = [];
  for (const message of ['SYNTHETIC', 'SYNTHETIC "quote" \\ slash\nline', 'SYNTHETIC 中文 😀'])
    await smoke.showPrivateHostDiagnostic(message, { platform: 'darwin', spawnProcess: fakeViewerProcess({ capture: script => scripts.push(script) }) });
  const directory = await mkdtemp(join(tmpdir(), 'c2c-viewer-compile-'));
  try {
    const compiled = spawnSync('/usr/bin/osacompile', ['-l', 'AppleScript', '-o', join(directory, 'synthetic.scpt')],
      { input: scripts.join('\n'), encoding: 'utf8', timeout: 5000, env: {} });
    assert.equal(compiled.status, 0, compiled.stderr); assert.equal(compiled.error, undefined);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('startup diagnostics retain only bounded category hints across chunks', () => {
  const diagnostic = smoke.createHostToolSmokeStartupDiagnostic();
  diagnostic.accept(Buffer.from('error: unexpected argu'));
  diagnostic.accept(Buffer.from('ment --synthetic\nError loading config: unknown field\n'));
  assert.deepEqual(diagnostic.finish(), {
    source: 'STDERR_PATTERN_HINTS_NOT_ROOT_CAUSE', observed: true, truncated: false,
    categories: ['CLI_ARGUMENT_ERROR_HINT', 'CLI_CONFIG_ERROR_HINT']
  });
});

test('unknown or secret-bearing stderr never survives in the diagnostic report', () => {
  for (const line of ['SYNTHETIC_TOKEN=DO_NOT_PERSIST /private/synthetic/auth.json',
    'Authentication required SYNTHETIC_TOKEN=DO_NOT_PERSIST',
    'Permission denied /private/synthetic/auth.json',
    'Error sending request https://synthetic.invalid/?secret=DO_NOT_PERSIST']) {
    const diagnostic = smoke.createHostToolSmokeStartupDiagnostic();
    diagnostic.accept(Buffer.from(line));
    const output = JSON.stringify(diagnostic.finish());
    assert.equal(output.includes('DO_NOT_PERSIST'), false);
    assert.equal(output.includes('auth.json'), false);
    assert.equal(output.includes('synthetic.invalid'), false);
    assert.equal(output.includes('SYNTHETIC_TOKEN'), false);
  }
  const unknown = smoke.createHostToolSmokeStartupDiagnostic();
  unknown.accept(Buffer.from('SYNTHETIC UNKNOWN'));
  assert.deepEqual(unknown.finish().categories, ['UNCLASSIFIED_STARTUP_ERROR']);
  assert.deepEqual(smoke.createHostToolSmokeStartupDiagnostic().finish().categories, ['STDERR_EMPTY']);
});

test('diagnostic capacity cannot expand with large or repeated stderr chunks', () => {
  const diagnostic = smoke.createHostToolSmokeStartupDiagnostic();
  diagnostic.accept(Buffer.alloc(8192, 'x'));
  diagnostic.accept(Buffer.from('error: unexpected argument SYNTHETIC_SECRET'));
  const result = diagnostic.finish();
  assert.equal(result.truncated, true);
  assert.deepEqual(result.categories, ['UNCLASSIFIED_STARTUP_ERROR']);
});

async function evaluate({ guiDenied = true, secret = false } = {}) {
  const data = { readonly: '/synthetic/readonly', positive: '/synthetic/positive',
    measurement: '/synthetic/measurement', nonce: 'SYNTHETIC_NONCE' };
  const files = new Map([[data.readonly, 'SYNTHETIC_READONLY_ORIGINAL\n'], [data.positive, data.nonce + '\n']]);
  const source = smoke.renderHostToolSmokeProgram(data)
    .replace("import {readFile,writeFile} from 'node:fs/promises';", 'const {readFile,writeFile}=testFs;')
    .replace("import {spawnSync} from 'node:child_process';", 'const {spawnSync}=testChild;');
  await new vm.Script('(async()=>{' + source + '})()').runInNewContext({
    testFs: { readFile: async path => files.get(path), writeFile: async (path, bytes) => files.set(path, bytes) },
    testChild: { spawnSync: (command, args) => {
      assert.equal(command, '/usr/bin/osascript'); assert.deepEqual([...args], ['-e', 'return 7']);
      return guiDenied ? { error: { code: 'EPERM' } } : { status: 0 };
    } }, process: { env: secret ? { ENTRY_TICKET: 'SYNTHETIC_SECRET' } : {}, stdout: { write: () => {} } }
  });
  return JSON.parse(files.get(data.measurement));
}

test('generated tool-smoke program executes with its bound nonce and readonly bytes', async () => {
  assert.deepEqual(await evaluate(), { allowedPatch: true, readonlyUnchanged: true,
    guiExecutableDenied: true, shellSecretsAbsent: true });
});

test('successful GUI helper execution and inherited synthetic secrets cannot masquerade as denial', async () => {
  const measured = await evaluate({ guiDenied: false, secret: true });
  assert.equal(measured.guiExecutableDenied, false);
  assert.equal(measured.shellSecretsAbsent, false);
});

const eventOptions = { native: '/synthetic/native', positive: '/synthetic/native/probe-tool-output.md',
  readonly: '/synthetic/readonly-proof.md', acceptedCommands: new Set(['node fixed-smoke.mjs']) };
// Synthetic fixtures following openai/codex rust-v0.153.0 exec_events.rs and
// event_processor_with_jsonl_output.rs; these are not captured runtime evidence.
function normalEvents() {
  return [{ type: 'thread.started', thread_id: 'synthetic-thread' }, { type: 'turn.started' },
    { type: 'item.completed', item: { id: 'patch-ok', type: 'file_change', status: 'completed',
      changes: [{ path: eventOptions.positive, kind: 'add' }] } },
    { type: 'item.completed', item: { id: 'patch-deny', type: 'file_change', status: 'failed',
      changes: [{ path: eventOptions.readonly, kind: 'update' }] } },
    { type: 'item.started', item: { id: 'command', type: 'command_execution', command: 'node fixed-smoke.mjs', status: 'in_progress' } },
    { type: 'item.completed', item: { id: 'command', type: 'command_execution', command: 'node fixed-smoke.mjs',
      status: 'completed', exit_code: 0, aggregated_output: 'SYNTHETIC_HOST_TOOL_SMOKE_DONE' } },
    { type: 'item.completed', item: { id: 'message', type: 'agent_message', text: 'SYNTHETIC ONLY' } },
    { type: 'turn.completed', usage: { input_tokens: 1, output_tokens: 1 } }];
}
function parseEvents(events) {
  const parser = smoke.createHostToolSmokeEventValidator(eventOptions);
  for (const event of events) parser.acceptLine(typeof event === 'string' ? event : JSON.stringify(event));
  return parser.finish();
}

test('pinned 0.153 file changes complete directly while commands remain paired', () => {
  const result = parseEvents(normalEvents());
  assert.equal(result.eventStreamVerified, true);
  assert.equal(result.commandCount, 1); assert.equal(result.patchCount, 2);
  assert.equal(result.deniedPatch, true); assert.deepEqual(result.eventErrors, []);
});

test('extra or unknown tool attempts cannot disappear when they have no completion', () => {
  for (const item of [{ id: 'extra', type: 'mcp_tool_call' },
    { id: 'extra', type: 'collab_tool_call' }, { id: 'extra', type: 'web_search' },
    { id: 'extra', type: 'command_execution', command: 'UNAPPROVED COMMAND', status: 'in_progress' },
    { id: 'extra', type: 'unknown_tool' }]) {
    const events = normalEvents(); events.splice(2, 0, { type: 'item.started', item });
    assert.equal(parseEvents(events).eventStreamVerified, false);
  }
});

test('unknown events and damaged JSON are explicit rejection evidence', () => {
  for (const event of [{ type: 'unknown.event' }, '{not-json}', 'null']) {
    const events = normalEvents(); events.splice(2, 0, event);
    assert.equal(parseEvents(events).eventStreamVerified, false);
  }
});

test('missing command completion, duplicate completion and unpaired command all reject', () => {
  for (const mutate of [events => events.filter(x => !(x.type === 'item.completed' && x.item.id === 'command')),
    events => [...events.slice(0, 3), events[2], ...events.slice(3)],
    events => events.filter(x => !(x.type === 'item.started' && x.item.id === 'command'))]) {
    assert.equal(parseEvents(mutate(normalEvents())).eventStreamVerified, false);
  }
});

test('file changes with an observed start still require matching scope and completion', () => {
  const events = normalEvents();
  const start = { type: 'item.started', item: { ...events[2].item, status: 'in_progress' } };
  events.splice(2, 0, start);
  assert.equal(parseEvents(events).eventStreamVerified, true);
  events[3] = { ...events[3], item: { ...events[3].item,
    changes: [{ path: eventOptions.readonly, kind: 'update' }] } };
  assert.ok(parseEvents(events).eventErrors.includes('ITEM_SCOPE_CHANGED'));
});

test('non-tool warning items are classified before a turn but never accepted as runtime proof', () => {
  for (const position of [0, 1, 2]) {
    const events = normalEvents();
    events.splice(position, 0, { type: 'item.completed', item: { id: 'warning', type: 'error',
      message: 'SYNTHETIC_SECRET_DO_NOT_PERSIST' } });
    const result = parseEvents(events);
    assert.equal(result.eventStreamVerified, false);
    assert.ok(result.eventErrors.includes('CLI_NON_TOOL_ERROR_REPORTED'));
    assert.equal(result.eventErrors.includes('ITEM_OUTSIDE_TURN'), false);
    assert.equal(result.commandCount, 1); assert.equal(result.patchCount, 2);
    assert.equal(JSON.stringify(result).includes('SYNTHETIC_SECRET_DO_NOT_PERSIST'), false);
    assert.equal(result.firstErrorDiagnostic?.category, 'UNKNOWN_NON_TOOL_ERROR');
  }
});

test('invalid non-tool message structure stays blocked and yields an explicit diagnostic category', () => {
  const events = normalEvents(); events.splice(1, 0, { type: 'item.completed', item: { id: 'error', type: 'error' } });
  const result = parseEvents(events);
  assert.equal(result.eventStreamVerified, false);
  assert.equal(result.firstErrorDiagnostic?.category, 'INVALID_NON_TOOL_ERROR');
});

test('recognizing warnings never permits pre-turn tools, unknown items or agent messages', () => {
  for (const item of [normalEvents()[2].item, normalEvents()[4].item,
    { id: 'early', type: 'agent_message', text: 'SYNTHETIC' },
    { id: 'early', type: 'mcp_tool_call' }, { id: 'early', type: 'unknown_tool' }]) {
    const events = normalEvents(); events.splice(1, 0, { type: 'item.completed', item });
    assert.ok(parseEvents(events).eventErrors.includes('ITEM_OUTSIDE_TURN'));
  }
});

test('reasoning completes directly but todo lists must start before updates or completion', () => {
  const reasoning = { type: 'item.completed', item: { id: 'reason', type: 'reasoning', text: 'SYNTHETIC' } };
  const todo = { id: 'todo', type: 'todo_list', items: [] };
  const events = normalEvents(); events.splice(2, 0, reasoning,
    { type: 'item.started', item: todo }, { type: 'item.updated', item: todo },
    { type: 'item.completed', item: todo });
  assert.equal(parseEvents(events).eventStreamVerified, true);
  for (const phase of ['item.updated', 'item.completed']) {
    const missing = normalEvents(); missing.splice(2, 0, { type: phase, item: todo });
    assert.ok(parseEvents(missing).eventErrors.includes('ITEM_START_MISSING'));
  }
});

test('direct file completion retains exact path, kind, cardinality and status checks', () => {
  for (const item of [
    { ...normalEvents()[2].item, changes: [{ path: '/synthetic/outside.md', kind: 'add' }] },
    { ...normalEvents()[2].item, changes: [{ path: eventOptions.positive, kind: 'update' }] },
    { ...normalEvents()[2].item, changes: [] },
    { ...normalEvents()[2].item, changes: [...normalEvents()[2].item.changes, ...normalEvents()[3].item.changes] },
    { ...normalEvents()[2].item, status: 'failed' },
    { ...normalEvents()[3].item, status: 'completed' },
    { ...normalEvents()[2].item, id: '' }
  ]) {
    const events = normalEvents(); events[item.id === 'patch-deny' ? 3 : 2] = { type: 'item.completed', item };
    assert.equal(parseEvents(events).eventStreamVerified, false);
  }
});

test('nonzero commands and extra otherwise approved operations cannot satisfy acceptance', () => {
  const nonzero = normalEvents(); nonzero[5].item.exit_code = 1;
  assert.ok(parseEvents(nonzero).eventErrors.includes('COMMAND_RESULT_INVALID'));
  for (const extra of [
    [{ type: 'item.completed', item: { ...normalEvents()[2].item, id: 'extra-patch' } }],
    normalEvents().slice(4, 6).map(event => ({ ...event, item: { ...event.item, id: 'extra-command' } }))
  ]) {
    const events = normalEvents(); events.splice(6, 0, ...extra);
    assert.ok(parseEvents(events).eventErrors.includes('EXPECTED_TOOL_SEQUENCE_MISSING'));
  }
});

test('failed or missing turn termination and events after completion never pass', () => {
  const events = normalEvents();
  assert.equal(parseEvents(events.slice(0, -1)).eventStreamVerified, false);
  assert.equal(parseEvents([...events.slice(0, -1), { type: 'turn.completed', usage: [] }]).eventStreamVerified, false);
  assert.equal(parseEvents([...events.slice(0, -1), { type: 'turn.failed', error: { message: 'SYNTHETIC ERROR' } }]).eventStreamVerified, false);
  assert.equal(parseEvents([...events, { type: 'item.started', item: { id: 'late', type: 'command_execution', command: 'node fixed-smoke.mjs' } }]).eventStreamVerified, false);
});
