// Trusted Agent host gate for conversion-only local favicon ZIPs.
// Never treats the converter receipt as evidence that an image-generation tool ran.
import {join} from 'node:path';
import {readArtifact,sha256,safePath} from './files.mjs';
import {validateFaviconPng} from './favicon-png.mjs';
import {runProcess} from './process.mjs';
import {AGENT_ROOT} from './skill-lock.mjs';

const RUN_ID=/^[A-Za-z0-9_-]{1,100}$/;
const SHA=/^[a-f0-9]{64}$/;
const ROOT=join(AGENT_ROOT,'runs');

export async function inspectHomepageLocalConversion({
  runDirectory,runId,gameIdentity,run=runProcess
}={}){
 if(!RUN_ID.test(runId??'')||!gameIdentity||typeof gameIdentity!=='string'||
    runDirectory!==join(ROOT,runId))throw Error('M3_BAD_RUN_IDENTITY');
 const area=join(runDirectory,'m3-local-favicon');
 const requestPath=join(area,'REQUEST.json');
 const approvalPath=join(area,'USER_APPROVAL.json');
 const inputPath=join(area,'input/master-512.png');
 const outputPath=join(area,'output/favicon.zip');
 const receiptPath=join(area,'CONVERSION_RECEIPT.json');
 const engineReceiptPath=join(area,'ENGINE_RECEIPT.json');
 let requestBytes;
 try{requestBytes=await readArtifact(requestPath,[runDirectory]);}
 catch(e){if(e.code==='ENOENT')return {status:'NOT_ENABLED',stageMayPass:false};throw e;}
 let request;
 try{request=JSON.parse(requestBytes);}catch{throw Error('M3_LOCAL_REQUEST_INVALID');}
 if(request.schemaVersion!==1||request.mode!=='LOCAL_FAVICON_CONVERSION_V1'||
    request.runId!==runId||request.gameIdentity!==gameIdentity||
    request.inputPath!==inputPath||request.outputPath!==outputPath||
    request.stageMayPass!==false||request.siteOriginIndependentlyVerified!==false)
   throw Error('M3_LOCAL_REQUEST_IDENTITY_MISMATCH');
 let source;
 try{source=await readArtifact(inputPath,[runDirectory]);validateFaviconPng(source);}
 catch(e){
   if(e.code==='ENOENT')return {status:'WAITING_FOR_USER',code:'M3_LOCAL_MASTER_PNG_REQUIRED',
     stageMayPass:false,inputPath};
   return {status:'BLOCKED',code:'M3_LOCAL_SOURCE_INVALID',stageMayPass:false};
 }
 const sourceSha256=sha256(source);
 let approvalBytes;
 try{approvalBytes=await readArtifact(approvalPath,[runDirectory]);}
 catch(e){
  if(e.code==='ENOENT')return {status:'WAITING_FOR_USER',code:'M3_LOCAL_EXPLICIT_APPROVAL_REQUIRED',
   stageMayPass:false,inputPath,sourceSha256};
  throw e;
 }
 let approval;
 try{approval=JSON.parse(approvalBytes);}catch{throw Error('M3_LOCAL_APPROVAL_INVALID');}
 if(approval.schemaVersion!==1||approval.runId!==runId||
    approval.gameIdentity!==gameIdentity||
    approval.requestSha256!==sha256(requestBytes)||
    approval.sourceSha256!==sourceSha256||
    approval.visualReviewApproved!==true||
    approval.originalArtworkRightsApproved!==true||
    approval.artworkSourceStatement!=='USER_ATTESTED_ORIGINAL_GENERATED_ARTWORK'||
    approval.sourceClaim!=='USER_SUPPLIED_VISUALLY_REVIEWED'||
    approval.siteOriginIndependentlyVerified!==false||
    approval.imageGenerationIndependentlyVerified!==false||
    approval.stageMayPass!==false)
   return {status:'BLOCKED',code:'M3_LOCAL_APPROVAL_INVALID_OR_STALE',
     stageMayPass:false};
 let zip,receipt,engine,receiptBytes,engineBytes;
 try{
   zip=await readArtifact(outputPath,[runDirectory]);
   receiptBytes=await readArtifact(receiptPath,[runDirectory]);
   engineBytes=await readArtifact(engineReceiptPath,[runDirectory]);
   receipt=JSON.parse(receiptBytes);
   engine=JSON.parse(engineBytes);
 }catch(e){
   if(e.code==='ENOENT')return {status:'WAITING_FOR_USER',code:'M3_LOCAL_CONVERSION_NOT_COMPLETED',
     stageMayPass:false,sourceSha256,outputPath};
   return {status:'BLOCKED',code:'M3_LOCAL_RECEIPT_UNAVAILABLE',stageMayPass:false};
 }
 const zipSha256=sha256(zip),approvalSha256=sha256(approvalBytes);
 if(!SHA.test(zipSha256)||receipt.schemaVersion!==1||
    receipt.runId!==runId||receipt.gameIdentity!==gameIdentity||
    receipt.status!=='LOCAL_FAVICON_BINARY_VALIDATED'||
    receipt.origin!=='LOCAL_FAVICON_CONVERSION_V1'||
    receipt.sourceSha256!==sourceSha256||
    receipt.zipSha256!==zipSha256||
    receipt.approvalSha256!==approvalSha256||
    receipt.pillowVersion!=='12.3.0'||
    receipt.zipStructureValidated!==true||
    receipt.sourcePixelsMatched!==true||
    receipt.faviconIoUsed!==false||
    receipt.bskTransferUsed!==false||
    receipt.siteOriginIndependentlyVerified!==false||
    receipt.artworkOriginalitySource!=='USER_ATTESTED_ORIGINAL_GENERATED_ARTWORK'||
    receipt.imageGenerationIndependentlyVerified!==false||
    receipt.stageMayPass!==false||
    engine.schemaVersion!==1||engine.runId!==runId||
    engine.gameIdentity!==gameIdentity||engine.origin!=='LOCAL_FAVICON_CONVERSION_V1'||
    engine.status!=='LOCAL_FAVICON_BINARY_CREATED_ORIGIN_USER_ATTESTED'||
    engine.zipSha256!==zipSha256||
    engine.sourceSha256!==sourceSha256||
    engine.approvalSha256!==approvalSha256||
    engine.artworkOriginalitySource!==receipt.artworkOriginalitySource||
    engine.pillowVersion!==receipt.pillowVersion)
   return {status:'BLOCKED',code:'M3_LOCAL_RECEIPT_PROVENANCE_INVALID',
     stageMayPass:false};
 try {
   await run('python3',[join(AGENT_ROOT,'scripts','verify-favicon-package.py'),outputPath],
    {cwd:area,timeoutMs:30000});
   await run('python3',[join(AGENT_ROOT,'scripts','m3-compare-favicon-pixels.py'),
    inputPath,outputPath],{cwd:area,timeoutMs:30000});
 }catch{return {status:'BLOCKED',code:'M3_LOCAL_ZIP_BINARY_OR_PIXEL_INVALID',
   stageMayPass:false};}
 return {status:'READY_FOR_HOMEPAGE_SKILL',
   conversionMode:'local',sourceClaim:'USER_ATTESTED_ORIGINAL_GENERATED_ARTWORK',
   sourceSha256,zipSha256,zipPath:outputPath,masterPath:inputPath,
   requestPath,requestSha256:sha256(requestBytes),approvalPath,approvalSha256,
   receiptPath,receiptSha256:sha256(receiptBytes),engineReceiptPath,
   engineReceiptSha256:sha256(engineBytes),gameIdentity,runId,
   siteOriginIndependentlyVerified:false,imageGenerationIndependentlyVerified:false,
   automaticBrowserTransferVerified:false,stageMayPass:false};
}
