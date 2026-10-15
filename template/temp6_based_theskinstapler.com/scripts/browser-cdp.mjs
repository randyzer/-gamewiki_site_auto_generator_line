import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export async function connectBrowser() {
  const skillRoot = process.env.WEB_ACCESS_SKILL_DIR || path.join(os.homedir(), '.codex/skills/web-access');
  const { selectBrowser } = await import(pathToFileURL(path.join(skillRoot, 'scripts/browser-discovery.mjs')).href);
  const result = await selectBrowser('chrome');
  if (result.kind !== 'ok') throw new Error('Chrome CDP connection unavailable; enable remote debugging in the existing Chrome profile.');
  const ws = new WebSocket(`ws://127.0.0.1:${result.browser.port}${result.browser.wsPath || '/devtools/browser'}`);
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { reject(new Error('Chrome port is reachable, but the current process did not obtain a WebSocket debugging connection. Check the Chrome remote debugging authorization prompt.')); ws.close(); },120000);
    ws.onopen = () => { clearTimeout(timer); resolve(); };
    ws.onerror = (event) => { clearTimeout(timer); reject(new Error(event.message || 'Chrome WebSocket connection failed')); };
  });
  let sequence = 0; const pending = new Map(); const listeners = new Set();
  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const request = pending.get(message.id);
      if (request) {
        pending.delete(message.id); clearTimeout(request.timer);
        message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result);
      }
    } else for (const listener of listeners) listener(message);
  };
  function send(method, params = {}, sessionId) {
    return new Promise((resolve, reject) => {
      const id = ++sequence;
      const timer = setTimeout(() => { pending.delete(id); reject(new Error(`${method} timed out`)); },20000);
      pending.set(id, { resolve, reject, timer });
      ws.send(JSON.stringify({ id, method, params, sessionId }));
    });
  }
  async function evaluate(sessionId, expression) {
    const result = await send('Runtime.evaluate', { expression, returnByValue:true, awaitPromise:true },sessionId);
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  }
  return { send, evaluate, listeners, close: () => ws.close() };
}
