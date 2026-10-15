import test from 'node:test';
import assert from 'node:assert/strict';
import {askMacHumanApproval} from '../src/macos-human-approval.mjs';

const base={intent:'read-status',target:null,runId:'smoke-001',
  stage:'game-homepage-icon-research',digest:'a'.repeat(64)};
test('Mac human approval generates a scoped one-time receipt ONLY after explicit GUI acceptance', async()=>{
  if(process.platform!=='darwin')return;
  let prompt;
  const at=1730000000000;
  const receipt=await askMacHumanApproval(base,{dialog:async message=>{
    prompt=message;return{stdout:'APPROVED\n'};
  },now:()=>at});
  assert.match(prompt,/read-status/);assert.match(prompt,/DENY/);
  assert.match(prompt,/'?smoke-001'?/);
  assert.equal(receipt.type,'bsk-command-approval');
  assert.equal(receipt.runId,base.runId);
  assert.equal(receipt.stage,base.stage);
  assert.equal(receipt.commandDigest,base.digest);
  assert.equal(receipt.approvedAt,at);
  assert.equal(receipt.expiresAt,at+30000);
  assert.match(receipt.executionId,/^[a-f0-9-]{36}$/);
});
test('reject, timeout, forged approval text and bad command never produce receipts', async()=>{
  if(process.platform!=='darwin')return;
  for(const stdout of ['DENIED\n','APPROVED EXTRA\n','DENIED APPROVED\n','\n','GAVE_UP']){
    assert.equal(await askMacHumanApproval(base,{dialog:async()=>({stdout})}),null);
  }
  assert.equal(await askMacHumanApproval(base,{dialog:async()=>{throw Error('timeout');}}),null);
  assert.equal(await askMacHumanApproval({...base,intent:'delete-browser-window'},{dialog:async()=>({stdout:'APPROVED'})}),null);
  assert.equal(await askMacHumanApproval({...base,digest:'bad'},{dialog:async()=>({stdout:'APPROVED'})}),null);
});
test('a receipt cannot be reused across different command digests',async()=>{
  if(process.platform!=='darwin')return;
  const approve=async()=>({stdout:'APPROVED'});
  const a=await askMacHumanApproval(base,{dialog:approve});
  const b=await askMacHumanApproval({...base,digest:'b'.repeat(64)},{dialog:approve});
  assert.notEqual(a.commandDigest,b.commandDigest);
  assert.notEqual(a.executionId,b.executionId);
});
