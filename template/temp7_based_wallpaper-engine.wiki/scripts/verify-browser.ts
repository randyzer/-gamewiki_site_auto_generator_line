import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { discoverRoutes } from '../lib/content.ts';
import { BrowserSession } from './browser-session.ts';
const base=process.env.VERIFY_BASE_URL||'http://localhost:3000';
const output=path.join(process.cwd(),'artifacts/screenshots');fs.mkdirSync(output,{recursive:true});
const browser=await BrowserSession.connect();
let targetId='';
const report:{path:string;width:number;height:number;overflow:boolean;images:number}[]=[];
try{
  targetId=(await browser.send<{targetId:string}>('Target.createTarget',{url:'about:blank',background:true})).targetId;
  const {sessionId}=await browser.send<{sessionId:string}>('Target.attachToTarget',{targetId,flatten:true});
  const call=<T=Record<string,unknown>>(method:string,params:Record<string,unknown>={})=>browser.send<T>(method,params,sessionId);
  const evaluate=<T>(expression:string)=>browser.evaluate<T>(sessionId,expression);
  await call('Page.enable');await call('Runtime.enable');await call('Log.enable');
  async function ready(route:string){
    await call('Page.navigate',{url:base+route});
    const deadline=Date.now()+20000;let loaded=false;
    while(Date.now()<deadline){loaded=await evaluate<boolean>(`location.pathname===${JSON.stringify(route)}&&document.readyState==='complete'&&!!document.querySelector('main h1')`);if(loaded)break;await new Promise(r=>setTimeout(r,100));}
    assert(loaded,`Loaded ${route}`);
    await evaluate(`document.fonts.ready`);
    await evaluate(`Promise.all([...document.images].map(e=>{e.loading='eager';return e.decode().catch(()=>null)}))`);
    await evaluate(`scrollTo({top:0,behavior:'instant'})`);
    await new Promise(r=>setTimeout(r,150));
  }
  for(const width of [1440,390]){
    await call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width===390});
    for(const route of discoverRoutes()){
      await ready(route.path);
      const metrics=await evaluate<{width:number;height:number;overflow:boolean;images:number;broken:string[];lang:string}>(`({width:innerWidth,height:document.documentElement.scrollHeight,overflow:document.documentElement.scrollWidth>innerWidth,images:document.images.length,broken:[...document.images].filter(e=>!e.complete||!e.naturalWidth).map(e=>e.getAttribute('src')),lang:document.documentElement.lang})`);
      assert.equal(metrics.lang,route.locale);assert.equal(metrics.overflow,false,`Overflow: ${route.path} @${width}`);assert.deepEqual(metrics.broken,[],`Images: ${route.path}`);
      const filename=(route.path==='/'?'home':route.path.replace(/^\/|\/$/g,'').replaceAll('/','-'))+`-${width}.png`;
      const screenshot=await call<{data:string}>('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width,height:metrics.height,scale:1}});
      fs.writeFileSync(path.join(output,filename),Buffer.from(screenshot.data,'base64'));
      report.push({path:route.path,width,height:metrics.height,overflow:metrics.overflow,images:metrics.images});
    }
  }
  await ready('/');
  await call('Emulation.setFocusEmulationEnabled',{enabled:true});
  // Native keyboard opens the focused mobile menu; its label and aria state must agree.
  await call('Page.bringToFront');
  await evaluate(`document.querySelector('button[aria-controls="mobile-navigation"]').focus()`);
  await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r'});
  await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
  await new Promise(r=>setTimeout(r,100));
  assert.equal(await evaluate(`document.querySelector('button[aria-controls="mobile-navigation"]').getAttribute('aria-expanded')`),'true');
  assert.equal(await evaluate(`document.querySelector('button[aria-controls="mobile-navigation"]').getAttribute('aria-label')`),'Close menu');
  await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  assert.equal(await evaluate(`document.querySelector('button[aria-controls="mobile-navigation"]').getAttribute('aria-expanded')`),'false');
  await evaluate(`document.querySelector('button[aria-controls="language-menu"]').click()`);
  assert.equal(await evaluate(`document.querySelector('#language-menu a[lang="zh-CN"]').getAttribute('href')`),'/zh-cn/');
  await evaluate(`document.querySelector('#language-menu a[lang="zh-CN"]').click()`);
  await new Promise(r=>setTimeout(r,400));
  await ready('/zh-cn/');
  assert.equal(await evaluate(`document.querySelector('button[aria-controls="mobile-navigation"]').getAttribute('aria-label')`),'打开菜单');
  await ready('/');
  await evaluate(`document.querySelector('button[aria-controls="faq-answer-0"]').click()`);
  assert.equal(await evaluate(`document.querySelector('button[aria-controls="faq-answer-0"]').getAttribute('aria-expanded')`),'true');
  assert.equal(await evaluate(`document.querySelector('#faq-answer-0').hidden`),false);
  await evaluate(`document.querySelector('button[aria-label="Search"]').click()`);
  await call('Input.insertText',{text:'Install'});
  await new Promise(r=>setTimeout(r,150));
  assert.equal(await evaluate(`!!document.querySelector('dialog[open] .search-results a[href="/guide/install-and-setup/"]')`),true,'Published MDX appears in search');
  assert.equal(await evaluate(`document.querySelectorAll('dialog[open] [data-preview]').length`),0);
  await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await new Promise(r=>setTimeout(r,100));
  assert.equal(await evaluate(`!!document.querySelector('.search-dialog[open]')`),false,'Escape closes search');
  assert.equal(await evaluate(`document.activeElement.getAttribute('aria-label')`),'Search','Search restores focus');
  await evaluate(`document.querySelector('button[aria-label="Switch to light theme"]').click()`);assert.equal(await evaluate(`document.documentElement.dataset.theme`),'light');
  await evaluate(`document.querySelector('button[aria-label="Switch to dark theme"]').click()`);
  await ready('/guide/install-and-setup/');
  await evaluate(`document.querySelector('.mobile-toc button').click()`);
  assert.equal(await evaluate(`document.querySelector('.mobile-toc button').getAttribute('aria-expanded')`),'true');
  await evaluate(`document.querySelector('.mobile-toc nav a').click()`);await new Promise(r=>setTimeout(r,150));
  assert.equal(await evaluate(`location.hash.length>1`),true,'Article anchor navigation');
  assert.equal(await evaluate(`document.querySelector('.mobile-toc button').getAttribute('aria-expanded')`),'false');
  await evaluate(`document.querySelector('.video-poster').click()`);assert.equal(await evaluate(`!!document.querySelector('.video-dialog[open]')`),true);
  await evaluate(`document.querySelector('.video-dialog .dialog-close').click()`);
  const errors=browser.events.filter(e=>e.sessionId===sessionId&&(e.method==='Runtime.exceptionThrown'||(e.method==='Runtime.consoleAPICalled'&&e.params.type==='error')||(e.method==='Log.entryAdded'&&(e.params.entry as {level?:string})?.level==='error')));
  // Chrome extensions inject into the existing user profile. Preserve this exact
  // extension-protocol failure separately; never suppress application errors.
  const extensionWarnings=errors.filter(event=>event.method==='Log.entryAdded'&&(event.params.entry as {source?:string;url?:string})?.source==='network'&&(event.params.entry as {url?:string})?.url==='chrome-extension://invalid/');
  const appErrors=errors.filter(event=>!extensionWarnings.includes(event));
  fs.writeFileSync(path.join(output,'environment-warnings.json'),JSON.stringify(extensionWarnings,null,2));
  if(extensionWarnings.length)console.log(`Environment warning: ${extensionWarnings.length} existing Chrome extension requests failed at chrome-extension://invalid/; recorded separately.`);
  assert.deepEqual(appErrors,[],'No application console errors, failed resources or uncaught exceptions');
  fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
  console.log('PASS: all discovered locale routes at 1440/390, full-page screenshots, image loading, overflow, native keyboard menu, language links, FAQ aria, search, focus, theme, article anchors and video preview.');
}finally{if(targetId)await browser.send('Target.closeTarget',{targetId}).catch(()=>{});browser.close();}
