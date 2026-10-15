// TEST-only outer-boundary probe. Never activates a host or business Pipeline.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createServer, createConnection } from 'node:net';
import { AGENT_ROOT } from '../src/skill-lock.mjs';
import { safePath, sha256 } from '../src/files.mjs';

const dockerBin='/opt/homebrew/bin/docker';
const imagePattern=/^docker\.io\/library\/node@sha256:[a-f0-9]{64}$/;
export function parseKernelPrivileges(text) {
  return {capEff:text.match(/^CapEff:\s*(\S+)/m)?.[1],noNewPrivs:text.match(/^NoNewPrivs:\s*(\S+)/m)?.[1]};
}
export function containerProbeArguments({image,name,root,uid,gid}) {
  if(!imagePattern.test(image??'')||!/^TEST-container-boundary-[a-f0-9-]{36}$/.test(name??'')||
    root!==join(AGENT_ROOT,'runs',name)||/[\n,]/.test(root)||
    !Number.isSafeInteger(uid)||uid<=0||!Number.isSafeInteger(gid)||gid<0)
    throw Error('CONTAINER_PROBE_SCOPE_INVALID');
  return ['create','--name',name,'--label','agent.synthetic.probe='+name,'--pull','never',
    '--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges',
    '--user',uid+':'+gid,'--pids-limit','64','--memory','512m','--cpus','1','--workdir','/output',
    '--mount','type=bind,src='+join(root,'script')+',dst=/script,readonly',
    '--mount','type=bind,src='+join(root,'input')+',dst=/input,readonly',
    '--mount','type=bind,src='+join(root,'output')+',dst=/output',
    image,'node','/script/probe.mjs'];
}

export function syntheticProbeProgram(data) {
  return `import {readFile,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';import {createConnection} from 'node:net';
const data=${JSON.stringify(data)};
let phase='INITIAL';const mark=async value=>{phase=value;await writeFile('/output/progress.json',JSON.stringify({phase}));};
try{await mark('STARTED');
async function check(path){let read=false,write=false,readError,writeError;try{await readFile(path);read=true;}catch(e){readError=e.code;}try{await writeFile(path,'SYNTHETIC PROBE');write=true;}catch(e){writeError=e.code;}return{read,write,readError,writeError};}
let inputRead=false;try{inputRead=(await readFile('/input/readonly.canary','utf8'))==='SYNTHETIC READONLY';}catch{}
const readonly=await check('/input/readonly.canary');
await writeFile('/output/allowed.canary',data.nonce);
await mark('ALLOWED_WRITE');
const protectedChecks=[];for(const item of data.protectedFiles)protectedChecks.push({category:item.category,...await check(item.path)});
await mark('HOST_CANARIES_CHECKED');
const code="const f=require('node:fs');let read=false,write=false;try{f.readFileSync(process.argv[1]);read=true;}catch{}try{f.writeFileSync(process.argv[1],'SYNTHETIC CHILD');write=true;}catch{}process.stdout.write(JSON.stringify({read,write}));";
const child=spawnSync(process.execPath,['-e',code,data.protectedFiles[0].path],{encoding:'utf8',timeout:2000});
const descendant=child.status===0?JSON.parse(child.stdout):null;
await mark('DESCENDANT_CHECKED');
const loopbackConnected=await new Promise(res=>{const socket=createConnection({host:'127.0.0.1',port:data.port});let done=false;const finish=v=>{if(done)return;done=true;socket.destroy();res(v);};socket.once('connect',()=>finish(true));socket.once('error',()=>finish(false));socket.setTimeout(1000,()=>finish(false));});
const cgroup={};for(const [key,path] of Object.entries({pids:'/sys/fs/cgroup/pids.max',memory:'/sys/fs/cgroup/memory.max',cpu:'/sys/fs/cgroup/cpu.max'}))try{cgroup[key]=(await readFile(path,'utf8')).trim();}catch{cgroup[key]=null;}
await mark('NETWORK_AND_CGROUP_CHECKED');
const proc=await readFile('/proc/self/status','utf8');
const privileges=(${parseKernelPrivileges.toString()})(proc);
const result={nonce:data.nonce,platform:process.platform,nodeVersion:process.version,uid:process.getuid(),inputRead,readonly,protected:protectedChecks,descendant,loopbackConnected,cgroup,...privileges};
await writeFile('/output/result.json',JSON.stringify(result));await mark('COMPLETED');
}catch(error){try{await writeFile('/output/probe-failure.json',JSON.stringify({phase,name:error.name,code:error.code,message:String(error.message).slice(0,500)}));}catch{}throw Error('SYNTHETIC_PROBE_FAILED');}`;
}

async function runProbe(image) {
  const name='TEST-container-boundary-'+randomUUID(),root=join(AGENT_ROOT,'runs',name);
  const args=containerProbeArguments({image,name,root,uid:process.getuid(),gid:process.getgid()});
  await safePath(root,[AGENT_ROOT]);await mkdir(root,{mode:0o700});
  const commands=[],env=Object.fromEntries(['PATH','HOME','TMPDIR','DOCKER_CONFIG','DOCKER_CONTEXT','DOCKER_HOST']
    .filter(k=>typeof process.env[k]==='string').map(k=>[k,process.env[k]]));
  let containerId,server,cleanupVerified=false,measurement,configuration,failure,identity,probeDiagnostic;
  const docker=async(argv,timeoutMs=10000)=>{
    const record={argv:[dockerBin,...argv],timeoutMs};commands.push(record);
    return new Promise((resolvePromise,reject)=>{
      const child=spawn(dockerBin,argv,{env,stdio:['ignore','pipe','pipe']});
      let stdout='',stderr='',timedOut=false,settled=false;
      const finish=error=>{if(settled)return;settled=true;clearTimeout(timer);error?reject(error):resolvePromise(stdout);};
      const timer=setTimeout(()=>{timedOut=true;child.kill('SIGKILL');},timeoutMs);
      child.stdout.on('data',b=>{if(stdout.length<1024*1024)stdout+=b.toString();});
      child.stderr.on('data',b=>{if(stderr.length<8192)stderr+=b.toString();});
      child.on('error',()=>finish(Error('CONTAINER_DOCKER_CLI_UNAVAILABLE')));
      child.on('close',code=>{
        record.exitCode=code;record.timedOut=timedOut;
        // This one command executes only our fixed synthetic script, with no
        // credentials/user files mounted. Preserve its bounded failure evidence.
        if(argv[0]==='start'&&code!==0)record.fixedSyntheticProbeStderr=stderr.slice(0,4096);
        record.failureCategory=code===0?null:/operation not permitted|permission denied/i.test(stderr)?'CURRENT_PROCESS_ACCESS_DENIED':
          /Cannot connect|daemon/i.test(stderr)?'DAEMON_UNAVAILABLE':'COMMAND_FAILED';
        finish(timedOut?Error('CONTAINER_COMMAND_TIMEOUT'):code===0?null:Error('CONTAINER_'+record.failureCategory));
      });
    });
  };
  try {
    if(env.DOCKER_HOST&&!env.DOCKER_HOST.startsWith('unix:///'))throw Error('CONTAINER_NONLOCAL_CONTEXT_REJECTED');
    const context=(await docker(['context','show'])).trim();
    const endpoint=JSON.parse(await docker(['context','inspect',context,'--format','{{json .Endpoints.docker.Host}}']));
    if(typeof endpoint!=='string'||!endpoint.startsWith('unix:///'))throw Error('CONTAINER_NONLOCAL_CONTEXT_REJECTED');
    const serverVersion=JSON.parse(await docker(['info','--format','{{json .ServerVersion}}']));
    const imageInfo=JSON.parse(await docker(['image','inspect',image]))[0];
    const digest=image.split('@')[1];
    if(!imageInfo?.RepoDigests?.some(x=>/^(?:docker\.io\/library\/)?node@sha256:[a-f0-9]{64}$/.test(x)&&x.endsWith('@'+digest)))
      throw Error('CONTAINER_IMAGE_DIGEST_UNVERIFIED');
    identity={context,endpointKind:'local-unix',serverVersion,imageDigest:digest,imageId:imageInfo.Id};
    for(const directory of ['script','input','output','protected'])await mkdir(join(root,directory),{mode:0o700});
    const nonce=randomUUID(),protectedFiles=[];
    for(const category of ['host-approval','synthetic-credential','other-run','template-source','original-site']){
      const path=join(root,'protected',category+'.canary');await writeFile(path,'SYNTHETIC HOST ONLY',{flag:'wx',mode:0o600});
      protectedFiles.push({category,path,sha256:sha256(await readFile(path))});
    }
    const input=join(root,'input','readonly.canary');await writeFile(input,'SYNTHETIC READONLY',{flag:'wx',mode:0o400});
    const inputDigest=sha256(await readFile(input));
    server=createServer(socket=>socket.end());
    await new Promise((res,rej)=>{server.once('error',rej);server.listen(0,'127.0.0.1',res);});
    const port=server.address().port;
    const positive=await new Promise(res=>{
      const socket=createConnection({host:'127.0.0.1',port});let done=false;
      const finish=v=>{if(done)return;done=true;socket.destroy();res(v);};
      socket.once('connect',()=>finish(true));socket.once('error',()=>finish(false));socket.setTimeout(1000,()=>finish(false));
    });
    if(!positive)throw Error('CONTAINER_HOST_LOOPBACK_CONTROL_FAILED');
    const program=syntheticProbeProgram({nonce,port,protectedFiles:protectedFiles.map(({category,path})=>({category,path}))});
    const script=join(root,'script','probe.mjs');await writeFile(script,program,{flag:'wx',mode:0o400});
    containerId=(await docker(args)).trim();
    if(!/^[a-f0-9]{64}$/.test(containerId))throw Error('CONTAINER_CREATION_EVIDENCE_INVALID');
    const info=JSON.parse(await docker(['container','inspect',containerId]))[0],hc=info.HostConfig;
    configuration={network:hc.NetworkMode,readonly:hc.ReadonlyRootfs,capDrop:hc.CapDrop,securityOpt:hc.SecurityOpt,
      pids:hc.PidsLimit,memory:hc.Memory,nanoCpus:hc.NanoCpus,user:info.Config.User,
      mounts:info.Mounts.map(x=>({source:x.Source,destination:x.Destination,rw:x.RW}))};
    if(info.Name!=='/'+name||info.Config.Labels?.['agent.synthetic.probe']!==name||
      configuration.network!=='none'||configuration.readonly!==true||!hc.CapDrop?.includes('ALL')||
      !hc.SecurityOpt?.some(x=>/^no-new-privileges(?:=true)?$/.test(x))||hc.PidsLimit!==64||
      hc.Memory!==512*1024*1024||hc.NanoCpus!==1e9||info.Config.User!==process.getuid()+':'+process.getgid()||
      info.Mounts.length!==3||info.Mounts.some(x=>x.Source!==join(root,({'/script':'script','/input':'input','/output':'output'})[x.Destination]??'INVALID')||x.RW!==(x.Destination==='/output')))
      throw Error('CONTAINER_CONFIGURATION_UNVERIFIED');
    await docker(['start','--attach',containerId],30000);
    const exitInfo=JSON.parse(await docker(['container','inspect',containerId,'--format','{{json .State}}']));
    if(exitInfo.Running||exitInfo.ExitCode!==0)throw Error('CONTAINER_PROBE_PROCESS_FAILED');
    measurement=JSON.parse(await readFile(join(root,'output','result.json')));
    if(measurement.nonce!==nonce||(await readFile(join(root,'output','allowed.canary'),'utf8'))!==nonce||
      sha256(await readFile(script))!==sha256(program)||sha256(await readFile(input))!==inputDigest||
      measurement.inputRead!==true||measurement.readonly.write!==false||measurement.protected.length!==5||
      measurement.protected.some(x=>x.read!==false||x.write!==false)||
      measurement.descendant?.read!==false||measurement.descendant?.write!==false||
      measurement.loopbackConnected!==false||measurement.uid!==process.getuid()||
      !/^0+$/.test(measurement.capEff??'')||measurement.noNewPrivs!=='1')throw Error('CONTAINER_BOUNDARY_FAILED');
    for(const item of protectedFiles)if(sha256(await readFile(item.path))!==item.sha256)throw Error('CONTAINER_HOST_CANARY_CHANGED');
    measurement.hostLoopbackPositiveControl=true;measurement.hostCanariesUnchanged=true;
    measurement.scriptSha256=sha256(program);measurement.inputSha256=inputDigest;
  }catch(error){
    failure=/^CONTAINER_[A-Z_]+$/.test(error.message)?error.message:'CONTAINER_PROBE_FAILED';
    for(const file of ['probe-failure.json','progress.json'])try{
      probeDiagnostic??={};probeDiagnostic[file]=JSON.parse(await readFile(join(root,'output',file)));
    }catch{}
  }
  finally{
    if(server)await new Promise(res=>server.close(res));
    if(containerId&&/^[a-f0-9]{64}$/.test(containerId))try{
      await docker(['rm','--force',containerId]);
      const remaining=(await docker(['container','ls','--all','--filter','id='+containerId,'--format','{{.ID}}'])).trim();
      cleanupVerified=remaining==='';
      if(!cleanupVerified)failure='CONTAINER_CLEANUP_UNVERIFIED';
    }catch{failure='CONTAINER_CLEANUP_UNVERIFIED';}
  }
  const limits=measurement?.cgroup, cpu=limits?.cpu?.split(/\s+/).map(Number);
  const resources=limits?.pids==='64'&&limits.memory===String(512*1024*1024)&&cpu?.length===2&&cpu[0]/cpu[1]===1;
  const report={kind:'CONTAINER_BOUNDARY_PROBE_V1',runId:name,createdAt:new Date().toISOString(),
    status:failure?'BLOCKED':'PARTIAL',code:failure??'SYNTHETIC_CONTAINER_BOUNDARIES_PASS_OTHER_G0_CAPABILITIES_UNTESTED',
    identity,configuration,commands,measurement,probeDiagnostic,cleanupVerified,
    results:{CONTAINER_FILESYSTEM:failure?'BLOCKED':'PASS',CONTAINER_NETWORK:failure?'BLOCKED':'PASS',
      CONTAINER_PROCESS:failure?'BLOCKED':resources?'PASS':'PARTIAL',CLIENT_AUTHENTICATION:'NOT_TESTED',
      MODEL_TOOLS:'NOT_TESTED',GUI_IPC:'NOT_TESTED',TRUSTED_HOST_APPROVAL:'NOT_TESTED'},
    scope:'SYNTHETIC_FILES_DESCENDANT_HOST_LOOPBACK_AND_KERNEL_RESOURCE_CONTROLS_ONLY',
    credentialsReadByProbe:false,clientAuthenticationIsSeparate:true,businessPipelineStarted:false,
    productionActivationAuthorized:false,deploymentExecuted:false};
  const path=join(root,'CONTAINER_BOUNDARY_REPORT.json');await writeFile(path,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o400});
  console.log(JSON.stringify({status:report.status,code:report.code,results:report.results,cleanupVerified,reportPath:path}));
  return failure?2:0;
}

async function main(){
  if(process.argv.length===2||process.argv.length===3&&process.argv[2]==='--preview'){
    console.log(JSON.stringify({kind:'CONTAINER_BOUNDARY_PROBE_PREVIEW_V1',executionStarted:false,
      required:'--image docker.io/library/node@sha256:<verified-and-already-pulled-digest>',
      productionActivationAuthorized:false,businessPipelineStarted:false}));return;
  }
  if(process.argv.length!==4||process.argv[2]!=='--image'||!imagePattern.test(process.argv[3]))
    throw Error('CONTAINER_PROBE_SCOPE_INVALID');
  process.exitCode=await runProbe(process.argv[3]);
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{await main();}catch(error){console.log(JSON.stringify({status:'BLOCKED',code:/^CONTAINER_[A-Z_]+$/.test(error.message)?error.message:'CONTAINER_PROBE_FAILED'}));process.exitCode=2;}
}
