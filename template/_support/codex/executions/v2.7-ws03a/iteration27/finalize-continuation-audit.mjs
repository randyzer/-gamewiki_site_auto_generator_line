import {createRequire} from 'node:module';
import {spawn,execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,readdirSync,lstatSync,readlinkSync,existsSync} from 'node:fs';
import {join,relative,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
export const base='/Users/randyz/work/coding/hot_words_web';
export const root=join(base,'Repo_hotgameweb/GAME_SITE_STARTER_PHASE1_CORE_SAFETY_CANDIDATE');
export const out=join(base,'template/codex/executions/v2.7-ws03a/iteration27');
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
// Preflight protects the already-saved actual plan; exclude only newly created execution artifacts.
const allowed=['template/codex/executions/v2.7-ws03a/iteration27'];
function workspace(){let all=[];for(const n of ['template','Repo_hotgameweb','gameweb'])if(existsSync(join(base,n)))all.push(...files(join(base,n),allowed.filter(p=>p.startsWith(n+'/')).map(p=>p.slice(n.length+1))).map(r=>({...r,path:n+'/'+r.path})));return Object.fromEntries(all.map(({path,...v})=>[path,v]));}
function registry(){const s=readFileSync(contract,'utf8').split('## H. Product Contract v0.2')[1].split('## I. Applicability Model')[0];const ids=[...s.matchAll(/^\| ([A-Z]+-\d+) \|/gm)].map(m=>m[1]);return {canonicalCapabilityRows:ids.length,uniqueCapabilityIds:new Set(ids).size,duplicateCapabilityRows:ids.length-new Set(ids).size};}
const git=(cwd,...args)=>execFileSync('git',args,{cwd,encoding:'utf8'}).trim();
async function command(name,args,env={}){
 const startedAt=new Date().toISOString();let log='';const child=spawn(args[0],args.slice(1),{cwd:root,env:{...process.env,...env},stdio:['ignore','pipe','pipe']});
 child.stdout.on('data',b=>{log+=b;});child.stderr.on('data',b=>{log+=b;});
 const exitCode=await new Promise((r,j)=>{child.once('error',j);child.once('close',r);});writeFileSync(join(out,name+'.log'),log);
 return {name,command:args.join(' '),exitCode,startedAt,finishedAt:new Date().toISOString()};
}
async function finalize(){
 const rawPath=join(out,'fresh47/core-browser-evidence.json'),raw=read(rawPath),expected=read(join(out,'fresh47-expected-identity.json')),tool=read(join(out,'current-tool-engine-host-identity.json')),native=read(join(out,'fresh47/native-keyboard-probe.json')),errors=[];
 const bound={schemaVersion:'1',rawEvidenceSha256:hash(rawPath),host:tool.host,engine:tool.engines.webkit,webkit:native.webkit};save('bound-native-keyboard-probe.json',bound);
 const policyPath=join(base,'template/codex/executions/v2.7-ws06a/iteration14/WEBKIT_VERIFICATION_POLICY_PROPOSAL_V1.md'),controlPath=join(base,'template/codex/executions/v2.7-ws06a/iteration14/arrowright-repeatability.json');
 const policy={proposalSha256:hash(policyPath),arrowControlSha256:hash(controlPath),proposalExact:hash(policyPath)==='2696a9d7ee691fad07ea7b557a4acab706bb408ea0c5583c3bfe7bd5fb85d917',controlExact:hash(controlPath)==='1ff999e08c3c93d93baaca8260bee8c243c3e2367552e58ae9550473bc741344',engineHostValid:tool.engines.webkit.version==='26.6'&&tool.engines.webkit.revision==='2359'&&tool.host.platform==='darwin'&&tool.host.arch==='arm64',nativeCurrentSha256:hash(join(out,'fresh47/native-keyboard-probe.json')),nativeProfileUnavailable:native.webkit.plainTabReachesLink===false};save('policy-control-validity.json',{...read(join(out,'policy-control-validity.json')),...policy});
 const env={WS06A_BROWSER_EVIDENCE:rawPath,WS06A_EXPECTED_IDENTITY:join(out,'fresh47-expected-identity.json'),WS06A_NATIVE_PROBE:join(out,'bound-native-keyboard-probe.json'),WS06A_POLICY_PROPOSAL:policyPath,WS06A_ARROW_CONTROL:controlPath};delete process.env.WS06A_REAL_KEYBOARD_EVIDENCE;delete process.env.WS06A_MANUAL_PROJECT_ROOT;
 const closureCommand=await command('closure-recheck',['npm','run','verify:browser-closure'],env);const log=readFileSync(join(out,'closure-recheck.log'),'utf8');const start=log.indexOf('{\n');if(start<0)throw Error('No closure JSON');const closure=JSON.parse(log.slice(start));save('closure-recheck.json',{...closure,commandResult:closureCommand});
 const closureValid=closure.decision==='RAW_QUALIFICATION_COMPLETE'?closureCommand.exitCode===0&&closure.errors.length===0:closureCommand.exitCode===1&&closure.decision==='BLOCKED'&&JSON.stringify(closure.errors)===JSON.stringify(['missing/invalid real Safari keyboard evidence']);if(!closureValid)errors.push('closure errors outside missing Safari');
 const old=read(join(base,'template/codex/executions/v2.7-ws06a/iteration19/residual-set-v1.json')),residual=[],matches=[];const fields=['caseId','category','role','route','viewport','javascript','reducedMotion','assertion','disposition'];
 for(const row of raw.rows)for(const a of row.assertions.filter(a=>!a.passed)){
  const req=closure.requirements.find(r=>r.caseId===row.caseId)?.assertions.find(x=>x.name===a.name);
  const entry={caseId:row.caseId,category:row.category,role:row.role,route:row.route,viewport:row.viewport,javascript:row.javascript,reducedMotion:row.reducedMotion,assertion:a.name,disposition:req?.disposition??'UNKNOWN',detail:a.detail};residual.push(entry);
  if(row.engine!=='webkit'||!old.rows.some(r=>fields.every(k=>JSON.stringify(r[k])===JSON.stringify(entry[k]))))errors.push('New residual '+row.caseId+' '+a.name);
  const counterparts=[];for(const engine of ['chromium','firefox']){
   const candidates=raw.rows.filter(r=>r.engine===engine&&['category','role','route','viewport','javascript','reducedMotion'].every(k=>JSON.stringify(r[k])===JSON.stringify(row[k])));const r=candidates[0],as=r?.assertions.filter(x=>x.name===a.name)??[];const passed=candidates.length===1&&r.caseStatus==='PASS'&&as.length===1&&as[0].passed===true;
   counterparts.push({engine,caseId:r?.caseId??null,assertion:a.name,rowPass:r?.caseStatus==='PASS',assertionPass:as.length===1&&as[0].passed===true,passed});if(!passed)errors.push('Counterpart invalid '+engine+' '+row.caseId+' '+a.name);
  }matches.push({residual:entry,counterparts});
 }
 save('residual-comparison.json',{rawEvidenceSha256:hash(rawPath),acceptedBaselineSha256:hash(join(base,'template/codex/executions/v2.7-ws06a/iteration19/residual-set-v1.json')),currentResidualCount:residual.length,exactSubset:!errors.some(e=>e.startsWith('New residual')),rows:residual,classificationOracle:'unchanged closure verifier fresh requirements',errors:errors.filter(e=>e.startsWith('New residual'))});
 save('dual-engine-counterpart-audit.json',{rawEvidenceSha256:hash(rawPath),failedAssertions:residual.length,chromiumMatches:matches.filter(m=>m.counterparts.find(c=>c.engine==='chromium').passed).length,firefoxMatches:matches.filter(m=>m.counterparts.find(c=>c.engine==='firefox').passed).length,rows:matches,errors:errors.filter(e=>e.startsWith('Counterpart'))});
 const previous22Path=join(base,'template/codex/executions/v2.7-ws06a/iteration22/residual-comparison.json'),previous22=read(previous22Path).rows;
 const same=(a,b)=>fields.every(k=>JSON.stringify(a[k])===JSON.stringify(b[k]));
 const persisted=residual.filter(a=>previous22.some(b=>same(a,b))),disappeared=previous22.filter(a=>!residual.some(b=>same(a,b))),reappearedFromFrozen40=residual.filter(a=>!previous22.some(b=>same(a,b))&&old.rows.some(b=>same(a,b))),newOutsideFrozen40=residual.filter(a=>!old.rows.some(b=>same(a,b)));
 save('post03a-vs-iteration22-residual-delta.json',{previous22ResidualCount:previous22.length,previous22Sha256:hash(previous22Path),currentResidualCount:residual.length,persisted,disappeared,reappearedFromFrozen40,newOutsideFrozen40});
 save('post03a-residual-comparison.json',read(join(out,'residual-comparison.json')));
 const pre=read(join(out,'preflight.json')),now=workspace(),drift=Object.keys(pre.protected).filter(p=>JSON.stringify(now[p])!==JSON.stringify(pre.protected[p])).concat(Object.keys(now).filter(p=>!pre.protected[p]));const ids=registry();
 const triad=read(join(out,'triad-post-identity.json')).triad;for(const v of Object.values(triad)){if(sourceManifest(v.root)!==v.workingTreeSha256||git(v.root,'rev-parse','HEAD')!==v.head||git(v.root,'rev-parse','HEAD^{tree}')!==v.tree||git(v.root,'branch','--show-current')!==v.branch)drift.push(v.root+' identity');}
 const hashes=tool.verificationFileHashes;for(const [p,h] of Object.entries(hashes))if(hash(join(root,p))!==h)drift.push(p+' verification');
 const integrity={status:drift.length?'FAIL':'PASS',protectedFilesUnchanged:drift.length?0:pre.protectedCount,productDelta:drift.filter(p=>p.startsWith('Repo_hotgameweb/GAME_SITE_STARTER')).length,governanceDelta:drift.filter(p=>!p.startsWith('Repo_hotgameweb/GAME_SITE_STARTER')).length,ContractSHA:hash(contract),...ids,verificationInfrastructureDelta:Object.entries(hashes).filter(([p,h])=>hash(join(root,p))!==h).length,errors:drift};save('integrity-check.json',integrity);if(drift.length||ids.uniqueCapabilityIds!==41||ids.duplicateCapabilityRows)errors.push('Integrity failed');
 const healthResults=read(join(base,'template/codex/executions/v2.7-ws03a/iteration23/product-health-command-results.json')),rootLog=readFileSync(join(base,'template/codex/executions/v2.7-ws03a/iteration23/root-check.log'),'utf8'),unadopted=readFileSync(join(base,'template/codex/executions/v2.7-ws03a/iteration23/unadopted-final.log'),'utf8'),adopted=readFileSync(join(base,'template/codex/executions/v2.7-ws03a/iteration23/adopted-final.log'),'utf8');
 const healthValid=healthResults.length===4&&healthResults.every(r=>r.exitCode===0)&&/46 passed \(46\)/.test(rootLog)&&/780 passed \(780\)/.test(rootLog)&&['validate','build'].every(n=>new RegExp('ADOPTION unadopted: '+n+' exit=[1-9]\\d*; EXPECTED_PP02_REJECTION').test(unadopted))&&['validate','check','build'].every(n=>adopted.includes('ADOPTION adopted: '+n+' exit=0; PASS'));if(!healthValid)errors.push('Health detail invalid');
 const cleanup=read(join(out,'fresh47/preview-cleanup-audit.json')),tmpAudit=read(join(out,'fresh47-owned-tmp-audit.json'));const normalCleanup=cleanup.startedPid!==null&&cleanup.astroStopExit===0&&cleanup.pidAliveBeforeStop===true&&cleanup.pidAliveAfterStop===false&&cleanup.fallbackSignalUsed===false&&cleanup.fixtureRemoved===true&&!alive(cleanup.startedPid)&&tmpAudit.closed===true;if(!normalCleanup)errors.push('Normal cleanup failed');
 if(raw.rows.length!==47||raw.rows.some(r=>r.caseStatus==='NOT_RUN'))errors.push('Incomplete47');if(raw.rows.some(r=>r.engine!=='webkit'&&r.caseStatus!=='PASS'))errors.push('Non-WebKit failure');if(raw.infrastructureErrors.some(e=>e!=='WEBKIT_STANDARD_TAB_LINK_PROFILE_UNAVAILABLE'))errors.push('Unknown infrastructure');
 if(JSON.stringify(raw.identity)!==JSON.stringify(expected))errors.push('Independent identity mismatch');if(residual.length&&(!policy.proposalExact||!policy.controlExact||!policy.engineHostValid||!policy.nativeProfileUnavailable))errors.push('Policy/native invalid');
 const exact13=pre.exact13.every(e=>hash(join(base,e.path))===e.postimageSha256);
 const health23=join(base,'template/codex/executions/v2.7-ws03a/iteration23'),red=read(join(health23,'red-theme-tests.json')),green=read(join(health23,'green-theme-tests.json'));
 const redGreenValid=red.exitCode===1&&red.failed===8&&red.passed===45&&red.implementationWrittenBeforeRed===false&&green.exitCode===0&&green.passed===53;
 const serialization=read(join(out,'callback-serialization-check.json')),diff=read(join(out,'harness-diff-check.json')),diagnosis=read(join(out,'settled-geometry-analysis.json')),targeted=read(join(out,'03a-browser-evidence.json')),targetedCommand=read(join(out,'03a-browser-command-result.json')),targetedCleanup=read(join(out,'03a-cleanup.json')),targetedCache=read(join(out,'03a-tmp-cleanup/owned-tmp-cleanup.json')),targetedSettlements=read(join(out,'targeted-settlement-observations.json'));
 const settledDiagnosisValid=diagnosis.candidate==='SETTLED_PRECISION_ARTIFACT_SUPPORTED'&&diagnosis.rows.length===6&&diagnosis.rows.every(r=>r.settlementPass&&r.sampleCount===16&&r.usedLayoutStrict44&&r.boundingBoxStrict44&&r.allRawRectsStrict44);
 const targetedAssertions=targeted.rows.reduce((n,r)=>n+r.assertions.length,0);
 const targetedValid=targeted.overall==='PASS'&&targeted.rows.length===6&&targeted.rows.every(r=>r.overall==='PASS'&&r.assertions.every(a=>a.passed))&&targetedAssertions===63&&targeted.errors.length===0&&targetedCommand.exitCode===0&&targetedCommand.targetedAttempts===1&&targetedCommand.retryCount===0&&targetedSettlements.length===6&&targetedSettlements.every(r=>r.status==='PASS'&&r.intervention===false);
 const targetedNormalCleanup=targetedCleanup.normalStopExit===0&&targetedCleanup.pidAliveBeforeStop===true&&targetedCleanup.pidAliveAfterStop===false&&targetedCleanup.fallbackSignalUsed===false&&targetedCleanup.fixtureRemoved===true&&!alive(targetedCleanup.startedPid)&&targetedCache.status==='PASS'&&targetedCache.rootRemoved===true;
 const freshCommand=read(join(out,'fresh47-command-result.json')),freshCache=read(join(out,'fresh47-owned-tmp-cleanup.json'));
 const freshOneAttempt=freshCommand.qualificationAttempts===1&&freshCommand.retryCount===0&&freshCommand.observerErrors.length===0&&freshCommand.fixtureCaptured===true&&freshCache.status==='PASS'&&freshCache.rootRemoved===true;
 if(!exact13||!redGreenValid||serialization.status!=='PASS'||diff.status!=='PASS'||!settledDiagnosisValid||!targetedValid||!targetedNormalCleanup||!freshOneAttempt)errors.push('WS03A bound evidence chain invalid');
 if(hash(contract)!==pre.contractSha256||integrity.canonicalCapabilityRows!==41||integrity.duplicateCapabilityRows)errors.push('Canonical Contract integrity');
 save('retained-iteration23-health-binding.json',{sourceExact13Postimages:exact13,redGreenValid,root780Valid:healthValid,evidence:Object.fromEntries(['red-theme-tests.json','red-theme-tests.log','green-theme-tests.json','green-theme-tests.log','product-health-command-results.json','root-check.log','unadopted-final.log','adopted-final.log','git-diff-check.log','scope-check.json'].map(n=>[n,hash(join(health23,n))])),rerun:false});
 const verdict={taskId:'c2c_a765',iteration:27,observedAt:new Date().toISOString(),candidate:errors.length?'BLOCKED':'ELIGIBLE_FOR_INDEPENDENT_CONTINUATION_REVIEW',rawOverall:raw.overall,rawQualificationExit:freshCommand.exitCode,rawEvidenceSha256:hash(rawPath),planned:47,executed:raw.rows.filter(r=>r.caseStatus!=='NOT_RUN').length,pass:raw.rows.filter(r=>r.caseStatus==='PASS').length,fail:raw.rows.filter(r=>r.caseStatus==='FAIL').length,notRun:raw.rows.filter(r=>r.caseStatus==='NOT_RUN').length,currentResidualCount:residual.length,classificationCounts:Object.fromEntries([...new Set(residual.map(r=>r.disposition))].map(d=>[d,residual.filter(r=>r.disposition===d).length])),newOutsideFrozen40:newOutsideFrozen40.length,reappearedFromFrozen40:reappearedFromFrozen40.length,disappearedFrom22:disappeared.length,healthValid,redGreenValid,exact13,settledDiagnosisValid,targetedValid,targetedAssertions,targetedNormalCleanup,normalCleanup,freshOneAttempt,identityExact:JSON.stringify(raw.identity)===JSON.stringify(expected),integrityPass:integrity.status==='PASS',closureValid,chromiumCounterparts:matches.filter(m=>m.counterparts.find(c=>c.engine==='chromium').passed).length,firefoxCounterparts:matches.filter(m=>m.counterparts.find(c=>c.engine==='firefox').passed).length,safariProof:0,ws06a:'BLOCKED',capabilityPromotion:'NONE',formalWs03AGate:'NOT_CLOSED',formalWs03Gate:'NOT_ACCEPTED',releaseHold:true,next:'Actual independent REVIEW27; finite WS03B plan only after continuation ACCEPT',errors};
 save('continuation-audit.json',verdict);console.log(JSON.stringify(verdict,null,2));if(errors.length)throw Error('Continuation BLOCKED');
}
try{await finalize();}catch(e){console.error(e);process.exitCode=1;}
