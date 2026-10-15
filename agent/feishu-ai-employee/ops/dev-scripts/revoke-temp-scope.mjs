import {chromium} from 'playwright';import path from 'node:path';
const c=await chromium.launchPersistentContext(path.resolve('data/feishu-browser-profile'),{channel:'chrome',headless:false});const p=c.pages()[0]||await c.newPage();
await p.goto('https://open.feishu.cn/app/cli_aa476f5e72789ccc/auth',{waitUntil:'domcontentloaded'});
const t=p.getByText('application:application:self_manage',{exact:true}).first();await t.waitFor({timeout:25000});
const row=t.locator('xpath=ancestor::*[contains(@class,"virtual-table__row")][1]');await row.getByText('关闭',{exact:true}).click();await p.waitForTimeout(650);
await p.getByText('确定',{exact:true}).last().click();await p.waitForTimeout(650);console.log('CONFIRM',(await p.locator('body').innerText()).slice(-1050));await c.close();