import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

test('MDX discovery expands without a slug registry and rejects malformed metadata', async () => {
  const { discoverArticles, siteRoutes, alternatePaths } = await import('../src/lib/content.ts');
  const root = mkdtempSync(path.join(tmpdir(), 'spirit-atlas-content-'));
  try {
    mkdirSync(path.join(root, 'en/races'), { recursive: true });
    const article = (title) => `---\ntitle: "${title}"\ndescription: "An original test guide."\ncategory: "races"\npublishedAt: "2026-10-12"\n---\n\n## First section\n\nReal MDX content.\n`;
    writeFileSync(path.join(root, 'en/races/first.mdx'), article('First'));
    assert.equal(discoverArticles(root).length, 1);
    writeFileSync(path.join(root, 'en/races/second.mdx'), article('Second'));
    assert.deepEqual(discoverArticles(root).map(x => x.slug).sort(), ['first', 'second']);
    mkdirSync(path.join(root, 'de/races'), { recursive: true });
    writeFileSync(path.join(root, 'de/races/first.mdx'), article('Erster Guide'));
    mkdirSync(path.join(root, 'en/builds'), { recursive: true });
    writeFileSync(path.join(root, 'en/builds/new-path.mdx'), article('New path').replace('category: \"races\"', 'category: \"builds\"'));
    const expanded = discoverArticles(root);
    assert.ok(siteRoutes(expanded).includes('/builds/new-path'));
    assert.ok(siteRoutes(expanded).includes('/builds'));
    assert.deepEqual(alternatePaths('/races/first', expanded), { en: '/races/first', de: '/de/races/first', 'x-default': '/races/first' });
    assert.deepEqual(alternatePaths('/races/second', expanded), { en: '/races/second', 'x-default': '/races/second' });
    writeFileSync(path.join(root, 'en/races/broken.mdx'), '---\ntitle: Missing metadata\n---\n');
    assert.throws(() => discoverArticles(root), /metadata/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('default URLs are unique and only existing translations become alternates', async () => {
  const { discoverArticles, siteRoutes, alternatePaths } = await import('../src/lib/content.ts');
  const { locales, localizedPath } = await import('../src/lib/i18n.ts');
  assert.equal(localizedPath('en', '/races'), '/races');
  const articles = discoverArticles();
  for (const locale of locales) {
    assert.ok(articles.some(x => x.locale === locale && x.slug === 'shinigami'));
    assert.ok(siteRoutes(articles).includes(localizedPath(locale, '/races')));
  }
  const routes = siteRoutes(articles);
  assert.equal(new Set(routes).size, routes.length);
  assert.ok(routes.every(x => !x.startsWith('/en')));
  for (const article of articles) {
    const alternates = alternatePaths(`/${article.category}/${article.slug}`, articles);
    assert.ok(Object.values(alternates).every(x => routes.includes(x)));
  }
});
