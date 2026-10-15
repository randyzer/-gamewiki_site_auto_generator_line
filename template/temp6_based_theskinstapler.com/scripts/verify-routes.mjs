import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const base = process.env.VERIFY_BASE_URL || 'http://localhost:3000';
const locales = ['en','de','pt-BR','es','zh-CN'];
const paths = ['','/guides','/guides/midnight-evidence-developer'];
const url = (locale, suffix) => `${locale === 'en' ? '' : `/${locale}`}${suffix}` || '/';
const pages = new Map();
for (const locale of locales) {
  for (const suffix of paths) {
    const route = url(locale, suffix);
    const response = await fetch(base + route);
    assert.equal(response.status, 200, route);
    const html = await response.text(); pages.set(route, html);
    assert.ok(html.includes(`<html lang="${locale}"`), `${route}: language`);
    const canonical = html.match(/<link rel="canonical" href="([^"]+)"/);
    assert.ok(canonical, `${route}: canonical`);
    assert.equal(new URL(canonical[1]).pathname, route, `${route}: canonical path`);
    for (const code of [...locales, 'x-default']) {
      const link = [...html.matchAll(/<link\b[^>]*>/g)].map((match) => match[0]).find((tag) => tag.includes(`hrefLang="${code}"`) || tag.includes(`hreflang="${code}"`));
      assert.ok(link, `${route}: ${code}`);
      const href = link.match(/href="([^"]+)"/);
      assert.ok(href);
      assert.equal(new URL(href[1]).pathname, url(code === 'x-default' ? 'en' : code, suffix), `${route}: ${code} alternate path`);
    }
    assert.ok(html.includes('name="robots"'), `${route}: robots`);
    assert.ok(!html.includes('theskinstapler.com'), `${route}: competitor URL leaked`);
    const links = [...html.matchAll(/<a\b[^>]*href="([^"]+)"/g)].map((match) => match[1]);
    for (const href of links.filter((href) => href.startsWith('/'))) {
      const [pathname, hash] = href.split('#');
      const target = new URL(pathname, base).pathname;
      const result = await fetch(base + target);
      assert.equal(result.status, 200, `${route}: link ${href}`);
      if (hash) assert.ok((await result.text()).includes(`id="${hash}"`), `${route}: missing anchor ${href}`);
    }
  }
}
const sitemapResponse = await fetch(base + '/sitemap.xml');
assert.equal(sitemapResponse.status, 200);
const sitemap = await sitemapResponse.text();
const sitemapPages = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => new URL(match[1]).pathname);
assert.deepEqual([...sitemapPages].sort(), [...pages.keys()].sort());
for (const locale of locales) {
  const topics = JSON.parse(await readFile(new URL(`../messages/${locale}-topics.json`, import.meta.url), 'utf8'));
  for (const topic of topics) assert.ok(!sitemapPages.includes(url(locale, `/guides/${topic.slug}`)), `${topic.slug}: preview in sitemap`);
}
for (const route of ['/en','/en/guides','/en/guides/midnight-evidence-developer']) {
  const response = await fetch(base + route, { redirect:'manual' });
  assert.equal(response.status, 308, route);
  assert.equal(new URL(response.headers.get('location'), base).pathname, route.replace(/^\/en/, '') || '/');
}
for (const route of ['/missing-page','/xx/guides','/guides/beginner','/de/guides/missing-article']) {
  const response = await fetch(base + route); assert.equal(response.status,404,route);
}
const robotsResponse = await fetch(base + '/robots.txt');
assert.equal(robotsResponse.status,200); const robots = await robotsResponse.text();
assert.ok(robots.includes('Sitemap:')); assert.ok(robots.includes('Disallow: /') || robots.includes('Allow: /'));
console.log(`PASS: ${pages.size} localized pages, metadata, internal links/anchors, sitemap, previews, redirects, robots and 404.`);
