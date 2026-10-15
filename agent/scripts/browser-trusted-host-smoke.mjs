import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {AGENT_ROOT} from '../src/skill-lock.mjs';
import {sha256} from '../src/files.mjs';
import {askMacBrowserLaunch} from '../src/macos-human-approval.mjs';
import {collectTrustedSteamEvidence} from '../src/trusted-browser-host.mjs';

const runId='m2-trusted-host-smoke-'+randomUUID();
const runDirectory=join(AGENT_ROOT,'runs',runId);
const nativeDirectory=join(runDirectory,'native');
await mkdir(nativeDirectory,{recursive:true,mode:0o700});
const url='https://store.steampowered.com/app/2406770/Bodycam/';
const context={runId,runDirectory,nativeDirectory,stage:'game-homepage-icon-research',
  inputs:{gameIdentity:'Bodycam',gameMetadata:{steamAppId:'2406770',steam:url}}};
const policyBytes=await readFile(join(AGENT_ROOT,'config','bsk-command-policy.json'));
console.log('HOST_LAUNCH_APPROVAL_PENDING',runId);
let result;
const launch=await askMacBrowserLaunch({runId,stage:context.stage,policySha256:sha256(policyBytes)});
if(!launch)result={status:'BLOCKED',code:'BROWSER_LAUNCH_DENIED'};
else result=await collectTrustedSteamEvidence(context);
const summary={runId,status:result.status,code:result.code||null,
  evidencePath:result.path||null,steps:result.steps||[],
  ownedWindowClosed:result.ownedWindowClosed===true,
  countsAsStageArtifact:false,realSkillExecution:false,deploymentExecuted:false,
  note:'One public Steam typed-evidence test; no image, icon ZIP, or complete homepage research'};
await writeFile(join(runDirectory,'SMOKE_RESULT.json'),JSON.stringify(summary,null,2)+'\n',{mode:0o600,flag:'wx'});
console.log('TRUSTED_HOST_SMOKE_COMPLETE',JSON.stringify(summary));
if(summary.status!=='EVIDENCE_READY')process.exitCode=2;
