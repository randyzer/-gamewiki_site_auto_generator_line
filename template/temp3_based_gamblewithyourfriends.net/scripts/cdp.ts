export const endpoint = process.env.CDP_ENDPOINT || 'http://127.0.0.1:9077';
export async function cdp<T = Record<string, unknown>>(method: string, params: Record<string, unknown> = {}, sessionId?: string): Promise<T> {
  const response = await fetch(endpoint, { method: 'POST', body: JSON.stringify({ method, params, sessionId }), signal: AbortSignal.timeout(30000) });
  const result = await response.json();
  if (!response.ok || result.error) throw new Error(`${method}: ${result.error || response.status}`);
  return result as T;
}
export async function evaluate<T>(sessionId: string, expression: string): Promise<T> {
  const result = await cdp<{ result: { value: T }; exceptionDetails?: { text: string } }>('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sessionId);
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}
