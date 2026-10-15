import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile,copyFile,rm,symlink,unlink} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {join} from 'node:path';
import {AGENT_ROOT} from '../src/skill-lock.mjs';
import {sha256} from '../src/files.mjs';

const root=AGENT_ROOT;
const converter=join(root,'scripts/m3-local-favicon.mjs');
const fixture=join(root,'scripts/m3-visual-test-fixture.py');
const py=join(root,'.venv-favicon/bin/python');
const exec=(bin,args)=>spawnSync(bin,args,{cwd:root,encoding:'utf8',timeout:25000,maxBuffer:65536});
const run=(...args)=>exec('node',[converter,...args]);
async function setup(t){
 const id='m3-local-favicon-test-'+randomUUID(),directory=join(root,'runs',id);
 await mkdir(directory,{recursive:true,mode:0o700});
 t.after(()=>rm(directory,{recursive:true,force:true}));
 await writeFile(join(directory,'manifest.json'),JSON.stringify({
   runId:id,stages:[{skill:'game-homepage-icon-research',status:'BLOCKED'}],
   inputs:{gameIdentity:'Offline Fixture Game'} }),{mode:0o600});
 let r=run('prepare',id);
 assert.equal(r.status,2,r.stderr);
 const request=JSON.parse(r.stdout);
 assert.equal(request.status,'AWAITING_APPROVED_SOURCE_PNG');
 const source=request.sourcePath;
 const built=exec('python3',[fixture,source]);
 assert.equal(built.status,0,built.stderr);
 const inspected=run('inspect',id);
 assert.equal(inspected.status,2,inspected.stderr);
 const detail=JSON.parse(inspected.stdout);
 assert.equal(detail.status,'AWAITING_EXPLICIT_USER_VISUAL_APPROVAL');
 return {id,directory,source,output:request.zipPath,detail};
}
async function approve(f){
 const r=run('approve',f.id,f.detail.sourceSha256,'I_CONFIRM_ORIGINAL_GENERATED_ARTWORK_AND_RIGHTS');
 assert.equal(r.status,0,r.stderr);
 assert.equal(JSON.parse(r.stdout).status,'APPROVED_SOURCE_READY');
}
test('local conversion is blocked until a real run-local approved PNG exists',async t=>{
 const id='m3-local-favicon-test-'+randomUUID(),directory=join(root,'runs',id);
 await mkdir(directory,{recursive:true,mode:0o700});
 t.after(()=>rm(directory,{recursive:true,force:true}));
 assert.equal(run('prepare',id).status,2,'Cannot invent a missing run manifest');
 const f=await setup(t);
 assert.notEqual(run('convert',f.id).status,0);
 assert.equal(run('approve',f.id,'0'.repeat(64),'I_CONFIRM_ORIGINAL_GENERATED_ARTWORK_AND_RIGHTS').status,2);
 assert.equal(run('convert',f.id).status,2);
});
test('isolated Pillow engine builds seven-file validated ZIP and 512px master-pixel match',async t=>{
 const f=await setup(t);
 await approve(f);
 const result=run('convert',f.id);
 assert.equal(result.status,0,result.stderr);
 const body=JSON.parse(result.stdout);
 assert.equal(body.status,'LOCAL_FAVICON_BINARY_VALIDATED');
 assert.equal(body.stageMayPass,false);
 assert.equal(body.faviconIoUsed,false);
 assert.equal(body.bskTransferUsed,false);
 assert.equal(body.pillowVersion,'12.3.0');
 assert.equal(body.sourceSha256,sha256(await readFile(f.source)));
 assert.equal(body.zipSha256,sha256(await readFile(f.output)));
 const validated=exec('python3',[join(root,'scripts/verify-favicon-package.py'),f.output]);
 assert.equal(validated.status,0,validated.stdout);
 const checked=exec('python3',[join(root,'scripts/m3-compare-favicon-pixels.py'),f.source,f.output]);
 assert.equal(checked.status,0,checked.stdout);
 const ico=exec(py,['-c',
  'from PIL import Image;import zipfile,io,sys;z=zipfile.ZipFile(sys.argv[1]);im=Image.open(io.BytesIO(z.read("favicon.ico")));print(sorted(im.ico.sizes()))',
  f.output]);
 assert.equal(ico.status,0,ico.stderr);
 assert.match(ico.stdout,/16, 16/);
 assert.match(ico.stdout,/32, 32/);
 assert.match(ico.stdout,/48, 48/);
 assert.equal(run('convert',f.id).status,2,'Never overwrite prior generated ZIP');
});
test('same approved master produces deterministic byte-identical ZIP across separate runs',async t=>{
 const first=await setup(t),second=await setup(t);
 await approve(first);await approve(second);
 const a=run('convert',first.id),b=run('convert',second.id);
 assert.equal(a.status,0,a.stderr);assert.equal(b.status,0,b.stderr);
 assert.equal(sha256(await readFile(first.output)),sha256(await readFile(second.output)));
});
test('altering source bytes after approval invalidates converter instead of silently generating',async t=>{
 const f=await setup(t);await approve(f);
 const master=await readFile(f.source);
 master[35]^=1;
 await writeFile(f.source,master);
 assert.equal(run('convert',f.id).status,2);
 const outputExists=await readFile(f.output).then(()=>true).catch(()=>false);
 assert.equal(outputExists,false);
});
test('linked input, bad path and unrelated run identities are rejected',async t=>{
 const f=await setup(t);
 await unlink(f.source);
 const outside=join(f.directory,'unapproved.png');
 assert.equal(exec('python3',[fixture,outside]).status,0);
 await symlink(outside,f.source);
 assert.equal(run('approve',f.id,f.detail.sourceSha256,'I_CONFIRM_ORIGINAL_GENERATED_ARTWORK_AND_RIGHTS').status,2);
 assert.equal(run('convert','../outside').status,2);
});
test('ZIP output path fails closed if occupied before conversion',async t=>{
 const f=await setup(t);await approve(f);
 await writeFile(f.output,'PREEXISTING_USER_BYTES',{flag:'wx'});
 assert.equal(run('convert',f.id).status,2);
 assert.equal((await readFile(f.output)).toString(),'PREEXISTING_USER_BYTES');
});
