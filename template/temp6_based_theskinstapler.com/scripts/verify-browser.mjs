import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { connectBrowser } from './browser-cdp.mjs';
const base = process.env.VERIFY_BASE_URL || 'http://localhost:3000';
const output = process.env.VERIFY_OUTPUT_DIR || 'artifacts/browser';
await fs.mkdir(output, {recursive:true});
await fs.rm(`${output}/result.json`, {force:true});
const browser = await connectBrowser();
const {targetId} = await browser.send('Target.createTarget', {url:'about:blank',background:true});
const {sessionId: session} = await browser.send('Target.attachToTarget', {targetId,flatten:true});
const errors = [];
browser.listeners.add((event) => {
  if (event.sessionId !== session) return;
  if (event.method === 'Runtime.exceptionThrown') errors.push(event.params.exceptionDetails.exception?.description || event.params.exceptionDetails.text);
  if (event.method === 'Runtime.consoleAPICalled' && event.params.type === 'error') errors.push(event.params.args.map((arg) => arg.value || arg.description).join(' '));
});
await browser.send('Page.enable',{},session); await browser.send('Runtime.enable',{},session);
async function navigate(path) {
  await browser.send('Page.navigate',{url:base+path},session);
  await browser.send('Page.bringToFront',{},session);
  for (let attempt = 0; attempt < 60; attempt++) {
    const ready = await browser.evaluate(session,`location.pathname === ${JSON.stringify(path)} && document.readyState === 'complete' && !!document.querySelector('main h1')`);
    if (ready) break;
    if (attempt === 59) throw new Error(`Page not ready: ${path}`);
    await new Promise(resolve => setTimeout(resolve,100));
  }
  await browser.evaluate(session,`(async()=>{for(const x of document.images)x.loading='eager';await document.fonts.ready;await Promise.all([...document.images].map(x=>x.decode()));await new Promise(r=>setTimeout(r,300));return true})()`);
}
async function capture(name,width) {
  const metrics = await browser.evaluate(session,`(()=>{scrollTo({top:0,behavior:'instant'});const rect=x=>{const r=x.getBoundingClientRect();return {tag:x.tagName,text:x.innerText?.slice(0,100),x:r.x,y:r.y,w:r.width,h:r.height}};return {width:innerWidth,height:document.body.scrollHeight,overflow:document.documentElement.scrollWidth>innerWidth,landmarks:[...document.querySelectorAll('header,section,article,aside,footer,h1,h2,h3')].map(rect),images:[...document.images].map(x=>({src:x.currentSrc,loaded:x.complete&&x.naturalWidth>0}))}})()`);
  assert.equal(metrics.overflow,false,`${name}-${width}: horizontal overflow`);
  assert.ok(metrics.images.every(image => image.loaded),`${name}-${width}: unloaded image`);
  const screenshot = await browser.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width,height:metrics.height,scale:1}},session);
  await fs.writeFile(`${output}/${name}-${width}.png`,Buffer.from(screenshot.data,'base64'));
  await fs.writeFile(`${output}/${name}-${width}.json`,JSON.stringify(metrics,null,2));
  console.log(`${name} ${width}px: ${metrics.height}px, images loaded, no overflow`);
  return metrics;
}
try {
 for(const width of [1440,390]) {
  await browser.send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width===390},session);
  for(const [name,path] of [['home','/'],['guides','/guides'],['article','/guides/midnight-evidence-developer']]) {
   await navigate(path); await capture(name,width);
   if(name==='home') {
    const counts=await browser.evaluate(session,`({start:document.querySelectorAll('.start-card').length,mechanics:document.querySelectorAll('.mechanic-card').length,popular:document.querySelectorAll('.popular-card').length,faq:document.querySelectorAll('.faq-card').length,about:document.querySelectorAll('.about-copy h3').length})`);
    assert.deepEqual(counts,{start:4,mechanics:4,popular:4,faq:6,about:6});
   }
   if(name==='guides') assert.equal(await browser.evaluate(session,`document.querySelectorAll('.guide-card').length`),35);
   if(name==='article') {
    assert.equal(await browser.evaluate(session,`document.querySelectorAll('.article-body table tbody tr').length`),6);
    assert.equal(await browser.evaluate(session,`document.querySelectorAll('.article-body h2').length`),7);
   }
  }
 }
 if(process.env.CAPTURE_REFERENCE==='true') {
  await fs.mkdir('artifacts/reference', { recursive:true });
  for(const [name,url] of [['home','https://theskinstapler.com/'],['guides','https://theskinstapler.com/guides'],['article','https://theskinstapler.com/guides/the-skin-stapler-developer']]) {
   const {targetId: referenceTarget}=await browser.send('Target.createTarget',{url,background:true});
   try {
    const {sessionId: reference}=await browser.send('Target.attachToTarget',{targetId:referenceTarget,flatten:true});
    await browser.send('Page.enable',{},reference);await browser.send('Page.bringToFront',{},reference);
    for(let i=0;i<60;i++){if(await browser.evaluate(reference,`document.readyState==='complete'&&!!document.querySelector('main h1')`))break;if(i===59)throw new Error('Reference page did not load: '+url);await new Promise(r=>setTimeout(r,100));}
    await browser.evaluate(reference,`(()=>{for(const img of document.images)img.loading='eager';return true})()`);
    for(const width of [1440,390]) {
     await browser.send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width===390},reference);
     await browser.evaluate(reference,`(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(x=>x.decode()));scrollTo({top:0,behavior:'instant'});await new Promise(r=>setTimeout(r,300));return true})()`);
     const height=await browser.evaluate(reference,'document.body.scrollHeight');
     const image=await browser.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width,height,scale:1}},reference);
     await fs.writeFile(`artifacts/reference/${name}-${width}.png`,Buffer.from(image.data,'base64'));
    }
   } finally {await browser.send('Target.closeTarget',{targetId:referenceTarget});}
  }
 }
 await browser.send('Page.bringToFront',{},session);
 await navigate('/');
 const menuClosed=await browser.evaluate(session,`(()=>{const b=document.querySelector('.menu-button');b.focus();return {expanded:b.getAttribute('aria-expanded'),label:b.getAttribute('aria-label'),controls:b.getAttribute('aria-controls'),focused:document.activeElement===b}})()`);
 assert.equal(menuClosed.expanded,'false'); assert.equal(menuClosed.controls,'mobile-navigation');assert.ok(menuClosed.focused);
 await browser.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',text:'\r',unmodifiedText:'\r',windowsVirtualKeyCode:13},session);
 await browser.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',text:'\r',unmodifiedText:'\r',windowsVirtualKeyCode:13},session);
 await new Promise(r=>setTimeout(r,150));
 const menuOpen=await browser.evaluate(session,`({expanded:document.querySelector('.menu-button').getAttribute('aria-expanded'),label:document.querySelector('.menu-button').getAttribute('aria-label'),hidden:document.querySelector('#mobile-navigation').hidden})`);
 assert.equal(menuOpen.expanded,'true');assert.equal(menuOpen.hidden,false);assert.notEqual(menuClosed.label,menuOpen.label);
 await browser.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27},session);
 await new Promise(r=>setTimeout(r,150));
 assert.equal(await browser.evaluate(session,`document.querySelector('.menu-button').getAttribute('aria-expanded')`),'false');
 await browser.evaluate(session,`document.querySelector('.search-trigger').click()`);
 assert.ok(await browser.evaluate(session,`document.querySelector('dialog').open&&document.activeElement===document.querySelector('#wiki-search')`));
 await browser.send('Input.insertText',{text:'Hollow Signal'},session);
 await new Promise(resolve=>setTimeout(resolve,150));
 assert.equal(await browser.evaluate(session,`document.querySelectorAll('.search-results a').length`),1);
 await browser.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',text:'\r',unmodifiedText:'\r',windowsVirtualKeyCode:13},session);
 await browser.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',text:'\r',unmodifiedText:'\r',windowsVirtualKeyCode:13},session);
 for(let i=0;i<30;i++){if(await browser.evaluate(session,`location.pathname==='/guides/midnight-evidence-developer'`))break;await new Promise(r=>setTimeout(r,100));}
 assert.equal(await browser.evaluate(session,'location.pathname'),'/guides/midnight-evidence-developer');
 await browser.evaluate(session,`document.querySelector('.search-trigger').click()`);
 await browser.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27},session);
 await new Promise(r=>setTimeout(r,150));
 assert.ok(await browser.evaluate(session,`!document.querySelector('dialog').open&&document.activeElement===document.querySelector('.search-trigger')`));
 for(const locale of ['de','pt-BR','es','zh-CN']) {
  for(const width of [1440,390]) {
   await browser.send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width===390},session);
   for(const [name,suffix] of [['home',''],['guides','/guides'],['article','/guides/midnight-evidence-developer']]) {
    await navigate(`/${locale}${suffix}`);await capture(`${name}-${locale}`,width);
    assert.equal(await browser.evaluate(session,'document.documentElement.lang'),locale);
   }
  }
 }
 await browser.evaluate(session,`(()=>{const select=document.querySelector('#site-language');select.value='de';select.dispatchEvent(new Event('change',{bubbles:true}));return true})()`);
 for(let i=0;i<50;i++){if(await browser.evaluate(session,`location.pathname==='/de/guides/midnight-evidence-developer'&&document.readyState==='complete'`))break;await new Promise(r=>setTimeout(r,100));}
 assert.equal(await browser.evaluate(session,'location.pathname'),'/de/guides/midnight-evidence-developer');
 assert.deepEqual(errors,[],'Browser console errors');
 await fs.writeFile(`${output}/result.json`,JSON.stringify({passed:true,errors,checks:['six full-page screenshots','images','overflow','module counts','keyboard menu and aria','search and focus return','localized article routes','language switch']},null,2));
 console.log('PASS: browser interactions, accessibility state, language switch and console.');
} finally {
 await browser.send('Target.closeTarget',{targetId});browser.close();
}
