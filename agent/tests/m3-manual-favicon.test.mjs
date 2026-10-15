import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFile,copyFile,rm,symlink,unlink,writeFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {AGENT_ROOT} from '../src/skill-lock.mjs';

const cli=join(AGENT_ROOT,'scripts','m3-manual-favicon.mjs');
const fixture=join(AGENT_ROOT,'tests','fixtures','favicon-binary-fixture.py');
const root=join(AGENT_ROOT,'runs');
const exec=(bin,args,timeout=12000)=>spawnSync(bin,args,{encoding:'utf8',cwd:AGENT_ROOT,timeout,maxBuffer:65536});
async function prepare(t){
  const created=exec('node',[cli,'prepare']);
  assert.equal(created.status,0,created.stderr);
  const data=JSON.parse(created.stdout);
  assert.match(data.runId,/^m3-manual-favicon-[a-f0-9-]{36}$/);
  assert.equal(data.status,'AWAITING_MANUAL_SITE_UPLOAD_AND_DOWNLOAD');
  const runDirectory=join(root,data.runId);
  t.after(()=>rm(runDirectory,{recursive:true,force:true}));
  return {...data,runDirectory};
}
test('manual upload test prepares a 512 RGBA PNG without claiming a site or brand result',async t=>{
  const data=await prepare(t);
  const manifest=JSON.parse(await readFile(join(data.runDirectory,'MANUAL_HANDOFF.json'),'utf8'));
  assert.equal(manifest.site,'https://favicon.io/favicon-converter/');
  assert.equal(manifest.stageMayPass,false);
  assert.equal(manifest.siteOriginAttested,false);
  assert.equal(manifest.browserSkillUploadUsed,false);
  assert.equal(manifest.sourceSha256,data.sourceSha256);
});
test('manual ZIP remains awaiting until a user places a file at its exact path',async t=>{
  const data=await prepare(t);
  const result=exec('node',[cli,'verify',data.runId]);
  assert.equal(result.status,2);
  assert.match(result.stderr,/M3_AWAITING_MANUAL_DOWNLOADED_ZIP/);
});
test('a valid synthetic offline ZIP passes structure only; origin remains false',async t=>{
  const data=await prepare(t);
  const mockZip=join(data.runDirectory,'synthetic-local-not-from-site.zip');
  const generated=exec('python3',[fixture,mockZip]);
  assert.equal(generated.status,0);
  await copyFile(mockZip,data.outputFile);
  const verified=exec('node',[cli,'verify',data.runId]);
  assert.equal(verified.status,0,verified.stderr);
  const result=JSON.parse(verified.stdout);
  assert.equal(result.zipBinaryStructureValidated,true);
  assert.equal(result.siteOriginVerified,false);
  assert.equal(result.manualSiteActionAttested,false);
  assert.equal(result.stageMayPass,false);
  assert.match(result.downloadSha256,/^[a-f0-9]{64}$/);
});
test('manual ZIP must be valid, and symlinked downloads never accepted',async t=>{
  const data=await prepare(t);
  await writeFile(data.outputFile,'FAKE ZIP');
  const bad=exec('node',[cli,'verify',data.runId]);
  assert.equal(bad.status,2);
  assert.equal(JSON.parse(bad.stdout).zipBinaryStructureValidated,false);
  await unlink(data.outputFile);
  const mockZip=join(data.runDirectory,'out-of-output.zip');
  assert.equal(exec('python3',[fixture,mockZip]).status,0);
  await symlink(mockZip,data.outputFile);
  const linked=exec('node',[cli,'verify',data.runId]);
  assert.equal(linked.status,2);
  assert.match(linked.stderr,/M3_MANUAL_WORKFLOW_UNAVAILABLE/);
});
