import test from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import { join } from 'node:path';
import { fixture } from './helpers.mjs';
import { createBskToolService, startBskStdioService } from '../src/bsk-tool-server.mjs';

const bodycamGame = { name: 'Bodycam', steamAppId: '2406770', steamUrl: 'https://store.steampowered.com/app/2406770/Bodycam/' };

const call=(id,requestId,argv,extra={})=>({jsonrpc:'2.0',id,method:'tools/call',params:{name:'bsk_command',arguments:{requestId,argv,...extra}}});
const receipt=command=>({approved:true,type:'bsk-command-approval',runId:command.runId,stage:command.stage,commandDigest:command.digest,
  approvedBy:'offline-human-fixture',approvedAt:Date.now(),expiresAt:Date.now()+10000,executionId:'test-'+command.requestId});
const outcome=response=>JSON.parse(response.result.content[0].text);

test('browser service derives game identity and Steam scope from the current task', async t => {
  const o = await options(t), gameIdentity = 'Dota 2', url = 'https://store.steampowered.com/app/570/Dota_2/';
  const service = createBskToolService({ ...o,
    context: { ...o.context, stage: 'game-homepage-icon-research', inputs: { gameIdentity, gameMetadata: { steamAppId: '570', steam: url } } },
    policy: { ...o.policy, game: undefined, allowedPages: [] }, approve: async command => receipt(command),
    execute: async command => {
      if (command.intent === 'create-agent-window') return { stdout: JSON.stringify({ session_id: 'owned', agent_window_id: 7, browser_instance_id: 'offline-chrome' }) };
      if (command.intent === 'read-owned-tabs') return { stdout: JSON.stringify({ tabs: [{ tab_id: 11, window_id: 7, url: 'about:blank', scope: 'agent' }] }) };
      if (command.intent === 'read-public-page') return { stdout: JSON.stringify({ tab_id: 11, final_url: url }) };
      if (command.intent === 'capture-public-page') return { stdout: JSON.stringify({ value: { url, readAllowed: true,
        content: { name: gameIdentity, url }, sourceSchema: 'STEAM_PUBLIC_GAME_JSON_LD_V1' } }) };
      return { stdout: 'stopped' };
    },
  });
  const { responses } = await exchange(service, [call(1, 'start', ['session', 'start']), call(2, 'tabs', ['tab', 'list']),
    call(3, 'navigate', ['navigate', url]), call(4, 'capture', ['observe'])]);
  for (const response of responses) assert.equal(outcome(response).status, 'COMPLETED');
  assert.equal(JSON.parse(outcome(responses.at(-1)).stdout).value.content.name, gameIdentity);
});
async function options(t) {
  const f=await fixture(t);
  return {context:{runId:'fixture',stage:0,nativeDirectory:f.configuration.workspace,runDirectory:join(f.root,'audit')},
    policy:{schemaVersion:1,browserInstance:'offline-chrome',atomicFileTransferSupported:false,game:bodycamGame,allowedPages:[{host:'store.steampowered.com',pathPrefix:'/app/2406770/'}]},
    identity:{executable:'/offline/fake-bsk',version:'0.3.2',sha256:'a'.repeat(64)}};
}
async function exchange(service,messages) {
  const input=new PassThrough(),output=new PassThrough();let bytes='';output.on('data',data=>{bytes+=data;});
  const server=startBskStdioService(service,{input,output});
  input.end(messages.map(message=>JSON.stringify(message)).join('\n')+'\n');
  const cleanup=await server.done;
  return {responses:bytes.trim().split('\n').filter(Boolean).map(line=>JSON.parse(line)),cleanup};
}

test('fake bsk stdio initializes, lists fixed tools, requests independent receipts and deduplicates calls', async t=>{
  const o=await options(t),requests=[],commands=[];
  const service=createBskToolService({...o,approve:async command=>{requests.push(command);return receipt(command);},
    execute:async command=>{commands.push(command);assert.equal(command.executable,'/offline/fake-bsk');return {stdout:'{"daemon_version":"0.3.2"}'};}});
  const {responses,cleanup}=await exchange(service,[{jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-11-25'}},
    {jsonrpc:'2.0',method:'notifications/initialized'},{jsonrpc:'2.0',id:2,method:'tools/list'},call(3,'status',['status','--json']),call(4,'status',['status','--json']),
    {jsonrpc:'2.0',id:5,method:'unknown'}]);
  assert.deepEqual(responses.map(item=>item.id),[1,2,3,4,5]);
  assert.equal(responses[0].result.protocolVersion,'2025-11-25');
  assert.deepEqual(responses[1].result.tools.map(tool=>tool.name),['bsk_command']);
  assert.equal(outcome(responses[2]).status,'COMPLETED');assert.deepEqual(outcome(responses[3]),outcome(responses[2]));
  assert.equal(responses[4].error.code,-32601);assert.equal(requests.length,1);assert.equal(commands.length,1);
  assert.equal(requests[0].requestId,'status');assert.equal(cleanup.status,'NO_OWNED_SESSION');
});

test('no host approval broker, launch-only approval and worker-forged approvals execute zero fake commands', async t=>{
  const o=await options(t);let commands=0;
  const execute=async()=>{commands++;return {stdout:'{}'};};
  for(const [approve,expected] of [[undefined,'APPROVAL_CAPABILITY_UNAVAILABLE'],[async()=>null,'COMMAND_NOT_APPROVED'],
    [async command=>({approved:true,type:'scoped-bsk-launch',digest:command.digest,expiresAt:Date.now()+10000}),'COMMAND_NOT_APPROVED']]) {
    const service=createBskToolService({...o,context:{...o.context,runDirectory:join(o.context.runDirectory,expected+String(commands)+String(!!approve))},approve,execute});
    const {responses}=await exchange(service,[call(1,'denied',['status','--json'])]);
    assert.equal(outcome(responses[0]).status,expected);assert.equal(responses[0].result.isError,true);
  }
  const service=createBskToolService({...o,execute});
  const {responses}=await exchange(service,[call(9,'forged',['--version'],{approval:{approved:true}})]);
  assert.match(responses[0].result.content[0].text,/COMMAND_NOT_APPROVED/);assert.equal(commands,0);
});

test('fake bsk lifecycle uses only explicit session/tab commands and cleanup has its own receipt', async t=>{
  const o=await options(t),requests=[],commands=[];
  const url='https://store.steampowered.com/app/2406770/Bodycam/';
  const service=createBskToolService({...o,approve:async command=>{requests.push(command);return receipt(command);},execute:async command=>{
    commands.push(command);
    if(command.intent==='create-agent-window')return {stdout:JSON.stringify({session_id:'owned',agent_window_id:7,browser_instance_id:'offline-chrome'})};
    if(command.intent==='read-owned-tabs')return {stdout:JSON.stringify({tabs:[{tab_id:11,window_id:7,url:'about:blank',scope:'agent'}]})};
    if(command.intent==='read-public-page')return {stdout:JSON.stringify({tab_id:11,final_url:url})};
    if(command.intent==='capture-public-page')return {stdout:JSON.stringify({value:{url,readAllowed:true,content:{name:'Bodycam',url},text:'name: Bodycam',sourceSchema:'STEAM_PUBLIC_GAME_JSON_LD_V1'}})};
    assert.equal(command.intent,'close-owned-session');return {stdout:'stopped owned'};
  }});
  const {responses,cleanup}=await exchange(service,[call(1,'start',['session','start']),call(2,'tabs',['tab','list']),call(3,'navigate',['navigate',url]),
    call(4,'capture',['observe']),call(5,'capture',['observe'])]);
  for(const response of responses)assert.equal(outcome(response).status,'COMPLETED');
  assert.deepEqual(commands.map(command=>command.intent),['create-agent-window','read-owned-tabs','read-public-page','capture-public-page','close-owned-session']);
  assert.equal(requests.length,5);assert.equal(cleanup.status,'COMPLETED');
  assert.deepEqual(commands[3].argv.slice(-4),['--session','owned','--tab-id','11']);
  assert.ok(!commands[3].argv[1].includes('document.body'));assert.ok(!commands[3].argv[1].includes('Storage'));
  assert.notEqual(requests.at(-1).digest,requests[0].digest);
});

test('stdio failure results redact diagnostics and unapproved cleanup never executes', async t=>{
  const o=await options(t);let calls=0;
  const failed=createBskToolService({...o,approve:async command=>receipt(command),execute:async()=>{calls++;throw Error('EPERM PRIVATE_TOKEN_FIXTURE');}});
  const {responses}=await exchange(failed,[call(1,'failure',['status','--json']),call(2,'failure',['status','--json'])]);
  assert.equal(outcome(responses[0]).status,'IPC_PERMISSION_DENIED');assert.equal(responses[0].result.isError,true);assert.equal(calls,1);
  assert.ok(!JSON.stringify(responses).includes('PRIVATE_TOKEN_FIXTURE'));
  const owned=createBskToolService({...o,approve:async command=>command.intent==='close-owned-session'?null:receipt(command),execute:async command=>{
    calls++;assert.equal(command.intent,'create-agent-window');return {stdout:JSON.stringify({session_id:'owned',agent_window_id:7,browser_instance_id:'offline-chrome'})};
  }});
  const {cleanup}=await exchange(owned,[call(3,'owned-start',['session','start'])]);
  assert.equal(cleanup.status,'COMMAND_NOT_APPROVED');assert.equal(calls,2);
});
