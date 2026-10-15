import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sha256 } from '../src/files.mjs';
import { randomUUID } from 'node:crypto';
import { STAGES, ARTIFACTS } from '../src/pipeline.mjs';

// Legacy orchestration tests explicitly substitute a host. This is not an issuer
// and does not test approval security; entry-approval.test.mjs owns that coverage.
export async function offlineApprovalConsumer(_task, configuration) {
  if (!configuration.workspace.includes('/.agent-test-')) throw Error('TEST fixture workspace required');
  return true;
}

export async function fixture(t) {
  const root = await mkdtemp(fileURLToPath(new URL('../.agent-test-', import.meta.url)));
  t.after(() => rm(root, { recursive: true, force: true }));
  const workspace = join(root, 'workspace'), source = join(root, 'skills'), template = join(root, 'templates');
  await Promise.all([workspace, source, template].map(p => mkdir(p)));
  const skills = [];
  for (const name of STAGES) {
    const file = join(source, name + '.md'); await writeFile(file, name);
    skills.push({ name, source: file, sha256: sha256(name), available: true });
  }
  const inventoryPath = join(root, 'inventory.json');
  await writeFile(inventoryPath, JSON.stringify({ skillRoot: source, skills }));
  const rawKeywordsFile = join(root, 'keywords.md'); await writeFile(rawKeywordsFile, '# Offline fixture\n- Fixture guide');
  return { root, configuration: { workspace, inventoryPath, templateRoots: [template] },
    inputs: { gameIdentity: 'Offline Fixture', objective: 'Isolated offline integration test', rawKeywordsFile,
      canonicalRequired: false, siteRevision: 'fixture-v1', domain: 'fixture.test', repo: 'fixture/repo', branch: 'main',
      dns: { provider: 'offline fixture', recordsReviewed: true }, deploymentPlanAuthorized: true } };
}

export async function goodResult(skill, context) {
  const index = STAGES.indexOf(skill);
  if (context.permissions.siteWrites) {
    await mkdir(context.inputs.projectPath, { recursive: true });
    await writeFile(join(context.inputs.projectPath, 'index.html'), '<h1>Offline fixture only</h1>');
  }
  return { status: 'PASSED', missing_inputs: [], evidence: ['OFFLINE TEST FIXTURE, not a real skill execution'],
    artifacts: context.requiredArtifacts.map(kind => ({ kind, path: join(context.outputDirectory, kind),
      runId: context.runId, projectPath: context.inputs.projectPath, gameIdentity: context.inputs.gameIdentity,
      content: kind === 'PRELAUNCH_ACCEPTANCE.json' ? JSON.stringify({ disposition: '可以上线', expected_domain: 'https://' + context.inputs.domain, siteRevision: context.inputs.siteRevision })
        : kind === 'DEPLOYMENT_REPORT.json' ? JSON.stringify({ deployment: 'PRODUCTION LIVE', production_url: 'https://' + context.inputs.domain, synthetic: true })
        : kind.endsWith('.json') ? '{}' : 'OFFLINE TEST FIXTURE: ' + skill })) };
}

// Offline host-source contract fixture only; never passed to production bootstrap.
export async function syntheticSourceOwnershipReview(context,target) {
  const area=join(context.runDirectory,'source-ownership-reviews');await mkdir(area,{recursive:true});
  const id=randomUUID(),path=join(area,'SYNTHETIC_SOURCE_OWNERSHIP_'+id+'.json');
  const evidencePath=join(context.runDirectory,'SYNTHETIC_SOURCE_REVIEW_EVIDENCE_'+id+'.txt');
  const evidence='SYNTHETIC .invalid ownership fixture only; not a real ownership review';
  await writeFile(evidencePath,evidence,{flag:'wx',mode:0o400});
  const bytes=JSON.stringify({kind:'OFFICIAL_SOURCE_OWNERSHIP_REVIEW_V1',runId:context.runId,
    ...target,verdict:'VERIFIED_BY_TRUSTED_HOST',reviewMethod:'HUMAN_SOURCE_OWNERSHIP_REVIEW',
    reviewedAt:new Date().toISOString(),basis:'SYNTHETIC TEST ONLY',
    evidence:[{path:evidencePath,sha256:sha256(evidence)}]});
  await writeFile(path,bytes,{flag:'wx',mode:0o400});return{path,sha256:sha256(bytes)};
}

export async function syntheticOfficialSources(context) {
  const path=join(context.runDirectory,'HOST_OFFICIAL_SOURCE_EVIDENCE_fixture.json'),sources=[];
  await mkdir(join(context.runDirectory,'bsk-audit'),{recursive:true});
  for(const [i,sourceType] of ['OFFICIAL_WEBSITE','OFFICIAL_HELP','OFFICIAL_ANNOUNCEMENT'].entries()) {
    const url='https://official.invalid/synthetic-'+i+'/',content={title:'SYNTHETIC public source',headings:[],paragraphs:['SYNTHETIC test only']};
    const value={url,readAllowed:true,sourceSchema:'OFFICIAL_PUBLIC_ARTICLE_V1',content,text:[content.title,...content.headings,...content.paragraphs].join('\n'),controls:[]};
    const approvedCommands=[];
    for(const intent of ['read-public-page','capture-public-page']) {
      const requestId='source-'+randomUUID(),commandDigest='b'.repeat(64);
      const auditBytes=JSON.stringify({command:{runId:context.runId,stage:'game-homepage-icon-research',target:url,intent,digest:commandDigest},
        decision:{status:'APPROVED',receipt:{commandDigest}},result:{status:'COMPLETED'}});
      await writeFile(join(context.runDirectory,'bsk-audit',requestId+'.json'),auditBytes,{flag:'wx'});
      approvedCommands.push({requestId,target:url,commandDigest,auditSha256:sha256(auditBytes)});
    }
    const ownershipReview=await syntheticSourceOwnershipReview(context,{url,gameIdentity:context.inputs.gameIdentity,sourceType});
    sources.push({url,finalUrl:url,gameIdentity:context.inputs.gameIdentity,sourceType,accessedAt:new Date().toISOString(),ownershipReview,
      content,evidenceSha256:sha256(JSON.stringify(value)),approvedCommands});
  }
  const bytes=JSON.stringify({kind:'HOST_OFFICIAL_SOURCE_EVIDENCE_V1',runId:context.runId,
    stage:'game-homepage-icon-research',gameIdentity:context.inputs.gameIdentity,
    ownedWindowClosed:true,countsAsStageArtifact:false,realSkillExecution:false,sources});
  await writeFile(path,bytes,{flag:'wx',mode:0o400});
  return {status:'EVIDENCE_READY',path,sha256:sha256(bytes)};
}

// Legacy tests isolate downstream behavior; production never receives this seam.
export const syntheticHomepageReadiness = async () => ({ status: 'READY_FOR_MEDIA_CAPTURE' });
export async function syntheticHomepageMedia(context) {
  const { collectTrustedHomepageMedia } = await import('../src/homepage-media-host.mjs');
  const sourceUrl = 'https://official.invalid/homepage-media/';
  const videoUrl = 'https://www.youtube.com/watch?v=Abcdef_1234';
  const channelUrl = 'https://www.youtube.com/@SyntheticTest';
  const target = { url: sourceUrl, sourceType: 'OFFICIAL_WEBSITE', gameIdentity: context.inputs.gameIdentity };
  const ownershipReview = await syntheticSourceOwnershipReview(context, target);
  const area = join(context.runDirectory, 'source-ownership-reviews');
  await writeFile(join(area, 'SOURCE_INDEX.json'), JSON.stringify({ kind: 'HOST_OFFICIAL_SOURCE_INDEX_V1',
    runId: context.runId, gameIdentity: context.inputs.gameIdentity, sources: [{ target, ownershipReview }] }));
  await writeFile(join(area, 'MEDIA_SCOPE.json'), JSON.stringify({ kind: 'HOST_G1_MEDIA_SCOPE_V1',
    runId: context.runId, gameIdentity: context.inputs.gameIdentity, sourceUrl, videoUrl }));
  let url;
  return collectTrustedHomepageMedia(context, {
    approve: async command => ({ approved: true, type: 'bsk-command-approval', runId: context.runId,
      stage: context.stage, commandDigest: command.digest, approvedBy: 'SYNTHETIC_OFFLINE_ONLY',
      approvedAt: Date.now(), expiresAt: Date.now() + 10000, executionId: randomUUID() }),
    verifyIdentity: async policy => ({ executable: policy.executable, version: policy.version, sha256: policy.sha256 }),
    execute: async command => {
      if (command.intent === 'create-agent-window') return { stdout: JSON.stringify({ session_id: 'synthetic-owned',
        agent_window_id: 7, browser_instance_id: '8cf1a2f8' }) };
      if (command.intent === 'read-owned-tabs') return { stdout: JSON.stringify({ tabs: [{ tab_id: 8,
        scope: 'agent', window_id: 7, url: 'about:blank' }] }) };
      if (command.intent === 'read-public-page') { url = command.target; return { stdout: JSON.stringify({ tab_id: 8, final_url: url }) }; }
      if (command.intent === 'capture-public-page') return { stdout: JSON.stringify({ value: url === sourceUrl
        ? { url, readAllowed: true, sourceSchema: 'OFFICIAL_MEDIA_LINKS_V1', content: {
          links: [{ url: videoUrl, label: 'SYNTHETIC_OFFLINE_ONLY' }, { url: channelUrl, label: 'SYNTHETIC channel' }] } }
        : { url, readAllowed: true, sourceSchema: 'PUBLIC_VIDEO_PAGE_V1', content: { canonicalUrl: videoUrl,
          videoId: 'Abcdef_1234', title: 'SYNTHETIC_OFFLINE_ONLY', channelUrl, channelName: 'SYNTHETIC channel' } } }) };
      return { stdout: 'SYNTHETIC owned session stopped' };
    }
  });
}

export async function until(predicate) {
  const deadline = Date.now() + 10000;
  while (!predicate()) {
    if (Date.now() > deadline) throw Error('Test condition timed out');
    await new Promise(r => setTimeout(r, 5));
  }
}
