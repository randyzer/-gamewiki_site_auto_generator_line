import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, readlinkSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { join, relative } from 'node:path';
import { createFullProjectFixture, cleanupCoreBuildFixture } from '/Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/tests/helpers/core-build-fixture';
const root='/Users/randyz/work/coding/hot_words_web';
const starter=join(root,'Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE');
const out=join(root,'template/codex/executions/v2.7-ws06a/iteration16');
const taskRequire=createRequire(join(starter,'package.json'));
const {chromium,firefox,webkit}=taskRequire('playwright');
const hash=(x)=>createHash('sha256').update(x).digest('hex');
const save=(name,data)=>writeFileSync(join(out,name),JSON.stringify(data,null,2)+'\n');
const delay=(ms)=>new Promise(resolve=>setTimeout(resolve,ms));
function manifest(base){const files=[];const excluded=new Set(['.git','node_modules','dist','.astro','.astro-cache','.vite-cache','.vitest-cache','.wrangler','coverage','.browser-evidence','.DS_Store']);function visit(dir){for(const name of readdirSync(dir).sort()){if(excluded.has(name)||name.startsWith('.env'))continue;const p=join(dir,name),s=lstatSync(p);if(s.isDirectory())visit(p);else files.push({path:relative(base,p),sha256:hash(s.isSymbolicLink()?readlinkSync(p):readFileSync(p)),mode:s.mode&0o777,symlink:s.isSymbolicLink()});}}visit(base);return hash(JSON.stringify(files));}
function alive(pid){try{process.kill(pid,0);return true;}catch(e){if(e.code==='ESRCH')return false;throw e;}}
function run(args,cwd){const result=spawnSync('npm',args,{cwd,encoding:'utf8',timeout:60000,maxBuffer:12*1024*1024});console.log(result.stdout||'');console.error(result.stderr||'');if(result.error||result.status!==0)throw Error('npm '+args.join(' ')+' exit '+result.status);return result;}
const activeCode=`(() => {const a=document.activeElement,r=a?.getBoundingClientRect(),s=a?getComputedStyle(a):null;return {tag:a?.tagName,id:a?.id,class:a?.className,href:a?.getAttribute('href'),text:a?.textContent?.trim().slice(0,100),tabIndex:a?.tabIndex,focusVisible:a?.matches(':focus-visible'),pageId:a?.closest('[data-nav-page-id]')?.getAttribute('data-nav-page-id'),area:a?.closest('.mobile-nav')?'mobile':a?.closest('.desktop-nav')?'desktop':a?.closest('.brand')?'brand':'other',rect:r?{width:r.width,height:r.height}:null,visibility:s?.visibility,display:s?.display};})()`;
async function sequence(page,keys){const result=[];for(const key of keys){await page.keyboard.press(key);result.push({key,...await page.evaluate(activeCode)});}return result;}
async function tabTo(page,selector,max=100){for(let i=0;i<max;i++){await page.keyboard.press('Tab');if(await page.locator(selector).evaluate(e=>e===document.activeElement))return i+1;}throw Error('Tab target unreachable '+selector);}

const observers=`(() => {window.__diagnosticTrace=[];window.__expectedId=null;window.__captureDiagnostic=(label)=>{const a=document.activeElement,m=document.querySelector('.mobile-nav'),d=document.querySelector('.desktop-nav');const match=[...document.querySelectorAll('.desktop-nav [data-nav-page-id]')].find(e=>e.getAttribute('data-nav-page-id')===window.__expectedId);const t=match?.matches('a[href]')?match:match?.querySelector('a[href]');const s=t?getComputedStyle(t):null;const r=t?.getBoundingClientRect();const rec={label,time:performance.now(),width:innerWidth,height:innerHeight,mql:matchMedia('(max-width:900px)').matches,mobileVisible:!!m&&m.getClientRects().length>0&&getComputedStyle(m).display!=='none',desktopVisible:!!d&&d.getClientRects().length>0&&getComputedStyle(d).display!=='none',outerOpen:m?.open,nestedOpen:[...document.querySelectorAll('.mobile-nav details')].map(e=>e.open),active:{tag:a?.tagName,class:a?.className,href:a?.getAttribute('href'),text:a?.textContent?.trim().slice(0,80),pageId:a?.closest('[data-nav-page-id]')?.getAttribute('data-nav-page-id'),area:a?.closest('.mobile-nav')?'mobile':a?.closest('.desktop-nav')?'desktop':a?.closest('.brand')?'brand':'other'},target:{expectedId:window.__expectedId,exists:!!t,visible:!!r&&r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none',rect:r?{width:r.width,height:r.height}:null,display:s?.display,visibility:s?.visibility}};window.__diagnosticTrace.push(rec);return rec;};window.addEventListener('resize',()=>window.__captureDiagnostic('event:resize'));matchMedia('(max-width:900px)').addEventListener('change',()=>window.__captureDiagnostic('event:mql-change'));for(const name of ['focusin','focusout','toggle'])document.addEventListener(name,()=>window.__captureDiagnostic('event:'+name),true);})()`;
async function capture(p,label){return p.evaluate(`window.__captureDiagnostic(${JSON.stringify(label)})`);}

// Observation-only browser harness: navigation setup uses real keyboard events.
const checks = {
  desktopChild: `document.activeElement?.closest('.desktop-nav [data-nav-page-id]')?.getAttribute('data-nav-page-id')==='guide.getting-started'`,
  menu: `document.activeElement===document.querySelector('.mobile-nav > summary')`,
  brand: `document.activeElement===document.querySelector('.brand')`,
  mobileChild: `document.activeElement?.closest('.mobile-nav__children [data-nav-page-id]')?.getAttribute('data-nav-page-id')==='guide.getting-started'`,
  outsideDesktop: `!document.activeElement?.closest('.desktop-nav')`,
};
async function checkpoint(p, record, name, condition) {
  try {
    await p.waitForFunction(condition, {}, {timeout:4000});
    record.checkpoints.push({name, reached:true, state:await capture(p,name)});
  } catch (error) {
    record.checkpoints.push({name,reached:false,error:String(error),state:await capture(p,name+':TIMEOUT')});
    throw error;
  }
}
async function resize(p, record, width, condition, closed = false) {
  await p.setViewportSize({width,height:800});
  await capture(p,'SET_VIEWPORT_RETURNED');
  for (const label of ['RAF_1','RAF_2']) {
    await p.evaluate('new Promise(r=>requestAnimationFrame(r))');
    await capture(p,label);
  }
  await checkpoint(p,record,'MQL_EXPECTED_STATE',`matchMedia('(max-width:900px)').matches===${width<=900}`);
  await checkpoint(p,record,'NAV_VISIBILITY_SETTLED',width<=900
    ? `getComputedStyle(document.querySelector('.mobile-nav')).display!=='none'&&getComputedStyle(document.querySelector('.desktop-nav')).display==='none'`
    : `getComputedStyle(document.querySelector('.desktop-nav')).display!=='none'&&getComputedStyle(document.querySelector('.mobile-nav')).display==='none'`);
  await checkpoint(p,record,'FINAL_FOCUS_STATE',condition);
  if(closed) await checkpoint(p,record,'DISCLOSURES_CLOSED',`!document.querySelector('.mobile-nav').open&&[...document.querySelectorAll('.mobile-nav details')].every(e=>!e.open)`);
}
async function mobileChild(p) {
  await tabTo(p,'.mobile-nav > summary');
  await p.keyboard.press('Enter');
  await p.locator('.mobile-nav[open]').waitFor();
  await tabTo(p,'.mobile-nav__group > summary');
  await p.keyboard.press('Space');
  await p.locator('.mobile-nav__group[open]').first().waitFor();
  await tabTo(p,'.mobile-nav__children [data-nav-page-id="guide.getting-started"] a');
}
async function shiftTabToBrand(p) {
  for(let i=0;i<30;i++) {
    await p.keyboard.press('Shift+Tab');
    if(await p.locator('.brand').evaluate(e=>e===document.activeElement)) return;
  }
  throw Error('Brand unreachable through Shift+Tab');
}
async function repairCase(browser, engine, id, url) {
  const reverse=['R2','R5','R8'].includes(id);
  const c=await browser.newContext({viewport:{width:reverse?901:899,height:800}});
  const record={engine,id,status:'FAIL',checkpoints:[],events:[],error:null};
  const p=await c.newPage();
  const exceptions=[];
  p.on('pageerror',e=>exceptions.push(String(e)));
  try {
    await p.bringToFront();
    await p.addInitScript(observers+`;document.addEventListener('pointerdown',()=>window.__captureDiagnostic('event:pointerdown'),true);`);
    await p.goto(url,{waitUntil:'networkidle'});
    if(reverse) await tabTo(p,'.desktop-nav [data-nav-page-id="guide.getting-started"] a');
    else await mobileChild(p);
    await p.evaluate(`window.__expectedId='guide.getting-started'`);
    record.start=await capture(p,'KEYBOARD_CHILD_READY');
    if(['R4','R10'].includes(id)) {
      await p.keyboard.press('Escape');
      await p.keyboard.press('Escape');
      await checkpoint(p,record,'ESCAPE_MENU_IDENTITY',checks.menu);
      if(id==='R4') {
        await p.keyboard.press('Shift+Tab');
        await checkpoint(p,record,'OUTSIDE_BRAND_FOCUS',checks.brand);
      }
    }
    if(id==='R5') await shiftTabToBrand(p);
    if(id==='R6') {
      const point=await p.locator('main').evaluate(e=>{
        const r=e.getBoundingClientRect();
        for(let y=Math.max(r.top+8,120);y<Math.min(r.bottom,innerHeight-20);y+=20)
          for(let x=Math.max(r.left+4,8);x<Math.min(r.right-4,innerWidth-8);x+=20) {
            const t=document.elementFromPoint(x,y);
            if(t===e&&!t.closest('a,button,input,textarea,select,summary,[tabindex]'))return{x,y,tag:t.tagName};
          }
        throw Error('No actual main nonfocusable blank hit point');
      });
      record.pointer=point;
      await p.mouse.click(point.x,point.y);
      record.afterPointer=await capture(p,'AFTER_OUTSIDE_POINTER');
    }
    if(id==='R9') {
      const target=p.locator('.desktop-nav [data-nav-page-id="guide.getting-started"]');
      record.removedTargetCount=await target.count();
      if(record.removedTargetCount!==1)throw Error('Expected exactly one disposable destination');
      await target.evaluate(e=>e.remove());
    }
    if(['R1','R3'].includes(id)) {
      await resize(p,record,901,checks.desktopChild,true);
      if(id==='R3')await resize(p,record,899,checks.menu,true);
    } else if(id==='R2')await resize(p,record,899,checks.menu,true);
    else if(['R4','R9','R10'].includes(id))await resize(p,record,901,checks.brand,true);
    else if(id==='R5')await resize(p,record,899,checks.brand,true);
    else if(id==='R6')await resize(p,record,901,checks.outsideDesktop,true);
    else if(id==='R7') {
      await resize(p,record,850,checks.mobileChild);
      await checkpoint(p,record,'SAME_MODE_DISCLOSURES_UNCHANGED',`document.querySelector('.mobile-nav').open&&document.querySelector('.mobile-nav__group').open`);
    } else if(id==='R8')await resize(p,record,1200,checks.desktopChild);
    if(exceptions.length)throw Error('Browser page errors: '+exceptions.join('; '));
    record.status='PASS';
  } catch(error) {
    record.error=String(error);
  } finally {
    record.final=await capture(p,'END');
    record.events=await p.evaluate('window.__diagnosticTrace');
    record.pageErrors=exceptions;
    await c.close();
  }
  return record;
}
async function noJsCase(browser,engine,id,url) {
  const c=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
  const record={engine,id,status:'FAIL',error:null};
  try {
    const p=await c.newPage();await p.bringToFront();await p.goto(url,{waitUntil:'networkidle'});
    await mobileChild(p);
    record.before=await p.evaluate(activeCode);
    const child=p.locator('.mobile-nav__children [data-nav-page-id="guide.getting-started"] a');
    record.expectedUrl=new URL(await child.getAttribute('href'),url).href;
    await Promise.all([p.waitForURL(record.expectedUrl,{timeout:4000}),p.keyboard.press('Enter')]);
    record.finalUrl=p.url();record.articleCount=await p.locator('article').count();
    record.articleVisible=await p.locator('article').first().isVisible();
    if(record.articleCount<1||!record.articleVisible)throw Error('Native child navigation did not reach visible article');
    record.status='PASS';
  } catch(error){record.error=String(error);}finally{await c.close();}
  return record;
}
async function main() {
  mkdirSync(out,{recursive:true});
  const source=manifest(starter);
  let fixture,pid;
  const browsers={};
  const report={status:'FAIL',identity:{source,engines:{}},cases:[],infrastructureError:null};
  const cleanup={startedPid:null,astroStopExit:null,pidAliveBeforeStop:false,pidAliveAfterStop:false,fallbackSignalUsed:false,fixtureRemoved:false,infrastructureError:null};
  try {
    if(taskRequire('playwright/package.json').version!=='1.63.0')throw Error('Playwright mismatch');
    for(const [name,type] of Object.entries({chromium,firefox})) {
      browsers[name]=await type.launch({headless:true});
      report.identity.engines[name]={version:browsers[name].version(),executable:type.executablePath()};
    }
    fixture=createFullProjectFixture(true);
    report.identity.fixtureSource=manifest(fixture);
    run(['run','build'],fixture);
    if(manifest(fixture)!==report.identity.fixtureSource)throw Error('Fixture source changed');
    for(const f of ['EVIDENCE_BUILD_NOT_FINAL.json','privacy/index.html','terms/index.html'])
      if(existsSync(join(fixture,'dist',f)))throw Error('Forbidden final '+f);
    report.identity.dist=manifest(join(fixture,'dist'));
    const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
    const port=server.address().port;await new Promise(r=>server.close(r));
    const url='http://127.0.0.1:'+port;
    const result=run(['run','preview','--','--background','--host','127.0.0.1','--port',String(port)],fixture);
    pid=Number(result.stdout.match(/\(pid (\d+)\)/)?.[1]);
    if(!pid)throw Error('Cannot bind preview PID');cleanup.startedPid=pid;
    let ready=false;
    for(let i=0;i<60;i++) {
      if(!alive(pid))throw Error('Preview stopped');
      try{if((await fetch(url)).status===200){ready=true;break;}}catch{}
      await delay(100);
    }
    if(!ready)throw Error('Preview readiness timeout');
    for(const id of Array.from({length:10},(_,i)=>'R'+(i+1))) {
      const result=await repairCase(browsers.chromium,'chromium',id,url);
      report.cases.push(result);console.log('Focused',result.engine,id,result.status,result.error||'');
    }
    for(const id of ['R1','R2','R3']) {
      const result=await repairCase(browsers.firefox,'firefox',id,url);
      report.cases.push(result);console.log('Focused',result.engine,id,result.status,result.error||'');
    }
    for(const [name,id] of [['chromium','N1'],['firefox','N2']]) {
      const result=await noJsCase(browsers[name],name,id,url);
      report.cases.push(result);console.log('Focused',name,id,result.status,result.error||'');
    }
    report.identity.fixtureSourceAfter=manifest(fixture);
    report.identity.distAfter=manifest(join(fixture,'dist'));
    if(report.identity.fixtureSourceAfter!==report.identity.fixtureSource||report.identity.distAfter!==report.identity.dist)
      throw Error('Disposable source/dist changed');
  }catch(error){report.infrastructureError=String(error);console.error(error);}finally{
    for(const b of Object.values(browsers))await b.close();
    if(pid&&fixture) {
      cleanup.pidAliveBeforeStop=alive(pid);
      const stopped=spawnSync('npm',['run','preview','--','stop'],{cwd:fixture,encoding:'utf8',timeout:15000});
      console.log(stopped.stdout||'');cleanup.astroStopExit=stopped.status;
      for(let i=0;i<30&&alive(pid);i++)await delay(100);
      cleanup.pidAliveAfterStop=alive(pid);
    }
    if(fixture&&!cleanup.pidAliveAfterStop)cleanupCoreBuildFixture(fixture);
    cleanup.fixtureRemoved=!fixture||!existsSync(fixture);
    report.identity.sourceAfter=manifest(starter);
    report.identity.scriptSha256=hash(readFileSync(join(out,'live-resize-repair-control.ts')));
    if(!report.infrastructureError&&report.cases.length===15&&report.cases.every(x=>x.status==='PASS')&&
      source===report.identity.sourceAfter&&cleanup.astroStopExit===0&&!cleanup.pidAliveAfterStop&&cleanup.fixtureRemoved)
      report.status='PASS';
    save('focused-browser-evidence.json',report);save('preview-cleanup-audit.json',cleanup);
    if(report.status!=='PASS')process.exitCode=1;
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
