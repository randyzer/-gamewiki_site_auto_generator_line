import test from 'node:test';
import assert from 'node:assert/strict';
import { isTrustedRetryableExternalFailure, runProcess } from '../src/process.mjs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fixture } from './helpers.mjs';

const processFailure = async (source, options = {}) => {
  let failure;
  try {
    await runProcess(process.execPath, ['-e', source], options);
  } catch (error) {
    failure = error;
  }
  assert.ok(failure, 'expected worker failure');
  return failure;
};

test('worker failures do not disclose stderr', async () => {
  await assert.rejects(runProcess(process.execPath, ['-e', 'process.stderr.write("token=DO_NOT_PERSIST");process.exit(1)']), error => !error.message.includes('DO_NOT_PERSIST'));
});
test('timeout terminates a worker that ignores SIGTERM before returning', async () => {
  const start = Date.now();
  await assert.rejects(runProcess(process.execPath, ['-e', 'process.on("SIGTERM",()=>{});setInterval(()=>{},1000)'], { timeoutMs: 100 }), /timed out/);
  assert.ok(Date.now() - start >= 500);
});

test('blocked stdin cannot replace a timeout diagnostic with the resulting pipe error', async () => {
  await assert.rejects(runProcess(process.execPath, ['-e', 'setInterval(()=>{},1000)'], {
    input: 'x'.repeat(8 * 1024 * 1024), timeoutMs: 50,
  }), { code: 'WORKER_TIMEOUT' });
});
test('missing executable produces a bounded sanitized error', async () => {
  await assert.rejects(runProcess('/nonexistent-c2c-fixture', []), /could not start/);
});

test('process failures distinguish missing binaries, timeout, abort and exit status with sanitized detail', async () => {
  await assert.rejects(runProcess('/nonexistent-c2c-fixture', []), { code: 'ENOENT' });
  await assert.rejects(runProcess(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { timeoutMs: 20 }), { code: 'WORKER_TIMEOUT' });
  await assert.rejects(runProcess(process.execPath, [], { signal: AbortSignal.abort() }), { code: 'WORKER_ABORTED' });
  await assert.rejects(runProcess(process.execPath, ['-e', 'process.stderr.write("Missing page manifest; api_key=PRIVATE_PROCESS_VALUE");process.exit(2)']), error => {
    assert.equal(error.code, 'WORKER_EXIT_NONZERO');
    assert.equal(error.exitCode, 2);
    assert.match(error.message, /Missing page manifest/);
    assert.doesNotMatch(error.message, /PRIVATE_PROCESS_VALUE/);
    return true;
  });
});

test('provider usage-limit terminal is classified as a retryable external failure', async () => {
  const error = await processFailure(`process.stderr.write("ERROR: You've hit your usage limit. Upgrade to Pro, visit settings to purchase more credits or try again at 1:25 PM.\\nERROR: You've hit your usage limit. Upgrade to Pro, visit settings to purchase more credits or try again at 1:25 PM.\\ntokens used\\n118,844\\n");process.exit(1)`);
  assert.equal(error.code, 'WORKER_USAGE_LIMIT');
  assert.equal(error.exitCode, 1);
  assert.equal(isTrustedRetryableExternalFailure(error), true);
});

test('an arbitrary usage-limit phrase does not become a retryable external failure', async () => {
  const error = await processFailure(`process.stderr.write("content says you've hit your usage limit\\n");process.exit(1)`);
  assert.equal(error.code, 'WORKER_EXIT_NONZERO');
  assert.equal(isTrustedRetryableExternalFailure(error), false);
});

test('usage-limit text outside the approved stderr terminal is never trusted', async () => {
  const exact = "ERROR: You've hit your usage limit. Upgrade to Pro, visit settings to purchase more credits or try again at 1:25 PM.";
  const output = `${exact}\n${exact}\ntokens used\n118,844\n`;
  const stdout = await processFailure(`process.stdout.write(${JSON.stringify(output)});process.exit(1)`);
  assert.equal(stdout.code, 'WORKER_EXIT_NONZERO');
  assert.equal(isTrustedRetryableExternalFailure(stdout), false);
  assert.equal(isTrustedRetryableExternalFailure(Object.assign(Error('spoof'), {
    code: 'WORKER_USAGE_LIMIT', diagnosticOperation: 'execute-worker',
  })), false);
});

test('worker failure diagnostics retain the stderr tail instead of a long startup banner', async () => {
  const error = await processFailure(`require('fs').writeSync(2,'PROMPT_START_' + 'x'.repeat(12000) + '\\nTERMINAL_FAILURE_MARKER');process.exit(1)`);
  assert.match(error.message, /TERMINAL_FAILURE_MARKER/);
  assert.doesNotMatch(error.message, /PROMPT_START_/);
});

test('worker failure diagnostics include bounded useful tails from stderr and stdout', async () => {
  const error = await processFailure(`const fs=require('fs');fs.writeSync(2,'BANNER_' + 'x'.repeat(12000) + '\\nSTDERR_FAILURE_MARKER');fs.writeSync(1,'STDOUT_FAILURE_MARKER');process.exit(7)`);
  assert.equal(error.code, 'WORKER_EXIT_NONZERO');
  assert.equal(error.exitCode, 7);
  assert.match(error.message, /STDERR_FAILURE_MARKER/);
  assert.match(error.message, /STDOUT_FAILURE_MARKER/);
  assert.ok(error.message.length <= 1700, `diagnostic length ${error.message.length}`);
});

test('worker failure diagnostics redact secrets from both stream tails across write chunks', async () => {
  const error = await processFailure(`process.stderr.write('api_');setTimeout(()=>{process.stderr.write('key=PRIVATE_STDERR_VALUE\\n');process.stdout.write('authorization: Bearer PRIVATE_STDOUT_VALUE\\n');process.exit(1)},10)`);
  assert.doesNotMatch(error.message, /PRIVATE_STDERR_VALUE|PRIVATE_STDOUT_VALUE/);
  assert.match(error.message, /\[REDACTED\]/);
});

test('worker failure diagnostics fail closed when secrets cross both presentation boundaries', async () => {
  const stderrSecret = `ERR_${'s'.repeat(1000)}_STDERR_BOUNDARY_LEAK`;
  const stdoutSecret = `OUT_${'t'.repeat(650)}_STDOUT_BOUNDARY_LEAK`;
  const source = `const fs=require('fs');fs.writeSync(2,'api_key=' + process.env.SYNTHETIC_STDERR_API_KEY + '\\nSTDERR_TERMINAL');fs.writeSync(1,'authorization: Bearer ' + process.env.SYNTHETIC_STDOUT_TOKEN + '\\nSTDOUT_TERMINAL');process.exit(1)`;
  const error = await processFailure(source, { env: { ...process.env,
    SYNTHETIC_STDERR_API_KEY: stderrSecret, SYNTHETIC_STDOUT_TOKEN: stdoutSecret } });
  assert.doesNotMatch(error.message, /STDERR_BOUNDARY_LEAK|STDOUT_BOUNDARY_LEAK/);
  assert.match(error.message, /STDERR_TERMINAL/);
  assert.match(error.message, /STDOUT_TERMINAL/);
});

test('worker failure diagnostics fail closed when a secret crosses the rolling-tail boundary', async () => {
  const secret = `ROLL_${'r'.repeat(9000)}_TAIL_BOUNDARY_LEAK`;
  const source = `require('fs').writeSync(2,'api_key=' + process.env.SYNTHETIC_ROLLING_API_KEY + '\\nROLLING_TERMINAL');process.exit(1)`;
  const error = await processFailure(source, { env: { ...process.env, SYNTHETIC_ROLLING_API_KEY: secret } });
  assert.doesNotMatch(error.message, /TAIL_BOUNDARY_LEAK/);
  assert.match(error.message, /ROLLING_TERMINAL/);
});

test('large worker failure streams remain bounded while preserving terminal evidence', async () => {
  const error = await processFailure(`const fs=require('fs');fs.writeSync(1,'o'.repeat(200000) + '\\nSTDOUT_END');fs.writeSync(2,'e'.repeat(200000) + '\\nSTDERR_END');process.exit(1)`);
  assert.match(error.message, /STDOUT_END/);
  assert.match(error.message, /STDERR_END/);
  assert.ok(error.message.length <= 1700, `diagnostic length ${error.message.length}`);
});

test('successful workers preserve the existing bounded stdout contract', async () => {
  const output = await runProcess(process.execPath, ['-e', `process.stdout.write('HEAD_' + 'x'.repeat(9000) + '_TAIL')`]);
  assert.match(output.stdout, /^HEAD_/);
  assert.equal(output.stdout.length, 8192);
  assert.doesNotMatch(output.stdout, /_TAIL$/);
});
test('timeout cleans grandchildren even when parent exits and child ignores SIGTERM', async t => {
  const f = await fixture(t), pidFile = join(f.root, 'pid');
  const code = `const {spawn}=require('node:child_process');const fs=require('node:fs');
    const child=spawn(process.execPath,['-e','process.on("SIGTERM",()=>{});setInterval(()=>{},1000)'],{stdio:'ignore'});
    fs.writeFileSync(process.argv[1],String(child.pid));setInterval(()=>{},1000);`;
  await assert.rejects(runProcess(process.execPath, ['-e', code, pidFile], { timeoutMs: 300 }), /timed out/);
  const pid = Number(await readFile(pidFile, 'utf8'));
  let alive = true;
  for (let i = 0; i < 50; i++) {
    try { process.kill(pid, 0); } catch (e) { if (e.code === 'ESRCH') { alive = false; break; } }
    await new Promise(r => setTimeout(r, 10));
  }
  if (alive) { try { process.kill(pid, 'SIGKILL'); } catch {} }
  assert.equal(alive, false);
});
