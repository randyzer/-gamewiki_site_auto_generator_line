import {files,hash,read,base,root,sourceManifest,alive} from '../../v2.7-ws06a/iteration22/finalize-readiness-audit.mjs';
import {join} from 'node:path';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {execFileSync,spawnSync} from 'node:child_process';
const out=join(base,'template/codex/executions/v2.7-ws03d/iteration32');
const save=(name,value)=>writeFileSync(join(out,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const pre=read(join(out,'preflight.json')), now={};
for(const n of ['template','Repo_hotgameweb','gameweb'])if(existsSync(join(base,n)))for(const {path,...v} of files(join(base,n),n==='template'?pre.allowed:[]))now[n+'/'+path]=v;
const changed=[...new Set([...Object.keys(pre.protected),...Object.keys(now)])].filter(p=>JSON.stringify(now[p])!==JSON.stringify(pre.protected[p]));
const errors=changed.filter(p=>!pre.scope.includes(p));
const triad={};
for(const [name,before] of Object.entries(pre.triad)){
 const git=(...args)=>execFileSync('git',args,{cwd:before.root,encoding:'utf8'}).trim();
 const current={root:before.root,branch:git('branch','--show-current'),head:git('rev-parse','HEAD'),tree:git('rev-parse','HEAD^{tree}'),workingTreeSha256:sourceManifest(before.root)};
 triad[name]=current;
 for(const k of ['branch','head','tree'])if(before[k]!==current[k])errors.push(name+' '+k);
}
for(const [p,h] of Object.entries(pre.verificationFileHashes))if(hash(join(root,p))!==h)errors.push('verification '+p);
const contract=join(base,'Repo_hotgameweb/GAME_SOP_V2.7_CANDIDATE/docs/COMMERCIAL_GAME_SITE_PRODUCT_CONTRACT_V2.7.md');
if(hash(contract)!==pre.contractSha256)errors.push('Contract');
const section=readFileSync(contract,'utf8').split('## H. Product Contract v0.2')[1].split('## I. Applicability Model')[0];
const ids=[...section.matchAll(/^\| ([A-Z]+-\d+) \|/gm)].map(m=>m[1]);
if(ids.length!==41||new Set(ids).size!==41)errors.push('registry');
const preimages=read(join(out,'preimages.json'));
for(const p of pre.scope)if(preimages[p]!==null&&hash(join(out,'preimages',p))!==preimages[p].sha256)errors.push('preimage '+p);
save('triad-blocked-identity.json',{capturedAt:new Date().toISOString(),triad});
save('postimages.json',Object.fromEntries(pre.scope.map(p=>[p,now[p]??null])));
save('integrity-check.json',{status:errors.length?'FAIL':'PASS',approvedScope:pre.scope.length,changedFiles:changed,protectedFilesUnchanged:pre.protectedCount-changed.filter(p=>pre.protected[p]).length,priorHistoriesFrozen:!errors.length,productDelta:changed.length,ContractSHA:hash(contract),canonicalCapabilityRows:ids.length,uniqueCapabilityIds:new Set(ids).size,verificationInfrastructureDelta:0,errors});
let patch='';
for(const p of pre.scope){
 const result=spawnSync('git',['diff','--no-index','--',preimages[p]===null?'/dev/null':join(out,'preimages',p),join(base,p)],{encoding:'utf8'});
 if(![0,1].includes(result.status))throw Error('diff failed '+p);
 patch+=result.stdout;
}
writeFileSync(join(out,'approved-scope.patch'),patch,{flag:'wx'});
const raw=read(join(out,'freshness-browser-evidence.json')),cmd=read(join(out,'freshness-browser-command-result.json')),cleanup=read(join(out,'freshness-cleanup.json')),cache=read(join(out,'freshness-tmp-cleanup/owned-tmp-cleanup.json'));
const assertions=raw.rows.flatMap(r=>r.assertions);
const clean=cmd.childGone&&!alive(cmd.childPid)&&cleanup.normalStopExit===0&&!cleanup.pidAliveAfterStop&&!alive(cleanup.startedPid)&&cleanup.fixtureRemoved&&!cleanup.fallbackSignalUsed&&cache.status==='PASS'&&cache.rootRemoved&&!existsSync(cache.logicalRoot)&&cache.unknownEntries.length===0&&cache.pathEscapes.length===0;
const health=read(join(out,'product-health-command-results.json'));
const audit={taskId:'c2c_a765',iteration:32,slice:'WS03D-freshness',state:'BLOCKED',reason:'Targeted browser page.evaluate callback serialization: __name undefined',sourceIntegrity:errors.length?'FAIL':'PASS',approvedFiles:18,rootTests:859,healthCommands:health,red:read(join(out,'red-result.json')),green:read(join(out,'green-result.json')),targeted:{overall:raw.overall,rows:raw.rows.length,pass:raw.rows.filter(r=>r.overall==='PASS').length,fail:raw.rows.filter(r=>r.overall==='FAIL').length,intendedAssertionsExecuted:assertions.filter(a=>a.name!=='unexpected-error').length,unexpectedErrors:assertions.filter(a=>a.name==='unexpected-error').length,attempts:cmd.targetedAttempts,retries:cmd.retryCount,exitCode:cmd.exitCode,rawSha256:hash(join(out,'freshness-browser-evidence.json'))},normalCleanup:clean,fresh47:'NOT_STARTED',browserRepair:'NOT_ATTEMPTED',independentAcceptance:'NOT_GRANTED',safariProof:0,formalWs03Gate:'NOT_ACCEPTED',ws06a:'BLOCKED',releaseHold:true,errors};
save('blocked-audit.json',audit);
writeFileSync(join(out,'result.md'),'# Iteration 32 — WS03D freshness BLOCKED\n\n18 authorized product/triad files changed; see integrity-check.json, postimages.json and approved-scope.patch. RED: 10 FAIL / 44 PASS before implementation. GREEN: 54 PASS. Full health: 859 tests / 48 files PASS, Astro clean, unadopted/adopted/diff checks PASS.\n\nTargeted qualification ran once, zero retries: 6 rows FAIL at page.evaluate with __name undefined; zero of 78 intended assertions executed. This is a harness exception, and does not establish a product PASS or FAIL. Original raw/logs preserved. Preview/fixture/owned caches normally cleaned. Fresh47 NOT_STARTED; no closure rerun, no qualification repair.\n\nCurrent hypothesis: the named recursive function in freshness-observation.mjs is instrumented by the tsx transform and its serialized browser callback references a host-only helper. This is unconfirmed; a finite independent diagnostic/replan is required. Prior acceptance is historical after the first iteration32 product mutation. No independent continuation acceptance or formal capability/release promotion. Safari proof remains zero.\n',{flag:'wx'});
const evidenceNames=['freshness-browser-evidence.json','freshness-browser-run.log','freshness-browser-command-result.json','freshness-cleanup.json','freshness-tmp-cleanup/owned-tmp-cleanup.json','freshness-observation.mjs','browser-freshness.ts','run-targeted-browser.mjs','root-check.log','green-targeted.log','red-targeted.log','integrity-check.json','postimages.json','approved-scope.patch','triad-blocked-identity.json','blocked-audit.json','result.md'];
save('review-digests.json',Object.fromEntries(evidenceNames.map(p=>[p,hash(join(out,p))])));
console.log(JSON.stringify(audit,null,2));
if(errors.length||!clean)throw Error('Blocked package integrity/cleanup failed');
