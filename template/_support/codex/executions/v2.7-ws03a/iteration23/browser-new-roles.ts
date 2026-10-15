import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {existsSync,readFileSync,writeFileSync,mkdirSync,realpathSync} from 'node:fs';
import {join} from 'node:path';
import {createServer} from 'node:net';
import {createFullProjectFixture,cleanupCoreBuildFixture} from '/Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/tests/helpers/core-build-fixture';
import {sourceManifest} from '/Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/scripts/verify-ws06a-browser-closure';
const root=process.cwd(),out=join(root,'../../template/codex/executions/v2.7-ws03a/iteration23');
const save=(n:string,d:unknown)=>writeFileSync(join(out,n),JSON.stringify(d,null,2)+'\n');
const assert=(condition:unknown,message:string)=>{if(!condition)throw Error(message);};
const alive=(pid:number)=>{try{process.kill(pid,0);return true;}catch{return false;}};
const delay=(ms:number)=>new Promise(r=>setTimeout(r,ms));
const report:any={kind:'WS03A_SYNTHETIC_TECHNICAL_PROFILE',profile:{font:'interface',density:'compact',shape:'soft',state:'quiet'},rows:[],overall:'FAIL',errors:[],safariProof:0,axPromotion:false};
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
    const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'no-preference'}),assertions:any=[];
    const check=(n:string,ok:boolean,detail:unknown)=>{assertions.push({name:n,passed:ok,detail});};
    try{
     const response=await page.goto(url,{waitUntil:'networkidle'});check('final-home-response',response?.status()===200,response?.status());
     const observed=await page.evaluate(()=>{
      const html=document.documentElement,cs=getComputedStyle(html),body=getComputedStyle(document.body);
      const one=(q:string)=>{const e=document.querySelector(q);if(!e)throw Error('Missing representative surface '+q);const s=getComputedStyle(e),r=e.getBoundingClientRect();return {font:s.fontFamily,padding:s.paddingTop,minHeight:s.minHeight,height:r.height,width:r.width,radius:s.borderTopLeftRadius,border:s.borderColor,transform:s.transform,shadow:s.boxShadow};};
      return {roles:{font:html.dataset.themeFont,density:html.dataset.themeDensity,shape:html.dataset.themeShape,state:html.dataset.themeState},family:document.body.dataset.pageFamily,bodyFont:body.fontFamily,heading:one('.game-hero__copy h1'),utility:one('.eyebrow'),card:one('.portal-card'),control:one('.button'),shell:one('.shell'),tokens:Object.fromEntries(['shell-gutter','card-padding','control-min-height','section-spacing','font-utility','media-radius'].map(k=>[k,cs.getPropertyValue('--role-'+k).trim()]))};
     });
     check('four-explicit-role-bindings',JSON.stringify(observed.roles)===JSON.stringify(report.profile),observed.roles);check('inventory-family-authority',observed.family==='core',observed.family);
     check('interface-body-and-heading-fonts',observed.bodyFont.startsWith('system-ui')&&observed.heading.font.startsWith('system-ui'),{body:observed.bodyFont,heading:observed.heading.font});check('utility-font-role',observed.utility.font.includes('SFMono-Regular'),observed.utility.font);
     check('compact-consumed-density',observed.tokens['shell-gutter']===(width===800?'28px':'36px')&&observed.tokens['card-padding']==='22px'&&observed.card.padding==='22px'&&observed.tokens['section-spacing'].replace(/\s+/g,'')==='clamp(52px,7vw,96px)',{tokens:observed.tokens,card:observed.card.padding,shell:observed.shell.width});
     check('compact-control-minimum',observed.control.minHeight==='44px'&&observed.control.height>=44,observed.control);
     check('soft-rendered-shape',observed.card.radius==='12px'&&observed.control.radius==='8px'&&observed.tokens['media-radius']==='10px',{card:observed.card.radius,control:observed.control.radius,mediaToken:observed.tokens['media-radius']});
     if(width===1000)check('shell-gutter-real-consumption',Math.abs(observed.shell.width-(width-36))<1,observed.shell.width);
     await page.locator('.portal-card').first().hover();await delay(200);
     const after=await page.locator('.portal-card').first().evaluate((e:Element)=>{const s=getComputedStyle(e);return{transform:s.transform,shadow:s.boxShadow,border:s.borderColor};});
     check('quiet-hover-with-visible-feedback',after.transform==='none'&&after.shadow==='none'&&after.border!==observed.card.border,{before:observed.card,after});
     if(width===1000)await page.screenshot({path:join(out,'screenshots',name+'-alternate-profile.png'),fullPage:false});
     await page.goto(url+'/guides/getting-started/',{waitUntil:'networkidle'});const article=await page.evaluate(()=>({font:getComputedStyle(document.querySelector('h1')!).fontFamily,family:document.body.dataset.pageFamily,fontRole:document.documentElement.dataset.themeFont}));
     check('site-wide-font-with-independent-article-family',article.font.startsWith('system-ui')&&article.fontRole==='interface'&&article.family==='guides',article);
    }catch(e){assertions.push({name:'unexpected-error',passed:false,detail:String(e)});}finally{await page.close();}
    report.rows.push({engine:name,browserVersion:browser.version(),viewport:{width,height:900},assertions,overall:assertions.every(a=>a.passed)?'PASS':'FAIL'});
   }
  }
  assert(sourceManifest(fixture)===patched&&sourceManifest(join(fixture,'dist'))===dist,'Source/build changed during targeted run');report.overall=report.rows.length===6&&report.rows.every((r:any)=>r.overall==='PASS')?'PASS':'FAIL';
 }catch(e){report.errors.push(String(e));}
 finally{
  for(const browser of browsers)await browser.close();
  if(pid&&fixture){cleanup.pidAliveBeforeStop=alive(pid);const stop=spawnSync('npm',['run','preview','--','stop'],{cwd:fixture,encoding:'utf8',timeout:30000});console.log(stop.stdout);console.error(stop.stderr);cleanup.normalStopExit=stop.status;for(let i=0;i<20&&alive(pid);i++)await delay(150);cleanup.pidAliveAfterStop=alive(pid);if(stop.status!==0||cleanup.pidAliveAfterStop){report.errors.push('Normal preview cleanup failed; no signal fallback');report.overall='FAIL';}}
  if(fixture&&(!pid||!alive(pid))){cleanupCoreBuildFixture(fixture);cleanup.fixtureRemoved=!existsSync(fixture);}
  save('03a-cleanup.json',cleanup);save('03a-browser-evidence.json',report);
 }
 console.log(JSON.stringify({overall:report.overall,rows:report.rows.length,errors:report.errors,failed:report.rows.flatMap((r:any)=>r.assertions.filter((a:any)=>!a.passed).map((a:any)=>({engine:r.engine,viewport:r.viewport,...a})))}));
 if(report.overall!=='PASS'||report.errors.length)process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exitCode=1;});
