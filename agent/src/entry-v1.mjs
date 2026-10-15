// Safe, pre-execution entry desk for the ONE existing game-site orchestrator.
// No browser, Codex worker, template copy, git push or site writes occur here.
import {readFile,writeFile,mkdir,rename,stat,lstat,rmdir,unlink} from 'node:fs/promises';
import {join,resolve,relative,isAbsolute} from 'node:path';
import {randomUUID} from 'node:crypto';
import {AGENT_ROOT} from './skill-lock.mjs';
import {STAGE,STAGES} from './stages.mjs';
import {isDeepStrictEqual} from 'node:util';
import {safePath,sha256,treeFiles} from './files.mjs';

const ENTRY_VERSION=1;
const idPattern=/^[A-Za-z0-9_-]{1,100}$/;
const shaPattern=/^[a-f0-9]{64}$/;
const allowed=new Set(['mode','gameIdentity','objective','gameMetadata','rawKeywordsFile',
  'keywordSourceLineageFile',
  'iconSourcePng','iconSourceMethod','sourceProjectPath','targetId','canonicalOrigin',
  'domain','deploymentProvider','repo','branch','dns','uiMode','adRequested']);
const metadataAllowed=new Set(['steamAppId','steam','steamName','platform','productType','version']);
const privateField=/(password|secret|token|cookie|private.?key|api.?key|credential|authorization)/i;
const clean=(v)=>typeof v==='string'?v.trim():'';
const asJson=o=>JSON.stringify(o,null,2)+'\n';

export function validateEntryInputs(candidate) {
 if(!candidate||typeof candidate!=='object'||Array.isArray(candidate))throw Error('ENTRY_INPUT_OBJECT_REQUIRED');
 const obj=structuredClone(candidate);
 for(const k of Object.keys(obj))if(!allowed.has(k)||privateField.test(k))throw Error('ENTRY_UNKNOWN_OR_PRIVATE_FIELD');
 if(obj.mode!==undefined&&!['new-site','existing-project'].includes(obj.mode))throw Error('ENTRY_UNSUPPORTED_MODE');
 for(const k of ['gameIdentity','objective','rawKeywordsFile','iconSourcePng','iconSourceMethod',
   'keywordSourceLineageFile',
   'sourceProjectPath','targetId','canonicalOrigin','domain','deploymentProvider','repo','branch','dns','uiMode'])
   if(obj[k]!==undefined&&(typeof obj[k]!=='string'||!obj[k].trim()||obj[k].length>1600))
     throw Error('ENTRY_INVALID_FIELD_'+k);
 if(obj.adRequested!==undefined&&typeof obj.adRequested!=='boolean')throw Error('ENTRY_INVALID_AD_REQUEST');
 if(obj.gameMetadata!==undefined){
   if(!obj.gameMetadata||typeof obj.gameMetadata!=='object'||Array.isArray(obj.gameMetadata))
     throw Error('ENTRY_INVALID_GAME_METADATA');
   for(const [k,v] of Object.entries(obj.gameMetadata)){
     if(!metadataAllowed.has(k)||privateField.test(k)||typeof v!=='string'||!v.trim()||v.length>1024)
       throw Error('ENTRY_UNKNOWN_GAME_METADATA_FIELD');
   }
   if(obj.gameMetadata.steamAppId&&!/^\d{1,12}$/.test(obj.gameMetadata.steamAppId))
     throw Error('ENTRY_INVALID_STEAM_APP_ID');
   if(obj.gameMetadata.steam){
     if(/[%\\]/.test(obj.gameMetadata.steam))throw Error('ENTRY_STEAM_URL_ENCODED_PATH_FORBIDDEN');
     let u;
     try{u=new URL(obj.gameMetadata.steam);}catch{throw Error('ENTRY_INVALID_STEAM_URL');}
     if(u.protocol!=='https:'||u.hostname!=='store.steampowered.com'||
       u.username||u.password||u.port||u.search||u.hash||
       !/^\/app\/\d{1,12}(?:\/[A-Za-z0-9_-]+)?\/?$/.test(u.pathname))
       throw Error('ENTRY_INVALID_STEAM_URL');
     const appId=u.pathname.match(/^\/app\/(\d+)/)[1];
     if(obj.gameMetadata.steamAppId&&obj.gameMetadata.steamAppId!==appId)
       throw Error('ENTRY_STEAM_APP_ID_CONFLICT');
     // The ID is a documented fact of the supplied Steam URL, not a guess.
     obj.gameMetadata.steamAppId=appId;
   }
 }
 if(obj.targetId&&!/^[A-Za-z0-9_-]{1,100}$/.test(obj.targetId))throw Error('ENTRY_INVALID_TARGET_ID');
 for(const k of ['rawKeywordsFile','keywordSourceLineageFile','iconSourcePng','sourceProjectPath'])
   if(obj[k]&&!isAbsolute(obj[k]))throw Error('ENTRY_ABSOLUTE_PATH_REQUIRED_'+k);
 if(obj.rawKeywordsFile&&!obj.rawKeywordsFile.toLowerCase().endsWith('.md'))
   throw Error('ENTRY_RAW_KEYWORDS_MUST_BE_MARKDOWN');
 if(obj.keywordSourceLineageFile&&!obj.keywordSourceLineageFile.toLowerCase().endsWith('.json'))
   throw Error('ENTRY_KEYWORD_LINEAGE_MUST_BE_JSON');
 if(obj.iconSourcePng&&!obj.iconSourcePng.toLowerCase().endsWith('.png'))
   throw Error('ENTRY_ICON_SOURCE_MUST_BE_PNG');
 if(obj.canonicalOrigin){
   let u;
   try{u=new URL(obj.canonicalOrigin);}catch{throw Error('ENTRY_CANONICAL_INVALID');}
   if(u.protocol!=='https:'||u.origin!==obj.canonicalOrigin||u.username||u.password)
     throw Error('ENTRY_CANONICAL_INVALID');
 }
 return obj;
}
function entryPaths(runId){
 if(!idPattern.test(runId??''))throw Error('ENTRY_INVALID_RUN_ID');
 const directory=join(AGENT_ROOT,'runs',runId);
 return {directory,file:join(directory,'ENTRY_INTAKE_V1.json'),
   manifest:join(directory,'manifest.json')};
}
async function fileInformation(path,extension,maxBytes){
 try{
   await safePath(path,[resolve(path)]); // Explicit user-supplied path; reject links on full path.
   const s=await lstat(path);
   if(!s.isFile()||s.nlink!==1||s.size<1||s.size>maxBytes||!path.toLowerCase().endsWith(extension))
     return {verified:false,reason:'FILE_TYPE_OR_SIZE_INVALID'};
   const bytes=await readFile(path);
   return {verified:true,bytes:bytes.length,sha256:sha256(bytes)};
 }catch(e){return {verified:false,reason:e.code==='ENOENT'?'FILE_NOT_FOUND':'FILE_NOT_VERIFIED'};}
}
export async function inspectEntrySkills({configPath=join(AGENT_ROOT,'config/workflow.json')}={}){
 const conf=JSON.parse(await readFile(configPath,'utf8'));
 const root=resolve(join(resolve(configPath,'..'),conf.skillRoot));
 const file=resolve(join(resolve(configPath,'..'),conf.inventory));
 let manifest;
 try{await safePath(file,[AGENT_ROOT]);manifest=JSON.parse(await readFile(file,'utf8'));}
 catch{return {status:'BLOCKED',code:'ENTRY_SKILL_INVENTORY_MISSING',skills:[]};}
 if(manifest.skillRoot!==root||!Array.isArray(manifest.skills)||manifest.skills.length!==conf.skills.length||
    new Set(manifest.skills.map(x=>x.name)).size!==conf.skills.length)
   return {status:'BLOCKED',code:'ENTRY_SKILL_INVENTORY_INVALID',skills:[]};
 const skills=[];
 for(const name of conf.skills){
  const locked=manifest.skills.find(s=>s.name===name);
  const skillRoot=join(root,name);
  let status='OK',code=null;
  try{
   if(!locked||locked.source!==join(skillRoot,'SKILL.md')||!Array.isArray(locked.files))
     throw Error('MANIFEST_ENTRY');
   const files=await treeFiles(skillRoot);
   const ref=new Map(locked.files.map(x=>[x.path,x.sha256]));
   if(files.length!==locked.files.length||ref.size!==files.length)throw Error('FILE_LIST_CHANGED');
   for(const p of files){
     if(!ref.has(p)||!shaPattern.test(ref.get(p))||sha256(await readFile(p))!==ref.get(p))
       throw Error('HASH_MISMATCH');
   }
   if(sha256(await readFile(locked.source))!==locked.sha256)throw Error('SKILL_CHANGED');
  }catch(e){status='BLOCKED';code=e.code==='ENOENT'?'SKILL_FILE_MISSING':'SKILL_VERSION_DRIFT';}
  skills.push({name,status,version:status==='OK'?locked.version:null,
    fileCount:status==='OK'?locked.files.length:null,...(code?{code}:{})});
 }
 return {status:skills.every(s=>s.status==='OK')?'READY':'BLOCKED',
   code:skills.every(s=>s.status==='OK')?null:'ENTRY_SKILL_REVIEW_REQUIRED',
   inventoryPath:file,skills};
}
const laterInputs=[
 {stage:STAGE.HOMEPAGE_RESEARCH,key:'iconSourcePng',need:'可选已有原创 512px 图标 PNG，或后续经过审批的图像生成流程',conditional:true},
 {stage:STAGE.KEYWORD_RESEARCH,key:'rawKeywordsFile',need:'用户手动准备的原始关键词 .md，须有明确绝对路径',conditional:false},
 {stage:STAGE.TEMPLATE_SELECTION,key:'templateSelection',need:'复用现有模板选择 Skill；正式执行前核对允许的模板来源与隔离目标，不在入口复制模板',conditional:true},
 {stage:STAGE.CONTENT_INTEGRATION,key:'canonicalOrigin',need:'站点确定的 HTTPS canonical URL；未定域名时后续暂停',conditional:true},
 {stage:STAGE.UI_UX_AUDIT,key:'uiMode',need:'audit-only（默认）或需单独授权的 optimize',conditional:true},
 {stage:STAGE.PRELAUNCH_ACCEPTANCE,key:'domain',need:'拟上线域名或明确只做无域名验收的范围',conditional:true},
 {stage:STAGE.DEPLOYMENT_PLAN,key:'repo',need:'仓库与分支、部署平台、DNS/预算及逐项审批（仅计划，不发布）',conditional:true},
 {stage:STAGE.ADVERTISING_PLAN,key:'adRequested',need:'可选广告代码、广告位方案与发布审批',conditional:true}
];
export async function inspectEntryCard(inputs,{runId=null}={}){
 const validated=validateEntryInputs(inputs);
 const inventory=await inspectEntrySkills();
 const missing=[];
 if(!validated.mode)missing.push('mode');
 if(!clean(validated.gameIdentity))missing.push('gameIdentity');
 if(!clean(validated.objective))missing.push('objective');
 if(validated.mode==='existing-project')missing.push('existingProjectVersionedCard');
 if(validated.mode==='new-site'&&!(validated.gameMetadata?.steamAppId&&validated.gameMetadata?.steam))
   missing.push('gameMetadata.steam');
 let keywords=null;
 if(validated.rawKeywordsFile){
  keywords=await fileInformation(validated.rawKeywordsFile,'.md',8*1024*1024);
  if(!keywords.verified)missing.push('rawKeywordsFile:invalid');
 }
 let icon=null;
 let lineage=null;
 if(validated.keywordSourceLineageFile){
   lineage=await fileInformation(validated.keywordSourceLineageFile,'.json',8*1024*1024);
   if(lineage.verified){
     try{
       const data=JSON.parse(await readFile(validated.keywordSourceLineageFile,'utf8'));
       if(data.kind!=='KEYWORD_SOURCE_INSPECTION_V1'||!shaPattern.test(data.original?.sha256??'')||
          data.derived?.sha256!==keywords?.sha256||!Array.isArray(data.retained)||!data.retained.length||
          !Array.isArray(data.pending)||data.scope!=='USER_APPROVED_COMPLETE_READABLE_TERMS_ONLY')
         throw Error('LINEAGE_INVALID');
     }catch{lineage={verified:false,reason:'LINEAGE_BINDING_INVALID'};}
   }
   if(!lineage.verified)missing.push('keywordSourceLineageFile:invalid');
 }
 if(validated.iconSourcePng){
  icon=await fileInformation(validated.iconSourcePng,'.png',8*1024*1024);
  if(!icon.verified)missing.push('iconSourcePng:invalid');
 }
 if(runId!==null&&!idPattern.test(runId))throw Error('ENTRY_INVALID_RUN_ID');
 const id=runId;
 const projectPath=id&&validated.mode==='new-site'
   ?join(AGENT_ROOT,'workspaces',id,'site'):null;
 const checklist=[
  {stage:'ENTRY',key:'mode',timing:'now',required:true,provided:!!validated.mode,description:'新建网站还是已有项目'},
  {stage:'ENTRY',key:'gameIdentity',timing:'now',required:true,provided:!!clean(validated.gameIdentity),description:'准确游戏/软件名称与版本'},
  {stage:'ENTRY',key:'objective',timing:'now',required:true,provided:!!clean(validated.objective),description:'本次建站目标和范围'},
  {stage:STAGE.HOMEPAGE_RESEARCH,key:'gameMetadata.steam',timing:'now',required:validated.mode==='new-site',
   provided:!!(validated.gameMetadata?.steam&&validated.gameMetadata?.steamAppId),
   description:'官方 Steam 链接或已明确核实的 App ID 与链接，禁止猜测'},
  ...(validated.mode==='existing-project'?[{stage:'ENTRY',key:'existingProjectVersionedCard',timing:'now',
    required:true,provided:false,description:'已有项目必须经过现有版本化任务卡与目标白名单预检'}]:[]),
  ...laterInputs.map(({stage,key,need,conditional})=>({
    stage,key,timing:'later',required:!conditional,conditional,provided:validated[key]!==undefined,
    description:need
  }))
 ];
 let status=inventory.status!=='READY'?'BLOCKED':
   missing.length?'WAITING_FOR_USER':'READY_FOR_APPROVAL';
 return {schemaVersion:1,status,runId:id,mode:validated.mode??null,
   gameIdentity:validated.gameIdentity??null,
   projectPath,executorStarted:false,siteWrites:false,releaseAuthorized:false,
   generatedKeywords:false,inventory,missingInputs:missing,checklist,
   verifiedFiles:{...(keywords?{rawKeywordsFile:keywords}:{}),...(lineage?{keywordSourceLineageFile:lineage}:{}),...(icon?{iconSourcePng:icon}:{})},
   nextAction:status==='BLOCKED'?'Review local Skill versions and compatibility before continuing':
     status==='WAITING_FOR_USER'?'Ask the user for the current missing items; do not start any worker':
     'Present the proposed action and obtain explicit run authorization before executing existing CLI run'};
}
async function loadDraft(runId){
 const {file,directory,manifest}=entryPaths(runId);
 await safePath(file,[directory]);
 try{await lstat(manifest);throw Error('ENTRY_PIPELINE_RUN_ALREADY_EXISTS');}
 catch(e){if(e.code!=='ENOENT')throw e;}
 const raw=await readFile(file,'utf8');
 const data=JSON.parse(raw);
 if(data.schemaVersion!==ENTRY_VERSION||data.runId!==runId||
   !data.inputs||typeof data.inputs!=='object'||!Number.isSafeInteger(data.revision)||data.revision<1||
   data.kind!=='ENTRY_ONLY_NO_WORKER'||data.approvedToRun!==false)
   throw Error('ENTRY_DRAFT_INVALID');
 return {data,file,directory,manifest,raw};
}
export async function previewEntry(inputs,{runId=null}={}){
 return inspectEntryCard(inputs,{runId});
}
export async function createEntry(inputs,runId){
 const {directory,file,manifest}=entryPaths(runId);
 const validated=validateEntryInputs(inputs);
 const inspection=await inspectEntryCard(validated,{runId});
 await safePath(file,[AGENT_ROOT]);
 try{await stat(manifest);throw Error('ENTRY_PIPELINE_RUN_ALREADY_EXISTS');}
 catch(e){if(e.code!=='ENOENT')throw e;}
 // Never overwrite even another entry draft with the same run id.
 // Exclusive run-directory creation: never attach an intake draft to other artifacts.
 await mkdir(directory,{mode:0o700});
 const draft={schemaVersion:ENTRY_VERSION,runId,revision:1,inputs:validated,
   createdAt:new Date().toISOString(),lastUpdatedAt:new Date().toISOString(),
   approvedToRun:false,kind:'ENTRY_ONLY_NO_WORKER'};
 await writeFile(file,asJson(draft),{flag:'wx',mode:0o600});
 return {...inspection,revision:1,createdAt:draft.createdAt,lastUpdatedAt:draft.lastUpdatedAt};
}
export async function updateEntry(patch,runId,expectedRevision){
 const {directory,file,manifest}=entryPaths(runId);
 await safePath(directory,[AGENT_ROOT]);
 const lock=join(directory,'.ENTRY_UPDATE_LOCK');
 await safePath(lock,[directory]);
 // One writer at a time: no lost updates when two Codex sessions submit
 // patches against the same revision concurrently.
 try{await mkdir(lock,{mode:0o700});}
 catch(e){if(e.code==='EEXIST')throw Error('ENTRY_UPDATE_IN_PROGRESS');throw e;}
 try{
  const {data}=await loadDraft(runId);
  if(!Number.isSafeInteger(expectedRevision)||expectedRevision>=Number.MAX_SAFE_INTEGER||data.revision!==expectedRevision)
    throw Error('ENTRY_STALE_REVISION');
  try{await stat(manifest);throw Error('ENTRY_PIPELINE_RUN_ALREADY_EXISTS');}
  catch(e){if(e.code!=='ENOENT')throw e;}
  const changes=validateEntryInputs(patch);
  const inputs=validateEntryInputs({...data.inputs,...changes,
    ...(changes.gameMetadata?{gameMetadata:{...(data.inputs.gameMetadata??{}),...changes.gameMetadata}}:{})});
  const inspection=await inspectEntryCard(inputs,{runId});
  const next={...data,inputs,revision:data.revision+1,lastUpdatedAt:new Date().toISOString(),
    approvedToRun:false};
  const temp=join(directory,'ENTRY_INTAKE_'+randomUUID()+'.tmp');
  await safePath(temp,[directory]);
  await writeFile(temp,asJson(next),{flag:'wx',mode:0o600});
  try{await rename(temp,file);}catch(e){await unlink(temp).catch(()=>{});throw e;}
  return {...inspection,revision:next.revision};
 }finally{await rmdir(lock).catch(()=>{});}
}
export async function statusEntry(runId){
 const {data}=await loadDraft(runId);
 return {...await inspectEntryCard(data.inputs,{runId}),revision:data.revision,
   createdAt:data.createdAt,lastUpdatedAt:data.lastUpdatedAt};
}

// A review snapshot is deliberately not an execution ticket. No writes or executor imports.
export async function previewEntryHandoff(request){
 if(!request||typeof request!=='object'||Array.isArray(request)||
   Object.keys(request).sort().join(',')!=='executionRunId,expectedRevision,runId')
   throw Error('ENTRY_HANDOFF_INVALID_REQUEST');
 const {runId,expectedRevision,executionRunId}=request;
 const {data,file,raw}=await loadDraft(runId);
 if(!Number.isSafeInteger(expectedRevision)||data.revision!==expectedRevision)
   throw Error('ENTRY_STALE_REVISION');
 const destination=entryPaths(executionRunId).directory;
 if(executionRunId===runId)throw Error('ENTRY_DRAFT_EXECUTION_FORBIDDEN');
 const workspaceRoot=join(AGENT_ROOT,'workspaces',executionRunId);
 for(const path of [destination,workspaceRoot]){
   await safePath(path,[AGENT_ROOT]);
   try{await lstat(path);throw Error('ENTRY_EXECUTION_DESTINATION_EXISTS');}
   catch(e){if(e.code!=='ENOENT')throw e;}
 }
 const inspection=await inspectEntryCard(data.inputs,{runId});
 if(inspection.status!=='READY_FOR_APPROVAL')throw Error('ENTRY_HANDOFF_NOT_READY');
 const inventorySha256=sha256(await readFile(inspection.inventory.inventoryPath));
 // Check again against the captured inventory so a changed lock cannot be silently bound.
 const checked=await inspectEntrySkills();
 if(checked.status!=='READY'||inventorySha256!==sha256(await readFile(inspection.inventory.inventoryPath))||
   !isDeepStrictEqual(checked,inspection.inventory))throw Error('ENTRY_HANDOFF_CHANGED');
 if(raw!==await readFile(file,'utf8'))throw Error('ENTRY_HANDOFF_CHANGED');
 const snapshot={schemaVersion:1,kind:'ENTRY_HANDOFF_PREVIEW_ONLY',runId,revision:data.revision,
   draftSha256:sha256(raw),inputs:data.inputs,inputsSha256:sha256(asJson(data.inputs)),
   inventorySha256,skills:inspection.inventory.skills,materials:inspection.verifiedFiles,
   executionRunId,workspace:join(workspaceRoot,'site'),
   stages:[...STAGES,...(data.inputs.adRequested?[STAGE.ADVERTISING_PLAN]:[])],
   approvedToRun:false};
 return {status:'PREVIEW_ONLY',snapshot,approvedToRun:false,executorStarted:false,
   siteWrites:false,releaseAuthorized:false,checklist:inspection.checklist,
   missingLaterInputs:inspection.checklist.filter(x=>x.timing==='later'&&!x.provided).map(x=>x.key),
   effectsRequiringApproval:['Copy template and write isolated site','Start existing Codex workers',
     'Browser, network and image tools; run logs'],
   separateApprovals:['Production push','Deployment','DNS','Indexing','Analytics','Ads','Payments'],
   approvalRequirements:['Trusted human authorization channel','Approver and approval time',
     'Bind this snapshot and revalidate at execution boundary','Exclusive fresh execution directory'],
   executionBlockedReason:'TRUSTED_EXECUTION_APPROVAL_NOT_IMPLEMENTED'};
}
export async function validateEntryHandoff(snapshot){
 if(!snapshot||typeof snapshot!=='object'||Array.isArray(snapshot)||
   snapshot.kind!=='ENTRY_HANDOFF_PREVIEW_ONLY'||snapshot.approvedToRun!==false)
   throw Error('ENTRY_HANDOFF_INVALID_SNAPSHOT');
 const current=await previewEntryHandoff({runId:snapshot.runId,expectedRevision:snapshot.revision,
   executionRunId:snapshot.executionRunId});
 if(!isDeepStrictEqual(snapshot,current.snapshot))throw Error('ENTRY_HANDOFF_CHANGED');
 return {...current,status:'CONSISTENT_NOT_AUTHORIZED'};
}
