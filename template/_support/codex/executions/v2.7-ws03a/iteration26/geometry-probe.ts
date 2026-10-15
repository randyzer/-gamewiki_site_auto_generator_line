import {collectControlGeometry} from './geometry-readonly-callbacks.mjs';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {existsSync,readFileSync,writeFileSync,mkdirSync,realpathSync} from 'node:fs';
import {join} from 'node:path';
import {createServer} from 'node:net';
import {createFullProjectFixture,cleanupCoreBuildFixture} from '/Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/tests/helpers/core-build-fixture';
import {sourceManifest} from '/Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/scripts/verify-ws06a-browser-closure';
const root=process.cwd(),out=join(root,'../../template/codex/executions/v2.7-ws03a/iteration26');
const save=(n:string,d:unknown)=>writeFileSync(join(out,n),JSON.stringify(d,null,2)+'\n');
const assert=(condition:unknown,message:string)=>{if(!condition)throw Error(message);};
const alive=(pid:number)=>{try{process.kill(pid,0);return true;}catch{return false;}};
const delay=(ms:number)=>new Promise(r=>setTimeout(r,ms));
const report:any={kind:'WS03A_READ_ONLY_CONTROL_GEOMETRY_DIAGNOSTIC',profile:{font:'interface',density:'compact',shape:'soft',state:'quiet'},rows:[],overall:'DIAGNOSTIC_NOT_COMPLETE',errors:[],safariProof:0,axPromotion:false};
async function main(){
 let fixture:string|undefined,pid:number|undefined;const browsers:any=[];const cleanup:any={normalStopExit:null,pidAliveBeforeStop:false,pidAliveAfterStop:false,fallbackSignalUsed:false,fixtureRemoved:false};
 try{
  fixture=createFullProjectFixture(true);assert(realpathSync(fixture).startsWith(realpathSync(process.env.TMPDIR!)+'/'),'Fixture outside owned TMPDIR');
  const before=sourceManifest(fixture),path=join(fixture,'game.config.ts'),text=readFileSync(path,'utf8'),marker='export default defineGameConfig({';assert(text.split(marker).length===2,'Config marker must match once');
  writeFileSync(path,text.replace(marker,marker+'\n  visualRoles: {font: "interface", density: "compact", shape: "soft", state: "quiet"},'));
  const patched=sourceManifest(fixture);assert(patched!==before,'Fixture role choice not applied');
  const build=spawnSync('npm',['run','build'],{cwd:fixture,encoding:'utf8',timeout:60000,maxBuffer:12*1024*1024});console.log(build.stdout);console.error(build.stderr);assert(build.status===0&&!build.error,'Synthetic final build failed');assert(sourceManifest(fixture)===patched,'Fixture source changed during build');
  for(const p of ['EVIDENCE_BUILD_NOT_FINAL.json','privacy/index.html','terms/index.html'])assert(!existsSync(join(fixture,'dist',p)),'Forbidden final artifact '+p);
  const dist=sourceManifest(join(fixture,'dist'));save('03a-fixture-identity.json',{fixtureRoot:fixture,starterSourceSha256:sourceManifest(root),prePatchFixtureSourceSha256:before,postPatchFixtureSourceSha256:patched,distSha256:dist,profile:report.profile,canonicalGameConfigModified:false,observedAt:new Date().toISOString()});
  const server=createServer();await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const address=server.address();assert(address&&typeof address!=='string','Port binding unavailable');const port=(address as any).port;await new Promise<void>(r=>server.close(()=>r()));const url='http://127.0.0.1:'+port;
  const preview=spawnSync('npm',['run','preview','--','--background','--host','127.0.0.1','--port',String(port)],{cwd:fixture,encoding:'utf8',timeout:30000});console.log(preview.stdout);console.error(preview.stderr);pid=Number(preview.stdout?.match(/\(pid (\d+)\)/)?.[1]);assert(preview.status===0&&pid&&preview.stdout.includes(url),'Own preview PID/URL not bound');cleanup.startedPid=pid;
  let ready=false;for(let i=0;i<80;i++){assert(alive(pid!),'Preview stopped prematurely');try{ready=(await fetch(url,{signal:AbortSignal.timeout(500)})).status===200;}catch{}if(ready)break;await delay(250);}assert(ready,'Preview readiness timeout');
  const require=createRequire(join(root,'package.json')),pw=require('playwright');mkdirSync(join(out,'screenshots'),{recursive:true});
  for(const name of ['chromium','firefox','webkit']){
   const browser=await pw[name].launch({headless:true});browsers.push(browser);
   for(const width of [800,1000]){
    const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'no-preference'});
    try{
     const response=await page.goto(url,{waitUntil:'networkidle'});assert(response?.status()===200,'Home HTTP response');
     const observation=await page.evaluate(collectControlGeometry);
     assert(observation.samples.length===16,'Incomplete geometry samples');
     for(const sample of observation.samples)assert(sample.css.roleControlMinHeight==='44px'&&sample.css.minHeight==='44px','CSS role/minHeight drift');
     const control=page.locator('.button').first(),boundingBox=await control.boundingBox();
     const screenshotPath=join(out,'screenshots',name+'-'+width+'-control.png');await control.screenshot({path:screenshotPath});
     const png=readFileSync(screenshotPath);assert(png.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))&&png.toString('ascii',12,16)==='IHDR','Invalid PNG');
     report.rows.push({engine:name,browserVersion:browser.version(),viewport:{width,height:900},httpStatus:response.status(),...observation,boundingBox,raster:{screenshotPath,pixelWidth:png.readUInt32BE(16),pixelHeight:png.readUInt32BE(20),devicePixelRatio:observation.samples[0].scale.devicePixelRatio},diagnosticStatus:'COLLECTED'});
    }finally{await page.close();}

   }
  }
  assert(sourceManifest(fixture)===patched&&sourceManifest(join(fixture,'dist'))===dist,'Source/build changed during targeted run');report.overall=report.rows.length===6?'DIAGNOSTIC_COMPLETE':'DIAGNOSTIC_INCOMPLETE';
 }catch(e){report.errors.push(String(e));}
 finally{
  for(const browser of browsers)await browser.close();
  if(pid&&fixture){cleanup.pidAliveBeforeStop=alive(pid);const stop=spawnSync('npm',['run','preview','--','stop'],{cwd:fixture,encoding:'utf8',timeout:30000});console.log(stop.stdout);console.error(stop.stderr);cleanup.normalStopExit=stop.status;for(let i=0;i<20&&alive(pid);i++)await delay(150);cleanup.pidAliveAfterStop=alive(pid);if(stop.status!==0||cleanup.pidAliveAfterStop){report.errors.push('Normal preview cleanup failed; no signal fallback');report.overall='FAIL';}}
  if(fixture&&(!pid||!alive(pid))){cleanupCoreBuildFixture(fixture);cleanup.fixtureRemoved=!existsSync(fixture);}
  save('03a-cleanup.json',cleanup);save('geometry-observations.json',report);
 }
 console.log(JSON.stringify({overall:report.overall,rows:report.rows.length,errors:report.errors}));
 if(report.overall!=='DIAGNOSTIC_COMPLETE'||report.errors.length)process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exitCode=1;});
