import {chromium} from 'playwright';import path from 'node:path';
const c=await chromium.launchPersistentContext(path.resolve('data/feishu-browser-profile'),{channel:'chrome',headless:false});
const p=c.pages()[0]||await c.newPage();await p.goto('https://open.feishu.cn/app/cli_aa476f5e72789ccc/event',{waitUntil:'domcontentloaded'});
await p.getByText('添加事件',{exact:true}).first().waitFor({timeout:20000});
await p.getByText('添加事件',{exact:true}).first().click();
await p.getByText('消息与群组',{exact:true}).last().click();
await p.waitForTimeout(550);
console.log((await p.locator('body').innerText()).slice(-2500));
await c.close();