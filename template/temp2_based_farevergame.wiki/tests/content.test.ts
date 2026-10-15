import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { discoverArticles } from '../src/lib/content';

test('new MDX files are discovered by locale and path without a registry', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'aurelia-content-'));
  try {
    mkdirSync(path.join(root, 'en', 'extra'), { recursive: true });
    writeFileSync(path.join(root, 'en', 'extra', 'field-notes.mdx'), '---\ntitle: Field notes\ndescription: A new complete guide\ncategory: walkthroughs\npublishedAt: 2026-10-12\n---\n## Explore\nRead the map.');
    const found = discoverArticles(root);
    assert.ok(found.some(a => a.locale === 'en' && a.slug === 'extra/field-notes' && a.title === 'Field notes'));
    writeFileSync(path.join(root, 'en', 'second.mdx'), '---\ntitle: Another guide\ndescription: Another real guide\ncategory: walkthroughs\npublishedAt: 2026-10-12\n---\n## Begin\nTake a break.');
    assert.ok(discoverArticles(root).some(a => a.slug === 'second'));
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('invalid metadata fails with an actionable filename', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'aurelia-invalid-'));
  try {
    mkdirSync(path.join(root, 'en'));
    writeFileSync(path.join(root, 'en', 'invalid.mdx'), '---\ntitle: Incomplete\n---\nBody');
    assert.throws(() => discoverArticles(root), /invalid\.mdx.*description/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('real articles participate in route discovery and SEO without preview URLs', async () => {
  const { discoverRoutes } = await import('../src/lib/routes');
  const { localPath, locales, resolvePath } = await import('../src/lib/i18n');
  const { pageMetadata } = await import('../src/lib/seo');
  const routes = discoverRoutes();
  assert.equal(new Set(routes.map(r => r.url)).size, routes.length);
  for (const a of discoverArticles()) {
    const url = localPath(a.locale as typeof locales[number], `guide/${a.slug}`);
    assert.ok(routes.some(r => r.url === url));
    const meta = pageMetadata(a.locale as typeof locales[number], `guide/${a.slug}`, a.title, 'description' in a ? a.description : 'Guide');
    assert.ok(String(meta.alternates?.canonical).endsWith(url));
    assert.ok(meta.alternates?.languages?.['x-default']);
  }
  assert.ok(routes.every(r => !r.url.includes('preview')));
  assert.equal(resolvePath(['en']), null);
  assert.equal(resolvePath(['unknown']), null);
  for (const l of locales) assert.equal(resolvePath(localPath(l).split('/').filter(Boolean))?.locale, l);
});

test('language dictionaries have identical key structure and localized preview states', async () => {
  const { getMessages } = await import('../src/lib/messages');
  const { locales } = await import('../src/lib/i18n');
  const base = Object.keys(getMessages('en')).sort();
  for (const locale of locales) {
    const m = getMessages(locale);
    assert.deepEqual(Object.keys(m).sort(), base);
    assert.ok(m.preview && m.listTitle && m.articleDescription);
    assert.ok(getMessages(locale).previews.every(p => !('href' in p)));
  }
});
