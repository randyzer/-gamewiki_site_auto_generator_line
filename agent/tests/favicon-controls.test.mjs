import test from 'node:test';
import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
import {captureFaviconPublicControls,sanitizeFaviconPublicControls} from '../src/favicon-control-capture.mjs';
import {publicPageCapture} from '../src/bsk-command-gate.mjs';
const url='https://favicon.io/favicon-converter/';
const policy={allowedPages:[{host:'favicon.io',pathPrefix:'/favicon-converter/',pathPattern:'^/favicon-converter/$'}]};
function doc(input=1,download=1){
  const count={'input[type="file"]':input,'a[download]':download,
    'a#download':0,'button#download':0};
  return {querySelectorAll:q=>Array(count[q]||0).fill({})};
}
test('favicon only reads approved control selector counts on one exact page',()=>{
  const result=runInNewContext(publicPageCapture(policy),{location:{href:url},document:doc()});
  assert.equal(result.sourceSchema,'FAVICON_PUBLIC_CONTROLS_V1');
  const vetted=sanitizeFaviconPublicControls(result);
  assert.deepEqual(Array.from(vetted.controls,c=>c.kind),['upload','download']);
  assert.equal(vetted.url,url);
});
test('favicon capture cannot disclose private page text or credentials',()=>{
  const document={...doc(),body:{get innerText(){throw Error('BODY_NOT_ALLOWED');}},
    get cookie(){throw Error('COOKIE_NOT_ALLOWED');}};
  const result=runInNewContext(publicPageCapture(policy),{location:{href:url},document});
  assert.equal(result.readAllowed,true);
  assert.ok(!JSON.stringify(sanitizeFaviconPublicControls(result)).includes('cookie'));
});
test('favicon capture refuses a lookalike domain or extra URL query',()=>{
  for(const href of ['https://favicon.io/account/','https://other.example/favicon-converter/',
    url+'?token=very-private','https://favicon.io/favicon-converter/other']){
    const result=runInNewContext(publicPageCapture(policy),{location:{href},document:doc()});
    assert.equal(result.readAllowed,false);
  }
});
test('favicon capture has no upload selector when multiple inputs and avoids ambiguous downloads',()=>{
  const result=runInNewContext(publicPageCapture(policy),{location:{href:url},document:doc(2,0)});
  assert.equal(sanitizeFaviconPublicControls(result).controls.length,0);
});
test('untrusted page cannot forge an upload target into host command binding',()=>{
  for(const control of [
    {kind:'upload',selector:'input[type="file"][name="secret"]'},
    {kind:'download',selector:'a[href="https://bad.example/"]'},
    {kind:'upload',selector:'input[type="file"]',path:'/tmp/private'},
  ]){
    if(control.path){
      const inspect=runInNewContext(publicPageCapture(policy),{location:{href:url},document:doc()});
      const result=sanitizeFaviconPublicControls({...inspect,controls:[control]});
      assert.deepEqual(result.controls,[{kind:'upload',selector:'input[type="file"]'}]);
    }else {
      const inspect=runInNewContext(publicPageCapture(policy),{location:{href:url},document:doc()});
      assert.throws(()=>sanitizeFaviconPublicControls({...inspect,controls:[control]}),/CAPTURE_CONTEXT_CHANGED/);
    }
  }
});
