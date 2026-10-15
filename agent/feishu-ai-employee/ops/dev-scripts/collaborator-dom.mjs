import {chromium} from 'playwright';import path from 'node:path';
const c=await chromium.launchPersistentContext(path.resolve('data/feishu-browser-profile'),{channel:'chrome',headless:false});
const p=c.pages()[0]||await c.newPage();await p.goto('https://open.feishu.cn/app/cli_aa476f5e72789ccc/developers',{waitUntil:'domcontentloaded'});
await p.getByText('所有者',{exact:true}).first().waitFor({timeout:25000});
const a=await p.getByText('小景',{exact:true}).first().evaluate(el=>{let x=el;return Array.from({length:5},(_,i)=>{const y={level:i,tag:x.tagName,html:x.outerHTML.slice(0,1100).replace(/(src|href)="[^"]+"/g,'$1="[link]"')};x=x.parentElement;return y;});});
console.log(JSON.stringify(a,null,2).slice(0,4000));await c.close();