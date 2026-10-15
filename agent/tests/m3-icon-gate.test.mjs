import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,rm,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {iconStageReadiness,quarantineMasterCandidate,verifyCandidateFaviconZip} from '../src/m3-icon-gate.mjs';

const fixture=fileURLToPath(new URL('./fixtures/favicon-binary-fixture.py',import.meta.url));
async function setup(t) {
  const root=await (await import('node:fs/promises')).realpath(await mkdtemp(join(tmpdir(),'m3-gate-')));
  t.after(()=>rm(root,{recursive:true,force:true}));
  const runId='m3-offline-fixture',incoming=join(root,'runs',runId,'incoming');
  await mkdir(incoming,{recursive:true});
  const zip=join(incoming,'synthetic-fixture.zip');
  const created=spawnSync('python3',[fixture,zip],{timeout:10000});
  assert.equal(created.status,0);
  const png=join(incoming,'synthetic-master.png');
  const unbundle=spawnSync('python3',['-c',
    'import zipfile,sys\nwith zipfile.ZipFile(sys.argv[1]) as z:open(sys.argv[2],"wb").write(z.read("android-chrome-512x512.png"))',
    zip,png],{timeout:10000});
  assert.equal(unbundle.status,0);
  return {root,runId,incoming,zip,png};
}
test('M3 capability preflight blocks when verified image generation and atomic favicon transfer are missing',async()=>{
  const status=await iconStageReadiness();
  assert.equal(status.status,'BLOCKED');
  assert.ok(status.blockers.includes('IMAGE_GENERATION_CALLBACK_UNAVAILABLE'));
  assert.ok(status.blockers.includes('FAVICON_ATOMIC_TRANSFER_NOT_VERIFIED'));
  assert.equal(status.stageMayPass,false);
});
test('synthetic 512 RGBA PNG can only be quarantined for visual review, never accepted as original artwork',async t=>{
  const f=await setup(t);
  const got=await quarantineMasterCandidate(fixtureArgs(f));
  assert.equal(got.status,'PENDING_MANUAL_VISUAL_REVIEW');
  assert.equal(got.sourceToolVerified,false);
  assert.equal(got.stageMayPass,false);
  assert.deepEqual(await readFile(got.path),await readFile(f.png));
  assert.deepEqual(await quarantineMasterCandidate(fixtureArgs(f)),got);
});
function fixtureArgs(f){return {runId:f.runId,sourcePath:f.png,root:f.root};}
test('M3 refuses files outside incoming, linked source, or a malformed image',async t=>{
  const f=await setup(t);
  await assert.rejects(quarantineMasterCandidate({...fixtureArgs(f),sourcePath:f.zip}),/M3_INPUT_PATH_OUTSIDE_INCOMING|PNG/);
  const link=join(f.incoming,'linked-master.png');
  await symlink(f.png,link);
  await assert.rejects(quarantineMasterCandidate({...fixtureArgs(f),sourcePath:link}),/Linked path/);
  const corrupt=join(f.incoming,'invalid-master.png');
  await writeFile(corrupt,'NOT_AN_IMAGE');
  await assert.rejects(quarantineMasterCandidate({...fixtureArgs(f),sourcePath:corrupt}),/PNG/);
});
test('structurally valid synthetic ZIP remains unverified favicon.io origin and never enters pipeline',async t=>{
  const f=await setup(t);
  const got=await verifyCandidateFaviconZip({runId:f.runId,zipPath:f.zip,root:f.root});
  assert.equal(got.status,'VALIDATED_BINARY_STRUCTURE');
  assert.equal(got.claimedFaviconIoOriginVerified,false);
  assert.equal(got.stageMayPass,false);
  await writeFile(f.zip,'NOT_A_ZIP');
  await assert.rejects(verifyCandidateFaviconZip({runId:f.runId,zipPath:f.zip,root:f.root}));
});
