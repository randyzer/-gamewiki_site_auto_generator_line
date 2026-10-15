import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { getArticle, discoverRoutes } from '../src/lib/content';
import { locales, localePath } from '../src/lib/i18n';
import { compileMDX } from 'next-mdx-remote/rsc';
import { renderToStaticMarkup } from 'react-dom/server';

const bridge = process.env.CDP_BRIDGE_URL ?? 'http://127.0.0.1:3467';
const base = process.env.VERIFY_BASE_URL ?? 'http://localhost:3000';
async function cdp(method: string, params: Record<string, unknown> = {}, target?: string) {
  const response = await fetch(bridge, { method: 'POST', body: JSON.stringify({ method, params, target }) });
  const payload = await response.json();
  if (!response.ok || payload.error) throw new Error(payload.error ?? `CDP ${response.status}`);
  return payload.result;
}
const { targetId } = await cdp('Target.createTarget', { url: 'about:blank', background: true });
async function evaluate(expression: string) {
  const result = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, targetId);
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result?.value;
}
async function navigate(path: string) {
  await cdp('Page.navigate', { url: `${base}${path}` }, targetId);
  for (let attempt = 0; attempt < 100; attempt++) {
    if (await evaluate(`location.pathname === ${JSON.stringify(path)} && document.readyState === 'complete' && !!document.querySelector('main h1') && document.querySelector('header')?.dataset.hydrated === 'true'`)) return;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Browser load timeout: ${path}`);
}
const output = process.env.VERIFY_OUTPUT_DIR ?? 'docs/verification';
await mkdir(output, { recursive: true });
const report: unknown[] = [];
try {
  await cdp('Page.enable', {}, targetId);
  await cdp('Runtime.enable', {}, targetId);
  await cdp('Emulation.setFocusEmulationEnabled', { enabled: true }, targetId);
  await cdp('Page.addScriptToEvaluateOnNewDocument', { source: `window.__codexErrors=[];addEventListener('error',e=>window.__codexErrors.push(e.message));addEventListener('unhandledrejection',e=>window.__codexErrors.push(String(e.reason)));const old=console.error;console.error=(...args)=>{window.__codexErrors.push(args.map(String).join(' '));old.apply(console,args)}` }, targetId);
  for (const width of [1440, 390]) {
    await cdp('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width === 390 }, targetId);
    for (const route of discoverRoutes()) {
      await navigate(route.pathname);
      await evaluate('document.fonts.ready.then(()=>true)');
      const state = await evaluate(`({path:location.pathname,width:innerWidth,height:document.documentElement.scrollHeight,overflow:document.documentElement.scrollWidth>innerWidth,errors:window.__codexErrors,images:[...document.images].every(i=>i.complete&&i.naturalWidth>0),sections:[...document.querySelectorAll('main>section,main>article')].map(e=>({tag:e.tagName,y:e.getBoundingClientRect().y,height:e.getBoundingClientRect().height}))})`);
      assert.equal(state.overflow, false, `${route.pathname} at ${width}: overflow`);
      assert.deepEqual(state.errors, [], `${route.pathname}: browser errors`);
      assert.equal(state.images, true, `${route.pathname}: images`);
      if (route.kind === 'article') {
        const article = getArticle(route.locale, route.pathname.split('/').at(-1)!)!;
        const { content } = await compileMDX({ source: article.body, options: { blockJS: true } });
        const expectedHtml = renderToStaticMarkup(content);
        const body = await evaluate(`(()=>{const expected=document.createElement('div');expected.innerHTML=${JSON.stringify(expectedHtml)};const actual=document.querySelector('[data-mdx-body]');const normalize=s=>s.replace(/\s+/g,' ').trim();return {present:!!actual,actual:normalize(actual?.textContent??''),expected:normalize(expected.textContent)}})()`);
        assert.equal(body.present, true, `${route.pathname}: MDX body exists`);
        assert.ok(body.actual.length > 0, `${route.pathname}: MDX body nonempty`);
        assert.equal(body.actual, body.expected, `${route.pathname}: complete MDX source rendered`);
      }
      if (route.locale === 'en' && (route.kind !== 'article' || route.pathname === '/guides/beginner-opening-guide')) {
        await evaluate('window.scrollTo(0,0)');
        const { cssContentSize } = await cdp('Page.getLayoutMetrics', {}, targetId);
        const shot = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width, height: cssContentSize.height, scale: 1 } }, targetId);
        await writeFile(`${output}/${route.kind}-${width}.png`, Buffer.from(shot.data, 'base64'));
      }
      report.push(state);
    }
  }
  for (const locale of locales) {
    await navigate(localePath(locale));
    const menuSelector = '[data-menu-button]';
    await evaluate(`document.querySelector('${menuSelector}').focus()`);
    await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', text: '\r', unmodifiedText: '\r', windowsVirtualKeyCode: 13 }, targetId);
    await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 }, targetId);
    for (let i = 0; i < 50; i++) {
      if (await evaluate(`document.querySelector('${menuSelector}').getAttribute('aria-expanded') === 'true'`)) break;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    assert.equal(await evaluate(`document.querySelector('${menuSelector}').getAttribute('aria-expanded')`), 'true', `${locale}: keyboard opens menu`);
    assert.equal(await evaluate(`document.getElementById(document.querySelector('${menuSelector}').getAttribute('aria-controls')).hidden`), false);
    const openLabel = await evaluate(`document.querySelector('${menuSelector}').getAttribute('aria-label')`);
    await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }, targetId);
    for (let i = 0; i < 50; i++) {
      if (await evaluate(`document.querySelector('${menuSelector}').getAttribute('aria-expanded') === 'false'`)) break;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    assert.equal(await evaluate(`document.querySelector('${menuSelector}').getAttribute('aria-expanded')`), 'false');
    assert.equal(await evaluate(`document.activeElement === document.querySelector('${menuSelector}')`), true, `${locale}: Escape restores focus`);
    assert.notEqual(await evaluate(`document.querySelector('${menuSelector}').getAttribute('aria-label')`), openLabel);
    await evaluate(`document.querySelector('a[data-guides-link]').click()`);
    for (let i = 0; i < 100; i++) {
      if (await evaluate(`location.pathname===${JSON.stringify(localePath(locale, '/guides'))} && !!document.querySelector('[data-guide-card]')`)) break;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.equal(await evaluate('location.pathname'), localePath(locale, '/guides'));
    await evaluate(`document.querySelector('a[data-guide-card]').click()`);
    for (let i = 0; i < 100; i++) {
      if (await evaluate(`!!document.querySelector('[data-mdx-body]')`)) break;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.ok(await evaluate(`!!document.querySelector('[data-mdx-body]')?.textContent.trim()`), `${locale}: list to MDX detail`);
  }
  await writeFile(`${output}/browser-report.json`, JSON.stringify(report, null, 2));
  console.log(`PASS: ${report.length} dynamic route/viewport checks, complete core screenshots, all-locale keyboard menus, aria and home → list → MDX navigation.`);
} finally { await cdp('Target.closeTarget', { targetId }); }
