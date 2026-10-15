#!/usr/bin/env node
// Manual visible favicon.io workflow. NO browser automation and NO origin claims.
import {mkdir,writeFile,readFile,lstat} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {AGENT_ROOT} from '../src/skill-lock.mjs';
import {safePath,sha256} from '../src/files.mjs';
import {validateFaviconPng} from '../src/favicon-png.mjs';
import {runProcess} from '../src/process.mjs';

const origin='https://favicon.io/favicon-converter/';
const [op,runId,...extra]=process.argv.slice(2);
const validId=value=>/^m3-manual-favicon-[a-f0-9-]{36}$/.test(value??'');
const root=join(AGENT_ROOT,'runs');
async function doPrepare(){
  const id='m3-manual-favicon-'+randomUUID();
  const dir=join(root,id),sourceDir=join(dir,'input'),outputDir=join(dir,'output');
  await mkdir(sourceDir,{recursive:true,mode:0o700});
  await mkdir(outputDir,{recursive:true,mode:0o700});
  const source=join(sourceDir,'M3-TEST-ONLY-512.png');
  await runProcess('python3',[join(AGENT_ROOT,'scripts','m3-visual-test-fixture.py'),source],
    {cwd:dir,timeoutMs:15000});
  const bytes=await readFile(source);
  validateFaviconPng(bytes);
  const manifest={
    schemaVersion:1,runId:id,purpose:'SYNTHETIC_TEST_ONLY_NOT_BRAND_ARTWORK',
    site:origin,source,sourceSha256:sha256(bytes),sourceBytes:bytes.length,
    expectedDownload:join(outputDir,'favicon.zip'),
    state:'AWAITING_MANUAL_SITE_UPLOAD_AND_DOWNLOAD',
    browserSkillUploadUsed:false,productionTransferEnabled:false,
    siteOriginAttested:false,stageMayPass:false
  };
  await writeFile(join(dir,'MANUAL_HANDOFF.json'),JSON.stringify(manifest,null,2)+'\n',
    {flag:'wx',mode:0o600});
  await writeFile(join(dir,'INSTRUCTIONS.txt'),[
    'M3 favicon.io MANUAL SITE CHECK - SYNTHETIC TEST ONLY',
    '',
    '1. In the Chrome window opened for you, use the upload control on '+origin,
    '2. In the file picker select: '+source,
    '3. Confirm the visible TEST image is processed by the website.',
    '4. Click the website ZIP download; do not use bsk for upload or download.',
    '5. Move/copy the ZIP into this exact output file: '+manifest.expectedDownload,
    '   If the site downloads a different named ZIP, rename it to favicon.zip.',
    '6. Reply in ChatGPT when ready. The verifier ONLY checks this fixed output path.',
    '',
    'No site origin or real game brand proof is implied by passing the ZIP validator.',
    'Do not put private files or credentials into this test.'
  ].join('\n')+'\n',{flag:'wx',mode:0o600});
  console.log(JSON.stringify({status:manifest.state,runId:id,site:origin,
    inputFile:source,outputFile:manifest.expectedDownload,sourceSha256:manifest.sourceSha256,
    instructions:join(dir,'INSTRUCTIONS.txt')},null,2));
}
async function doVerify(id){
  if(!validId(id))throw Error('M3_INVALID_MANUAL_RUN_ID');
  const dir=join(root,id),manifestPath=join(dir,'MANUAL_HANDOFF.json');
  await safePath(manifestPath,[root]);
  const manifest=JSON.parse(await readFile(manifestPath,'utf8'));
  if(manifest.runId!==id||manifest.purpose!=='SYNTHETIC_TEST_ONLY_NOT_BRAND_ARTWORK')
    throw Error('M3_INVALID_MANUAL_PROVENANCE');
  const source=join(dir,'input','M3-TEST-ONLY-512.png');
  const downloaded=join(dir,'output','favicon.zip');
  if(manifest.source!==source||manifest.expectedDownload!==downloaded)
    throw Error('M3_MANUAL_PATH_MISMATCH');
  await safePath(source,[dir]);await safePath(downloaded,[dir]);
  const input=await readFile(source);
  validateFaviconPng(input);
  if(sha256(input)!==manifest.sourceSha256)
    throw Error('M3_MANUAL_INPUT_FILE_CHANGED');
  let bytes;
  try{
    const stat=await lstat(downloaded);
    if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||stat.size<1||stat.size>16*1024*1024)
      throw Error('M3_DOWNLOAD_INVALID_FILE');
    bytes=await readFile(downloaded);
  }catch(error){
    if(error?.code==='ENOENT')throw Error('M3_AWAITING_MANUAL_DOWNLOADED_ZIP');
    throw error;
  }
  let structure,status='REJECTED_BINARY_STRUCTURE';
  try{
    const result=await runProcess('python3',[join(AGENT_ROOT,'scripts','verify-favicon-package.py'),downloaded],
      {cwd:dir,timeoutMs:30000});
    if(result.exitCode!==0)throw Error('M3_ZIP_INVALID');
    structure={status:'VALIDATED_BINARY_STRUCTURE',provenanceVerified:false};
    status='BINARY_VALIDATED_SITE_ORIGIN_UNVERIFIED';
  }catch{structure={status:'REJECTED'};}
  const output={runId:id,status,sourceSha256:manifest.sourceSha256,
    downloadSha256:sha256(bytes),downloadBytes:bytes.length,
    zipBinaryStructureValidated:status==='BINARY_VALIDATED_SITE_ORIGIN_UNVERIFIED',
    siteOriginVerified:false,manualSiteActionAttested:false,stageMayPass:false,
    source:'USER_PLACED_ZIP_AT_EXACT_RUN_PATH',verification:structure};
  const report=join(dir,'VERIFICATION-'+randomUUID()+'.json');
  await writeFile(report,JSON.stringify(output,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log(JSON.stringify({...output,reportPath:report},null,2));
  if(!output.zipBinaryStructureValidated)process.exitCode=2;
}
try{
  if(extra.length)throw Error('M3_EXTRA_ARGUMENTS');
  if(op==='prepare'&&!runId)await doPrepare();
  else if(op==='verify'&&runId)await doVerify(runId);
  else throw Error('M3_USAGE: prepare | verify RUN_ID');
}catch(error){
  console.error(/^M3_[A-Z0-9_]+$/.test(error.message)?error.message:'M3_MANUAL_WORKFLOW_UNAVAILABLE');
  process.exitCode=2;
}
