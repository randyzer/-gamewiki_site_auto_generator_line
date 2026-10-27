import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, realpath, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { createServer } from 'node:http';
import {
  createCurrentSiteBaseline,
  createImmutableIntegrationLineage,
  createSiteAcceptanceIdentity,
} from '../src/site-acceptance-contract.mjs';
import {
  createDerivedPublicationAttestation,
  createPublicationEvidenceBody,
} from '../src/effective-publication-attestation.mjs';
import { projectContentDigest } from '../src/project-content-digest.mjs';
import { sourceFiles } from '../src/project-baseline.mjs';
import {
  collectSiteRemediationHostEvidence,
  observeCurrentPublication,
} from '../src/site-remediation-host.mjs';
import { buildAndServe } from '../src/site-preview-host.mjs';
import { createTrustedSiteRemediationController } from '../src/site-remediation-transaction.mjs';

const d = character => character.repeat(64);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

async function publicationServer(t) {
  const state = {
    root: '<html><head><meta name="robots" content="noindex"></head>' +
      '<body><nav><a href="/">Home</a></nav></body></html>',
    sitemap: null,
    robots: 'User-agent: *\nAllow: /\nSitemap: /sitemap.xml\n',
    rootHeaders: {},
    exposedSource: false,
    redirects: new Map(),
  };
  const server = createServer((request, response) => {
    if (state.redirects.has(request.url)) {
      const redirect = state.redirects.get(request.url);
      response.statusCode = redirect.status;
      response.setHeader('location', redirect.target);
      return response.end('redirect');
    }
    if (request.url === '/app/page.tsx' && !state.exposedSource) {
      response.statusCode = 404;
      return response.end('not found');
    }
    if (!['/', '/robots.txt', '/sitemap.xml', '/app/page.tsx'].includes(request.url)) {
      response.statusCode = 404;
      return response.end('not found');
    }
    response.statusCode = 200;
    for (const [name, value] of Object.entries(state.rootHeaders)) {
      if (request.url === '/') response.setHeader(name, value);
    }
    response.setHeader('content-type', request.url === '/sitemap.xml'
      ? 'application/xml' : request.url === '/robots.txt' ? 'text/plain' : 'text/html');
    response.end(request.url === '/sitemap.xml'
      ? state.sitemap ?? `<urlset><url><loc>http://${request.headers.host}/</loc></url></urlset>`
      : request.url === '/robots.txt' ? state.robots
        : request.url === '/' ? state.root : 'source');
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  t.after(() => new Promise(resolve => server.close(resolve)));
  const address = server.address();
  const publicationUrl = `http://127.0.0.1:${address.port}`;
  state.sitemap = `<urlset><url><loc>${publicationUrl}/</loc></url></urlset>`;
  return { publicationUrl, state };
}

async function fixture(t) {
  const projectPath = await realpath(await mkdtemp(join(tmpdir(), 'site-remediation-host-')));
  t.after(() => rm(projectPath, { recursive: true, force: true }));
  await mkdir(join(projectPath, 'app'), { recursive: true });
  await mkdir(join(projectPath, 'backgroundinformation'), { recursive: true });
  await writeFile(join(projectPath, 'app/page.tsx'), 'export default function Page(){return null}\n');
  await writeFile(join(projectPath, 'package.json'), JSON.stringify({
    scripts: { build: 'next build', start: 'next start' },
  }));
  await writeFile(join(projectPath, 'pnpm-lock.yaml'), 'lockfileVersion: 9\n');
  const protectedPath = join(projectPath, 'backgroundinformation/keywords.md');
  await writeFile(protectedPath, '# keywords\n');
  const preview = await publicationServer(t);
  const inventory = (await sourceFiles(projectPath)).map(file => ({ path: file.path,
    mode: file.mode, byteLength: file.size, sha256: file.sha256 }));
  const protectedStat = await stat(protectedPath);
  const protectedInputs = [{ path: relative(projectPath, protectedPath),
    mode: protectedStat.mode & 0o777, byteLength: protectedStat.size,
    sha256: sha256(await readFile(protectedPath)) }];
  const projectDigest = await projectContentDigest(projectPath);
  const child = new EventEmitter();
  child.stdout = new EventEmitter(); child.stderr = new EventEmitter();
  child.kill = () => queueMicrotask(() => child.emit('close', 0));
  const served = await buildAndServe(projectPath, {
    run: async () => ({ exitCode: 0 }),
    getPort: async () => Number(new URL(preview.publicationUrl).port),
    spawnProcess: () => child,
    fetchUrl: fetch,
  });
  const lineage = createImmutableIntegrationLineage({ runId: 'run', siteRevision: 'site-v1',
    manifestSequence: 4, manifestSha256: d('a'), researchHandoffSha256: d('3'),
    researchApprovalDigest: d('4'), stage3CheckpointDigest: d('b'),
    stage3ArtifactDigests: [d('c')], stage4CheckpointDigest: d('d'),
    stage4ArtifactDigests: [d('1')], originalPublicationManifestSha256: d('1'),
    originalLaunchReadinessBindingDigest: d('5'), finalizedTransactionDigest: d('e') });
  const baseline = createCurrentSiteBaseline({ baselineKind: 'REACCEPTED_CURRENT_BASELINE',
    historicalEquivalence: false, digestPolicyVersion: 'project-content-v1', projectPath,
    files: inventory, projectDigest, routes: ['/'], protectedInputs,
    historicalEvidenceGaps: ['FINAL_STAGE4_INVENTORY_UNAVAILABLE'] });
  const originalPublicationManifest = { pages: [
    { route: '/', disposition: 'PUBLISH', sourceFile: 'app/page.tsx' },
    { route: '/draft', disposition: 'DRAFT_ONLY', sourceFile: 'app/draft/page.tsx' },
  ] };
  const hostObservation = await observeCurrentPublication({
    previewSession: served.session, projectPath, projectDigest, currentRoutes: ['/'],
    originalPublicationManifest,
  });
  const evidenceBody = createPublicationEvidenceBody({
    originalPublicationManifestSha256: d('1'), lineageDigest: lineage.lineageDigest,
    researchHandoffSha256: d('3'), researchApprovalDigest: d('4'),
    originalLaunchReadinessBindingDigest: d('5'), baselineKind: baseline.baselineKind,
    baselineDigest: baseline.baselineDigest, remediationScopeDigest: d('6'), projectDigest,
    observedRoutes: ['/'], pages: [{ route: '/', originalDisposition: 'PUBLISH',
      effectiveDisposition: 'PUBLISH', materialStatus: 'COMPLETED', robots: 'noindex',
      inSitemap: true, inNavigation: true, linkedFromPublicPages: true,
      sourceFileExposed: false, dynamicProof: 'PROVEN' }],
    validationStatus: 'VERIFIED', indexingAuthorization: 'NOT_CLEARED',
    hostObservationDigest: hostObservation.observationDigest, validatorVersion: 'host-route-v2',
  });
  const acceptanceIdentity = createSiteAcceptanceIdentity({
    lineageDigest: evidenceBody.lineageDigest, baselineDigest: baseline.baselineDigest,
    projectDigest, publicationEvidenceDigest: evidenceBody.publicationEvidenceDigest,
    remediationScopeDigest: evidenceBody.remediationScopeDigest,
    transactionId: 'site-remediation-11111111-1111-4111-8111-111111111111',
  });
  const attestation = createDerivedPublicationAttestation({ evidenceBody, acceptanceIdentity });
  const expected = { lineageDigest: evidenceBody.lineageDigest,
    researchApprovalDigest: evidenceBody.researchApprovalDigest, oldProjectDigest: d('8'),
    newProjectDigest: projectDigest, baselineDigest: baseline.baselineDigest,
    remediationScopeDigest: evidenceBody.remediationScopeDigest,
    publicationEvidenceDigest: evidenceBody.publicationEvidenceDigest,
    attestationDigest: attestation.attestationDigest,
    acceptanceRevision: acceptanceIdentity.acceptanceRevision,
    protectedInputsDigest: baseline.protectedInputsDigest, operatorSummarySha256: d('9') };
  const manifest = { runId: 'run', inputs: { siteRevision: 'site-v1' }, stages: [
    { skill: 'game-homepage-icon-research', artifacts: [], checkpoint: {} },
    { skill: 'game-innerpage-keyword-information-research', artifacts: [], checkpoint: {
      researchHandoff: { sha256: d('3'), approvalSha256: d('4') } } },
    { skill: 'game-site-template-selector', artifacts: [{ sha256: d('c') }], checkpoint: {} },
    { skill: 'game-site-content-integrator', artifacts: [{
      kind: 'ROUTE_PUBLICATION_MANIFEST.json', sha256: d('1') }],
    checkpoint: { launchReadiness: { bindingDigest: d('5') } } },
  ] };
  return { projectPath, protectedPath, lineage, baseline, publicationEvidence: evidenceBody,
    acceptanceIdentity, attestation, expected, originalPublicationManifest, manifest,
    publicationUrl: preview.publicationUrl, previewSession: served.session,
    previewStop: served.stop, serverState: preview.state, hostObservation };
}

test('trusted Host evidence is recomputed from the current project and contracts', async t => {
  const f = await fixture(t);
  const observed = await collectSiteRemediationHostEvidence(f);
  assert.deepEqual(Object.fromEntries(Object.keys(f.expected).map(key => [key, observed[key]])),
    f.expected);
  assert.equal(observed.immutableObjects.baseline, f.baseline);
});

test('trusted Host evidence rejects missing or forged publication observations', async t => {
  const missing = await fixture(t);
  delete missing.publicationUrl;
  delete missing.previewSession;
  await assert.rejects(() => collectSiteRemediationHostEvidence(missing),
    error => error.code === 'SITE_PREVIEW_SESSION_INVALID');

  for (const mutate of [
    f => { f.serverState.root = f.serverState.root.replace('noindex', 'index'); },
    f => { f.serverState.sitemap = '<urlset></urlset>'; },
    f => { f.serverState.root = '<html><head><meta name="robots" content="noindex"></head></html>'; },
    f => { f.serverState.exposedSource = true; },
  ]) {
    const f = await fixture(t);
    mutate(f);
    await assert.rejects(() => collectSiteRemediationHostEvidence(f),
      error => error.code === 'PUBLICATION_HOST_OBSERVATION_INVALID');
  }
});

test('trusted Host evidence rejects a Host route inventory mismatch', async t => {
  const f = await fixture(t);
  f.serverState.sitemap = '<urlset><url><loc>http://127.0.0.1/other</loc></url></urlset>';
  await assert.rejects(() => collectSiteRemediationHostEvidence(f),
    error => error.code === 'PUBLICATION_HOST_OBSERVATION_INVALID');
});

test('trusted Host evidence rejects changed project and unprovable routes', async t => {
  const f = await fixture(t);
  await writeFile(join(f.projectPath, 'app/page.tsx'), 'changed\n');
  await assert.rejects(() => collectSiteRemediationHostEvidence(f),
    error => error.code === 'SITE_REMEDIATION_PROJECT_BASELINE_CHANGED');

  const g = await fixture(t);
  await mkdir(join(g.projectPath, 'app/[slug]'));
  await writeFile(join(g.projectPath, 'app/[slug]/page.tsx'), 'export default()=>null\n');
  await assert.rejects(() => collectSiteRemediationHostEvidence(g),
    error => ['SITE_REMEDIATION_PROJECT_BASELINE_CHANGED',
      'SITE_REMEDIATION_ROUTE_UNPROVABLE'].includes(error.code));
});

test('trusted Host evidence rejects protected input drift', async t => {
  const f = await fixture(t);
  await writeFile(f.protectedPath, '# changed\n');
  await assert.rejects(() => collectSiteRemediationHostEvidence(f),
    error => error.code === 'SITE_REMEDIATION_PROTECTED_INPUT_CHANGED');
});

test('trusted Host evidence rejects changed immutable Stage 2 through Stage 4 lineage', async t => {
  const f = await fixture(t);
  f.manifest.stages[3].artifacts[0].sha256 = d('f');
  await assert.rejects(() => collectSiteRemediationHostEvidence(f),
    error => error.code === 'SITE_REMEDIATION_LINEAGE_CHANGED');
});

test('production remediation controller rejects caller-supplied observation callbacks', async t => {
  const f = await fixture(t);
  f.observePublication = async () => f.hostObservation;
  assert.throws(() => createTrustedSiteRemediationController({
    workspace: f.projectPath, runId: 'run', hostEvidence: f,
  }), error => error.code === 'SITE_REMEDIATION_HOST_OBSERVER_UNTRUSTED');
});

test('production Host evidence derives publication facts from the current local preview', async t => {
  const f = await fixture(t);
  const observed = await collectSiteRemediationHostEvidence(f);
  assert.equal(observed.publicationEvidenceDigest, f.expected.publicationEvidenceDigest);
});

test('Host publication observation binds exact HTTP observation artifact digests', async t => {
  const f = await fixture(t);
  assert.match(f.hostObservation.observationArtifactsDigest, /^[a-f0-9]{64}$/);
  assert.deepEqual(f.hostObservation.observationArtifacts.map(item => item.path),
    ['/', '/__host_browser__/', '/app/page.tsx', '/robots.txt', '/sitemap.xml']);
  f.serverState.root += '<!-- same policy, different observed bytes -->';
  await assert.rejects(() => collectSiteRemediationHostEvidence(f),
    error => error.code === 'PUBLICATION_HOST_OBSERVATION_INVALID');
});

test('Host publication observation fails closed when the local preview is unavailable', async t => {
  const f = await fixture(t);
  await f.previewStop();
  await assert.rejects(() => collectSiteRemediationHostEvidence(f),
    error => error.code === 'SITE_PREVIEW_SESSION_INVALID');
});

test('Host V2 observation digest changes when rendered DOM changes', async t => {
  const f = await fixture(t);
  const before = f.hostObservation;
  f.serverState.root = f.serverState.root.replace('</body>', '<div id="hydrated">ready</div></body>');
  const after = await observeCurrentPublication({ previewSession: f.previewSession,
    publicationUrl: f.publicationUrl, projectPath: f.projectPath,
    projectDigest: f.baseline.projectDigest, currentRoutes: ['/'],
    originalPublicationManifest: f.originalPublicationManifest });
  assert.notEqual(after.observationDigest, before.observationDigest);
  assert.notEqual(after.observationArtifacts.find(item => item.path === '/__host_browser__/').sha256,
    before.observationArtifacts.find(item => item.path === '/__host_browser__/').sha256);
});

test('Host browser observation rejects client-rendered draft links and hydrated navigation', async t => {
  for (const script of [
    `<script>document.body.append(Object.assign(document.createElement('a'),{href:'/draft',textContent:'Draft'}))</script>`,
    `<script>document.querySelector('nav').append(Object.assign(document.createElement('a'),{href:'/draft',textContent:'Draft'}))</script>`,
  ]) {
    const f = await fixture(t);
    f.serverState.root = f.serverState.root.replace('</body>', `${script}</body>`);
    await assert.rejects(() => collectSiteRemediationHostEvidence(f),
      error => error.code === 'PUBLICATION_HOST_OBSERVATION_INVALID');
  }
});

test('Host browser observation failure blocks acceptance', async t => {
  const f = await fixture(t);
  f.serverState.rootHeaders['content-disposition'] = 'attachment; filename=page.html';
  await assert.rejects(() => collectSiteRemediationHostEvidence(f),
    error => error.code === 'PUBLICATION_HOST_OBSERVATION_INVALID');
});

test('Host indexing policy rejects X-Robots-Tag and robots.txt conflicts', async t => {
  const header = await fixture(t);
  header.serverState.rootHeaders['x-robots-tag'] = 'index';
  await assert.rejects(() => collectSiteRemediationHostEvidence(header),
    error => error.code === 'PUBLICATION_HOST_OBSERVATION_INVALID');

  const robots = await fixture(t);
  robots.serverState.robots = 'User-agent: *\nDisallow: /\n';
  await assert.rejects(() => collectSiteRemediationHostEvidence(robots),
    error => error.code === 'PUBLICATION_HOST_OBSERVATION_INVALID');

  const wildcard = await fixture(t);
  wildcard.serverState.robots = 'User-agent: *\nDisallow: /*\n';
  await assert.rejects(() => observeCurrentPublication({
    previewSession: wildcard.previewSession, publicationUrl: wildcard.publicationUrl,
    projectPath: wildcard.projectPath, projectDigest: wildcard.baseline.projectDigest,
    currentRoutes: ['/'], originalPublicationManifest: wildcard.originalPublicationManifest,
  }),
    error => error.code === 'PUBLICATION_HOST_OBSERVATION_INVALID');
});

test('Host rejects unrelated or mismatched preview sessions', async t => {
  const accepted = await fixture(t);
  const unrelated = await fixture(t);
  accepted.previewSession = unrelated.previewSession;
  accepted.publicationUrl = unrelated.publicationUrl;
  await assert.rejects(() => collectSiteRemediationHostEvidence(accepted),
    error => error.code === 'SITE_PREVIEW_SESSION_INVALID');

  const forged = await fixture(t);
  forged.previewSession = { ...forged.previewSession };
  await assert.rejects(() => collectSiteRemediationHostEvidence(forged),
    error => error.code === 'SITE_PREVIEW_SESSION_INVALID');
});

test('Host observes a proven internal redirect without widening publication rights', async t => {
  const f = await fixture(t);
  f.serverState.redirects.set('/en', { status: 308, target: '/' });
  const observation = await observeCurrentPublication({ previewSession: f.previewSession,
    publicationUrl: f.publicationUrl, projectPath: f.projectPath,
    projectDigest: f.baseline.projectDigest, currentRoutes: ['/'],
    currentRedirects: [{ route: '/en', target: '/', status: 308,
      sourceFile: 'app/en/page.tsx' }],
    originalPublicationManifest: f.originalPublicationManifest });
  assert.deepEqual(observation.observedRoutes, ['/']);
  assert.ok(observation.observationArtifacts.some(item =>
    item.path === '/__host_redirect__/en'));

  f.serverState.redirects.set('/en', { status: 308, target: '/draft' });
  await assert.rejects(() => observeCurrentPublication({ previewSession: f.previewSession,
    publicationUrl: f.publicationUrl, projectPath: f.projectPath,
    projectDigest: f.baseline.projectDigest, currentRoutes: ['/'],
    currentRedirects: [{ route: '/en', target: '/', status: 308,
      sourceFile: 'app/en/page.tsx' }],
    originalPublicationManifest: f.originalPublicationManifest }),
  error => error.code === 'PUBLICATION_HOST_OBSERVATION_INVALID');
});
