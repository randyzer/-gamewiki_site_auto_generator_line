import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {AGENT_ROOT} from './skill-lock.mjs';
import {bskFileIdentity, runBskCommand} from './bsk-capability.mjs';
import {createBskToolService} from './bsk-tool-server.mjs';
import {askMacHumanApproval} from './macos-human-approval.mjs';
import {inside,safePath,sha256} from './files.mjs';
import {STAGE} from './stages.mjs';
import {bindBrowserPolicy,gameSteamUrl} from './bsk-policy.mjs';

// Runs in the trusted orchestration host, NEVER inside Codex exec's tool sandbox.
// Only fixed, typed public Steam data. Neither approvals nor source write grants
// can come from the Codex worker or a page.
export async function collectTrustedSteamEvidence(context,{
  approve=askMacHumanApproval, execute=runBskCommand,
  verifyIdentity=bskFileIdentity,
  policyFile=join(AGENT_ROOT,'config/bsk-command-policy.json')
}={}) {
  const blocked=(code,details={})=>({status:'BLOCKED',code,...details});
  if(context.stage!==STAGE.HOMEPAGE_RESEARCH)
    return blocked('UNSUPPORTED_BROWSER_STAGE');
  if(!/^[a-zA-Z0-9_-]{1,100}$/.test(context.runId??'')||
    !inside(join(AGENT_ROOT,'runs'),context.runDirectory)||
    !inside(context.runDirectory,context.nativeDirectory))
    return blocked('UNSAFE_BROWSER_CONTEXT');
  await safePath(context.nativeDirectory,[context.runDirectory]);
  await mkdir(context.nativeDirectory,{recursive:true});
  const source=await readFile(policyFile);
  const policy=JSON.parse(source.toString('utf8'));
  // Reject absent or mismatched game identity BEFORE any browser session is created.
  let bound;
  try {bound=bindBrowserPolicy(policy,context.inputs);}
  catch {return blocked('INVALID_GAME_METADATA');}
  if(!bound.game)return blocked('SUPPORTED_STEAM_IDENTITY_REQUIRED');
  let identity;
  try {identity=await verifyIdentity(policy);}
  catch {return blocked('BSK_EXECUTABLE_UNVERIFIED');}
  const service=createBskToolService({context,policy,identity,approve,execute});
  let ownWindow=false,closed=false;
  const steps=[];
  let evidence=null;
  async function call(intent,argv) {
    const requestId= 'host-'+intent+'-'+randomUUID();
    const response=await service.handle({jsonrpc:'2.0',id:1,method:'tools/call',
      params:{name:'bsk_command',arguments:{requestId,argv}}});
    let outcome;
    try{outcome=JSON.parse(response.result.content[0].text);}
    catch{outcome={status:'COMMAND_UNAVAILABLE'};}
    steps.push({intent,status:outcome.status,requestId,
      ...(['STEAM_URL_IDENTITY_MISMATCH','STEAM_STRUCTURED_DATA_AMBIGUOUS',
        'STEAM_PUBLIC_META_NOT_AVAILABLE','STEAM_PUBLIC_META_IDENTITY_MISMATCH',
        'STEAM_PUBLIC_META_URL_MISMATCH','STEAM_PUBLIC_META_DESCRIPTION_MISSING'
      ].includes(outcome.reasonCode)?{reasonCode:outcome.reasonCode}:{})});
    return outcome;
  }
  let failure=null;
  try {
    const started=await call('start',['session','start']);
    if(started.status!=='COMPLETED')throw Error(started.status||'SESSION_START_FAILED');
    ownWindow=true;
    const tabs=await call('tabs',['tab','list']);
    if(tabs.status!=='COMPLETED')throw Error(tabs.status||'TABS_FAILED');
    const url=context.inputs?.gameMetadata?.steam;
    if(typeof url!=='string')throw Error('SUPPORTED_STEAM_IDENTITY_REQUIRED');
    const navigation=await call('navigate',['navigate',url]);
    if(navigation.status!=='COMPLETED')throw Error(navigation.status||'NAVIGATION_FAILED');
    const result=await call('observe',['observe']);
    if(result.status!=='COMPLETED')throw Error(result.status||'CAPTURE_FAILED');
    const parsed=JSON.parse(result.stdout);
    const value=parsed?.value;
    if(!['STEAM_PUBLIC_GAME_JSON_LD_V1','STEAM_PUBLIC_GAME_META_V1'].includes(value?.sourceSchema)||
      value.content?.name!==context.inputs.gameIdentity||
      !gameSteamUrl(value.url,bound.game))throw Error('PUBLIC_CONTENT_UNVERIFIED');
    evidence={sourceSchema:value.sourceSchema,url:value.url,content:value.content};
  } catch(error) {
    // Never include tool diagnostics or page text in an untrusted error.
    const allowed=['APPROVAL_CAPABILITY_UNAVAILABLE','COMMAND_NOT_APPROVED',
      'DAEMON_UNREACHABLE','IPC_PERMISSION_DENIED','PUBLIC_CONTENT_UNVERIFIED',
      'CAPTURE_CONTEXT_CHANGED','COMMAND_TIMEOUT','SUPPORTED_STEAM_IDENTITY_REQUIRED',
      'OWNED_SESSION_UNAVAILABLE','OWNED_TAB_UNAVAILABLE'];
    failure=allowed.includes(error.message)?error.message:'BROWSER_EVIDENCE_INCOMPLETE';
  } finally {
    if(ownWindow) {
      try{const result=await call('close',['session','stop']);closed=result.status==='COMPLETED';}
      catch{closed=false;}
    }
    // The hosted tool has no window to clean up once explicit close succeeded.
  }
  if(!evidence||!closed)return blocked(!closed&&ownWindow?'OWNED_WINDOW_CLEANUP_UNVERIFIED':failure||'BROWSER_EVIDENCE_INCOMPLETE',{steps,ownedWindowClosed:closed});
  const report={schemaVersion:1,sourceType:'HOST_APPROVED_TYPED_STEAM_PUBLIC_V1',
    runId:context.runId,stage:context.stage,gameIdentity:context.inputs.gameIdentity,
    browserSteps:steps,ownedWindowClosed:true,evidence,
    countsAsStageArtifact:false,realSkillExecution:false,
    deploymentExecuted:false};
  const file=join(context.runDirectory,'HOST_APPROVED_STEAM_EVIDENCE_'+randomUUID()+'.json');
  // Host-owned and outside the worker's workspace-write nativeDirectory.
  await safePath(file,[context.runDirectory]);
  const bytes=JSON.stringify(report,null,2)+'\n';
  try{await writeFile(file,bytes,{flag:'wx',mode:0o400});}
  catch(err){return blocked(err.code==='EEXIST'?'HOST_EVIDENCE_FILE_CONFLICT':'HOST_EVIDENCE_WRITE_FAILED',{steps,ownedWindowClosed:closed});}
  return {status:'EVIDENCE_READY',path:file,sha256:sha256(bytes),steps,ownedWindowClosed:true,
    countsAsStageArtifact:false};
}
