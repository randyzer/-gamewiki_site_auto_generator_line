import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { discoverContent, allRoutes, headings } from '../src/lib/content';
import { localePath, parsePath, locales } from '../src/lib/i18n';
import { alternatePaths } from '../src/lib/seo';

const valid = '---\ntitle: A real guide\ndescription: A complete guide for a first session.\ncategory: Guides\npublishedAt: "2026-10-12"\n---\n\n## First decision\n\nOriginal content.\n\n## First decision\n\nAnother decision.';
test('default locale has one URL and unknown locale paths fail closed', () => {
  assert.equal(localePath('en', 'guides/how-to-play'), '/guides/how-to-play/');
  assert.equal(localePath('zh-CN', 'guides'), '/zh-CN/guides/');
  assert.deepEqual(parsePath(['de', 'guides']), { locale: 'de', slug: 'guides' });
  assert.equal(parsePath(['fr', 'guides']), null);
  assert.equal(parsePath(['guides', '..', 'private']), null);
});
test('a new MDX adds its route and only existing translations become alternates', async () => {
  const root = await mkdtemp(join(tmpdir(), 'quarry-mdx-'));
  try {
    for (const locale of ['en', 'de']) {
      await mkdir(join(root, locale, 'guides'), { recursive: true });
      await writeFile(join(root, locale, 'guides', 'extra.mdx'), valid);
    }
    const docs = discoverContent(root);
    assert.equal(docs.length, 2);
    const routes = allRoutes(docs);
    for (const locale of locales) assert.ok(routes.includes(localePath(locale)));
    assert.ok(routes.includes('/guides/extra/'));
    assert.ok(routes.includes('/de/guides/extra/'));
    assert.ok(!routes.includes('/guides/missing/'));
    assert.deepEqual(alternatePaths('guides/extra', docs), { en: '/guides/extra/', de: '/de/guides/extra/', 'x-default': '/guides/extra/' });
    await writeFile(join(root, 'en', 'guides', 'new.mdx'), valid);
    assert.ok(allRoutes(discoverContent(root)).includes('/guides/new/'));
  } finally { await rm(root, { recursive: true, force: true }); }
});
test('invalid metadata stops discovery rather than publishing broken content', async () => {
  const root = await mkdtemp(join(tmpdir(), 'quarry-invalid-'));
  try {
    await mkdir(join(root, 'en', 'guides'), { recursive: true });
    await writeFile(join(root, 'en', 'guides', 'bad.mdx'), '---\ntitle: Missing fields\n---\nContent');
    assert.throws(() => discoverContent(root), /description/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test('heading anchors are deterministic and duplicate headings remain unique', () => {
  assert.deepEqual(headings(valid.split('---')[2]), [{ text: 'First decision', id: 'first-decision' }, { text: 'First decision', id: 'first-decision-2' }]);
});
test('numbered headings cannot collide with duplicate-heading suffixes', () => {
  const ids = headings('## Foo\n## Foo\n## Foo-2\n## Foo\n## Foo-3').map(heading => heading.id);
  assert.equal(new Set(ids).size, ids.length);
});
