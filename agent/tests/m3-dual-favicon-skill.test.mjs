import { syntheticOfficialSources, syntheticHomepageReadiness, syntheticHomepageMedia } from './helpers.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile,copyFile,rm} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {AGENT_ROOT} from '../src/skill-lock.mjs';
import {sha256} from '../src/files.mjs';
import {inspectHomepageLocalConversion} from '../src/m3-local-favicon-handoff.mjs';
import {beginHomepageManualHandoff} from '../src/m3-homepage-manual-handoff.mjs';
import {createSkillExecutor} from '../src/skill-executor.mjs';

const skillRoot=join(AGENT_ROOT,'../codex-skills/game-homepage-icon-research');
const cli=join(AGENT_ROOT,'scripts/m3-local-favicon.mjs');
const fixture=join(AGENT_ROOT,'scripts/m3-visual-test-fixture.py');
const validator=join(skillRoot,'scripts/validate_outputs.py');
const invoke=(exe,args,timeout=16000)=>spawnSync(exe,args,{cwd:AGENT_ROOT,
  encoding:'utf8',timeout,maxBuffer:100000});
async function context(t){
 const runId='m3-dual-path-test-'+randomUUID();
 const runDirectory=join(AGENT_ROOT,'runs',runId);
 const outputDirectory=join(runDirectory,'artifacts','0','1');
 await mkdir(outputDirectory,{recursive:true});
 t.after(()=>rm(runDirectory,{recursive:true,force:true}));
 const gameIdentity='Dual Offline Fixture Game';
 await writeFile(join(runDirectory,'manifest.json'),JSON.stringify({
  runId,inputs:{gameIdentity},stages:[{skill:'game-homepage-icon-research',status:'BLOCKED'}]
 }),{mode:0o600});
 const ctx={runId,outputDirectory,inputs:{gameIdentity,
  projectPath:join(AGENT_ROOT,'workspaces',runId,'site')},
  requiredArtifacts:['HOMEPAGE_RESEARCH.md','ICON.zip'],
  skillLock:{source:join(skillRoot,'SKILL.md')},
  permissions:{siteWrites:false}};
 return {runId,runDirectory,outputDirectory,gameIdentity,ctx};
}
async function convert(f){
 assert.equal(invoke('node',[cli,'prepare',f.runId]).status,2);
 const source=join(f.runDirectory,'m3-local-favicon/input/master-512.png');
 assert.equal(invoke('python3',[fixture,source]).status,0);
 const inspected=invoke('node',[cli,'inspect',f.runId]);
 assert.equal(inspected.status,2);
 const sourceHash=JSON.parse(inspected.stdout).sourceSha256;
 const approved=invoke('node',[cli,'approve',f.runId,sourceHash,
  'I_CONFIRM_ORIGINAL_GENERATED_ARTWORK_AND_RIGHTS']);
 assert.equal(approved.status,0,approved.stderr);
 const generated=invoke('node',[cli,'convert',f.runId],25000);
 assert.equal(generated.status,0,generated.stderr);
 return {sourceHash,receipt:JSON.parse(generated.stdout)};
}
function md(){
 const obj={home:{meta:{title:'Dual Test'},hero:{stats:['Test']},
  start:{cards:[{},{},{},{}]},aboutGame:{stats:[{label:'Mode',value:'Test'}]}},
  metadata:{title:'Dual Test',description:'d'.repeat(150),keywords:'dual,test'},
  sidebarCodes:'暂无'};
 return '# Dual path fixture\n\n' + String.fromCharCode(96).repeat(3) +
  'json\n' + JSON.stringify(obj) + '\n' + String.fromCharCode(96).repeat(3)+'\n';
}
test('original Skill validator accepts an actually validated host local receipt and rejects missing/mismatched modes',async t=>{
 const f=await context(t), {receipt}=await convert(f);
 const dir=join(f.runDirectory,'backgroundinformation');
 await mkdir(dir);
 const markdown=join(dir,f.gameIdentity+'攻略站首页调研信息.md');
 const zip=join(dir,f.gameIdentity+'图标.zip');
 await writeFile(markdown,md());
 await copyFile(receipt.receiptPath.replace('CONVERSION_RECEIPT.json','output/favicon.zip'),zip);
 const base=[validator,'--markdown',markdown,'--zip',zip,'--game-name',f.gameIdentity];
 const local=[...base,'--conversion-mode','local','--conversion-receipt',receipt.receiptPath];
 assert.equal(invoke('python3',local).status,0);
 assert.notEqual(invoke('python3',[...base,'--conversion-mode','local']).status,0);
 assert.notEqual(invoke('python3',[...base,'--conversion-mode','favicon-io',
  '--conversion-receipt',receipt.receiptPath]).status,0);
 const bad=join(f.runDirectory,'wrong-game-receipt.json');
 const forged=JSON.parse(await readFile(receipt.receiptPath));
 forged.gameIdentity='Other Game';
 await writeFile(bad,JSON.stringify(forged));
 assert.notEqual(invoke('python3',[...base,'--conversion-mode','local','--conversion-receipt',bad]).status,0);
});
test('local host holds until user approved source and completed converter receipt',async t=>{
 const f=await context(t);
 assert.equal((await inspectHomepageLocalConversion({...f,
  gameIdentity:f.gameIdentity})).status,'NOT_ENABLED');
 const begin=invoke('node',[cli,'prepare',f.runId]);
 assert.equal(begin.status,2);
 const before=await inspectHomepageLocalConversion(f);
 assert.equal(before.status,'WAITING_FOR_USER');
 assert.equal(before.code,'M3_LOCAL_MASTER_PNG_REQUIRED');
 let browser=0,worker=0;
 const result=await createSkillExecutor({browserHumanDialog:true,
  requestBrowserLaunch:async()=>{browser++;return true;},
  run:async()=>{worker++;}})('game-homepage-icon-research',f.ctx);
 assert.equal(result.status,'WAITING_FOR_USER');
 assert.equal(browser,0);assert.equal(worker,0);
});
test('approved local binary source is run-bound and never by itself declares homepage stage passed',async t=>{
 const f=await context(t);
 const {receipt}=await convert(f);
 const result=await inspectHomepageLocalConversion(f);
 assert.equal(result.status,'READY_FOR_HOMEPAGE_SKILL');
 assert.equal(result.zipSha256,receipt.zipSha256);
 assert.match(result.requestSha256,/^[a-f0-9]{64}$/);
 assert.match(result.receiptSha256,/^[a-f0-9]{64}$/);
 assert.match(result.engineReceiptSha256,/^[a-f0-9]{64}$/);
 assert.ok(result.approvalPath.endsWith('USER_APPROVAL.json'));
 assert.equal(result.siteOriginIndependentlyVerified,false);
 assert.equal(result.imageGenerationIndependentlyVerified,false);
 assert.equal(result.stageMayPass,false);
 await assert.rejects(inspectHomepageLocalConversion({...f,gameIdentity:'Another Game'}),
   /M3_LOCAL_REQUEST_IDENTITY_MISMATCH/);
});
test('local conversion refuses tampered ZIP and simultaneous manual+local paths',async t=>{
 const f=await context(t);
 await convert(f);
 const manual=await beginHomepageManualHandoff({runDirectory:f.runDirectory,
  runId:f.runId,gameIdentity:f.gameIdentity});
 const result=await createSkillExecutor({browserHumanDialog:true,
  requestBrowserLaunch:async()=>{throw Error('MUST_NOT_START');}})(
  'game-homepage-icon-research',f.ctx);
 assert.equal(result.status,'BLOCKED');
 assert.ok(result.evidence.includes('M3_ICON_CONVERSION_PATH_AMBIGUOUS_USE_ONE'));
 const zip=join(f.runDirectory,'m3-local-favicon/output/favicon.zip');
 const raw=await readFile(zip);
 raw[22]^=1;await writeFile(zip,raw);
 const bad=await inspectHomepageLocalConversion(f);
 assert.equal(bad.status,'BLOCKED');
 assert.equal(bad.code,'M3_LOCAL_RECEIPT_PROVENANCE_INVALID');
});
test('local route passes its audited source to worker but fabricated worker icon is rejected',async t=>{
 const f=await context(t);
 await convert(f);
 const handoff=await inspectHomepageLocalConversion(f);
 let called=0;
 const result=await createSkillExecutor({
  browserHumanDialog:true,
  requestBrowserLaunch:async()=>true,
  collectHomepageSourceEvidence:syntheticOfficialSources,
  inspectHomepageReadiness:syntheticHomepageReadiness,collectHomepageMediaEvidence:syntheticHomepageMedia,
   collectBrowserEvidence:async context=>{
   const path=join(context.runDirectory,'HOST_TYPED_EVIDENCE_dual_test.json');
   const source='{"sourceType":"HOST_APPROVED_TYPED_STEAM_PUBLIC_V1"}';
   await writeFile(path,source,{mode:0o400});
   return {status:'EVIDENCE_READY',path,sha256:sha256(source)};
  },
  run:async(_command,args,options)=>{
    called++;
    assert.ok(options.input.includes('LOCAL_FAVICON_CONVERSION_V1'));
    assert.ok(options.input.includes(handoff.zipSha256));
    assert.match(options.input, /Use the available Node\.js runtime/);
    assert.match(options.input, /Do not invoke python3/);
    assert.match(options.input, /No original generation prompt was retained/);
    for (const path of [handoff.requestPath, handoff.approvalPath, handoff.receiptPath,
      handoff.engineReceiptPath]) assert.ok(options.input.includes(path));
    const profile=args.find(value=>value.startsWith('permissions.agent-worker='));
    for (const path of [handoff.requestPath, handoff.approvalPath, handoff.receiptPath,
      handoff.engineReceiptPath]) assert.ok(profile.includes(JSON.stringify(path)+'="read"'));
    assert.doesNotMatch(options.input, /Image generation requires an actual callable image-generation tool/,
      'an already approved local icon must not be blocked by a contradictory missing-generator instruction');
    const out=args[args.indexOf('--output-last-message')+1];
    const fake=join(f.outputDirectory,'native','fake.zip');
    await writeFile(fake,'FAKE ZIP');
    await writeFile(out,JSON.stringify({status:'PASSED',evidence:['FAKE'],
      missing_inputs:[],artifacts:[{kind:'ICON.zip',path:fake},
        {kind:'HOMEPAGE_RESEARCH.md',path:join(f.outputDirectory,'native','fake.md')}]}));
  }
 })('game-homepage-icon-research',f.ctx);
 assert.equal(called,1);
 assert.equal(result.status,'BLOCKED');
 assert.ok(result.evidence.includes('M3_LOCAL_NATIVE_ICON_DIGEST_MISMATCH'));
});
