import {chromium} from 'playwright';import path from 'node:path';
const c=await chromium.launchPersistentContext(path.resolve('data/feishu-browser-profile'),{channel:'chrome',headless:false});const p=await c.newPage();
await p.goto('https://applink.feishu.cn/client/chat/open?openId=ou_d713d4147c56eb8b485dbd3d1945cdbe',{waitUntil:'domcontentloaded',timeout:25000}).catch(e=>console.log('NAV_ERROR',e.message.slice(0,140)));
await p.waitForTimeout(1700);
console.log(JSON.stringify({url:p.url(),title:await p.title(),body:(await p.locator('body').innerText()).slice(0,1100),pages:c.pages().map(q=>q.url())},null,2));await c.close();