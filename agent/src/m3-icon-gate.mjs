import {readFile, open, mkdir, stat} from 'node:fs/promises';
import {constants} from 'node:fs';
import {join, dirname} from 'node:path';
import {AGENT_ROOT} from './skill-lock.mjs';
import {inside, readArtifact, safePath, sha256} from './files.mjs';
import {validateFaviconPng} from './favicon-png.mjs';
import {runProcess} from './process.mjs';

/**
 * Host-side M3 capability report. It does NOT ask the model to invent pixels.
 * CLI support for bsk upload/download is not a verified atomic transfer receipt.
 */
export async function iconStageReadiness({policyFile=join(AGENT_ROOT,'config/bsk-command-policy.json')}={}) {
  const policy=JSON.parse(await readFile(policyFile,'utf8'));
  const generationVerified=false; // No trusted image tool callback is connected to Codex worker.
  const transferVerified=false; // host's tool service still explicitly rejects upload/download
  const blockers=[];
  if(!generationVerified)blockers.push('IMAGE_GENERATION_CALLBACK_UNAVAILABLE');
  if(policy.atomicFileTransferSupported!==true || !transferVerified)
    blockers.push('FAVICON_ATOMIC_TRANSFER_NOT_VERIFIED');
  return {schemaVersion:1,status:blockers.length?'BLOCKED':'READY',
    originalSkillUnmodified:true,imageGenerationVerified:generationVerified,
    bskBinaryAvailable:typeof policy.executable==='string',
    faviconUploadDownloadAvailableInCLI:true,
    atomicFileTransferVerified:transferVerified,
    zipBinaryValidatorAvailable:true,
    blockers,requiresHumanVisualReview:true,
    stageMayPass:false,
    note:'Availability is not evidence of production icon generation or favicon.io conversion'};
}

/**
 * A locally supplied 512 RGBA master can be quarantined for HUMAN visual
 * review. Even a structurally valid PNG does NOT prove it came from an image
 * generator or that it is original artwork. Nothing is supplied to pipeline.
 */
export async function quarantineMasterCandidate({runId,sourcePath,root=AGENT_ROOT}={}) {
  if(!/^[A-Za-z0-9_-]{1,100}$/.test(runId??''))throw Error('M3_INVALID_RUN_ID');
  const runDirectory=join(root,'runs',runId),incoming=join(runDirectory,'incoming');
  if(!sourcePath||dirname(sourcePath)!==incoming||!inside(incoming,sourcePath))
    throw Error('M3_INPUT_PATH_OUTSIDE_INCOMING');
  const bytes=await readArtifact(sourcePath,[incoming]);
  validateFaviconPng(bytes);
  const digest=sha256(bytes);
  const destDir=join(runDirectory,'icon-review');
  await safePath(destDir,[runDirectory]);
  await mkdir(destDir,{recursive:true,mode:0o700});
  const destination=join(destDir,'candidate-'+digest+'.png');
  await safePath(destination,[destDir]);
  try {
    const file=await open(destination,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o400);
    try{await file.writeFile(bytes);}finally{await file.close();}
  } catch(error) {
    if(error.code!=='EEXIST')throw error;
    const other=await readArtifact(destination,[destDir]);
    if(sha256(other)!==digest)throw Error('M3_ICON_CANDIDATE_CONFLICT');
  }
  return {status:'PENDING_MANUAL_VISUAL_REVIEW',path:destination,sha256:digest,
    sourcePath,sourceToolVerified:false,originalityVerified:false,
    faviconIoConversionVerified:false,countsAsStageArtifact:false,
    stageMayPass:false};
}

export async function verifyCandidateFaviconZip({runId,zipPath,root=AGENT_ROOT,run=runProcess}={}) {
  if(!/^[A-Za-z0-9_-]{1,100}$/.test(runId??''))throw Error('M3_INVALID_RUN_ID');
  const incoming=join(root,'runs',runId,'incoming');
  if(!zipPath||dirname(zipPath)!==incoming||!inside(incoming,zipPath))
    throw Error('M3_ZIP_OUTSIDE_INCOMING');
  const bytes=await readArtifact(zipPath,[incoming]);
  await run('python3',[join(AGENT_ROOT,'scripts','verify-favicon-package.py'),zipPath],
    {cwd:incoming,timeoutMs:30000});
  return {status:'VALIDATED_BINARY_STRUCTURE',sha256:sha256(bytes),
    zipPath,claimedFaviconIoOriginVerified:false,
    requiresApprovedBrowserUploadDownload:true,
    countsAsStageArtifact:false,stageMayPass:false};
}
