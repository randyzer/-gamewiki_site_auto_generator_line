import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
export async function connectBrowser() {
  const skill=process.env.WEB_ACCESS_SKILL_DIR || path.join(os.homedir(), '.codex/skills/web-access');
  const {selectBrowser}=await import(pathToFileURL(path.join(skill,'scripts/browser-discovery.mjs')).href);
  const discovery=await selectBrowser('chrome');
  if(discovery.kind!=='ok')throw Error('Current process could not connect to the selected Chrome profile: '+discovery.kind);
  const ws=new WebSocket(`ws://127.0.0.1:${discovery.browser.port}${discovery.browser.wsPath||'/devtools/browser'}`);
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{ws.close();reject(Error('Chrome CDP WebSocket handshake timed out; check remote debugging authorization.'))},10000);ws.onopen=()=>{clearTimeout(timer);resolve()};ws.onerror=e=>{clearTimeout(timer);reject(e)}});
  let id=0;const pending=new Map();const listeners=[];
  ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(m.error.message)):p.resolve(m.result)}}else listeners.forEach(l=>l(m))};
  const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const key=++id;const timer=setTimeout(()=>{pending.delete(key);reject(Error(`CDP timed out: ${method}`))},30000);pending.set(key,{resolve,reject,timer});ws.send(JSON.stringify({id:key,method,params,sessionId}))});
  return {send,onEvent:fn=>listeners.push(fn),close:()=>ws.close()};
}
