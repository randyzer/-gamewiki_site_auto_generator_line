import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile, readdir } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { join } from 'node:path';
import { fixture } from './helpers.mjs';

const api = await import('../src/homepage-source-host.mjs').catch(() => ({}));
const lookupHost = async () => [{ address: '93.184.216.34', family: 4 }];
async function setup(t, requests) {
  const f = await fixture(t), runDirectory = join(f.root, 'run'); await mkdir(join(runDirectory,'homepage-sources'),{recursive:true});
  const requestPath = join(runDirectory,'homepage-sources/FETCH_REQUEST.json'); await writeFile(requestPath,JSON.stringify(requests));
  return { ...f, context: { runDirectory, requestPath } };
}
function browserFixture({ fail = false, finalUrl = 'https://example.com/game', text = 'Visible game information', httpStatus = 200 } = {}) {
  const calls = { contexts: [], gotos: [], routes: [], initScripts: [], handlers: {}, closed: 0, contextsClosed: 0, downloads: 0 };
  const launchBrowser = async () => ({ newContext: async options => {
    calls.contexts.push(options); const handlers = {};
    return { route: async (_pattern,handler) => { calls.routes.push(handler); }, addInitScript: async script => { calls.initScripts.push(script); },
      newPage: async () => ({ on: (name,handler) => { handlers[name] = handler; calls.handlers[name] = handler; },
        goto: async (url,options) => { calls.gotos.push({url,options}); if(fail)throw Error('synthetic navigation failed'); return {status:()=>httpStatus,headers:()=>({'content-type':'text/html'})}; },
        url: () => finalUrl,
        evaluate: async () => ({ title: 'Realistic game title', text, jsonLd: ['{"@type":"VideoGame"}'], meta: [{name:'description',content:'Game description'}] }),
        screenshot: async options => { await writeFile(options.path,'synthetic screenshot'); } }),
      close: async () => { calls.contextsClosed++; } };
  }, close: async () => { calls.closed++; } });
  return { calls, launchBrowser };
}
for (const url of ['http://example.com/game','file:///etc/passwd','https://127.0.0.1','https://[::1]','https://8.8.8.8','https://2130706433','https://localhost/','https://localhost./','https://game.localhost./','https://game.localhost/','https://game.local/','https://user:pass@example.com/']) {
  test(`public capture rejects unsafe address ${url}`,async()=>{
    await assert.rejects(api.validateHomepageUrl(url,{lookupHost}),/HOMEPAGE_URL_REJECTED/);
  });
}
for (const url of ['https://mega.nz/file/game','https://drive.google.com/file/d/game','https://mediafire.com/game','https://steamunlocked.net/game','https://thepiratebay.org/game','https://example.com/game.torrent','https://example.com/game%2ezip','https://example.com/crack/game','https://fitgirl-repacks.site/game']) {
  test(`public capture rejects download/piracy source ${url}`,async()=>{
    await assert.rejects(api.validateHomepageUrl(url,{lookupHost}),/HOMEPAGE_URL_REJECTED/);
  });
}
test('DNS resolving into private, loopback, link-local or mapped IPv6 ranges is rejected',async()=>{
  for(const address of ['10.0.0.1','172.16.0.1','192.168.1.1','127.0.0.1','169.254.169.254','100.64.1.1','0.0.0.0','::1','fc00::1','fe80::1','::ffff:127.0.0.1'])
    await assert.rejects(api.validateHomepageUrl('https://example.com/game',{lookupHost:async()=>[{address}]}),/HOMEPAGE_URL_REJECTED/);
  assert.equal((await api.validateHomepageUrl('https://example.com/game',{lookupHost})).href,'https://example.com/game');
});
test('capture caps requests at 25 before launching the browser',async t=>{
  const f=await setup(t,Array.from({length:26},()=>({url:'https://example.com/game',purpose:'source'})));
  await assert.rejects(api.collectHomepageSources(f.context,{lookupHost,launchBrowser:async()=>assert.fail('must not launch')}),/FETCH_REQUEST_LIMIT_EXCEEDED/);
});
test('public capture uses fresh empty contexts, fixed timeout, bounded UTF-8 text and saves title/meta/JSON-LD/screenshot hashes',async t=>{
  const f=await setup(t,[{url:'https://example.com/game',purpose:'Verify game facts'}]),browser=browserFixture({text:'游戏'.repeat(100000)});
  const bundle=await api.collectHomepageSources(f.context,{lookupHost,launchBrowser:browser.launchBrowser});
  const manifest=JSON.parse(await readFile(bundle.manifestPath)); const capture=JSON.parse(await readFile(manifest.captures[0].path));
  assert.equal(capture.status,'CAPTURED');assert.equal(capture.httpStatus,200);assert.equal(capture.title,'Realistic game title');
  assert.ok(Buffer.byteLength(capture.text)<=200*1024);assert.equal(capture.textTruncated,true);
  assert.equal(capture.meta[0].name,'description');assert.ok(capture.jsonLd[0].includes('VideoGame'));assert.equal(capture.finalUrl,'https://example.com/game');
  assert.ok(bundle.files.some(file=>file.path.endsWith('.png')&&file.sha256.length===64));
  assert.deepEqual(browser.calls.contexts[0].storageState,{cookies:[],origins:[]});assert.equal(browser.calls.contexts[0].acceptDownloads,false);
  assert.equal(browser.calls.gotos[0].options.timeout,30000);assert.equal(browser.calls.closed,1);assert.equal(browser.calls.contextsClosed,1);
});
test('request interception blocks cookie/auth, submissions, unsafe subresources and document downloads',async t=>{
  const f=await setup(t,[{url:'https://example.com/game',purpose:'source'}]),browser=browserFixture();
  await api.collectHomepageSources(f.context,{lookupHost,launchBrowser:browser.launchBrowser});
  const handler=browser.calls.routes[0];let continued,aborts=0;
  const route=(url,method='GET',resourceType='script',headers={accept:'*/*'})=>({request:()=>({url:()=>url,method:()=>method,resourceType:()=>resourceType,headers:()=>headers,allHeaders:async()=>headers}),
    continue:async options=>{continued=options;},abort:async()=>{aborts++;}});
  await handler(route('https://example.com/app.js'));assert.equal(continued.headers.cookie,undefined);assert.equal(continued.headers.authorization,undefined);
  for(const [url,method,type] of [['https://example.com/form','POST','document'],['https://127.0.0.1/secret','GET','image'],['https://example.com/file.zip','GET','document'],['https://mega.nz/file','GET','script']])await handler(route(url,method,type));
  await handler(route('https://example.com/private','GET','script',{cookie:'server-set-cookie'}));
  await handler(route('https://example.com/private','GET','script',{authorization:'private'}));
  assert.equal(aborts,6);
});
test('rejections, navigation failure and unsafe final redirects are recorded per URL without losing other captures',async t=>{
  const requests=[{url:'https://localhost/',purpose:'bad'},{url:'https://example.com/game',purpose:'good'}];
  for(const options of [{},{fail:true},{finalUrl:'https://127.0.0.1/'}]){
    const f=await setup(t,requests),browser=browserFixture(options);
    const bundle=await api.collectHomepageSources(f.context,{lookupHost,launchBrowser:browser.launchBrowser});const manifest=JSON.parse(await readFile(bundle.manifestPath));
    assert.equal(manifest.captures.length,2);assert.equal(manifest.captures[0].status,'REJECTED');assert.ok(manifest.captures[0].reason);
    assert.equal(manifest.captures[1].status,Object.keys(options).length?'FAILED':'CAPTURED');assert.equal(browser.calls.closed,1);
  }
});
test('page scripts cannot submit forms or click, and download events are canceled',async t=>{
  const f=await setup(t,[{url:'https://example.com/game',purpose:'source'}]),browser=browserFixture();
  await api.collectHomepageSources(f.context,{lookupHost,launchBrowser:browser.launchBrowser});
  let submissions=0,clicks=0,prevented=0,canceled=0,submitListener;
  class Form{submit(){submissions++;}requestSubmit(){submissions++;}}
  class Element{click(){clicks++;}}
  runInNewContext('('+browser.calls.initScripts[0].toString()+')()',{
    HTMLFormElement:Form,HTMLElement:Element,document:{addEventListener:(name,listener)=>{assert.equal(name,'submit');submitListener=listener;}}});
  new Form().submit();new Form().requestSubmit();new Element().click();submitListener({preventDefault:()=>{prevented++;}});
  browser.calls.handlers.download({cancel:async()=>{canceled++;}});
  assert.equal(submissions,0);assert.equal(clicks,0);assert.equal(prevented,1);assert.equal(canceled,1);
});
test('repeat capture removes stale screenshots when a formerly valid source is rejected',async t=>{
  const f=await setup(t,[{url:'https://example.com/game',purpose:'source'}]),browser=browserFixture();
  await api.collectHomepageSources(f.context,{lookupHost,launchBrowser:browser.launchBrowser});
  await writeFile(f.context.requestPath,JSON.stringify([{url:'https://localhost/',purpose:'bad'}]));
  const bundle=await api.collectHomepageSources(f.context,{lookupHost,launchBrowser:async()=>assert.fail('must not launch')});
  assert.deepEqual(await readdir(join(bundle.directory,'screenshots')),[]);
  assert.equal(bundle.files.filter(file=>file.path.endsWith('.png')).length,0);
});
test('the 30-second page budget also covers DNS validation without late browser launch',async t=>{
  const f=await setup(t,[{url:'https://example.com/game',purpose:'source'}]);let resolveLookup,launches=0,requestedBudget;
  const pending=new Promise(resolve=>{resolveLookup=resolve;});
  const task=api.collectHomepageSources(f.context,{lookupHost:()=>pending,launchBrowser:async()=>{launches++;throw Error('late launch');},
    setTimer:(callback,ms)=>{requestedBudget=ms;return setTimeout(callback,5);}});
  const result=await Promise.race([task,new Promise(resolve=>setTimeout(()=>resolve(null),100))]);
  resolveLookup([{address:'93.184.216.34',family:4}]);
  assert.ok(result,'DNS must not escape the page deadline');assert.equal(requestedBudget,30000);
  const manifest=JSON.parse(await readFile(result.manifestPath));assert.equal(manifest.captures[0].status,'FAILED');
  assert.match(manifest.captures[0].reason,/HOMEPAGE_CAPTURE_TIMEOUT/);
  await new Promise(resolve=>setImmediate(resolve));assert.equal(launches,0);
});
test('a browser that finishes launching after the page deadline is still closed',async t=>{
  const f=await setup(t,[{url:'https://example.com/game',purpose:'source'}]),browser=browserFixture();
  let resolveLaunch;const pending=new Promise(resolve=>{resolveLaunch=resolve;});
  const bundle=await api.collectHomepageSources(f.context,{lookupHost,launchBrowser:()=>pending,setTimer:callback=>setTimeout(callback,5)});
  const manifest=JSON.parse(await readFile(bundle.manifestPath));assert.equal(manifest.captures[0].status,'FAILED');
  resolveLaunch(await browser.launchBrowser());await new Promise(resolve=>setTimeout(resolve,10));
  assert.equal(browser.calls.closed,1);assert.equal(browser.calls.gotos.length,0);
});
test('an HTTP error remains a per-source failure with its actual status and reason',async t=>{
  const f=await setup(t,[{url:'https://example.com/game',purpose:'source'}]),browser=browserFixture({httpStatus:404});
  const bundle=await api.collectHomepageSources(f.context,{lookupHost,launchBrowser:browser.launchBrowser});
  const manifest=JSON.parse(await readFile(bundle.manifestPath));const capture=JSON.parse(await readFile(manifest.captures[0].path));
  assert.equal(capture.status,'FAILED');assert.equal(capture.httpStatus,404);assert.match(capture.reason,/HTTP 404/);
});
