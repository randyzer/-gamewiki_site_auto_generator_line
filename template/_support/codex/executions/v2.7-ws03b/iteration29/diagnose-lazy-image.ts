import {localVideoMetadataReady} from './media-observation.mjs';
import {observeImageInstances,imageHasExpectedNaturalSize} from './image-load-observation.mjs';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {existsSync,readFileSync,writeFileSync,mkdirSync,realpathSync,renameSync} from 'node:fs';
import {join} from 'node:path';
import {createServer} from 'node:net';
import {createFullProjectFixture,cleanupCoreBuildFixture} from '/Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/tests/helpers/core-build-fixture';
import {sourceManifest} from '/Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/scripts/verify-ws06a-browser-closure';
const root=process.cwd(),out=join(root,'../../template/codex/executions/v2.7-ws03b/iteration29');
const save=(n:string,d:unknown)=>writeFileSync(join(out,n),JSON.stringify(d,null,2)+'\n');
const assert=(v:unknown,m:string)=>{if(!v)throw Error(m)};
const alive=(pid:number)=>{try{process.kill(pid,0);return true}catch{return false}};
const delay=(ms:number)=>new Promise(r=>setTimeout(r,ms));
const report:any={kind:'WS03B_READ_ONLY_LAZY_IMAGE_DIAGNOSTIC',diagnosticSessions:1,qualificationAttempts:0,retryCount:0,rows:[],overall:'FAIL',errors:[],safariProof:0,capabilityPromotion:'NONE'};
async function main(){
 let fixture:string|undefined,pid:number|undefined;const browsers:any=[];const cleanup:any={normalStopExit:null,pidAliveBeforeStop:false,pidAliveAfterStop:false,fallbackSignalUsed:false,fixtureRemoved:false};
 try{
  fixture=createFullProjectFixture(true);assert(realpathSync(fixture).startsWith(realpathSync(process.env.TMPDIR!)+'/'),'Unowned fixture');
  const before=sourceManifest(fixture),canonicalBefore=readFileSync(join(root,'src/data/media/media.json'),'utf8');assert(JSON.parse(canonicalBefore).assets.length===0,'Canonical media not empty');
  const image={id:'qa.image',type:'image',src:'/media/qa-contract.svg',alt:'Synthetic blue rectangle with a pale center',dimensions:{width:1200,height:675},rightsRef:'private/qa-image',credit:{text:'Synthetic QA author',url:'https://example.com/qa-author'},sourceUrl:'https://example.com/qa-image',caption:'Synthetic QA illustration, without game association.'};
  const local={id:'qa.local',type:'video',src:'/media/qa-contract.mp4',alt:'Synthetic solid blue test clip',dimensions:{width:800,height:600},rightsRef:'private/qa-local',sourceUrl:'https://example.com/qa-local',accessibleEquivalent:{kind:'text',text:'This synthetic clip displays a solid blue field.'}};
  const youtube={id:'qa.youtube',type:'video',src:'aqz-KE-bpKQ',alt:'Public animation video used for technical QA',dimensions:{width:1920,height:1080},rightsRef:'private/qa-youtube',sourceUrl:'https://www.youtube.com/watch?v=aqz-KE-bpKQ',accessibleEquivalent:{kind:'link',label:'Technical QA equivalent: no game association',href:'/about/'}};
  const assets=[image,local,youtube];
  mkdirSync(join(fixture,'public/media'),{recursive:true});
  writeFileSync(join(fixture,'public',image.src),'<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675"><rect width="1200" height="675" fill="#255588"/><rect x="300" y="180" width="600" height="315" fill="#ddeeff"/></svg>');
  const generation=spawnSync('/opt/homebrew/bin/ffmpeg',['-hide_banner','-loglevel','error','-f','lavfi','-i','color=c=0x255588:s=800x600:r=10','-t','0.5','-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart',join(fixture,'public',local.src)],{encoding:'utf8',timeout:30000});save('diagnostic-local-video-generation.json',{command:'ffmpeg lavfi synthetic color 800x600 H264 yuv420p 0.5s',exitCode:generation.status,stderr:generation.stderr,synthetic:true});assert(generation.status===0,'Owned synthetic clip generation failed');
  writeFileSync(join(fixture,'src/data/media/media.json'),JSON.stringify({assets,pages:[{pageId:'guide.getting-started',hero:image.id,gallery:[image.id],trailer:local.id}]}));
  const mdx=join(fixture,'src/content/guides/getting-started.mdx');writeFileSync(mdx,readFileSync(mdx,'utf8')+'\nimport GameMedia from "../../components/media/GameMedia.astro";\nimport { mediaCatalog } from "../../data/media/catalog";\n\n<GameMedia asset={mediaCatalog.getAsset("qa.youtube")} />\n');
  const missing=join(fixture,'public',image.src),hold=missing+'.qa-hold';renameSync(missing,hold);
  try{const negative=spawnSync('npm',['run','validate'],{cwd:fixture,encoding:'utf8',timeout:60000,maxBuffer:12*1024*1024});writeFileSync(join(out,'diagnostic-missing-local-negative.log'),negative.stdout+negative.stderr);save('diagnostic-missing-local-negative.json',{exitCode:negative.status,error:negative.error?String(negative.error):null,expectedFailure:'missing local image',beforeBrowser:true});assert(negative.status!==0&&negative.status!==null&&!negative.error&&/Local image file does not exist/.test(negative.stdout+negative.stderr),'Missing local file did not fail for expected reason');}finally{renameSync(hold,missing)}
  const patched=sourceManifest(fixture),build=spawnSync('npm',['run','build'],{cwd:fixture,encoding:'utf8',timeout:60000,maxBuffer:12*1024*1024});writeFileSync(join(out,'diagnostic-build.log'),build.stdout+build.stderr);assert(build.status===0&&!build.error,'Media fixture final build failed');assert(sourceManifest(fixture)===patched,'Build mutated source');
  const dist=sourceManifest(join(fixture,'dist'));save('diagnostic-fixture-identity.json',{fixtureRoot:fixture,starterSourceSha256:sourceManifest(root),prePatchFixtureSourceSha256:before,postPatchFixtureSourceSha256:patched,distSha256:dist,assets,canonicalManifestModified:false,syntheticOnly:true,observedAt:new Date().toISOString()});
  const server=createServer();await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const address=server.address();assert(address&&typeof address!=='string','Port binding unavailable');const port=(address as any).port;await new Promise<void>(r=>server.close(()=>r()));const url='http://127.0.0.1:'+port;
  const preview=spawnSync('npm',['run','preview','--','--background','--host','127.0.0.1','--port',String(port)],{cwd:fixture,encoding:'utf8',timeout:30000});writeFileSync(join(out,'diagnostic-preview-start.log'),preview.stdout+preview.stderr);pid=Number(preview.stdout?.match(/\(pid (\d+)\)/)?.[1]);assert(preview.status===0&&pid&&preview.stdout.includes(url),'Own preview PID/URL not bound');cleanup.startedPid=pid;
  let ready=false;for(let i=0;i<80;i++){assert(alive(pid!),'Preview stopped prematurely');try{ready=(await fetch(url,{signal:AbortSignal.timeout(500)})).status===200}catch{}if(ready)break;await delay(250)}assert(ready,'Preview readiness timeout');
  const pw=createRequire(join(root,'package.json'))('playwright');mkdirSync(join(out,'screenshots'),{recursive:true});
  for(const name of ['chromium','firefox','webkit']){
   const browser=await pw[name].launch({headless:true});browsers.push(browser);
   for(const width of [1280,390]){
    const page=await browser.newPage({viewport:{width,height:900}}),events:any=[];
    page.on('request',request=>{if(request.url().endsWith('/media/qa-contract.svg'))events.push({kind:'request',url:request.url(),at:new Date().toISOString()})});
    page.on('response',response=>{if(response.url().endsWith('/media/qa-contract.svg'))events.push({kind:'response',url:response.url(),status:response.status(),at:new Date().toISOString()})});
    page.on('requestfailed',request=>{if(request.url().endsWith('/media/qa-contract.svg'))events.push({kind:'requestfailed',url:request.url(),failure:request.failure(),at:new Date().toISOString()})});
    const row:any={engine:name,browserVersion:browser.version(),viewport:{width,height:900},assertions:[],before:null,after:null,classification:'INCONCLUSIVE',galleryScrollCount:0,qualificationAttempts:0};
    try{
     await page.goto(url+'/guides/getting-started/',{waitUntil:'networkidle'});await page.waitForFunction(localVideoMetadataReady,undefined,{timeout:10000});
     row.before={instances:await page.evaluate(observeImageInstances),resourceEvents:JSON.parse(JSON.stringify(events)),observedAt:new Date().toISOString()};
     const gallery=page.locator('[data-media-placement="gallery"] figure[data-media-id="qa.image"] img');assert(await gallery.count()===1,'Gallery image not uniquely identified');
     await gallery.scrollIntoViewIfNeeded();row.galleryScrollCount=1;await page.waitForFunction(imageHasExpectedNaturalSize,await gallery.elementHandle(),{timeout:5000});
     row.after={instances:await page.evaluate(observeImageInstances),resourceEvents:JSON.parse(JSON.stringify(events)),observedAt:new Date().toISOString()};
     const hero=row.before.instances.find((x:any)=>x.placement==='hero'),beforeGallery=row.before.instances.find((x:any)=>x.placement==='gallery'),afterGallery=row.after.instances.find((x:any)=>x.placement==='gallery');
     const resource200=events.some(e=>e.kind==='response'&&e.status===200),resourceFailed=events.some(e=>e.kind==='requestfailed'||(e.kind==='response'&&e.status!==200));
     const loaded=(image:any)=>image?.complete===true&&image.naturalWidth===1200&&image.naturalHeight===675;
     row.sharedUrlResource={heroAndGallerySameUrl:hero?.currentSrc===beforeGallery?.currentSrc,response200:resource200,requestFailed:resourceFailed,note:'One resource URL is shared by two DOM instances. A hero request/cache response is not claimed as a distinct gallery request.'};
     if(resourceFailed||!loaded(afterGallery)||!loaded(hero))row.classification='PRODUCT_OR_ASSET_FAILURE';
     else if(beforeGallery?.loading==='lazy'&&!beforeGallery.inViewport&&beforeGallery.complete===false&&beforeGallery.naturalWidth===0&&loaded(afterGallery)&&resource200)row.classification='HARNESS_LAZY_LOAD_CONFIRMED';
     else if(name!=='webkit'&&loaded(beforeGallery)&&resource200)row.classification='COMPARISON_IMAGE_ALREADY_LOADED';
     row.overall=['HARNESS_LAZY_LOAD_CONFIRMED','COMPARISON_IMAGE_ALREADY_LOADED'].includes(row.classification)?'PASS':'FAIL';
     await page.screenshot({path:join(out,'screenshots',name+'-'+width+'-diagnostic-after-gallery.png')});
    }catch(e){row.error=String(e);row.overall='FAIL'}finally{await page.close()}
    report.rows.push(row);save('lazy-image-diagnostic.json',report);
   }
  }
  assert(sourceManifest(fixture)===patched&&sourceManifest(join(fixture,'dist'))===dist,'Fixture/source/build drift');assert(readFileSync(join(root,'src/data/media/media.json'),'utf8')===canonicalBefore,'Canonical media mutated');report.classification=report.rows.length===6&&report.rows.filter((r:any)=>r.engine==='webkit').every((r:any)=>r.classification==='HARNESS_LAZY_LOAD_CONFIRMED')&&report.rows.every((r:any)=>r.overall==='PASS')?'HARNESS_LAZY_LOAD_CONFIRMED':'INCONCLUSIVE';report.overall=report.classification==='HARNESS_LAZY_LOAD_CONFIRMED'?'PASS':'FAIL';
 }catch(e){report.errors.push(String(e))}
 finally{
  for(const browser of browsers)await browser.close();
  if(pid&&fixture){cleanup.pidAliveBeforeStop=alive(pid);const stop=spawnSync('npm',['run','preview','--','stop'],{cwd:fixture,encoding:'utf8',timeout:30000});writeFileSync(join(out,'diagnostic-preview-stop.log'),stop.stdout+stop.stderr);cleanup.normalStopExit=stop.status;for(let i=0;i<20&&alive(pid);i++)await delay(150);cleanup.pidAliveAfterStop=alive(pid);if(stop.status!==0||cleanup.pidAliveAfterStop){report.errors.push('Normal preview cleanup failed; no signal fallback');report.overall='FAIL'}}
  if(fixture&&(!pid||!alive(pid))){cleanupCoreBuildFixture(fixture);cleanup.fixtureRemoved=!existsSync(fixture)}save('diagnostic-cleanup.json',cleanup);save('diagnostic-browser-evidence.json',report);
 }
 console.log(JSON.stringify({overall:report.overall,rows:report.rows.length,errors:report.errors,failed:report.rows.flatMap((r:any)=>r.assertions.filter((a:any)=>!a.passed).map((a:any)=>({engine:r.engine,viewport:r.viewport,...a})))}));if(report.overall!=='PASS'||report.errors.length)process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exitCode=1});
