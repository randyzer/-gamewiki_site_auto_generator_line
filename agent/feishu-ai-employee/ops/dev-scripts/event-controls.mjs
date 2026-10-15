import {chromium} from 'playwright';import path from 'node:path';
const c=await chromium.launchPersistentContext(path.resolve('data/feishu-browser-profile'),{channel:'chrome',headless:false});
const p=c.pages()[0]||await c.newPage();await p.goto('https://open.feishu.cn/app/cli_aa476f5e72789ccc/event',{waitUntil:'domcontentloaded'});
await p.getByText('事件配置',{exact:true}).first().waitFor();await p.waitForTimeout(1300);
console.log(JSON.stringify(await p.locator('button,[role=button],input,select').evaluateAll(es=>es.map(e=>({tag:e.tagName,label:e.innerText?.slice(0,80),html:e.outerHTML.slice(0,260)})).filter(x=>x.label||x.tag==='INPUT').slice(-40)),null,2));
await c.close();