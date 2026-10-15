import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {sourceManifest,webkitPolicy} from '/Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/scripts/verify-ws06a-browser-closure';
import {resolveContractBinding} from '/Users/randyz/work/coding/hot_words_web/Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE/scripts/core-browser-evidence';
const root=process.cwd(),out=join(root,'../../template/codex/executions/v2.7-ws03a/iteration24');
const save=(n:string,d:unknown)=>writeFileSync(join(out,n),JSON.stringify(d,null,2)+'\n');
const hash=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
async function main(){
 const triad:any={};
 for(const name of ['GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE','GAME_SOP_V2.7_CANDIDATE','GAME_CODEX_MASTER_PROMPT_V2.7_CANDIDATE']){
  const base=join(root,'..',name),git=(...args:string[])=>execFileSync('git',args,{cwd:base,encoding:'utf8'}).trim();
  triad[name]={root:base,branch:git('branch','--show-current'),head:git('rev-parse','HEAD'),tree:git('rev-parse','HEAD^{tree}'),workingTreeSha256:sourceManifest(base)};
 }
 const require=createRequire(join(root,'package.json')),pw=require('playwright'),engines:any={};
 const metadata=JSON.parse(readFileSync(join(root,'node_modules/playwright-core/browsers.json'),'utf8'));
 for(const name of ['chromium','firefox','webkit']){
  const executable=pw[name].executablePath(),revision=executable.split(/[/\\]/).find((p:string)=>new RegExp('^'+name+'-\\d+$').test(p))?.split('-').at(-1);
  const record=metadata.browsers.find((r:any)=>r.name===name);
  if(!revision||!record||![record.revision,...Object.values(record.revisionOverrides??{})].includes(revision))throw Error('Unbound revision '+name);
  const browser=await pw[name].launch({headless:true}); try{engines[name]={browserName:name,version:browser.version(),revision};}finally{await browser.close();}
 }
 const canonicalContract=resolveContractBinding('FILE_SHA256',join(root,'../GAME_SOP_V2.7_CANDIDATE/docs/COMMERCIAL_GAME_SITE_PRODUCT_CONTRACT_V2.7.md'),'');
 if(canonicalContract.verification?.observedSha256!=='1ff2bd01a089975c6b22bff48ca71faffe2be9c710d0123afd3ae47acc7ac24c')throw Error('Contract drift');
 const paths=['scripts/core-browser-matrix.ts','scripts/run-core-browser-evidence.ts','scripts/core-browser-evidence.ts','scripts/verify-ws06a-browser-closure.ts','package.json','package-lock.json'];
 const hashes=Object.fromEntries(paths.map(p=>[p,hash(join(root,p))]));
 const policy=join(root,'../../template/codex/executions/v2.7-ws06a/iteration14/WEBKIT_VERIFICATION_POLICY_PROPOSAL_V1.md'),control=join(root,'../../template/codex/executions/v2.7-ws06a/iteration14/arrowright-repeatability.json');
 if(hash(policy)!==webkitPolicy.proposalSha256||hash(control)!==webkitPolicy.arrowControlSha256)throw Error('Policy/control drift');
 const tool={capturedAt:new Date().toISOString(),host:{platform:process.platform,arch:process.arch,node:process.version},playwright:{packageVersion:require('playwright/package.json').version},engines,verificationFileHashes:hashes};
 save('triad-post-identity.json',{capturedAt:new Date().toISOString(),triad,canonicalContract});save('current-tool-engine-host-identity.json',tool);
 save('policy-control-validity.json',{proposalPath:policy,proposalSha256:hash(policy),arrowControlPath:control,arrowControlSha256:hash(control),acceptedBytesExact:true,engineHostValid:engines.webkit.version==='26.6'&&engines.webkit.revision==='2359'&&process.platform==='darwin'&&process.arch==='arm64'});
 console.log(JSON.stringify({triad,tool},null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
