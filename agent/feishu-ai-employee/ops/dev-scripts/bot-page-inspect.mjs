import {chromium} from 'playwright';import path from 'node:path';
const c=await chromium.launchPersistentContext(path.resolve('data/feishu-browser-profile'),{channel:'chrome',headless:false});
const p=c.pages()[0]||await c.newPage();await p.goto('https://open.feishu.cn/app/cli_aa476f5e72789ccc/baseinfo',{waitUntil:'domcontentloaded'});await p.getByText('机器人',{exact:true}).first().waitFor({timeout:20000});await p.getByText('机器人',{exact:true}).last().click();await p.waitForTimeout(1300);
console.log(JSON.stringify({url:p.url(),text:(await p.locator('body').innerText()).slice(-2800),buttons:await p.locator('button').evaluateAll(es=>es.map(e=>e.innerText).filter(Boolean).slice(-22))},null,2));
await c.close();