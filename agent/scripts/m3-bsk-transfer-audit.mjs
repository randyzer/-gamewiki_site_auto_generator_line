#!/usr/bin/env node
// Read-only bsk transfer forensics. Never opens pages, retries uploads, or prints logs.
import {readFile,lstat} from 'node:fs/promises';
import {join} from 'node:path';
import {AGENT_ROOT} from '../src/skill-lock.mjs';
import {sha256,safePath} from '../src/files.mjs';

const runs=join(AGENT_ROOT,'runs');
const ids=process.argv.slice(2);
const safeId=/^m3-favicon-[a-z-]+-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const effect=new Set(['none','unknown','committed','unverified']);
const safeState=new Set(['COMPLETED','BLOCKED','COMMAND_TIMEOUT','DAEMON_UNREACHABLE','COMMAND_NOT_APPROVED']);
const shaRe=/^[0-9a-f]{64}$/;
async function inspect(id){
 if(!safeId.test(id))throw Error('M3_INVALID_DIAGNOSTIC_RUN_ID');
 const dir=join(runs,id);
 const result=join(dir,'SMOKE_RESULT.json');
 await safePath(result,[runs]);
 const summary=JSON.parse(await readFile(result,'utf8'));
 if(summary.runId!==id)throw Error('M3_RUN_IDENTITY_MISMATCH');
 const step=summary.statuses?.find(x=>x.intent==='upload-synthetic-test');
 if(!step)return {runId:id,uploadAttempted:false,status:'NO_UPLOAD_ATTEMPT',
  blocker:summary.blocker&&/^M3_[A-Z0-9_]+$/.test(summary.blocker)?summary.blocker:'NOT_VERIFIED'};
 if(!/^[a-zA-Z0-9_-]{1,100}$/.test(step.requestId??''))throw Error('M3_UNSAFE_REQUEST_ID');
 const auditPath=join(dir,'bsk-audit',step.requestId+'.json');
 await safePath(auditPath,[dir]);
 const audit=JSON.parse(await readFile(auditPath,'utf8'));
 const command=audit.command??{};
 const resultCode=audit.result??{};
 const argv=command.argv??[];
 const mode=argv.includes('--mode')?argv[argv.indexOf('--mode')+1]:null;
 const approval=audit.decision?.status==='APPROVED';
 const inputHash=command.inputSha256;
 const snapshot=join(dir,'bsk-audit','transfers',step.requestId+'.png');
 let snapshotValid=false;
 try {
  await safePath(snapshot,[dir]);
  const stats=await lstat(snapshot);
  if(stats.isFile()&&stats.nlink===1&&stats.size>0&&stats.size<=8*1024*1024&&shaRe.test(inputHash??''))
   snapshotValid=sha256(await readFile(snapshot))===inputHash;
 }catch(error){if(error.code!=='ENOENT')throw error;}
 return {
  runId:id,uploadAttempted:true,approvalVerified:approval,
  selectedMode:mode==='input'||mode==='drop'?mode:'UNVERIFIED',
  hostSnapshotMatchesApprovedSha256:snapshotValid,
  commandStatus:safeState.has(resultCode.status)?resultCode.status:'UNVERIFIED',
  cliExitCode:Number.isInteger(resultCode.cliExitCode)?resultCode.cliExitCode:null,
  stderrBytes:Number.isInteger(resultCode.stderrBytes)?resultCode.stderrBytes:null,
  bskReason:['file_input_not_activated','file_input_not_found','target_not_found',
    'target_not_visible','upload_failed','unsupported_operation'].includes(resultCode.bskReason)
      ?resultCode.bskReason:'UNVERIFIED',
  effectState:effect.has(resultCode.effectState)?resultCode.effectState:'unverified',
  siteAcceptanceVerified:false,extensionRpcDeliveryVerified:false,
  downloadAttempted:summary.statuses.some(x=>x.intent==='download-test-zip'),
  ownedWindowClosed:summary.ownedWindowClosed===true
 };
}
try{
 if(ids.length===0||ids.length>8)throw Error('M3_DIAGNOSTIC_RUN_IDS_REQUIRED');
 const samples=[];
 for(const id of ids)samples.push(await inspect(id));
 const attempted=samples.filter(s=>s.uploadAttempted);
 const bothModesFailed=attempted.some(s=>s.selectedMode==='input'&&s.commandStatus==='COMMAND_TIMEOUT')&&
    attempted.some(s=>s.selectedMode==='drop'&&s.commandStatus==='COMMAND_TIMEOUT');
 console.log(JSON.stringify({
  schemaVersion:1,analysis:'READ_ONLY_HOST_TRANSFER_AUDITS_V1',
  noBrowserCommandsExecuted:true,productionTransferEnabled:false,
  samples,findings:{
    inputAndDropBothTimedOut:bothModesFailed,
    hostStagingAppearsHealthy:attempted.length>0&&attempted.every(s=>s.hostSnapshotMatchesApprovedSha256),
    extensionRpcRootCauseProven:false,
    siteAcceptanceProven:false,
    recommendation:bothModesFailed?'INSTRUMENT_BSK_EXTENSION_OR_USE_LOCAL_CONVERSION':'MORE_TRUSTED_EVIDENCE_REQUIRED'
  }
 },null,2));
}catch(error){
 const msg=error.message;
 console.error(/^M3_[A-Z0-9_]+$/.test(msg)?msg:'M3_DIAGNOSTIC_UNAVAILABLE');
 process.exitCode=2;
}
