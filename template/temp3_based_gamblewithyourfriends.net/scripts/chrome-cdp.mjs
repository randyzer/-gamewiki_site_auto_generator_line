import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
// Reuse the browser selected by the installed web-access skill; never launch a new profile.
const discoveryPath = process.env.WEB_ACCESS_DISCOVERY || path.join(os.homedir(), '.codex/skills/web-access/scripts/browser-discovery.mjs');
const { selectBrowser } = await import(pathToFileURL(discoveryPath).href);
const selected = await selectBrowser('chrome');
if (selected.kind !== 'ok') throw new Error('The selected Chrome CDP connection is unavailable. Repair web-access first.');
const { port, wsPath } = selected.browser;
const socket = new WebSocket(`ws://127.0.0.1:${port}${wsPath}`);
console.log('Waiting for the authorized Chrome debugging connection.');
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = () => reject(new Error('Chrome CDP handshake failed')); });
let id = 0;
const pending = new Map();
const events = new Map();
socket.onmessage = event => {
  const message = JSON.parse(event.data);
  if (message.id) {
    const request = pending.get(message.id);
    if (!request) return;
    clearTimeout(request.timer);
    pending.delete(message.id);
    message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result);
  } else if (message.sessionId && ['Runtime.exceptionThrown', 'Runtime.consoleAPICalled', 'Log.entryAdded'].includes(message.method)) {
    const list = events.get(message.sessionId) || [];
    const isError = message.method === 'Runtime.exceptionThrown' || message.params?.type === 'error' || message.params?.entry?.level === 'error';
    if (isError) { list.push(message); events.set(message.sessionId, list); }
  }
};
function send(method, params = {}, sessionId) {
  if (method === 'Verification.clearErrors') { events.set(sessionId, []); return Promise.resolve({}); }
  if (method === 'Verification.getErrors') return Promise.resolve({ errors: events.get(sessionId) || [] });
  return new Promise((resolve, reject) => {
    const requestId = ++id;
    const timer = setTimeout(() => { pending.delete(requestId); reject(new Error(`${method} timed out`)); }, 20000);
    pending.set(requestId, { resolve, reject, timer });
    socket.send(JSON.stringify({ id: requestId, method, params, sessionId }));
  });
}
const server = http.createServer(async (request, response) => {
  try {
    if (request.method !== 'POST') throw new Error('POST required');
    let body = '';
    for await (const chunk of request) { body += chunk; if (body.length > 1000000) throw new Error('Request too large'); }
    const input = JSON.parse(body);
    const result = await send(input.method, input.params, input.sessionId);
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify(result));
  } catch (error) { response.statusCode = 500; response.end(JSON.stringify({ error: error.message })); }
});
server.listen(9077, '127.0.0.1', () => console.log('Chrome CDP verifier ready at http://127.0.0.1:9077'));
function stop() { socket.close(); server.close(); }
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
