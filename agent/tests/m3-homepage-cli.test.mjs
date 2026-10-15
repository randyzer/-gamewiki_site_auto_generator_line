import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile,rm,readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {AGENT_ROOT} from '../src/skill-lock.mjs';

const cli=join(AGENT_ROOT,'scripts','m3-homepage-handoff.mjs');
const invoke=(...args)=>spawnSync('node',[cli,...args],{
  cwd:AGENT_ROOT,encoding:'utf8',timeout:12000,maxBuffer:30000});
async function run(t,status='BLOCKED'){
 const id='m3-cli-test-'+randomUUID(),dir=join(AGENT_ROOT,'runs',id);
 await mkdir(dir,{recursive:true});
 t.after(()=>rm(dir,{recursive:true,force:true}));
 const manifest={schemaVersion:1,runId:id,workspace:AGENT_ROOT,
   inputs:{gameIdentity:'Fixture Game'},
   stages:[{skill:'game-homepage-icon-research',status}]};
 await writeFile(join(dir,'manifest.json'),JSON.stringify(manifest));
 return {id,dir};
}
test('M3 CLI begins a handoff only under an existing eligible run and reports paths',async t=>{
 const f=await run(t);
 let result=invoke('begin',f.id);
 assert.equal(result.status,2,result.stderr);
 let body=JSON.parse(result.stdout);
 assert.equal(body.status,'AWAITING_MANUAL_FILES');
 assert.ok(body.outputPath.includes('/runs/'+f.id+'/'));
 assert.equal(body.gameIdentity,'Fixture Game');
 result=invoke('inspect',f.id);
 assert.equal(result.status,2,result.stderr);
 body=JSON.parse(result.stdout);
 assert.equal(body.status,'WAITING_FOR_USER');
 assert.equal(body.code,'M3_AWAITING_MANUAL_INPUT_AND_ZIP');
});
test('M3 CLI rejects already-PASSED runs, nonexistent runs and arbitrary approval',async t=>{
 const f=await run(t,'PASSED');
 assert.equal(invoke('begin',f.id).status,2);
 assert.equal(invoke('begin','nonexistent-manual-run-'+randomUUID()).status,2);
 const f2=await run(t);
 assert.equal(invoke('begin',f2.id).status,2);
 assert.equal(invoke('approve',f2.id,'f'.repeat(64),'f'.repeat(64)).status,2);
 assert.equal(invoke('approve',f2.id,'invalid','invalid').status,2);
 assert.equal(invoke('inspect',f2.id).status,2);
});
