import { mkdir, readFile, writeFile, lstat } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { AGENT_ROOT } from './skill-lock.mjs';
import { STAGE } from './stages.mjs';
import { inside, safePath, sha256 } from './files.mjs';
import { inspectOfficialSourceIndex } from './official-source-host.mjs';
import { homepageMediaUrl, bindBrowserPolicy } from './bsk-policy.mjs';
import { sanitizePublicCapture, publicPageCapture } from './bsk-command-gate.mjs';
import { createBskToolService } from './bsk-tool-server.mjs';
import { bskFileIdentity, runBskCommand } from './bsk-capability.mjs';
import { askMacHumanApproval } from './macos-human-approval.mjs';

const policyPath = join(AGENT_ROOT, 'config/bsk-command-policy.json');
const code = suffix => Error('HOMEPAGE_MEDIA_' + suffix);
const exactKeys = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) &&
  Object.keys(value).sort().join(',') === keys.split(',').sort().join(',');
function verifyContext(context) {
  if (context.stage !== STAGE.HOMEPAGE_RESEARCH || !/^[A-Za-z0-9_-]{1,100}$/.test(context.runId ?? '') ||
      context.runDirectory !== join(AGENT_ROOT, 'runs', context.runId) ||
      !inside(context.runDirectory, context.nativeDirectory) || !context.inputs?.gameIdentity) throw code('CONTEXT_INVALID');
}
async function hostBytes(context, path, { readonly = false } = {}) {
  if (typeof path !== 'string' || inside(join(context.runDirectory, 'artifacts'), path) ||
      inside(context.nativeDirectory, path)) throw code('PATH_INVALID');
  await safePath(path, [context.runDirectory]);
  const stat = await lstat(path);
  if (!stat.isFile() || stat.nlink !== 1 || stat.size < 1 || stat.size > 65536 ||
      (readonly && (stat.mode & 0o222))) throw code('FILE_INVALID');
  return readFile(path);
}
function mediaPolicy(base, scope) {
  const url = new URL(scope.sourceUrl);
  return { ...base, g1Media: { sourceUrl: scope.sourceUrl, videoUrl: scope.videoUrl },
    allowedPages: [{ host: url.hostname, pathPrefix: url.pathname,
      pathPattern: '^' + url.pathname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$' }] };
}

export async function inspectHomepageMediaScope(context) {
  verifyContext(context);
  const index = await inspectOfficialSourceIndex(context);
  const indexBytes = await hostBytes(context, join(context.runDirectory, 'source-ownership-reviews/SOURCE_INDEX.json'));
  const path = join(context.runDirectory, 'source-ownership-reviews/MEDIA_SCOPE.json');
  let bytes;
  try { bytes = await hostBytes(context, path); }
  catch (error) { if (error.code === 'ENOENT') throw code('SCOPE_UNAVAILABLE'); throw error; }
  const scope = JSON.parse(bytes);
  const media = homepageMediaUrl(scope.videoUrl);
  if (!exactKeys(scope, 'kind,runId,gameIdentity,sourceUrl,videoUrl') || scope.kind !== 'HOST_G1_MEDIA_SCOPE_V1' ||
      scope.runId !== context.runId || scope.gameIdentity !== context.inputs.gameIdentity ||
      !['WATCH', 'DIRECT'].includes(media?.kind) ||
      !index.sources.some(source => source.target.url === scope.sourceUrl)) throw code('SCOPE_INVALID');
  const url = new URL(scope.sourceUrl);
  if (url.href !== scope.sourceUrl || url.protocol !== 'https:' || url.username || url.password ||
      url.port || url.hash || url.search || /[%\\]/.test(scope.sourceUrl)) throw code('SCOPE_INVALID');
  if (media.kind === 'DIRECT' && new URL(scope.videoUrl).hostname !== url.hostname) throw code('SCOPE_INVALID');
  return { scope, index, indexSha256: sha256(indexBytes), scopeProof: { path, sha256: sha256(bytes) } };
}

// Only material scope is required here, never a capture that has not happened yet.
export async function inspectHomepageMediaReadiness(context) {
  let snapshot;
  try { snapshot = await inspectHomepageMediaScope(context); }
  catch (error) {
    const missing = error.message === 'OFFICIAL_SOURCE_INDEX_UNAVAILABLE' ? 'homepageSourceIndex'
      : error.message === 'HOMEPAGE_MEDIA_SCOPE_UNAVAILABLE' ? 'homepageMediaScope' : null;
    return missing ? { status: 'WAITING_FOR_USER', missing_inputs: [missing], code: error.message }
      : { status: 'BLOCKED', missing_inputs: [], code: 'HOMEPAGE_MEDIA_MATERIALS_INVALID' };
  }
  if (!context.localFaviconHandoff && !context.manualFaviconHandoff)
    return { status: 'WAITING_FOR_USER', missing_inputs: ['localFaviconSourceOrApproval'], code: 'HOMEPAGE_MEDIA_ICON_NOT_READY' };
  return { status: 'READY_FOR_MEDIA_CAPTURE', scopeSha256: snapshot.scopeProof.sha256,
    sourceIndexSha256: snapshot.indexSha256 };
}

async function verifiedCapture(context, proof, expectedUrl, policy) {
  if (!exactKeys(proof, 'path,sha256') || !/^[a-f0-9]{64}$/.test(proof.sha256 ?? '') ||
      !inside(join(context.runDirectory, 'homepage-media'), proof.path)) throw code('CAPTURE_INVALID');
  const bytes = await hostBytes(context, proof.path, { readonly: true });
  if (sha256(bytes) !== proof.sha256) throw code('CAPTURE_CHANGED');
  const capture = JSON.parse(bytes), clean = sanitizePublicCapture(capture, policy);
  if (capture.url !== expectedUrl || JSON.stringify(clean) !== JSON.stringify(capture)) throw code('CAPTURE_INVALID');
  return capture;
}

export async function inspectHomepageMediaEvidence(context, proof) {
  try {
    verifyContext(context);
    const expectedPath = join(context.runDirectory, 'homepage-media/MEDIA_EVIDENCE.json');
    if (proof?.path !== expectedPath || !/^[a-f0-9]{64}$/.test(proof.sha256 ?? '')) throw code('EVIDENCE_INVALID');
    const bytes = await hostBytes(context, proof.path, { readonly: true });
    if (sha256(bytes) !== proof.sha256) throw code('EVIDENCE_CHANGED');
    const report = JSON.parse(bytes), snapshot = await inspectHomepageMediaScope(context);
    const { scope, index, scopeProof, indexSha256 } = snapshot;
    if (!exactKeys(report, 'kind,runId,stage,gameIdentity,status,scope,sourceIndexSha256,source,video,relationship,commands,ownedWindowClosed,countsAsStageArtifact,realSkillExecution,deploymentExecuted') ||
        report.kind !== 'HOST_G1_MEDIA_EVIDENCE_V1' || report.runId !== context.runId || report.stage !== context.stage ||
        report.gameIdentity !== context.inputs.gameIdentity || report.status !== 'EVIDENCE_READY' ||
        report.ownedWindowClosed !== true || report.countsAsStageArtifact !== false ||
        report.realSkillExecution !== false || report.deploymentExecuted !== false ||
        JSON.stringify(report.scope) !== JSON.stringify(scopeProof) || report.sourceIndexSha256 !== indexSha256)
      throw code('EVIDENCE_INVALID');
    const policy = bindBrowserPolicy(mediaPolicy(JSON.parse(await readFile(policyPath)), scope), context.inputs);
    const source = await verifiedCapture(context, report.source.capture, scope.sourceUrl, policy);
    const media = homepageMediaUrl(scope.videoUrl);
    const direct = media.kind === 'DIRECT';
    const video = direct ? null : await verifiedCapture(context, report.video.capture, scope.videoUrl, policy);
    const linked = source.content.links.some(link => direct ? link.url === scope.videoUrl :
      homepageMediaUrl(link.url)?.videoId === video.content.videoId);
    const channel = !direct && source.content.links.some(link => link.url === video.content.channelUrl);
    const owner = index.sources.find(item => item.target.url === scope.sourceUrl).ownershipReview;
    const expectedSource = { url: scope.sourceUrl, ownershipReviewSha256: owner.sha256, capture: report.source.capture };
    const expectedVideo = direct
      ? { url: scope.videoUrl, kind: 'OFFICIAL_SELF_HOSTED_VIDEO', verifiedAt: report.video.verifiedAt }
      : { url: scope.videoUrl, ...video.content, verifiedAt: report.video.verifiedAt, capture: report.video.capture };
    if (!linked || JSON.stringify(report.source) !== JSON.stringify(expectedSource) ||
        JSON.stringify(report.video) !== JSON.stringify(expectedVideo) ||
        !Number.isFinite(Date.parse(report.video.verifiedAt)) || Date.parse(report.video.verifiedAt) > Date.now() ||
        JSON.stringify(report.relationship) !== JSON.stringify({ videoLinkedFromOfficialSource: true,
          officialChannelStatus: direct ? 'NOT_APPLICABLE' : channel ? 'VERIFIED' : 'NOT_CONFIRMED' }))
      throw code('RELATIONSHIP_INVALID');
    const intents = direct
      ? ['create-agent-window', 'read-owned-tabs', 'read-public-page', 'capture-public-page', 'close-owned-session']
      : ['create-agent-window', 'read-owned-tabs', 'read-public-page', 'capture-public-page',
        'read-public-page', 'capture-public-page', 'close-owned-session'];
    const targets = direct ? [null, null, scope.sourceUrl, scope.sourceUrl, null]
      : [null, null, scope.sourceUrl, scope.sourceUrl, scope.videoUrl, scope.videoUrl, null];
    if (!Array.isArray(report.commands) || report.commands.length !== intents.length ||
        new Set(report.commands.map(item => item.requestId)).size !== intents.length) throw code('AUDIT_INVALID');
    const used = new Set();
    for (const [i, item] of report.commands.entries()) {
      if (!exactKeys(item, 'requestId,sha256') || !/^media-[a-f0-9-]{36}$/.test(item.requestId)) throw code('AUDIT_INVALID');
      const auditBytes = await hostBytes(context, join(context.runDirectory, 'bsk-audit', item.requestId + '.json'));
      if (sha256(auditBytes) !== item.sha256) throw code('AUDIT_CHANGED');
      const audit = JSON.parse(auditBytes), command = audit.command, receipt = audit.decision?.receipt;
      const { digest, ...commandBytes } = command;
      const approvedAt = Date.parse(audit.decision?.at);
      if (command.requestId !== item.requestId || command.runId !== context.runId || command.stage !== context.stage ||
          command.intent !== intents[i] || command.target !== targets[i] || sha256(JSON.stringify(commandBytes)) !== digest ||
          audit.decision.status !== 'APPROVED' || audit.result?.status !== 'COMPLETED' ||
          receipt?.type !== 'bsk-command-approval' || receipt.runId !== context.runId || receipt.stage !== context.stage ||
          receipt.commandDigest !== digest || !receipt.approvedBy || !Number.isFinite(approvedAt) ||
          !(receipt.approvedAt <= approvedAt && approvedAt < receipt.expiresAt) ||
          !/^[A-Za-z0-9_-]{1,100}$/.test(receipt.executionId ?? '') || used.has(receipt.executionId)) throw code('AUDIT_INVALID');
      used.add(receipt.executionId);
      const consumed = JSON.parse(await hostBytes(context,
        join(context.runDirectory, 'bsk-approval-use', receipt.executionId + '.json')));
      if (consumed.requestId !== item.requestId || consumed.commandDigest !== digest) throw code('AUDIT_INVALID');
      if (i === 2 || (!direct && i === 4)) {
        const navigation = JSON.parse(audit.result.stdout);
        if ((navigation.final_url ?? navigation.url) !== targets[i]) throw code('REDIRECT_REJECTED');
      }
      if (i === 3 || (!direct && i === 5)) {
        if (command.argv[0] !== 'evaluate' || command.argv[1] !== publicPageCapture(policy) ||
            JSON.stringify(JSON.parse(audit.result.stdout).value) !== JSON.stringify(i === 3 ? source : video))
          throw code('CAPTURE_AUDIT_INVALID');
      }
    }
    return report;
  } catch { throw code('EVIDENCE_INVALID'); }
}

// Host-only composition. No task-selectable callback, policy file or arbitrary JS.
export async function collectTrustedHomepageMedia(context, { approve = askMacHumanApproval,
  execute = runBskCommand, verifyIdentity = bskFileIdentity } = {}) {
  const blocked = reason => ({ status: 'BLOCKED', code: reason, countsAsStageArtifact: false });
  let snapshot;
  try { snapshot = await inspectHomepageMediaScope(context); } catch { return blocked('HOMEPAGE_MEDIA_SCOPE_INVALID'); }
  const { scope } = snapshot, media = homepageMediaUrl(snapshot.scope.videoUrl);
  const direct = media.kind === 'DIRECT', area = join(context.runDirectory, 'homepage-media');
  const path = join(area, 'MEDIA_EVIDENCE.json');
  try {
    const bytes = await hostBytes(context, path, { readonly: true });
    const proof = { status: 'EVIDENCE_READY', path, sha256: sha256(bytes), countsAsStageArtifact: false };
    await inspectHomepageMediaEvidence(context, proof); return proof;
  } catch (error) { if (error.code !== 'ENOENT') return blocked('HOMEPAGE_MEDIA_EXISTING_EVIDENCE_INVALID'); }
  const policy = mediaPolicy(JSON.parse(await readFile(policyPath)), scope);
  let identity;
  try { identity = await verifyIdentity(policy); } catch { return blocked('BSK_EXECUTABLE_UNVERIFIED'); }
  const service = createBskToolService({ context, policy, identity, approve, execute });
  const commands = []; let owned = false, closed = false, source, video, failure;
  async function call(argv) {
    const requestId = 'media-' + randomUUID();
    const response = await service.handle({ jsonrpc: '2.0', id: 1, method: 'tools/call',
      params: { name: 'bsk_command', arguments: { requestId, argv } } });
    const result = JSON.parse(response.result.content[0].text);
    if (result.status !== 'COMPLETED') throw code('COMMAND_REJECTED');
    const bytes = await hostBytes(context, join(context.runDirectory, 'bsk-audit', requestId + '.json'));
    commands.push({ requestId, sha256: sha256(bytes) });
    return result;
  }
  try {
    await call(['session', 'start']); owned = true; await call(['tab', 'list']);
    await call(['navigate', scope.sourceUrl]); source = JSON.parse((await call(['observe'])).stdout).value;
    if (!source.content.links.some(link => direct ? link.url === scope.videoUrl :
      homepageMediaUrl(link.url)?.videoId === media.videoId))
      throw code('VIDEO_NOT_LINKED');
    if (!direct) {
      await call(['navigate', scope.videoUrl]); video = JSON.parse((await call(['observe'])).stdout).value;
    }
  } catch (error) { failure = /^HOMEPAGE_MEDIA_[A-Z_]+$/.test(error.message) ? error.message : 'HOMEPAGE_MEDIA_CAPTURE_REJECTED'; }
  finally { if (owned) try { await call(['session', 'stop']); closed = true; } catch { failure = 'HOMEPAGE_MEDIA_CLEANUP_UNVERIFIED'; } }
  if (failure || !closed) return blocked(failure ?? 'HOMEPAGE_MEDIA_CLEANUP_UNVERIFIED');
  try {
    await safePath(area, [context.runDirectory]); await mkdir(area, { recursive: true });
    async function saveCapture(name, value) {
      const file = join(area, name + '-' + randomUUID() + '.json'), bytes = JSON.stringify(value);
      await writeFile(file, bytes, { flag: 'wx', mode: 0o400 }); return { path: file, sha256: sha256(bytes) };
    }
    const owner = snapshot.index.sources.find(item => item.target.url === scope.sourceUrl).ownershipReview;
    const report = { kind: 'HOST_G1_MEDIA_EVIDENCE_V1', runId: context.runId, stage: context.stage,
      gameIdentity: context.inputs.gameIdentity, status: 'EVIDENCE_READY', scope: snapshot.scopeProof,
      sourceIndexSha256: snapshot.indexSha256,
      source: { url: scope.sourceUrl, ownershipReviewSha256: owner.sha256, capture: await saveCapture('SOURCE', source) },
      video: direct ? { url: scope.videoUrl, kind: 'OFFICIAL_SELF_HOSTED_VIDEO', verifiedAt: new Date().toISOString() }
        : { url: scope.videoUrl, ...video.content, verifiedAt: new Date().toISOString(), capture: await saveCapture('VIDEO', video) },
      relationship: { videoLinkedFromOfficialSource: true, officialChannelStatus:
        direct ? 'NOT_APPLICABLE' : source.content.links.some(link => link.url === video.content.channelUrl) ? 'VERIFIED' : 'NOT_CONFIRMED' },
      commands, ownedWindowClosed: true, countsAsStageArtifact: false, realSkillExecution: false, deploymentExecuted: false };
    const bytes = JSON.stringify(report, null, 2) + '\n';
    await writeFile(path, bytes, { flag: 'wx', mode: 0o400 });
    const proof = { status: 'EVIDENCE_READY', path, sha256: sha256(bytes), countsAsStageArtifact: false };
    await inspectHomepageMediaEvidence(context, proof); return proof;
  } catch { return blocked('HOMEPAGE_MEDIA_EVIDENCE_INVALID'); }
}
