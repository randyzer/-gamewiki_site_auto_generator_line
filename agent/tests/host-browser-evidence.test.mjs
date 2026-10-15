import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, readFile, writeFile, readdir, rm, symlink, access, realpath} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {browserHandoffReadiness, normalizeUntrustedHostCapture, quarantineHostCapture}
  from '../src/host-browser-evidence.mjs';

const task={runId:'m2-test-001',stage:'game-homepage-icon-research',gameIdentity:'Bodycam',
  gameMetadata:{steamAppId:'2406770',steam:'https://store.steampowered.com/app/2406770/Bodycam/'}};
const url='https://store.steampowered.com/app/2406770/Bodycam/';
const policy={schemaVersion:1,allowedStages:['game-homepage-icon-research'],allowedPages:[]};
const capture={url,readAllowed:true,sourceSchema:'STEAM_PUBLIC_GAME_JSON_LD_V1',content:{
  name:'Bodycam',url,developer:'Reissad Studio',description:'Public typed game description'}};
async function workspace(t) {
  const root=await realpath(await mkdtemp(join(tmpdir(),'m2-evidence-')));
  t.after(()=>rm(root,{recursive:true,force:true}));
  await mkdir(join(root,'runs'),{recursive:true});
  const policyFile=join(root,'policy.json');
  await writeFile(policyFile,JSON.stringify(policy));
  return {root,policyFile};
}
test('readiness is honest about missing host approval even with valid game metadata',async t=>{
  const f=await workspace(t);const r=await browserHandoffReadiness(task,{policyFile:f.policyFile});
  assert.equal(r.browserWorkerLaunch,'BLOCKED');
  assert.equal(r.browserApprovalCapability,'UNAVAILABLE');
  assert.equal(r.reason,'APPROVAL_CAPABILITY_UNAVAILABLE');
  assert.equal(r.game.steamAppId,'2406770');
  assert.equal(r.requiresTrustedHostApprovalBroker,true);
});
test('capture sanitizer drops arbitrary body text, controls, worker receipts and tokens',()=>{
  const noisy={...capture,text:'PRIVATE_COOKIE_FIXTURE',controls:[{kind:'upload',selector:'secret'}],
    token:'PRIVATE_TOKEN_FIXTURE',approval:{approved:true},content:{...capture.content,access_token:'HIDDEN'}};
  const normalized=normalizeUntrustedHostCapture(task,noisy,policy);
  assert.equal(normalized.status,'QUARANTINED_UNVERIFIED');
  assert.equal(normalized.authorizedForWorkerLaunch,false);
  assert.equal(normalized.countsAsStageArtifact,false);
  assert.equal(normalized.mayResumePipeline,false);
  assert.equal(normalized.evidence.content.developer,'Reissad Studio');
  assert.ok(!JSON.stringify(normalized).includes('PRIVATE_'));
  assert.ok(!JSON.stringify(normalized).includes('HIDDEN'));
});
test('wrong game, wrong app, wrong URL and credential-bearing URL are rejected',()=>{
  for(const bad of [
    {...capture,content:{...capture.content,name:'Dota 2'}},
    {...capture,url:'https://store.steampowered.com/app/570/Dota_2/'},
    {...capture,url:url+'?token=abc'},
    {...capture,url:'https://other.example/app/2406770/Bodycam/'}
  ]) assert.throws(()=>normalizeUntrustedHostCapture(task,bad,policy));
});
test('missing or invalid game metadata and non-browser stage are rejected',()=>{
  assert.throws(()=>normalizeUntrustedHostCapture({...task,gameMetadata:{}},capture,policy));
  assert.throws(()=>normalizeUntrustedHostCapture({...task,stage:'game-site-template-selector'},capture,policy));
  assert.throws(()=>normalizeUntrustedHostCapture({...task,runId:'../escape'},capture,policy));
});
test('quarantine is deterministic, private, idempotent and not a stage artifact',async t=>{
  const f=await workspace(t);
  const first=await quarantineHostCapture(task,capture,{root:f.root,policyFile:f.policyFile});
  const second=await quarantineHostCapture(task,capture,{root:f.root,policyFile:f.policyFile});
  assert.deepEqual(first,second);
  const data=JSON.parse(await readFile(first.path,'utf8'));
  assert.equal(data.hostApprovalVerified,false);
  assert.equal(data.countsAsStageArtifact,false);
  assert.equal(data.status,'QUARANTINED_UNVERIFIED');
  assert.equal((await readdir(join(f.root,'runs',task.runId,'host-evidence-quarantine'))).length,1);
  await assert.rejects(access(join(f.root,'runs',task.runId,'manifest.json')),{code:'ENOENT'});
});
test('quarantine rejects a symlinked run directory',async t=>{
  const f=await workspace(t);
  const external=await mkdtemp(join(tmpdir(),'m2-external-'));
  t.after(()=>rm(external,{recursive:true,force:true}));
  await symlink(external,join(f.root,'runs',task.runId));
  await assert.rejects(quarantineHostCapture(task,capture,{root:f.root,policyFile:f.policyFile}),/Linked path/);
  assert.deepEqual(await readdir(external),[]);
});
test('unverified evidence never bypasses worker browser guard',async()=>{
  const {createSkillExecutor}=await import('../src/skill-executor.mjs');
  let called=0;
  const exec=createSkillExecutor({run:async()=>{called++;throw Error('SHOULD_NOT_RUN');}});
  const status=await exec('game-homepage-icon-research',{mode:'new-site',inputs:{gameIdentity:'Bodycam'},
    hostEvidence:{hostApprovalVerified:true,authorizedForWorkerLaunch:true}});
  assert.equal(status.status,'BLOCKED');
  assert.match(status.evidence.join(' '),/APPROVAL_CAPABILITY_UNAVAILABLE/);
  assert.equal(called,0);
});

test('candidate Steam meta evidence is quarantined with distinct source schema and never authorizes a stage',()=>{
  const normalized=normalizeUntrustedHostCapture(task,{
    ...capture,sourceSchema:'STEAM_PUBLIC_GAME_META_V1',
    content:{name:'Bodycam',url,description:'Public official Open Graph description',
      cookie:'PRIVATE_COOKIE'}
  },policy);
  assert.equal(normalized.evidence.sourceSchema,'STEAM_PUBLIC_GAME_META_V1');
  assert.equal(normalized.evidence.content.description,'Public official Open Graph description');
  assert.equal(normalized.hostApprovalVerified,false);
  assert.equal(normalized.countsAsStageArtifact,false);
  assert.ok(!JSON.stringify(normalized).includes('PRIVATE_COOKIE'));
});
