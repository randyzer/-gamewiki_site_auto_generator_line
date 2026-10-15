import {chromium} from 'playwright';import path from 'node:path';
const c=await chromium.launchPersistentContext(path.resolve('data/feishu-browser-profile'),{channel:'chrome',headless:false});
const p=c.pages()[0]||await c.newPage();
await p.goto('https://open.feishu.cn/app/cli_aa476f5e72789ccc/auth',{waitUntil:'domcontentloaded'});
await p.getByText('开通权限',{exact:true}).first().click();await p.waitForTimeout(500);
const input=p.locator('input[placeholder*="im:chat:read"]').last();
await input.fill('读取用户发给机器人的单聊消息');await input.press('Enter');await p.waitForTimeout(900);
console.log(JSON.stringify({text:(await p.locator('body').innerText()).slice(-1900),checkbox:await p.locator('input[type=checkbox]').evaluateAll(es=>es.map(x=>({outer:x.outerHTML.slice(0,200),parent:x.parentElement?.parentElement?.innerText?.slice(0,130)})))},null,2));
await c.close();