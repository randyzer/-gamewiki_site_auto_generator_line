import http from 'node:http';
import { homedir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';

const pending = new Map();
const sessions = new Map();
const errors = new Map();
let counter = 0;
let socket;
async function connect() {
  let url = process.env.BROWSER_CDP_URL;
  if (!url) {
    const skillRoot = process.env.WEB_ACCESS_SKILL_DIR ?? join(homedir(), '.codex/skills/web-access');
    const { selectBrowser } = await import(pathToFileURL(join(skillRoot, 'scripts/browser-discovery.mjs')).href);
    const result = await selectBrowser('chrome');
    if (result.kind !== 'ok') throw new Error('Current process cannot connect to the selected Chrome profile. Check remote debugging.');
    const { port, wsPath } = result.browser;
    url = `ws://127.0.0.1:${port}${wsPath || '/devtools/browser'}`;
  }
  socket = new WebSocket(url);
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { reject(new Error('Chrome CDP connection timed out. Check the remote-debugging authorization prompt.')); socket.close(); }, Number(process.env.BROWSER_CONNECT_TIMEOUT_MS ?? 60000));
    socket.addEventListener('open', () => { clearTimeout(timer); resolve(); }, { once: true });
    socket.addEventListener('error', () => { clearTimeout(timer); reject(new Error('Chrome CDP handshake failed.')); }, { once: true });
  });
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.method === 'Runtime.exceptionThrown') errors.get(message.sessionId)?.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text);
    if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') errors.get(message.sessionId)?.push(message.params.args.map(arg => arg.value ?? arg.description ?? '').join(' '));
    if (!message.id || !pending.has(message.id)) return;
    const { resolve, reject, timer } = pending.get(message.id);
    pending.delete(message.id); clearTimeout(timer);
    message.error ? reject(new Error(message.error.message)) : resolve(message.result);
  });
  socket.addEventListener('close', () => { for (const request of pending.values()) { clearTimeout(request.timer); request.reject(new Error('Chrome disconnected.')); } pending.clear(); });
}
function send(method, params = {}, sessionId) {
  return new Promise((resolve, reject) => {
    if (socket.readyState !== WebSocket.OPEN) return reject(new Error('Chrome is not connected.'));
    const id = ++counter;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 20000);
    pending.set(id, { resolve, reject, timer });
    socket.send(JSON.stringify({ id, method, params, sessionId }));
  });
}
await connect();
const server = http.createServer(async (request, response) => {
  try {
    if (request.url === '/health') { response.end(JSON.stringify({ connected: socket.readyState === WebSocket.OPEN })); return; }
    if (request.method !== 'POST') throw new Error('Use POST.');
    let body = ''; for await (const chunk of request) body += chunk;
    const args = JSON.parse(body || '{}');
    let result;
    if (request.url === '/new') {
      const target = new URL(args.url);
      if (!['http:', 'https:'].includes(target.protocol)) throw new Error('Invalid page protocol.');
      const { targetId } = await send('Target.createTarget', { url: args.url, background: true });
      const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
      sessions.set(targetId, sessionId);
      errors.set(sessionId, []);
      await send('Runtime.enable', {}, sessionId);
      await send('Emulation.setFocusEmulationEnabled', { enabled: true }, sessionId);
      result = { targetId };
    } else {
      const sessionId = sessions.get(args.targetId);
      if (!sessionId) throw new Error('Only tabs created by this bridge may be operated.');
      switch (request.url) {
        case '/eval': {
          const value = await send('Runtime.evaluate', { expression: args.expression, returnByValue: true, awaitPromise: true }, sessionId);
          if (value.exceptionDetails) throw new Error(value.exceptionDetails.text);
          result = { value: value.result.value }; break;
        }
        case '/viewport':
          result = await send('Emulation.setDeviceMetricsOverride', { width: args.width, height: args.height ?? 900, deviceScaleFactor: 1, mobile: args.width <= 500 }, sessionId); break;
        case '/errors':
          result = { errors: errors.get(sessionId) ?? [] }; break;
        case '/screenshot': {
          const metrics = await send('Page.getLayoutMetrics', {}, sessionId);
          result = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: args.width, height: metrics.cssContentSize.height, scale: 1 } }, sessionId); break;
        }
        case '/key':
          const keyCode = args.key === 'Escape' ? 27 : args.key === 'Enter' ? 13 : 9;
          await send('Input.dispatchKeyEvent', { type: 'keyDown', key: args.key, code: args.key, windowsVirtualKeyCode: keyCode, ...(args.key === 'Enter' ? { text: '\r', unmodifiedText: '\r' } : {}) }, sessionId);
          result = await send('Input.dispatchKeyEvent', { type: 'keyUp', key: args.key, code: args.key, windowsVirtualKeyCode: keyCode }, sessionId); break;
        case '/close':
          result = await send('Target.closeTarget', { targetId: args.targetId }); sessions.delete(args.targetId); errors.delete(sessionId); break;
        default: throw new Error('Unknown browser bridge operation.');
      }
    }
    response.setHeader('Content-Type', 'application/json'); response.end(JSON.stringify(result));
  } catch (error) { response.statusCode = 500; response.end(JSON.stringify({ error: error.message })); }
});
server.listen(Number(process.env.BROWSER_BRIDGE_PORT ?? 3457), '127.0.0.1', () => console.log('Chrome verification bridge ready on localhost.'));
async function shutdown() { for (const targetId of sessions.keys()) await send('Target.closeTarget', { targetId }).catch(() => {}); socket.close(); server.close(); }
process.on('SIGTERM', shutdown); process.on('SIGINT', shutdown);
