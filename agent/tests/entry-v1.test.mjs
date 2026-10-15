import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile,rm,stat,symlink} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {join,relative} from 'node:path';
import {spawnSync} from 'node:child_process';
import {AGENT_ROOT} from '../src/skill-lock.mjs';
import {ALL_STAGES} from '../src/stages.mjs';
import {previewEntry,createEntry,updateEntry,statusEntry,inspectEntrySkills,
  validateEntryInputs} from '../src/entry-v1.mjs';

const ID=()=> 'entry-v1-test-'+randomUUID();
const root=AGENT_ROOT;
const steam='https://store.steampowered.com/app/431960/';
const sample={mode:'new-site',gameIdentity:'Wallpaper Engine',
  objective:'Independent desktop wallpaper help site',
  gameMetadata:{steam}};
const runDirectory=id=>join(root,'runs',id);
const cli=(...args)=>spawnSync('node',[join(root,'src/cli.mjs'),...args],{
  cwd:root,encoding:'utf8',timeout:18000,maxBuffer:1e6});

test('invalid creation leaves no directory and a successful draft reports its revision',async t=>{
 const id=ID(),folder=runDirectory(id);
 t.after(()=>rm(folder,{force:true,recursive:true}));
 await assert.rejects(createEntry({mode:'invalid'},id),/ENTRY_UNSUPPORTED_MODE/);
 await assert.rejects(stat(folder),{code:'ENOENT'});
 assert.equal((await createEntry(sample,id)).revision,1);
});
test('checklist covers every stage and treats an explicit false advertising choice as provided',async()=>{
 const result=await previewEntry({...sample,adRequested:false});
 for(const stage of ALL_STAGES)assert.ok(result.checklist.some(x=>x.stage===stage),stage);
 assert.equal(result.checklist.find(x=>x.key==='adRequested').provided,true);
});
test('tampered approval or pipeline contamination prevents reading an entry draft',async t=>{
 const id=ID(),folder=runDirectory(id);
 t.after(()=>rm(folder,{force:true,recursive:true}));
 await createEntry(sample,id);
 const file=join(folder,'ENTRY_INTAKE_V1.json');
 const draft=JSON.parse(await readFile(file));
 await writeFile(file,JSON.stringify({...draft,approvedToRun:true}));
 await assert.rejects(statusEntry(id),/ENTRY_DRAFT_INVALID/);
 await writeFile(file,JSON.stringify(draft));
 await writeFile(join(folder,'manifest.json'),'{}');
 await assert.rejects(statusEntry(id),/ENTRY_PIPELINE_RUN_ALREADY_EXISTS/);
});
test('malformed CLI JSON returns a stable error without echoing submitted text',()=>{
 const result=spawnSync('node',[join(root,'src/cli.mjs'),'entry-preview','-'],{
  cwd:root,input:'{"privateMarker":"DO_NOT_ECHO" bad}',encoding:'utf8',timeout:12000});
 assert.equal(result.status,2);
 assert.equal(JSON.parse(result.stdout).code,'ENTRY_INVALID_JSON');
 assert.equal(result.stderr,'');
 assert.ok(!result.stdout.includes('DO_NOT_ECHO'));
});
test('concurrent updates accept only one revision and reject linked run paths',async t=>{
 const id=ID(),folder=runDirectory(id),linkId=ID();
 t.after(()=>rm(folder,{force:true,recursive:true}));
 t.after(()=>rm(runDirectory(linkId),{force:true}));
 await createEntry(sample,id);
 const results=await Promise.allSettled([
  updateEntry({objective:'First revision'},id,1),
  updateEntry({objective:'Second revision'},id,1)
 ]);
 assert.equal(results.filter(x=>x.status==='fulfilled').length,1);
 assert.match(results.find(x=>x.status==='rejected').reason.message,/ENTRY_UPDATE_IN_PROGRESS|ENTRY_STALE_REVISION/);
 assert.equal((await statusEntry(id)).revision,2);
 await symlink(folder,runDirectory(linkId));
 await assert.rejects(createEntry(sample,linkId),/Linked/);
 await assert.rejects(statusEntry(linkId),/Linked/);
 await assert.rejects(updateEntry({},linkId,2),/Linked/);
 await assert.rejects(createEntry(sample,'../escape'),/ENTRY_INVALID_RUN_ID/);
});
test('CLI bounds file bytes and rejects extra arguments without changing a draft',async t=>{
 const id=ID(),folder=runDirectory(id);
 await mkdir(folder);
 t.after(()=>rm(folder,{force:true,recursive:true}));
 const file=join(folder,'oversized.json');
 await writeFile(file,JSON.stringify({objective:'中'.repeat(24000)}));
 const oversized=cli('entry-preview',file);
 assert.equal(oversized.status,2);
 assert.equal(JSON.parse(oversized.stdout).code,'ENTRY_INPUT_TOO_LARGE');
 const extra=cli('entry-status',id,'unexpected');
 assert.equal(extra.status,2);
 assert.equal(JSON.parse(extra.stdout).code,'ENTRY_INVALID_ARGUMENTS');
});

test('read-only preview checks eight existing locked skills and does not create a pipeline run',async()=>{
 const result=await previewEntry(sample);
 assert.equal(result.status,'READY_FOR_APPROVAL');
 assert.equal(result.inventory.status,'READY');
 assert.equal(result.inventory.skills.length,8);
 assert.equal(result.executorStarted,false);
 assert.equal(result.siteWrites,false);
 assert.equal(result.releaseAuthorized,false);
 assert.equal(result.generatedKeywords,false);
 assert.ok(result.checklist.some(x=>x.key==='rawKeywordsFile'&&x.timing==='later'&&x.required===true));
 assert.ok(result.checklist.some(x=>x.key==='iconSourcePng'&&x.conditional===true));
 assert.deepEqual(result.missingInputs,[]);
 assert.equal(result.projectPath,null);
});
test('entry drafts hold missing identity, store a run-scoped checkpoint, then explicitly update to READY without executing workers',async t=>{
 const id=ID(),folder=runDirectory(id);
 t.after(()=>rm(folder,{force:true,recursive:true}));
 const created=await createEntry({mode:'new-site'},id);
 assert.equal(created.status,'WAITING_FOR_USER');
 assert.deepEqual(created.missingInputs,['gameIdentity','objective','gameMetadata.steam']);
 assert.equal(created.projectPath,join(root,'workspaces',id,'site'));
 assert.equal((await statusEntry(id)).revision,1);
 const updated=await updateEntry(sample,id,1);
 assert.equal(updated.status,'READY_FOR_APPROVAL');
 assert.equal(updated.revision,2);
 const entry=JSON.parse(await readFile(join(folder,'ENTRY_INTAKE_V1.json')));
 assert.equal(entry.approvedToRun,false);
 assert.equal(entry.kind,'ENTRY_ONLY_NO_WORKER');
 assert.equal(entry.inputs.gameMetadata.steamAppId,'431960');
 await assert.rejects(stat(join(folder,'manifest.json')),{code:'ENOENT'});
 await assert.rejects(stat(join(root,'workspaces',id,'site')),{code:'ENOENT'});
 assert.equal((await statusEntry(id)).status,'READY_FOR_APPROVAL');
 await assert.rejects(updateEntry({objective:'Another objective'},id,1),/ENTRY_STALE_REVISION/);
 await assert.rejects(createEntry(sample,id),{code:'EEXIST'});
});
test('input path is read-only checked and must already exist as genuine user material',async t=>{
 const id=ID(),folder=runDirectory(id);
 t.after(()=>rm(folder,{force:true,recursive:true}));
 await createEntry(sample,id);
 const absent=join(folder,'input','keyword.md');
 let state=await updateEntry({rawKeywordsFile:absent},id,1);
 assert.equal(state.status,'WAITING_FOR_USER');
 assert.ok(state.missingInputs.includes('rawKeywordsFile:invalid'));
 await mkdir(join(folder,'input'));
 await writeFile(absent,'# Search keyword materials provided by user\nwallpaper engine performance\n');
 state=await statusEntry(id);
 assert.equal(state.status,'READY_FOR_APPROVAL');
 assert.equal(state.verifiedFiles.rawKeywordsFile.verified,true);
 assert.match(state.verifiedFiles.rawKeywordsFile.sha256,/^[a-f0-9]{64}$/);
});
test('invalid Steam app mismatch, credentials, escape paths and unapproved target ID fail closed',()=>{
 assert.throws(()=>validateEntryInputs({...sample,gameMetadata:{
  steam,steamAppId:'570'}}),/ENTRY_STEAM_APP_ID_CONFLICT/);
 assert.throws(()=>validateEntryInputs({...sample,gameMetadata:{
  steam:'https://store.steampowered.com/account/'}}),/ENTRY_INVALID_STEAM_URL/);
 assert.throws(()=>validateEntryInputs({...sample,gameMetadata:{
  steam:'https://store.steampowered.com/app/431960/%2e%2e/account/'}}),/ENTRY_STEAM_URL_ENCODED_PATH_FORBIDDEN/);
 assert.throws(()=>validateEntryInputs({...sample,password:'do-not-store'}),/ENTRY_UNKNOWN_OR_PRIVATE_FIELD/);
 assert.throws(()=>validateEntryInputs({...sample,rawKeywordsFile:'relative/keywords.md'}),/ENTRY_ABSOLUTE_PATH_REQUIRED/);
 assert.throws(()=>validateEntryInputs({...sample,targetId:'../../../outside'}),/ENTRY_INVALID_TARGET_ID/);
 assert.throws(()=>validateEntryInputs({...sample,canonicalOrigin:'http://example.com'}),/ENTRY_CANONICAL_INVALID/);
});
test('existing-project input is explicitly deferred to legacy versioned card, never switched to new-site on its own',async()=>{
 const state=await previewEntry({mode:'existing-project',gameIdentity:'Bodycam',objective:'Audit existing site'});
 assert.equal(state.status,'WAITING_FOR_USER');
 assert.ok(state.missingInputs.includes('existingProjectVersionedCard'));
 assert.equal(state.projectPath,null);
});
test('Skill drift and missing manifest are detected read-only without regenerating or altering original skills',async t=>{
 const id=ID(),folder=runDirectory(id);
 await mkdir(folder,{mode:0o700});
 t.after(()=>rm(folder,{recursive:true,force:true}));
 const config=JSON.parse(await readFile(join(root,'config/workflow.json'),'utf8'));
 const orig=JSON.parse(await readFile(join(root,'config/skill-manifest.json'),'utf8'));
 config.skillRoot=relative(folder,orig.skillRoot);
 config.inventory='local-fake-inventory.json';
 await writeFile(join(folder,'config.json'),JSON.stringify(config));
 const fake=join(folder,config.inventory);
 await writeFile(fake,JSON.stringify(orig));
 let result=await inspectEntrySkills({configPath:join(folder,'config.json')});
 assert.equal(result.status,'READY');
 orig.skills[0].files[0].sha256='0'.repeat(64);
 await writeFile(fake,JSON.stringify(orig));
 result=await inspectEntrySkills({configPath:join(folder,'config.json')});
 assert.equal(result.status,'BLOCKED');
 assert.equal(result.skills[0].status,'BLOCKED');
 assert.equal(result.skills[0].code,'SKILL_VERSION_DRIFT');
 assert.equal(result.skills.slice(1).every(s=>s.status==='OK'),true);
});
test('CLI preview is read-only and entry-create/status/update provide reproducible safe user-facing JSON',async t=>{
 const id=ID(),folder=runDirectory(id);
 t.after(()=>rm(folder,{recursive:true,force:true}));
 const input=join(root,'runs','entry-v1-input-'+randomUUID()+'.json');
 const patch=join(root,'runs','entry-v1-patch-'+randomUUID()+'.json');
 t.after(()=>rm(input,{force:true}));
 t.after(()=>rm(patch,{force:true}));
 await writeFile(input,JSON.stringify({mode:'new-site'}),{flag:'wx'});
 await writeFile(patch,JSON.stringify(sample),{flag:'wx'});
 let r=cli('entry-preview',input,id);
 assert.equal(r.status,2,r.stderr);
 assert.equal(JSON.parse(r.stdout).status,'WAITING_FOR_USER');
 await assert.rejects(stat(folder),{code:'ENOENT'});
 r=cli('entry-create',input,id);
 assert.equal(r.status,2,r.stderr);
 assert.equal(JSON.parse(r.stdout).status,'WAITING_FOR_USER');
 r=cli('entry-update',patch,id,'1');
 assert.equal(r.status,0,r.stderr);
 assert.equal(JSON.parse(r.stdout).status,'READY_FOR_APPROVAL');
 r=cli('entry-status',id);
 assert.equal(r.status,0,r.stderr);
 assert.equal(JSON.parse(r.stdout).revision,2);
 r=cli('entry-update',patch,id,'1');
 assert.notEqual(r.status,0,'stale update cannot succeed');
 await assert.rejects(stat(join(folder,'manifest.json')),{code:'ENOENT'});
});

test('Codex natural-language adapter can pipe bounded confirmed facts without a JSON file',()=>{
 const input=JSON.stringify(sample);
 const preview=spawnSync('node',[join(root,'src/cli.mjs'),'entry-preview','-'],{
  cwd:root,input,encoding:'utf8',timeout:12000,maxBuffer:1e6});
 assert.equal(preview.status,0,preview.stderr);
 const body=JSON.parse(preview.stdout);
 assert.equal(body.status,'READY_FOR_APPROVAL');
 assert.equal(body.inventory.skills.length,8);
 assert.equal(body.executorStarted,false);
 const oversized=spawnSync('node',[join(root,'src/cli.mjs'),'entry-preview','-'],{
  cwd:root,input:'x'.repeat(70000),encoding:'utf8',timeout:12000});
 assert.notEqual(oversized.status,0);
});
test('entry creation never collides with an existing pipeline manifest or pre-existing run files',async t=>{
 const id=ID(),dir=runDirectory(id);
 await mkdir(dir,{mode:0o700});
 t.after(()=>rm(dir,{recursive:true,force:true}));
 const m=join(dir,'manifest.json');
 await writeFile(m,'{"existingProject":"MUST_NOT_CHANGE"}',{flag:'wx'});
 await assert.rejects(createEntry(sample,id),/ENTRY_PIPELINE_RUN_ALREADY_EXISTS/);
 assert.equal(await readFile(m,'utf8'),'{"existingProject":"MUST_NOT_CHANGE"}');
 await assert.rejects(stat(join(dir,'ENTRY_INTAKE_V1.json')),{code:'ENOENT'});
});
