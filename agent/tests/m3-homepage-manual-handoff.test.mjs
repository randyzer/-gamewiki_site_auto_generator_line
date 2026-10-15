import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile,rm,copyFile} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {AGENT_ROOT} from '../src/skill-lock.mjs';
import {sha256} from '../src/files.mjs';
import {beginHomepageManualHandoff,inspectHomepageManualHandoff,
  approveHomepageManualHandoff} from '../src/m3-homepage-manual-handoff.mjs';

async function example(t){
 const runId='m3-homepage-test-'+randomUUID(),gameIdentity='Offline Fixture Game';
 const runDirectory=join(AGENT_ROOT,'runs',runId);
 const outputDirectory=join(runDirectory,'artifacts','0','1');
 await mkdir(outputDirectory,{recursive:true});
 t.after(()=>rm(runDirectory,{recursive:true,force:true}));
 const opts={runDirectory,runId,gameIdentity};
 const prepared=await beginHomepageManualHandoff(opts);
 const ctx={runId,outputDirectory,inputs:{
   gameIdentity,projectPath:join(AGENT_ROOT,'workspaces',runId,'site')},
   requiredArtifacts:['HOMEPAGE_RESEARCH.md','ICON.zip'],
   skillLock:{source:join(AGENT_ROOT,'config','workflow.json')},
   permissions:{siteWrites:false,uiChanges:false,productionDeployment:false}};
 return {opts,ctx,prepared,runDirectory,outputDirectory};
}
async function placeAndApprove(f){
 const zip=join(f.runDirectory,'synthetic-test.zip');
 const built=spawnSync('python3',
   [join(AGENT_ROOT,'tests','fixtures','favicon-binary-fixture.py'),zip],
   {timeout:10000});
 assert.equal(built.status,0);
 const source=spawnSync('python3',['-c',
   'import zipfile,sys;z=zipfile.ZipFile(sys.argv[1]);open(sys.argv[2],"wb").write(z.read("android-chrome-512x512.png"))',
   zip,f.prepared.inputPath],{timeout:10000});
 assert.equal(source.status,0);
 await copyFile(zip,f.prepared.outputPath);
 const before=await inspectHomepageManualHandoff(f.opts);
 assert.equal(before.status,'WAITING_FOR_USER');
 assert.equal(before.code,'M3_AWAITING_USER_ATTESTATION');
 const approved=await approveHomepageManualHandoff({...f.opts,
   masterSha256:before.masterSha256,zipSha256:before.zipSha256});
 assert.equal(approved.status,'READY_FOR_HOMEPAGE_SKILL');
 assert.equal(approved.siteOriginIndependentlyVerified,false);
 return approved;
}
test('M3 stage handoff refuses completion until exact user files and attestation are supplied',async t=>{
 const f=await example(t);
 const before=await inspectHomepageManualHandoff(f.opts);
 assert.equal(before.status,'WAITING_FOR_USER');
 assert.equal(before.code,'M3_AWAITING_MANUAL_INPUT_AND_ZIP');
 assert.equal(before.stageMayPass,false);
 assert.equal((await beginHomepageManualHandoff(f.opts)).status,'AWAITING_MANUAL_FILES');
});
test('M3 user approval is bound to source, ZIP, run ID and game; cannot borrow test ZIP for a different game',async t=>{
 const f=await example(t);
 const approved=await placeAndApprove(f);
 assert.match(approved.zipSha256,/^[0-9a-f]{64}$/);
 assert.equal(approved.gameIdentity,'Offline Fixture Game');
 await assert.rejects(inspectHomepageManualHandoff({...f.opts,gameIdentity:'Other Game'}),/M3_MANUAL_REQUEST_IDENTITY_MISMATCH/);
 await assert.rejects(approveHomepageManualHandoff({...f.opts,
   masterSha256:'0'.repeat(64),zipSha256:approved.zipSha256}),/M3_USER_APPROVAL_REQUIRES_CURRENT_VALIDATED_FILES/);
});
test('M3 disallows stale approval when even one byte changes after user confirmation',async t=>{
 const f=await example(t);
 await placeAndApprove(f);
 const bytes=await readFile(f.prepared.outputPath);
 bytes[20]^=1;
 await writeFile(f.prepared.outputPath,bytes);
 const changed=await inspectHomepageManualHandoff(f.opts);
 assert.equal(changed.status,'BLOCKED');
 assert.equal(changed.stageMayPass,false);
});
