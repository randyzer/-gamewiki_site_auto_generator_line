import {chromium} from 'playwright';import path from 'node:path';
const c=await chromium.launchPersistentContext(path.resolve('data/feishu-browser-profile'),{channel:'chrome',headless:false});
const p=c.pages()[0]||await c.newPage();await p.goto('https://open.feishu.cn/app/cli_aa476f5e72789ccc/event',{waitUntil:'domcontentloaded'});
await p.getByText('事件配置',{exact:true}).first().waitFor();await p.waitForTimeout(1500);
console.log('CURRENT',(await p.locator('body').innerText()).slice(-1350),'ADD_ENABLED',await p.getByText('添加事件',{exact:true}).isEnabled());
if(await p.getByText('添加事件',{exact:true}).isEnabled()){await p.getByText('添加事件',{exact:true}).click();await p.waitForTimeout(500);console.log('MODAL',(await p.locator('body').innerText()).slice(-2700))}
await c.close();