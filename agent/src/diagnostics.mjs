const sensitiveKey = /password|passwd|secret|token|cookie|credential|private.?key|api.?key|authorization/i;
const safeCodes = new Set(['ENOENT', 'EACCES', 'EPERM', 'EEXIST', 'ELOOP', 'ENOSPC', 'EIO', 'ETIMEDOUT',
  'ECONNREFUSED', 'ECONNRESET', 'CONTRACT_INCOMPATIBLE', 'WORKER_START_FAILED', 'WORKER_TIMEOUT',
  'WORKER_ABORTED', 'WORKER_INPUT_FAILED', 'WORKER_TERMINATION_FAILED', 'WORKER_EXIT_NONZERO', 'ARTIFACT_INVALID_JSON']);
const adapterOperations = new Set(['execute-worker', 'read-worker-result', 'validate-native-artifacts', 'publish-deployment-plan', 'prepare-research-handoff']);

export async function diagnosticStep(operation, work) {
  try { return await work(); }
  catch (error) {
    if (!(error instanceof Error)) error = Error(sanitizeDiagnosticText(error));
    error.diagnosticOperation = operation;
    throw error;
  }
}

/** Keep useful error text while excluding credential assignments and known secret values. */
export function sanitizeDiagnosticText(value, env = process.env) {
  let text = typeof value === 'string' ? value : 'Error supplied no readable reason';
  for (const [key, secret] of Object.entries(env)) {
    if (sensitiveKey.test(key) && typeof secret === 'string' && secret.length >= 4) text = text.split(secret).join('[REDACTED]');
  }
  text = text
    .replace(/-----BEGIN [^-]*PRIVATE KEY-----[\s\S]*?(?:-----END [^-]*PRIVATE KEY-----|$)/g, '[REDACTED PRIVATE KEY]')
    .replace(/\b(?:Bearer|Basic)\s+[^\s,;"']+/gi, '[REDACTED AUTHORIZATION]')
    .replace(/\b((?:set-cookie|cookie|authorization)\s*:\s*)[^\r\n]+/gi, '$1[REDACTED]')
    .replace(/(--[\w.-]*(?:password|passwd|secret|token|cookie|credential|private.?key|api.?key|authorization)[\w.-]*\s+)(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[^\s]+)/gi, '$1[REDACTED]')
    .replace(/(["']?[\w.-]*(?:password|passwd|secret|token|cookie|credential|private.?key|api.?key|authorization)[\w.-]*["']?\s*[:=]\s*)(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[^\s,;&}\]]+)/gi, '$1[REDACTED]')
    .replace(/(https?:\/\/)[^\s/]+:[^\s/]+@/gi, '$1[REDACTED]@')
    .replace(/\b(?:sk-|gh[pousr]_|github_pat_|xox[baprs]-)[A-Za-z0-9_-]{8,}/g, '[REDACTED TOKEN]')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[REDACTED TOKEN]')
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '');
  return text.trim().slice(0, 1600) || 'Error supplied no readable reason';
}

/** @returns {{stage: string|null, attempt: number, operation: string, code: string, reason: string, at: string}} */
export function failureDiagnostic(error, { stage = null, attempt = 0, operation = 'execute-task' } = {}) {
  // JSON parse errors can echo raw file contents, including unlabeled credentials.
  const reason = error instanceof SyntaxError ? 'Invalid JSON or JavaScript syntax' : error?.message ?? error;
  return { stage, attempt, operation: adapterOperations.has(error?.diagnosticOperation) ? error.diagnosticOperation : operation,
    code: safeCodes.has(error?.code) ? error.code : 'ERROR',
    reason: sanitizeDiagnosticText(reason),
    ...(['PASSED', 'PARTIAL', 'FAILED', 'BLOCKED', 'WAITING_FOR_USER'].includes(error?.workerStatus)
      ? { workerStatus: error.workerStatus } : {}),
    ...(error?.hostValidation === 'FAILED' ? { hostValidation: 'FAILED' } : {}),
    at: new Date().toISOString() };
}

export function diagnosticSummary(diagnostic) {
  return `${diagnostic.stage ?? 'task'} / ${diagnostic.operation} [${diagnostic.code}]: ${diagnostic.reason}`;
}
