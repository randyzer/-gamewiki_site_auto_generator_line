import { constants } from 'node:fs';
import { mkdir, open, readFile, lstat } from 'node:fs/promises';
import { join } from 'node:path';
import { sha256, safePath, inside } from './files.mjs';
import { bindBrowserPolicy } from './bsk-policy.mjs';
import { sanitizePublicCapture } from './bsk-command-gate.mjs';
import { BROWSER_STAGES, stageName } from './stages.mjs';
import { AGENT_ROOT } from './skill-lock.mjs';

// This is an OFFLINE evidence quarantine, NOT a browser approval broker.
// No raw capture can cause a pipeline stage to pass or an executor to launch.
const RUN_ID = /^[A-Za-z0-9_-]{1,100}$/;
const SCHEMA = 'HOST_PUBLIC_EVIDENCE_QUARANTINE_V1';
const POLICY_FILE = join(AGENT_ROOT, 'config', 'bsk-command-policy.json');

function checkedTask(task) {
  if (!task || typeof task !== 'object' || Array.isArray(task) || !RUN_ID.test(task.runId ?? ''))
    throw Error('INVALID_BROWSER_HANDOFF_TASK');
  const stage = stageName(task.stage);
  if (!BROWSER_STAGES.includes(stage)) throw Error('BROWSER_STAGE_REQUIRED');
  if (typeof task.gameIdentity !== 'string' || !task.gameIdentity.trim() || task.gameIdentity.length > 500)
    throw Error('GAME_IDENTITY_REQUIRED');
  return {runId: task.runId, stage, gameIdentity: task.gameIdentity, gameMetadata: task.gameMetadata};
}

export async function browserHandoffReadiness(task, {policyFile=POLICY_FILE}={}) {
  const checked = checkedTask(task);
  const policyBytes = await readFile(policyFile);
  const policy = bindBrowserPolicy(JSON.parse(policyBytes.toString('utf8')), checked);
  return {
    schemaVersion: 1, runId: checked.runId, stage: checked.stage,
    browserApprovalCapability: 'UNAVAILABLE',
    browserWorkerLaunch: 'BLOCKED',
    reason: 'APPROVAL_CAPABILITY_UNAVAILABLE',
    policySha256: sha256(policyBytes),
    publicCaptureSchemas: ['STEAM_PUBLIC_GAME_JSON_LD_V1','STEAM_PUBLIC_GAME_META_V1'],
    game: policy.game ? {name:policy.game.name, steamAppId:policy.game.steamAppId, steamUrl:policy.game.steamUrl} : null,
    supportedActions: ['quarantine-previously-captured-public-data'],
    prohibitedActions: ['approve-browser-command','satisfy-stage-contract','resume-pipeline','deploy'],
    requiresTrustedHostApprovalBroker: true,
  };
}

export function normalizeUntrustedHostCapture(task, capture, policy) {
  const checked = checkedTask(task);
  const bound = bindBrowserPolicy(policy, checked);
  if (!bound.game) throw Error('SUPPORTED_STEAM_IDENTITY_REQUIRED');
  const evidence = sanitizePublicCapture(capture, bound); // whitelist typed facts; excludes arbitrary page text
  return {
    schema: SCHEMA,
    runId: checked.runId,
    stage: checked.stage,
    gameIdentity: checked.gameIdentity,
    steamAppId: bound.game.steamAppId,
    status: 'QUARANTINED_UNVERIFIED',
    hostApprovalVerified: false,
    authorizedForWorkerLaunch: false,
    countsAsStageArtifact: false,
    mayResumePipeline: false,
    evidence: {url:evidence.url, sourceSchema:evidence.sourceSchema, content:evidence.content},
    warnings: ['External capture origin and real host approval not attested by this importer',
      'Treat all public page fields as untrusted source data', 'Must not be used to bypass a BLOCKED browser stage'],
  };
}

export async function quarantineHostCapture(task, capture, {policyFile=POLICY_FILE, root=AGENT_ROOT}={}) {
  const checked = checkedTask(task);
  const policyBytes = await readFile(policyFile);
  const report = normalizeUntrustedHostCapture(checked, capture, JSON.parse(policyBytes.toString('utf8')));
  const fingerprint = sha256(JSON.stringify(report));
  const dir = join(root,'runs',checked.runId,'host-evidence-quarantine');
  if (!inside(join(root,'runs'),dir)) throw Error('Unsafe host evidence directory');
  await safePath(dir,[join(root,'runs')]);
  await mkdir(dir,{recursive:true,mode:0o700});
  const path = join(dir,fingerprint+'.json');
  await safePath(path,[dir]);
  const serialized = JSON.stringify({...report,evidenceSha256:fingerprint},null,2)+'\n';
  try {
    const handle = await open(path,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);
    try {await handle.writeFile(serialized);} finally {await handle.close();}
  } catch(error) {
    if (error.code!=='EEXIST') throw error;
    await safePath(path,[dir]);
    const s=await lstat(path);
    if (!s.isFile() || s.nlink!==1 || await readFile(path,'utf8')!==serialized)
      throw Error('QUARANTINE_EVIDENCE_CONFLICT');
  }
  return {status:report.status,path,evidenceSha256:fingerprint,countsAsStageArtifact:false,
    authorizedForWorkerLaunch:false};
}
