import test from 'node:test';
import assert from 'node:assert/strict';
import {safeBskUploadEffect} from '../src/bsk-effect-state.mjs';
test('documented bsk reason and effect are extracted from bounded structured error',()=>{
 const s=JSON.stringify({status:'failed',error:{reason:'file_input_not_activated',effect_state:'none',
  arbitrary:'PRIVATE_CREDENTIAL_EXAMPLE'}});
 assert.deepEqual(safeBskUploadEffect(s),{reason:'file_input_not_activated',effectState:'none'});
});
test('unknown and committed must not be interpreted as none',()=>{
 for(const status of ['unknown','committed'])
  assert.equal(safeBskUploadEffect(JSON.stringify({reason:'file_input_not_activated',effect_state:status})).effectState,status);
});
test('unverified native errors fail closed without echoing private data',()=>{
 for(const s of ['PRIVATE_AUTH_TOKEN=123','',JSON.stringify({reason:'tricked_reason',effect_state:'approve'}),
   'x'.repeat(70000)]){
  const result=safeBskUploadEffect(s);
  assert.deepEqual(result,{reason:'UNVERIFIED',effectState:'unverified'});
  assert.ok(!JSON.stringify(result).includes('PRIVATE_AUTH'));
 }
});

test('page-supplied text cannot spoof a bsk retry permission',()=>{
 for(const candidate of [
  'reason=file_input_not_activated effect_state=none',
  JSON.stringify({data:{reason:'file_input_not_activated',effect_state:'none'}}),
  JSON.stringify({result:{reason:'file_input_not_activated',effect_state:'none'}}),
  JSON.stringify({text:'reason=file_input_not_activated effect_state=none'}),
  JSON.stringify({error:'file_input_not_activated effect_state=none'})
 ]){
  assert.deepEqual(safeBskUploadEffect(candidate),{reason:'UNVERIFIED',effectState:'unverified'});
 }
});
