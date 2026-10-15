import {observeSearchState} from './search-observation.mjs';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {existsSync,readFileSync,realpathSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createServer} from 'node:net';
import gameConfig from '/Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/game.config';
import {createFullProjectFixture,cleanupCoreBuildFixture,writeFixtureGameConfig} from '/Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/tests/helpers/core-build-fixture';
import {sourceManifest} from '/Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/scripts/verify-ws06a-browser-closure';
const root=process.cwd(),out=join(root,'../../template/codex/executions/v2.7-ws03d/iteration31');
const save=(n:string,d:unknown)=>writeFileSync(join(out,n),JSON.stringify(d,null,2)+'\n');
const assert=(v:unknown,m:string)=>{if(!v)throw Error(m)};
const alive=(p:number)=>{try{process.kill(p,0);return true}catch{return false}};
const delay=(ms:number)=>new Promise(r=>setTimeout(r,ms));
const report:any={kind:'WS03D_SYNTHETIC_SEARCH_STATES',qualificationAttempts:1,retryCount:0,rows:[],overall:'FAIL',errors:[],safariProof:0,capabilityPromotion:'NONE'};
const identities:any[]=[],cleanups:any[]=[];
const query='choices',nonsense='zzzxqvws03dneverfound731';
const safe=(url:string)=>url.startsWith('/')&&!url.startsWith('//')&&!url.split(/[?#]/)[0].split('/').some(p=>p==='.'||p==='..');
async function waitState(page:any,state:string){
 const samples:any[]=[];
 for(let i=0;i<150;i++){const observation=await page.evaluate(observeSearchState);samples.push({observedAt:new Date().toISOString(),...observation});if(observation.state===state)return {observation,samples};await delay(100)}
 throw Error('Search state '+state+' not reached; last='+JSON.stringify(samples.at(-1)));
}
async function runFixture(enabled:boolean){
 let fixture:string|undefined,pid:number|undefined;const browsers:any[]=[];const cleanup:any={enabled,normalStopExit:null,pidAliveBeforeStop:false,pidAliveAfterStop:false,fallbackSignalUsed:false,fixtureRemoved:false};
 try{
  fixture=createFullProjectFixture(true);assert(realpathSync(fixture).startsWith(realpathSync(process.env.TMPDIR!)+'/'),'Unowned fixture');
  const copied=sourceManifest(fixture),canonical=readFileSync(join(root,'game.config.ts'),'utf8');
  if(!enabled)writeFixtureGameConfig(fixture,{...gameConfig,features:{...gameConfig.features,search:false},navigation:{...gameConfig.navigation,groups:gameConfig.navigation.groups.filter(group=>group.pageId!=='search')}});
  const before=sourceManifest(fixture),build=spawnSync('npm',['run','build'],{cwd:fixture,encoding:'utf8',timeout:60000,maxBuffer:12*1024*1024});writeFileSync(join(out,enabled?'search-enabled-build.log':'search-disabled-build.log'),build.stdout+build.stderr);assert(build.status===0&&!build.error,'Search fixture build failed');assert(sourceManifest(fixture)===before,'Build source drift');
  const routeExists=existsSync(join(fixture,'dist/search/index.html'));assert(routeExists===enabled,'Static route activation mismatch');
  const dist=sourceManifest(join(fixture,'dist'));identities.push({enabled,fixtureRoot:fixture,starterSourceSha256:sourceManifest(root),copiedFixtureSourceSha256:copied,fixtureSourceSha256:before,distSha256:dist,routeExists,canonicalConfigModified:false,syntheticOnly:true});save('search-fixture-identities.json',identities);
  const server=createServer();await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const addr:any=server.address();assert(addr&&typeof addr!=='string','Port missing');const port=addr.port;await new Promise<void>(r=>server.close(()=>r()));const url='http://127.0.0.1:'+port;
  const preview=spawnSync('npm',['run','preview','--','--background','--host','127.0.0.1','--port',String(port)],{cwd:fixture,encoding:'utf8',timeout:30000});writeFileSync(join(out,enabled?'search-enabled-preview-start.log':'search-disabled-preview-start.log'),preview.stdout+preview.stderr);pid=Number(preview.stdout.match(/\(pid (\d+)\)/)?.[1]);assert(preview.status===0&&pid&&preview.stdout.includes(url),'Preview PID/URL not bound');cleanup.startedPid=pid;
  let ready=false;for(let i=0;i<80;i++){assert(alive(pid!),'Preview gone');try{ready=(await fetch(url,{signal:AbortSignal.timeout(500)})).status===200}catch{}if(ready)break;await delay(250)}assert(ready,'Preview readiness timeout');
  const pw=createRequire(join(root,'package.json'))('playwright');
  for(const engine of ['chromium','firefox','webkit']){
   const browser=await pw[engine].launch({headless:true});browsers.push(browser);
   for(const viewport of [{width:1280,height:900},{width:390,height:844}]){
    const page=await browser.newPage({viewport}),assertions:any[]=[],states:any={};const loading:any[]=[],pending:Promise<unknown>[]=[],loaderRequests:string[]=[],blocked:string[]=[];
    const check=(name:string,passed:boolean,detail:unknown)=>assertions.push({name,passed,detail});
    page.on('request',(request:any)=>{if(new URL(request.url()).pathname==='/pagefind/pagefind.js'){loaderRequests.push(request.url());pending.push(page.evaluate(observeSearchState).then((o:any)=>loading.push({url:request.url(),state:o.state,note:o.note,observedAt:new Date().toISOString()})).catch((e:any)=>loading.push({error:String(e)})))}});
    try{
     if(enabled){
      const response=await page.goto(url+'/search/',{waitUntil:'networkidle'});const idle=await waitState(page,'idle');states.idle=idle;
      check('enabled-route-http200',response?.status()===200,response?.status());check('idle-form-present',idle.observation.formCount===1,idle.observation.formCount);check('idle-guidance',idle.observation.note.includes('Enter a guide'),idle.observation.note);check('idle-no-online-claim',!/\bonline\b/i.test(idle.observation.consoleText),idle.observation.consoleText);check('idle-no-results',idle.observation.results.length===0,idle.observation.results);check('idle-does-not-load-provider',loaderRequests.length===0,loaderRequests);
      await page.getByRole('searchbox').fill(query);await page.getByRole('button',{name:'Search',exact:true}).click();const results=await waitState(page,'results');states.results=results;await Promise.all(pending);
      check('results-url-query',results.observation.query===query,results.observation.query);check('results-state-nonempty',results.observation.results.length>0,results.observation.results.length);check('results-count-guidance',/\d+ results? for/.test(results.observation.note),results.observation.note);check('results-safe-local-urls',results.observation.results.every((r:any)=>typeof r.url==='string'&&safe(r.url)),results.observation.results);check('results-visible-title-excerpt',results.observation.results.every((r:any)=>r.title&&r.excerpt),results.observation.results);check('loading-observed-before-results',loading.some(o=>o.state==='loading'),loading);
      await page.getByRole('searchbox').fill(nonsense);await page.getByRole('button',{name:'Search',exact:true}).click();const empty=await waitState(page,'empty');states.empty=empty;
      check('empty-url-query',empty.observation.query===nonsense,empty.observation.query);check('empty-explicit-guidance',/No matching results.*broader term/.test(empty.observation.note),empty.observation.note);check('empty-no-results',empty.observation.results.length===0,empty.observation.results);check('empty-not-error',!/unavailable/.test(empty.observation.note),empty.observation.note);
      await page.route('**/pagefind/pagefind.js',(route:any)=>{blocked.push(route.request().url());return route.abort('failed')});await page.goto(url+'/search/?q='+query,{waitUntil:'networkidle'});const error=await waitState(page,'error');states.error={...error,simulation:'Fresh document with only the exact Pagefind loader aborted; previous document had results/empty evidence.'};await Promise.all(pending);
      check('error-only-loader-aborted',blocked.length===1&&blocked.every(u=>new URL(u).pathname==='/pagefind/pagefind.js'),blocked);check('error-explicit-guidance',/index is unavailable.*refreshing/.test(error.observation.note),error.observation.note);check('error-no-online-claim',!/\bonline\b/i.test(error.observation.consoleText),error.observation.consoleText);check('error-no-results',error.observation.results.length===0,error.observation.results);check('error-url-query-preserved',error.observation.query===query,error.observation.query);
     }else{
      const response=await page.goto(url+'/search/',{waitUntil:'networkidle'}),missing=await page.evaluate(observeSearchState);states.missing=missing;
      check('disabled-static-route-absent',routeExists===false,routeExists);check('disabled-search-http404',response?.status()===404,response?.status());check('disabled-no-search-ui',missing.formCount===0&&missing.state===null,missing);
      const home=await page.goto(url+'/',{waitUntil:'networkidle'}),homeState=await page.evaluate(observeSearchState);states.home=homeState;check('disabled-home-http200',home?.status()===200,home?.status());check('disabled-no-search-navigation',homeState.searchNav.length===0,homeState.searchNav);
     }
    }catch(e){assertions.push({name:'unexpected-error',passed:false,detail:String(e)})}finally{await page.close()}
    report.rows.push({enabled,engine,browserVersion:browser.version(),viewport,assertions,states,loaderRequests,overall:assertions.every(a=>a.passed)?'PASS':'FAIL'});save('search-browser-evidence.json',report);
   }
  }
  assert(sourceManifest(fixture)===before&&sourceManifest(join(fixture,'dist'))===dist,'Browser mutated source/dist');assert(readFileSync(join(root,'game.config.ts'),'utf8')===canonical,'Canonical config drift');
 }catch(e){report.errors.push(String(e))}
 finally{
  for(const browser of browsers)await browser.close();
  if(pid&&fixture){cleanup.pidAliveBeforeStop=alive(pid);const stop=spawnSync('npm',['run','preview','--','stop'],{cwd:fixture,encoding:'utf8',timeout:30000});writeFileSync(join(out,enabled?'search-enabled-preview-stop.log':'search-disabled-preview-stop.log'),stop.stdout+stop.stderr);cleanup.normalStopExit=stop.status;for(let i=0;i<20&&alive(pid);i++)await delay(150);cleanup.pidAliveAfterStop=alive(pid);if(stop.status!==0||cleanup.pidAliveAfterStop)report.errors.push('Normal preview cleanup failed; no signal fallback')}
  if(fixture&&(!pid||!alive(pid))){cleanupCoreBuildFixture(fixture);cleanup.fixtureRemoved=!existsSync(fixture)}cleanups.push(cleanup);save('search-cleanup.json',cleanups);
 }
}
async function main(){await runFixture(true);if(report.errors.length||report.rows.some((r:any)=>r.overall!=='PASS')){report.overall='FAIL'}else{await runFixture(false);report.overall=report.rows.length===12&&report.rows.every((r:any)=>r.overall==='PASS')&&!report.errors.length?'PASS':'FAIL'}save('search-browser-evidence.json',report);console.log(JSON.stringify({overall:report.overall,rows:report.rows.length,errors:report.errors,failed:report.rows.flatMap((r:any)=>r.assertions.filter((a:any)=>!a.passed).map((a:any)=>({engine:r.engine,enabled:r.enabled,viewport:r.viewport,...a})))}));if(report.overall!=='PASS')process.exitCode=1}
main().catch(e=>{console.error(e);process.exitCode=1});
