import {observeFreshness} from './freshness-observation.mjs';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {existsSync,readFileSync,realpathSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createServer} from 'node:net';
import {createFullProjectFixture,cleanupCoreBuildFixture} from '/Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/tests/helpers/core-build-fixture';
import {sourceManifest} from '/Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/scripts/verify-ws06a-browser-closure';
const root=process.cwd(),out=join(root,'../../template/codex/executions/v2.7-ws03d/iteration32');
const save=(n:string,d:unknown)=>writeFileSync(join(out,n),JSON.stringify(d,null,2)+'\n');
const assert=(v:unknown,m:string)=>{if(!v)throw Error(m)};
const alive=(p:number)=>{try{process.kill(p,0);return true}catch{return false}};
const delay=(ms:number)=>new Promise(r=>setTimeout(r,ms));
const note='PRIVATE_QA_LIVE_EVIDENCE_32';
const report:any={kind:'WS03D_SYNTHETIC_FRESHNESS_DATES',qualificationAttempts:1,retryCount:0,rows:[],overall:'FAIL',errors:[],safariProof:0,capabilityPromotion:'NONE'};
async function main(){
 let fixture:string|undefined,pid:number|undefined;const browsers:any[]=[];const cleanup:any={normalStopExit:null,pidAliveBeforeStop:false,pidAliveAfterStop:false,fallbackSignalUsed:false,fixtureRemoved:false};
 try{
  fixture=createFullProjectFixture(true);assert(realpathSync(fixture).startsWith(realpathSync(process.env.TMPDIR!)+'/'),'Unowned fixture');
  const before=sourceManifest(fixture),canonicalBefore=readFileSync(join(root,'src/data/page-inventory.json'),'utf8'),path=join(fixture,'src/data/page-inventory.json');
  const inventory=JSON.parse(readFileSync(path,'utf8')),page=inventory.find((p:any)=>p.pageId==='guide.getting-started');assert(page,'Synthetic guide absent');
  Object.assign(page,{publishedAt:'2026-08-10',updatedAt:'2026-09-20',sources:[{sourceUrl:'https://example.com/qa-source-a',sourceType:'editorial',accessedAt:'2026-09-18',evidenceNote:'Private synthetic source A access evidence'},{sourceUrl:'https://example.com/qa-source-b',sourceType:'editorial',accessedAt:'2026-09-21',evidenceNote:'Private synthetic source B access evidence'}],liveStatus:{state:'observed-live',observedAt:'2026-09-22',sourceUrl:'https://example.com/qa-live-status',evidenceNote:note}});writeFileSync(path,JSON.stringify(inventory));
  const patched=sourceManifest(fixture),build=spawnSync('npm',['run','build'],{cwd:fixture,encoding:'utf8',timeout:60000,maxBuffer:12*1024*1024});writeFileSync(join(out,'freshness-build.log'),build.stdout+build.stderr);assert(build.status===0&&!build.error,'Freshness fixture final build failed');assert(sourceManifest(fixture)===patched,'Build source drift');
  const dist=sourceManifest(join(fixture,'dist'));save('freshness-fixture-identity.json',{fixtureRoot:fixture,starterSourceSha256:sourceManifest(root),prePatchFixtureSourceSha256:before,postPatchFixtureSourceSha256:patched,distSha256:dist,authoredSyntheticPage:page,canonicalInventoryModified:false,syntheticOnly:true,observedAt:new Date().toISOString()});
  const server=createServer();await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const address:any=server.address();assert(address&&typeof address!=='string','Port unavailable');const port=address.port;await new Promise<void>(r=>server.close(()=>r()));const url='http://127.0.0.1:'+port;
  const preview=spawnSync('npm',['run','preview','--','--background','--host','127.0.0.1','--port',String(port)],{cwd:fixture,encoding:'utf8',timeout:30000});writeFileSync(join(out,'freshness-preview-start.log'),preview.stdout+preview.stderr);pid=Number(preview.stdout.match(/\(pid (\d+)\)/)?.[1]);assert(preview.status===0&&pid&&preview.stdout.includes(url),'Own preview PID/URL not bound');cleanup.startedPid=pid;
  let ready=false;for(let i=0;i<80;i++){assert(alive(pid!),'Preview stopped prematurely');try{ready=(await fetch(url,{signal:AbortSignal.timeout(500)})).status===200}catch{}if(ready)break;await delay(250)}assert(ready,'Preview readiness timeout');
  const pw=createRequire(join(root,'package.json'))('playwright');
  for(const engine of ['chromium','firefox','webkit']){
   const browser=await pw[engine].launch({headless:true});browsers.push(browser);
   for(const viewport of [{width:1280,height:900},{width:390,height:844}]){
    const tab=await browser.newPage({viewport}),assertions:any[]=[];let observation:any;
    const check=(name:string,passed:boolean,detail:unknown)=>assertions.push({name,passed,detail:structuredClone(detail)});
    try{
     const response=await tab.goto(url+'/guides/getting-started/',{waitUntil:'networkidle'});observation=await tab.evaluate(observeFreshness);
     const row=(label:string)=>observation.rows.filter((r:any)=>r.label===label),time=(label:string)=>row(label)[0]?.times[0]?.datetime;
     const dates=[['Published','2026-08-10'],['Last updated','2026-09-20'],['Sources checked','2026-09-21'],['Live status','2026-09-22']];
     check('guide-route-http200',response?.status()===200,response?.status());
     for(const [label,date] of dates)check('date-'+label,row(label).length===1&&row(label)[0].times.length===1&&time(label)===date&&row(label)[0].times[0].text===date,row(label));
     check('live-observation-wording',row('Live status')[0]?.text.includes('Observed live')&&!/Live now|Currently live|Real-time/.test(row('Live status')[0]?.text??''),row('Live status'));
     check('live-source-href-exact',row('Live status')[0]?.links.length===1&&row('Live status')[0].links[0].href==='https://example.com/qa-live-status'&&row('Live status')[0].links[0].text==='Status source',row('Live status')[0]?.links);
     check('no-false-verification-label',!observation.bodyText.includes('Last verified'),{oldLabelPresent:observation.bodyText.includes('Last verified')});
     check('private-observation-note-not-rendered',!observation.html.includes(note)&&!observation.html.includes('evidenceNote'),{privateMarkerPresent:observation.html.includes(note),privateFieldPresent:observation.html.includes('evidenceNote')});
     check('four-dates-remain-distinct',new Set(dates.map(([label])=>time(label))).size===4,dates.map(([label])=>({label,value:time(label)})));
     check('jsonld-parse-valid',observation.parseErrors.length===0,observation.parseErrors);
     check('article-datePublished-original-authority',observation.articles.length===1&&observation.articles[0].datePublished==='2026-08-10',observation.articles);
     check('article-dateModified-original-authority',observation.articles.length===1&&observation.articles[0].dateModified==='2026-09-20',observation.articles);
    }catch(e){assertions.push({name:'unexpected-error',passed:false,detail:String(e)})}finally{await tab.close()}
    report.rows.push({engine,browserVersion:browser.version(),viewport,route:'/guides/getting-started/',assertions,observedMetadata:observation?.rows,observedArticles:observation?.articles,overall:assertions.every(a=>a.passed)?'PASS':'FAIL'});
   }
  }
  assert(sourceManifest(fixture)===patched&&sourceManifest(join(fixture,'dist'))===dist,'Fixture source/dist drift');assert(readFileSync(join(root,'src/data/page-inventory.json'),'utf8')===canonicalBefore,'Canonical inventory drift');report.overall=report.rows.length===6&&report.rows.every((r:any)=>r.overall==='PASS')?'PASS':'FAIL';
 }catch(e){report.errors.push(String(e))}
 finally{
  for(const browser of browsers)await browser.close();
  if(pid&&fixture){cleanup.pidAliveBeforeStop=alive(pid);const stop=spawnSync('npm',['run','preview','--','stop'],{cwd:fixture,encoding:'utf8',timeout:30000});writeFileSync(join(out,'freshness-preview-stop.log'),stop.stdout+stop.stderr);cleanup.normalStopExit=stop.status;for(let i=0;i<20&&alive(pid);i++)await delay(150);cleanup.pidAliveAfterStop=alive(pid);if(stop.status!==0||cleanup.pidAliveAfterStop){report.errors.push('Normal preview cleanup failed; no signal fallback');report.overall='FAIL'}}
  if(fixture&&(!pid||!alive(pid))){cleanupCoreBuildFixture(fixture);cleanup.fixtureRemoved=!existsSync(fixture)}save('freshness-cleanup.json',cleanup);save('freshness-browser-evidence.json',report);
 }
 console.log(JSON.stringify({overall:report.overall,rows:report.rows.length,errors:report.errors,failed:report.rows.flatMap((r:any)=>r.assertions.filter((a:any)=>!a.passed).map((a:any)=>({engine:r.engine,viewport:r.viewport,...a})))}));if(report.overall!=='PASS'||report.errors.length)process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exitCode=1});
