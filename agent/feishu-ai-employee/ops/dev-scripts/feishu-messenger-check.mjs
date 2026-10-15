import {chromium} from 'playwright';import path from 'node:path';
const c=await chromium.launchPersistentContext(path.resolve('data/feishu-browser-profile'),{channel:'chrome',headless:false});const p=await c.newPage();
await p.goto('https://www.feishu.cn/messenger/',{waitUntil:'domcontentloaded',timeout:35000}).catch(e=>console.log('NAV',e.message.slice(0,130)));
await p.waitForTimeout(1800);
console.log(JSON.stringify({url:p.url(),title:await p.title(),body:(await p.locator('body').innerText()).slice(0,1700)},null,2));
await c.close();