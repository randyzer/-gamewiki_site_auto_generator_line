import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {randomUUID} from 'node:crypto';
import {join} from 'node:path';
import {AGENT_ROOT} from '../src/skill-lock.mjs';
import {sha256} from '../src/files.mjs';

const runId='m2-real-steam-'+randomUUID(), dir=join(AGENT_ROOT,'runs',runId);
const native=join(dir,'native');
await mkdir(native,{recursive:true,mode:0o700});
const policy=await readFile(join(AGENT_ROOT,'config/bsk-command-policy.json'));
const url='https://store.steampowered.com/app/2406770/Bodycam/';
const context={runId,stage:'game-homepage-icon-research',runDirectory:dir,nativeDirectory:native,
  inputs:{gameIdentity:'Bodycam',gameMetadata:{steamAppId:'2406770',steam:url}},
  launchApproval:{type:'scoped-bsk-launch',runId,policySha256:sha256(policy),expiresAt:Date.now()+15*60*1000}};
const contextFile=join(dir,'context.json');
await writeFile(contextFile,JSON.stringify(context),{mode:0o600,flag:'wx'});
const child=spawn(process.execPath,[join(AGENT_ROOT,'src/bsk-tool-server.mjs'),contextFile],{
  cwd:dir,env:{PATH:process.env.PATH,HOME:process.env.HOME,
    GAME_SITE_BROWSER_HUMAN_DIALOG:'enabled',BSK_AUTO_START:'0'},
  stdio:['pipe','pipe','pipe']});
const pending=new Map();
let n=0,stopped=false;
const results={runId,steps:[],status:'IN_PROGRESS',siteWrites:false,realSkillExecution:false,deploymentExecuted:false};
const lines=createInterface({input:child.stdout});
lines.on('line',line=>{
  let msg;try{msg=JSON.parse(line);}catch{return;}
  const handler=pending.get(msg.id);if(handler){pending.delete(msg.id);handler(msg);}
});
child.on('close',()=>{stopped=true;for(const resolve of pending.values())resolve(null);pending.clear();});
child.stderr.on('data',()=>{}); // no raw stderr forwarded or saved
async function request(method,params={},timeout=65000){
  if(stopped)throw Error('BROWSER_TOOL_CLOSED');
  const id=++n;
  const promise=new Promise(resolve=>pending.set(id,resolve));
  child.stdin.write(JSON.stringify({jsonrpc:'2.0',id,method,params})+'\n');
  let timer;const answer=await Promise.race([promise,new Promise(resolve=>{timer=setTimeout(()=>resolve(null),timeout);})]);
  clearTimeout(timer);pending.delete(id);
  if(!answer)throw Error('BROWSER_TOOL_NO_RESPONSE');
  return answer;
}
async function command(intent,argv){
  console.log('AWAITING_HOST_APPROVAL',intent);
  const response=await request('tools/call',{name:'bsk_command',arguments:{requestId:intent+'-'+n,argv}});
  const result=JSON.parse(response?.result?.content?.[0]?.text||'{}');
  results.steps.push({intent,status:result.status});
  console.log('COMMAND_RESULT',intent,result.status);
  return result;
}
let sessionRequested=false;
try{
  const init=await request('initialize',{protocolVersion:'2025-11-25'});
  if(!init.result?.serverInfo)throw Error('MCP_INIT_FAILED');
  const listed=await request('tools/list');
  if(!listed.result?.tools?.some(tool=>tool.name==='bsk_command'))throw Error('MCP_BROWSER_TOOL_MISSING');
  const start=await command('start',['session','start']);
  if(start.status!=='COMPLETED')throw Error('START_'+start.status);
  sessionRequested=true;
  for(const [intent,argv] of [['tabs',['tab','list']],['navigate',['navigate',url]],['observe',['observe']]]){
    const outcome=await command(intent,argv);
    if(outcome.status!=='COMPLETED')throw Error(intent.toUpperCase()+'_'+outcome.status);
    if(intent==='observe'){
      const value=JSON.parse(outcome.stdout).value;
      results.sourceSchema=value.sourceSchema;
      results.validatedPublicGameName=value.content?.name;
      results.publicSourceUrl=value.url;
      results.status='PUBLIC_STEAM_CAPTURE_OK';
      await writeFile(join(dir,'PUBLIC_STEAM_CAPTURE.json'),
        JSON.stringify({sourceSchema:value.sourceSchema,url:value.url,content:value.content},null,2)+'\n',
        {mode:0o600,flag:'wx'});
    }
  }
}catch(err){
  results.status='BLOCKED';
  results.errorCode=String(err.message).replace(/[^A-Za-z0-9_-]/g,'_').slice(0,160);
}finally{
  if(sessionRequested){
    try{
      const closed=await command('close',['session','stop']);
      results.ownedWindowClosed=closed.status==='COMPLETED';
    }catch{results.ownedWindowClosed=false;}
  }
  child.stdin.end();
}
const code=await new Promise(resolve=>child.on('close',resolve));
results.serviceExitCode=code;
await writeFile(join(dir,'SMOKE_RESULT.json'),JSON.stringify(results,null,2)+'\n',{mode:0o600});
console.log('SMOKE_COMPLETE',JSON.stringify(results));
if(results.status!=='PUBLIC_STEAM_CAPTURE_OK'||results.ownedWindowClosed!==true)process.exitCode=2;
