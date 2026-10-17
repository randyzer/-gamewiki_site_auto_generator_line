const NON_SUCCESS = new Set(['FAILED', 'PARTIAL', 'BLOCKED', 'WAITING_FOR_USER']);

export function reportCliResult(result, { stdout = console.log } = {}) {
  stdout(JSON.stringify(result, null, 2));
  if (NON_SUCCESS.has(result?.status)) process.exitCode = 2;
}
