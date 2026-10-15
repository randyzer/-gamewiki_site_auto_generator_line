import {chromium} from 'playwright';import path from 'node:path';
const c=await chromium.launchPersistentContext(path.resolve('data/feishu-browser-profile'),{channel:'chrome',headless:false});
const p=await c.newPage();await p.goto('https://l1sbomj6i7.feishu.cn/next/messenger/',{waitUntil:'domcontentloaded'});
await p.getByText('Messenger',{exact:true}).first().waitFor({timeout:24000});await p.waitForTimeout(1600);
const matches=await p.getByText('游戏网站 AI 工程师',{exact:true}).count();console.log('BOT_CHAT_MATCHES',matches);
if(matches){await p.getByText('游戏网站 AI 工程师',{exact:true}).first().click();await p.waitForTimeout(800);console.log('CHAT',{url:p.url(),editable:await p.locator('[contenteditable=true]').count(),tail:(await p.locator('body').innerText()).slice(-1200)});}
else console.log('CHAT_NOT_YET_LISTED',(await p.locator('body').innerText()).slice(0,1000));
await c.close();