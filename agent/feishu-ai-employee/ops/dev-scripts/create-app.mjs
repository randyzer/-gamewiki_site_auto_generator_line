import {chromium} from 'playwright';import path from 'node:path';
const c=await chromium.launchPersistentContext(path.resolve('data/feishu-browser-profile'),{channel:'chrome',headless:false});
const p=c.pages()[0]||await c.newPage();await p.goto('https://open.feishu.cn/app?lang=zh-CN',{waitUntil:'domcontentloaded'});await p.getByText('创建企业自建应用',{exact:true}).first().click();
await p.locator('input.ud__native-input').last().fill('游戏网站 AI 工程师');
await p.locator('textarea').fill('基于 AI Agent 与游戏站 Skills 的自动化游戏攻略网站调研、开发、检查与任务管理机器人。');
const button=p.getByRole('button',{name:'创建',exact:true});console.log('before',await button.isEnabled());
await button.click();await p.waitForTimeout(1800);
console.log(JSON.stringify({url:p.url(),text:(await p.locator('body').innerText()).slice(-1700)},null,2));await c.close();