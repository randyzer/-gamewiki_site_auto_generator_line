import {chromium} from 'playwright';import path from 'node:path';const c=await chromium.launchPersistentContext(path.resolve('data/feishu-browser-profile'),{channel:'chrome',headless:false});const p=c.pages()[0]||await c.newPage();
await p.goto('https://open.feishu.cn/app/cli_aa476f5e72789ccc/auth',{waitUntil:'domcontentloaded'});
await p.getByText('权限管理',{exact:true}).first().waitFor({timeout:25000});await p.waitForTimeout(1300);
const scope=p.getByText('application:application:self_manage',{exact:true}).first();console.log('scope',await scope.count());
if(await scope.count())console.log('row',await scope.locator('xpath=ancestor::tr[1]').innerText());
await c.close();