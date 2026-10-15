import { syntheticOfficialSources, syntheticHomepageReadiness, syntheticHomepageMedia } from './helpers.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,readFile,rm,writeFile,chmod} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {AGENT_ROOT} from '../src/skill-lock.mjs';
import {createSkillExecutor} from '../src/skill-executor.mjs';
import {sha256} from '../src/files.mjs';

async function hostFixture(t) {
  const runId='m2-host-fixture-'+randomUUID();
  const runDirectory=join(AGENT_ROOT,'runs',runId);
  const outputDirectory=join(runDirectory,'artifacts','0','1');
  await mkdir(outputDirectory,{recursive:true});
  t.after(()=>rm(runDirectory,{recursive:true,force:true}));
  return {runId,runDirectory,outputDirectory,context:{
    runId,outputDirectory,inputs:{gameIdentity:'Bodycam',
      gameMetadata:{steamAppId:'2406770',steam:'https://store.steampowered.com/app/2406770/Bodycam/'},
      projectPath:join(AGENT_ROOT,'workspaces',runId,'site')},
    mode:'audit-only',requiredArtifacts:[],
    skillLock:{source:join(AGENT_ROOT,'config','workflow.json')},
    permissions:{siteWrites:false,uiChanges:false,productionDeployment:false}
  }};
}
test('without separate Mac launch consent no host browser actions or Codex worker occur',async t=>{
  const f=await hostFixture(t);let runs=0;
  const result=await createSkillExecutor({browserHumanDialog:true, inspectHomepageReadiness:syntheticHomepageReadiness,
    requestBrowserLaunch:async()=>false,
    collectBrowserEvidence:async()=>{runs++;throw Error('host collector should not run')},
    run:async()=>{runs++;throw Error('Codex should not run')}})
     ('game-homepage-icon-research',f.context);
  assert.equal(result.status,'BLOCKED');assert.match(result.evidence.join(' '),/BROWSER_LAUNCH_DENIED/);
  assert.equal(runs,0);
});
test('approved host public capture is passed as source evidence to SAME worker, not MCP access or stage completion',async t=>{
  const f=await hostFixture(t);let invoked,observed=0;
  const executor=createSkillExecutor({browserHumanDialog:true, inspectHomepageReadiness:syntheticHomepageReadiness,
    collectHomepageMediaEvidence:syntheticHomepageMedia,
    requestBrowserLaunch:async request=>{
      assert.equal(request.runId,f.runId);
      assert.equal(request.stage,'game-homepage-icon-research');
      assert.match(request.policySha256,/^[a-f0-9]{64}$/);
      return true;
    },
    collectHomepageSourceEvidence:syntheticOfficialSources,
   collectBrowserEvidence:async context=>{
      observed++;
      assert.equal(context.stage,'game-homepage-icon-research');
      const path=join(context.runDirectory,'HOST_APPROVED_STEAM_EVIDENCE_test.json');
      const bytes=JSON.stringify({sourceType:'HOST_APPROVED_TYPED_STEAM_PUBLIC_V1'});
      await writeFile(path,bytes,{mode:0o400});
      return {status:'EVIDENCE_READY',path,sha256:sha256(bytes)};
    },
    run:async(_command,args,options)=>{
      invoked={args,options};
      await writeFile(args[args.indexOf('--output-last-message')+1],
        JSON.stringify({status:'BLOCKED',summary:'Native outputs incomplete',
          evidence:['No image generation fixture'],missing_inputs:[],artifacts:[]}));
    }});
  const result=await executor('game-homepage-icon-research',f.context);
  assert.equal(result.status,'BLOCKED');assert.equal(observed,1);
  assert.ok(invoked.args.includes('--ignore-user-config'));
  assert.ok(!invoked.args.join(' ').includes('mcp_servers.scoped_game_bsk'));
  assert.ok(!invoked.options.env.GAME_SITE_BROWSER_HUMAN_DIALOG);
  assert.equal(invoked.options.env.FEISHU_APP_SECRET,undefined);
  assert.match(invoked.options.input,/trusted host already collected/);
  assert.match(invoked.options.input,/HOST_APPROVED_STEAM_EVIDENCE_test.json/);
});
test('host capture failure cannot dispatch Codex worker',async t=>{
  const f=await hostFixture(t);let count=0;
  const result=await createSkillExecutor({browserHumanDialog:true, inspectHomepageReadiness:syntheticHomepageReadiness,
    requestBrowserLaunch:async()=>true,
    collectBrowserEvidence:async()=>({status:'BLOCKED',code:'COMMAND_NOT_APPROVED'}),
    run:async()=>{count++;}})
    ('game-homepage-icon-research',f.context);
  assert.equal(result.status,'BLOCKED');
  assert.match(result.evidence.join(' '),/HOST_BROWSER_COMMAND_NOT_APPROVED/);
  assert.equal(count,0);
});

test('Steam success alone cannot launch a homepage worker without configured official source scope',async t=>{
  const f=await hostFixture(t);let calls=0;
  const result=await createSkillExecutor({browserHumanDialog:true,inspectHomepageReadiness:syntheticHomepageReadiness,requestBrowserLaunch:async()=>true,
    collectBrowserEvidence:async context=>{
      const path=join(context.runDirectory,'STEAM_only.json'),bytes='{"SYNTHETIC":true}';
      await writeFile(path,bytes,{mode:0o400});return{status:'EVIDENCE_READY',path,sha256:sha256(bytes)};
    },run:async()=>{calls++;}})('game-homepage-icon-research',f.context);
  assert.equal(result.status,'BLOCKED');assert.equal(calls,0);
  assert.ok(result.evidence.includes('HOST_OFFICIAL_SOURCE_OFFICIAL_SOURCE_TARGETS_NOT_CONFIGURED'));
});
test('human browser opt-in cannot authorize unsupported audit browser stages or UI source edits',async t=>{
  const f=await hostFixture(t);let calls=0;
  for(const stage of ['game-site-ui-ux-audit-optimizer','game-site-prelaunch-gate']){
    const result=await createSkillExecutor({browserHumanDialog:true,
      requestBrowserLaunch:async()=>{calls++;return true;},
      collectBrowserEvidence:async()=>{calls++;throw Error('not supported');},
      run:async()=>{calls++;throw Error('not supported');}})
    (stage,{...f.context,mode:'optimize'});
    assert.equal(result.status,'BLOCKED');
  }
  assert.equal(calls,0);
});

test('worker alteration of host-owned browser evidence is detected before stage validation',async t=>{
  const f=await hostFixture(t);let evidencePath;
  const executor=createSkillExecutor({browserHumanDialog:true,inspectHomepageReadiness:syntheticHomepageReadiness,
    collectHomepageMediaEvidence:syntheticHomepageMedia,requestBrowserLaunch:async()=>true,
    collectHomepageSourceEvidence:syntheticOfficialSources,
   collectBrowserEvidence:async context=>{
      evidencePath=join(context.runDirectory,'HOST_APPROVED_STEAM_EVIDENCE_fixture.json');
      const bytes='{"sourceType":"HOST_APPROVED_TYPED_STEAM_PUBLIC_V1"}';
      await writeFile(evidencePath,bytes,{mode:0o400});
      return {status:'EVIDENCE_READY',path:evidencePath,sha256:sha256(bytes)};
    },
    run:async(_cmd,args)=>{
      await chmod(evidencePath,0o600);await writeFile(evidencePath,'{"tampered":true}');
      await writeFile(args[args.indexOf('--output-last-message')+1],JSON.stringify({status:'BLOCKED',evidence:['fixture'],missing_inputs:[],artifacts:[]}));
    }
  });
  await assert.rejects(executor('game-homepage-icon-research',f.context),/HOST_BROWSER_EVIDENCE_TAMPERED/);
});

test('worker alteration of host media evidence rejects before native stage validation', async t => {
  const f = await hostFixture(t); let mediaPath;
  const executor = createSkillExecutor({ browserHumanDialog: true,
    inspectHomepageReadiness: syntheticHomepageReadiness, requestBrowserLaunch: async () => true,
    collectHomepageSourceEvidence: syntheticOfficialSources,
    collectHomepageMediaEvidence: async context => {
      const result = await syntheticHomepageMedia(context); mediaPath = result.path; return result;
    },
    collectBrowserEvidence: async context => {
      const path = join(context.runDirectory, 'HOST_STEAM_SYNTHETIC.json'), bytes = '{"SYNTHETIC":true}';
      await writeFile(path, bytes, { mode: 0o400 }); return { status: 'EVIDENCE_READY', path, sha256: sha256(bytes) };
    },
    run: async (_command, args, options) => {
      assert.ok(options.input.includes('homepageMediaEvidenceSha256'));
      assert.ok(options.input.includes('No playback, download, popularity'));
      await chmod(mediaPath, 0o600); await writeFile(mediaPath, '{"forged":true}');
      await writeFile(args[args.indexOf('--output-last-message') + 1], JSON.stringify({
        status: 'BLOCKED', evidence: ['SYNTHETIC'], missing_inputs: [], artifacts: [] }));
    }
  });
  await assert.rejects(executor('game-homepage-icon-research', f.context), /HOMEPAGE_MEDIA_EVIDENCE_INVALID/);
});
