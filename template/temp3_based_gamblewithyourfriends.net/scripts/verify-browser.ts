import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { getPages } from '../lib/content';
import { locales, pathFor } from '../lib/site';
import { cdp, evaluate } from './cdp';

const base = process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3000';
const output = path.join(process.cwd(), 'artifacts', 'screenshots');
await mkdir(output, { recursive: true });
const pages = getPages();
const report: unknown[] = [];
for (const page of pages) {
  const { targetId } = await cdp<{targetId:string}>('Target.createTarget', { url: 'about:blank' });
  try {
    const { sessionId } = await cdp<{sessionId:string}>('Target.attachToTarget', { targetId, flatten: true });
    await cdp('Runtime.enable', {}, sessionId);
    await cdp('Log.enable', {}, sessionId);
    for (const width of [1440, 390]) {
      await cdp('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width === 390 }, sessionId);
      await cdp('Verification.clearErrors', {}, sessionId);
      await evaluate(sessionId, 'document.documentElement.setAttribute("data-verification-pending", "true")');
      await cdp('Page.navigate', { url: `${base}${page.path}` }, sessionId);
      let ready = false;
      for (let i = 0; i < 30; i++) {
        ready = await evaluate<boolean>(sessionId, 'document.readyState === "complete" && !document.documentElement.hasAttribute("data-verification-pending") && !!document.querySelector("footer")');
        if (ready) break;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      assert.ok(ready, `ready ${page.path}`);
      await evaluate(sessionId, 'document.fonts.ready.then(() => true)');
      await evaluate(sessionId, `(() => {
        window.__verificationErrors = [];
        window.addEventListener('error', e => window.__verificationErrors.push(e.message));
        window.addEventListener('unhandledrejection', e => window.__verificationErrors.push(String(e.reason)));
        document.documentElement.style.scrollBehavior = 'auto';
        [...document.images].forEach(image => { image.loading = 'eager'; });
      })()`);
      const height = await evaluate<number>(sessionId, 'document.documentElement.scrollHeight');
      for (let y = 0; y < height; y += 750) { await evaluate(sessionId, `scrollTo(0,${y})`); await new Promise(resolve => setTimeout(resolve, 40)); }
      await evaluate(sessionId, 'Promise.race([Promise.all([...document.images].map(i => i.decode().catch(() => null))),new Promise(resolve=>setTimeout(resolve,8000))]).then(() => true)');
      await evaluate(sessionId, 'scrollTo(0,0)');
      await new Promise(resolve => setTimeout(resolve, 80));
      const state = await evaluate<{width:number;height:number;scrollWidth:number;lang:string;images:boolean[];errors:string[];sections:unknown[];cards:number;faqs:number}>(sessionId, `({width:innerWidth,height:document.documentElement.scrollHeight,scrollWidth:document.documentElement.scrollWidth,lang:document.documentElement.lang,images:[...document.images].map(i=>i.complete&&i.naturalWidth>0),errors:window.__verificationErrors,sections:[...document.querySelectorAll('main [data-section],main [data-article-section]')].map(e=>({name:e.getAttribute('data-section')||e.querySelector('h2,h3')?.textContent,height:e.getBoundingClientRect().height})),cards:document.querySelectorAll('[data-guide-card]').length,faqs:document.querySelectorAll('details').length})`);
      assert.equal(state.lang, page.locale, 'language');
      assert.ok(state.scrollWidth <= state.width, `overflow ${page.path} ${width}: ${state.scrollWidth}`);
      assert.ok(state.images.every(Boolean), `images ${page.path}`);
      assert.deepEqual(state.errors, [], 'browser errors');
      if (page.slug === '') { assert.equal(state.cards, 14 + pages.filter(p => p.locale === page.locale && p.article && p.slug !== 'beginner-guide').length); assert.equal(state.faqs, 12); }
      if (page.slug === 'guide') assert.equal(state.cards, 6 + pages.filter(p => p.locale === page.locale && p.article && p.slug !== 'beginner-guide').length);
      const consoleErrors = await cdp<{errors:{params?:{entry?:{url?:string}}}[]}>('Verification.getErrors', {}, sessionId);
      const extensionErrors = consoleErrors.errors.filter(error => error.params?.entry?.url?.startsWith('chrome-extension://'));
      const applicationErrors = consoleErrors.errors.filter(error => !error.params?.entry?.url?.startsWith('chrome-extension://'));
      assert.deepEqual(applicationErrors, [], `console errors ${page.path}`);
      const tiles: {input:Buffer;top:number;left:number}[] = [];
      for (let y = 0; y < state.height; y += 6000) {
        const shot = await cdp<{ data:string }>('Page.captureScreenshot', { captureBeyondViewport: true, clip: { x:0,y,width,height:Math.min(6000,state.height-y),scale:1 } }, sessionId);
        tiles.push({ input: Buffer.from(shot.data, 'base64'), top: y, left: 0 });
      }
      const name = `${page.locale}-${page.slug.replaceAll('/', '-') || 'home'}-${width}`;
      await sharp({create:{width,height:state.height,channels:3,background:'#0d0d0d'}}).composite(tiles).png().toFile(path.join(output, `${name}.png`));
      report.push({ path: page.path, viewport: width, ...state, extensionErrors });
      await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
      const faq = await evaluate<boolean>(sessionId, '!!document.querySelector("summary")');
      if (faq) {
        await cdp('Page.bringToFront', {}, sessionId);
        await evaluate(sessionId, 'document.querySelector("summary").focus()');
        await cdp('Input.dispatchKeyEvent', { type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r',unmodifiedText:'\r' }, sessionId);
        await cdp('Input.dispatchKeyEvent', { type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13 }, sessionId);
        await new Promise(resolve => setTimeout(resolve, 60));
        assert.equal(await evaluate(sessionId, 'document.querySelector("details").open'), true, 'keyboard FAQ opens');
        await cdp('Input.dispatchKeyEvent', { type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r',unmodifiedText:'\r' }, sessionId);
        await cdp('Input.dispatchKeyEvent', { type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13 }, sessionId);
        await new Promise(resolve => setTimeout(resolve, 60));
        assert.equal(await evaluate(sessionId, 'document.querySelector("details").open'), false, 'keyboard FAQ closes');
      }
      if (width === 390) {
        await cdp('Page.bringToFront', {}, sessionId);
        await evaluate(sessionId, 'scrollTo(0,0);document.querySelector(".menu-toggle").focus()');
        await cdp('Input.dispatchKeyEvent', { type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r',unmodifiedText:'\r' }, sessionId);
        await cdp('Input.dispatchKeyEvent', { type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13 }, sessionId);
        await new Promise(resolve => setTimeout(resolve, 60));
        const menu = await evaluate<{expanded:string;hidden:boolean;controls:string;label:string}>(sessionId, '({expanded:document.querySelector(".menu-toggle").getAttribute("aria-expanded"),hidden:document.querySelector("#mobile-navigation").hidden,controls:document.querySelector(".menu-toggle").getAttribute("aria-controls"),label:document.querySelector(".menu-toggle").getAttribute("aria-label")})');
        assert.equal(menu.expanded, 'true'); assert.equal(menu.hidden, false); assert.equal(menu.controls, 'mobile-navigation');
        const openedLabel = menu.label;
        await cdp('Input.dispatchKeyEvent', { type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27 }, sessionId);
        await cdp('Input.dispatchKeyEvent', { type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27 }, sessionId);
        await new Promise(resolve => setTimeout(resolve, 60));
        const closed = await evaluate<{expanded:string;hidden:boolean;label:string;focused:boolean}>(sessionId, '({expanded:document.querySelector(".menu-toggle").getAttribute("aria-expanded"),hidden:document.querySelector("#mobile-navigation").hidden,label:document.querySelector(".menu-toggle").getAttribute("aria-label"),focused:document.activeElement===document.querySelector(".menu-toggle")})');
        assert.equal(closed.expanded, 'false'); assert.equal(closed.hidden, true); assert.notEqual(closed.label, openedLabel); assert.ok(closed.focused);
      }
      console.log(`PASS browser ${page.path} ${width}px (${state.height}px)`);
    }
    if (page.slug === '') {
      await cdp('Verification.clearErrors', {}, sessionId);
      for (const [slug, selector, marker] of [
        ['guide', '.home-hero a.primary', '[data-section="quick-start"]'],
        ['beginner-guide', '.quick-card a.primary', '[data-mdx="beginner-guide"]'],
        ['', '.breadcrumb a', '[data-section="hero"]'],
      ]) {
        await evaluate(sessionId, `document.querySelector(${JSON.stringify(selector)}).focus()`);
        await cdp('Input.dispatchKeyEvent', {type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r',unmodifiedText:'\r'}, sessionId);
        await cdp('Input.dispatchKeyEvent', {type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13}, sessionId);
        let navigated = false;
        for (let i = 0; i < 30; i++) {
          navigated = await evaluate<boolean>(sessionId, `location.pathname === ${JSON.stringify(pathFor(page.locale,slug))} && !!document.querySelector(${JSON.stringify(marker)})`);
          if (navigated) break;
          await new Promise(resolve => setTimeout(resolve,100));
        }
        assert.ok(navigated, `keyboard navigation ${page.locale} -> ${slug || 'home'}`);
      }
      const navigationErrors = await cdp<{errors:{params?:{entry?:{url?:string}}}[]}>('Verification.getErrors', {}, sessionId);
      assert.deepEqual(navigationErrors.errors.filter(error => !error.params?.entry?.url?.startsWith('chrome-extension://')), [], 'client navigation errors');
      console.log(`PASS keyboard Home -> Guide -> Article -> Home (${page.locale})`);
    }
  } finally { await cdp('Target.closeTarget', { targetId }); }
}
// The three core routes are deliberate fixed requirements, while all MDX pages above are discovered.
for (const locale of locales) for (const slug of ['', 'guide', 'beginner-guide']) assert.ok(pages.some(page => page.path === pathFor(locale, slug)));
await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
console.log(`PASS ${report.length} dynamically discovered page/viewport checks; screenshots: ${output}`);
