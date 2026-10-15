import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { Script, createContext } from 'node:vm';
import { AGENT_ROOT } from '../src/skill-lock.mjs';

const image='docker.io/library/node@sha256:'+'a'.repeat(64);
const name='TEST-container-boundary-'+randomUUID();
const args={image,name,root:join(AGENT_ROOT,'runs',name),uid:501,gid:20};

test('container probe rejects tag, root identity, unknown image provider and non-owned mounts',async()=>{
  const { containerProbeArguments }=await import('../scripts/container-boundary-probe.mjs');
  for(const patch of [{image:'node:22-bookworm-slim'},{image:'unknown/node@sha256:'+'a'.repeat(64)},
    {uid:0},{uid:-1},{gid:-1},{root:AGENT_ROOT},{root:process.env.HOME},{name:'business-run'},
    {root:join(AGENT_ROOT,'runs',name,'..')}])
    assert.throws(()=>containerProbeArguments({...args,...patch}),/CONTAINER_PROBE_SCOPE_INVALID/);
});

test('probe command exposes only synthetic mounts with fixed network and resource controls',async()=>{
  const { containerProbeArguments }=await import('../scripts/container-boundary-probe.mjs');
  const argv=containerProbeArguments(args);
  const value=key=>argv[argv.indexOf(key)+1];
  assert.equal(value('--network'),'none');assert.equal(value('--cap-drop'),'ALL');
  assert.equal(value('--pull'),'never');assert.equal(value('--security-opt'),'no-new-privileges');
  assert.equal(value('--user'),'501:20');assert.ok(argv.includes('--read-only'));
  const mounts=argv.flatMap((x,i)=>x==='--mount'?[argv[i+1]]:[]);
  assert.equal(mounts.length,3);assert.ok(mounts.every(x=>x.startsWith('type=bind,src='+args.root+'/')));
  assert.equal(mounts.filter(x=>x.endsWith(',readonly')).length,2);
  assert.ok(mounts.every(x=>!x.includes('docker.sock')&&!x.includes('CODEX_HOME')));
});

test('default probe invocation is preview only and cannot contact a daemon or create a run',()=>{
  const r=spawnSync(process.execPath,['scripts/container-boundary-probe.mjs'],{cwd:AGENT_ROOT,encoding:'utf8'});
  assert.equal(r.status,0);const result=JSON.parse(r.stdout);
  assert.equal(result.kind,'CONTAINER_BOUNDARY_PROBE_PREVIEW_V1');
  assert.equal(result.executionStarted,false);assert.equal(result.productionActivationAuthorized,false);
});

test('kernel privilege parsing preserves real proc whitespace and rejects absent evidence',async()=>{
  const { parseKernelPrivileges }=await import('../scripts/container-boundary-probe.mjs');
  assert.deepEqual(parseKernelPrivileges('Name:\tnode\nCapEff:\t0000000000000000\nNoNewPrivs:\t1\n'),
    {capEff:'0000000000000000',noNewPrivs:'1'});
  assert.deepEqual(parseKernelPrivileges('missing proof'),{capEff:undefined,noNewPrivs:undefined});
});

test('generated container program executes independently and preserves the bound nonce',async()=>{
  const { syntheticProbeProgram }=await import('../scripts/container-boundary-probe.mjs');
  const output=new Map(),nonce='SYNTHETIC NONCE';
  const absent=()=>Object.assign(Error('synthetic absent'),{code:'ENOENT'});
  const context=createContext({
    readFile:async path=>{
      if(path==='/input/readonly.canary')return 'SYNTHETIC READONLY';
      if(path==='/proc/self/status')return 'CapEff:\t0000000000000000\nNoNewPrivs:\t1\n';
      const cgroup={'/sys/fs/cgroup/pids.max':'64','/sys/fs/cgroup/memory.max':'536870912','/sys/fs/cgroup/cpu.max':'100000 100000'};
      if(cgroup[path])return cgroup[path];throw absent();
    },
    writeFile:async(path,bytes)=>{if(!path.startsWith('/output/'))throw absent();output.set(path,bytes);},
    spawnSync:()=>({status:0,stdout:JSON.stringify({read:false,write:false})}),
    createConnection:()=>{
      const listeners={};queueMicrotask(()=>listeners.error?.(absent()));
      return {once:(name,callback)=>{listeners[name]=callback;},destroy:()=>{},setTimeout:()=>{}};
    },
    process:{execPath:'SYNTHETIC',platform:'linux',version:'SYNTHETIC',getuid:()=>501}
  });
  const code=syntheticProbeProgram({nonce,port:12345,protectedFiles:[{category:'host-approval',path:'/synthetic-host/protected.canary'}]})
    .replace(/import [^;]+;/g,'');
  await new Script('(async()=>{'+code+'})()').runInContext(context,{timeout:1000});
  const result=JSON.parse(output.get('/output/result.json'));
  assert.equal(result.nonce,nonce);assert.equal(output.get('/output/allowed.canary'),nonce);
  assert.equal(result.inputRead,true);assert.equal(result.readonly.write,false);
  assert.equal(result.capEff,'0000000000000000');assert.equal(result.noNewPrivs,'1');
  assert.equal(JSON.parse(output.get('/output/progress.json')).phase,'COMPLETED');
});
