import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fixture } from './helpers.mjs';
import { STAGE } from '../src/stages.mjs';
import { createSkillExecutor } from '../src/skill-executor.mjs';
import { snapshotSiteEvidence } from '../src/site-evidence.mjs';

const api = await import('../src/prelaunch-host.mjs').catch(() => ({}));
async function setup(t) {
  const f = await fixture(t), runId = 'prelaunch-host', runDirectory = join(f.configuration.workspace,'runs',runId);
  const projectPath = join(f.root, 'site'); await mkdir(projectPath); await mkdir(runDirectory,{recursive:true});
  const path = join(runDirectory,'ROUTE_PUBLICATION_MANIFEST.json');
  await writeFile(path, JSON.stringify({kind:'ROUTE_PUBLICATION_MANIFEST_V1',schemaVersion:1,
    runId,gameIdentity:f.inputs.gameIdentity,siteRevision:f.inputs.siteRevision,domain:f.inputs.domain,
    researchHandoffSha256:null,pages:[
      {route:'/',disposition:'PUBLISH',noindexRequired:false},
      {route:'/guide',disposition:'PUBLISH',noindexRequired:false},
      {route:'/draft',disposition:'DRAFT_ONLY',noindexRequired:true}],
    counts:{publish:2,draftOnly:1,omit:0}}));
  await writeFile(join(projectPath,'package.json'),JSON.stringify({scripts:{typecheck:'tsc',test:'test',build:'next build'}}));
  await writeFile(join(projectPath,'pnpm-lock.yaml'),'locked');
  return {...f, context:{runId,runDirectory,inputs:{...f.inputs,projectPath},mode:'audit-only',requiredArtifacts:[],
    outputDirectory:join(runDirectory,'artifacts/5/1'),permissions:{siteWrites:false},
    skillLock:{source:join(f.root,'skills',STAGE.PRELAUNCH_ACCEPTANCE+'.md')},
    upstream:[{skill:STAGE.CONTENT_INTEGRATION,artifacts:[{kind:'ROUTE_PUBLICATION_MANIFEST.json',path}]}]}};
}
function dependencies() {
  const shots=[],requests=[],commands=[]; let browserClosed=0,contextsClosed=0;
  const fetchUrl=async target=>{
    requests.push(target);const path=new URL(target).pathname;
    return {status:path==='/missing'?404:200,headers:new Headers({'content-type':path.includes('xml')?'application/xml':'text/html'}),
      text:async()=>path==='/sitemap.xml'?'<urlset><url><loc>https://fixture.test/sitemap-only</loc></url><url><loc>https://offsite.invalid/external</loc></url></urlset>':
        path==='/linked'?'<a href="/deep">Deep</a>':'',body:{cancel:async()=>{}}};
  };
  const launchBrowser=async()=>({newContext:async({viewport})=>({
    newPage:async()=>{
      const handlers={};return {on:(name,callback)=>{handlers[name]=callback;},
        goto:async(target,options)=>{assert.equal(options.timeout,30000);handlers.console?.({type:()=> 'error',text:()=> 'fixture console'});
          handlers.pageerror?.(Error('fixture page error'));handlers.requestfailed?.({url:()=>target+'/failed',method:()=> 'GET',failure:()=>({errorText:'fixture request failure'})});
          return {status:()=>200};},
        evaluate:async()=>['/linked','/missing','https://offsite.invalid/no'],
        screenshot:async options=>{assert.equal(options.fullPage,true);shots.push({width:viewport.width,path:options.path});await writeFile(options.path,'synthetic screenshot');}};
    },close:async()=>{contextsClosed++;}}),close:async()=>{browserClosed++;}});
  return {options:{url:'http://127.0.0.1:32111',fetchUrl,launchBrowser,run:async(command,args)=>{commands.push([command,...args]);
    if(args.includes('test'))throw Object.assign(Error('password=private-fixture'),{exitCode:2});return{exitCode:0};}},shots,requests,commands,
    closed:()=>({browserClosed,contextsClosed})};
}
test('prelaunch unions published and same-site sitemap pages, screenshots all sizes and preserves browser errors',async t=>{
  const f=await setup(t),d=dependencies();const result=await api.collectPrelaunch(f.context,d.options);
  assert.deepEqual(result.routes,['/','/guide','/draft','/sitemap-only']);
  const data=JSON.parse(await readFile(result.evidencePath));
  assert.equal(data.pages.length,4);assert.deepEqual(data.coverage,{routes_expected:4,routes_checked:4});
  assert.deepEqual(d.shots.map(s=>s.width),[1440,390,360,768,1440,390,360,768,1440,390,1440,390]);
  assert.equal(data.pages[0].viewports[0].status,200);assert.ok(data.pages[0].viewports[0].consoleErrors.length);
  assert.ok(data.pages[0].viewports[0].pageErrors.length);assert.ok(data.pages[0].viewports[0].failedRequests.length);
  assert.ok(data.routePublication.violations.some(item=>item.code==='DRAFT_NOINDEX_UNPROVEN'));
  assert.ok(data.routePublication.violations.some(item=>item.code==='SITEMAP_UNDECLARED_ROUTE'));
  assert.equal(d.closed().browserClosed,1);assert.equal(d.closed().contextsClosed,12);
});
test('prelaunch proves an isolated noindex draft and exact public sitemap without violations',async t=>{
  const f=await setup(t),shots=[];
  const fetchUrl=async target=>{
    const path=new URL(target).pathname;
    const text=path==='/sitemap.xml'
      ? '<urlset><url><loc>https://fixture.test/</loc></url><url><loc>https://fixture.test/guide</loc></url></urlset>'
      : path==='/draft' ? '<html><head><meta name="robots" content="noindex,nofollow"></head></html>' : '<html></html>';
    return {status:200,headers:new Headers({'content-type':path.includes('xml')?'application/xml':'text/html'}),
      text:async()=>text,body:{cancel:async()=>{}}};
  };
  const launchBrowser=async()=>({newContext:async({viewport})=>({newPage:async()=>({on:()=>{},
    goto:async()=>({status:()=>200}),evaluate:async()=>[],screenshot:async({path})=>{shots.push(viewport.width);await writeFile(path,'shot');}}),close:async()=>{}}),close:async()=>{}});
  const result=await api.collectPrelaunch(f.context,{url:'http://127.0.0.1:32111',fetchUrl,launchBrowser,run:async()=>({exitCode:0})});
  const data=JSON.parse(await readFile(result.evidencePath));
  assert.deepEqual(result.routePublicationViolations,[]);
  assert.deepEqual(data.routePublication.violations,[]);
  assert.equal(shots.length,10);
});
test('prelaunch checks robots, every sitemap URL and recursively checks internal links without requesting offsite URLs',async t=>{
  const f=await setup(t),d=dependencies();const result=await api.collectPrelaunch(f.context,d.options);
  const data=JSON.parse(await readFile(result.evidencePath));
  for(const path of ['/robots.txt','/sitemap.xml','/sitemap-only','/linked','/missing','/deep'])assert.ok(d.requests.some(url=>new URL(url).pathname===path),path);
  assert.ok(d.requests.every(url=>new URL(url).origin==='http://127.0.0.1:32111'));
  assert.equal(data.links.find(link=>link.route==='/missing').status,404);
  assert.equal(new Set(d.requests).size,d.requests.length);
});
test('prelaunch runs only existing scripts in order and records command exit codes after failures',async t=>{
  const f=await setup(t),d=dependencies();const result=await api.collectPrelaunch(f.context,d.options);
  const data=JSON.parse(await readFile(result.evidencePath));
  assert.deepEqual(d.commands,[['pnpm','run','typecheck'],['pnpm','run','test'],['pnpm','run','build']]);
  assert.deepEqual(data.checks.map(check=>check.exitCode),[0,2,0]);
  assert.doesNotMatch(JSON.stringify(data),/private-fixture/);assert.ok(result.files.length>10);
});
test('prelaunch closes the browser when opening a context fails',async t=>{
  const f=await setup(t),d=dependencies();let closed=0;
  await assert.rejects(api.collectPrelaunch(f.context,{...d.options,launchBrowser:async()=>({newContext:async()=>{throw Error('context fixture');},close:async()=>{closed++;}})}),/context fixture/);
  assert.equal(closed,1);
});
test('prelaunch executor passes evidence to offline worker and stops preview, detecting changed host files',async t=>{
  for(const tamper of [false,true]){
    const f=await setup(t);let stopped=0,evidencePath;
    const execute=createSkillExecutor({researchPython:process.execPath,
      previewSite:async()=>({url:'http://127.0.0.1:32111',stop:async()=>{stopped++;}}),
      prelaunchSite:async context=>{
        const directory=join(context.inputs.projectPath,'docs/prelaunch',context.runId,'host-evidence');await mkdir(directory,{recursive:true});
        evidencePath=join(directory,'HOST_EVIDENCE.json');await writeFile(evidencePath,'{"synthetic":true}');
        return {...await snapshotSiteEvidence(directory),routes:['/'],evidencePath,
          routePublicationViolations:[]};
      },run:async(_c,args,options)=>{
        assert.match(args.join(' '),/network=\{enabled=false\}/);assert.match(options.input,/routes_checked/);
        const path=args.find(value=>value.startsWith('shell_environment_policy.set='));
        assert.ok(path.indexOf(dirname(process.execPath))<path.indexOf('/usr/bin'));
        assert.ok(args.find(value=>value.startsWith('permissions.agent-worker='))
          .includes(JSON.stringify(dirname(dirname(process.execPath)))+'="read"'));
        assert.ok(options.input.includes(`Use ${process.execPath} for every Python Skill script`));
        if(tamper)await writeFile(evidencePath,'{}');
        await writeFile(args[args.indexOf('--output-last-message')+1],JSON.stringify({status:'BLOCKED',artifacts:[],missing_inputs:[],evidence:['synthetic incomplete']}));
      }});
    if(tamper)await assert.rejects(async()=>{
      const result=await execute(STAGE.PRELAUNCH_ACCEPTANCE,f.context);
      assert.fail('Expected evidence tamper rejection; executor returned '+JSON.stringify(result));
    },/HOST_EVIDENCE_CHANGED/);
    else assert.equal((await execute(STAGE.PRELAUNCH_ACCEPTANCE,f.context)).status,'BLOCKED');
    assert.equal(stopped,1);
  }
});

test('all prelaunch project scripts receive a minimal environment without host secrets', async t => {
  const supplied = { SERPER_API_KEY: 'x', HOST_TOKEN: 'x', HOST_SECRET: 'x', HOST_COOKIE: 'x', HOST_PASSWORD: 'x',
    UNRELATED_SETTING: 'x', NODE_OPTIONS: '--inspect', PNPM_HOME: '/synthetic/pnpm', NODE_ENV: 'production' };
  const previous = Object.fromEntries(Object.keys(supplied).map(name => [name, process.env[name]]));
  Object.assign(process.env, supplied);
  t.after(() => { for (const [name, value] of Object.entries(previous)) {
    if (value === undefined) delete process.env[name]; else process.env[name] = value;
  } });
  const f = await setup(t), d = dependencies(), observed = [];
  await writeFile(join(f.context.inputs.projectPath, 'package.json'), JSON.stringify({ scripts: {
    typecheck: 'tsc', lint: 'lint', test: 'test', build: 'build',
  } }));
  await api.collectPrelaunch(f.context, { ...d.options, run: async (_command, args, options) => {
    assert.ok(options.env, 'run must receive an explicit env');
    assert.notEqual(options.env, process.env);
    assert.equal(options.env.SERPER_API_KEY, undefined);
    assert.ok(Object.keys(options.env).every(name => ['PATH', 'HOME', 'TMPDIR', 'LANG', 'LC_ALL', 'NODE_ENV', 'PNPM_HOME'].includes(name)));
    assert.ok(Object.keys(options.env).every(name => !/key|token|secret|cookie|password/i.test(name)));
    for (const name of ['PATH', 'HOME', 'TMPDIR', 'LANG', 'LC_ALL', 'NODE_ENV', 'PNPM_HOME'])
      assert.equal(options.env[name], process.env[name]);
    observed.push(args[1]); return { exitCode: 0 };
  } });
  assert.deepEqual(observed, ['typecheck', 'lint', 'test', 'build']);
});
