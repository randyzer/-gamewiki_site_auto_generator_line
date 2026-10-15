import { createRequire } from 'node:module';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import { createFullProjectFixture, cleanupCoreBuildFixture } from '/Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/tests/helpers/core-build-fixture';
import { sourceManifest } from '/Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/scripts/verify-ws06a-browser-closure';
import { resolveContractBinding } from '/Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/scripts/core-browser-evidence';

const root=process.cwd();
const out=join(root,'../../template/codex/executions/v2.7-ws06a/iteration17');
const require=createRequire(join(root,'package.json'));
const types=require('playwright');
const git=(...args:string[])=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
let fixture:string|undefined;
let complete=false;
const save=(name:string,value:unknown)=>writeFileSync(join(out,name),JSON.stringify(value,null,2)+'\n');
async function main(){
  const starterSource=sourceManifest(root);
  try {
    fixture=createFullProjectFixture(true);
    const guide=join(fixture,'src/content/guides/getting-started.mdx');
    // The frozen runner supplies its exact stress-content literal; no alternative markup/CSS.
    const runner=readFileSync(join(root,'scripts/run-core-browser-evidence.ts'),'utf8');
    const literal=runner.match(/writeFileSync\(guide, readFileSync\(guide, "utf8"\) \+ ('[^\n]+')\);/)?.[1];
    if(!literal)throw Error('Frozen stress fixture literal unavailable');
    const stress=runInNewContext(literal,{}, {timeout:1000});
    if(typeof stress!=='string')throw Error('Invalid stress literal');
    writeFileSync(guide,readFileSync(guide,'utf8')+stress);
    const fixtureSource=sourceManifest(fixture);
    const build=spawnSync('npm',['run','build'],{cwd:fixture,encoding:'utf8',timeout:60000,maxBuffer:12*1024*1024});
    console.log(build.stdout);console.error(build.stderr);
    if(build.status!==0||build.error)throw Error('Session final build failed');
    if(sourceManifest(fixture)!==fixtureSource)throw Error('Fixture source changed during build');
    for(const path of ['EVIDENCE_BUILD_NOT_FINAL.json','privacy/index.html','terms/index.html'])
      if(existsSync(join(fixture,'dist',path)))throw Error('Forbidden final output '+path);
    const engines:any={};
    const metadata=JSON.parse(readFileSync(join(root,'node_modules/playwright-core/browsers.json'),'utf8')); 
    for(const name of ['chromium','firefox','webkit']){
      const executable=types[name].executablePath();
      const revision=executable.split(/[/\\]/).find((part:string)=>new RegExp('^'+name+'-\\d+$').test(part))?.split('-').at(-1);
      const record=metadata.browsers.find((r:any)=>r.name===name);
      if(!record||!revision||![record.revision,...Object.values(record.revisionOverrides??{})].includes(revision))throw Error('Unknown actual revision '+name);
      const browser=await types[name].launch({headless:true});
      try {engines[name]={browserName:name,version:browser.version(),revision};}
      finally{await browser.close();}
    }
    const expected={
      starter:{branch:git('branch','--show-current'),head:git('rev-parse','HEAD'),workingTreeSha256:starterSource},
      canonicalContract:resolveContractBinding('FILE_SHA256',join(root,'../GAME_SOP_V2.7_CANDIDATE/docs/COMMERCIAL_GAME_SITE_PRODUCT_CONTRACT_V2.7.md'),''),
      fixture:{identity:'Field Notes synthetic adoption',sourceSha256:fixtureSource},build:{distSha256:sourceManifest(join(fixture,'dist'))},
      playwright:{packageVersion:require('playwright/package.json').version},host:{platform:process.platform,arch:process.arch,node:process.version},engines,
    };
    if(sourceManifest(root)!==starterSource)throw Error('Starter changed during independent capture');
    save('expected-identity.json',expected);
    save('keyboard-session.json',{state:'PREPARED_NOT_STARTED',fixtureRoot:fixture,identity:expected,previewPid:null,url:null,cleanupRequired:true,
      note:'Exact disposable final build intentionally retained for subsequent real-keyboard session. No preview process started; no Safari PASS recorded.'});
    complete=true;
    console.log('Prepared independent identity and exact manual build; no preview/Safari interaction yet.');
  }finally{
    if(!complete&&fixture){cleanupCoreBuildFixture(fixture);save('keyboard-session-preparation-failure.json',{fixtureRemoved:!existsSync(fixture),previewStarted:false});}
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
