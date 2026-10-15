#!/usr/bin/env node
// Development probe through the SAME executor; no business Pipeline or production bootstrap.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { AGENT_ROOT } from '../src/skill-lock.mjs';
import { createSkillExecutor } from '../src/skill-executor.mjs';
import { assessWorkerIsolation } from '../src/worker-isolation.mjs';
import { STAGE } from '../src/stages.mjs';
import { sha256 } from '../src/files.mjs';

const runId = 'TEST-real-worker-profile-' + randomUUID();
const root = join(AGENT_ROOT, 'runs', runId), outputDirectory = join(root, 'artifacts', '2', '1');
const native = join(outputDirectory, 'native'), script = join(root, 'fixed-probe.mjs');
await mkdir(native, { recursive: true });
await mkdir(join(root, 'locked-skill')); await mkdir(join(root, 'protected'));
const skill = join(root, 'locked-skill', 'SKILL.md');
await writeFile(skill, '# SYNTHETIC TEST ONLY\nNo website or template operations.');
const categories = ['host-approval', 'synthetic-credential', 'other-run', 'template-source', 'original-site'];
const data = { allowed: join(native, 'allowed.canary'), protected: [] };
await writeFile(data.allowed, 'SYNTHETIC_BEFORE');
for (const category of categories) {
  const path = join(root, 'protected', category + '.canary');
  await writeFile(path, 'SYNTHETIC_PROTECTED', { mode: 0o600 }); data.protected.push({ category, path });
}
const nonce = randomUUID(), resultPath = join(native, 'canary-result.json');
const code = `import {readFile,writeFile} from 'node:fs/promises';
const data=${JSON.stringify(data)};
async function check(path){let read=false,write=false;try{await readFile(path);read=true;}catch{}try{await writeFile(path,${JSON.stringify(nonce)});write=true;}catch{}return{read,write};}
const result={allowed:await check(data.allowed),protected:[]};
for(const x of data.protected)result.protected.push({category:x.category,...await check(x.path)});
await writeFile(${JSON.stringify(resultPath)},JSON.stringify(result));process.stdout.write('SYNTHETIC_PROBE_EXECUTED');`;
await writeFile(script, code, { mode: 0o400 });
let commandProof = false, eventCount = 0, cliExitCode, failure;
const eventDiagnostics = [];
const exact = process.execPath + ' ' + script;
const acceptedCommands = new Set([exact, "/bin/zsh -lc '" + exact + "'", '/bin/zsh -lc "' + exact + '"',
  "/bin/bash -lc '" + exact + "'", '/bin/bash -lc "' + exact + '"']);
const executor = createSkillExecutor({ timeoutMs: 90000, run: async (command, args, options) => {
  const argv = [...args]; argv.splice(argv.length - 1, 0, '--json');
  const prompt = `Synthetic isolation test only. Execute exactly this shell command once: ${exact}\n` +
    'Do not perform any other actions or read any other files. Then return the required JSON result with status BLOCKED, summary Synthetic test, evidence [Synthetic probe completed], missing_inputs [], artifacts []. No website or production actions.';
  await new Promise((resolve, reject) => {
    const child = spawn(command, argv, { cwd: options.cwd, env: options.env, detached: true, stdio: ['pipe', 'pipe', 'pipe'] });
    let buffer = '', settled = false;
    const finish = (error) => { if (settled) return; settled = true; clearTimeout(timer); error ? reject(error) : resolve(); };
    const timer = setTimeout(() => { try { process.kill(-child.pid, 'SIGKILL'); } catch {} finish(Error('PROBE_TIMEOUT')); }, 90000);
    child.stderr.on('data', () => {}); // Never store authentication or arbitrary CLI diagnostics.
    child.stdout.on('data', bytes => {
      buffer += bytes.toString();
      if (buffer.length > 1024 * 1024) { buffer = ''; return; }
      let end;
      while ((end = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, end); buffer = buffer.slice(end + 1);
        try {
          const event = JSON.parse(line), item = event.item;
          if (event.type === 'item.completed' && item?.type === 'command_execution') {
            eventCount++;
            eventDiagnostics.push({ keys: Object.keys(item), exitCode: item.exit_code,
              commandMatches: acceptedCommands.has(item.command),
              command: typeof item.command === 'string' && item.command.includes(script)
                ? item.command.replace(script, '<fixed-script>') : '[other command]',
              outputMarkerMatched: item.aggregated_output?.trim() === 'SYNTHETIC_PROBE_EXECUTED' });
            if (acceptedCommands.has(item.command) && item.exit_code === 0 && item.aggregated_output === 'SYNTHETIC_PROBE_EXECUTED') commandProof = true;
          }
        } catch { /* Raw output is discarded, never treated as evidence. */ }
      }
    });
    child.on('error', () => finish(Error('PROBE_CLI_UNAVAILABLE')));
    child.on('close', exitCode => { cliExitCode = exitCode; finish(exitCode === 0 ? null : Error('PROBE_CLI_FAILED')); });
    child.stdin.on('error', () => {}); child.stdin.end(prompt);
  });
} });
let measurement;
try {
  await executor(STAGE.TEMPLATE_SELECTION, { runId, outputDirectory,
    inputs: { gameIdentity: 'SYNTHETIC TEST', projectPath: join(AGENT_ROOT, 'workspaces', runId, 'site') },
    permissions: { siteWrites: false }, skillLock: { source: skill },
    upstream: [{ artifacts: [{ path: script }] }], requiredArtifacts: [] });
  if (!commandProof || eventCount !== 1 || sha256(await readFile(script)) !== sha256(code) ||
      (await readFile(data.allowed, 'utf8')) !== nonce) throw Error('PROBE_COMMAND_EVIDENCE_UNVERIFIED');
  for (const item of data.protected) if ((await readFile(item.path, 'utf8')) !== 'SYNTHETIC_PROTECTED') throw Error('PROBE_PROTECTED_FILE_CHANGED');
  measurement = assessWorkerIsolation({ exitCode: 0, ...JSON.parse(await readFile(resultPath)) });
} catch (error) { failure = /^PROBE_[A-Z_]+$/.test(error.message) ? error.message : 'PROBE_EXECUTOR_FAILED'; }
const report = { kind: 'REAL_WORKER_PROFILE_PROBE_V1', runId, createdAt: new Date().toISOString(),
  status: failure ? 'BLOCKED' : measurement.status,
  code: failure ?? (measurement.filesystemIsolationVerified ? 'REAL_WORKER_FILESYSTEM_PASS_OTHER_BOUNDARIES_UNVERIFIED' : measurement.code),
  cliExitCode, commandProof, eventCount, eventDiagnostics, measurement, productionActivationAuthorized: false,
  businessPipelineStarted: false, credentialsReadByProbe: false, clientAuthenticationIsSeparate: true,
  networkGuiAndHostIdentityVerified: false, deploymentExecuted: false };
const path = join(root, 'REAL_WORKER_PROFILE_PROBE.json');
await writeFile(path, JSON.stringify(report, null, 2) + '\n', { mode: 0o400 });
console.log(JSON.stringify({ ...report, reportPath: path }, null, 2));
process.exitCode = 2;
