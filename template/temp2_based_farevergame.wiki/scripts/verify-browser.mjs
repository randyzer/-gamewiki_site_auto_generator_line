import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { connectBrowser } from './browser-cdp.mjs';
const routes=JSON.parse(execFileSync('pnpm',['exec','tsx','scripts/print-routes.ts'],{encoding:'utf8'}));
const base=process.env.VERIFY_BASE_URL||'http://localhost:3000';
const round=process.env.VISUAL_ROUND||'final';
const out=path.join(process.cwd(),'artifacts',round);await fs.mkdir(out,{recursive:true});
const browser=await connectBrowser();let target,s;
const errors=[];
browser.onEvent(m=>{if(m.sessionId===s&&(m.method==='Runtime.exceptionThrown'||m.method==='Log.entryAdded'&&m.params.entry.level==='error'||m.method==='Runtime.consoleAPICalled'&&m.params.type==='error'))errors.push(m.params)});
const evaluate=async expression=>{const r=await browser.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true},s);if(r.exceptionDetails)throw Error(r.exceptionDetails.text);return r.result.value};
const waitFor=async(expression,label)=>{const deadline=Date.now()+20000;while(!await evaluate(expression)){if(Date.now()>deadline)throw Error('Browser state timeout: '+label);await new Promise(r=>setTimeout(r,100))}};
const summary=[];
try{
 target=(await browser.send('Target.createTarget',{url:'about:blank',background:true})).targetId;
 s=(await browser.send('Target.attachToTarget',{targetId:target,flatten:true})).sessionId;
 await browser.send('Emulation.setFocusEmulationEnabled',{enabled:true},s);
 await browser.send('Page.enable',{},s);await browser.send('Runtime.enable',{},s);await browser.send('Log.enable',{},s);
 for(const width of [1440,390]){
  await browser.send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width===390},s);
  for(const route of routes){
   await browser.send('Page.navigate',{url:base+route.url},s);
   const deadline=Date.now()+20000;
   while(!await evaluate(`document.readyState==='complete' && location.pathname===${JSON.stringify(route.url)}`)){if(Date.now()>deadline)throw Error('Load timeout: '+route.url);await new Promise(r=>setTimeout(r,100))}
   await evaluate('document.fonts.ready.then(()=>true)');
   const state=await evaluate(`({lang:document.documentElement.lang,title:document.title,width:innerWidth,scrollWidth:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,heading:document.querySelector('h1')?.textContent,images:[...document.images].map(i=>({src:i.getAttribute('src'),loaded:i.complete&&i.naturalWidth>0})),previewLinks:[...document.querySelectorAll('[data-preview] a')].map(a=>a.href),navigation: [...document.querySelectorAll('nav')].some(n=>getComputedStyle(n).display!=='none'),sections:[...document.querySelectorAll('main section')].map(x=>({id:x.id,height:x.getBoundingClientRect().height})),cards:document.querySelectorAll('main .card').length,buttons:document.querySelectorAll('button').length})`);
   assert.equal(state.lang,route.locale,route.url);assert.ok(state.heading);assert.ok(state.navigation);
   assert.ok(state.scrollWidth<=state.width,`Overflow ${route.url} @${width}: ${state.scrollWidth}`);
   assert.ok(state.images.every(i=>i.loaded),`Images ${route.url}`);assert.deepEqual(state.previewLinks,[]);
   await browser.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9},s);
   await browser.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9},s);
   assert.ok(await evaluate(`document.activeElement.tagName==='A' && getComputedStyle(document.activeElement).outlineStyle!=='none'`),`Keyboard focus ${route.url}`);
   if(route.locale==='en'){
    await evaluate('window.scrollTo(0,0)');
    const name=route.suffix===''?'home':route.suffix==='guide'?'guide':'article-'+route.suffix.replaceAll('/','-');
    if(state.height>16000){
     const pieces=[];for(let y=0;y<state.height;y+=7000){const r=await browser.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y,width:state.width,height:Math.min(7000,state.height-y),scale:1}},s);const file=path.join(out,`${name}-${width}-${y}.png`);await fs.writeFile(file,Buffer.from(r.data,'base64'));pieces.push(file)}
     execFileSync('python3',['-c',`from PIL import Image\nimport sys\na=Image.new('RGB',(${state.width},${state.height}))\nfor i,p in enumerate(sys.argv[2:]): a.paste(Image.open(p),(0,i*7000))\na.save(sys.argv[1])`,path.join(out,`${name}-${width}.png`),...pieces]);
     for(const piece of pieces)await fs.unlink(piece);
    }else{const r=await browser.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true},s);await fs.writeFile(path.join(out,`${name}-${width}.png`),Buffer.from(r.data,'base64'))}
   }
   summary.push({route:route.url,width,...state});
  }
 }
 assert.deepEqual(errors,[], 'Browser errors');
 // Follow real site navigation and the language selector, instead of only opening URLs.
 await browser.send('Page.navigate',{url:base+'/'},s);await waitFor(`document.readyState==='complete'&&location.pathname==='/'`,'home');
 await evaluate(`document.querySelector('.header-cta').click()`);await waitFor(`location.pathname==='/guide/'&&document.readyState==='complete'`,'guide');
 assert.ok(await evaluate(`document.querySelector('.guide-grid a.card')!==null`));
 await evaluate(`document.querySelector('.guide-grid a.card').click()`);await waitFor(`document.querySelector('.article-body')!==null&&document.readyState==='complete'`,'article');
 await evaluate(`document.querySelector('.language-links a[lang="de"]').click()`);await waitFor(`document.documentElement.lang==='de'&&document.querySelector('.article-body')!==null&&document.readyState==='complete'`,'language selector');
 assert.deepEqual(errors,[], 'Navigation errors');
 await fs.writeFile(path.join(out,'browser-report.json'),JSON.stringify({checks:summary,errors,navigation:'PASS',mobileNavigation:'Always visible wrapped navigation; reference has no menu toggle.'},null,2));
 console.log(`PASS: ${routes.length} routes at both widths, images, no overflow, previews, keyboard focus, page and language navigation; screenshots: ${out}`);
}finally{if(target)await browser.send('Target.closeTarget',{targetId:target});browser.close()}
