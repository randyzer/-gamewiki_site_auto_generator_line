import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { localePath, guideHref, parseRoute, switchLocalePath } from '../lib/locales.ts';
import { discoverContentFiles, validateMetadata } from '../lib/content-files.ts';

test('the default language has one canonical path and other languages retain prefixes', () => {
  assert.equal(localePath('en', '/guides'), '/guides');
  for (const locale of ['de', 'pt-BR', 'es', 'zh-CN']) {
    assert.equal(localePath(locale, '/guides'), `/${locale}/guides`);
  }
  assert.deepEqual(parseRoute(['de', 'guides', 'midnight-evidence-developer']), {
    locale: 'de', type: 'article', slug: 'midnight-evidence-developer',
  });
  assert.equal(parseRoute(['xx', 'guides']), null);
});

test('localized navigation preserves article paths and distinguishes available content', () => {
  assert.equal(switchLocalePath('/de/guides/midnight-evidence-developer#notes', 'zh-CN'), '/zh-CN/guides/midnight-evidence-developer#notes');
  assert.equal(guideHref('de', { slug: 'new-article', available: true }), '/de/guides/new-article');
  assert.equal(guideHref('de', { slug: 'characters', available: false }), '/de/guides#characters');
});

test('MDX auto-discovery finds newly added articles without a registry', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'guide-content-'));
  try {
    await mkdir(path.join(root, 'en'));
    await writeFile(path.join(root, 'en', 'first.mdx'), 'First article');
    await writeFile(path.join(root, 'en', 'ignore.txt'), 'Unrelated');
    assert.deepEqual(await discoverContentFiles(root, 'en'), ['first']);
    await writeFile(path.join(root, 'en', 'new-guide.mdx'), 'Second article');
    assert.deepEqual(await discoverContentFiles(root, 'en'), ['first', 'new-guide']);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('MDX metadata rejects missing fields and invalid dates', () => {
  assert.throws(() => validateMetadata({ title: 'Case' }, 'broken-case'), /broken-case/);
  assert.throws(() => validateMetadata({ title: 'Case', description: 'Note', category: 'Guide', publishedAt: 'later' }, 'bad-date'), /publishedAt.*bad-date/);
});

test('all five language packs retain the core page density and one complete article', async () => {
  const { readFile } = await import('node:fs/promises');
  const { locales } = await import('../lib/locales.ts');
  for (const locale of locales) {
    const messages = JSON.parse(await readFile(new URL(`../messages/${locale}.json`, import.meta.url), 'utf8'));
    assert.equal(messages.aboutSections.length, 6, `${locale}: overview sections`);
    assert.equal(messages.mechanics.length, 4, `${locale}: mechanics`);
    assert.equal(messages.faq.length, 6, `${locale}: FAQ`);
    assert.equal(messages.facts.length, 8, `${locale}: facts`);
    assert.notEqual(messages.menuOpen, messages.menuClose);
    const slugs = await discoverContentFiles(path.resolve('content'), locale);
    assert.deepEqual(slugs, ['midnight-evidence-developer']);
    const source = await readFile(path.join('content', locale, `${slugs[0]}.mdx`), 'utf8');
    const exported = source.match(/export const metadata = (\{[\s\S]*?\n\});/);
    assert.ok(exported, `${locale}: real MDX metadata export`);
    validateMetadata(JSON.parse(exported[1]), `${locale}/${slugs[0]}`);
    const topics = JSON.parse(await readFile(path.join('messages', `${locale}-topics.json`), 'utf8'));
    assert.equal(new Set(topics.map((topic) => topic.slug)).size, 34);
    assert.equal(topics.length + slugs.length, 35);
  }
});
