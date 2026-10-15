import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,readFile,rm} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {join} from 'node:path';
import {AGENT_ROOT} from '../src/skill-lock.mjs';
import {collectTrustedSteamEvidence} from '../src/trusted-browser-host.mjs';

const url='https://store.steampowered.com/app/2406770/Bodycam/';
async function fixture(t) {
  const runId='trusted-browser-test-'+randomUUID();
  const runDirectory=join(AGENT_ROOT,'runs',runId);
  const nativeDirectory=join(runDirectory,'native');
  await mkdir(nativeDirectory,{recursive:true});
  t.after(()=>rm(runDirectory,{recursive:true,force:true}));
  return {runId,runDirectory,nativeDirectory,stage:'game-homepage-icon-research',
    inputs:{gameIdentity:'Bodycam',gameMetadata:{steamAppId:'2406770',steam:url}}};
}
const verifyIdentity=async policy=>({executable:policy.executable,version:policy.version,sha256:policy.sha256});
const receipt=async command=>({approved:true,type:'bsk-command-approval',
  runId:command.runId,stage:command.stage,commandDigest:command.digest,
  approvedBy:'fixture-user',approvedAt:Date.now(),expiresAt:Date.now()+10000,
  executionId:randomUUID()});
test('trusted host collects fixed typed Steam facts, closes its window, never passes stage as PASSED',async t=>{
  const context=await fixture(t),steps=[];
  const result=await collectTrustedSteamEvidence(context,{verifyIdentity,approve:receipt,
    execute:async command=>{
      steps.push(command.intent);
      if(command.intent==='create-agent-window')return{stdout:JSON.stringify({session_id:'owned',agent_window_id:7,browser_instance_id:'8cf1a2f8'})};
      if(command.intent==='read-owned-tabs')return{stdout:JSON.stringify({tabs:[{tab_id:8,scope:'agent',window_id:7,url:'about:blank'}]})};
      if(command.intent==='read-public-page')return{stdout:JSON.stringify({tab_id:8,final_url:url})};
      if(command.intent==='capture-public-page')return{stdout:JSON.stringify({value:{sourceSchema:'STEAM_PUBLIC_GAME_JSON_LD_V1',
        url,readAllowed:true,content:{name:'Bodycam',url,developer:'Reissad Studio',password:'DROP_THIS'},
        text:'PRIVATE_BODY_DROP'}})};
      return{stdout:'stopped owned'};
    }});
  assert.equal(result.status,'EVIDENCE_READY');
  assert.equal(result.countsAsStageArtifact,false);
  assert.deepEqual(steps,['create-agent-window','read-owned-tabs','read-public-page','capture-public-page','close-owned-session']);
  const report=JSON.parse(await readFile(result.path,'utf8'));
  assert.equal(report.ownedWindowClosed,true);
  assert.equal(report.countsAsStageArtifact,false);
  assert.equal(report.realSkillExecution,false);
  assert.equal(report.evidence.content.name,'Bodycam');
  assert.ok(!JSON.stringify(report).includes('PRIVATE_BODY_DROP'));
  assert.ok(!JSON.stringify(report).includes('DROP_THIS'));
});
test('unapproved host commands execute nothing',async t=>{
  const context=await fixture(t);let calls=0;
  const result=await collectTrustedSteamEvidence(context,{verifyIdentity,approve:async()=>null,
    execute:async()=>{calls++;throw Error('EXECUTE_FORBIDDEN');}});
  assert.equal(result.status,'BLOCKED');assert.equal(calls,0);
  assert.match(result.code,/COMMAND_NOT_APPROVED/);
});
test('cleanup command must have its own receipt',async t=>{
  const context=await fixture(t);let calls=0;
  const approve=async command=>command.intent==='close-owned-session'?null:receipt(command);
  const result=await collectTrustedSteamEvidence(context,{verifyIdentity,approve,execute:async command=>{
    calls++;
    if(command.intent==='create-agent-window')return{stdout:JSON.stringify({session_id:'owned',agent_window_id:7,browser_instance_id:'8cf1a2f8'})};
    if(command.intent==='read-owned-tabs')return{stdout:JSON.stringify({tabs:[{tab_id:8,scope:'agent',window_id:7,url:'about:blank'}]})};
    if(command.intent==='read-public-page')return{stdout:JSON.stringify({tab_id:8,final_url:url})};
    if(command.intent==='capture-public-page')return{stdout:JSON.stringify({value:{sourceSchema:'STEAM_PUBLIC_GAME_JSON_LD_V1',url,readAllowed:true,content:{name:'Bodycam',url}}})};
    throw Error('SHOULD_NOT_EXECUTE_UNAPPROVED_CLEANUP');
  }});
  assert.equal(result.status,'BLOCKED');
  assert.equal(result.code,'OWNED_WINDOW_CLEANUP_UNVERIFIED');
  assert.equal(calls,4);
});
test('host collector will not service UI optimization or other browser stages',async t=>{
  const context=await fixture(t);let calls=0;
  const result=await collectTrustedSteamEvidence({...context,stage:'game-site-ui-ux-audit-optimizer'},
    {verifyIdentity,approve:receipt,execute:async()=>{calls++;}});
  assert.equal(result.status,'BLOCKED');assert.equal(result.code,'UNSUPPORTED_BROWSER_STAGE');
  assert.equal(calls,0);
});

test('trusted host accepts validated Steam Open Graph fallback without claiming Skill PASSED',async t=>{
  const context=await fixture(t),steps=[];
  const result=await collectTrustedSteamEvidence(context,{
    verifyIdentity,approve:receipt,
    execute:async command=>{
      steps.push(command.intent);
      if(command.intent==='create-agent-window')
        return{stdout:JSON.stringify({session_id:'owned',agent_window_id:7,browser_instance_id:'8cf1a2f8'})};
      if(command.intent==='read-owned-tabs')
        return{stdout:JSON.stringify({tabs:[{tab_id:8,scope:'agent',window_id:7,url:'about:blank'}]})};
      if(command.intent==='read-public-page')
        return{stdout:JSON.stringify({tab_id:8,final_url:url})};
      if(command.intent==='capture-public-page')
        return{stdout:JSON.stringify({value:{sourceSchema:'STEAM_PUBLIC_GAME_META_V1',
          url,readAllowed:true,content:{name:'Bodycam',url,description:'Public Steam Open Graph summary',
            userAccount:'PRIVATE_FIELD'}}})};
      return{stdout:'stopped owned'};
    }
  });
  assert.equal(result.status,'EVIDENCE_READY');
  assert.equal(result.countsAsStageArtifact,false);
  const report=JSON.parse(await readFile(result.path,'utf8'));
  assert.equal(report.evidence.sourceSchema,'STEAM_PUBLIC_GAME_META_V1');
  assert.equal(report.evidence.content.description,'Public Steam Open Graph summary');
  assert.ok(!JSON.stringify(report).includes('PRIVATE_FIELD'));
  assert.equal(report.realSkillExecution,false);
  assert.equal(report.ownedWindowClosed,true);
  assert.equal(steps.length,5);
});

test('host accepts a typed Wallpaper Engine public Steam capture after a same-AppID slug redirect',async t=>{
  const context=await fixture(t);
  const canonical='https://store.steampowered.com/app/431960/';
  const redirected='https://store.steampowered.com/app/431960/Wallpaper_Engine/';
  context.inputs={gameIdentity:'Wallpaper Engine',
    gameMetadata:{steamAppId:'431960',steam:canonical,steamName:'Wallpaper Engine'}};
  const result=await collectTrustedSteamEvidence(context,{
    verifyIdentity,approve:receipt,
    execute:async command=>{
      if(command.intent==='create-agent-window')
        return {stdout:JSON.stringify({session_id:'owned',agent_window_id:7,browser_instance_id:'8cf1a2f8'})};
      if(command.intent==='read-owned-tabs')
        return {stdout:JSON.stringify({tabs:[{tab_id:8,scope:'agent',window_id:7,url:'about:blank'}]})};
      if(command.intent==='read-public-page')
        return {stdout:JSON.stringify({tab_id:8,final_url:redirected})};
      if(command.intent==='capture-public-page')
        return {stdout:JSON.stringify({value:{sourceSchema:'STEAM_PUBLIC_GAME_JSON_LD_V1',
          url:redirected,readAllowed:true,
          content:{name:'Wallpaper Engine',url:canonical,
            description:'Windows live desktop wallpapers',account:'DROP_ME'}}})};
      return {stdout:'stopped owned'};
    }
  });
  assert.equal(result.status,'EVIDENCE_READY',JSON.stringify(result));
  const report=JSON.parse(await readFile(result.path,'utf8'));
  assert.equal(report.evidence.url,redirected);
  assert.equal(report.evidence.content.name,'Wallpaper Engine');
  assert.doesNotMatch(JSON.stringify(report),/DROP_ME/);
  assert.equal(report.ownedWindowClosed,true);
  assert.equal(report.countsAsStageArtifact,false);
});
test('host rejects spoofed typed metadata for a different Steam App ID after a redirect',async t=>{
  const context=await fixture(t);
  const canonical='https://store.steampowered.com/app/431960/';
  const malicious='https://store.steampowered.com/app/570/Dota_2/';
  context.inputs={gameIdentity:'Wallpaper Engine',
    gameMetadata:{steamAppId:'431960',steam:canonical,steamName:'Wallpaper Engine'}};
  const result=await collectTrustedSteamEvidence(context,{
    verifyIdentity,approve:receipt,
    execute:async command=>{
      if(command.intent==='create-agent-window')
        return {stdout:JSON.stringify({session_id:'owned',agent_window_id:7,browser_instance_id:'8cf1a2f8'})};
      if(command.intent==='read-owned-tabs')
        return {stdout:JSON.stringify({tabs:[{tab_id:8,scope:'agent',window_id:7,url:'about:blank'}]})};
      if(command.intent==='read-public-page')
        return {stdout:JSON.stringify({tab_id:8,final_url:canonical})};
      if(command.intent==='capture-public-page')
        return {stdout:JSON.stringify({value:{sourceSchema:'STEAM_PUBLIC_GAME_META_V1',
          url:malicious,readAllowed:true,
          content:{name:'Wallpaper Engine',url:malicious,
            description:'Do not accept wrong app identity'}}})};
      return {stdout:'stopped owned'};
    }
  });
  assert.equal(result.status,'BLOCKED');
  assert.equal(result.code,'CAPTURE_CONTEXT_CHANGED');
  assert.equal(result.ownedWindowClosed,true);
});
