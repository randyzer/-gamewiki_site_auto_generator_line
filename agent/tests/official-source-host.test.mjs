import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, readFile, rm, writeFile, chmod } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import { AGENT_ROOT } from '../src/skill-lock.mjs';
import { publicPageCapture } from '../src/bsk-command-gate.mjs';
import { STAGE } from '../src/stages.mjs';
import { syntheticSourceOwnershipReview } from './helpers.mjs';

async function fixture(t) {
  const runId = 'TEST-official-source-' + randomUUID(), runDirectory = join(AGENT_ROOT, 'runs', runId);
  const nativeDirectory = join(runDirectory, 'native'); await mkdir(nativeDirectory, { recursive: true });
  t.after(() => rm(runDirectory, { recursive: true, force: true }));
  return { runId, runDirectory, nativeDirectory, stage: STAGE.HOMEPAGE_RESEARCH,
    inputs: { gameIdentity: 'SYNTHETIC app', gameMetadata: { steamAppId: '431960', steam: 'https://store.steampowered.com/app/431960/' } } };
}
const approve = async command => ({ approved: true, type: 'bsk-command-approval', runId: command.runId,
  stage: command.stage, commandDigest: command.digest, approvedBy: 'SYNTHETIC TEST',
  approvedAt: Date.now(), expiresAt: Date.now()+10000, executionId: randomUUID() });
const verifyIdentity = async policy => ({ executable: policy.executable, version: policy.version, sha256: policy.sha256 });

test('official public article capture falls back to document title when h1 is whitespace', () => {
  const url = 'https://official.invalid/help/';
  const policy = {
    publicSources: [{ url }],
    allowedPages: [{ host: 'official.invalid', pathPrefix: '/help/', queryKeys: [] }],
    game: { name: 'SYNTHETIC app', steamAppId: '431960', steamUrl: 'https://store.steampowered.com/app/431960/' }
  };
  const nodes = values => values.map(textContent => ({ textContent }));
  const root = {
    querySelector: selector => selector === 'h1' ? { textContent: '  \n ' } : null,
    querySelectorAll(selector) {
      if (selector === 'h2, h3') return nodes(['Features']);
      if (selector === 'p') return nodes(['Public product description.']);
      return [];
    }
  };
  const document = {
    title: 'SYNTHETIC product',
    querySelector: selector => selector === 'main' ? root : null
  };
  const capture = runInNewContext(publicPageCapture(policy), {
    URL,
    location: { href: url },
    document
  });
  assert.equal(capture.readAllowed, true);
  assert.equal(capture.sourceSchema, 'OFFICIAL_PUBLIC_ARTICLE_V1');
  assert.equal(capture.content.title, 'SYNTHETIC product');
  assert.deepEqual([...capture.content.paragraphs], ['Public product description.']);
});

test('run-owned source index requires genuine matching ownership proofs and detects evidence drift', async t => {
  const { inspectOfficialSourceIndex } = await import('../src/official-source-host.mjs');
  const context = await fixture(t);
  await assert.rejects(inspectOfficialSourceIndex(context), /OFFICIAL_SOURCE_INDEX_UNAVAILABLE/);
  const target = { url: 'https://official.invalid/help/', sourceType: 'OFFICIAL_HELP',
    gameIdentity: context.inputs.gameIdentity };
  const ownershipReview = await syntheticSourceOwnershipReview(context, target);
  const index = { kind: 'HOST_OFFICIAL_SOURCE_INDEX_V1', runId: context.runId,
    gameIdentity: context.inputs.gameIdentity, sources: [{ target, ownershipReview }] };
  const path = join(context.runDirectory, 'source-ownership-reviews/SOURCE_INDEX.json');
  await writeFile(path, JSON.stringify(index));
  assert.deepEqual((await inspectOfficialSourceIndex(context)).sources[0].target, target);
  const review = JSON.parse(await readFile(ownershipReview.path));
  await chmod(review.evidence[0].path, 0o600);
  await writeFile(review.evidence[0].path, 'CHANGED SOURCE OWNERSHIP EVIDENCE');
  await assert.rejects(inspectOfficialSourceIndex(context), /OWNERSHIP_UNVERIFIED/);
});

test('official labels alone cannot authorize source ownership or start browser commands', async t => {
  const { collectTrustedOfficialSources }=await import('../src/official-source-host.mjs');
  const context=await fixture(t);let calls=0;
  const result=await collectTrustedOfficialSources(context,{targets:[{
    url:'https://official.invalid/help/',sourceType:'OFFICIAL_HELP',gameIdentity:context.inputs.gameIdentity}],
    approve:async()=>{calls++;return null;},execute:async()=>{calls++;},
    verifyIdentity:async policy=>{calls++;return verifyIdentity(policy);}});
  assert.equal(result.status,'BLOCKED');assert.equal(result.code,'OFFICIAL_SOURCE_OWNERSHIP_UNVERIFIED');
  assert.equal(calls,0);
});

test('source ownership review cannot be substituted across URL or game scope', async t => {
  const { collectTrustedOfficialSources }=await import('../src/official-source-host.mjs');
  const context=await fixture(t);let calls=0;
  const target={url:'https://official.invalid/help/',sourceType:'OFFICIAL_HELP',gameIdentity:context.inputs.gameIdentity};
  const proof=await syntheticSourceOwnershipReview(context,{...target,url:'https://different.invalid/'});
  const result=await collectTrustedOfficialSources(context,{targets:[target],reviewSourceOwnership:async()=>proof,
    verifyIdentity:async policy=>{calls++;return verifyIdentity(policy);},approve,execute:async()=>{calls++;}});
  assert.equal(result.code,'OFFICIAL_SOURCE_OWNERSHIP_UNVERIFIED');assert.equal(calls,0);
});

test('ownership backing evidence drift invalidates an otherwise intact source bundle', async t => {
  const { inspectOfficialSourceEvidence }=await import('../src/official-source-host.mjs');
  const { syntheticOfficialSources }=await import('./helpers.mjs');
  const { writeFile,chmod }=await import('node:fs/promises');
  const context=await fixture(t),result=await syntheticOfficialSources(context);
  await inspectOfficialSourceEvidence(context,result);
  const source=JSON.parse(await readFile(result.path)).sources[0];
  const review=JSON.parse(await readFile(source.ownershipReview.path));
  await chmod(review.evidence[0].path,0o600);await writeFile(review.evidence[0].path,'CHANGED SYNTHETIC');
  await assert.rejects(inspectOfficialSourceEvidence(context,result),/OFFICIAL_SOURCE_OWNERSHIP_UNVERIFIED/);
});

test('ownership review cannot be loaded from a worker-writable artifact path', async t => {
  const { collectTrustedOfficialSources }=await import('../src/official-source-host.mjs');
  const { writeFile }=await import('node:fs/promises');
  const context=await fixture(t);let calls=0;
  const target={url:'https://official.invalid/help/',sourceType:'OFFICIAL_HELP',gameIdentity:context.inputs.gameIdentity};
  const proof=await syntheticSourceOwnershipReview(context,target),path=join(context.nativeDirectory,'forged-review.json');
  await writeFile(path,await readFile(proof.path));
  const result=await collectTrustedOfficialSources(context,{targets:[target],reviewSourceOwnership:async()=>({...proof,path}),
    verifyIdentity:async policy=>{calls++;return verifyIdentity(policy);},approve:async()=>null,execute:async()=>{calls++;}});
  assert.equal(result.code,'OFFICIAL_SOURCE_OWNERSHIP_UNVERIFIED');assert.equal(calls,0);
});

test('unknown redirects and missing approval provenance cannot become official source evidence', async t => {
  const { inspectOfficialSourceEvidence }=await import('../src/official-source-host.mjs');
  const { syntheticOfficialSources }=await import('./helpers.mjs');
  const { writeFile, chmod }=await import('node:fs/promises');
  const { sha256 }=await import('../src/files.mjs');
  const ctx=await fixture(t),proof=await syntheticOfficialSources(ctx);
  await inspectOfficialSourceEvidence(ctx,proof);
  const report=JSON.parse(await readFile(proof.path));
  report.sources[0].finalUrl='https://private.invalid/account/';
  await chmod(proof.path,0o600);const changed=JSON.stringify(report);await writeFile(proof.path,changed);
  await assert.rejects(inspectOfficialSourceEvidence(ctx,{...proof,sha256:sha256(changed)}),/EVIDENCE_INVALID/);
});

test('missing official source target capability blocks before browser or approval calls', async t => {
  const { collectTrustedOfficialSources } = await import('../src/official-source-host.mjs');
  const context = await fixture(t); let calls = 0;
  const r = await collectTrustedOfficialSources(context, { approve: async()=>{calls++;}, execute: async()=>{calls++;} });
  assert.equal(r.status, 'BLOCKED'); assert.equal(r.code, 'OFFICIAL_SOURCE_TARGETS_NOT_CONFIGURED');
  assert.equal(calls, 0);
});

test('official article collection reuses exact per-command approvals, filters private extras and binds source provenance', async t => {
  const { collectTrustedOfficialSources } = await import('../src/official-source-host.mjs');
  const context = await fixture(t), url = 'https://official.invalid/help/compatibility/', intents = [];
  const targets = [{ url, sourceType: 'OFFICIAL_HELP', gameIdentity: context.inputs.gameIdentity }];
  const r = await collectTrustedOfficialSources(context, { targets, approve, verifyIdentity,
    reviewSourceOwnership:target=>syntheticSourceOwnershipReview(context,target), execute: async command => {
    intents.push(command.intent);
    if(command.intent==='create-agent-window')return{stdout:JSON.stringify({session_id:'owned',agent_window_id:7,browser_instance_id:'8cf1a2f8'})};
    if(command.intent==='read-owned-tabs')return{stdout:JSON.stringify({tabs:[{tab_id:8,scope:'agent',window_id:7,url:'about:blank'}]})};
    if(command.intent==='read-public-page')return{stdout:JSON.stringify({tab_id:8,final_url:url})};
    if(command.intent==='capture-public-page')return{stdout:JSON.stringify({value:{sourceSchema:'OFFICIAL_PUBLIC_ARTICLE_V1',
      url,readAllowed:true,content:{title:'SYNTHETIC compatibility',paragraphs:['SYNTHETIC public facts'],headings:['SYNTHETIC section'],
        cookies:'PRIVATE_DROP',account:'PRIVATE_DROP'},storage:'PRIVATE_DROP'}})};
    return{stdout:'owned stopped'};
  } });
  assert.equal(r.status, 'EVIDENCE_READY'); assert.equal(r.countsAsStageArtifact, false);
  assert.deepEqual(intents,['create-agent-window','read-owned-tabs','read-public-page','capture-public-page','close-owned-session']);
  const report=JSON.parse(await readFile(r.path));
  assert.equal(report.sources[0].url,url); assert.equal(report.sources[0].finalUrl,url);
  assert.equal(report.sources[0].sourceType,'OFFICIAL_HELP');
  assert.match(report.sources[0].evidenceSha256,/^[a-f0-9]{64}$/);
  assert.equal(report.sources[0].approvedCommands.length,2);
  assert.doesNotMatch(JSON.stringify(report),/PRIVATE_DROP|cookies|storage/);
});

test('official source denial never calls tools or uses a replacement service', async t => {
  const { collectTrustedOfficialSources } = await import('../src/official-source-host.mjs');
  const context=await fixture(t);let calls=0;
  const r=await collectTrustedOfficialSources(context,{targets:[{url:'https://official.invalid/help/',sourceType:'OFFICIAL_HELP',gameIdentity:context.inputs.gameIdentity}],
    reviewSourceOwnership:target=>syntheticSourceOwnershipReview(context,target),
    verifyIdentity,approve:async()=>null,execute:async()=>{calls++;}});
  assert.equal(r.status,'BLOCKED');assert.equal(calls,0);
});
