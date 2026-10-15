import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,mkdtempSync,writeFileSync,symlinkSync,unlinkSync,rmdirSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
const modulePath=new URL('./capture-bridge.mjs',import.meta.url);
let bridge;
test('capture bridge exists and exports required safeguards',async()=>{
 assert.equal(existsSync(modulePath),true,'Current-source capture bridge has not been implemented');
 bridge=await import(modulePath);
 for(const name of ['boundInputs','createWorkbook','validateWorkbook','makeEvidence','checkArtifacts'])assert.equal(typeof bridge[name],'function');
});
test('verifier requirements are current 10 / 40 / 37 / 3',()=>{
 const b=bridge.boundInputs();
 assert.equal(b.requirements.length,10);
 const all=b.requirements.flatMap(r=>r.assertions);
 assert.equal(all.length,40);assert.equal(all.filter(a=>a.disposition==='ENVIRONMENT_PROFILE_BLOCKED').length,37);
 assert.equal(all.filter(a=>a.disposition==='PRODUCT_EVIDENCE_UNRESOLVED').length,3);
 assert.deepEqual(b.closure.errors,['missing/invalid real Safari keyboard evidence']);
});
test('empty workbook cannot materialize and contains no asserted observations',()=>{
 const b=bridge.boundInputs(),w=bridge.createWorkbook(b);
 assert.ok(bridge.validateWorkbook(w,b).errors.length);
 for(const a of w.rows.flatMap(r=>r.assertions)){assert.equal(a.result,null);assert.deepEqual(a.observation.keys,[]);assert.equal(a.observation.focusVisible,null);}
 assert.throws(()=>bridge.makeEvidence(w,b,{}),/Incomplete|invalid/i);
});
test('coverage, identities, forbidden keys, artifacts and scroll conditions reject independently',()=>{
 const b=bridge.boundInputs(),dir=mkdtempSync(join(tmpdir(),'c2c35-test-'));
 const fixture=()=>{
  const w=bridge.createWorkbook(b);
  w.browser={product:'Safari',version:'26.6',engineFamily:'WebKit'};
  w.input={method:'HUMAN_PHYSICAL_KEYBOARD',keyboardNavigationSettingChangedForTest:false};
  w.review={operator:'SYNTHETIC_INVALID_SELF_TEST_ONLY',observedAt:new Date().toISOString(),notes:'Not an observation; never materialized'};
  for(const a of w.rows.flatMap(r=>r.assertions)){
   a.result='PASS';a.observation={keys:a.name==='table-local-scroll'?['Tab','ArrowRight']:['Tab'],before:'synthetic test',after:'synthetic test',focusVisible:true,artifact:'artifact.json',...(a.name==='table-local-scroll'?{scrollBefore:0,scrollAfter:1,trustedKeyReceived:true}:{})};
  }
  return w;
 };
 writeFileSync(join(dir,'artifact.json'),'synthetic invalid-workbook test only');
 symlinkSync(join(dir,'artifact.json'),join(dir,'link.json'));
 const mutations=[
  ['missing row',w=>w.rows.pop(),/case coverage/],
  ['duplicate row',w=>w.rows.push(w.rows[0]),/case coverage/],
  ['missing assertion',w=>w.rows[0].assertions.pop(),/assertion coverage/],
  ['duplicate assertion',w=>w.rows[0].assertions.push(w.rows[0].assertions[0]),/assertion coverage/],
  ['wrong disposition',w=>w.rows[0].assertions[0].disposition='OTHER',/disposition/],
  ['wrong viewport',w=>w.rows[0].viewport.width++,/case identity/],
  ['wrong route',w=>w.rows[0].route='/other/',/case identity/],
  ['wrong JS',w=>w.rows[0].javascript=!w.rows[0].javascript,/case identity/],
  ['modifier workaround',w=>w.rows[0].assertions[0].observation.keys=['Tab','Option+Tab'],/keys/],
  ['unknown key',w=>w.rows[0].assertions[0].observation.keys=['Tab','F99'],/keys/],
  ['missing artifact',w=>w.rows[0].assertions[0].observation.artifact='missing.json',/artifact/],
  ['symlink artifact',w=>w.rows[0].assertions[0].observation.artifact='link.json',/artifact/],
  ['escaping artifact',w=>w.rows[0].assertions[0].observation.artifact='../artifact.json',/artifact/],
  ['no trusted key',w=>w.rows.flatMap(r=>r.assertions).find(a=>a.name==='table-local-scroll').observation.trustedKeyReceived=false,/scroll/],
  ['no scroll delta',w=>w.rows.flatMap(r=>r.assertions).find(a=>a.name==='table-local-scroll').observation.scrollAfter=0,/scroll/],
  ['altered navigation setting',w=>w.input.keyboardNavigationSettingChangedForTest=true,/input/],
  ['wrong raw binding',w=>w.binding.rawEvidenceSha256='0'.repeat(64),/binding/],
  ['hidden focus',w=>w.rows[0].assertions[0].observation.focusVisible=false,/observation/],
 ];
 try{
  for(const [name,mutate,pattern]of mutations){const w=fixture();mutate(w);const r=bridge.validateWorkbook(w,b,dir);assert.ok(r.errors.some(e=>pattern.test(e)),name+': '+r.errors.join(';'));assert.throws(()=>bridge.makeEvidence(w,b,{},dir),/Incomplete|invalid/i,name);}
  const failed=fixture();failed.rows[0].assertions[0].result='FAIL';const r=bridge.validateWorkbook(failed,b,dir);assert.equal(r.failed.length,1);assert.throws(()=>bridge.makeEvidence(failed,b,{},dir));
  assert.equal(existsSync(join(dir,'real-keyboard-evidence.json')),false);
 }finally{unlinkSync(join(dir,'link.json'));unlinkSync(join(dir,'artifact.json'));rmdirSync(dir);}
});
