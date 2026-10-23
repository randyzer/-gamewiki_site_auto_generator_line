import { spawn } from 'node:child_process';
import { sanitizeDiagnosticText, failureDiagnostic } from './diagnostics.mjs';

const workerError = (message, code, details = {}) => Object.assign(Error(message), { code, ...details });
const captureLimit = 8192;
const trustedRetryableExternalFailures = new WeakSet();

export function isTrustedRetryableExternalFailure(error) {
  return error instanceof Error && trustedRetryableExternalFailures.has(error);
}

const appendHead = (current, chunk) => current.length >= captureLimit
  ? current : current + chunk.slice(0, captureLimit - current.length);
const emptyTail = () => ({ value: '', truncated: false });
const appendTail = (current, chunk) => {
  const combined = current.value + chunk;
  return combined.length <= captureLimit
    ? { value: combined, truncated: current.truncated }
    : { value: combined.slice(-captureLimit), truncated: true };
};

function completeTailWindow(capture, limit) {
  let value = capture.value;
  if (capture.truncated) {
    const boundary = value.indexOf('\n');
    if (boundary < 0) return '';
    value = value.slice(boundary + 1);
  }
  if (value.length <= limit) return value;
  value = value.slice(-limit);
  const boundary = value.indexOf('\n');
  return boundary < 0 ? '' : value.slice(boundary + 1);
}

function failureDetail(stderr, stdout, env) {
  const both = Boolean(stderr.value && stdout.value);
  const parts = [];
  if (stderr.value) parts.push(`stderr tail: ${sanitizeDiagnosticText(completeTailWindow(stderr, both ? 900 : 1500), env)}`);
  if (stdout.value) parts.push(`stdout tail: ${sanitizeDiagnosticText(completeTailWindow(stdout, both ? 500 : 1500), env)}`);
  return sanitizeDiagnosticText(parts.join('\n'), env);
}

function workerExitCode(code, stderr) {
  const tail = completeTailWindow(stderr, captureLimit);
  const usageLimit = /(?:^|\n)ERROR: You've hit your usage limit\.[^\n]*\nERROR: You've hit your usage limit\.[^\n]*\ntokens used\n[\d,]+\s*$/;
  return code === 1 && usageLimit.test(tail) ? 'WORKER_USAGE_LIMIT' : 'WORKER_EXIT_NONZERO';
}

// Keep bounded, sanitized failure details; raw worker output is never persisted.
export function runProcess(command, args, { cwd, input = '', env = process.env, timeoutMs = 600000, signal } = {}) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(workerError('Worker aborted', 'WORKER_ABORTED'));
    const child = spawn(command, args, { cwd, env, detached: process.platform !== 'win32', stdio: ['pipe', 'pipe', 'pipe'] });
    const startedAt = Date.now();
    let stopped = false, killTimer, failure, stopFinished, terminationConfirmed = false,
      stdout = '', stdoutTail = emptyTail(), stderrTail = emptyTail();
    const kill = sig => {
      try { process.platform === 'win32' ? child.kill(sig) : process.kill(-child.pid, sig); }
      catch (error) { if (error.code !== 'ESRCH') failure = workerError('Worker termination failed', 'WORKER_TERMINATION_FAILED'); }
    };
    const processGroupExists = () => {
      if (process.platform === 'win32') return true;
      try { process.kill(-child.pid, 0); return true; }
      catch (error) {
        if (error.code === 'ESRCH') return false;
        if (error.code === 'EPERM') return true;
        throw error;
      }
    };
    const confirmStopped = async () => {
      if (process.platform === 'win32') return false;
      const deadline = Date.now() + 1000;
      while (Date.now() < deadline) {
        try { if (!processGroupExists()) return true; }
        catch (error) {
          failure = workerError(`Worker termination verification failed: ${error.code ?? error.name}`,
            'WORKER_TERMINATION_FAILED');
          return false;
        }
        await new Promise(done => setTimeout(done, 20));
      }
      return false;
    };
    const stop = () => {
      if (stopped) return;
      stopped = true; kill('SIGTERM');
      stopFinished = new Promise(done => {
        killTimer = setTimeout(async () => {
          kill('SIGKILL');
          terminationConfirmed = await confirmStopped();
          done();
        }, 500);
      });
    };
    const duration = Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 600000;
    const timer = setTimeout(stop, duration);
    signal?.addEventListener('abort', stop, { once: true });
    child.stdout.on('data', bytes => {
      const chunk = bytes.toString();
      stdout = appendHead(stdout, chunk);
      stdoutTail = appendTail(stdoutTail, chunk);
    });
    child.stderr.on('data', bytes => { stderrTail = appendTail(stderrTail, bytes.toString()); });
    child.stdin.on('error', () => { if (!stopped) failure ??= workerError('Worker input failed', 'WORKER_INPUT_FAILED'); });
    child.on('error', error => {
      const diagnostic = failureDiagnostic(error);
      failure = workerError('Worker could not start: ' + diagnostic.reason,
        diagnostic.code === 'ERROR' ? 'WORKER_START_FAILED' : diagnostic.code);
    });
    child.on('close', async (code, exitSignal) => {
      // Parent exit does not prove its process group has stopped writing.
      if (stopped) await stopFinished;
      clearTimeout(timer); clearTimeout(killTimer); signal?.removeEventListener('abort', stop);
      if (failure?.code === 'WORKER_TERMINATION_FAILED') reject(failure);
      else if (stopped) {
        const aborted = signal?.aborted;
        const detail = failureDetail(stderrTail, stdoutTail, env);
        const elapsedMs = Date.now() - startedAt;
        const error = workerError(aborted ? 'Worker aborted' :
          `Worker timed out after ${duration}ms${detail ? `; ${detail}` : ''}`,
        aborted ? 'WORKER_ABORTED' : 'WORKER_TIMEOUT',
        { configuredTimeoutMs: duration, elapsedMs, terminationConfirmed });
        if (!aborted && terminationConfirmed) trustedRetryableExternalFailures.add(error);
        reject(error);
      }
      else if (failure) reject(failure);
      else if (code !== 0) {
        const detail = failureDetail(stderrTail, stdoutTail, env);
        const failure = workerError(`Worker exited unsuccessfully: ${code ?? exitSignal}; ${detail}`,
          workerExitCode(code, stderrTail), { exitCode: code, exitSignal });
        if (failure.code === 'WORKER_USAGE_LIMIT') trustedRetryableExternalFailures.add(failure);
        reject(failure);
      }
      else resolve({ exitCode: code, stdout });
    });
    child.stdin.end(input);
  });
}
