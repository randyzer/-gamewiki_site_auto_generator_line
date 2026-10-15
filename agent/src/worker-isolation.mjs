import { spawn } from 'node:child_process';
import { mkdir, realpath, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { createServer, createConnection } from 'node:net';
import { AGENT_ROOT } from './skill-lock.mjs';
import { workerEnvironment } from './worker-permissions.mjs';
import { permissionProfileConfig, stageWorkerPermissions } from './worker-permissions.mjs';
import { STAGE } from './stages.mjs';

const categories = ['host-approval', 'synthetic-credential', 'other-run', 'template-source', 'original-site'];
const base = { kind: 'WORKER_CANARY_ISOLATION_V1', productionActivationAuthorized: false,
  filesystemIsolationVerified: false, realCredentialsAccessed: false,
  networkVerified: false, guiChannelVerified: false, processIdentityVerified: false };

export function assessWorkerIsolation(evidence) {
  if (evidence.exitCode !== 0) return { ...base, status: 'BLOCKED', probeExecuted: false,
    code: ['SANDBOX_APPLY_DENIED', 'SANDBOX_UNAVAILABLE', 'SANDBOX_TIMEOUT',
      'SANDBOX_PERMISSION_PROFILE_REQUIRED'].includes(evidence.failure)
      ? evidence.failure : 'SANDBOX_COMMAND_FAILED' };
  const checks = evidence.protected;
  if (!evidence.allowed || evidence.allowed.read !== true || evidence.allowed.write !== true ||
      !Array.isArray(checks) || checks.length !== categories.length ||
      new Set(checks.map(item => item.category)).size !== categories.length ||
      checks.some(item => !categories.includes(item.category) ||
        typeof item.read !== 'boolean' || typeof item.write !== 'boolean'))
    return { ...base, status: 'BLOCKED', probeExecuted: true, code: 'ISOLATION_EVIDENCE_INCOMPLETE' };
  const measured = { allowed: evidence.allowed, protected: checks };
  if (evidence.stagePolicy && (!Array.isArray(evidence.readonly) || evidence.readonly.length !== 2 ||
      !evidence.descendant || evidence.loopbackPositiveControl !== true || typeof evidence.loopbackConnected !== 'boolean'))
    return { ...base, ...measured, status: 'BLOCKED', probeExecuted: true, code: 'ISOLATION_EVIDENCE_INCOMPLETE' };
  if (evidence.readonly && (evidence.readonly.length !== 2 || evidence.readonly.some(x => x.read !== true || x.write !== false)))
    return { ...base, ...measured, status: 'BLOCKED', probeExecuted: true, code: 'WORKER_READONLY_INPUT_NOT_ENFORCED' };
  if (evidence.descendant && (evidence.descendant.read !== false || evidence.descendant.write !== false))
    return { ...base, ...measured, status: 'BLOCKED', probeExecuted: true, code: 'WORKER_DESCENDANT_BOUNDARY_FAILED' };
  if (evidence.loopbackConnected === true)
    return { ...base, ...measured, status: 'BLOCKED', probeExecuted: true, code: 'WORKER_LOOPBACK_NETWORK_ALLOWED' };
  if (checks.some(item => item.read)) return { ...base, ...measured,
    status: 'BLOCKED', probeExecuted: true, code: 'WORKER_PROTECTED_READ_ALLOWED' };
  if (checks.some(item => item.write)) return { ...base, ...measured,
    status: 'BLOCKED', probeExecuted: true, code: 'WORKER_PROTECTED_WRITE_ALLOWED' };
  return { ...base, ...measured, status: 'PARTIAL', probeExecuted: true,
    filesystemIsolationVerified: true, code: 'FILESYSTEM_CANARY_PASS_OTHER_BOUNDARIES_UNVERIFIED' };
}

const canaryScript = `import { readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createConnection } from 'node:net';
const data = JSON.parse(process.argv[1]);
async function check(path) {
  let read=false, write=false;
  try { await readFile(path); read=true; } catch {}
  try { await writeFile(path, 'SYNTHETIC_CHANGED'); write=true; } catch {}
  return {read,write};
}
const allowed=await check(data.allowed);
const protectedChecks=[];
for (const item of data.protected) protectedChecks.push({category:item.category,...await check(item.path)});
const extra={};
if(data.readonly) {
  extra.readonly=[];
  for(const item of data.readonly) extra.readonly.push({category:item.category,...await check(item.path)});
  const child=spawnSync(process.execPath,['--input-type=module','-e',
    "import {readFile,writeFile} from 'node:fs/promises'; let read=false,write=false;try{await readFile(process.argv[1]);read=true;}catch{}try{await writeFile(process.argv[1],'SYNTHETIC_CHILD');write=true;}catch{}process.stdout.write(JSON.stringify({read,write}));",
    data.protected[0].path],{encoding:'utf8'});
  try{extra.descendant=JSON.parse(child.stdout);}catch{extra.descendant={read:null,write:null};}
  extra.loopbackConnected=await new Promise(resolve=>{
    const socket=createConnection({host:'127.0.0.1',port:data.port});
    const done=value=>{socket.destroy();resolve(value);};
    socket.once('connect',()=>done(true));socket.once('error',()=>done(false));socket.setTimeout(1000,()=>done(false));
  });
}
process.stdout.write(JSON.stringify({allowed,protected:protectedChecks,...extra}));`;

// Official permission-profile schema; this command-local profile is never installed globally.
export function canarySandboxArgs(cwd, nodePath, resolvedNodePath) {
  const readPaths = [nodePath, resolvedNodePath];
  // Node reads the OS OpenSSL configuration before evaluating even a fixed script.
  if (process.platform === 'darwin') readPaths.push('/System/Library/OpenSSL');
  return ['sandbox', '--permission-profile', 'agent-canary', '-c',
    permissionProfileConfig('agent-canary', { readPaths, writePaths: [cwd] }), '-C', cwd];
}

export async function probeWorkerIsolation({ command = process.env.CODEX_BIN || 'codex', stagePolicy = false } = {}) {
  const runId = 'TEST-worker-isolation-' + randomUUID();
  const root = join(AGENT_ROOT, 'runs', runId), cwd = join(root, 'allowed');
  await mkdir(cwd, { recursive: true });
  await mkdir(join(root, 'protected'));
  const inputs = { allowed: join(cwd, 'output.canary'), protected: [] };
  await writeFile(inputs.allowed, 'SYNTHETIC_ALLOWED');
  for (const category of categories) {
    const path = join(root, 'protected', category + '.canary');
    await writeFile(path, 'SYNTHETIC_ONLY', { mode: 0o600 });
    inputs.protected.push({ category, path });
  }
  let sandboxArgs = canarySandboxArgs(cwd, process.execPath, await realpath(process.execPath));
  let server, loopbackPositiveControl;
  if (stagePolicy) {
    const skill = join(root, 'locked-skill', 'SKILL.md'), approvedInput = join(root, 'approved-keywords.md');
    await mkdir(join(root, 'locked-skill'));
    await writeFile(skill, 'SYNTHETIC LOCKED SKILL'); await writeFile(approvedInput, 'SYNTHETIC APPROVED INPUT');
    const policy = await stageWorkerPermissions(STAGE.TEMPLATE_SELECTION, { nativeDirectory: cwd,
      runDirectory: root, inputs: { rawKeywordsFile: approvedInput }, skillLock: { source: skill } });
    sandboxArgs = ['sandbox', '--permission-profile', 'agent-worker', ...policy.args, '-C', cwd];
    inputs.readonly = [{ category: 'locked-skill', path: skill }, { category: 'approved-input', path: approvedInput }];
    server = createServer(socket => socket.end());
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
    inputs.port = server.address().port;
    loopbackPositiveControl = await new Promise(resolve => {
      const socket = createConnection({ host: '127.0.0.1', port: inputs.port });
      const done = value => { socket.destroy(); resolve(value); };
      socket.once('connect', () => done(true)); socket.once('error', () => done(false));
      socket.setTimeout(1000, () => done(false));
    });
  }
  const args = [...sandboxArgs, '--',
    process.execPath, '--input-type=module', '-e', canaryScript, JSON.stringify(inputs)];
  const outcome = await new Promise(resolve => {
    const child = spawn(command, args, { cwd, env: workerEnvironment(), stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '', expired = false, settled = false;
    const finish = value => { if (!settled) { settled = true; clearTimeout(timer); resolve(value); } };
    const timer = setTimeout(() => { expired = true; child.kill('SIGKILL'); }, 15000);
    child.stdout.on('data', bytes => { if (stdout.length < 65536) stdout += bytes.toString(); });
    child.stderr.on('data', bytes => { if (stderr.length < 8192) stderr += bytes.toString(); });
    child.on('error', () => finish({ exitCode: null, failure: 'SANDBOX_UNAVAILABLE' }));
    child.on('close', exitCode => {
      if (expired) return finish({ exitCode, failure: 'SANDBOX_TIMEOUT' });
      if (/sandbox_apply.*Operation not permitted/i.test(stderr))
        return finish({ exitCode, failure: 'SANDBOX_APPLY_DENIED' });
      if (/required arguments[\s\S]*--permission-profile/i.test(stderr))
        return finish({ exitCode, failure: 'SANDBOX_PERMISSION_PROFILE_REQUIRED' });
      try { finish({ exitCode, ...JSON.parse(stdout) }); }
      catch { finish({ exitCode, failure: 'SANDBOX_COMMAND_FAILED' }); }
    });
  });
  if (server) await new Promise(resolve => server.close(resolve));
  const report = { ...assessWorkerIsolation({ ...outcome, stagePolicy, loopbackPositiveControl }), runId, platform: process.platform,
    sandbox: 'codex sandbox / ' + (stagePolicy ? 'actual stage-worker policy' : 'agent-canary permission profile'), exitCode: outcome.exitCode,
    ...(stagePolicy ? { samePolicyAsExecutor: true, readonly: outcome.readonly, descendant: outcome.descendant,
      loopbackPositiveControl, loopbackConnected: outcome.loopbackConnected,
      probeScope: 'SYNTHETIC_FILES_AND_LOCAL_LOOPBACK_ONLY_NO_MODEL_NO_EXTERNAL_NETWORK_NO_BROWSER' } : {}),
    configurationSource: 'https://learn.chatgpt.com/docs/permissions',
    allowedRoot: cwd, ...(!stagePolicy ? { probeScope: 'SYNTHETIC_FILES_ONLY_NO_MODEL_NO_NETWORK_NO_BROWSER' } : {}),
    protectedPermissionMode: '0600, same UID; not asserted as an isolation mechanism' };
  const path = join(root, 'ISOLATION_REPORT.json');
  await writeFile(path, JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
  return { ...report, reportPath: path };
}
