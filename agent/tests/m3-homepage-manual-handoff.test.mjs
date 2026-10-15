import { syntheticOfficialSources, syntheticHomepageReadiness, syntheticHomepageMedia } from './helpers.mjs';
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
import {createSkillExecutor} from '../src/skill-executor.mjs';

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
test('stage executor returns WAITING before browser approval or Codex worker when handoff is incomplete',async t=>{
 const f=await example(t);
 let browser=0,worker=0;
 const result=await createSkillExecutor({
   browserHumanDialog:true,requestBrowserLaunch:async()=>{browser++;return false;},
   collectBrowserEvidence:async()=>{browser++;return{};},
   run:async()=>{worker++;}
 })('game-homepage-icon-research',f.ctx);
 assert.equal(result.status,'WAITING_FOR_USER');
 assert.deepEqual(result.missing_inputs,['faviconManualApproval']);
 assert.equal(browser,0);
 assert.equal(worker,0);
});
test('after user attestation, homepage worker receives real manual source but must still produce real research',async t=>{
 const f=await example(t);
 const ready=await placeAndApprove(f);
 let count=0;
 const result=await createSkillExecutor({
   browserHumanDialog:true,requestBrowserLaunch:async()=>true,
   collectHomepageSourceEvidence:syntheticOfficialSources,
   inspectHomepageReadiness:syntheticHomepageReadiness,collectHomepageMediaEvidence:syntheticHomepageMedia,
   collectBrowserEvidence:async context=>{
     const path=join(context.runDirectory,'HOST_APPROVED_STEAM_EVIDENCE_fixture.json');
     const b='{"sourceType":"HOST_APPROVED_TYPED_STEAM_PUBLIC_V1"}';
     await writeFile(path,b,{mode:0o400});
     return {status:'EVIDENCE_READY',path,sha256:sha256(b)};
   },
   run:async(_cmd,args,opts)=>{
     count++;
     assert.equal(opts.input.includes('USER-SUPPLIED_AND_VISUALLY_REVIEWED'),true);
     assert.ok(opts.input.includes(ready.zipSha256));
     const resultPath=args[args.indexOf('--output-last-message')+1];
     await writeFile(resultPath,JSON.stringify({status:'BLOCKED',
       evidence:['M3_OFFLINE_FIXTURE_RESEARCH_NOT_COMPLETED'],missing_inputs:[],artifacts:[]}));
   }
 })('game-homepage-icon-research',f.ctx);
 assert.equal(result.status,'BLOCKED');
 assert.equal(count,1);
 assert.deepEqual(result.artifacts,[]);
});
test('a worker cannot replace the approved ZIP with different bytes and falsely claim PASSED',async t=>{
 const f=await example(t);
 await placeAndApprove(f);
 const result=await createSkillExecutor({
   browserHumanDialog:true,requestBrowserLaunch:async()=>true,
   collectHomepageSourceEvidence:syntheticOfficialSources,
   inspectHomepageReadiness:syntheticHomepageReadiness,collectHomepageMediaEvidence:syntheticHomepageMedia,
   collectBrowserEvidence:async context=>{
     const path=join(context.runDirectory,'HOST_APPROVED_STEAM_EVIDENCE_fixture.json');
     const b='{"sourceType":"HOST_APPROVED_TYPED_STEAM_PUBLIC_V1"}';
     await writeFile(path,b,{mode:0o400});
     return {status:'EVIDENCE_READY',path,sha256:sha256(b)};
   },
   run:async(_cmd,args,opts)=>{
     const destination=join(f.outputDirectory,'native','ICON.zip');
     await writeFile(destination,'OFFLINE_FAKE_ICON');
     await writeFile(args[args.indexOf('--output-last-message')+1],JSON.stringify({
       status:'PASSED',evidence:['FAKE_OFFLINE_WORKER_SUCCESS'],missing_inputs:[],
       artifacts:[{kind:'ICON.zip',path:destination},
                  {kind:'HOMEPAGE_RESEARCH.md',path:join(f.outputDirectory,'native','fake.md')}] }));
   }
 })('game-homepage-icon-research',f.ctx);
 assert.equal(result.status,'BLOCKED');
 assert.deepEqual(result.artifacts,[]);
 assert.ok(result.evidence.includes('M3_MANUAL_NATIVE_ICON_DIGEST_MISMATCH'));
});
