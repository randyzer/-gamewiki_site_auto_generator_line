import {observeShareHead} from './share-head-observation.mjs';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {existsSync,readFileSync,writeFileSync,mkdirSync,realpathSync,renameSync} from 'node:fs';
import {join} from 'node:path';
import {createServer} from 'node:net';
import {createFullProjectFixture,cleanupCoreBuildFixture} from '/Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/tests/helpers/core-build-fixture';
import {sourceManifest} from '/Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/scripts/verify-ws06a-browser-closure';
const root=process.cwd(),out=join(root,'../../template/codex/executions/v2.7-ws03c/iteration30');
const save=(n:string,d:unknown)=>writeFileSync(join(out,n),JSON.stringify(d,null,2)+'\n');
const assert=(v:unknown,m:string)=>{if(!v)throw Error(m)};
const alive=(pid:number)=>{try{process.kill(pid,0);return true}catch{return false}};
const delay=(ms:number)=>new Promise(r=>setTimeout(r,ms));
const report:any={kind:'WS03C_SYNTHETIC_SHARE_METADATA',qualificationAttempts:1,retryCount:0,rows:[],overall:'FAIL',errors:[],safariProof:0,capabilityPromotion:'NONE'};
async function main(){
 let fixture:string|undefined,pid:number|undefined;const browsers:any=[];const cleanup:any={normalStopExit:null,pidAliveBeforeStop:false,pidAliveAfterStop:false,fallbackSignalUsed:false,fixtureRemoved:false};
 try{
  fixture=createFullProjectFixture(true);assert(realpathSync(fixture).startsWith(realpathSync(process.env.TMPDIR!)+'/'),'Unowned fixture');
  const before=sourceManifest(fixture),canonicalBefore=readFileSync(join(root,'src/data/media/media.json'),'utf8');assert(JSON.parse(canonicalBefore).assets.length===0,'Canonical media not empty');
  const path=join(fixture,'src/data/media/media.json'),manifest=JSON.parse(readFileSync(path,'utf8'));
  const explicit={id:'qa.explicit-share',type:'image',src:'/media/qa-explicit-share.svg',alt:'Synthetic pale rectangle for explicit share metadata QA',dimensions:{width:800,height:600},rightsRef:'private/qa-explicit-share',sourceUrl:'https://example.com/qa-explicit-share'};
  mkdirSync(join(fixture,'public/media'),{recursive:true});writeFileSync(join(fixture,'public',explicit.src),'<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><rect width="800" height="600" fill="#ddeeff"/></svg>');
  writeFileSync(path,JSON.stringify({...manifest,assets:[...manifest.assets,explicit],pages:[{pageId:'guide.getting-started',share:explicit.id}]}));
  const fallback=manifest.assets.find((asset:any)=>asset.id===manifest.defaultShare);assert(fallback,'Owned default share not registered');
  const missing=join(fixture,'public',explicit.src),hold=missing+'.qa-hold';renameSync(missing,hold);
  try{const negative=spawnSync('npm',['run','build'],{cwd:fixture,encoding:'utf8',timeout:60000,maxBuffer:12*1024*1024});writeFileSync(join(out,'03c-missing-local-share-negative.log'),negative.stdout+negative.stderr);save('03c-missing-local-share-negative.json',{exitCode:negative.status,error:negative.error?String(negative.error):null,expectedFailure:'missing local explicit share image',beforeBrowser:true});assert(negative.status===1&&!negative.error&&/Local image file does not exist/.test(negative.stdout+negative.stderr),'Missing local share image did not fail final build for expected reason')}finally{renameSync(hold,missing)}
  const assets=[explicit,fallback],patched=sourceManifest(fixture),build=spawnSync('npm',['run','build'],{cwd:fixture,encoding:'utf8',timeout:60000,maxBuffer:12*1024*1024});writeFileSync(join(out,'03c-build.log'),build.stdout+build.stderr);assert(build.status===0&&!build.error,'Share fixture final build failed');assert(sourceManifest(fixture)===patched,'Build mutated source');
  const dist=sourceManifest(join(fixture,'dist'));save('03c-fixture-identity.json',{fixtureRoot:fixture,starterSourceSha256:sourceManifest(root),prePatchFixtureSourceSha256:before,postPatchFixtureSourceSha256:patched,distSha256:dist,assets,canonicalManifestModified:false,syntheticOnly:true,observedAt:new Date().toISOString()});
  const server=createServer();await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const address=server.address();assert(address&&typeof address!=='string','Port binding unavailable');const port=(address as any).port;await new Promise<void>(r=>server.close(()=>r()));const url='http://127.0.0.1:'+port;
  const preview=spawnSync('npm',['run','preview','--','--background','--host','127.0.0.1','--port',String(port)],{cwd:fixture,encoding:'utf8',timeout:30000});writeFileSync(join(out,'03c-preview-start.log'),preview.stdout+preview.stderr);pid=Number(preview.stdout?.match(/\(pid (\d+)\)/)?.[1]);assert(preview.status===0&&pid&&preview.stdout.includes(url),'Own preview PID/URL not bound');cleanup.startedPid=pid;
  let ready=false;for(let i=0;i<80;i++){assert(alive(pid!),'Preview stopped prematurely');try{ready=(await fetch(url,{signal:AbortSignal.timeout(500)})).status===200}catch{}if(ready)break;await delay(250)}assert(ready,'Preview readiness timeout');
  const pw=createRequire(join(root,'package.json'))('playwright');
  for(const name of ['chromium','firefox','webkit']){
   const browser=await pw[name].launch({headless:true});browsers.push(browser);
   for(const [route,asset] of [['/guides/getting-started/',explicit],['/about/',fallback]] as const){
    const page=await browser.newPage({viewport:{width:1280,height:900}}),assertions:any=[];
    const check=(name:string,passed:boolean,detail:unknown)=>assertions.push({name,passed,detail});
    try{
     const response=await page.goto(url+route,{waitUntil:'networkidle'});check('final-route-response',response?.status()===200,response?.status());
     const observation=await page.evaluate(observeShareHead),expectedUrl=new URL(asset.src,'https://field-notes.example').href;
     const expectedFields={'og:image':expectedUrl,'og:image:width':String(asset.dimensions.width),'og:image:height':String(asset.dimensions.height),'og:image:alt':asset.alt,'twitter:image':expectedUrl,'twitter:image:alt':asset.alt,'twitter:card':'summary_large_image'};
     for(const [field,value] of Object.entries(expectedFields)){const values=observation.values[field];check('share-meta-'+field,values?.length===1&&values[0]===value,values)}
     const resource=await page.request.get(url+asset.src);check('local-share-asset-http200',resource.status()===200&&resource.headers()['content-type']?.includes('image/svg+xml'),{status:resource.status(),contentType:resource.headers()['content-type'],previewAssetUrl:url+asset.src,metadataUrl:expectedUrl,note:'HTTP proof is for the disposable local preview asset; declared HTTPS fixture domain is not probed.'});
     check('private-share-evidence-not-in-head',assets.every(image=>!observation.headHtml.includes(image.rightsRef)&&!observation.headHtml.includes(image.sourceUrl))&&!observation.headHtml.includes('rightsRef'),{privateLeak:false});
     check('share-only-does-not-render-body-media',observation.bodyFigures===0&&observation.sharePlacements===0,{bodyFigures:observation.bodyFigures,sharePlacements:observation.sharePlacements});
    }catch(e){assertions.push({name:'unexpected-error',passed:false,detail:String(e)})}finally{await page.close()}
    report.rows.push({engine:name,browserVersion:browser.version(),viewport:{width:1280,height:900},route,selection:asset.id===explicit.id?'explicit-share':'default-fallback',assertions,overall:assertions.every(a=>a.passed)?'PASS':'FAIL'});
   }
  }
  assert(sourceManifest(fixture)===patched&&sourceManifest(join(fixture,'dist'))===dist,'Fixture/source/build drift');assert(readFileSync(join(root,'src/data/media/media.json'),'utf8')===canonicalBefore,'Canonical media mutated');report.overall=report.rows.length===6&&report.rows.every((r:any)=>r.overall==='PASS')?'PASS':'FAIL';
 }catch(e){report.errors.push(String(e))}
 finally{
  for(const browser of browsers)await browser.close();
  if(pid&&fixture){cleanup.pidAliveBeforeStop=alive(pid);const stop=spawnSync('npm',['run','preview','--','stop'],{cwd:fixture,encoding:'utf8',timeout:30000});writeFileSync(join(out,'03c-preview-stop.log'),stop.stdout+stop.stderr);cleanup.normalStopExit=stop.status;for(let i=0;i<20&&alive(pid);i++)await delay(150);cleanup.pidAliveAfterStop=alive(pid);if(stop.status!==0||cleanup.pidAliveAfterStop){report.errors.push('Normal preview cleanup failed; no signal fallback');report.overall='FAIL'}}
  if(fixture&&(!pid||!alive(pid))){cleanupCoreBuildFixture(fixture);cleanup.fixtureRemoved=!existsSync(fixture)}save('03c-cleanup.json',cleanup);save('03c-browser-evidence.json',report);
 }
 console.log(JSON.stringify({overall:report.overall,rows:report.rows.length,errors:report.errors,failed:report.rows.flatMap((r:any)=>r.assertions.filter((a:any)=>!a.passed).map((a:any)=>({engine:r.engine,route:r.route,...a})))}));if(report.overall!=='PASS'||report.errors.length)process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exitCode=1});
