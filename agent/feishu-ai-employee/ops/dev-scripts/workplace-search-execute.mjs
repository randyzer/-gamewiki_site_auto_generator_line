import {chromium} from 'playwright';import path from 'node:path';
const c=await chromium.launchPersistentContext(path.resolve('data/feishu-browser-profile'),{channel:'chrome',headless:false});
const p=await c.newPage();await p.goto('https://l1sbomj6i7.feishu.cn/next/messenger/',{waitUntil:'domcontentloaded'});
await p.getByText('Workplace',{exact:true}).first().click();
await p.locator('.appcenter-search-input').click();await p.waitForTimeout(400);
console.log(JSON.stringify({url:p.url(),inputs:await p.locator('input,[contenteditable=true]').evaluateAll(es=>es.map(e=>e.outerHTML.slice(0,180)).slice(0,6)),tail:(await p.locator('body').innerText()).slice(-900)},null,2));await c.close();