import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { discoverContent, allRoutes } from '../src/lib/content';
import { parsePath } from '../src/lib/i18n';
import { messages } from '../src/lib/messages';

const bridge = process.env.BROWSER_BRIDGE_URL ?? 'http://localhost:3457';
const base = process.env.VERIFY_BASE_URL ?? 'http://localhost:3000';
const output = process.env.BROWSER_ARTIFACT_DIR ?? 'artifacts/browser';
async function api(operation: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const response = await fetch(`${bridge}/${operation}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok) throw new Error(`${operation}: ${data.error}`);
  return data;
}
async function evaluate(targetId: string, expression: string) { return (await api('eval', { targetId, expression })).value; }
const docs = discoverContent();
const paths = allRoutes(docs);
await mkdir(output, { recursive: true });
const reports: unknown[] = [];
for (const path of paths) {
  const { targetId } = await api('new', { url: new URL(path, base).href }) as { targetId: string };
  try {
    await evaluate(targetId, `(async()=>{const end=Date.now()+15000;while(location.href!==${JSON.stringify(new URL(path, base).href)}||document.readyState!=="complete"||!document.querySelector('h1')){if(Date.now()>end)throw new Error('Page loading timeout');await new Promise(r=>setTimeout(r,100));}await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));return true})()`);
    for (const width of [1440, 390]) {
      await api('viewport', { targetId, width });
      await evaluate(targetId, '(async()=>{await new Promise(r=>setTimeout(r,200));return true})()');
      const state = await evaluate(targetId, `(()=>{
        const errors=[];addEventListener('error',e=>errors.push(e.message));
        const overflow=[...document.querySelectorAll('main *')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&(r.right>innerWidth+1||r.left< -1)}).map(e=>e.tagName+'.'+e.className);
        return {lang:document.documentElement.lang,h1:document.querySelectorAll('h1').length,width:innerWidth,scroll:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,overflow,images:[...document.images].map(i=>({src:i.getAttribute('src'),loaded:i.complete&&i.naturalWidth>0})),anchors:[...document.querySelectorAll('.toc a')].map(a=>({href:a.getAttribute('href'),exists:!!document.getElementById(decodeURIComponent(a.hash.slice(1)))})),links:[...document.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')).filter(h=>h.startsWith('/')&&!h.startsWith('//')),previewLinks:document.querySelectorAll('[data-preview][href]').length,errors};
      })()`) as { lang: string; h1: number; width: number; scroll: number; height: number; overflow: string[]; images: { src: string; loaded: boolean }[]; anchors: { href: string; exists: boolean }[]; links: string[]; previewLinks: number; errors: string[] };
      const route = parsePath(path.split('/').filter(Boolean))!;
      assert.equal(state.lang, route.locale, `html lang ${path}`);
      assert.equal(state.h1, 1, `H1 count ${path}`);
      assert.ok(state.scroll <= width, `Horizontal scroll ${path} ${width}`);
      assert.deepEqual(state.overflow, [], `Overflow ${path} ${width}`);
      assert.ok(state.images.every(image => image.loaded), `Broken image ${path}`);
      assert.ok(state.anchors.every(anchor => anchor.exists), `Broken TOC ${path}`);
      assert.equal(state.previewLinks, 0, `Preview has a misleading link ${path}`);
      for (const href of state.links) assert.ok(paths.includes(href), `Unknown internal link ${path}: ${href}`);
      assert.deepEqual(state.errors, []);
      if (width === 1440) {
        await evaluate(targetId, 'document.querySelector(".nav-group button").focus();true');
        await api('key', { targetId, key: 'Enter' });
        assert.equal(await evaluate(targetId, 'document.querySelector(".nav-group button").getAttribute("aria-expanded")'), 'true');
        await evaluate(targetId, 'document.querySelector(".nav-dropdown a").focus();true');
        await api('key', { targetId, key: 'Escape' });
        assert.deepEqual(await evaluate(targetId, '({expanded:document.querySelector(".nav-group button").getAttribute("aria-expanded"),focused:document.activeElement===document.querySelector(".nav-group button")})'), { expanded: 'false', focused: true });
      }
      await evaluate(targetId, 'document.querySelector(".language summary").focus();true');
      await api('key', { targetId, key: 'Enter' });
      assert.equal(await evaluate(targetId, 'document.querySelector(".language").open'), true);
      await evaluate(targetId, 'document.querySelector(".language-options a").focus();true');
      await api('key', { targetId, key: 'Escape' });
      assert.deepEqual(await evaluate(targetId, '({open:document.querySelector(".language").open,focused:document.activeElement===document.querySelector(".language summary")})'), { open: false, focused: true });
      if (width === 390) {
        const m = messages[route.locale];
        await evaluate(targetId, 'document.querySelector(".hamburger").focus();true');
        await api('key', { targetId, key: 'Enter' });
        await evaluate(targetId, '(async()=>{await new Promise(r=>setTimeout(r,100));return true})()');
        const menu = await evaluate(targetId, '({expanded:document.querySelector(".hamburger").getAttribute("aria-expanded"),label:document.querySelector(".hamburger").getAttribute("aria-label"),hidden:document.getElementById("mobile-menu").hidden})') as { expanded: string; label: string; hidden: boolean };
        assert.deepEqual(menu, { expanded: 'true', label: m.closeMenu, hidden: false });
        await api('key', { targetId, key: 'Escape' });
        const closed = await evaluate(targetId, '({expanded:document.querySelector(".hamburger").getAttribute("aria-expanded"),label:document.querySelector(".hamburger").getAttribute("aria-label"),focused:document.activeElement===document.querySelector(".hamburger")})');
        assert.deepEqual(closed, { expanded: 'false', label: m.openMenu, focused: true });
        const hasFaq = await evaluate(targetId, '!!document.querySelector(".faq summary")');
        if (['', 'guides', 'guides/how-to-play'].includes(route.slug)) assert.equal(hasFaq, true, `Missing core FAQ ${path}`);
        if (hasFaq) {
          await evaluate(targetId, 'document.querySelector(".faq summary").focus();true');
          await api('key', { targetId, key: 'Enter' });
          assert.equal(await evaluate(targetId, 'document.querySelector(".faq details").open'), true);
          await api('key', { targetId, key: 'Enter' });
          assert.equal(await evaluate(targetId, 'document.querySelector(".faq details").open'), false);
        }
      }
      reports.push({ path, ...state });
      if (route.locale === 'en') {
        await evaluate(targetId, 'document.activeElement.blur();scrollTo(0,0);true');
        const { data } = await api('screenshot', { targetId, width }) as { data: string };
        await writeFile(`${output}/${route.slug.replaceAll('/', '-') || 'home'}-${width}.png`, Buffer.from(data, 'base64'));
      }
    }
    assert.deepEqual((await api('errors', { targetId })).errors, [], `Browser console/runtime errors ${path}`);
  } finally { await api('close', { targetId }); }
}
await writeFile(`${output}/report.json`, JSON.stringify(reports, null, 2));
console.log(`Browser verification passed for ${paths.length} dynamically discovered routes at 1440/390px; screenshots in ${output}.`);
