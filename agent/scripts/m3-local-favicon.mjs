#!/usr/bin/env node
// Host-owned run-scoped local conversion path accepted by the updated homepage Skill.
// Never bypass original-artwork evidence, full homepage validation or bsk production policy.
import {mkdir,readFile,writeFile,lstat} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {AGENT_ROOT} from '../src/skill-lock.mjs';
import {readArtifact,safePath,sha256} from '../src/files.mjs';
import {validateFaviconPng} from '../src/favicon-png.mjs';
import {runProcess} from '../src/process.mjs';
import {STAGE} from '../src/stages.mjs';

const [operation,runId,...args]=process.argv.slice(2);
const root=resolve(AGENT_ROOT),VENVPY=join(root,'.venv-favicon','bin','python');
const validId=/^[A-Za-z0-9_-]{1,100}$/;
function bad(code){throw Error(code);}
async function pathFacts(runId){
 if(!validId.test(runId??''))bad('M3_BAD_RUN_ID');
 const dir=join(root,'runs',runId),base=join(dir,'m3-local-favicon');
 await safePath(dir,[root]);
 const manifest=JSON.parse(await readArtifact(join(dir,'manifest.json'),[dir]));
 if(manifest.runId!==runId||
   !manifest.stages?.[0]||manifest.stages[0].skill!==STAGE.HOMEPAGE_RESEARCH||
   manifest.stages[0].status==='PASSED'||
   typeof manifest.inputs?.gameIdentity!=='string'||!manifest.inputs.gameIdentity)
   bad('M3_RUN_NOT_ELIGIBLE');
 return {dir,base,game:manifest.inputs.gameIdentity,manifest,requestPath:join(base,'REQUEST.json'),
   approvePath:join(base,'USER_APPROVAL.json'),
   inputPath:join(base,'input','master-512.png'),
   outputPath:join(base,'output','favicon.zip'),
   receiptPath:join(base,'CONVERSION_RECEIPT.json')};
}
async function request(p){
 const raw=await readArtifact(p.requestPath,[p.dir]);
 const data=JSON.parse(raw);
 if(data.schemaVersion!==1||data.mode!=='LOCAL_FAVICON_CONVERSION_V1'||
   data.runId!==runId||data.gameIdentity!==p.game||data.stageMayPass!==false||
   data.inputPath!==p.inputPath||data.outputPath!==p.outputPath)
   bad('M3_REQUEST_IDENTITY_MISMATCH');
 return {data,requestSha256:sha256(raw)};
}
async function filePreview(p){
 const raw=await readArtifact(p.inputPath,[p.dir]);
 validateFaviconPng(raw);
 return {sourceSha256:sha256(raw),sourceBytes:raw.length};
}
async function prepare(p){
 for(const q of [p.base,join(p.base,'input'),join(p.base,'output')])
   await safePath(q,[p.dir]);
 await mkdir(join(p.base,'input'),{recursive:true,mode:0o700});
 await mkdir(join(p.base,'output'),{recursive:true,mode:0o700});
 const req={schemaVersion:1,mode:'LOCAL_FAVICON_CONVERSION_V1',runId,
   gameIdentity:p.game,inputPath:p.inputPath,outputPath:p.outputPath,
   siteOriginIndependentlyVerified:false,stageMayPass:false,requestId:randomUUID()};
 try{await writeFile(p.requestPath,JSON.stringify(req,null,2)+'\n',{flag:'wx',mode:0o600});}
 catch(e){if(e.code!=='EEXIST')throw e;await request(p);}
 try{await writeFile(join(p.base,'INSTRUCTIONS.txt'),[
    'M3 LOCAL FAVICON ENGINE: audited conversion-only; not standalone Skill completion.',
    '1. Provide user-approved genuine game icon: '+p.inputPath,
    '2. Inspect: node scripts/m3-local-favicon.mjs inspect '+runId,
    '3. The user must review its visual identity and printed SHA256.',
    '4. If and only if the icon was genuinely generated as ORIGINAL artwork and you have usage rights:',
    '   node scripts/m3-local-favicon.mjs approve '+runId+' SOURCE_SHA256 I_CONFIRM_ORIGINAL_GENERATED_ARTWORK_AND_RIGHTS',
    '5. Convert: node scripts/m3-local-favicon.mjs convert '+runId,
    '6. This never proves image generation or favicon.io conversion.',
    '7. Image-generation tool provenance is USER-ATTESTED, not independently verified by the host.',
    '8. ZIP conversion success cannot by itself authorize the homepage Skill.'
 ].join('\n')+'\n',{flag:'wx',mode:0o600});}
 catch(e){if(e.code!=='EEXIST')throw e;}
 return {status:'AWAITING_APPROVED_SOURCE_PNG',runId,gameIdentity:p.game,
   sourcePath:p.inputPath,zipPath:p.outputPath,stageMayPass:false};
}
async function inspect(p){
 const req=await request(p);
 let facts;
 try{facts=await filePreview(p);}
 catch{return {status:'AWAITING_VALID_SOURCE_PNG',runId,gameIdentity:p.game,
   inputPath:p.inputPath,stageMayPass:false};}
 let approval;
 try{approval=JSON.parse(await readArtifact(p.approvePath,[p.dir]));}
 catch(e){if(e.code!=='ENOENT')throw e;}
 const approved=approval?.runId===runId&&approval.gameIdentity===p.game&&
   approval.requestSha256===req.requestSha256&&
   approval.sourceSha256===facts.sourceSha256&&approval.visualReviewApproved===true&&
   approval.sourceClaim==='USER_SUPPLIED_VISUALLY_REVIEWED'&&
   approval.stageMayPass===false&&approval.originalArtworkRightsApproved===true&&
   approval.artworkSourceStatement==='USER_ATTESTED_ORIGINAL_GENERATED_ARTWORK'&&
   approval.imageGenerationIndependentlyVerified===false;
 return {status:approved?'APPROVED_SOURCE_READY':'AWAITING_EXPLICIT_USER_VISUAL_APPROVAL',
   runId,gameIdentity:p.game,...facts,requestSha256:req.requestSha256,
   inputPath:p.inputPath,zipPath:p.outputPath,stageMayPass:false,
   originalSkillConversionRuleUpdated:true};
}
async function approve(p,sourceDigest,originalityConfirmation) {
 if(originalityConfirmation!=='I_CONFIRM_ORIGINAL_GENERATED_ARTWORK_AND_RIGHTS')
   bad('M3_EXPLICIT_ARTWORK_ORIGINALITY_CONFIRMATION_REQUIRED');
 if(!/^[a-f0-9]{64}$/.test(sourceDigest??''))bad('M3_USER_SOURCE_DIGEST_CONFIRMATION_REQUIRED');
 const facts=await inspect(p);
 if(facts.status!=='AWAITING_EXPLICIT_USER_VISUAL_APPROVAL'||facts.sourceSha256!==sourceDigest)
   bad('M3_USER_APPROVAL_INVALID_OR_STALE');
 await safePath(p.approvePath,[p.dir]);
 const approval={schemaVersion:1,runId,gameIdentity:p.game,
   requestSha256:facts.requestSha256,sourceSha256:sourceDigest,
   visualReviewApproved:true,sourceClaim:'USER_SUPPLIED_VISUALLY_REVIEWED',
   originalArtworkRightsApproved:true,
   artworkSourceStatement:'USER_ATTESTED_ORIGINAL_GENERATED_ARTWORK',
   imageGenerationIndependentlyVerified:false,
   siteOriginIndependentlyVerified:false,stageMayPass:false,
   approvedAt:new Date().toISOString()};
 await writeFile(p.approvePath,JSON.stringify(approval,null,2)+'\n',{flag:'wx',mode:0o600});
 return inspect(p);
}
async function convert(p){
 const approved=await inspect(p);
 if(approved.status!=='APPROVED_SOURCE_READY')bad('M3_APPROVED_SOURCE_REQUIRED');
 await safePath(p.outputPath,[p.dir]);await safePath(p.receiptPath,[p.dir]);
 const py=await lstat(VENVPY);
 if(!py.isFile()&&!py.isSymbolicLink())bad('M3_PINNED_PILLOW_VENV_REQUIRED');
 await runProcess(VENVPY,
   [join(root,'scripts','m3-local-favicon-engine.py'),runId],
   {cwd:p.base,timeoutMs:45000});
 let receipt;
 try{receipt=JSON.parse(await readArtifact(join(p.base,'ENGINE_RECEIPT.json'),[p.dir]));}
 catch{bad('M3_CONVERTER_RECEIPT_INVALID');}
 if(receipt.runId!==runId||receipt.gameIdentity!==p.game||
   receipt.sourceSha256!==approved.sourceSha256||
   !/^[a-f0-9]{64}$/.test(receipt.zipSha256??'')||
   receipt.origin!=='LOCAL_FAVICON_CONVERSION_V1'||receipt.stageMayPass!==false)
   bad('M3_LOCAL_RECEIPT_MISMATCH');
 await runProcess('python3',[join(root,'scripts','verify-favicon-package.py'),p.outputPath],
   {cwd:p.base,timeoutMs:30000});
 await runProcess('python3',[join(root,'scripts','m3-compare-favicon-pixels.py'),
   p.inputPath,p.outputPath],{cwd:p.base,timeoutMs:30000});
 const zip=await readArtifact(p.outputPath,[p.dir]);
 const still=await inspect(p);
 if(sha256(zip)!==receipt.zipSha256||still.sourceSha256!==receipt.sourceSha256||
   still.status!=='APPROVED_SOURCE_READY')
   bad('M3_POST_CONVERSION_FILES_OR_APPROVAL_CHANGED');
 receipt.status='LOCAL_FAVICON_BINARY_VALIDATED';
 receipt.zipStructureValidated=true;
 receipt.sourcePixelsMatched=true;
 await writeFile(p.receiptPath,JSON.stringify(receipt,null,2)+'\n',{flag:'wx',mode:0o600});
 return {...receipt,receiptPath:p.receiptPath};
}
try {
 const p=await pathFacts(runId);
 let result;
 if(operation==='prepare'&&args.length===0)result=await prepare(p);
 else if(operation==='inspect'&&args.length===0)result=await inspect(p);
 else if(operation==='approve'&&args.length===2)result=await approve(p,args[0],args[1]);
 else if(operation==='convert'&&args.length===0)result=await convert(p);
 else bad('M3_USAGE_PREPARE_INSPECT_APPROVE_CONVERT');
 console.log(JSON.stringify(result,null,2));
 if(['AWAITING_APPROVED_SOURCE_PNG','AWAITING_VALID_SOURCE_PNG',
   'AWAITING_EXPLICIT_USER_VISUAL_APPROVAL'].includes(result.status))
   process.exitCode=2;
}catch(e){
 const code=e?.message;
 console.error(typeof code==='string'&&/^M3_[A-Z0-9_]+$/.test(code)
   ?code:'M3_LOCAL_CONVERTER_UNAVAILABLE');
 process.exitCode=2;
}
