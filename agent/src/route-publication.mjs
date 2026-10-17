import { readArtifact, parseArtifactJson } from './files.mjs';
import { STAGE, findStage } from './stages.mjs';

export const ROUTE_PUBLICATION_KIND = 'ROUTE_PUBLICATION_MANIFEST_V1';
export const ROUTE_PUBLICATION_ARTIFACT = 'ROUTE_PUBLICATION_MANIFEST.json';
const assert = (condition, detail) => { if (!condition) throw Error('ROUTE_PUBLICATION_INVALID: ' + detail); };

export function publicationRoute(value) {
  assert(typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') &&
    !/[?#\s\\]/.test(value), 'invalid route');
  const url = new URL(value, 'https://route.test');
  assert(url.pathname === value && !/%(?:2e|2f|5c)/i.test(value), 'unsafe route');
  return value.replace(/\/+$/, '') || '/';
}

function expectedDisposition(status) {
  if (status === 'COMPLETED') return { disposition: 'PUBLISH', outcome: 'PUBLISHED' };
  if (status === 'PARTIAL') return { disposition: 'DRAFT_ONLY', outcome: 'DRAFT' };
  if (status === 'BLOCKED') return { disposition: 'OMIT', outcome: 'BLOCKED' };
  throw Error('ROUTE_PUBLICATION_INVALID: unknown material status');
}

export function createRoutePublicationManifest(context, content) {
  assert(content?.schema_version === 1 && Array.isArray(content.pages), 'content manifest');
  const handoff = context.researchHandoff?.manifest;
  const materials = handoff ? new Map(handoff.materials.map(item => [item.keyword, item])) : null;
  if (materials) assert(materials.size === content.pages.length, 'handoff keyword coverage');
  const routes = new Set(), keywords = new Set();
  const pages = content.pages.map(page => {
    assert(typeof page.keyword === 'string' && page.keyword && !keywords.has(page.keyword),
      'duplicate keyword');
    keywords.add(page.keyword);
    const material = materials?.get(page.keyword);
    const status = material?.status ?? page.material_status;
    const expected = expectedDisposition(status);
    assert(page.material_status === status && page.outcome === expected.outcome,
      `status/outcome mismatch for ${page.keyword}`);
    if (material) assert(material.publicationDisposition === expected.disposition,
      `handoff disposition mismatch for ${page.keyword}`);
    if (status === 'BLOCKED') assert(!page.route && !page.source_file,
      `blocked keyword exposes a route or source: ${page.keyword}`);
    if (status === 'COMPLETED') assert(page.route && page.source_file,
      `completed keyword is not published: ${page.keyword}`);
    if (status === 'PARTIAL') assert(Boolean(page.route) === Boolean(page.source_file),
      `draft route/source mismatch: ${page.keyword}`);
    const route = page.route ? publicationRoute(page.route) : null;
    if (route) { assert(!routes.has(route), `duplicate route ${route}`); routes.add(route); }
    return { kind: 'KEYWORD', keyword: page.keyword, materialStatus: status,
      disposition: expected.disposition, route, sourceFile: page.source_file ?? null,
      noindexRequired: status === 'PARTIAL' && Boolean(route) };
  });
  for (const page of content.site_pages ?? []) {
    assert(page?.outcome === 'PUBLISHED' && page.route && page.source_file,
      'site page must be explicitly published');
    const route = publicationRoute(page.route);
    assert(!routes.has(route), `duplicate site route ${route}`); routes.add(route);
    pages.push({ kind: 'SITE', keyword: null, materialStatus: null, disposition: 'PUBLISH',
      route, sourceFile: page.source_file, noindexRequired: false });
  }
  if (!routes.has('/')) pages.push({ kind: 'SITE', keyword: null, materialStatus: null,
    disposition: 'PUBLISH', route: '/', sourceFile: null, noindexRequired: false });
  assert(!materials || [...materials.keys()].every(keyword => keywords.has(keyword)),
    'handoff contains an unrepresented keyword');
  return {
    kind: ROUTE_PUBLICATION_KIND,
    schemaVersion: 1,
    runId: context.runId,
    gameIdentity: context.inputs.gameIdentity,
    siteRevision: context.inputs.siteRevision,
    domain: context.inputs.domain,
    researchHandoffSha256: context.researchHandoff?.reference?.sha256 ?? null,
    pages,
    counts: {
      publish: pages.filter(page => page.disposition === 'PUBLISH').length,
      draftOnly: pages.filter(page => page.disposition === 'DRAFT_ONLY').length,
      omit: pages.filter(page => page.disposition === 'OMIT').length,
    },
  };
}

export async function routePublicationManifest(context) {
  const stage = findStage(context.upstream, STAGE.CONTENT_INTEGRATION);
  const artifact = stage.artifacts.find(item => item.kind === ROUTE_PUBLICATION_ARTIFACT);
  assert(artifact, `missing ${ROUTE_PUBLICATION_ARTIFACT}`);
  const manifest = parseArtifactJson(await readArtifact(artifact.path,
    [context.runDirectory, context.inputs.projectPath]), artifact.path);
  assert(manifest.kind === ROUTE_PUBLICATION_KIND && manifest.schemaVersion === 1 &&
    manifest.runId === context.runId && manifest.gameIdentity === context.inputs.gameIdentity &&
    manifest.siteRevision === context.inputs.siteRevision && manifest.domain === context.inputs.domain &&
    manifest.researchHandoffSha256 === (context.researchHandoff?.reference?.sha256 ?? null) &&
    Array.isArray(manifest.pages) && manifest.pages.length > 0,
  'manifest identity');
  const routes = new Set(), counts = { publish: 0, draftOnly: 0, omit: 0 };
  for (const page of manifest.pages) {
    assert(['PUBLISH', 'DRAFT_ONLY', 'OMIT'].includes(page.disposition), 'unknown disposition');
    if (page.disposition === 'PUBLISH') counts.publish++;
    if (page.disposition === 'DRAFT_ONLY') counts.draftOnly++;
    if (page.disposition === 'OMIT') counts.omit++;
    assert(page.disposition !== 'OMIT' || (!page.route && !page.sourceFile),
      'omitted page exposes route/source');
    assert(page.disposition !== 'PUBLISH' || page.route, 'published page lacks route');
    assert(page.disposition !== 'DRAFT_ONLY' || !page.route || page.noindexRequired === true,
      'draft route lacks noindex requirement');
    if (page.route) {
      const route = publicationRoute(page.route);
      assert(!routes.has(route), `duplicate manifest route ${route}`); routes.add(route);
    }
  }
  assert(JSON.stringify(manifest.counts) === JSON.stringify(counts), 'manifest counts');
  return manifest;
}

export async function publicationRoutes(context, { includeDrafts = false } = {}) {
  const manifest = await routePublicationManifest(context);
  const allowed = includeDrafts ? new Set(['PUBLISH', 'DRAFT_ONLY']) : new Set(['PUBLISH']);
  return [...new Set(manifest.pages.filter(page => allowed.has(page.disposition) && page.route)
    .map(page => publicationRoute(page.route)))];
}
