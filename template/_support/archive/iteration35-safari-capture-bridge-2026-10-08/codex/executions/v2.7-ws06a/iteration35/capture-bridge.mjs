import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {join,resolve,dirname,relative,isAbsolute} from 'node:path';
import {readFileSync,writeFileSync,lstatSync,realpathSync,existsSync} from 'node:fs';
import {base,root,hash,read,sourceManifest} from '../iteration22/finalize-readiness-audit.mjs';
const require=createRequire(join(root,'package.json'));
const {tsImport}=require('tsx/esm/api');
const verifier=await tsImport(join(root,'scripts/verify-ws06a-browser-closure.ts'),import.meta.url);
export {base,root,hash,read,sourceManifest};
export const out=join(base,'template/codex/executions/v2.7-ws06a/iteration35');
const prior=join(base,'template/codex/executions/v2.7-ws03d/iteration33');
export const paths={raw:join(prior,'fresh47/core-browser-evidence.json'),expected:join(prior,'fresh47-expected-identity.json'),native:join(prior,'bound-native-keyboard-probe.json'),policy:join(out,'../iteration14/WEBKIT_VERIFICATION_POLICY_PROPOSAL_V1.md'),control:join(out,'../iteration14/arrowright-repeatability.json')};
export const save=(name,value)=>writeFileSync(join(out,name),JSON.stringify(value,null,2)+'\n');
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function boundInputs(){
 const pre=read(join(out,'preflight.json'));
 for(const v of Object.values(pre.triad)){
  if(sourceManifest(v.root)!==v.workingTreeSha256||execFileSync('git',['rev-parse','HEAD'],{cwd:v.root,encoding:'utf8'}).trim()!==v.head||execFileSync('git',['branch','--show-current'],{cwd:v.root,encoding:'utf8'}).trim()!==v.branch)throw Error('Current triad source drift');
 }
 const raw=read(paths.raw),expected=read(paths.expected),native=read(paths.native),rawEvidenceSha256=hash(paths.raw);
 if(rawEvidenceSha256!=='3cc6fc7dcc41e3a909c427c1918cc9db67bf8d859413b5b76c2495b4fc353351'||!same(raw.identity,expected))throw Error('Iteration33 evidence drift');
 if(hash(expected.canonicalContract.verification.filePath)!==expected.canonicalContract.verification.observedSha256)throw Error('Contract drift');
 if(hash(paths.policy)!==verifier.webkitPolicy.proposalSha256||hash(paths.control)!==verifier.webkitPolicy.arrowControlSha256)throw Error('Policy/control drift');
 if(process.platform!==expected.host.platform||process.arch!==expected.host.arch||process.version!==expected.host.node)throw Error('Current host/node drift');
 const closure=verifier.verifyBrowserClosure({rawEvidence:raw,expectedIdentity:expected,nativeProbe:native,rawEvidenceSha256});
 if(closure.decision!=='BLOCKED'||!same(closure.errors,['missing/invalid real Safari keyboard evidence']))throw Error('Closure drift '+closure.errors.join(';'));
 const all=closure.requirements.flatMap(r=>r.assertions);
 if(closure.requirements.length!==10||all.length!==40||all.filter(a=>a.disposition==='ENVIRONMENT_PROFILE_BLOCKED').length!==37||all.filter(a=>a.disposition==='PRODUCT_EVIDENCE_UNRESOLVED').length!==3)throw Error('Requirement drift');
 return {raw,expected,native,rawEvidenceSha256,closure,requirements:closure.requirements,policy:verifier.webkitPolicy,binding:{rawEvidenceSha256,expectedIdentitySha256:hash(paths.expected),nativeProbeSha256:hash(paths.native),starter:expected.starter}};
}
export function createWorkbook(b){
 return {schemaVersion:'1',state:'NOT_YET_CAPTURED',binding:b.binding,browser:{product:'Safari',version:null,engineFamily:'WebKit'},input:{method:null,keyboardNavigationSettingChangedForTest:null},review:{operator:'',observedAt:'',notes:''},keyboardNavigationSetting:'',rows:b.requirements.map(r=>({...structuredClone(r),assertions:r.assertions.map(a=>({...a,result:null,observation:{keys:[],before:'',after:'',focusVisible:null,artifact:'',...(a.name==='table-local-scroll'?{scrollBefore:null,scrollAfter:null,trustedKeyReceived:null}:{})}}))}))};
}
export function checkArtifacts(rows,artifactRoot){
 const errors=[];
 for(const row of rows??[])for(const a of row.assertions??[]){
  const ref=a.observation?.artifact;
  try{
   if(typeof ref!=='string'||!ref||isAbsolute(ref)||!artifactRoot)throw Error('missing artifact reference/root');
   const p=resolve(artifactRoot,ref),rel=relative(resolve(artifactRoot),p);
   if(!rel||rel.startsWith('..')||isAbsolute(rel)||!/\.(png|jpe?g|webm|mp4|json)$/.test(p)||p===join(artifactRoot,'real-keyboard-evidence.json'))throw Error('invalid artifact path');
   let cursor=resolve(artifactRoot);for(const part of rel.split('/')){cursor=join(cursor,part);if(lstatSync(cursor).isSymbolicLink())throw Error('symlink artifact/ancestor');}
   const stat=lstatSync(p);if(!stat.isFile()||!stat.size||!realpathSync(p).startsWith(realpathSync(artifactRoot)+'/'))throw Error('missing/empty/escaping artifact');
  }catch(e){errors.push(row.caseId+'/'+a.name+': artifact '+String(e));}
 }
 return errors;
}
export function validateWorkbook(w,b,artifactRoot){
 const errors=[],failed=[];
 if(!w||!same(w.binding,b.binding))errors.push('binding mismatch');
 if(!Array.isArray(w?.rows)||w.rows.length!==b.requirements.length||new Set(w.rows.map(r=>r.caseId)).size!==b.requirements.length)errors.push('case coverage mismatch');
 const keys=new Set(['Tab','Shift+Tab','Enter','Space','Escape','ArrowRight']);
 for(const row of w?.rows??[]){
  const required=b.requirements.find(r=>r.caseId===row.caseId);
  if(!required||row.route!==required.route||!same(row.viewport,required.viewport)||row.javascript!==required.javascript){errors.push(row.caseId+': case identity mismatch');continue;}
  if(!Array.isArray(row.assertions)||row.assertions.length!==required.assertions.length||new Set(row.assertions.map(a=>a.name)).size!==required.assertions.length)errors.push(row.caseId+': assertion coverage mismatch');
  for(const a of row.assertions??[]){
   const req=required.assertions.find(r=>r.name===a.name),o=a.observation;
   if(!req||a.disposition!==req.disposition)errors.push(row.caseId+'/'+a.name+': disposition mismatch');
   if(a.result==='FAIL')failed.push({caseId:row.caseId,route:row.route,viewport:row.viewport,javascript:row.javascript,assertion:structuredClone(a)});
   if(a.result!=='PASS'||!o||o.focusVisible!==true||!o.before?.trim()||!o.after?.trim())errors.push(row.caseId+'/'+a.name+': incomplete observation');
   if(!Array.isArray(o?.keys)||!o.keys.length||o.keys.some(k=>!keys.has(k)||/alt|option|modifier/i.test(k))||(a.name!=='table-local-scroll'&&!o.keys.includes('Tab')))errors.push(row.caseId+'/'+a.name+': invalid keys');
   if(a.name==='table-local-scroll'&&(!o?.keys?.includes('ArrowRight')||o.trustedKeyReceived!==true||!Number.isFinite(o.scrollBefore)||!Number.isFinite(o.scrollAfter)||o.scrollBefore<0||o.scrollAfter<=o.scrollBefore))errors.push(row.caseId+'/'+a.name+': real scroll observation missing');
  }
 }
 if(!['HUMAN_PHYSICAL_KEYBOARD','AUTHORIZED_TRUSTED_SYSTEM_KEYBOARD'].includes(w?.input?.method)||w.input.keyboardNavigationSettingChangedForTest!==false)errors.push('invalid input metadata');
 if(!w?.keyboardNavigationSetting?.trim())errors.push('keyboard navigation setting missing');
 errors.push(...checkArtifacts(w?.rows,artifactRoot));
 return {errors,failed};
}
export function makeEvidence(w,b,manualBuild,artifactRoot){
 const check=validateWorkbook(w,b,artifactRoot);
 if(check.errors.length||check.failed.length)throw Error('Incomplete/invalid workbook: '+check.errors.join(';'));
 const proof={schemaVersion:'1',rawEvidenceSha256:b.rawEvidenceSha256,policy:b.policy,starter:b.expected.starter,manualBuild,browser:w.browser,host:b.expected.host,input:w.input,review:{...w.review,notes:w.review.notes+'; actual keyboard navigation setting: '+w.keyboardNavigationSetting},rows:w.rows};
 const decision=verifier.verifyBrowserClosure({rawEvidence:b.raw,expectedIdentity:b.expected,nativeProbe:b.native,rawEvidenceSha256:b.rawEvidenceSha256,expectedManualBuild:manualBuild,realKeyboardEvidence:proof});
 if(decision.decision!=='WS06A_CLOSURE_ELIGIBLE_FOR_INDEPENDENT_REVIEW')throw Error('Incomplete/invalid proof: '+decision.errors.join(';'));
 return proof;
}
export function currentManualBuild(session){
 const fixture=realpathSync(session.fixtureRoot);
 const current={fixtureIdentity:'Field Notes synthetic adoption',fixtureSourceSha256:sourceManifest(fixture),distSha256:sourceManifest(join(fixture,'dist'))};
 if(!same(current,session.manualBuild)||current.fixtureSourceSha256!==read(paths.expected).fixture.sourceSha256)throw Error('Active manual source/build mismatch');
 return current;
}
export function verifyProof(proof,b,manualBuild){return verifier.verifyBrowserClosure({rawEvidence:b.raw,expectedIdentity:b.expected,nativeProbe:b.native,rawEvidenceSha256:b.rawEvidenceSha256,expectedManualBuild:manualBuild,realKeyboardEvidence:proof});}
