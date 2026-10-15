import test from 'node:test';
import assert from 'node:assert/strict';
import { runProcess } from '../src/process.mjs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fixture } from './helpers.mjs';

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
