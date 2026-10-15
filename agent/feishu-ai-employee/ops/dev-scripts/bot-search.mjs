import {chromium} from 'playwright';import path from 'node:path';
const c=await chromium.launchPersistentContext(path.resolve('data/feishu-browser-profile'),{channel:'chrome',headless:false});
const p=await c.newPage();await p.goto('https://l1sbomj6i7.feishu.cn/next/messenger/',{waitUntil:'domcontentloaded'});
await p.getByText('Messenger',{exact:true}).first().waitFor({timeout:20000});
await p.getByText('Search',{exact:true}).first().click();
await p.keyboard.type('游戏网站 AI 工程师',{delay:30});await p.waitForTimeout(1800);
console.log(JSON.stringify({tail:(await p.locator('body').innerText()).slice(-1700),focused:await p.evaluate(()=>({tag:document.activeElement?.tagName,html:document.activeElement?.outerHTML.slice(0,250)}))},null,2));
await c.close();