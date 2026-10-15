import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { AGENT_ROOT } from './skill-lock.mjs';
import { STAGE } from './stages.mjs';
import { inside, safePath, sha256 } from './files.mjs';
import { approvedPage, sanitizePublicCapture } from './bsk-command-gate.mjs';
import { bindBrowserPolicy } from './bsk-policy.mjs';
import { createBskToolService } from './bsk-tool-server.mjs';
import { askMacHumanApproval } from './macos-human-approval.mjs';
import { bskFileIdentity, runBskCommand } from './bsk-capability.mjs';

// This fixed run-owned index is a host review, not a task-selectable URL list.
export async function inspectOfficialSourceIndex(context) {
  const area = join(context.runDirectory, 'source-ownership-reviews');
  if (context.runDirectory !== join(AGENT_ROOT, 'runs', context.runId) ||
      !/^[A-Za-z0-9_-]{1,100}$/.test(context.runId ?? '')) throw Error('OFFICIAL_SOURCE_INDEX_INVALID');
  let bytes;
  try {
    const path = join(area, 'SOURCE_INDEX.json');
    await safePath(path, [area]); bytes = await readFile(path);
  } catch { throw Error('OFFICIAL_SOURCE_INDEX_UNAVAILABLE'); }
  let index;
  try { index = JSON.parse(bytes); } catch { throw Error('OFFICIAL_SOURCE_INDEX_INVALID'); }
  if (bytes.length > 65536 || !index || Object.keys(index).sort().join(',') !== 'gameIdentity,kind,runId,sources' ||
      index.kind !== 'HOST_OFFICIAL_SOURCE_INDEX_V1' || index.runId !== context.runId ||
      index.gameIdentity !== context.inputs.gameIdentity || !Array.isArray(index.sources) ||
      !index.sources.length || index.sources.length > 12 ||
      new Set(index.sources.map(source => source?.target?.url)).size !== index.sources.length)
    throw Error('OFFICIAL_SOURCE_INDEX_INVALID');
  for (const source of index.sources) {
    if (!source || Object.keys(source).sort().join(',') !== 'ownershipReview,target' ||
        !source.target || Object.keys(source.target).sort().join(',') !== 'gameIdentity,sourceType,url' ||
        source.target.gameIdentity !== context.inputs.gameIdentity ||
        !['OFFICIAL_WEBSITE', 'OFFICIAL_HELP', 'OFFICIAL_ANNOUNCEMENT'].includes(source.target.sourceType))
      throw Error('OFFICIAL_SOURCE_INDEX_INVALID');
    try {
      const text = source.target.url, url = new URL(text);
      if (typeof text !== 'string' || text.length > 160 || url.href !== text ||
          url.protocol !== 'https:' || url.search || url.hash || url.port || url.username ||
          url.password || /[%\\]/.test(text)) throw Error();
      approvedPage(text, { allowedPages: [{ host: url.hostname, pathPrefix: url.pathname,
        pathPattern: '^' + url.pathname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$' }] });
    } catch { throw Error('OFFICIAL_SOURCE_INDEX_INVALID'); }
    await inspectOwnershipReview(context, source.target, source.ownershipReview);
  }
  return index;
}

export async function collectIndexedOfficialSources(context) {
  let index;
  try { index = await inspectOfficialSourceIndex(context); }
  catch (error) { return { status: 'BLOCKED', code: /^OFFICIAL_SOURCE_[A-Z_]+$/.test(error.message)
    ? error.message : 'OFFICIAL_SOURCE_INDEX_INVALID', countsAsStageArtifact: false }; }
  return collectTrustedOfficialSources(context, {
    targets: index.sources.map(source => source.target),
    reviewSourceOwnership: target => index.sources.find(source => source.target.url === target.url)?.ownershipReview
  });
}

async function inspectOwnershipReview(context, target, proof) {
  if(!proof||Object.keys(proof).sort().join(',')!=='path,sha256'||
    !/^[a-f0-9]{64}$/.test(proof.sha256??''))throw Error('OFFICIAL_SOURCE_OWNERSHIP_UNVERIFIED');
  await safePath(proof.path,[join(context.runDirectory,'source-ownership-reviews')]);
  const bytes=await readFile(proof.path);
  if(bytes.length>65536||sha256(bytes)!==proof.sha256)throw Error('OFFICIAL_SOURCE_OWNERSHIP_UNVERIFIED');
  const review=JSON.parse(bytes);
  if(review.kind!=='OFFICIAL_SOURCE_OWNERSHIP_REVIEW_V1'||review.runId!==context.runId||
    review.url!==target.url||review.gameIdentity!==context.inputs.gameIdentity||
    review.sourceType!==target.sourceType||review.verdict!=='VERIFIED_BY_TRUSTED_HOST'||
    !['TRUSTED_HOST_LINK_VERIFICATION','HUMAN_SOURCE_OWNERSHIP_REVIEW'].includes(review.reviewMethod)||
    typeof review.basis!=='string'||!review.basis.trim()||review.basis.length>4000||
    !Number.isFinite(Date.parse(review.reviewedAt))||!Array.isArray(review.evidence)||
    review.evidence.length<1||review.evidence.length>8)throw Error('OFFICIAL_SOURCE_OWNERSHIP_UNVERIFIED');
  for(const item of review.evidence) {
    if(!/^[a-f0-9]{64}$/.test(item.sha256??''))throw Error('OFFICIAL_SOURCE_OWNERSHIP_UNVERIFIED');
    if(inside(join(context.runDirectory,'artifacts'),item.path)||
      (context.nativeDirectory&&inside(context.nativeDirectory,item.path)))
      throw Error('OFFICIAL_SOURCE_OWNERSHIP_UNVERIFIED');
    await safePath(item.path,[context.runDirectory]);
    if(sha256(await readFile(item.path))!==item.sha256)throw Error('OFFICIAL_SOURCE_OWNERSHIP_UNVERIFIED');
  }
  return review;
}

export async function inspectOfficialSourceEvidence(context, result) {
  await safePath(result.path,[context.runDirectory]);
  const bytes=await readFile(result.path);
  if(sha256(bytes)!==result.sha256)throw Error('HOST_OFFICIAL_SOURCE_EVIDENCE_TAMPERED');
  const report=JSON.parse(bytes);
  if(report.kind!=='HOST_OFFICIAL_SOURCE_EVIDENCE_V1'||report.runId!==context.runId||
    report.stage!==STAGE.HOMEPAGE_RESEARCH||report.gameIdentity!==context.inputs.gameIdentity||
    report.ownedWindowClosed!==true||report.countsAsStageArtifact!==false||report.realSkillExecution!==false||
    !Array.isArray(report.sources)||!report.sources.length)throw Error('HOST_OFFICIAL_SOURCE_EVIDENCE_INVALID');
  for(const source of report.sources) {
    await inspectOwnershipReview(context,source,source.ownershipReview);
    if(source.gameIdentity!==context.inputs.gameIdentity||source.url!==source.finalUrl||
      !Number.isFinite(Date.parse(source.accessedAt))||!source.content?.title||
      !Array.isArray(source.approvedCommands)||source.approvedCommands.length!==2||
      source.approvedCommands.some(x=>x.target!==source.url||!/^[a-f0-9]{64}$/.test(x.commandDigest??'')||
        !/^[a-f0-9]{64}$/.test(x.auditSha256??'')))throw Error('HOST_OFFICIAL_SOURCE_EVIDENCE_INVALID');
    const url=new URL(source.url);
    const policy={publicSources:[{url:source.url}],allowedPages:[{host:url.hostname,pathPrefix:url.pathname,pathPattern:'^'+url.pathname.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'$'}]};
    const vetted=sanitizePublicCapture({url:source.url,readAllowed:true,sourceSchema:'OFFICIAL_PUBLIC_ARTICLE_V1',content:source.content},policy);
    if(sha256(JSON.stringify(vetted))!==source.evidenceSha256||
      !['OFFICIAL_WEBSITE','OFFICIAL_HELP','OFFICIAL_ANNOUNCEMENT'].includes(source.sourceType))
      throw Error('HOST_OFFICIAL_SOURCE_EVIDENCE_INVALID');
    for(const [index, scope] of source.approvedCommands.entries()) {
      if(!/^source-[a-f0-9-]{36}$/.test(scope.requestId??''))throw Error('HOST_OFFICIAL_SOURCE_APPROVAL_UNVERIFIED');
      const path=join(context.runDirectory,'bsk-audit',scope.requestId+'.json');
      await safePath(path,[context.runDirectory]);const bytes=await readFile(path),audit=JSON.parse(bytes);
      if(sha256(bytes)!==scope.auditSha256||audit.decision?.status!=='APPROVED'||audit.result?.status!=='COMPLETED'||
        audit.command?.target!==source.url||audit.command.runId!==context.runId||audit.command.stage!==context.stage||
        audit.command.intent!==['read-public-page','capture-public-page'][index]||
        audit.command.digest!==scope.commandDigest||audit.decision.receipt?.commandDigest!==scope.commandDigest)
        throw Error('HOST_OFFICIAL_SOURCE_APPROVAL_UNVERIFIED');
    }
  }
  return report;
}

// Trusted host options only. Task/page JSON cannot add a URL policy or install callbacks.
export async function collectTrustedOfficialSources(context, { targets = [], approve = askMacHumanApproval,
  execute = runBskCommand, verifyIdentity = bskFileIdentity,
  reviewSourceOwnership = async () => null,
  policyFile = join(AGENT_ROOT,'config/bsk-command-policy.json') } = {}) {
  const blocked = code => ({ status:'BLOCKED', code, countsAsStageArtifact:false });
  if (context.stage !== STAGE.HOMEPAGE_RESEARCH) return blocked('UNSUPPORTED_BROWSER_STAGE');
  if (!Array.isArray(targets) || !targets.length) return blocked('OFFICIAL_SOURCE_TARGETS_NOT_CONFIGURED');
  if (context.runDirectory !== join(AGENT_ROOT,'runs',context.runId) ||
      !/^[A-Za-z0-9_-]{1,100}$/.test(context.runId ?? '')) return blocked('UNSAFE_BROWSER_CONTEXT');
  await safePath(context.nativeDirectory,[context.runDirectory]); await mkdir(context.nativeDirectory,{recursive:true});
  const sourceTypes = new Set(['OFFICIAL_WEBSITE','OFFICIAL_HELP','OFFICIAL_ANNOUNCEMENT']);
  if (targets.length > 12 || new Set(targets.map(x=>x.url)).size !== targets.length ||
      targets.some(x => !x || Object.keys(x).sort().join(',') !== 'gameIdentity,sourceType,url' ||
        x.gameIdentity !== context.inputs.gameIdentity || !sourceTypes.has(x.sourceType) ||
        typeof x.url !== 'string' || x.url.length > 160)) return blocked('OFFICIAL_SOURCE_SCOPE_INVALID');
  const policy = bindBrowserPolicy(JSON.parse(await readFile(policyFile)),context.inputs);
  policy.publicSources = structuredClone(targets);
  for (const spec of targets) {
    try {
      const url = new URL(spec.url);
      if (url.href !== spec.url || url.search || url.hash || url.username || url.password ||
          /[%\\]/.test(spec.url) || url.protocol !== 'https:' || url.port) return blocked('OFFICIAL_SOURCE_SCOPE_INVALID');
      policy.allowedPages.push({host:url.hostname,pathPrefix:url.pathname,
        pathPattern:'^'+url.pathname.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'$'});
      approvedPage(spec.url,policy);
    } catch { return blocked('OFFICIAL_SOURCE_SCOPE_INVALID'); }
  }
  // An official-looking hostname/type is only a candidate. The trusted host must
  // supply its reviewed provenance; no task/page can install this callback.
  const ownershipReviews=[];
  try {
    for(const target of targets) {
      const proof=await reviewSourceOwnership(structuredClone(target),context);
      await inspectOwnershipReview(context,target,proof);
      ownershipReviews.push(structuredClone(proof));
    }
  } catch {return blocked('OFFICIAL_SOURCE_OWNERSHIP_UNVERIFIED');}
  let identity;
  try {identity=await verifyIdentity(policy);} catch {return blocked('BSK_EXECUTABLE_UNVERIFIED');}
  const service=createBskToolService({context,policy,identity,approve,execute});
  const sources=[];let owned=false,closed=false,failure;
  async function call(argv) {
    const requestId='source-'+randomUUID();
    const response=await service.handle({jsonrpc:'2.0',id:1,method:'tools/call',
      params:{name:'bsk_command',arguments:{requestId,argv}}});
    let result;
    try {result=JSON.parse(response.result.content[0].text);} catch {throw Error('OFFICIAL_SOURCE_COMMAND_UNAVAILABLE');}
    if(result.status!=='COMPLETED')throw Error(['COMMAND_NOT_APPROVED','APPROVAL_CAPABILITY_UNAVAILABLE',
      'CAPTURE_CONTEXT_CHANGED','PUBLIC_CONTENT_UNVERIFIED','IPC_PERMISSION_DENIED','DAEMON_UNREACHABLE',
      'COMMAND_TIMEOUT'].includes(result.status)?result.status:'OFFICIAL_SOURCE_COMMAND_UNAVAILABLE');
    const auditPath=join(context.runDirectory,'bsk-audit',requestId+'.json');
    await safePath(auditPath,[context.runDirectory]);
    const bytes=await readFile(auditPath),audit=JSON.parse(bytes);
    if(audit.decision?.status!=='APPROVED'||audit.result?.status!=='COMPLETED'||
      audit.command.runId!==context.runId||audit.command.stage!==context.stage||
      audit.command.digest!==audit.decision.receipt?.commandDigest)throw Error('OFFICIAL_SOURCE_APPROVAL_UNVERIFIED');
    return {result,scope:{requestId,commandDigest:audit.command.digest,auditSha256:sha256(bytes),target:audit.command.target}};
  }
  try {
    await call(['session','start']);owned=true;
    await call(['tab','list']);
    for(const [index,target] of targets.entries()) {
      const navigate=await call(['navigate',target.url]);
      const capture=await call(['observe']);
      const value=JSON.parse(capture.result.stdout).value;
      if(value.sourceSchema!=='OFFICIAL_PUBLIC_ARTICLE_V1'||value.url!==target.url)throw Error('PUBLIC_CONTENT_UNVERIFIED');
      sources.push({url:target.url,finalUrl:value.url,gameIdentity:context.inputs.gameIdentity,
        sourceType:target.sourceType,accessedAt:new Date().toISOString(),content:value.content,
        evidenceSha256:sha256(JSON.stringify(value)),ownershipReview:ownershipReviews[index],
        approvedCommands:[navigate.scope,capture.scope]});
    }
  } catch(error) {failure=/^[A-Z_]+$/.test(error.message)?error.message:'OFFICIAL_SOURCE_EVIDENCE_INCOMPLETE';}
  finally {if(owned)try{await call(['session','stop']);closed=true;}catch{failure='OWNED_WINDOW_CLEANUP_UNVERIFIED';}}
  if(failure||!closed||sources.length!==targets.length)return blocked(failure??'OFFICIAL_SOURCE_EVIDENCE_INCOMPLETE');
  try {
    for(const source of sources)await inspectOwnershipReview(context,source,source.ownershipReview);
  } catch{return blocked('OFFICIAL_SOURCE_OWNERSHIP_UNVERIFIED');}
  const report={kind:'HOST_OFFICIAL_SOURCE_EVIDENCE_V1',runId:context.runId,stage:context.stage,
    gameIdentity:context.inputs.gameIdentity,sources,ownedWindowClosed:true,
    countsAsStageArtifact:false,realSkillExecution:false,deploymentExecuted:false};
  const path=join(context.runDirectory,'HOST_OFFICIAL_SOURCE_EVIDENCE_'+randomUUID()+'.json');
  const bytes=JSON.stringify(report,null,2)+'\n';
  await writeFile(path,bytes,{flag:'wx',mode:0o400});
  return {status:'EVIDENCE_READY',path,sha256:sha256(bytes),countsAsStageArtifact:false};
}
