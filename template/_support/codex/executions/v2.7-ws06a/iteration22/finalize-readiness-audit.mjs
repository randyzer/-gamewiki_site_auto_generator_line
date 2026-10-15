import {createRequire} from 'node:module';
import {spawn,execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,readdirSync,lstatSync,readlinkSync,existsSync} from 'node:fs';
import {join,relative,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
export const base='/Users/randyz/work/coding/hot_words_web';
export const root=join(base,'Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE');
export const out=join(base,'template/codex/executions/v2.7-ws06a/iteration22');
export const contract=join(base,'Repo_hotgameweb/GAME_SOP_V2.7_CANDIDATE/docs/COMMERCIAL_GAME_SITE_PRODUCT_CONTRACT_V2.7.md');
export const read=p=>JSON.parse(readFileSync(p,'utf8'));
export const save=(n,d)=>writeFileSync(join(out,n),JSON.stringify(d,null,2)+'\n');
export const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
export const alive=pid=>{try{process.kill(pid,0);return true;}catch{return false;}};
const excluded=new Set(['.git','node_modules','dist','.astro','.astro-cache','.vite-cache','.vitest-cache','.wrangler','coverage','.browser-evidence','.DS_Store']);
export function files(basePath,allowed=[]){
 const records=[];
 function visit(dir){for(const name of readdirSync(dir).sort()){
  if(excluded.has(name)||name.startsWith('.env'))continue;
  const path=join(dir,name),rel=relative(basePath,path),s=lstatSync(path);
  if(allowed.some(a=>rel===a||rel.startsWith(a+'/')))continue;
  if(s.isDirectory())visit(path);
  else{if(!s.isFile()&&!s.isSymbolicLink())throw Error('Non-file in manifest '+path);
   records.push({path:rel,sha256:createHash('sha256').update(s.isSymbolicLink()?readlinkSync(path):readFileSync(path)).digest('hex'),mode:s.mode&0o777,symlink:s.isSymbolicLink()});}
 }}visit(basePath);return records;
}
export function sourceManifest(path){return createHash('sha256').update(JSON.stringify(files(path))).digest('hex');}
const allowed=['template/codex/executions/v2.7-ws06a/iteration22','template/codex/prompts/v2.7-ws06a/iteration22-short-tmpdir-readiness-reaudit-plan.md','template/codex/prompts/v2.7-ws06a/iteration22-short-tmpdir-amendment.md'];
function workspace(){let all=[];for(const n of ['template','Repo_hotgameweb','gameweb'])if(existsSync(join(base,n)))all.push(...files(join(base,n),allowed.filter(p=>p.startsWith(n+'/')).map(p=>p.slice(n.length+1))).map(r=>({...r,path:n+'/'+r.path})));return Object.fromEntries(all.map(({path,...v})=>[path,v]));}
function registry(){const s=readFileSync(contract,'utf8').split('## H. Product Contract v0.2')[1].split('## I. Applicability Model')[0];const ids=[...s.matchAll(/^\| ([A-Z]+-\d+) \|/gm)].map(m=>m[1]);return {canonicalCapabilityRows:ids.length,uniqueCapabilityIds:new Set(ids).size,duplicateCapabilityRows:ids.length-new Set(ids).size};}
const git=(cwd,...args)=>execFileSync('git',args,{cwd,encoding:'utf8'}).trim();
async function command(name,args,env={}){
 const startedAt=new Date().toISOString();let log='';const child=spawn(args[0],args.slice(1),{cwd:root,env:{...process.env,...env},stdio:['ignore','pipe','pipe']});
 child.stdout.on('data',b=>{log+=b;});child.stderr.on('data',b=>{log+=b;});
 const exitCode=await new Promise((r,j)=>{child.once('error',j);child.once('close',r);});writeFileSync(join(out,name+'.log'),log);
 return {name,command:args.join(' '),exitCode,startedAt,finishedAt:new Date().toISOString()};
}
async function preflight(){
 const protectedNow=workspace(),old=read(join(out,'../iteration21/preflight.json')),errors=[];
 for(const [p,v] of Object.entries(old.allProtected))if(JSON.stringify(protectedNow[p])!==JSON.stringify(v))errors.push(p);
 const governance=read(join(out,'../iteration20/governance-checks.json'));
 for(const [p,v] of Object.entries(governance.postimages??{}))if(JSON.stringify(protectedNow[p])!==JSON.stringify(v))errors.push('accepted20 '+p);
 const ids=registry();if(ids.uniqueCapabilityIds!==41||ids.canonicalCapabilityRows!==41||ids.duplicateCapabilityRows)errors.push('registry');
 if(hash(contract)!=='1ff2bd01a089975c6b22bff48ca71faffe2be9c710d0123afd3ae47acc7ac24c')errors.push('Contract bytes');
 if(errors.length)throw Error('Preflight drift '+errors.join(';'));
 const triad={};for(const n of ['GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE','GAME_SOP_V2.7_CANDIDATE','GAME_CODEX_MASTER_PROMPT_V2.7_CANDIDATE']){const p=join(root,'..',n);triad[n]={root:p,branch:git(p,'branch','--show-current'),head:git(p,'rev-parse','HEAD'),tree:git(p,'rev-parse','HEAD^{tree}'),workingTreeSha256:sourceManifest(p)};}
 const require=createRequire(join(root,'package.json')),pw=require('playwright'),metadata=read(join(root,'node_modules/playwright-core/browsers.json')),engines={};
 for(const n of ['chromium','firefox','webkit']){const revision=pw[n].executablePath().split(/[/\\]/).find(p=>new RegExp('^'+n+'-\\d+$').test(p))?.split('-').at(-1);const r=metadata.browsers.find(r=>r.name===n);if(!r||!revision||![r.revision,...Object.values(r.revisionOverrides??{})].includes(revision))throw Error('Unbound engine');const browser=await pw[n].launch({headless:true});try{engines[n]={browserName:n,version:browser.version(),revision};}finally{await browser.close();}}
 const referenceText=readFileSync(join(root,'scripts/core-browser-evidence.ts'),'utf8');const reference={};for(const k of ['version','owningArtifact','canonicalPath','sha256']){const m=referenceText.match(new RegExp(k+': "([^"]+)"'));if(!m)throw Error('Reference unavailable '+k);reference[k]=m[1];}
 const canonicalContract={reference,verification:{mode:'FILE_SHA256',filePath:contract,observedSha256:hash(contract)}};
 const verificationFiles=['scripts/core-browser-matrix.ts','scripts/run-core-browser-evidence.ts','scripts/core-browser-evidence.ts','scripts/verify-ws06a-browser-closure.ts','package.json','package-lock.json'];
 save('preflight.json',{capturedAt:new Date().toISOString(),protected:protectedNow,protectedCount:Object.keys(protectedNow).length,registry:ids,accepted20Closure:read(join(out,'../iteration20/closure-checks.json')).status,accepted21CorrectedIntegrity:read(join(out,'../iteration21/integrity-check.json')),errors});
 save('current-triad-identity.json',{capturedAt:new Date().toISOString(),triad,canonicalContract});save('current-tool-engine-host-identity.json',{capturedAt:new Date().toISOString(),host:{platform:process.platform,arch:process.arch,node:process.version},playwright:{packageVersion:require('playwright/package.json').version},engines});save('verification-file-hashes.json',Object.fromEntries(verificationFiles.map(p=>[p,hash(join(root,p))])));
 const oldCleanup=read(join(out,'../iteration21/old-iteration17-manual-cleanup.json'));const oldCheck={pidAbsent:!alive(oldCleanup.recordedPid),fixtureAbsent:!existsSync(oldCleanup.recordedFixture),cleanupArtifactSha256:hash(join(out,'../iteration21/old-iteration17-manual-cleanup.json')),historicalNormalCleanup:oldCleanup.status==='PASS'&&oldCleanup.astroStopExit===0&&!oldCleanup.fallbackSignalUsed};save('old17-cleanup-recheck.json',oldCheck);if(Object.values(oldCheck).some(x=>x===false))throw Error('Old cleanup invalid');
 console.log('Fresh preflight PASS, protected '+Object.keys(protectedNow).length);
}
async function health(){const results=[];for(const [n,args] of [['root-check',['npm','run','check']],['unadopted-final',['npm','run','verify:unadopted-final']],['adopted-final',['npm','run','verify:adopted-final']],['git-diff-check',['git','diff','--check']]]){const r=await command(n,args);results.push(r);save('product-health-command-results.json',results);console.log(n,r.exitCode);if(r.exitCode!==0)throw Error('Product health FAIL '+n);}}
async function finalize(){
 const rawPath=join(out,'browser-evidence/core-browser-evidence.json'),raw=read(rawPath),expected=read(join(out,'independent-expected-identity.json')),tool=read(join(out,'current-tool-engine-host-identity.json')),native=read(join(out,'browser-evidence/native-keyboard-probe.json')),errors=[];
 const bound={schemaVersion:'1',rawEvidenceSha256:hash(rawPath),host:tool.host,engine:tool.engines.webkit,webkit:native.webkit};save('bound-native-keyboard-probe.json',bound);
 const policyPath=join(out,'../iteration14/WEBKIT_VERIFICATION_POLICY_PROPOSAL_V1.md'),controlPath=join(out,'../iteration14/arrowright-repeatability.json');
 const policy={proposalSha256:hash(policyPath),arrowControlSha256:hash(controlPath),proposalExact:hash(policyPath)==='2696a9d7ee691fad07ea7b557a4acab706bb408ea0c5583c3bfe7bd5fb85d917',controlExact:hash(controlPath)==='1ff999e08c3c93d93baaca8260bee8c243c3e2367552e58ae9550473bc741344',engineHostValid:tool.engines.webkit.version==='26.6'&&tool.engines.webkit.revision==='2359'&&tool.host.platform==='darwin'&&tool.host.arch==='arm64',nativeCurrentSha256:hash(join(out,'browser-evidence/native-keyboard-probe.json')),nativeProfileUnavailable:native.webkit.plainTabReachesLink===false};save('policy-control-validity.json',policy);
 const env={WS06A_BROWSER_EVIDENCE:rawPath,WS06A_EXPECTED_IDENTITY:join(out,'independent-expected-identity.json'),WS06A_NATIVE_PROBE:join(out,'bound-native-keyboard-probe.json'),WS06A_POLICY_PROPOSAL:policyPath,WS06A_ARROW_CONTROL:controlPath};delete process.env.WS06A_REAL_KEYBOARD_EVIDENCE;delete process.env.WS06A_MANUAL_PROJECT_ROOT;
 const closureCommand=await command('closure-recheck',['npm','run','verify:browser-closure'],env);const log=readFileSync(join(out,'closure-recheck.log'),'utf8');const start=log.indexOf('{\n');if(start<0)throw Error('No closure JSON');const closure=JSON.parse(log.slice(start));save('closure-recheck.json',{...closure,commandResult:closureCommand});
 const closureValid=closure.decision==='RAW_QUALIFICATION_COMPLETE'?closureCommand.exitCode===0&&closure.errors.length===0:closureCommand.exitCode===1&&closure.decision==='BLOCKED'&&JSON.stringify(closure.errors)===JSON.stringify(['missing/invalid real Safari keyboard evidence']);if(!closureValid)errors.push('closure errors outside missing Safari');
 const old=read(join(out,'../iteration19/residual-set-v1.json')),residual=[],matches=[];const fields=['caseId','category','role','route','viewport','javascript','reducedMotion','assertion','disposition'];
 for(const row of raw.rows)for(const a of row.assertions.filter(a=>!a.passed)){
  const req=closure.requirements.find(r=>r.caseId===row.caseId)?.assertions.find(x=>x.name===a.name);
  const entry={caseId:row.caseId,category:row.category,role:row.role,route:row.route,viewport:row.viewport,javascript:row.javascript,reducedMotion:row.reducedMotion,assertion:a.name,disposition:req?.disposition??'UNKNOWN',detail:a.detail};residual.push(entry);
  if(row.engine!=='webkit'||!old.rows.some(r=>fields.every(k=>JSON.stringify(r[k])===JSON.stringify(entry[k]))))errors.push('New residual '+row.caseId+' '+a.name);
  const counterparts=[];for(const engine of ['chromium','firefox']){
   const candidates=raw.rows.filter(r=>r.engine===engine&&['category','role','route','viewport','javascript','reducedMotion'].every(k=>JSON.stringify(r[k])===JSON.stringify(row[k])));const r=candidates[0],as=r?.assertions.filter(x=>x.name===a.name)??[];const passed=candidates.length===1&&r.caseStatus==='PASS'&&as.length===1&&as[0].passed===true;
   counterparts.push({engine,caseId:r?.caseId??null,assertion:a.name,rowPass:r?.caseStatus==='PASS',assertionPass:as.length===1&&as[0].passed===true,passed});if(!passed)errors.push('Counterpart invalid '+engine+' '+row.caseId+' '+a.name);
  }matches.push({residual:entry,counterparts});
 }
 save('residual-comparison.json',{rawEvidenceSha256:hash(rawPath),acceptedBaselineSha256:hash(join(out,'../iteration19/residual-set-v1.json')),currentResidualCount:residual.length,exactSubset:!errors.some(e=>e.startsWith('New residual')),rows:residual,classificationOracle:'unchanged closure verifier fresh requirements',errors:errors.filter(e=>e.startsWith('New residual'))});
 save('dual-engine-counterpart-audit.json',{rawEvidenceSha256:hash(rawPath),failedAssertions:residual.length,chromiumMatches:matches.filter(m=>m.counterparts.find(c=>c.engine==='chromium').passed).length,firefoxMatches:matches.filter(m=>m.counterparts.find(c=>c.engine==='firefox').passed).length,rows:matches,errors:errors.filter(e=>e.startsWith('Counterpart'))});
 const pre=read(join(out,'preflight.json')),now=workspace(),drift=Object.keys(pre.protected).filter(p=>JSON.stringify(now[p])!==JSON.stringify(pre.protected[p])).concat(Object.keys(now).filter(p=>!pre.protected[p]));const ids=registry();
 const triad=read(join(out,'current-triad-identity.json')).triad;for(const v of Object.values(triad)){if(sourceManifest(v.root)!==v.workingTreeSha256||git(v.root,'rev-parse','HEAD')!==v.head||git(v.root,'rev-parse','HEAD^{tree}')!==v.tree||git(v.root,'branch','--show-current')!==v.branch)drift.push(v.root+' identity');}
 const hashes=read(join(out,'verification-file-hashes.json'));for(const [p,h] of Object.entries(hashes))if(hash(join(root,p))!==h)drift.push(p+' verification');
 const integrity={status:drift.length?'FAIL':'PASS',protectedFilesUnchanged:drift.length?0:pre.protectedCount,productDelta:drift.filter(p=>p.startsWith('Repo_hotgameweb/GAME_SITE_STARTER')).length,governanceDelta:drift.filter(p=>!p.startsWith('Repo_hotgameweb/GAME_SITE_STARTER')).length,ContractSHA:hash(contract),...ids,verificationInfrastructureDelta:Object.entries(hashes).filter(([p,h])=>hash(join(root,p))!==h).length,errors:drift};save('integrity-check.json',integrity);if(drift.length||ids.uniqueCapabilityIds!==41||ids.duplicateCapabilityRows)errors.push('Integrity failed');
 const healthResults=read(join(out,'product-health-command-results.json')),rootLog=readFileSync(join(out,'root-check.log'),'utf8'),unadopted=readFileSync(join(out,'unadopted-final.log'),'utf8'),adopted=readFileSync(join(out,'adopted-final.log'),'utf8');
 const healthValid=healthResults.length===4&&healthResults.every(r=>r.exitCode===0)&&/46 passed \(46\)/.test(rootLog)&&/757 passed \(757\)/.test(rootLog)&&['validate','build'].every(n=>new RegExp('ADOPTION unadopted: '+n+' exit=[1-9]\\d*; EXPECTED_PP02_REJECTION').test(unadopted))&&['validate','check','build'].every(n=>adopted.includes('ADOPTION adopted: '+n+' exit=0; PASS'));if(!healthValid)errors.push('Health detail invalid');
 const cleanup=read(join(out,'browser-evidence/preview-cleanup-audit.json')),tmpAudit=read(join(out,'owned-tmp-audit.json'));const normalCleanup=cleanup.startedPid!==null&&cleanup.astroStopExit===0&&cleanup.pidAliveBeforeStop===true&&cleanup.pidAliveAfterStop===false&&cleanup.fallbackSignalUsed===false&&cleanup.fixtureRemoved===true&&!alive(cleanup.startedPid)&&tmpAudit.closed===true;if(!normalCleanup)errors.push('Normal cleanup failed');
 if(raw.rows.length!==47||raw.rows.some(r=>r.caseStatus==='NOT_RUN'))errors.push('Incomplete47');if(raw.rows.some(r=>r.engine!=='webkit'&&r.caseStatus!=='PASS'))errors.push('Non-WebKit failure');if(raw.infrastructureErrors.some(e=>e!=='WEBKIT_STANDARD_TAB_LINK_PROFILE_UNAVAILABLE'))errors.push('Unknown infrastructure');
 if(JSON.stringify(raw.identity)!==JSON.stringify(expected))errors.push('Independent identity mismatch');if(residual.length&&(!policy.proposalExact||!policy.controlExact||!policy.engineHostValid||!policy.nativeProfileUnavailable))errors.push('Policy/native invalid');
 const verdict={taskId:'c2c_a765',iteration:22,observedAt:new Date().toISOString(),candidate:errors.length?'BLOCKED':'ELIGIBLE_FOR_INDEPENDENT_READINESS_REVIEW',rawOverall:raw.overall,rawEvidenceSha256:hash(rawPath),planned:47,executed:raw.rows.filter(r=>r.caseStatus!=='NOT_RUN').length,pass:raw.rows.filter(r=>r.caseStatus==='PASS').length,fail:raw.rows.filter(r=>r.caseStatus==='FAIL').length,notRun:raw.rows.filter(r=>r.caseStatus==='NOT_RUN').length,currentResidualCount:residual.length,healthValid,normalCleanup,identityExact:JSON.stringify(raw.identity)===JSON.stringify(expected),integrityPass:integrity.status==='PASS',governance20Accepted:pre.accepted20Closure==='PASS',old17CleanupRemainsClosed:Object.values(read(join(out,'old17-cleanup-recheck.json'))).every(v=>v!==false),nextAuthorizedSliceIfAccepted:'WS03A',expiry:'independent ACCEPT observed time +7 calendar days, earlier identity/source/governance/verification/engine/host/build change or first WS03A mutation',safariProof:0,ws06a:'BLOCKED',capabilityPromotion:'NONE',formalWs03Gate:'NOT_ACCEPTED',releaseHold:true,errors};save('readiness-audit.json',verdict);console.log(JSON.stringify(verdict,null,2));if(errors.length)throw Error('Readiness BLOCKED');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){try{if(process.argv[2]==='preflight')await preflight();else if(process.argv[2]==='health')await health();else await finalize();}catch(e){console.error(e);process.exitCode=1;}}
