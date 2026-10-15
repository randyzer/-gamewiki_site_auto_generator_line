import {chromium} from 'playwright';import path from 'node:path';
const c=await chromium.launchPersistentContext(path.resolve('data/feishu-browser-profile'),{channel:'chrome',headless:false});
const p=await c.newPage();
await p.goto('https://l1sbomj6i7.feishu.cn/next/messenger/',{waitUntil:'domcontentloaded'});
await p.getByText('Workplace',{exact:true}).first().waitFor({timeout:25000});
await p.getByText('Workplace',{exact:true}).first().click();
await p.getByText('All Apps',{exact:true}).first().click();await p.waitForTimeout(2300);
console.log('WORKPLACE_READY',p.url(),'matches',await p.getByText('游戏网站 AI 工程师',{exact:true}).count());
if(!(await p.getByText('游戏网站 AI 工程师',{exact:true}).count())){console.log('BODYHEAD',(await p.locator('body').innerText()).slice(0,900));await c.close();process.exit(2)}
await p.getByText('游戏网站 AI 工程师',{exact:true}).first().click();
await p.waitForTimeout(1200);
console.log(JSON.stringify({url:p.url(),pages:c.pages().map(q=>q.url()),tail:(await p.locator('body').innerText()).slice(-1000),editable:await p.locator('[contenteditable=true]').count()},null,2));
await c.close();