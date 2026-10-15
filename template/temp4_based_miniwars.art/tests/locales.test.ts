import test from 'node:test';
import assert from 'node:assert/strict';
import { getMessages } from '../src/lib/messages';
import { locales } from '../src/lib/i18n';
import { getArticles } from '../src/lib/content';
import { getGuideEntries } from '../src/lib/guides';
import { compileMDX } from 'next-mdx-remote/rsc';
import { renderToStaticMarkup } from 'react-dom/server';

function shape(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(shape);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, shape(child)]));
  return typeof value;
}
test('every configured locale has a complete shared dictionary and compilable MDX', async () => {
  const english = await getMessages('en');
  for (const locale of locales) {
    const messages = await getMessages(locale);
    assert.deepEqual(shape(messages), shape(english), `${locale}: missing dictionary entries`);
    const articles = getArticles(locale);
    const entries = getGuideEntries(locale, messages);
    for (const article of articles) {
      const { content } = await compileMDX({ source: article.body, options: { blockJS: true } });
      const html = renderToStaticMarkup(content);
      assert.ok(html.trim().length > 0, `${locale}/${article.slug}: rendered MDX`);
      assert.ok(entries.some(entry => entry.slug === article.slug && !entry.preview));
    }
    const slugs = entries.map(entry => entry.slug);
    assert.equal(new Set(slugs).size, slugs.length, `${locale}: duplicate guide slug`);
    assert.ok(entries.filter(entry => entry.preview).every(entry => !articles.some(article => article.slug === entry.slug)));
  }
});
