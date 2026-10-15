import assert from 'node:assert/strict';
import { getArticles, getPages, translatedPaths } from '../lib/content';
import { indexable, locales, pathFor, siteUrl } from '../lib/site';

const base = process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3000';
const pages = getPages();
const failures: string[] = [];
function attributes(html: string, tag: string): Record<string, string>[] {
  return [...html.matchAll(new RegExp(`<${tag}\\b[^>]*>`, 'g'))].map(match => Object.fromEntries([...match[0].matchAll(/([\w-]+)="([^"]*)"/g)].map(a => [a[1], a[2].replaceAll('&amp;', '&')])));
}
for (const page of pages) {
  try {
    const response = await fetch(`${base}${page.path}`);
    assert.equal(response.status, 200, page.path);
    const html = await response.text();
    const links = attributes(html, 'link');
    assert.equal(links.find(link => link.rel === 'canonical')?.href, `${siteUrl}${page.path}`, 'canonical');
    assert.match(html, new RegExp(`<html[^>]*lang="${page.locale}"`), 'document language');
    for (const [language, route] of Object.entries(translatedPaths(page.slug))) {
      assert.ok(links.some(link => link.rel === 'alternate' && link.hrefLang === language && link.href === `${siteUrl}${route}`), `hreflang ${language}`);
    }
    assert.deepEqual(new Set(links.filter(link => link.rel === 'alternate').map(link => link.hrefLang)), new Set(Object.keys(translatedPaths(page.slug))), 'only existing translations advertised');
    const robots = attributes(html, 'meta').find(meta => meta.name === 'robots');
    assert.ok(robots?.content.includes(indexable ? 'index,' : 'noindex'), 'robots configuration');
    if (page.article) {
      assert.ok(html.includes(`data-mdx="${page.article.slug}"`), 'MDX rendered');
      assert.ok(!html.includes('class="card article-step"><span></span>'), 'MDX step properties retained');
    }
    for (const link of attributes(html, 'a')) {
      assert.ok(!link.href?.includes('gamblewithyourfriends.net'), 'no reference-site navigation');
      if (link.href?.startsWith('/') && !link.href.startsWith('//')) {
        assert.ok(pages.some(existing => existing.path === link.href.split('#')[0]), `unknown internal link ${link.href}`);
      }
    }
    for (const image of attributes(html, 'img')) {
      if (image.src?.startsWith('/')) assert.equal((await fetch(`${base}${image.src}`)).status, 200, `image ${image.src}`);
    }
    console.log(`PASS ${page.path}`);
  } catch (error) { failures.push(`${page.path}: ${String(error)}`); }
}
const response = await fetch(`${base}/sitemap.xml`);
assert.equal(response.status, 200);
const sitemap = await response.text();
const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]);
assert.deepEqual(new Set(urls), new Set(pages.map(page => `${siteUrl}${page.path}`)), 'sitemap discovered page set');
assert.ok(!sitemap.includes('/preview/'), 'previews excluded');
for (const locale of locales) {
  assert.ok(getArticles(locale).some(article => article.slug === 'beginner-guide'), `core MDX exists in ${locale}`);
  for (const slug of ['', 'guide', ...getArticles(locale).map(article => article.slug)]) {
    if (locale === 'en') {
      const alias = `/en/${slug ? `${slug}/` : ''}`;
      const redirect = await fetch(`${base}${alias}`, { redirect: 'manual' });
      assert.equal(redirect.status, 308, `default alias ${alias}`);
      assert.equal(new URL(redirect.headers.get('location')!, base).pathname, pathFor(locale, slug));
    }
  }
}
for (const route of ['/not-published/', '/fr/guide/', '/de/not-published/']) {
  assert.equal((await fetch(`${base}${route}`)).status, 404, route);
}
const robots = await (await fetch(`${base}/robots.txt`)).text();
assert.ok(robots.includes('Allow: /'), 'robots permits reading page index/noindex metadata');
assert.ok(robots.includes(`${siteUrl}/sitemap.xml`), 'robots sitemap origin');
if (failures.length) throw new Error(failures.join('\n'));
console.log(`PASS dynamic route, MDX, internal link, image, SEO, sitemap, 404 and redirect checks for ${pages.length} discovered pages.`);
