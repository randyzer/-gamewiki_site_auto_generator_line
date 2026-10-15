import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile,rm,access,symlink} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {AGENT_ROOT} from '../src/skill-lock.mjs';
import {createEntry,updateEntry} from '../src/entry-v1.mjs';
import {createOrchestrator} from '../src/orchestrator.mjs';
const cli=(command,value)=>{
 const r=spawnSync(process.execPath,['src/cli.mjs',command,'-'],{cwd:AGENT_ROOT,input:JSON.stringify(value),encoding:'utf8'});
 return {exit:r.status,...JSON.parse(r.stdout)};
};
async function fixture(t){
 const runId='TEST-handoff-'+randomUUID(), executionRunId=runId+'-exec';
 const directory=join(AGENT_ROOT,'runs',runId), materials=directory+'-materials';
 await mkdir(materials);
 t.after(async()=>{for(const p of [directory,materials,join(AGENT_ROOT,'runs',executionRunId)])await rm(p,{recursive:true,force:true});});
 const rawKeywordsFile=join(materials,'keywords.md');await writeFile(rawKeywordsFile,'TEST supplied keywords');
 await createEntry({mode:'new-site',gameIdentity:'TEST Hood Warfare 2',objective:'TEST only',gameMetadata:{steam:'https://store.steampowered.com/app/5155360/'},rawKeywordsFile},runId);
 return {runId,executionRunId,expectedRevision:1,directory,rawKeywordsFile};
}
const request=f=>({runId:f.runId,expectedRevision:f.expectedRevision,executionRunId:f.executionRunId});
test('handoff preview and validation remain read-only and never grant approval',async t=>{
 const f=await fixture(t),before=await readFile(join(f.directory,'ENTRY_INTAKE_V1.json'));
 const p=cli('entry-handoff-preview',request(f));assert.equal(p.exit,0);assert.equal(p.status,'PREVIEW_ONLY');
 assert.equal(p.approvedToRun,false);assert.equal(p.executorStarted,false);assert.equal(p.snapshot.skills.length,8);
 assert.equal(p.snapshot.workspace,join(AGENT_ROOT,'workspaces',f.executionRunId,'site'));
 const v=cli('entry-handoff-validate',p.snapshot);assert.equal(v.exit,0);assert.equal(v.status,'CONSISTENT_NOT_AUTHORIZED');
 assert.equal(v.approvedToRun,false);
 assert.deepEqual(await readFile(join(f.directory,'ENTRY_INTAKE_V1.json')),before);
 for(const path of [join(f.directory,'manifest.json'),join(AGENT_ROOT,'runs',f.executionRunId),join(AGENT_ROOT,'workspaces',f.executionRunId)])await assert.rejects(access(path),{code:'ENOENT'});
});
test('revision and material byte changes invalidate review snapshots',async t=>{
 const f=await fixture(t),p=cli('entry-handoff-preview',request(f));assert.equal(p.exit,0);
 await writeFile(f.rawKeywordsFile,'changed TEST bytes');assert.equal(cli('entry-handoff-validate',p.snapshot).code,'ENTRY_HANDOFF_CHANGED');
 await updateEntry({objective:'revised TEST'},f.runId,1);
 assert.equal(cli('entry-handoff-validate',p.snapshot).code,'ENTRY_STALE_REVISION');
});
test('forged approval, scope, workspace and inventory hash are rejected',async t=>{
 const f=await fixture(t),p=cli('entry-handoff-preview',request(f));assert.equal(p.exit,0);
 for(const patch of [{approvedToRun:true},{workspace:'/tmp/site'},{stages:[]},{inventorySha256:'0'.repeat(64)}]){
  const v=cli('entry-handoff-validate',{...p.snapshot,...patch});assert.equal(v.exit,2);assert.equal(v.approvedToRun,false);
 }
});
test('handoff rejects unsafe, reused, occupied and linked destinations',async t=>{
 const f=await fixture(t);
 for(const executionRunId of ['../escape',f.runId])assert.equal(cli('entry-handoff-preview',{...request(f),executionRunId}).exit,2);
 const destination=join(AGENT_ROOT,'runs',f.executionRunId);
 await mkdir(destination);assert.equal(cli('entry-handoff-preview',request(f)).code,'ENTRY_EXECUTION_DESTINATION_EXISTS');
 await rm(destination,{recursive:true});await symlink(f.directory,destination);
 assert.equal(cli('entry-handoff-preview',request(f)).exit,2);
});
test('missing current inputs and pipeline-contaminated draft cannot be handed off',async t=>{
 const f=await fixture(t);await rm(f.rawKeywordsFile);
 assert.equal(cli('entry-handoff-preview',request(f)).exit,2);
 await writeFile(join(f.directory,'manifest.json'),'{}');
 assert.equal(cli('entry-handoff-preview',request(f)).code,'ENTRY_PIPELINE_RUN_ALREADY_EXISTS');
});
test('existing orchestrator rejects entry draft run before calling executor',async t=>{
 const f=await fixture(t);let calls=0;
 const execute=createOrchestrator({configuration:{workspace:AGENT_ROOT},executor:async()=>{calls++;throw Error('must not execute');}});
 for(const retry of [false,true])await assert.rejects(execute({id:f.runId,inputs:JSON.stringify({gameIdentity:'TEST'}),retry}),/ENTRY_DRAFT_EXECUTION_FORBIDDEN/);
 assert.equal(calls,0);await assert.rejects(access(join(f.directory,'manifest.json')),{code:'ENOENT'});
});
test('same-revision draft tampering and changed Skill version invalidate snapshots',async t=>{
 const f=await fixture(t),p=cli('entry-handoff-preview',request(f));assert.equal(p.exit,0);
 const changed=structuredClone(p.snapshot);changed.skills[0].version='forged';
 assert.equal(cli('entry-handoff-validate',changed).code,'ENTRY_HANDOFF_CHANGED');
 const path=join(f.directory,'ENTRY_INTAKE_V1.json'),draft=JSON.parse(await readFile(path));
 draft.inputs.objective='unreviewed same revision';await writeFile(path,JSON.stringify(draft));
 assert.equal(cli('entry-handoff-validate',p.snapshot).code,'ENTRY_HANDOFF_CHANGED');
});
test('existing orchestrator rejects draft envelopes even under a fresh run ID',async t=>{
 const f=await fixture(t);let calls=0;
 const execute=createOrchestrator({configuration:{workspace:AGENT_ROOT},executor:async()=>{calls++;}});
 for(const kind of ['ENTRY_ONLY_NO_WORKER','ENTRY_HANDOFF_PREVIEW_ONLY'])
   await assert.rejects(execute({id:f.executionRunId,inputs:JSON.stringify({kind})}),/ENTRY_DRAFT_EXECUTION_FORBIDDEN/);
 assert.equal(calls,0);await assert.rejects(access(join(AGENT_ROOT,'runs',f.executionRunId)),{code:'ENOENT'});
});
