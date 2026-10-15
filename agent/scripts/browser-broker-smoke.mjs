import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {join} from 'node:path';
import {AGENT_ROOT} from '../src/skill-lock.mjs';
import {sha256} from '../src/files.mjs';

const mode=process.argv[2];
if(!['deny','interactive'].includes(mode))throw Error('Usage: node scripts/browser-broker-smoke.mjs deny|interactive');
const runId='m2-browser-broker-'+randomUUID(), dir=join(AGENT_ROOT,'runs',runId);
const native=join(dir,'native');
await mkdir(native,{recursive:true,mode:0o700});
const policy=await readFile(join(AGENT_ROOT,'config/bsk-command-policy.json'));
const context={runId,stage:'game-homepage-icon-research',runDirectory:dir,nativeDirectory:native,
  inputs:{gameIdentity:'Bodycam',
    gameMetadata:{steamAppId:'2406770',steam:'https://store.steampowered.com/app/2406770/Bodycam/'}},
  launchApproval:{type:'scoped-bsk-launch',runId,policySha256:sha256(policy),expiresAt:Date.now()+600000}};
const contextFile=join(dir,'context.json');
await writeFile(contextFile,JSON.stringify(context),{mode:0o600,flag:'wx'});
const service=join(AGENT_ROOT,'src/bsk-tool-server.mjs');
const child=spawn(process.execPath,[service,contextFile],{
  cwd:dir,env:{PATH:process.env.PATH,HOME:process.env.HOME,
    GAME_SITE_BROWSER_HUMAN_DIALOG:mode==='interactive'?'enabled':'disabled',
    BSK_AUTO_START:'0'},stdio:['pipe','pipe','pipe']});
const calls=[
 {jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-11-25'}},
 {jsonrpc:'2.0',id:2,method:'tools/list'},
 {jsonrpc:'2.0',id:3,method:'tools/call',params:{name:'bsk_command',
   arguments:{requestId:'read-status',argv:['status','--json']}}}
];
let stdout='',stderr='';
child.stdout.on('data',c=>{if(stdout.length<32768)stdout+=c.toString()});
child.stderr.on('data',c=>{if(stderr.length<4096)stderr+=c.toString()});
child.stdin.end(calls.map(JSON.stringify).join('\n')+'\n');
const timer=setTimeout(()=>child.kill('SIGKILL'),68000);
const code=await new Promise(resolve=>child.on('close',resolve));
clearTimeout(timer);
const items=stdout.trim().split('\n').filter(Boolean).map(line=>JSON.parse(line));
const response=items.find(row=>row.id===3);
let status='RESPONSE_MISSING';
try{status=JSON.parse(response.result.content[0].text).status;}catch{}
const result={mode,runId,processExit:code,toolListed:items.some(row=>row.id===2&&
  row.result?.tools?.some(tool=>tool.name==='bsk_command')),commandStatus:status,
  browserApprovalWasInteractive:mode==='interactive',
  browserWorkerNotLaunched:true,siteWrites:false,productionDeployment:false,
  note:'Command-only smoke, no browser tab or site task; command approval comes from macOS GUI only in interactive mode'};
await writeFile(join(dir,'SMOKE_RESULT.json'),JSON.stringify(result,null,2)+'\n',{mode:0o600});
console.log(JSON.stringify(result,null,2));
if(!result.toolListed||status==='RESPONSE_MISSING')process.exitCode=2;
