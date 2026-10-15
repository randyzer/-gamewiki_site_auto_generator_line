import test from 'node:test';
import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
import {publicPageCapture,sanitizePublicCapture} from '../src/bsk-command-gate.mjs';

const steam='https://store.steampowered.com/app/2406770/Bodycam/';
const bodycam={name:'Bodycam',steamAppId:'2406770',steamUrl:steam};
const policy={game:bodycam,allowedPages:[{host:'store.steampowered.com',pathPrefix:'/app/2406770/',queryKeys:['l']}]};
function publicDocument({
  game='Bodycam', title='Bodycam on Steam',ogUrl=steam,
  desc='Bodycam public Steam description', genericDesc='Secondary description', metaAvailable=true,
  scripts=[], developer='Reissad Studio',publisher='PlayWay S.A.',release='Jun 7, 2024',onRead
}={}) {
  let bodyReads=0,privateReads=0;
  const metas={
    '#appHubAppName':game,
    'meta[property="og:title"]':title,
    'meta[property="og:url"]':ogUrl,
    'meta[property="og:description"]':desc,
    'meta[name="description"]':genericDesc
  };
  const document={
    body:{get innerText(){bodyReads++;throw Error('WHOLE BODY MUST NOT BE READ');}},
    get cookie(){privateReads++;throw Error('COOKIE MUST NOT BE READ');},
    querySelectorAll(selector){
      if(selector==='script[type="application/ld+json"]')
        return scripts.map(item=>({textContent:JSON.stringify(item)}));
      if(selector==='.dev_row')return [
        {textContent:'Developer: '+developer},{textContent:'Publisher: '+publisher},
        {textContent:'Developer: '+developer},{textContent:'Publisher: '+publisher}];
      if(selector==='.release_date .date')return [{textContent:release}];
      assert.fail('unexpected public selector: '+selector);
    },
    querySelector(selector){
      if(!metaAvailable)return null;
      if(Object.hasOwn(metas,selector)&&metas[selector]){
        return {textContent:metas[selector],
          getAttribute(name){assert.equal(name,'content');onRead?.(selector);return metas[selector];}};
      }
      return null;
    },
  };
  return {document,reads:()=>({bodyReads,privateReads})};
}
function run(page,location={href:steam}){
  const {document,reads}=publicDocument(page);
  return {result:runInNewContext(publicPageCapture(policy),{URL,location,document}),reads:reads()};
}
test('Steam public-meta fallback reads only exact public metadata, returns distinct schema and no body data',()=>{
  const {result,reads}=run();
  assert.equal(result.readAllowed,true);
  assert.equal(result.sourceSchema,'STEAM_PUBLIC_GAME_META_V1');
  assert.deepEqual({...result.content},{name:'Bodycam',url:steam,description:'Bodycam public Steam description',
    developer:'Reissad Studio',publisher:'PlayWay S.A.',datePublished:'Jun 7, 2024'});
  assert.deepEqual(reads,{bodyReads:0,privateReads:0});
  const clean=sanitizePublicCapture({...result,account:'PRIVATE_TOKEN',text:'PRIVATE_PAGE',content:{
    ...result.content,account:'PRIVATE_ACCOUNT'}},policy);
  assert.equal(clean.sourceSchema,'STEAM_PUBLIC_GAME_META_V1');
  assert.ok(!JSON.stringify(clean).includes('PRIVATE'));
});
test('fallback accepts matching OG title and URL if Steam public app header has not rendered',()=>{
  const {result}=run({game:null,ogUrl:steam, title:'Bodycam on Steam'});
  assert.equal(result.readAllowed,true);assert.equal(result.sourceSchema,'STEAM_PUBLIC_GAME_META_V1');
});
test('Steam meta fallback refuses weak, misleading or missing public game identity',()=>{
  const cases=[
    {game:'Different',title:'Other Bodycam on Steam',ogUrl:steam},
    {game:null,title:'Bodycam on Steam',ogUrl:null},
    {game:'Other Game',title:'Bodycam',ogUrl:null},
    {game:'Bodycam',title:'Steam - Bodycam on Steam',ogUrl:steam},
    {game:'Bodycam',title:'Bodycam on Steam',ogUrl:'https://store.steampowered.com/app/570/Dota_2/'},
    {game:'Bodycam',title:'Bodycam on Steam',ogUrl:steam+'?token=PRIVATE_TOKEN'},
    {game:null,title:'Age Verification on Steam',ogUrl:null},
    {metaAvailable:false},
    {game:'Bodycam',title:'Bodycam on Steam',ogUrl:steam,desc:'',genericDesc:''}
  ];
  for(const page of cases){
    const result=run(page).result;
    assert.equal(result.readAllowed,false,JSON.stringify(page));
    assert.equal(result.status,'PUBLIC_CONTENT_UNVERIFIED');
    assert.ok(!JSON.stringify(result).includes('PRIVATE_TOKEN'));
  }
});
test('Steam meta fallback refuses actual URL to wrong App ID regardless of matching OG title',()=>{
  const location={href:'https://store.steampowered.com/app/570/Dota_2/'};
  const result=run({},location).result;
  assert.equal(result.readAllowed,false);
});
test('Steam meta fallback rejects URL changing during metadata capture',()=>{
  const location={href:steam};
  const result=runInNewContext(publicPageCapture(policy),{URL,location,
    document:publicDocument({onRead:selector=>{
      if(selector==='meta[property="og:description"]')location.href='https://store.steampowered.com/account/';
    }}).document
  });
  assert.equal(result.readAllowed,false);
  assert.equal(result.status,'PAGE_IDENTITY_CHANGED');
});
test('multiple structured-data matches block unsafe fallback instead of guessing',()=>{
  const jsonLd={'@type':'VideoGame',name:'Bodycam',url:steam};
  const {result}=run({scripts:[jsonLd,jsonLd]});
  assert.equal(result.status,'PUBLIC_CONTENT_UNVERIFIED');
  assert.equal(result.reasonCode,'STEAM_STRUCTURED_DATA_AMBIGUOUS');
});
test('host sanitizer rejects missing meta description, field injection and wrong source schema',()=>{
  const {result}=run();
  for(const bad of [
    {...result,content:{name:'Bodycam',url:steam}},
    {...result,content:{...result.content,description:42}},
    {...result,content:{...result.content,genre:'Inferred by worker'}},
    {...result,content:{...result.content,url:'https://store.steampowered.com/app/570/Dota_2/'}},
    {...result,sourceSchema:'UNTRUSTED_META_V1'}
  ])assert.throws(()=>sanitizePublicCapture(bad,policy),/PUBLIC_CONTENT_UNVERIFIED/);
});

test('browser command gate returns only a whitelisted failure reason when Steam public metadata is absent', async()=>{
  const {createBskCommandGate}=await import('../src/bsk-command-gate.mjs');
  const {mkdtemp,mkdir,rm,readFile,realpath}=await import('node:fs/promises');
  const {tmpdir}=await import('node:os');
  const {join}=await import('node:path');
  const root=await realpath(await mkdtemp(join(tmpdir(),'steam-gate-meta-')));
  const runDirectory=join(root,'run'),nativeDirectory=join(runDirectory,'native');
  await mkdir(nativeDirectory,{recursive:true});
  try {
    const gate=createBskCommandGate({
      context:{runId:'fixture',stage:'game-homepage-icon-research',nativeDirectory,runDirectory},
      policy,identity:{executable:'/offline/fake-bsk',version:'0.3.2',sha256:'a'.repeat(64)},
      bindings:{sessionId:'owned',tabId:17,url:steam},
      approve:async command=>({approved:true,type:'bsk-command-approval',runId:command.runId,
        stage:command.stage,commandDigest:command.digest,approvedBy:'fixture',approvedAt:Date.now(),
        expiresAt:Date.now()+10000,executionId:'steam-missing-'+command.requestId}),
      execute:async()=>({stdout:JSON.stringify({value:{url:steam,readAllowed:false,
        status:'PUBLIC_CONTENT_UNVERIFIED',reasonCode:'STEAM_PUBLIC_META_IDENTITY_MISMATCH',
        text:'PRIVATE PAGE BODY',cookie:'VERY_PRIVATE'}})})
    });
    const result=await gate({requestId:'missing-metadata',argv:['observe']});
    assert.equal(result.status,'PUBLIC_CONTENT_UNVERIFIED');
    assert.equal(result.reasonCode,'STEAM_PUBLIC_META_IDENTITY_MISMATCH');
    assert.ok(!JSON.stringify(result).includes('PRIVATE'));
    const audit=await readFile(join(runDirectory,'bsk-audit','missing-metadata.json'),'utf8');
    assert.ok(!audit.includes('VERY_PRIVATE'));
    assert.ok(audit.includes('STEAM_PUBLIC_META_IDENTITY_MISMATCH'));
  }finally{await rm(root,{recursive:true,force:true});}
});
