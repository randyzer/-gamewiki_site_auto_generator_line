import {chromium} from 'playwright';import path from 'node:path';
const c=await chromium.launchPersistentContext(path.resolve('data/feishu-browser-profile'),{channel:'chrome',headless:false});
const p=c.pages()[0]||await c.newPage();
await p.goto('https://open.feishu.cn/app/cli_aa476f5e72789ccc/baseinfo',{waitUntil:'domcontentloaded'});
await p.getByText('App Secret',{exact:true}).first().waitFor({timeout:20000});
const d=await p.getByText('App Secret',{exact:true}).first().evaluate(el=>{
let x=el;return Array.from({length:9},(_,i)=>{const t={level:i,tag:x.tagName,classes:x.className,buttons:[...x.querySelectorAll('button')].map(b=>({title:b.title,aria:b.getAttribute('aria-label'),icons:[...b.querySelectorAll('svg')].map(s=>s.getAttribute('data-icon'))})),inputs:[...x.querySelectorAll('input')].map(i=>({type:i.type,readonly:i.readOnly})),children:x.children.length};x=x.parentElement;return t;});
});
console.log(JSON.stringify(d,null,2));await c.close();