import {chromium} from 'playwright';import path from 'node:path';const ctx=await chromium.launchPersistentContext(path.resolve('data/feishu-browser-profile'),{channel:'chrome',headless:false});
const p=ctx.pages()[0]||await ctx.newPage();await p.goto('https://open.feishu.cn/app/cli_aa476f5e72789ccc/auth',{waitUntil:'domcontentloaded'});
await p.getByText('开通权限',{exact:true}).first().waitFor({timeout:25000});await p.getByText('开通权限',{exact:true}).first().click();
const key='application:application:self_manage';const input=p.locator('input[placeholder*="im:chat:read"]').last();await input.fill(key);await input.press('Enter');
await p.getByText(key,{exact:true}).last().waitFor({timeout:20000});
const row=p.getByText(key,{exact:true}).last().locator('xpath=ancestor::*[.//input[@type="checkbox"]][1]');
console.log('FOUND',await row.innerText());await row.locator('input[type=checkbox]').last().check({force:true});
await p.getByText('确认开通权限',{exact:true}).last().click();await p.waitForTimeout(1200);
console.log('STATE',(await p.locator('body').innerText()).slice(-450));await ctx.close();