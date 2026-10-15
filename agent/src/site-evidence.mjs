import { readArtifact, sha256, treeFiles, safePath } from './files.mjs';
import { join } from 'node:path';
import { STAGE } from './stages.mjs';

export const AUDIT_VIEWPORTS = Object.freeze([360, 390, 768, 1024, 1440, 1920]);
export function siteRoute(route) {
  if (typeof route !== 'string' || !route.startsWith('/') || route.startsWith('//') || route.includes('\\') || /[\x00-\x20?#]/.test(route))
    throw Error(`SITE_ROUTE_INVALID: ${JSON.stringify(route)}`);
  const url = new URL(route, 'http://127.0.0.1');
  if (url.origin !== 'http://127.0.0.1' || url.pathname !== route) throw Error(`SITE_ROUTE_INVALID: ${route}`);
  return route;
}
export async function publishedRoutes(context) {
  const artifact = context.upstream?.find(stage => stage.skill === STAGE.CONTENT_INTEGRATION)?.artifacts.find(item => item.kind === 'CONTENT_PAGE_MANIFEST.json');
  if (!artifact) throw Error(`SITE_CONTENT_MANIFEST_MISSING: run ${context.runId}`);
  const manifest = JSON.parse(await readArtifact(artifact.path, [context.runDirectory, context.inputs.projectPath]));
  if (!Array.isArray(manifest.pages)) throw Error(`SITE_CONTENT_MANIFEST_INVALID: ${artifact.path}`);
  return [...new Set(['/', ...manifest.pages.filter(page => page.outcome === 'PUBLISHED').map(page => siteRoute(page.route))])];
}
export async function snapshotSiteEvidence(directory) {
  await safePath(directory, [directory]);
  const paths = await treeFiles(directory);
  if (!paths.length) throw Error(`HOST_EVIDENCE_EMPTY: ${directory}`);
  const files = await Promise.all(paths.map(async path => ({ path, sha256: sha256(await readArtifact(path, [directory])) })));
  return { directory, files };
}
export async function verifySiteEvidence(bundle) {
  for (const file of bundle.files) {
    try {
      if (!/^[a-f0-9]{64}$/.test(file.sha256) || sha256(await readArtifact(file.path, [bundle.directory])) !== file.sha256) throw Error();
    } catch { throw Error(`HOST_EVIDENCE_CHANGED: ${file.path}`); }
  }
  // Reports may be added beside the evidence; screenshots remain host-owned.
  const screenshots = bundle.files.filter(file => file.path.endsWith('.png')).map(file => file.path).sort();
  if (screenshots.length) {
    const actual = (await treeFiles(join(bundle.directory, 'screenshots'))).filter(path => path.endsWith('.png')).sort();
    if (JSON.stringify(actual) !== JSON.stringify(screenshots)) throw Error(`HOST_EVIDENCE_CHANGED: screenshot inventory in ${bundle.directory}`);
  }
}
