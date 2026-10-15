#!/usr/bin/env node
import {iconStageReadiness,quarantineMasterCandidate,verifyCandidateFaviconZip} from '../src/m3-icon-gate.mjs';

const [op,runId,path,...extra]=process.argv.slice(2);
try {
  if(extra.length)throw Error('M3_EXTRA_ARGUMENTS');
  let result;
  if(op==='status'&&!runId&&!path)result=await iconStageReadiness();
  else if(op==='inspect-master'&&runId&&path)result=await quarantineMasterCandidate({runId,sourcePath:path});
  else if(op==='inspect-zip'&&runId&&path)result=await verifyCandidateFaviconZip({runId,zipPath:path});
  else throw Error('M3_USAGE: status | inspect-master RUN_ID ABSOLUTE_PNG | inspect-zip RUN_ID ABSOLUTE_ZIP');
  console.log(JSON.stringify(result,null,2));
  if(result.status==='BLOCKED')process.exitCode=2;
} catch(error) {
  const code=typeof error?.message==='string'&&(/^M3_|^PNG |^Expected |^Path outside|^Linked path/.test(error.message))
    ?error.message.slice(0,160):'M3_INPUT_OR_FILE_UNAVAILABLE';
  console.error(code);process.exitCode=2;
}
