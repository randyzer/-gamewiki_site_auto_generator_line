import {chromium} from 'playwright';import path from 'node:path';
const c=await chromium.launchPersistentContext(path.resolve('data/feishu-browser-profile'),{channel:'chrome',headless:false});
const p=await c.newPage();await p.goto('https://l1sbomj6i7.feishu.cn/next/messenger/',{waitUntil:'domcontentloaded'});await p.getByText('Workplace',{exact:true}).first().click();
await p.getByText('All Apps',{exact:true}).first().waitFor({timeout:20000});
console.log('text count',await p.getByText('Search',{exact:true}).count());
const xs=await p.getByText('Search',{exact:true}).evaluateAll(es=>es.map(e=>({outer:e.outerHTML.slice(0,200),parent:e.parentElement?.outerHTML.slice(0,300)})));
console.log(JSON.stringify(xs,null,2).slice(0,1500));
await c.close();