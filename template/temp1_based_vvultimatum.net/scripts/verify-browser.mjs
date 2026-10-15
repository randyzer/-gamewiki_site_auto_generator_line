import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { discoverArticles, siteRoutes } from '../src/lib/content.ts';

const base = process.env.VERIFY_BASE_URL || 'http://localhost:3000';
const round = process.env.VERIFICATION_ROUND || 'before';
const task = process.env.TABBIT_TASK || 'Spirit Atlas verification';
const cli = process.env.TABBIT_CLI || path.join(os.homedir(), '.local/bin/tabbit-cli');
const folder = path.join(process.cwd(), 'artifacts', `browser-${round}`);
const routes = siteRoutes(discoverArticles());
await fs.mkdir(folder, { recursive: true });
const program = `
const base = ${JSON.stringify(base)};
const routes = ${JSON.stringify(routes)};
const results = [], screenshots = [], errors = [], extensionErrors = [], requests = [], failedRequests = [];
const onConsole = message => { if (message.type() === 'error') { const detail = {text:message.text(),location:message.location()}; if(detail.location.url.startsWith('chrome-extension://')) extensionErrors.push(detail); else errors.push(detail); } };
const onError = error => errors.push(error.message);
const onRequest = request => requests.push(request.url());
const onFailed = request => { if(request.url().startsWith(base)) failedRequests.push({url:request.url(),failure:request.failure()}); };
page.on('requestfailed', onFailed); page.on('console', onConsole); page.on('pageerror', onError); page.on('request', onRequest);
const navigate = async route => {
  await page.goto(base + route, {waitUntil:'networkidle'});
  await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(i => i.decode().catch(() => {}))); });
};
await page.goto(base, {waitUntil:'networkidle'});
await page.evaluate(()=>localStorage.setItem('spirit-atlas-theme','dark'));
let failure = null;
try {
  for (const width of [1440, 390]) {
    await page.setViewportSize({width, height:900});
    for (const [name,route] of [['home','/'],['races','/races'],['article','/races/shinigami']]) {
      await navigate(route);
      // Desktop browser scrollbars must not reduce a simulated phone's content width.
      if (width === 390) await page.addStyleTag({content:'html{scrollbar-width:none}::-webkit-scrollbar{display:none}'});
      const state = await page.evaluate(() => ({width:innerWidth, contentWidth:document.documentElement.clientWidth, scrollWidth:document.documentElement.scrollWidth, height:document.documentElement.scrollHeight, images:[...document.images].filter(e=>e.getClientRects().length).every(e=>e.complete&&e.naturalWidth>0), headings:[...document.querySelectorAll('main h2')].map(e=>({text:e.innerText,y:Math.round(e.getBoundingClientRect().top+scrollY)})), sections:[...document.querySelector('main').children].filter(e=>e.getClientRects().length).map(e=>({tag:e.tagName,y:Math.round(e.getBoundingClientRect().top+scrollY),h:Math.round(e.getBoundingClientRect().height)})), counts:{trending:document.querySelectorAll('.trending-card').length,explore:document.querySelectorAll('.explore-card').length,faq:document.querySelectorAll('.faq-item').length,guides:document.querySelectorAll('.guide-grid>.guide-card').length,body:document.querySelectorAll('.article-body>section').length}, ariaValid:[...document.querySelectorAll('[aria-controls]')].every(e=>document.getElementById(e.getAttribute('aria-controls'))), uniqueIds:(()=>{const ids=[...document.querySelectorAll('[id]')].map(e=>e.id);return new Set(ids).size===ids.length})()}));
      expect(state.width).toEqual(width); expect(state.scrollWidth).toBeLessThanOrEqual(width); expect(state.images).toEqual(true);
      const shot = await page.screenshot({fullPage:true});
      screenshots.push({name:name+'-'+width+'.png',path:shot.path}); results.push({name,route,...state});
      if (name === 'home') { expect(state.counts.trending).toEqual(11); expect(state.counts.explore).toEqual(9); expect(state.counts.faq).toEqual(8); }
      if (name === 'races') expect(state.counts.guides).toBeGreaterThanOrEqual(6);
      if (name === 'article') { expect(state.counts.body).toEqual(6); if(width === 390) { await expect(page.locator('.article-section-nav')).toBeVisible(); expect(await page.locator('.article-section-nav a,.article-section-nav>.preview').count()).toBeGreaterThanOrEqual(6); } }
    }
  }
  for (const width of [1440,390]) {
    await page.setViewportSize({width,height:900}); await navigate('/');
    if (width===390) await page.addStyleTag({content:'html{scrollbar-width:none}::-webkit-scrollbar{display:none}'});
    await page.locator('.faq-item:nth-child(2) button').focus(); await page.keyboard.press('Enter');
    await expect(page.locator('.faq-item:nth-child(2) button')).toHaveAttribute('aria-expanded','true');
    await expect(page.locator('#faq-answer-1')).toBeVisible();
    await expect(page.locator('.faq-item:first-child button')).toHaveAttribute('aria-expanded','false');
    await page.locator('.carousel-dots button').nth(1).click();
    await expect(page.locator('.carousel-dots button').nth(1)).toHaveAttribute('aria-current','true');
    await page.locator('.carousel-dots button').last().click();
    await expect(page.locator('.carousel-dots button').last()).toHaveAttribute('aria-current','true');
    await page.locator('.carousel-dots button').nth(0).click();
    await expect(page.locator('.carousel-dots button').nth(0)).toHaveAttribute('aria-current','true');
    await page.locator('.carousel-viewport').focus(); await page.keyboard.press('ArrowRight');
    await expect(page.locator('.carousel-dots button').nth(1)).toHaveAttribute('aria-current','true');
    if(width===1440) {
      await page.locator('.desktop-theme .theme-button').click();
      await expect(page.locator('html').first()).toHaveAttribute('data-theme','light');
      await page.reload({waitUntil:'networkidle'}); await expect(page.locator('html').first()).toHaveAttribute('data-theme','light');
      await page.locator('.desktop-theme .theme-button').click();
      await expect(page.locator('html').first()).toHaveAttribute('data-theme','dark');
      await page.locator('.wiki-row').nth(1).click(); await expect(page.locator('#desktop-wiki-section-1')).toBeVisible();
    } else {
      await page.locator('.menu-button').focus(); await page.keyboard.press('Enter');
      await expect(page.locator('.menu-button')).toHaveAttribute('aria-expanded','true');
      await expect(page.locator('#mobile-navigation')).toBeVisible();
      const shot = await page.screenshot({fullPage:false}); screenshots.push({name:'mobile-menu.png',path:shot.path});
      await page.keyboard.press('Enter'); await expect(page.locator('#mobile-navigation')).toBeHidden();
      await page.locator('.category-trigger').click(); await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.locator('.category-trigger')).toHaveAttribute('aria-expanded','true');
      expect(await page.evaluate(()=>{const ids=[...document.querySelectorAll('[id]')].map(e=>e.id); return new Set(ids).size===ids.length;})).toEqual(true);
      await page.keyboard.press('Shift+Tab');
      expect(await page.locator('#mobile-categories').evaluate(el=>el.contains(document.activeElement))).toEqual(true);
      await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toBeHidden();
      await expect(page.locator('.category-trigger')).toBeFocused();
    }
    await navigate('/races'); await page.locator('.guide-grid a').first().click();
    await expect(page).toHaveURL(base+'/races/shinigami');
  }
  await page.setViewportSize({width:390,height:900});
  for (const route of routes) {
    await navigate(route); await page.addStyleTag({content:'html{scrollbar-width:none}::-webkit-scrollbar{display:none}'});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toEqual(true);
    const state = await page.evaluate(()=>({ariaValid:[...document.querySelectorAll('[aria-controls]')].every(e=>document.getElementById(e.getAttribute('aria-controls'))),uniqueIds:(()=>{const ids=[...document.querySelectorAll('[id]')].map(e=>e.id);return new Set(ids).size===ids.length})()}));
    expect(state.ariaValid).toEqual(true); expect(state.uniqueIds).toEqual(true);
  }
  expect(errors).toEqual([]); expect(failedRequests).toEqual([]);
  expect(requests.filter(url=>/^https?:/.test(url)&&!url.startsWith(base))).toEqual([]);
} catch(error) {failure=error.message;} finally {page.off('requestfailed',onFailed);page.off('console',onConsole);page.off('pageerror',onError);page.off('request',onRequest);}
return {results,screenshots,errors,extensionErrors,failedRequests,externalRequests:requests.filter(url=>/^https?:/.test(url)&&!url.startsWith(base)),verifiedRoutes:routes,failure};
`;
const run = (args, input) => new Promise((resolve, reject) => {
  const child = spawn(cli, args, {stdio:['pipe','pipe','pipe']});
  let stdout='', stderr='';
  child.stdout.on('data', chunk=>stdout+=chunk); child.stderr.on('data',chunk=>stderr+=chunk);
  child.on('error',reject); child.on('close',()=>{
    try {resolve(JSON.parse(stdout.trim().split('\n').at(-1)));} catch {reject(new Error(stderr || stdout));}
  }); child.stdin.end(input);
});
const requestId = `verify-${round}-${randomUUID()}`;
let receipt = await run(['nodejs','--task',task,'--request-id',requestId,'--timeout-ms','60000'],program);
while (['running','queued'].includes(receipt.status)) receipt = await run(['receipt','--task',task,'--request-id',requestId,'--wait-ms','60000']);
assert.equal(receipt.status,'succeeded',JSON.stringify(receipt.error || receipt));
const report = receipt.result.value;
assert.ok(report, 'Expected bounded inline Tabbit verification result');
for (const shot of report.screenshots) {assert.ok(shot.path, 'Screenshot receipt path'); await fs.copyFile(shot.path,path.join(folder,shot.name));}
await fs.writeFile(path.join(folder,'report.json'),JSON.stringify(report,null,2));
for (const result of report.results) console.log(`${result.route} ${result.width}px: ${result.height}px height, overflow ${result.scrollWidth > result.width}`);
assert.equal(report.failure,null,report.failure || 'browser verification');
console.log(`PASS ${routes.length} dynamic routes, interactions, ARIA, console, network and six complete screenshots: ${folder}`);
