import test from 'node:test';
import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
import {publicPageCapture} from '../src/bsk-command-gate.mjs';
import {sanitizeFaviconPublicControls} from '../src/favicon-control-capture.mjs';
const url='https://favicon.io/favicon-converter/';
const policy={allowedPages:[{host:'favicon.io',pathPrefix:'/favicon-converter/',pathPattern:'^/favicon-converter/$'}]};
function simulate(id, visible, labels=1) {
  const calls=[];
  const input={getAttribute:name=>name==='id'?id:null};
  const doc={
    querySelector:s=>s==='input[type="file"]'?input:null,
    querySelectorAll:s=>{
      calls.push(s);
      if(s==='input[type="file"]')return [input];
      if(s.startsWith('label[for='))return Array.from({length:labels},()=>({getClientRects:()=>visible?[{}]:[]}));
      if(s==='label:has(input[type="file"])')return [];
      return [];
    }
  };
  const out=runInNewContext(publicPageCapture(policy),{location:{href:url},document:doc});
  return {clean:sanitizeFaviconPublicControls(out),calls};
}
test('M3 accepts unique visible label associated with the only file input',()=>{
 const {clean,calls}=simulate('uploadIcon',true);
 assert.equal(clean.chooserTrigger.selector,'label[for="uploadIcon"]');
 assert.ok(calls.includes('label[for="uploadIcon"]'));
});
test('M3 blocks hidden, duplicated, untrusted-id file chooser labels',()=>{
 for(const [id,vis,count] of [['hidden',false,1],['duplicated',true,2],['x"] .secret',true,1]]){
  const {clean,calls}=simulate(id,vis,count);
  assert.equal(clean.chooserTrigger,null);
  if(id.includes('.secret'))assert.ok(calls.every(s=>!s.includes('.secret')));
 }
});
test('M3 host sanitizer rejects arbitrary chooser selector injection',()=>{
 const {clean}=simulate('uploadIcon',true);
 for(const selector of ['body','label[for="uploadIcon"] + input','label[for="x"] button','label[for="../"]'])
 assert.throws(()=>sanitizeFaviconPublicControls({...clean,chooserTrigger:{kind:'upload',selector}}),/CAPTURE_CONTEXT_CHANGED/);
});
