#!/usr/bin/env node
// M3 proof-only session; it does not alter the agent's production transfer policy.
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {runProcess} from '../src/process.mjs';
import {AGENT_ROOT} from '../src/skill-lock.mjs';
import {sha256} from '../src/files.mjs';
import {createBskToolService} from '../src/bsk-tool-server.mjs';
import {bskFileIdentity,runBskCommand} from '../src/bsk-capability.mjs';
import {askMacHumanApproval,askMacFaviconTestLaunch} from '../src/macos-human-approval.mjs';
import {checkLocalBrowserSkillFileAccess} from '../src/chrome-file-url-permission.mjs';

const mode=process.argv[2];
if(!['inspect','transfer','diagnose-input','diagnose-then-drop','drop-first'].includes(mode)||process.argv.length>3)
  throw Error('Usage: node scripts/m3-favicon-transfer-smoke.mjs inspect|transfer|diagnose-input|diagnose-then-drop|drop-first');
const runId='m3-favicon-'+mode+'-'+randomUUID();
const runDirectory=join(AGENT_ROOT,'runs',runId);
const nativeDirectory=join(runDirectory,'native');
await mkdir(nativeDirectory,{recursive:true,mode:0o700});
const basePolicyBytes=await readFile(join(AGENT_ROOT,'config/bsk-command-policy.json'));
const base=JSON.parse(basePolicyBytes.toString('utf8'));
if(base.atomicFileTransferSupported!==false)throw Error('PRODUCTION_TRANSFER_POLICY_CHANGED');
const policy={...base,atomicFileTransferSupported:mode==='transfer'||mode==='diagnose-input'||mode==='diagnose-then-drop'||mode==='drop-first'};
const testScopeSha=sha256(JSON.stringify({policy,mode,testOnly:true}));
const summary={runId,mode,provenance:'SYNTHETIC_TEST_PNG_NOT_GENERATED_ARTWORK',
  productionPolicyModified:false,workflowStagePassed:false,siteWrites:false,
  statuses:[],status:'BLOCKED',transferPermission:mode==='transfer'||mode==='diagnose-input'||mode==='diagnose-then-drop'||mode==='drop-first'};
const fixture=join(nativeDirectory,'fixture-created-only-for-test.zip');
const master=join(nativeDirectory,'m3-synthetic-transparent-512.png');
const downloaded=join(nativeDirectory,'m3-favicon-test-download.zip');
const origin='https://favicon.io/favicon-converter/';

async function call(service,intent,argv) {
  console.log('WAIT_FOR_MAC_APPROVAL',intent);
  const requestId='m3-'+intent+'-'+randomUUID();
  const response=await service.handle({jsonrpc:'2.0',id:1,method:'tools/call',
    params:{name:'bsk_command',arguments:{requestId,argv}}});
  let result;try{result=JSON.parse(response.result.content[0].text);}
  catch{result={status:'HOST_BROWSER_RESULT_UNAVAILABLE'};}
  summary.statuses.push({intent,status:result.status,requestId,
    ...(typeof result.reasonCode==='string'?{reasonCode:result.reasonCode}:{})});
  console.log('BROWSER_STEP',intent,result.status);
  return result;
}
let owned=false;
try{
  if(mode==='transfer'||mode==='diagnose-input'||mode==='diagnose-then-drop'||mode==='drop-first') {
    if(mode==='drop-first') {
      // Unique visible TEST image per run: NEVER repeat a previously unknown
      // upload using the identical bytes.
      await runProcess('python3',[join(AGENT_ROOT,'scripts/m3-visual-test-fixture.py'),
        master,'--nonce',runId],{cwd:nativeDirectory,timeoutMs:12000});
    } else {
      await runProcess('python3',[join(AGENT_ROOT,'tests/fixtures/favicon-binary-fixture.py'),fixture],{cwd:nativeDirectory,timeoutMs:12000});
      await runProcess('python3',['-c',
        'import zipfile,sys;z=zipfile.ZipFile(sys.argv[1]);open(sys.argv[2],"wb").write(z.read("android-chrome-512x512.png"))',
        fixture,master],{cwd:nativeDirectory,timeoutMs:12000});
    }
    summary.syntheticPngSha256=sha256(await readFile(master));
  }
  if(mode!=='inspect') {
    summary.fileUrlPermission=await checkLocalBrowserSkillFileAccess();
    if(summary.fileUrlPermission.status!=='ENABLED')
      throw Error('M3_CHROME_EXTENSION_FILE_URL_ACCESS_REQUIRED');
  }
  if(!await askMacFaviconTestLaunch({runId,policySha256:testScopeSha}))
    throw Error('M3_TEST_LAUNCH_DENIED');
  const context={runId,stage:'game-homepage-icon-research',runDirectory,nativeDirectory,
    inputs:{gameIdentity:'Bodycam',gameMetadata:{steamAppId:'2406770',
      steam:'https://store.steampowered.com/app/2406770/Bodycam/'}}};
  const identity=await bskFileIdentity(policy);
  // The default tool-service guard is deliberately disabled for this isolated
  // trusted-host smoke only, and only alongside the synthetic local PNG.
  const service=createBskToolService({context,policy,identity,
    approve:askMacHumanApproval,execute:runBskCommand,
    allowFaviconTransfer:mode!=='inspect',
    allowInitialFaviconDrop:mode==='drop-first',
    initialDropSourcePath:mode==='drop-first'?master:null});
  try{
    const started=await call(service,'session-start',['session','start']);
    if(started.status!=='COMPLETED')throw Error('M3_SESSION_START_BLOCKED');
    owned=true;
    const tabs=await call(service,'owned-tabs',['tab','list']);
    if(tabs.status!=='COMPLETED')throw Error('M3_TABS_BLOCKED');
    const visited=await call(service,'navigate-favicon',['navigate',origin]);
    if(visited.status!=='COMPLETED')throw Error('M3_NAVIGATION_BLOCKED');
    const observed=await call(service,'inspect-controls',['observe']);
    if(observed.status!=='COMPLETED')throw Error('M3_CONTROL_INSPECTION_BLOCKED');
    const controlData=JSON.parse(observed.stdout).value;
    summary.controls=controlData.controls;
    summary.chooserTrigger=controlData.chooserTrigger??null;
    summary.inspection=controlData.inspection??null;
    summary.dropTarget=controlData.dropTarget??null;
    console.log('VERIFIED_PUBLIC_CONTROLS',JSON.stringify(controlData.controls));
    if(mode==='transfer'||mode==='diagnose-input'||mode==='diagnose-then-drop'||mode==='drop-first'){
      // Do NOT click a possibly hidden input[type=file].
      // bsk's input mode needs a visible file-chooser trigger.
      const upload=mode==='drop-first' ? controlData.dropTarget :
        (mode==='diagnose-input'||mode==='diagnose-then-drop')
        ?controlData.controls.find(x=>x.kind==='upload' && x.selector==='input[type="file"]')
        :controlData.chooserTrigger;
      if(mode==='drop-first') {
        if(upload?.selector!=='[class*="dropzone"]' ||
          controlData.inspection?.fileInputMatches!==1 ||
          controlData.inspection?.fileInputDisabled!==false ||
          controlData.inspection?.dropzoneClassCount!==1 ||
          controlData.inspection?.dropzoneRendered!==true ||
          controlData.inspection?.dropzoneContainsInput!==true)
          throw Error('M3_DROP_FIRST_TARGET_NOT_VERIFIED');
      } else if(mode==='diagnose-input'||mode==='diagnose-then-drop') {
        if(!upload||controlData.inspection?.fileInputMatches!==1||
          controlData.inspection?.fileInputRendered!==true||
          controlData.inspection?.fileInputDisabled!==false)
          throw Error('M3_DIAGNOSTIC_INPUT_UNVERIFIED');
      } else if(!upload)throw Error('M3_CLICKABLE_UPLOAD_TRIGGER_NOT_VERIFIED');
      const uploaded=await call(service,'upload-synthetic-test',['upload',upload.selector,'--file',master]);
      summary.uploadDiagnostic={
        status:uploaded.status,reason:uploaded.bskReason??'UNVERIFIED',
        effectState:uploaded.effectState??'unverified',
        cliExitCode:Number.isInteger(uploaded.cliExitCode)?uploaded.cliExitCode:null
      };
      if(uploaded.status!=='COMPLETED') {
        if(mode!=='diagnose-then-drop' ||
          uploaded.bskReason!=='file_input_not_activated' ||
          uploaded.effectState!=='none' ||
          controlData.dropTarget?.selector!=='[class*="dropzone"]') {
          // Strictly one initial input upload; unknown/committed/unverified
          // effects must NEVER trigger automatic retries or mode-switches.
          throw Error('M3_UPLOAD_NOT_COMPLETED');
        }
        // The trusted host will independently enforce same PNG, session/tab,
        // URL, 60s deadline and a one-shot bsk-verified drop permission.
        console.log('VERIFIED_NONE_EFFECT_ONE_TIME_DROP_CANDIDATE');
        const dropped=await call(service,'upload-drop-once',
          ['upload',controlData.dropTarget.selector,'--file',master]);
        summary.dropDiagnostic={
          status:dropped.status,reason:dropped.bskReason??'UNVERIFIED',
          effectState:dropped.effectState??'unverified'
        };
        if(dropped.status!=='COMPLETED')throw Error('M3_DROP_UPLOAD_NOT_COMPLETED');
      }
      const observedAfter=await call(service,'inspect-download',['observe']);
      if(observedAfter.status!=='COMPLETED')throw Error('M3_DOWNLOAD_CONTROL_INSPECTION_BLOCKED');
      const download=JSON.parse(observedAfter.stdout).value.controls.find(x=>x.kind==='download');
      if(!download)throw Error('M3_DOWNLOAD_CONTROL_NOT_IDENTIFIED');
      const received=await call(service,'download-test-zip',['download',download.selector,'--out',downloaded]);
      if(received.status!=='COMPLETED')throw Error('M3_DOWNLOAD_NOT_COMPLETED');
      await runProcess('python3',[join(AGENT_ROOT,'scripts/verify-favicon-package.py'),downloaded],
        {cwd:nativeDirectory,timeoutMs:30000});
      await runProcess('python3',[join(AGENT_ROOT,'scripts/m3-compare-favicon-pixels.py'),master,downloaded],
        {cwd:nativeDirectory,timeoutMs:30000});
      summary.downloadSha256=sha256(await readFile(downloaded));
      summary.downloadBinaryValidated=true;
      summary.downloadPixelsMatchSource=true;
    }
    summary.status=mode==='inspect'?'CONTROLS_INSPECTED':'TRANSFER_BINARY_VALIDATED';
  } finally {
    if(owned){
      try {
        const closed=await call(service,'close',['session','stop']);
        summary.ownedWindowClosed=closed.status==='COMPLETED';
      } catch {summary.ownedWindowClosed=false;}
      if(summary.ownedWindowClosed!==true)summary.status='BLOCKED';
    }
  }
}catch(error){
  summary.status='BLOCKED';
  summary.blocker=/^M3_[A-Z0-9_]+$/.test(error.message)?error.message:'M3_HOST_OPERATION_UNAVAILABLE';
}finally {
  await writeFile(join(runDirectory,'SMOKE_RESULT.json'),JSON.stringify(summary,null,2)+'\n',
    {flag:'wx',mode:0o600});
  console.log('M3_SMOKE_RESULT',JSON.stringify(summary));
}
if(summary.status==='BLOCKED')process.exitCode=2;
