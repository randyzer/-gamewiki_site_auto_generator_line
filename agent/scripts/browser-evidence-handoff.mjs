#!/usr/bin/env node
import {readFile} from 'node:fs/promises';
import {join, resolve, extname} from 'node:path';
import {AGENT_ROOT} from '../src/skill-lock.mjs';
import {safePath, inside} from '../src/files.mjs';
import {browserHandoffReadiness,quarantineHostCapture} from '../src/host-browser-evidence.mjs';

const root=resolve(AGENT_ROOT);
const runs=join(root,'runs'),config=join(root,'config');
async function json(path, roots) {
  const resolved=resolve(path);
  if(extname(resolved)!=='.json'||!roots.some(dir=>inside(dir,resolved)))throw Error('INPUT_OUTSIDE_ALLOWED_JSON_DIRECTORY');
  await safePath(resolved,roots);
  const bytes=await readFile(resolved);
  if(bytes.length>65536)throw Error('INPUT_TOO_LARGE');
  return JSON.parse(bytes.toString('utf8'));
}
async function main() {
  const [op,taskFile,captureFile,...extra]=process.argv.slice(2);
  if(extra.length || !['inspect','quarantine'].includes(op) || !taskFile || (op==='quarantine'&&!captureFile) || (op==='inspect'&&captureFile))
    throw Error('Usage: node scripts/browser-evidence-handoff.mjs inspect TASK.json | quarantine TASK.json CAPTURE.json');
  const task=await json(taskFile,[runs,config]);
  if(op==='inspect') console.log(JSON.stringify(await browserHandoffReadiness(task),null,2));
  else {
    const capture=await json(captureFile,[runs]);
    console.log(JSON.stringify(await quarantineHostCapture(task,capture),null,2));
  }
}
try {await main();} catch(error) {
  console.error('BROWSER_HANDOFF_REJECTED:',error.code || (
    /^(?:Usage:|INVALID_|BROWSER_|GAME_|SUPPORTED_|PUBLIC_|CAPTURE_|QUARANTINE_|INPUT_|Linked path|Path outside|Browser command)/.test(error.message) ? error.message : 'UNAVAILABLE'));
  process.exitCode=2;
}
