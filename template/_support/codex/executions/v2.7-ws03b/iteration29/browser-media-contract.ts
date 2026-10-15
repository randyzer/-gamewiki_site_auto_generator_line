import {observeMedia,localVideoMetadataReady,observePageComposition} from './media-observation.mjs';
import {observeImageInstances,imageNativeLoadReady} from './image-load-observation.mjs';
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
const report:any={kind:'WS03B_SYNTHETIC_MEDIA_CONTRACT',qualificationAttempts:1,retryCount:0,rows:[],overall:'FAIL',errors:[],safariProof:0,capabilityPromotion:'NONE'};
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
  const generation=spawnSync('/opt/homebrew/bin/ffmpeg',['-hide_banner','-loglevel','error','-f','lavfi','-i','color=c=0x255588:s=800x600:r=10','-t','0.5','-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart',join(fixture,'public',local.src)],{encoding:'utf8',timeout:30000});save('03b-local-video-generation.json',{command:'ffmpeg lavfi synthetic color 800x600 H264 yuv420p 0.5s',exitCode:generation.status,stderr:generation.stderr,synthetic:true});assert(generation.status===0,'Owned synthetic clip generation failed');
  writeFileSync(join(fixture,'src/data/media/media.json'),JSON.stringify({assets,pages:[{pageId:'guide.getting-started',hero:image.id,gallery:[image.id],trailer:local.id}]}));
  const mdx=join(fixture,'src/content/guides/getting-started.mdx');writeFileSync(mdx,readFileSync(mdx,'utf8')+'\nimport GameMedia from "../../components/media/GameMedia.astro";\nimport { mediaCatalog } from "../../data/media/catalog";\n\n<GameMedia asset={mediaCatalog.getAsset("qa.youtube")} />\n');
  const missing=join(fixture,'public',image.src),hold=missing+'.qa-hold';renameSync(missing,hold);
  try{const negative=spawnSync('npm',['run','validate'],{cwd:fixture,encoding:'utf8',timeout:60000,maxBuffer:12*1024*1024});writeFileSync(join(out,'03b-missing-local-negative.log'),negative.stdout+negative.stderr);save('03b-missing-local-negative.json',{exitCode:negative.status,error:negative.error?String(negative.error):null,expectedFailure:'missing local image',beforeBrowser:true});assert(negative.status!==0&&negative.status!==null&&!negative.error&&/Local image file does not exist/.test(negative.stdout+negative.stderr),'Missing local file did not fail for expected reason');}finally{renameSync(hold,missing)}
  const patched=sourceManifest(fixture),build=spawnSync('npm',['run','build'],{cwd:fixture,encoding:'utf8',timeout:60000,maxBuffer:12*1024*1024});writeFileSync(join(out,'03b-build.log'),build.stdout+build.stderr);assert(build.status===0&&!build.error,'Media fixture final build failed');assert(sourceManifest(fixture)===patched,'Build mutated source');
  const dist=sourceManifest(join(fixture,'dist'));save('03b-fixture-identity.json',{fixtureRoot:fixture,starterSourceSha256:sourceManifest(root),prePatchFixtureSourceSha256:before,postPatchFixtureSourceSha256:patched,distSha256:dist,assets,canonicalManifestModified:false,syntheticOnly:true,observedAt:new Date().toISOString()});
  const server=createServer();await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const address=server.address();assert(address&&typeof address!=='string','Port binding unavailable');const port=(address as any).port;await new Promise<void>(r=>server.close(()=>r()));const url='http://127.0.0.1:'+port;
  const preview=spawnSync('npm',['run','preview','--','--background','--host','127.0.0.1','--port',String(port)],{cwd:fixture,encoding:'utf8',timeout:30000});writeFileSync(join(out,'03b-preview-start.log'),preview.stdout+preview.stderr);pid=Number(preview.stdout?.match(/\(pid (\d+)\)/)?.[1]);assert(preview.status===0&&pid&&preview.stdout.includes(url),'Own preview PID/URL not bound');cleanup.startedPid=pid;
  let ready=false;for(let i=0;i<80;i++){assert(alive(pid!),'Preview stopped prematurely');try{ready=(await fetch(url,{signal:AbortSignal.timeout(500)})).status===200}catch{}if(ready)break;await delay(250)}assert(ready,'Preview readiness timeout');
  const pw=createRequire(join(root,'package.json'))('playwright');mkdirSync(join(out,'screenshots'),{recursive:true});
  for(const name of ['chromium','firefox','webkit']){
   const browser=await pw[name].launch({headless:true});browsers.push(browser);
   for(const width of [1280,390]){
    const page=await browser.newPage({viewport:{width,height:900}}),assertions:any=[],imageResourceEvents:any[]=[];let blockedRequests=0;
    page.on('request',request=>{if(request.url().endsWith('/media/qa-contract.svg'))imageResourceEvents.push({kind:'request',url:request.url(),at:new Date().toISOString()})});
    page.on('response',response=>{if(response.url().endsWith('/media/qa-contract.svg'))imageResourceEvents.push({kind:'response',url:response.url(),status:response.status(),at:new Date().toISOString()})});
    const check=(name:string,passed:boolean,detail:unknown)=>assertions.push({name,passed,detail});
    try{
     await page.goto(url+'/guides/getting-started/',{waitUntil:'networkidle'});await page.waitForFunction(localVideoMetadataReady,undefined,{timeout:10000});
     // A resource observation starts after native lazy images have entered their load lifecycle.
     const images=page.locator('figure[data-media-id] img');
     for(let index=0;index<await images.count();index++){
      const image=images.nth(index);
      if(await image.getAttribute('loading')==='lazy'&&!await image.evaluate(imageNativeLoadReady))await image.scrollIntoViewIfNeeded();
      await page.waitForFunction(imageNativeLoadReady,await image.elementHandle(),{timeout:5000});
     }
     report.lazyLoadReadiness??=[];report.lazyLoadReadiness.push({engine:name,viewport:{width,height:900},instances:await page.evaluate(observeImageInstances),resourceEvents:imageResourceEvents,observedAt:new Date().toISOString(),qualificationAssertionsChanged:false});save('lazy-load-readiness.json',report.lazyLoadReadiness);
     const observations=await page.evaluate(observeMedia);check('all-three-synthetic-media-types-render',observations.length===4,observations.map((x:any)=>x.id));
     for(const observed of observations){const asset:any=assets.find(a=>a.id===observed.id);assert(asset,'Unexpected media');const ratio=asset.dimensions.width/asset.dimensions.height;check(observed.id+'-responsive-intrinsic-ratio',observed.rect?.width>0&&observed.rect.width<=width&&Math.abs(observed.rect.width/observed.rect.height-ratio)<0.02,observed.rect);
      check(observed.id+'-source-visible',observed.sources.includes(asset.sourceUrl)&&await page.locator(`figure[data-media-id="${asset.id}"] figcaption a[href="${asset.sourceUrl}"]`).first().isVisible(),observed.sources);
      check(observed.id+'-rights-private',!observed.html.includes(asset.rightsRef)&&!observed.html.includes('rightsRef'),{privateOutput:false});
      if(asset.type==='image'){check('image-intrinsic-dimensions-natural-file',observed.image?.width==='1200'&&observed.image.height==='675'&&observed.image.naturalWidth===1200&&observed.image.naturalHeight===675&&observed.image.complete,observed.image);check('image-caption-credit',observed.credit===image.credit.text&&observed.html.includes(image.caption),observed.credit)}
      else {check(asset.id+'-derived-video-ratio',observed.ratio===`${asset.dimensions.width} / ${asset.dimensions.height}`,observed.ratio);check(asset.id+'-authored-equivalent-visible',observed.equivalent===(asset.accessibleEquivalent.text??asset.accessibleEquivalent.label)&&await page.locator(`figure[data-media-id="${asset.id}"] .media-equivalent`).isVisible(),observed.equivalent)}
     }
     const composition=await page.evaluate(observePageComposition);check('valid-media-composed-without-page-overflow',composition.mainText>100&&composition.emptyMediaShells===0&&composition.scrollWidth<=width,composition);await page.screenshot({path:join(out,'screenshots',name+'-'+width+'-media.png'),fullPage:true});
     await page.goto(url+'/about/',{waitUntil:'networkidle'});const plain=await page.evaluate(observePageComposition);check('no-media-complete-without-empty-shells',plain.mainText>100&&plain.mediaCount===0&&plain.emptyMediaShells===0&&plain.scrollWidth<=width,plain);
     await page.route('https://www.youtube-nocookie.com/**',route=>{blockedRequests++;return route.abort('blockedbyclient')});
     await page.goto(url+'/guides/getting-started/',{waitUntil:'networkidle'});await page.locator('figure[data-media-id="qa.youtube"]').scrollIntoViewIfNeeded();await delay(300);const blocked=await page.evaluate(observeMedia),yt=blocked.find((x:any)=>x.id==='qa.youtube');
     check('blocked-player-request-actually-intercepted',blockedRequests>0,blockedRequests);check('blocked-player-visible-equivalent-and-source',yt?.equivalent===youtube.accessibleEquivalent.label&&await page.locator('figure[data-media-id="qa.youtube"] .media-equivalent a').isVisible()&&await page.locator(`figure[data-media-id="qa.youtube"] figcaption a[href="${youtube.sourceUrl}"]`).isVisible(),yt?.equivalent);const blockedComposition=await page.evaluate(observePageComposition);check('blocked-player-page-remains-composed',blockedComposition.mainText>100&&blockedComposition.emptyMediaShells===0&&blockedComposition.scrollWidth<=width,blockedComposition);
    }catch(e){assertions.push({name:'unexpected-error',passed:false,detail:String(e)})}finally{await page.close()}
    report.rows.push({engine:name,browserVersion:browser.version(),viewport:{width,height:900},assertions,overall:assertions.every(a=>a.passed)?'PASS':'FAIL'});
   }
  }
  assert(sourceManifest(fixture)===patched&&sourceManifest(join(fixture,'dist'))===dist,'Fixture/source/build drift');assert(readFileSync(join(root,'src/data/media/media.json'),'utf8')===canonicalBefore,'Canonical media mutated');report.overall=report.rows.length===6&&report.rows.every((r:any)=>r.overall==='PASS')?'PASS':'FAIL';
 }catch(e){report.errors.push(String(e))}
 finally{
  for(const browser of browsers)await browser.close();
  if(pid&&fixture){cleanup.pidAliveBeforeStop=alive(pid);const stop=spawnSync('npm',['run','preview','--','stop'],{cwd:fixture,encoding:'utf8',timeout:30000});writeFileSync(join(out,'03b-preview-stop.log'),stop.stdout+stop.stderr);cleanup.normalStopExit=stop.status;for(let i=0;i<20&&alive(pid);i++)await delay(150);cleanup.pidAliveAfterStop=alive(pid);if(stop.status!==0||cleanup.pidAliveAfterStop){report.errors.push('Normal preview cleanup failed; no signal fallback');report.overall='FAIL'}}
  if(fixture&&(!pid||!alive(pid))){cleanupCoreBuildFixture(fixture);cleanup.fixtureRemoved=!existsSync(fixture)}save('03b-cleanup.json',cleanup);save('03b-browser-evidence.json',report);
 }
 console.log(JSON.stringify({overall:report.overall,rows:report.rows.length,errors:report.errors,failed:report.rows.flatMap((r:any)=>r.assertions.filter((a:any)=>!a.passed).map((a:any)=>({engine:r.engine,viewport:r.viewport,...a})))}));if(report.overall!=='PASS'||report.errors.length)process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exitCode=1});
