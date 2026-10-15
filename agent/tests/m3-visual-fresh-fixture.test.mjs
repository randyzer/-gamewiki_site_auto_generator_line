import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {sha256} from '../src/files.mjs';
import {validateFaviconPng} from '../src/favicon-png.mjs';
import {AGENT_ROOT} from '../src/skill-lock.mjs';

test('drop-first creates a fresh bounded 512x512 RGBA TEST PNG for each new runId',async t=>{
 const directory=await mkdtemp(join(tmpdir(),'m3-drop-nonce-'));
 t.after(()=>rm(directory,{recursive:true,force:true}));
 const script=join(AGENT_ROOT,'scripts/m3-visual-test-fixture.py');
 const paths=[join(directory,'a.png'),join(directory,'b.png'),join(directory,'c.png')];
 const ids=['m3-favicon-drop-first-abc','m3-favicon-drop-first-def','m3-favicon-drop-first-abc'];
 for(const [i,path] of paths.entries()){
  const result=spawnSync('python3',[script,path,'--nonce',ids[i]],{
    encoding:'utf8',timeout:10000});
  assert.equal(result.status,0,result.stderr);
 }
 const bytes=await Promise.all(paths.map(p=>readFile(p)));
 for(const b of bytes)assert.equal(validateFaviconPng(b),true);
 assert.notEqual(sha256(bytes[0]),sha256(bytes[1]));
 assert.equal(sha256(bytes[0]),sha256(bytes[2]));
 assert.ok(bytes[0].length<8*1024*1024);
});
test('drop-first unique marker rejects invalid nonce and cannot overwrite an existing PNG',async t=>{
 const directory=await mkdtemp(join(tmpdir(),'m3-drop-nonce-'));
 t.after(()=>rm(directory,{recursive:true,force:true}));
 const script=join(AGENT_ROOT,'scripts/m3-visual-test-fixture.py');
 const f=join(directory,'same.png');
 assert.equal(spawnSync('python3',[script,f,'--nonce','valid-run']).status,0);
 assert.notEqual(spawnSync('python3',[script,f,'--nonce','valid-run']).status,0);
 assert.notEqual(spawnSync('python3',[script,join(directory,'other.png'),'--nonce','../escape']).status,0);
});
