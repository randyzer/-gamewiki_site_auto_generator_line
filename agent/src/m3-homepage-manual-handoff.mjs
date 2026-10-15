import {readFile,writeFile,mkdir,lstat} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {randomUUID} from 'node:crypto';
import {AGENT_ROOT} from './skill-lock.mjs';
import {safePath,readArtifact,sha256} from './files.mjs';
import {validateFaviconPng} from './favicon-png.mjs';
import {runProcess} from './process.mjs';
import {STAGE} from './stages.mjs';

const ORIGIN='https://favicon.io/favicon-converter/';
const DIR='m3-homepage-manual';
const hashRe=/^[a-f0-9]{64}$/;
const runRe=/^[A-Za-z0-9_-]{1,100}$/;
const filename={master:'master-512.png',zip:'favicon.zip'};

const blocked=(status,code,fields={})=>({status,code,stageMayPass:false,...fields});

function paths(runDirectory){
 const home=join(runDirectory,DIR);
 return {home,requestPath:join(home,'REQUEST.json'),approvalPath:join(home,'USER_APPROVAL.json'),
  masterPath:join(home,'input',filename.master),zipPath:join(home,'output',filename.zip)};
}
async function inspectFile(file,home){
 await safePath(file,[home]);
 const stat=await lstat(file);
 if(!stat.isFile()||stat.nlink!==1||stat.size===0||stat.size>16*1024*1024)
  throw Error('M3_UNSAFE_HANDOFF_FILE');
 return readArtifact(file,[home]);
}
async function verifyFiles(p,{run=runProcess}={}){
 const master=await inspectFile(p.masterPath,p.home);
 validateFaviconPng(master);
 const zip=await inspectFile(p.zipPath,p.home);
 await run('python3',[join(AGENT_ROOT,'scripts','verify-favicon-package.py'),p.zipPath],
  {cwd:p.home,timeoutMs:30000});
 await run('python3',[join(AGENT_ROOT,'scripts','m3-compare-favicon-pixels.py'),p.masterPath,p.zipPath],
  {cwd:p.home,timeoutMs:30000});
 return {masterSha256:sha256(master),zipSha256:sha256(zip),
  masterBytes:master.length,zipBytes:zip.length};
}
export async function beginHomepageManualHandoff({runDirectory,runId,gameIdentity}) {
 if(!runRe.test(runId??'')||!gameIdentity||typeof gameIdentity!=='string'||
   !runDirectory?.endsWith('/runs/'+runId))throw Error('M3_BAD_RUN_IDENTITY');
 const p=paths(runDirectory);
 await safePath(p.home,[runDirectory]);
 await safePath(p.masterPath,[p.home]);
 await safePath(p.zipPath,[p.home]);
 await safePath(p.requestPath,[p.home]);
 await safePath(p.approvalPath,[p.home]);
 await safePath(join(p.home,'INSTRUCTIONS.txt'),[p.home]);
 await mkdir(join(p.home,'input'),{recursive:true,mode:0o700});
 await mkdir(join(p.home,'output'),{recursive:true,mode:0o700});
 const request={schemaVersion:1,mode:'MANUAL_FAVICON_FALLBACK_V1',runId,
  stage:STAGE.HOMEPAGE_RESEARCH,gameIdentity,origin:ORIGIN,
  masterPath:p.masterPath,zipPath:p.zipPath,
  notAutomaticBskTransfer:true,manualOriginIndependentVerification:false,
  stageMayPass:false,requestId:randomUUID()};
 try {await writeFile(p.requestPath,JSON.stringify(request,null,2)+'\n',{flag:'wx',mode:0o600});}
 catch(e){
  if(e.code!=='EEXIST')throw e;
  const prior=JSON.parse(await readArtifact(p.requestPath,[p.home]));
  if(prior.runId!==runId||prior.gameIdentity!==gameIdentity||prior.mode!==request.mode)
   throw Error('M3_MANUAL_REQUEST_CONFLICT');
 }
 const instructions=[
  'M3 HOMEPAGE: manual favicon fallback for '+gameIdentity,
  '1. Supply a genuine approved 512x512 RGBA PNG (not a synthetic test fixture) at '+p.masterPath,
  '2. Personally review artwork identity, transparent background and 16px readability.',
  '3. In Chrome open '+ORIGIN+' and upload the exact master image yourself.',
  '4. Place the genuinely downloaded seven-file ZIP at '+p.zipPath,
  '5. Run: node scripts/m3-homepage-handoff.mjs inspect '+runId,
  '6. Explicitly authorize the exact printed PNG and ZIP digests using approve command.',
  '7. Resume the SAME run with node src/cli.mjs retry <ORIGINAL_INPUT_CARD> '+runId,
  'The host verifies both files and 512px pixel correspondence. User attestation',
  'does not prove site origin independently and does not prove BSK automated transfer.',
  'A homepage research report must still satisfy the original Skill validator.'
 ].join('\n')+'\n';
 try {await writeFile(join(p.home,'INSTRUCTIONS.txt'),instructions,{flag:'wx',mode:0o600});}
 catch(e){if(e.code!=='EEXIST')throw e;}
 return {status:'AWAITING_MANUAL_FILES',runId,gameIdentity,
  instructions:join(p.home,'INSTRUCTIONS.txt'),inputPath:p.masterPath,
  outputPath:p.zipPath,approvalRequired:true,stageMayPass:false};
}
export async function inspectHomepageManualHandoff({
 runDirectory,runId,gameIdentity,run=runProcess
}={}) {
 if(!runRe.test(runId??'')||typeof gameIdentity!=='string'||!gameIdentity||
   !runDirectory?.endsWith('/runs/'+runId))throw Error('M3_BAD_RUN_IDENTITY');
 const p=paths(runDirectory);
 let request,requestBytes;
 try{
  requestBytes=await readArtifact(p.requestPath,[runDirectory]);
  request=JSON.parse(requestBytes);
 }catch(e){
  if(e.code==='ENOENT')return {status:'NOT_ENABLED',stageMayPass:false};
  throw e;
 }
 if(request.schemaVersion!==1||request.mode!=='MANUAL_FAVICON_FALLBACK_V1'||
   request.runId!==runId||request.gameIdentity!==gameIdentity||
   request.stage!==STAGE.HOMEPAGE_RESEARCH||request.origin!==ORIGIN||
   request.masterPath!==p.masterPath||request.zipPath!==p.zipPath||
   request.notAutomaticBskTransfer!==true||request.manualOriginIndependentVerification!==false||
   request.stageMayPass!==false)
   throw Error('M3_MANUAL_REQUEST_IDENTITY_MISMATCH');
 let files;
 try {files=await verifyFiles(p,{run});}
 catch(e){
  if(e.code==='ENOENT')return blocked('WAITING_FOR_USER','M3_AWAITING_MANUAL_INPUT_AND_ZIP',{
    masterPath:p.masterPath,zipPath:p.zipPath});
  return blocked('BLOCKED','M3_MANUAL_FILES_REJECTED');
 }
 const requestSha256=sha256(requestBytes);
 let approval;
 try{approval=JSON.parse(await readArtifact(p.approvalPath,[p.home]));}
 catch(e){
  if(e.code==='ENOENT')return blocked('WAITING_FOR_USER','M3_AWAITING_USER_ATTESTATION',
    {...files,requestSha256,masterPath:p.masterPath,zipPath:p.zipPath});
  throw e;
 }
 if(approval?.schemaVersion!==1||approval.runId!==runId||
   approval.gameIdentity!==gameIdentity||approval.requestSha256!==requestSha256||
   approval.masterSha256!==files.masterSha256||approval.zipSha256!==files.zipSha256||
   approval.visualReviewApproved!==true||approval.manualSiteConversionConfirmed!==true||
   approval.sourceClaim!=='USER_SUPPLIED_AND_VISUALLY_REVIEWED'||
   approval.siteOriginIndependentlyVerified!==false)
   return blocked('BLOCKED','M3_MANUAL_APPROVAL_INVALID_OR_STALE');
 return {status:'READY_FOR_HOMEPAGE_SKILL',stageMayPass:false,
  gameIdentity,runId,requestSha256,masterPath:p.masterPath,zipPath:p.zipPath,
  ...files,sourceClaim:'USER_SUPPLIED_AND_VISUALLY_REVIEWED',
  manualSiteConversionConfirmed:true,siteOriginIndependentlyVerified:false,
  automaticBrowserTransferVerified:false};
}
export async function approveHomepageManualHandoff({
 runDirectory,runId,gameIdentity,masterSha256,zipSha256
}={}){
 if(!hashRe.test(masterSha256??'')||!hashRe.test(zipSha256??''))
  throw Error('M3_USER_DIGEST_CONFIRMATION_REQUIRED');
 const status=await inspectHomepageManualHandoff({runDirectory,runId,gameIdentity});
 if(status.status!=='WAITING_FOR_USER'||status.code!=='M3_AWAITING_USER_ATTESTATION'||
   status.masterSha256!==masterSha256||status.zipSha256!==zipSha256)
  throw Error('M3_USER_APPROVAL_REQUIRES_CURRENT_VALIDATED_FILES');
 const p=paths(runDirectory);
 const approval={schemaVersion:1,runId,gameIdentity,
  requestSha256:status.requestSha256,masterSha256,zipSha256,
  visualReviewApproved:true,manualSiteConversionConfirmed:true,
  sourceClaim:'USER_SUPPLIED_AND_VISUALLY_REVIEWED',
  siteOriginIndependentlyVerified:false,approvedAt:new Date().toISOString(),
  note:'User self-attestation only; not independently signed by favicon.io or an image generator'};
 await writeFile(p.approvalPath,JSON.stringify(approval,null,2)+'\n',{flag:'wx',mode:0o600});
 return inspectHomepageManualHandoff({runDirectory,runId,gameIdentity});
}
