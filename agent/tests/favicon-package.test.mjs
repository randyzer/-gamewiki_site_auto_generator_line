import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

const verifier=fileURLToPath(new URL('../scripts/verify-favicon-package.py',import.meta.url));
const fixture=fileURLToPath(new URL('./fixtures/favicon-binary-fixture.py',import.meta.url));
function run(args) {
  const result=spawnSync('python3',args,{encoding:'utf8',timeout:10000,maxBuffer:65536});
  if(result.error)throw result.error;
  return {exit:result.status,out:(result.stdout||'').trim()};
}
async function temporary(t) {
  const root=await mkdtemp(join(tmpdir(),'m3-zip-'));t.after(()=>rm(root,{recursive:true,force:true}));
  const zip=join(root,'fixture.zip');
  assert.equal(run([fixture,zip]).exit,0);
  return zip;
}
test('validated synthetic binary favicon package has no verified provenance',async t=>{
  const zip=await temporary(t),result=run([verifier,zip]);
  assert.equal(result.exit,0,result.out);
  const json=JSON.parse(result.out);
  assert.equal(json.status,'VALIDATED_BINARY_STRUCTURE');
  assert.equal(json.provenanceVerified,false);
  assert.equal(json.members.length,7);
});
test('reject structurally named ZIP containing nonimage placeholder data',async t=>{
  const zip=await temporary(t);
  const script='import zipfile,sys\nwith zipfile.ZipFile(sys.argv[1],"w") as z:\n for n in sys.argv[2:]:z.writestr(n,b"OFFLINE_TEST_PLACEHOLDER")';
  const members=['apple-touch-icon.png','favicon-32x32.png','favicon-16x16.png','favicon.ico','site.webmanifest','android-chrome-192x192.png','android-chrome-512x512.png'];
  assert.equal(run(['-c',script,zip,...members]).exit,0);
  assert.equal(run([verifier,zip]).exit,2);
});
test('reject duplicate or extra package members',async t=>{
  const zip=await temporary(t);
  for(const name of ['favicon.ico','extra.txt']){
    assert.equal(run([fixture,zip]).exit,0);
    assert.equal(run(['-c','import zipfile,sys\nwith zipfile.ZipFile(sys.argv[1],"a") as z:z.writestr(sys.argv[2],b"EXTRA_TEST")',zip,name]).exit,0);
    assert.equal(run([verifier,zip]).exit,2);
  }
});
test('reject wrong PNG dimensions and corrupted CRC',async t=>{
  const zip=await temporary(t);
  for(const mode of ['dimensions','crc']){
    assert.equal(run([fixture,zip]).exit,0);
    const change='import zipfile,sys,struct\np=sys.argv[1]\nwith zipfile.ZipFile(p) as z:entries={n:z.read(n) for n in z.namelist()}\nb=bytearray(entries["favicon-16x16.png"])\nif sys.argv[2]=="dimensions":b[16:20]=struct.pack(">I",17)\nelse:b[45]^=1\nentries["favicon-16x16.png"]=bytes(b)\nwith zipfile.ZipFile(p,"w") as z:\n for name,data in entries.items():z.writestr(name,data)';
    assert.equal(run(['-c',change,zip,mode]).exit,0);
    assert.equal(run([verifier,zip]).exit,2);
  }
});
test('reject archive with icon references missing from manifest',async t=>{
  const zip=await temporary(t);
  const change='import zipfile,sys\np=sys.argv[1]\nwith zipfile.ZipFile(p) as z:entries={n:z.read(n) for n in z.namelist()}\nentries["site.webmanifest"]=b"{\\"name\\":\\"fixture\\",\\"icons\\":[]}"\nwith zipfile.ZipFile(p,"w") as z:\n for name,data in entries.items():z.writestr(name,data)';
  assert.equal(run(['-c',change,zip]).exit,0);
  assert.equal(run([verifier,zip]).exit,2);
});
