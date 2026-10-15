import { chromium } from 'playwright';
import path from 'node:path';
const ctx=await chromium.launchPersistentContext(path.resolve('data/feishu-browser-profile'),{channel:'chrome',headless:false});
const page=ctx.pages()[0]||await ctx.newPage();
await page.goto('https://open.feishu.cn/app/cli_aa476f5e72789ccc/auth',{waitUntil:'domcontentloaded'});
for(const scope of ['im:message.p2p_msg:readonly','im:message:send_as_bot']){
 await page.getByText('开通权限',{exact:true}).first().click();
 const input=page.locator('input[placeholder*="im:chat:read"]').last();
 await input.fill(scope);await input.press('Enter');
 await page.getByText(scope,{exact:true}).last().waitFor({timeout:20000});
 const row=page.getByText(scope,{exact:true}).last().locator('xpath=ancestor::*[.//input[@type="checkbox"]][1]');
 console.log('found',scope,await row.innerText());
 await row.locator('input[type=checkbox]').last().check({force:true});
 await page.getByText('确认开通权限',{exact:true}).last().click();
 await page.waitForTimeout(1300);
 console.log('post',scope,(await page.locator('body').innerText()).slice(-450));
}
await ctx.close();