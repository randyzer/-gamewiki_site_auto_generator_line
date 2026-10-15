import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,rm,realpath} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {sha256} from '../src/files.mjs';
import {createBskToolService} from '../src/bsk-tool-server.mjs';

const converter='https://favicon.io/favicon-converter/';
async function fixture(t) {
  const runDirectory=await realpath(await mkdtemp(join(tmpdir(),'m3-trusted-favicon-')));
  t.after(()=>rm(runDirectory,{recursive:true,force:true}));
  const nativeDirectory=join(runDirectory,'native');
  await mkdir(nativeDirectory,{recursive:true});
  const zip=join(runDirectory,'fixture.zip');
  const generated=spawnSync('python3',['tests/fixtures/favicon-binary-fixture.py',zip],{
    cwd:new URL('..',import.meta.url).pathname,timeout:10000});
  assert.equal(generated.status,0);
  const master=join(nativeDirectory,'master.png');
  const extract=spawnSync('python3',['-c',
    'import zipfile,sys;z=zipfile.ZipFile(sys.argv[1]);open(sys.argv[2],"wb").write(z.read("android-chrome-512x512.png"))',
    zip,master],{timeout:10000});
  assert.equal(extract.status,0);
  return {runDirectory,nativeDirectory,zip,master,download:join(nativeDirectory,'download.zip')};
}
function receipt(command) {
  return {approved:true,type:'bsk-command-approval',runId:command.runId,
    stage:command.stage,commandDigest:command.digest,approvedBy:'OFFLINE_TEST_USER',
    approvedAt:Date.now(),expiresAt:Date.now()+15000,
    executionId:randomUUID()};
}
function serviceFor(f,{enabled=true,approved=true,failUpload=false,failedEffect=null,dropFirst=false}={}) {
  const context={runId:'offline-m3-fixture',stage:'game-homepage-icon-research',
    runDirectory:f.runDirectory,nativeDirectory:f.nativeDirectory,
    inputs:{gameIdentity:'Offline test'}};
  const policy={schemaVersion:1,browserInstance:'offline-instance',atomicFileTransferSupported:enabled,
    allowedStages:['game-homepage-icon-research'],
    allowedPages:[{host:'favicon.io',pathPrefix:'/favicon-converter/',pathPattern:'^/favicon-converter/$'}]};
  let calls=0,uploadBytes;
  const service=createBskToolService({context,policy,
    identity:{executable:'/offline/bsk',sha256:'a'.repeat(64),version:'0.3.2'},
    allowFaviconTransfer:enabled,
    allowInitialFaviconDrop:dropFirst,initialDropSourcePath:dropFirst?f.master:null,
    approve:async cmd=>approved?receipt(cmd):null,
    execute:async cmd=>{
      calls++;
      if(cmd.intent==='create-agent-window')return{stdout:JSON.stringify({
        session_id:'owned',agent_window_id:1,browser_instance_id:'offline-instance'})};
      if(cmd.intent==='read-owned-tabs')return{stdout:JSON.stringify({
        tabs:[{scope:'agent',window_id:1,tab_id:2,url:'about:blank'}]})};
      if(cmd.intent==='read-public-page')return{stdout:JSON.stringify({tab_id:2,final_url:converter})};
      if(cmd.intent==='capture-public-page')return{stdout:JSON.stringify({value:{
        url:converter,readAllowed:true,sourceSchema:'FAVICON_PUBLIC_CONTROLS_V1',
        controls:[{kind:'upload',selector:'input[type="file"]'},
          {kind:'download',selector:'a[download]'}],
        chooserTrigger:null,
        dropTarget:{kind:'upload',selector:'[class*="dropzone"]'},
        inspection:{fileInputMatches:1,downloadSelectorMatches:1,
          chooserTriggerVerified:false,fileInputRendered:false,fileInputDisabled:false,
          clickableAncestorFound:false,nestedLabelCount:0,nestedButtonCount:0,
          dropzoneClassCount:1,uploadClassCount:1,
          dropzoneRendered:true,dropzoneContainsInput:true},
        body:'PRIVATE_IGNORED'}})};
      if(cmd.intent==='upload-favicon'){
        if(failUpload)throw Error('TRANSFER_FIXTURE_PRIVATE_TOKEN_MUST_NOT_LEAK');
        if(failedEffect&&cmd.argv[cmd.argv.indexOf('--mode')+1]==='input'){
          const e=Error('Native mocked input failure');
          e.safeBskReason='file_input_not_activated';
          e.safeEffectState=failedEffect;
          throw e;
        }
        uploadBytes=await readFile(cmd.argv[cmd.argv.indexOf('--file')+1]);
        return{stdout:'{"uploaded":true}'};
      }
      if(cmd.intent==='download-favicon'){
        assert.ok(uploadBytes);
        const path=cmd.argv[cmd.argv.indexOf('--out')+1];
        await writeFile(path,await readFile(f.zip));
        return{stdout:'{"downloaded":true}'};
      }
      if(cmd.intent==='close-owned-session')return{stdout:'{"closed":true}'};
      throw Error('UNEXPECTED_BROWSER_COMMAND');
    }});
  async function call(id,argv) {
    const reply=await service.handle({jsonrpc:'2.0',id:1,method:'tools/call',
      params:{name:'bsk_command',arguments:{requestId:id,argv}}});
    try{return JSON.parse(reply.result.content[0].text);}
    catch{return {status:'COMMAND_REJECTED'};}
  }
  return {service,call,get calls(){return calls},get uploadBytes(){return uploadBytes}};
}
test('isolated offline host enforces approved exact PNG upload + ZIP download + output SHA256',async t=>{
  const f=await fixture(t),host=serviceFor(f);
  const steps=[['start',['session','start']],['tabs',['tab','list']],
    ['navigate',['navigate',converter]],['observe',['observe']],
    ['upload',['upload','input[type="file"]','--file',f.master]],
    ['download',['download','a[download]','--out',f.download]],
    ['close',['session','stop']]];
  for(const [id,argv] of steps)assert.equal((await host.call(id,argv)).status,'COMPLETED',id);
  assert.equal(host.calls,7);
  assert.deepEqual(host.uploadBytes,await readFile(f.master));
  assert.deepEqual(await readFile(f.download),await readFile(f.zip));
  const verified=spawnSync('python3',['scripts/verify-favicon-package.py',f.download],
    {cwd:new URL('..',import.meta.url).pathname,encoding:'utf8',timeout:10000});
  assert.equal(verified.status,0,verified.stdout+' '+verified.stderr);
  assert.equal(JSON.parse(verified.stdout).provenanceVerified,false);
  const audit=JSON.parse(await readFile(join(f.runDirectory,'bsk-audit','download.json')));
  assert.equal(audit.outputSha256,sha256(await readFile(f.download)));
  assert.equal(audit.decision.status,'APPROVED');
});
test('without per-command approval no upload or download runs',async t=>{
  const f=await fixture(t),host=serviceFor(f,{approved:false});
  assert.equal((await host.call('start',['session','start'])).status,'COMMAND_NOT_APPROVED');
  assert.equal(host.calls,0);
});
test('browser file transfer is blocked by default even if a caller supplies a valid synthetic PNG',async t=>{
  const f=await fixture(t),host=serviceFor(f,{enabled:false});
  assert.equal((await host.call('start',['session','start'])).status,'COMPLETED');
  assert.equal((await host.call('tabs',['tab','list'])).status,'COMPLETED');
  assert.equal((await host.call('navigate',['navigate',converter])).status,'COMPLETED');
  assert.equal((await host.call('observe',['observe'])).status,'COMPLETED');
  const result=await host.call('upload',['upload','input[type="file"]','--file',f.master]);
  assert.notEqual(result.status,'COMPLETED');
  assert.equal(host.calls,4);
});
test('unknown upload selector is never passed to the browser executor',async t=>{
  const f=await fixture(t),host=serviceFor(f);
  for(const [id,argv] of [['start',['session','start']],['tabs',['tab','list']],
    ['nav',['navigate',converter]],['observe',['observe']]])
    assert.equal((await host.call(id,argv)).status,'COMPLETED');
  const result=await host.call('unknown-selector',['upload','input[name="private"]','--file',f.master]);
  assert.notEqual(result.status,'COMPLETED');
  assert.equal(host.calls,4);
});

test('browser upload failure returns only safe error enum and never exposes subprocess details',async t=>{
  const f=await fixture(t),host=serviceFor(f,{failUpload:true});
  for(const [id,argv] of [['start',['session','start']],['tabs',['tab','list']],
    ['nav',['navigate',converter]],['observe',['observe']]])
    assert.equal((await host.call(id,argv)).status,'COMPLETED');
  const result=await host.call('upload-failure',['upload','input[type="file"]','--file',f.master]);
  assert.equal(result.status,'DAEMON_UNREACHABLE');
  assert.equal(result.reasonCode,'TRANSFER_EXECUTION_FAILED_UNCLASSIFIED');
  assert.ok(!JSON.stringify(result).includes('PRIVATE_TOKEN_MUST_NOT_LEAK'));
  const audit=await readFile(join(f.runDirectory,'bsk-audit','upload-failure.json'),'utf8');
  assert.ok(!audit.includes('PRIVATE_TOKEN_MUST_NOT_LEAK'));
});

test('dropzone upload is forbidden unless bsk explicitly confirms file_input_not_activated and effect_state=none',async t=>{
  const f=await fixture(t),host=serviceFor(f,{failedEffect:'none'});
  for(const [id,argv] of [['start',['session','start']],['tabs',['tab','list']],
    ['nav',['navigate',converter]],['observe',['observe']]])
    assert.equal((await host.call(id,argv)).status,'COMPLETED');
  const drop=['upload','[class*="dropzone"]','--file',f.master];
  assert.equal((await host.call('unauthorized-drop',drop)).status,'COMMAND_REJECTED');
  const input=await host.call('failed-file-input',['upload','input[type="file"]','--file',f.master]);
  assert.equal(input.bskReason,'file_input_not_activated');
  assert.equal(input.effectState,'none');
  assert.equal((await host.call('one-shot-drop',drop)).status,'COMPLETED');
  assert.equal((await host.call('second-drop',drop)).status,'COMMAND_REJECTED');
});
test('unknown or committed bsk upload effect can NEVER authorize drop fallback',async t=>{
  for(const effect of ['unknown','committed']){
    const f=await fixture(t),host=serviceFor(f,{failedEffect:effect});
    for(const [id,argv] of [['start',['session','start']],['tabs',['tab','list']],
      ['nav',['navigate',converter]],['observe',['observe']]])
      assert.equal((await host.call(id,argv)).status,'COMPLETED');
    const prior=await host.call('failed-input-'+effect,['upload','input[type="file"]','--file',f.master]);
    assert.equal(prior.effectState,effect);
    assert.equal((await host.call('drop-'+effect,['upload','[class*="dropzone"]','--file',f.master])).status,'COMMAND_REJECTED');
  }
});

test('authorized drop may not replace the PNG path after an input failure',async t=>{
 const f=await fixture(t),host=serviceFor(f,{failedEffect:'none'});
 for(const [id,argv] of [['start',['session','start']],['tabs',['tab','list']],
   ['nav',['navigate',converter]],['observe',['observe']]])
   assert.equal((await host.call(id,argv)).status,'COMPLETED');
 const first=await host.call('failed-first-input',['upload','input[type="file"]','--file',f.master]);
 assert.equal(first.effectState,'none');
 const second=join(f.nativeDirectory,'other-master.png');
 await writeFile(second,await readFile(f.master));
 assert.equal((await host.call('different-file-drop',['upload','[class*="dropzone"]','--file',second])).status,'COMMAND_REJECTED');
 // Bad attempted drop consumes the once-only permission even if blocked.
 assert.equal((await host.call('original-after-bad-drop',['upload','[class*="dropzone"]','--file',f.master])).status,'COMMAND_REJECTED');
});

test('one-shot Drop cannot silently replace PNG bytes under the SAME file path',async t=>{
 const f=await fixture(t),host=serviceFor(f,{failedEffect:'none'});
 for(const [id,argv] of [['start',['session','start']],['tabs',['tab','list']],
   ['nav',['navigate',converter]],['observe',['observe']]])
   assert.equal((await host.call(id,argv)).status,'COMPLETED');
 const prior=await host.call('failed-for-sha',['upload','input[type="file"]','--file',f.master]);
 assert.equal(prior.effectState,'none');
 const rewrite=[
   'import zlib,struct,sys','p=sys.argv[1]','b=open(p,"rb").read()',
   'at=33','n=struct.unpack(">I",b[at:at+4])[0]',
   'original=b[at+8:at+8+n]','data=zlib.decompress(original)',
   'replacement=zlib.compress(data,9)',
   'header=struct.pack(">I",len(replacement))+b"IDAT"+replacement',
   'crc=struct.pack(">I",zlib.crc32(header[4:])&0xffffffff)',
   'new=b[:at]+header+crc+b[at+12+n:]','open(p,"wb").write(new)'
 ].join('\n');
 const mutated=spawnSync('python3',['-c',rewrite,f.master],{encoding:'utf8',timeout:10000});
 assert.equal(mutated.status,0,mutated.stderr);
 assert.equal((await host.call('same-file-different-bytes',['upload','[class*="dropzone"]','--file',f.master])).status,'COMMAND_REJECTED');
 assert.equal((await host.call('sha-fallback-retry',['upload','[class*="dropzone"]','--file',f.master])).status,'COMMAND_REJECTED');
});

test('drop-first: only one approved native drop with verified public target and exact PNG',async t=>{
  const f=await fixture(t),host=serviceFor(f,{dropFirst:true});
  for(const [id,argv] of [['start',['session','start']],['tabs',['tab','list']],
    ['nav',['navigate',converter]],['observe',['observe']]])
    assert.equal((await host.call(id,argv)).status,'COMPLETED');
  const initial=['upload','[class*="dropzone"]','--file',f.master];
  const first=await host.call('drop-first-once',initial);
  assert.equal(first.status,'COMPLETED');
  assert.deepEqual(host.uploadBytes,await readFile(f.master));
  const audit=JSON.parse(await readFile(join(f.runDirectory,'bsk-audit','drop-first-once.json')));
  assert.equal(audit.decision.status,'APPROVED');
  assert.equal(audit.command.intent,'upload-favicon');
  assert.equal(audit.command.inputSha256,sha256(await readFile(f.master)));
  assert.equal(audit.command.argv[audit.command.argv.indexOf('--mode')+1],'drop');
  assert.equal((await host.call('drop-first-again',initial)).status,'COMMAND_REJECTED');
});
test('drop-first: default host service rejects drop without user-approved fresh-mode opt-in',async t=>{
  const f=await fixture(t),host=serviceFor(f);
  for(const [id,argv] of [['start',['session','start']],['tabs',['tab','list']],
    ['nav',['navigate',converter]],['observe',['observe']]])
    assert.equal((await host.call(id,argv)).status,'COMPLETED');
  const result=await host.call('drop-default-denied',
    ['upload','[class*="dropzone"]','--file',f.master]);
  assert.equal(result.status,'COMMAND_REJECTED');
  assert.equal(host.uploadBytes,undefined);
});
test('drop-first: wrong PNG path rejects and consumes one-time option',async t=>{
  const f=await fixture(t),host=serviceFor(f,{dropFirst:true});
  const other=join(f.nativeDirectory,'other.png');
  await writeFile(other,await readFile(f.master));
  for(const [id,argv] of [['start',['session','start']],['tabs',['tab','list']],
    ['nav',['navigate',converter]],['observe',['observe']]])
    assert.equal((await host.call(id,argv)).status,'COMPLETED');
  assert.equal((await host.call('drop-wrong-source',
    ['upload','[class*="dropzone"]','--file',other])).status,'COMMAND_REJECTED');
  assert.equal((await host.call('drop-original-after-wrong',
    ['upload','[class*="dropzone"]','--file',f.master])).status,'COMMAND_REJECTED');
  assert.equal(host.uploadBytes,undefined);
});
test('drop-first: changed bytes at original path are rejected and cannot be retried',async t=>{
  const f=await fixture(t),host=serviceFor(f,{dropFirst:true});
  for(const [id,argv] of [['start',['session','start']],['tabs',['tab','list']],
    ['nav',['navigate',converter]],['observe',['observe']]])
    assert.equal((await host.call(id,argv)).status,'COMPLETED');
  const before=await readFile(f.master);
  before[before.length-15]^=1;
  await writeFile(f.master,before);
  assert.equal((await host.call('drop-tampered-original',
    ['upload','[class*="dropzone"]','--file',f.master])).status,'COMMAND_REJECTED');
  assert.equal(host.uploadBytes,undefined);
});
