import {chromium} from 'playwright';import path from 'node:path';
const c=await chromium.launchPersistentContext(path.resolve('data/feishu-browser-profile'),{channel:'chrome',headless:false});
const p=c.pages()[0]||await c.newPage();
await p.goto('https://open.feishu.cn/app/cli_aa476f5e72789ccc/baseinfo',{waitUntil:'domcontentloaded'});
await p.getByText('协作者管理',{exact:true}).first().click();await p.waitForTimeout(1400);
const body=(await p.locator('body').innerText()).slice(-1700);
const links=await p.locator('a[href]').evaluateAll(es=>es.filter(e=>(e.innerText||'').includes('小景')).map(e=>({text:e.innerText,href:e.getAttribute('href')})).slice(0,4));
console.log(JSON.stringify({url:p.url(),body,links},null,2));await c.close();