import {chromium} from 'playwright';
import path from 'node:path';
const ctx=await chromium.launchPersistentContext(path.resolve('data/feishu-browser-profile'),{channel:'chrome',headless:false,viewport:{width:1200,height:820}});
const page=ctx.pages()[0]||await ctx.newPage();
await page.goto('https://open.feishu.cn/app?lang=zh-CN',{waitUntil:'domcontentloaded'});
console.log('FEISHU_BROWSER_READY',page.url());
await new Promise(resolve=>process.on('SIGTERM',resolve));
await ctx.close();
