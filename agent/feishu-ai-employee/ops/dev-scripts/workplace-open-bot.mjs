import {chromium} from 'playwright';
import path from 'node:path';
const c=await chromium.launchPersistentContext(path.resolve('data/feishu-browser-profile'),{channel:'chrome',headless:false});
const p=await c.newPage();
await p.goto('https://l1sbomj6i7.feishu.cn/next/messenger/',{waitUntil:'domcontentloaded'});
await p.getByText('Workplace',{exact:true}).first().click();
for(let i=0;i<5;i++){
 await p.waitForTimeout(2000);
 const found=await p.getByText('游戏网站 AI 工程师',{exact:true}).count();
 console.log('CHECK',i,'found',found);
 if(found){await p.getByText('游戏网站 AI 工程师',{exact:true}).first().click();await p.waitForTimeout(1500);console.log('OPEN',JSON.stringify({url:p.url(),pages:c.pages().map(z=>z.url()),text:(await p.locator('body').innerText()).slice(-550)}));break;}
 if(i===2)await p.getByText('All Apps',{exact:true}).first().click();
}
await c.close();