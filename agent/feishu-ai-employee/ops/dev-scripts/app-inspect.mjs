import {chromium} from 'playwright';import path from 'node:path';
const c=await chromium.launchPersistentContext(path.resolve('data/feishu-browser-profile'),{channel:'chrome',headless:false});
const p=c.pages()[0]||await c.newPage();await p.goto('https://open.feishu.cn/app?lang=zh-CN',{waitUntil:'domcontentloaded'});await p.getByText('游戏网站 AI 工程师',{exact:true}).first().click();await p.waitForTimeout(1500);
console.log(JSON.stringify({url:p.url(),tabs:c.pages().map(x=>x.url()),text:(await p.locator('body').innerText()).slice(0,3600)},null,2));await c.close();