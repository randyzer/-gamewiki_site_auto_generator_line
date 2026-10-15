import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectBrowserSkillFileAccess,checkLocalBrowserSkillFileAccess}
  from '../src/chrome-file-url-permission.mjs';

function fixture(fileAccess, count=1) {
  const settings={};
  for(let n=0;n<count;n++)settings['ext'+n]={
    manifest:{name:'BrowserSkill',version:'0.3.2'},
    ...(fileAccess===undefined?{}:{newAllowFileAccess:fileAccess}),
    // Real profiles contain unrelated sensitive extension settings.
    unrelatedPrivatePreference:'SECRET_DO_NOT_EXPOSE'
  };
  settings.other={manifest:{name:'Other Extension'},
    newAllowFileAccess:true,secret:'PRIVATE_OTHER_EXTENSION'};
  return {extensions:{settings}};
}
test('Chrome file-url permission must explicitly be true',()=>{
  assert.equal(inspectBrowserSkillFileAccess(fixture(true)).status,'ENABLED');
  assert.equal(inspectBrowserSkillFileAccess(fixture(false)).status,'DISABLED');
  assert.equal(inspectBrowserSkillFileAccess(fixture(undefined)).status,'DISABLED');
  assert.equal(inspectBrowserSkillFileAccess(fixture('true')).status,'UNVERIFIED');
});
test('missing, duplicated or malformed extension identity never enables upload',()=>{
  assert.notEqual(inspectBrowserSkillFileAccess(fixture(true,0)).status,'ENABLED');
  assert.notEqual(inspectBrowserSkillFileAccess(fixture(true,2)).status,'ENABLED');
  assert.notEqual(inspectBrowserSkillFileAccess({extensions:{settings:[]}}).status,'ENABLED');
  assert.notEqual(inspectBrowserSkillFileAccess({}).status,'ENABLED');
});
test('Chrome preflight reports no secret values or extension IDs',()=>{
  for(const value of [true,false,undefined]){
    const report=inspectBrowserSkillFileAccess(fixture(value));
    assert.ok(!JSON.stringify(report).includes('SECRET'));
    assert.ok(!JSON.stringify(report).includes('PRIVATE'));
    assert.equal(report.extensionVersion,'0.3.2');
  }
});
test('Chrome host preflight never claims enabled when preference file cannot be read',async()=>{
  const result=await checkLocalBrowserSkillFileAccess({preferencesPath:'/never-exists/browser/secure-pref.json'});
  assert.notEqual(result.status,'ENABLED');
});
