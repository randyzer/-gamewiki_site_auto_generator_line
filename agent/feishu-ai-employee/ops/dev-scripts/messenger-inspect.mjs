import {chromium} from 'playwright';import path from 'node:path';
const c=await chromium.launchPersistentContext(path.resolve('data/feishu-browser-profile'),{channel:'chrome',headless:false});const p=await c.newPage();
await p.goto('https://l1sbomj6i7.feishu.cn/next/messenger/',{waitUntil:'domcontentloaded'});await p.waitForTimeout(5000);
console.log(JSON.stringify({url:p.url(),text:(await p.locator('body').innerText()).slice(0,3500),inputs:await p.locator('input').evaluateAll(es=>es.map(e=>({placeholder:e.placeholder,aria:e.getAttribute('aria-label'),role:e.role})))},null,2));
await c.close();