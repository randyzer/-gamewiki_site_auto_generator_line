import { spawn } from 'node:child_process';
import { sanitizeDiagnosticText, failureDiagnostic } from './diagnostics.mjs';

const workerError = (message, code, details = {}) => Object.assign(Error(message), { code, ...details });

// Keep bounded, sanitized failure details; raw worker output is never persisted.
export function runProcess(command, args, { cwd, input = '', env = process.env, timeoutMs = 600000, signal } = {}) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(workerError('Worker aborted', 'WORKER_ABORTED'));
    const child = spawn(command, args, { cwd, env, detached: process.platform !== 'win32', stdio: ['pipe', 'pipe', 'pipe'] });
    let stopped = false, killTimer, failure, stopFinished, stdout = '', stderr = '';
    const kill = sig => {
      try { process.platform === 'win32' ? child.kill(sig) : process.kill(-child.pid, sig); }
      catch (error) { if (error.code !== 'ESRCH') failure = workerError('Worker termination failed', 'WORKER_TERMINATION_FAILED'); }
    };
    const stop = () => {
      if (stopped) return;
      stopped = true; kill('SIGTERM');
      stopFinished = new Promise(done => {
        killTimer = setTimeout(() => { kill('SIGKILL'); done(); }, 500);
      });
    };
    const duration = Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 600000;
    const timer = setTimeout(stop, duration);
    signal?.addEventListener('abort', stop, { once: true });
    child.stdout.on('data', bytes => { if (stdout.length < 8192) stdout += bytes.toString().slice(0, 8192 - stdout.length); });
    child.stderr.on('data', bytes => { if (stderr.length < 8192) stderr += bytes.toString().slice(0, 8192 - stderr.length); });
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
      else if (stopped) reject(workerError(signal?.aborted ? 'Worker aborted' : 'Worker timed out', signal?.aborted ? 'WORKER_ABORTED' : 'WORKER_TIMEOUT'));
      else if (failure) reject(failure);
      else if (code !== 0) {
        const detail = sanitizeDiagnosticText(stderr || stdout, env);
        reject(workerError(`Worker exited unsuccessfully: ${code ?? exitSignal}; ${detail}`, 'WORKER_EXIT_NONZERO', { exitCode: code, exitSignal }));
      }
      else resolve({ exitCode: code });
    });
    child.stdin.end(input);
  });
}
