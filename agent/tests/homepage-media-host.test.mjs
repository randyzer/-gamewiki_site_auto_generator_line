import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile, chmod, rm, symlink } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { AGENT_ROOT } from '../src/skill-lock.mjs';
import { STAGE } from '../src/stages.mjs';
import { sha256 } from '../src/files.mjs';
import { createSkillExecutor } from '../src/skill-executor.mjs';
import { syntheticSourceOwnershipReview } from './helpers.mjs';
import { sanitizePublicCapture, approvedPage, publicPageCapture } from '../src/bsk-command-gate.mjs';
import { runInNewContext } from 'node:vm';
import * as policyApi from '../src/bsk-policy.mjs';

const sourceUrl = 'https://official.invalid/media/';
const videoUrl = 'https://www.youtube.com/watch?v=Abcdef_1234';
const channelUrl = 'https://www.youtube.com/@SyntheticTest';
const mediaPolicy = { g1Media: { sourceUrl, videoUrl }, allowedPages: [
  { host: 'official.invalid', pathPrefix: '/media/', pathPattern: '^/media/$' }] };
const captures = {
  [sourceUrl]: { url: sourceUrl, readAllowed: true, sourceSchema: 'OFFICIAL_MEDIA_LINKS_V1', content: { links: [
    { url: 'https://www.youtube-nocookie.com/embed/Abcdef_1234', label: 'SYNTHETIC video' },
    { url: channelUrl, label: 'SYNTHETIC channel' }] } },
  [videoUrl]: { url: videoUrl, readAllowed: true, sourceSchema: 'PUBLIC_VIDEO_PAGE_V1', content: {
    videoId: 'Abcdef_1234', canonicalUrl: videoUrl, title: 'SYNTHETIC_OFFLINE_ONLY',
    channelName: 'SYNTHETIC channel', channelUrl } }
};

async function api() {
  const module = await import('../src/homepage-media-host.mjs').catch(error => {
    if (error.code === 'ERR_MODULE_NOT_FOUND') return {};
    throw error;
  });
  assert.equal(typeof module.collectTrustedHomepageMedia, 'function', 'G1 media host must exist');
  return module;
}

async function fixture(t, { scopedVideoUrl = videoUrl, pageCaptures = captures } = {}) {
  const runId = 'TEST-homepage-media-' + randomUUID(), runDirectory = join(AGENT_ROOT, 'runs', runId);
  const nativeDirectory = join(runDirectory, 'artifacts/0/1/native');
  await mkdir(nativeDirectory, { recursive: true });
  t.after(() => rm(runDirectory, { recursive: true, force: true }));
  const context = { runId, runDirectory, nativeDirectory, stage: STAGE.HOMEPAGE_RESEARCH,
    inputs: { gameIdentity: 'SYNTHETIC media', projectPath: join(runDirectory, 'site') } };
  const target = { url: sourceUrl, sourceType: 'OFFICIAL_WEBSITE', gameIdentity: context.inputs.gameIdentity };
  const ownershipReview = await syntheticSourceOwnershipReview(context, target);
  const area = join(runDirectory, 'source-ownership-reviews');
  await writeFile(join(area, 'SOURCE_INDEX.json'), JSON.stringify({ kind: 'HOST_OFFICIAL_SOURCE_INDEX_V1',
    runId, gameIdentity: context.inputs.gameIdentity, sources: [{ target, ownershipReview }] }));
  const scopePath = join(area, 'MEDIA_SCOPE.json');
  const scope = { kind: 'HOST_G1_MEDIA_SCOPE_V1', runId, gameIdentity: context.inputs.gameIdentity,
    sourceUrl, videoUrl: scopedVideoUrl };
  await writeFile(scopePath, JSON.stringify(scope));
  let currentUrl, calls = 0;
  const options = { approve: async command => ({ approved: true, type: 'bsk-command-approval',
    runId, stage: context.stage, commandDigest: command.digest, approvedBy: 'SYNTHETIC_OFFLINE_ONLY',
    approvedAt: Date.now(), expiresAt: Date.now() + 10000, executionId: randomUUID() }),
  verifyIdentity: async policy => ({ executable: policy.executable, version: policy.version, sha256: policy.sha256 }),
  execute: async command => {
    calls++;
    if (command.intent === 'create-agent-window') return { stdout: JSON.stringify({ session_id: 'synthetic-owned',
      agent_window_id: 7, browser_instance_id: '8cf1a2f8' }) };
    if (command.intent === 'read-owned-tabs') return { stdout: JSON.stringify({ tabs: [{ tab_id: 8,
      scope: 'agent', window_id: 7, url: 'about:blank' }] }) };
    if (command.intent === 'read-public-page') {
      currentUrl = command.target; return { stdout: JSON.stringify({ tab_id: 8, final_url: currentUrl }) };
    }
    if (command.intent === 'capture-public-page') return { stdout: JSON.stringify({ value: pageCaptures[currentUrl] }) };
    return { stdout: 'SYNTHETIC owned session stopped' };
  } };
  return { context, scope, scopePath, options, calls: () => calls };
}

test('media URL grammar permits one exact watch target without widening ordinary query policy', () => {
  assert.equal(typeof policyApi.homepageMediaUrl, 'function');
  assert.equal(policyApi.homepageMediaUrl(videoUrl).videoId, 'Abcdef_1234');
  assert.equal(approvedPage(videoUrl, mediaPolicy), videoUrl);
  for (const url of [videoUrl + '&list=PRIVATE', videoUrl + '#fragment', videoUrl.replace('https:', 'http:'),
    videoUrl.replace('Abcdef_1234', 'Different_1'), 'https://youtu.be/Abcdef_1234',
    'https://www.youtube.com/account/', 'https://www.youtube.com/watch?v=Abcdef_1234&v=Abcdef_1234'])
    assert.throws(() => approvedPage(url, mediaPolicy));
  assert.throws(() => approvedPage(videoUrl, { allowedPages: [{ host: 'www.youtube.com', pathPrefix: '/watch' }] }));
});

test('typed public media capture strips private extras and rejects page identity changes', () => {
  for (const capture of Object.values(captures)) {
    const clean = sanitizePublicCapture({ ...capture, cookies: 'PRIVATE_DROP',
      content: { ...capture.content, account: 'PRIVATE_DROP' } }, mediaPolicy);
    assert.equal(clean.sourceSchema, capture.sourceSchema);
    assert.equal(JSON.stringify(clean).includes('PRIVATE_DROP'), false);
  }
  assert.throws(() => sanitizePublicCapture({ ...captures[videoUrl], url: videoUrl + '&list=1' }, mediaPolicy));
  assert.throws(() => sanitizePublicCapture({ ...captures[videoUrl], content: {
    ...captures[videoUrl].content, canonicalUrl: videoUrl.replace('Abcdef_1234', 'Different_1') } }, mediaPolicy));
});

test('media DOM extraction reads only bounded public links and video identity fields', () => {
  const document = { querySelectorAll: () => captures[sourceUrl].content.links.map(link => ({
    getAttribute: key => key === 'href' ? link.url : null, textContent: link.label })),
    get cookie() { throw Error('Cookie access forbidden'); },
    get body() { throw Error('Whole body access forbidden'); } };
  const value = runInNewContext(publicPageCapture(mediaPolicy), { URL, location: { href: sourceUrl }, document });
  assert.equal(value.sourceSchema, 'OFFICIAL_MEDIA_LINKS_V1');
  assert.equal(value.content.links.length, 2);
  const node = (content, name = 'content') => ({ getAttribute: key => key === name ? content : null });
  const author = { querySelector: () => node('SYNTHETIC channel'), querySelectorAll: () => [node(channelUrl, 'href')] };
  const videoDocument = { querySelector: selector => ({
    'link[rel="canonical"]': node(videoUrl, 'href'), 'meta[property="og:title"]': node('SYNTHETIC_OFFLINE_ONLY'),
    'meta[property="og:url"]': node(videoUrl), '[itemprop="author"]': author
  })[selector], get cookie() { throw Error('Cookie forbidden'); } };
  const video = runInNewContext(publicPageCapture(mediaPolicy), { URL, location: { href: videoUrl }, document: videoDocument });
  assert.equal(video.content.channelUrl, channelUrl);
  assert.equal(video.content.videoId, 'Abcdef_1234');
  author.querySelectorAll = () => [node('/@SyntheticTest', 'href')];
  const relative = runInNewContext(publicPageCapture(mediaPolicy), { URL, location: { href: videoUrl }, document: videoDocument });
  assert.equal(relative.content?.channelUrl, channelUrl, 'public relative href resolves against the approved page');
});

test('missing current-run materials pause before browser approval, Steam or worker', async t => {
  const f = await fixture(t); await rm(join(f.context.runDirectory, 'source-ownership-reviews/SOURCE_INDEX.json'));
  let calls = 0;
  const execute = createSkillExecutor({ browserHumanDialog: true,
    requestBrowserLaunch: async () => { calls++; return true; },
    collectBrowserEvidence: async () => { calls++; return { status: 'BLOCKED' }; },
    run: async () => { calls++; } });
  const result = await execute(STAGE.HOMEPAGE_RESEARCH, { ...f.context,
    outputDirectory: join(f.context.runDirectory, 'artifacts/0/1'),
    skillLock: { source: join(AGENT_ROOT, 'config/workflow.json') }, permissions: { siteWrites: false }, requiredArtifacts: [] });
  assert.equal(result.status, 'WAITING_FOR_USER');
  assert.ok(result.missing_inputs.includes('homepageSourceIndex'));
  assert.equal(calls, 0);
});

test('missing media scope waits, while wrong run, URL or ownership bytes block with zero commands', async t => {
  const host = await api(), f = await fixture(t);
  await rm(f.scopePath);
  assert.equal((await host.inspectHomepageMediaReadiness(f.context)).status, 'WAITING_FOR_USER');
  for (const scope of [{ ...f.scope, runId: 'other' }, { ...f.scope, sourceUrl: 'https://unapproved.invalid/' },
    { ...f.scope, videoUrl: videoUrl + '&list=1' }]) {
    await writeFile(f.scopePath, JSON.stringify(scope));
    assert.equal((await host.collectTrustedHomepageMedia(f.context, f.options)).status, 'BLOCKED');
  }
  assert.equal(f.calls(), 0);
});

test('synthetic primary captures and seven exact command approvals produce revalidated media evidence', async t => {
  const host = await api(), f = await fixture(t);
  const result = await host.collectTrustedHomepageMedia(f.context, f.options);
  assert.equal(result.status, 'EVIDENCE_READY'); assert.equal(f.calls(), 7);
  const report = await host.inspectHomepageMediaEvidence(f.context, result);
  assert.equal(report.video.title, 'SYNTHETIC_OFFLINE_ONLY');
  assert.equal(report.relationship.officialChannelStatus, 'VERIFIED');
  assert.equal(report.realSkillExecution, false); assert.equal(report.deploymentExecuted, false);
  const capturePath = report.source.capture.path;
  await chmod(capturePath, 0o600); await writeFile(capturePath, 'SYNTHETIC TAMPERED');
  await assert.rejects(host.inspectHomepageMediaEvidence(f.context, result), /MEDIA_/);
});

test('official same-host direct video uses the source-page-only evidence path', async t => {
  const directVideoUrl = 'https://official.invalid/assets/trailer.av1.mp4';
  const directCaptures = { [sourceUrl]: { url: sourceUrl, readAllowed: true,
    sourceSchema: 'OFFICIAL_MEDIA_LINKS_V1', content: { links: [
      { url: directVideoUrl, label: 'SYNTHETIC official trailer' }] } } };
  const host = await api(), f = await fixture(t, { scopedVideoUrl: directVideoUrl, pageCaptures: directCaptures });
  const result = await host.collectTrustedHomepageMedia(f.context, f.options);
  assert.equal(result.status, 'EVIDENCE_READY');
  assert.equal(f.calls(), 5);
  const report = await host.inspectHomepageMediaEvidence(f.context, result);
  assert.deepEqual(report.video, { url: directVideoUrl, kind: 'OFFICIAL_SELF_HOSTED_VIDEO',
    verifiedAt: report.video.verifiedAt });
  assert.equal(report.relationship.officialChannelStatus, 'NOT_APPLICABLE');
  assert.equal(report.commands.length, 5);
});

test('direct video scope rejects cross-host and query-bearing targets without executing commands', async t => {
  const host = await api(), f = await fixture(t);
  for (const candidate of ['https://cdn.official.invalid/trailer.mp4',
    'https://official.invalid/trailer.mp4?token=public']) {
    await writeFile(f.scopePath, JSON.stringify({ ...f.scope, videoUrl: candidate }));
    assert.equal((await host.collectTrustedHomepageMedia(f.context, f.options)).status, 'BLOCKED');
  }
  assert.equal(f.calls(), 0);
});

test('handwritten verified booleans, wrong channel claims, altered approvals and redirects are not evidence', async t => {
  const host = await api();
  for (const mutation of ['assertion', 'channel', 'audit', 'redirect']) {
    const f = await fixture(t);
    if (mutation === 'redirect') {
      const execute = f.options.execute;
      f.options.execute = async command => command.intent === 'read-public-page'
        ? { stdout: JSON.stringify({ tab_id: 8, final_url: 'https://unapproved.invalid/' }) } : execute(command);
      assert.equal((await host.collectTrustedHomepageMedia(f.context, f.options)).status, 'BLOCKED');
      continue;
    }
    const result = await host.collectTrustedHomepageMedia(f.context, f.options);
    assert.equal(result.status, 'EVIDENCE_READY');
    const report = JSON.parse(await readFile(result.path));
    if (mutation === 'assertion') report.source.capture = { path: join(f.context.nativeDirectory, 'fake.json'), sha256: 'a'.repeat(64) };
    if (mutation === 'channel') report.video.channelUrl = 'https://www.youtube.com/@Different';
    if (mutation === 'audit') {
      const auditPath = join(f.context.runDirectory, 'bsk-audit', report.commands[0].requestId + '.json');
      await writeFile(auditPath, '{}');
    }
    await chmod(result.path, 0o600); const bytes = JSON.stringify(report); await writeFile(result.path, bytes); await chmod(result.path, 0o400);
    await assert.rejects(host.inspectHomepageMediaEvidence(f.context, { ...result, sha256: sha256(bytes) }), /MEDIA_/);
  }
});

test('a different public video channel stays NOT_CONFIRMED, and denied approval executes nothing', async t => {
  const host = await api(), f = await fixture(t), execute = f.options.execute;
  f.options.execute = async command => command.intent === 'capture-public-page' && command.target === videoUrl
    ? { stdout: JSON.stringify({ value: { ...captures[videoUrl], content: {
      ...captures[videoUrl].content, channelUrl: 'https://www.youtube.com/@Different' } } }) } : execute(command);
  const result = await host.collectTrustedHomepageMedia(f.context, f.options);
  const report = await host.inspectHomepageMediaEvidence(f.context, result);
  assert.equal(report.relationship.officialChannelStatus, 'NOT_CONFIRMED');
  const denied = await fixture(t);
  denied.options.approve = async () => null;
  assert.equal((await host.collectTrustedHomepageMedia(denied.context, denied.options)).status, 'BLOCKED');
  assert.equal(denied.calls(), 0);
});

test('missing media scope and damaged ownership proof stop the actual executor before all side effects', async t => {
  const f = await fixture(t), { inspectHomepageMediaReadiness } = await api();
  await rm(f.scopePath);
  let calls = 0;
  const executor = createSkillExecutor({ browserHumanDialog: true, requestBrowserLaunch: async () => { calls++; return true; },
    collectBrowserEvidence: async () => { calls++; }, run: async () => { calls++; } });
  const context = { ...f.context, outputDirectory: join(f.context.runDirectory, 'artifacts/0/1'),
    skillLock: { source: join(AGENT_ROOT, 'config/workflow.json') }, permissions: { siteWrites: false }, requiredArtifacts: [] };
  assert.equal((await executor(STAGE.HOMEPAGE_RESEARCH, context)).status, 'WAITING_FOR_USER');
  const indexPath = join(f.context.runDirectory, 'source-ownership-reviews/SOURCE_INDEX.json');
  const index = JSON.parse(await readFile(indexPath)); index.sources[0].ownershipReview.sha256 = '0'.repeat(64);
  await writeFile(indexPath, JSON.stringify(index));
  assert.equal((await inspectHomepageMediaReadiness(f.context)).status, 'BLOCKED');
  assert.equal((await executor(STAGE.HOMEPAGE_RESEARCH, context)).status, 'BLOCKED');
  assert.equal(calls, 0);
});

test('every reviewed official target is scope-checked before Steam, including unused private routes', async t => {
  const host = await api(), f = await fixture(t);
  const context = { ...f.context, localFaviconHandoff: { synthetic: true } };
  assert.equal((await host.inspectHomepageMediaReadiness(context)).status, 'READY_FOR_MEDIA_CAPTURE');
  const target = { url: 'https://official.invalid/account/', sourceType: 'OFFICIAL_HELP',
    gameIdentity: f.context.inputs.gameIdentity };
  const ownershipReview = await syntheticSourceOwnershipReview(f.context, target);
  const path = join(f.context.runDirectory, 'source-ownership-reviews/SOURCE_INDEX.json');
  const index = JSON.parse(await readFile(path)); index.sources.push({ target, ownershipReview });
  await writeFile(path, JSON.stringify(index));
  assert.equal((await host.inspectHomepageMediaReadiness(context)).status, 'BLOCKED');
});

test('audit replay, wrong scope and altered command digests fail even with a recomputed receipt hash', async t => {
  const host = await api();
  for (const mutation of ['wrong-run', 'wrong-stage', 'wrong-target', 'missing-approval', 'digest', 'duplicate']) {
    const f = await fixture(t), result = await host.collectTrustedHomepageMedia(f.context, f.options);
    const report = JSON.parse(await readFile(result.path));
    const proof = report.commands[3], auditPath = join(f.context.runDirectory, 'bsk-audit', proof.requestId + '.json');
    const audit = JSON.parse(await readFile(auditPath));
    if (mutation === 'wrong-run') audit.command.runId = 'other';
    if (mutation === 'wrong-stage') audit.command.stage = 'other';
    if (mutation === 'wrong-target') audit.command.target = 'https://unapproved.invalid/';
    if (mutation === 'missing-approval') audit.decision.status = 'DENIED';
    if (mutation === 'digest') audit.command.digest = '0'.repeat(64);
    if (mutation === 'duplicate') report.commands[3] = report.commands[2];
    const bytes = JSON.stringify(audit); await writeFile(auditPath, bytes); proof.sha256 = sha256(bytes);
    const reportBytes = JSON.stringify(report); await chmod(result.path, 0o600);
    await writeFile(result.path, reportBytes); await chmod(result.path, 0o400);
    await assert.rejects(host.inspectHomepageMediaEvidence(f.context, { ...result, sha256: sha256(reportBytes) }), /MEDIA_/);
  }
});

test('media evidence cannot be loaded through a symlink or oversized fixed receipt', async t => {
  const host = await api(), f = await fixture(t);
  const result = await host.collectTrustedHomepageMedia(f.context, f.options);
  const original = await readFile(result.path); await chmod(result.path, 0o600); await rm(result.path);
  const target = join(f.context.nativeDirectory, 'worker.json'); await writeFile(target, original);
  await symlink(target, result.path);
  await assert.rejects(host.inspectHomepageMediaEvidence(f.context, result));
  await rm(result.path); await writeFile(result.path, 'x'.repeat(65537));
  await assert.rejects(host.inspectHomepageMediaEvidence(f.context, { ...result, sha256: sha256('x'.repeat(65537)) }), /MEDIA_/);
});
