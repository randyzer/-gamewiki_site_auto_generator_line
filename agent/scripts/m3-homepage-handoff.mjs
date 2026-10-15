#!/usr/bin/env node
// Scoped to an existing pipeline run. Never operates on arbitrary directories.
import {readFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {AGENT_ROOT} from '../src/skill-lock.mjs';
import {safePath,readArtifact} from '../src/files.mjs';
import {STAGE} from '../src/stages.mjs';
import {beginHomepageManualHandoff,inspectHomepageManualHandoff,
  approveHomepageManualHandoff} from '../src/m3-homepage-manual-handoff.mjs';

const [operation,runId,...extra]=process.argv.slice(2);
try{
 if(!/^[A-Za-z0-9_-]{1,100}$/.test(runId??''))
  throw Error('M3_INVALID_RUN_ID');
 const runDirectory=join(AGENT_ROOT,'runs',runId);
 const manifestPath=join(runDirectory,'manifest.json');
 await safePath(manifestPath,[runDirectory]);
 const manifest=JSON.parse(await readArtifact(manifestPath,[runDirectory]));
 if(manifest.runId!==runId||resolve(manifest.workspace??'/INVALID')!==resolve(AGENT_ROOT)||
   manifest.stages?.[0]?.skill!==STAGE.HOMEPAGE_RESEARCH||
   manifest.stages[0].status==='PASSED'||
   typeof manifest.inputs?.gameIdentity!=='string'||
   !manifest.inputs.gameIdentity)
   throw Error('M3_MANUAL_RUN_NOT_ELIGIBLE');
 const opts={runDirectory,runId,gameIdentity:manifest.inputs.gameIdentity};
 let result;
 if(operation==='begin'&&extra.length===0){
  result=await beginHomepageManualHandoff(opts);
 }else if(operation==='inspect'&&extra.length===0){
  result=await inspectHomepageManualHandoff(opts);
 }else if(operation==='approve'&&extra.length===2){
  result=await approveHomepageManualHandoff({...opts,
    masterSha256:extra[0],zipSha256:extra[1]});
 }else throw Error('M3_USAGE_BEGIN_INSPECT_APPROVE_WITH_DIGESTS');
 console.log(JSON.stringify(result,null,2));
 if(['BLOCKED','WAITING_FOR_USER','NOT_ENABLED','AWAITING_MANUAL_FILES'].includes(result.status))
  process.exitCode=2;
}catch(error){
 const msg=error.message;
 console.error(/^M3_[A-Z0-9_]+$/.test(msg)?msg:'M3_MANUAL_HANDOFF_UNAVAILABLE');
 process.exitCode=2;
}
