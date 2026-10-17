import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createRoutePublicationManifest } from '../src/route-publication.mjs';
import { discoverProjectRoutes } from '../src/route-discovery.mjs';

const context = {
  runId: 'route-run', inputs: { gameIdentity: 'Fixture', siteRevision: 'rev-1', domain: 'fixture.test' },
  researchHandoff: { reference: { sha256: 'a'.repeat(64) }, manifest: { materials: [
    { keyword: 'Complete', status: 'COMPLETED', publicationDisposition: 'PUBLISH' },
    { keyword: 'Partial', status: 'PARTIAL', publicationDisposition: 'DRAFT_ONLY' },
    { keyword: 'Blocked', status: 'BLOCKED', publicationDisposition: 'OMIT' },
  ] } },
};
const content = () => ({ schema_version: 1, pages: [
  { keyword: 'Complete', material_status: 'COMPLETED', outcome: 'PUBLISHED', route: '/complete', source_file: 'complete.html' },
  { keyword: 'Partial', material_status: 'PARTIAL', outcome: 'DRAFT', route: '/draft', source_file: 'draft.html' },
  { keyword: 'Blocked', material_status: 'BLOCKED', outcome: 'BLOCKED' },
] });

test('route publication maps every handoff status to its only allowed disposition', () => {
  const manifest = createRoutePublicationManifest(context, content());
  assert.deepEqual(manifest.pages.slice(0, 3).map(page =>
    [page.materialStatus, page.disposition, page.noindexRequired]), [
    ['COMPLETED', 'PUBLISH', false],
    ['PARTIAL', 'DRAFT_ONLY', true],
    ['BLOCKED', 'OMIT', false],
  ]);
  assert.deepEqual(manifest.counts, { publish: 2, draftOnly: 1, omit: 1 });
  assert.equal(manifest.researchHandoffSha256, 'a'.repeat(64));
});

test('route publication rejects publishing partial or exposing blocked research', () => {
  const partial = content(); partial.pages[1].outcome = 'PUBLISHED';
  assert.throws(() => createRoutePublicationManifest(context, partial), /status\/outcome mismatch/);
  const blocked = content(); blocked.pages[2].route = '/blocked'; blocked.pages[2].source_file = 'blocked.html';
  assert.throws(() => createRoutePublicationManifest(context, blocked), /blocked keyword exposes/);
});

test('route discovery finds static source and rendered routes and fails closed on dynamic routes', async t => {
  const project = await mkdtemp(resolve('.route-discovery-test-'));
  t.after(() => rm(project, { recursive: true, force: true }));
  for (const directory of ['app/guides', 'app/[slug]', 'src/pages/help', 'dist/rendered'])
    await mkdir(join(project, directory), { recursive: true });
  await writeFile(join(project, 'app/page.tsx'), 'fixture');
  await writeFile(join(project, 'app/guides/page.tsx'), 'fixture');
  await writeFile(join(project, 'app/[slug]/page.tsx'), 'fixture');
  await writeFile(join(project, 'src/pages/help/index.astro'), 'fixture');
  await writeFile(join(project, 'dist/rendered/index.html'), 'fixture');
  const found = await discoverProjectRoutes(project);
  assert.deepEqual(found.routes.sort(), ['/', '/guides', '/help', '/rendered']);
  assert.deepEqual(found.unprovable, ['app/[slug]/page.tsx']);
});
