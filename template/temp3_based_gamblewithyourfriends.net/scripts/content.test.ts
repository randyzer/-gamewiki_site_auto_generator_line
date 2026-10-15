import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { getArticles } from '../lib/content';
import { locales, pathFor, parseRoute } from '../lib/site';

const valid = (title: string) => `---\ntitle: ${title}\ndescription: An original guide for a coordinated team.\ncategory: Basics\npublishedAt: '2026-10-12'\n---\n\n## First steps\n\nRead the shared bank before placing a bet.`;
function withContent(run: (root: string) => void) {
  const root = mkdtempSync(path.join(tmpdir(), 'fieldnotes-test-'));
  try { for (const locale of locales) mkdirSync(path.join(root, locale)); run(root); }
  finally { rmSync(root, { recursive: true, force: true }); }
}
test('default language has one URL and other locales keep the same slug', () => {
  for (const locale of locales) {
    assert.equal(pathFor(locale, 'beginner-guide'), locale === 'en' ? '/beginner-guide/' : `/${locale}/beginner-guide/`);
    assert.deepEqual(parseRoute(locale === 'en' ? ['beginner-guide'] : [locale, 'beginner-guide']), {locale,slug:'beginner-guide'});
  }
  assert.deepEqual(parseRoute([]), { locale: 'en', slug: '' });
  assert.equal(parseRoute(['en']), null);
  assert.deepEqual(parseRoute(['qa']), { locale: 'en', slug: 'qa' });
});
test('new valid MDX files are discovered without a registry or fixed content count', () => withContent(root => {
  writeFileSync(path.join(root, 'en', 'first.mdx'), valid('First guide'));
  assert.equal(getArticles('en', root).find(a => a.slug === 'first')?.title, 'First guide');
  writeFileSync(path.join(root, 'en', 'second.mdx'), valid('Second guide'));
  assert.ok(getArticles('en', root).some(a => a.slug === 'second'));
  assert.equal(getArticles('de', root).length, 0);
}));
test('nested MDX slugs are discovered and unrelated files are ignored', () => withContent(root => {
  mkdirSync(path.join(root, 'en', 'games'));
  writeFileSync(path.join(root, 'en', 'games', 'table.mdx'), valid('Table guide'));
  writeFileSync(path.join(root, 'en', 'preview.json'), '{}');
  assert.ok(getArticles('en', root).some(a => a.slug === 'games/table'));
  assert.ok(getArticles('en', root).every(a => a.slug !== 'preview'));
}));
test('invalid metadata fails explicitly instead of publishing incomplete pages', () => withContent(root => {
  writeFileSync(path.join(root, 'en', 'broken.mdx'), '---\ntitle: Broken\n---\nBody');
  assert.throws(() => getArticles('en', root), /description/);
}));
test('invalid dates fail explicitly', () => withContent(root => {
  writeFileSync(path.join(root, 'en', 'broken.mdx'), valid('Broken').replace('2026-10-12','not-a-date'));
  assert.throws(() => getArticles('en', root), /publishedAt/);
}));
test('locale prefixes cannot be used as article directories', () => withContent(root => {
  mkdirSync(path.join(root, 'en', 'de'));
  writeFileSync(path.join(root, 'en', 'de', 'table.mdx'), valid('Ambiguous route'));
  assert.throws(() => getArticles('en', root), /reserved slug/);
}));
