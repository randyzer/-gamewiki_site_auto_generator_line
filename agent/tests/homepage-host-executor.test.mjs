import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fixture } from './helpers.mjs';
import { createSkillExecutor } from '../src/skill-executor.mjs';
import { STAGE } from '../src/stages.mjs';
import { snapshotSiteEvidence } from '../src/site-evidence.mjs';

const waiting = key => ({ status: 'WAITING_FOR_USER', artifacts: [], evidence: ['synthetic waiting'], missing_inputs: [key] });
const blocked = { status: 'BLOCKED', artifacts: [], evidence: ['synthetic native review incomplete'], missing_inputs: [] };
async function setup(t) {
  const f = await fixture(t), runId = 'homepage-host', runDirectory = join(f.root,'runs',runId);
  const context = { runId, runDirectory, outputDirectory: join(runDirectory,'artifacts/0/1'),
    inputs: { ...f.inputs, projectPath: join(f.root,'site') }, requiredArtifacts: [], mode: 'audit-only',
    skillLock: { source: join(f.root,'skills',STAGE.HOMEPAGE_RESEARCH+'.md') }, permissions: { siteWrites: false } };
  return { ...f, context, requestPath: join(runDirectory,'homepage-sources/FETCH_REQUEST.json'), iconDirectory: join(runDirectory,'homepage-icon') };
}
async function captured(context) {
  const directory = join(context.runDirectory,'homepage-sources/captures');await mkdir(directory,{recursive:true});
  const manifestPath = join(directory,'CAPTURES.json');await writeFile(manifestPath,'{"captures":[]}');
  return { ...await snapshotSiteEvidence(directory), manifestPath };
}
test('homepage plans offline without G0, then host captures once and reuses the same offline worker',async t=>{
  const f=await setup(t);let workers=0,captures=0;
  const forbidden=()=>assert.fail('G0 must not be called');
  const execute=createSkillExecutor({browserHumanDialog:false,requestBrowserLaunch:forbidden,collectBrowserEvidence:forbidden,
    inspectHomepageReadiness:forbidden,collectHomepageSourceEvidence:forbidden,collectHomepageMediaEvidence:forbidden,
    captureHomepageSources:async context=>{captures++;assert.equal(context.requestPath,f.requestPath);
      assert.equal(JSON.parse(await readFile(context.requestPath))[0].purpose,'verify facts');return captured(context);},
    run:async(_c,args,options)=>{
      workers++;const context=JSON.parse(options.input.split('Task context: ')[1].split('\n')[0]);
      assert.match(args.join(' '),/network=\{enabled=false\}/);assert.match(options.input,/Do not invoke bsk/);
      const profile=args.find(value=>value.startsWith('permissions.agent-worker='));
      assert.ok(profile.includes(JSON.stringify(f.requestPath)+'="write"'));
      assert.ok(!profile.includes(JSON.stringify(join(f.context.runDirectory,'homepage-sources'))+'="write"'));
      if(workers===1){assert.equal(context.homepageSourceCaptures,undefined);assert.ok(options.input.includes(f.requestPath));
        await writeFile(f.requestPath,JSON.stringify([{url:'https://example.com/game',purpose:'verify facts'}]));}
      else {assert.ok(context.homepageSourceCaptures.files.length);assert.ok(profile.includes(JSON.stringify(context.homepageSourceCaptures.directory)+'="read"'));
        assert.ok(!profile.includes(JSON.stringify(context.homepageSourceCaptures.directory)+'="write"'));}
      await writeFile(args[args.indexOf('--output-last-message')+1],JSON.stringify(workers===1?waiting('homepageSourceCaptures'):blocked));
    }});
  assert.equal((await execute(STAGE.HOMEPAGE_RESEARCH,f.context)).status,'BLOCKED');assert.equal(workers,2);assert.equal(captures,1);
});
for(const order of [['homepageSourceCaptures','faviconIoManualZip'],['faviconIoManualZip','homepageSourceCaptures']]){
  test('homepage retries at most three worker calls for '+order.join(' then '),async t=>{
    const f=await setup(t);let workers=0,captures=0,icons=0;
    const execute=createSkillExecutor({captureHomepageSources:async context=>{captures++;return captured(context);},
      convertIcon:async request=>{icons++;await writeFile(join(request.iconDirectory,'favicon_io.zip'),'synthetic zip');return{sha256:'a'.repeat(64)};},
      run:async(_c,args)=>{
        workers++;if(workers<=2){await writeFile(f.requestPath,'[{"url":"https://example.com/game","purpose":"verify"}]');await writeFile(join(f.iconDirectory,'icon-master.png'),'synthetic master');}
        await writeFile(args[args.indexOf('--output-last-message')+1],JSON.stringify(workers<=2?waiting(order[workers-1]):blocked));
      }});
    const result=await execute(STAGE.HOMEPAGE_RESEARCH,f.context);assert.equal(result.status,'BLOCKED');
    assert.equal(workers,3);assert.equal(captures,1);assert.equal(icons,1);
  });
}
test('repeated capture requests cannot cause unbounded workers or browser retries',async t=>{
  const f=await setup(t);let workers=0,captures=0;
  const execute=createSkillExecutor({captureHomepageSources:async context=>{captures++;return captured(context);},run:async(_c,args)=>{
    workers++;await writeFile(f.requestPath,'[{"url":"https://example.com/game","purpose":"verify"}]');
    await writeFile(args[args.indexOf('--output-last-message')+1],JSON.stringify(waiting('homepageSourceCaptures')));
  }});
  assert.equal((await execute(STAGE.HOMEPAGE_RESEARCH,f.context)).status,'WAITING_FOR_USER');assert.equal(workers,2);assert.equal(captures,1);
});
test('host capture failure waits with sanitized reason and concrete request path without a worker retry',async t=>{
  const f=await setup(t);let workers=0;
  const execute=createSkillExecutor({captureHomepageSources:async()=>{throw Error('FETCH_REQUEST_INVALID: password=private-fixture');},run:async(_c,args)=>{
    workers++;await writeFile(f.requestPath,'{}');await writeFile(args[args.indexOf('--output-last-message')+1],JSON.stringify(waiting('homepageSourceCaptures')));
  }});
  const result=await execute(STAGE.HOMEPAGE_RESEARCH,f.context);assert.equal(result.status,'WAITING_FOR_USER');assert.equal(workers,1);
  assert.ok(result.evidence.join(' ').includes(f.requestPath));assert.match(result.evidence.join(' '),/FETCH_REQUEST_INVALID/);assert.doesNotMatch(result.evidence.join(' '),/private-fixture/);
});
test('homepage capture SHA256 is checked after the retrying worker',async t=>{
  const f=await setup(t);let workers=0,path;
  const execute=createSkillExecutor({captureHomepageSources:async context=>{const bundle=await captured(context);path=bundle.manifestPath;return bundle;},run:async(_c,args)=>{
    workers++;if(workers===1)await writeFile(f.requestPath,'[]');else await writeFile(path,'{"forged":true}');
    await writeFile(args[args.indexOf('--output-last-message')+1],JSON.stringify(workers===1?waiting('homepageSourceCaptures'):blocked));
  }});
  await assert.rejects(execute(STAGE.HOMEPAGE_RESEARCH,f.context),/HOST_EVIDENCE_CHANGED/);assert.equal(workers,2);
});
test('both repeated handoff keys together still allow each host operation only once',async t=>{
  const f=await setup(t);let workers=0,captures=0,icons=0;
  const execute=createSkillExecutor({captureHomepageSources:async context=>{captures++;return captured(context);},
    convertIcon:async()=>{icons++;return{sha256:'a'.repeat(64)};},run:async(_c,args)=>{
      workers++;await writeFile(f.requestPath,'[]');await writeFile(join(f.iconDirectory,'icon-master.png'),'synthetic');
      await writeFile(args[args.indexOf('--output-last-message')+1],JSON.stringify({...waiting('homepageSourceCaptures'),missing_inputs:['homepageSourceCaptures','faviconIoManualZip']}));
    }});
  const result=await execute(STAGE.HOMEPAGE_RESEARCH,f.context);
  assert.equal(result.status,'WAITING_FOR_USER');assert.equal(workers,2);assert.equal(captures,1);assert.equal(icons,1);
});
test('a claimed homepage success before any capture is rejected as missing evidence',async t=>{
  const f=await setup(t);
  const execute=createSkillExecutor({run:async(_c,args)=>{
    await writeFile(args[args.indexOf('--output-last-message')+1],JSON.stringify({status:'PASSED',artifacts:[],evidence:['unverified claim'],missing_inputs:[]}));
  }});
  const result=await execute(STAGE.HOMEPAGE_RESEARCH,f.context);
  assert.equal(result.status,'WAITING_FOR_USER');assert.deepEqual(result.missing_inputs,['homepageSourceCaptures']);
});
