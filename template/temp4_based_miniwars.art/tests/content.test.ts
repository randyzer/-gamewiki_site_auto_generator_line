import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getArticles, getArticle, discoverRoutes } from '../src/lib/content';
import { locales, localePath, parseRoute } from '../src/lib/i18n';
import { pageAlternates } from '../src/lib/seo';
import { getGuideEntries, getOpeningGuide } from '../src/lib/guides';
import { getMessages } from '../src/lib/messages';

test('every locale has a complete MDX opening guide and no /en duplicate URL', () => {
  for (const locale of locales) {
    const article = getArticle(locale, 'beginner-opening-guide');
    assert.ok(article);
    assert.ok(article.body.includes('##'));
    assert.ok(article.title && article.description && article.category && article.publishedAt);
    assert.equal(parseRoute(localePath(locale, '/guides')).locale, locale);
    assert.equal(discoverRoutes().some(r => r.pathname === localePath(locale, '/guides/beginner-opening-guide')), true);
  }
  assert.equal(localePath('en', '/'), '/');
  assert.equal(discoverRoutes().some(r => r.pathname.startsWith('/en')), false);
  assert.equal(parseRoute('/fr/guides').kind, 'not-found');
});

test('adding a valid MDX discovers its metadata, routes and category without a registry', async () => {
  const root = await mkdtemp(join(tmpdir(), 'codex-content-'));
  try {
    await mkdir(join(root, 'en'));
    await writeFile(join(root, 'en', 'new-field-report.mdx'), '---\ntitle: New field report\ndescription: A real discovered guide\ncategory: Economy\npublishedAt: 2026-10-12\n---\n## Field notes\nA newly added guide.');
    const articles = getArticles('en', root);
    assert.deepEqual(articles.map(a => a.slug), ['new-field-report']);
    assert.equal(articles[0].category, 'Economy');
    const messages = await getMessages('en');
    assert.ok(getGuideEntries('en', messages, root).some(entry => entry.slug === 'new-field-report' && !entry.preview));
    assert.throws(() => getOpeningGuide('en', root), /required beginner-opening-guide/);
    await writeFile(join(root, 'en', 'beginner-opening-guide.mdx'), '---\ntitle: Opening briefing\ndescription: The fixed beginner entry\ncategory: Beginner\npublishedAt: 2025-01-01\n---\nA valid guide without a heading.');
    assert.equal(getOpeningGuide('en', root).slug, 'beginner-opening-guide');
    assert.equal(getArticles('en', root)[0].slug, 'new-field-report');
    assert.ok(discoverRoutes(root).some(r => r.pathname === '/guides/new-field-report'));
    assert.ok(!discoverRoutes(root).some(r => r.pathname === '/de/guides/new-field-report'));
    const alternate = pageAlternates('en', '/guides/new-field-report', root);
    assert.equal(alternate.canonical, '/guides/new-field-report');
    assert.deepEqual(Object.keys(alternate.languages), ['en', 'x-default']);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('invalid metadata fails visibly instead of publishing a broken guide', async () => {
  const root = await mkdtemp(join(tmpdir(), 'codex-invalid-'));
  try {
    await mkdir(join(root, 'en'));
    await writeFile(join(root, 'en', 'bad.mdx'), '---\ntitle: Missing metadata\n---\nText');
    assert.throws(() => getArticles('en', root), /description/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
