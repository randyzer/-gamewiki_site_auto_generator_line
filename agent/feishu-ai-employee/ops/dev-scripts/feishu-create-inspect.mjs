import {chromium} from 'playwright';import path from 'node:path';
const c=await chromium.launchPersistentContext(path.resolve('data/feishu-browser-profile'),{channel:'chrome',headless:false});
const p=c.pages()[0]||await c.newPage();await p.goto('https://open.feishu.cn/app?lang=zh-CN',{waitUntil:'domcontentloaded'});
await p.getByText('创建企业自建应用',{exact:true}).first().click();await p.waitForTimeout(900);
console.log(JSON.stringify({url:p.url(),body:(await p.locator('body').innerText()).slice(-2100),inputs:await p.locator('input').evaluateAll(es=>es.map(e=>({placeholder:e.placeholder,type:e.type})))},null,2));await c.close();