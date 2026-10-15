import {chromium} from 'playwright';import path from 'node:path';
const c=await chromium.launchPersistentContext(path.resolve('data/feishu-browser-profile'),{channel:'chrome',headless:false});
const p=c.pages()[0]||await c.newPage();
await p.goto('https://open.feishu.cn/app/cli_aa476f5e72789ccc/version/7696042113158597846',{waitUntil:'domcontentloaded'});
await p.getByText('版本详情',{exact:true}).waitFor({timeout:20000});
await p.waitForTimeout(1000);
console.log(JSON.stringify({body:(await p.locator('body').innerText()).slice(-1900),buttons:await p.locator('button').evaluateAll(es=>es.map(e=>e.innerText).filter(Boolean).slice(-25))},null,2));
await c.close();