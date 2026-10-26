import { lstat, readFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';
import { canonicalJson } from './contracts/canonical-json.mjs';
import { ContractError } from './contracts/errors.mjs';
import { sha256 } from './files.mjs';
import { sourceFiles } from './project-baseline.mjs';
import { projectContentDigest } from './project-content-digest.mjs';
import { discoverProjectRoutes } from './route-discovery.mjs';
import {
  verifyCurrentSiteBaseline,
  verifyImmutableIntegrationLineage,
  verifySiteAcceptanceIdentity,
} from './site-acceptance-contract.mjs';
import { verifyEffectivePublication } from './route-publication.mjs';
import { createHostPublicationObservation } from './route-publication.mjs';
import { STAGE, findStage } from './stages.mjs';

const fail = (code, message) => new ContractError(code, message);
const evidenceFields = Object.freeze([
  'lineageDigest', 'researchApprovalDigest', 'oldProjectDigest', 'newProjectDigest',
  'baselineDigest', 'remediationScopeDigest', 'publicationEvidenceDigest',
  'attestationDigest', 'acceptanceRevision', 'protectedInputsDigest',
  'operatorSummarySha256',
]);
const canonical = values => [...values]
  .sort((left, right) => canonicalJson(left).localeCompare(canonicalJson(right)));

const decodeHtml = value => value.replace(/&amp;/g, '&').replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'");

function localPublicationOrigin(value) {
  let url;
  try { url = new URL(value); }
  catch { throw fail('PUBLICATION_HOST_OBSERVATION_INVALID', 'Local publication URL is invalid'); }
  if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) ||
      url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw fail('PUBLICATION_HOST_OBSERVATION_INVALID',
      'Host publication observation requires an exact local preview origin');
  }
  return url.origin;
}

function pageLinks(html, base, selector = null) {
  const sections = selector === 'nav'
    ? [...html.matchAll(/<nav\b[^>]*>([\s\S]*?)<\/nav>/gi)].map(match => match[1])
    : [html];
  const routes = [];
  for (const section of sections) {
    for (const match of section.matchAll(/<a\b[^>]*\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)) {
      try {
        const url = new URL(decodeHtml(match[1] ?? match[2] ?? match[3]), base);
        if (url.origin === new URL(base).origin && !url.username && !url.password)
          routes.push(url.pathname.replace(/\/+$/, '') || '/');
      } catch { /* Invalid links remain outside the trusted route set. */ }
    }
  }
  return [...new Set(routes)].sort();
}

function robotsPolicy(html) {
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attributes = Object.fromEntries([...match[0].matchAll(
      /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g,
    )].map(attribute => [attribute[1].toLowerCase(), attribute[2] ?? attribute[3]]));
    if (['robots', 'googlebot'].includes(attributes.name?.toLowerCase())) {
      if (/(?:^|[,\s])(noindex|none)(?:$|[,\s])/i.test(attributes.content ?? '')) return 'noindex';
      if (/(?:^|[,\s])index(?:$|[,\s])/i.test(attributes.content ?? '')) return 'index';
    }
  }
  return 'absent';
}

async function observeCurrentPublication({ publicationUrl, projectDigest, currentRoutes,
  originalPublicationManifest }) {
  const origin = localPublicationOrigin(publicationUrl);
  const artifacts = new Map();
  const request = async path => {
    try {
      const response = await fetch(new URL(path, origin), {
        redirect: 'manual', signal: AbortSignal.timeout(30000),
      });
      const text = await response.text();
      artifacts.set(path, { path, status: response.status, sha256: sha256(Buffer.from(text)) });
      return { status: response.status, text };
    } catch {
      throw fail('PUBLICATION_HOST_OBSERVATION_INVALID',
        `Current local preview could not be observed: ${path}`);
    }
  };
  const robots = await request('/robots.txt');
  if (robots.status !== 200) {
    throw fail('PUBLICATION_HOST_OBSERVATION_INVALID',
      'Current local preview robots.txt could not be observed');
  }
  const sitemap = await request('/sitemap.xml');
  if (sitemap.status !== 200) {
    throw fail('PUBLICATION_HOST_OBSERVATION_INVALID',
      'Current local preview sitemap could not be observed');
  }
  const sitemapRoutes = new Set();
  for (const match of sitemap.text.matchAll(/<loc\b[^>]*>([\s\S]*?)<\/loc>/gi)) {
    try {
      const url = new URL(decodeHtml(match[1].trim()), origin);
      if (url.origin === origin) sitemapRoutes.add(url.pathname.replace(/\/+$/, '') || '/');
    } catch { /* Invalid sitemap entries cannot prove a route. */ }
  }
  const responses = new Map();
  for (const route of currentRoutes) {
    const response = await request(route);
    if (response.status !== 200) {
      throw fail('PUBLICATION_HOST_OBSERVATION_INVALID',
        `Current local preview route did not return HTTP 200: ${route}`);
    }
    responses.set(route, response.text);
  }
  const policy = new Map(originalPublicationManifest.pages
    .filter(page => page.route).map(page => [page.route, page]));
  const publicRoutes = currentRoutes.filter(route => policy.get(route)?.disposition === 'PUBLISH');
  const publicLinks = new Set(publicRoutes.flatMap(route => pageLinks(
    responses.get(route), new URL(route, origin),
  )));
  const navigation = new Set(currentRoutes.flatMap(route => pageLinks(
    responses.get(route), new URL(route, origin), 'nav',
  )));
  const pages = [];
  for (const route of currentRoutes) {
    const sourceFile = policy.get(route)?.sourceFile;
    let sourceFileExposed = false;
    if (sourceFile) {
      const sourcePath = '/' + sourceFile.replace(/^\/+/, '');
      sourceFileExposed = (await request(sourcePath)).status === 200;
    }
    pages.push({ route, robots: robotsPolicy(responses.get(route)),
      inSitemap: sitemapRoutes.has(route), inNavigation: navigation.has(route),
      linkedFromPublicPages: publicLinks.has(route), sourceFileExposed,
      dynamicProof: 'STATIC' });
  }
  return createHostPublicationObservation({ projectDigest, observedRoutes: currentRoutes,
    pages, indexingAuthorization: 'NOT_CLEARED', validatorVersion: 'host-route-v1',
    observationArtifacts: [...artifacts.values()] });
}

function verifyManifestLineage(lineage, manifest) {
  if (!manifest) return;
  const research = findStage(manifest.stages, STAGE.KEYWORD_RESEARCH);
  const template = findStage(manifest.stages, STAGE.TEMPLATE_SELECTION);
  const integration = findStage(manifest.stages, STAGE.CONTENT_INTEGRATION);
  const publication = integration.artifacts.find(item =>
    item.kind === 'ROUTE_PUBLICATION_MANIFEST.json');
  const stage3Artifacts = template.artifacts.map(item => item.sha256).sort();
  const stage4Artifacts = integration.artifacts.map(item => item.sha256).sort();
  if (lineage.runId !== manifest.runId ||
      lineage.siteRevision !== manifest.inputs?.siteRevision ||
      lineage.researchHandoffSha256 !== research.checkpoint?.researchHandoff?.sha256 ||
      lineage.researchApprovalDigest !== research.checkpoint?.researchHandoff?.approvalSha256 ||
      canonicalJson(lineage.stage3ArtifactDigests) !== canonicalJson(stage3Artifacts) ||
      canonicalJson(lineage.stage4ArtifactDigests) !== canonicalJson(stage4Artifacts) ||
      lineage.originalPublicationManifestSha256 !== publication?.sha256 ||
      lineage.originalLaunchReadinessBindingDigest !==
        integration.checkpoint?.launchReadiness?.bindingDigest) {
    throw fail('SITE_REMEDIATION_LINEAGE_CHANGED',
      'Immutable Stage 2 through Stage 4 evidence differs from the reviewed lineage');
  }
}

async function verifyProtectedInputs(projectPath, expected) {
  const current = [];
  for (const entry of expected) {
    const path = resolve(projectPath, entry.path);
    const rel = relative(projectPath, path);
    if (rel === '..' || rel.startsWith('../') || isAbsolute(rel)) {
      throw fail('SITE_REMEDIATION_PROTECTED_INPUT_CHANGED',
        'Protected input escapes the project');
    }
    let info;
    try { info = await lstat(path); }
    catch {
      throw fail('SITE_REMEDIATION_PROTECTED_INPUT_CHANGED',
        `Protected input is missing: ${entry.path}`);
    }
    if (!info.isFile() || info.isSymbolicLink() || info.nlink !== 1) {
      throw fail('SITE_REMEDIATION_PROTECTED_INPUT_CHANGED',
        `Protected input is not a regular unlinked file: ${entry.path}`);
    }
    current.push({ path: entry.path, mode: info.mode & 0o777, byteLength: info.size,
      sha256: sha256(await readFile(path)) });
  }
  if (canonicalJson(canonical(current)) !== canonicalJson(expected)) {
    throw fail('SITE_REMEDIATION_PROTECTED_INPUT_CHANGED',
      'Protected research input identity changed');
  }
}

export async function collectSiteRemediationHostEvidence({ projectPath, lineage, baseline,
  publicationEvidence: evidenceBody, acceptanceIdentity, attestation, expected,
  originalPublicationManifest, publicationUrl, observePublication, manifest = null }) {
  verifyImmutableIntegrationLineage(lineage);
  verifyManifestLineage(lineage, manifest);
  verifyCurrentSiteBaseline(baseline);
  verifySiteAcceptanceIdentity(acceptanceIdentity);
  if (baseline.projectPath !== projectPath || evidenceBody.lineageDigest !== lineage.lineageDigest ||
      acceptanceIdentity.lineageDigest !== lineage.lineageDigest || !expected || evidenceFields.some(field =>
    typeof expected[field] !== 'string')) {
    throw fail('SITE_REMEDIATION_HOST_EVIDENCE_INVALID',
      'Host evidence inputs are incomplete');
  }
  await verifyProtectedInputs(projectPath, baseline.protectedInputs);
  const currentFiles = (await sourceFiles(projectPath)).map(file => ({ path: file.path,
    mode: file.mode, byteLength: file.size, sha256: file.sha256 }));
  const currentProjectDigest = await projectContentDigest(projectPath);
  if (canonicalJson(canonical(currentFiles)) !== canonicalJson(baseline.files) ||
      currentProjectDigest !== baseline.projectDigest) {
    throw fail('SITE_REMEDIATION_PROJECT_BASELINE_CHANGED',
      'Current project differs from the accepted complete baseline');
  }
  const discovered = await discoverProjectRoutes(projectPath);
  if (discovered.unprovable.length) {
    throw fail('SITE_REMEDIATION_ROUTE_UNPROVABLE',
      `Current route inventory contains unprovable entries: ${discovered.unprovable.join(', ')}`);
  }
  const routes = [...discovered.routes].sort();
  if (canonicalJson(routes) !== canonicalJson(baseline.routes)) {
    throw fail('SITE_REMEDIATION_ROUTE_INVENTORY_CHANGED',
      'Current route inventory differs from the accepted baseline');
  }
  if (observePublication !== undefined) {
    throw fail('PUBLICATION_HOST_OBSERVATION_INVALID',
      'Caller-supplied publication observation providers are forbidden');
  }
  const hostObservation = await observeCurrentPublication({ publicationUrl,
    projectDigest: currentProjectDigest, currentRoutes: routes, originalPublicationManifest });
  verifyEffectivePublication({ originalManifest: originalPublicationManifest, evidenceBody,
    attestation, acceptanceIdentity, currentRoutes: routes, hostObservation,
    projectDigest: currentProjectDigest });
  const observed = {
    ...expected,
    lineageDigest: evidenceBody.lineageDigest,
    researchApprovalDigest: evidenceBody.researchApprovalDigest,
    newProjectDigest: currentProjectDigest,
    baselineDigest: baseline.baselineDigest,
    remediationScopeDigest: evidenceBody.remediationScopeDigest,
    publicationEvidenceDigest: evidenceBody.publicationEvidenceDigest,
    attestationDigest: attestation.attestationDigest,
    acceptanceRevision: acceptanceIdentity.acceptanceRevision,
    protectedInputsDigest: baseline.protectedInputsDigest,
  };
  if (evidenceFields.some(field => observed[field] !== expected[field])) {
    throw fail('SITE_REMEDIATION_EVIDENCE_STALE',
      'Host-recomputed evidence differs from the approved snapshot');
  }
  return Object.freeze({ ...observed, immutableObjects: Object.freeze({
    baseline, publicationEvidence: evidenceBody, attestation,
  }) });
}
