import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { discoverArticles, siteRoutes, alternatePaths } from '../src/lib/content.ts';
import { resolvePath } from '../src/lib/i18n.ts';

const base = process.env.VERIFY_BASE_URL || 'http://localhost:3000';
const site = (process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
const articles = discoverArticles();
const routes = siteRoutes(articles);
const links = html => [...html.matchAll(/<link\s+([^>]+)>/g)].map(match => Object.fromEntries([...match[1].matchAll(/([\w-]+)="([^"]*)"/g)].map(x => [x[1], x[2]])));
for (const route of routes) {
  const response = await fetch(`${base}${route}`);
  assert.equal(response.status, 200, `${route}: HTTP status`);
  const html = await response.text();
  const { locale, pathname } = resolvePath(route.split('/').filter(Boolean));
  assert.ok(html.includes(`<html lang="${locale}"`), `${route}: html language`);
  const tags = links(html);
  assert.equal(new URL(tags.find(x => x.rel === 'canonical')?.href).href, new URL(`${site}${route}`).href, `${route}: canonical`);
  const actual = Object.fromEntries(tags.filter(x => x.rel === 'alternate' && x.hrefLang).map(x => [x.hrefLang, new URL(x.href).href]));
  const expected = Object.fromEntries(Object.entries(alternatePaths(pathname, articles)).map(([language, url]) => [language, new URL(`${site}${url}`).href]));
  assert.deepEqual(actual, expected, `${route}: hreflang`);
  assert.ok(html.includes(process.env.SITE_INDEXABLE === 'true' ? 'content="index, follow"' : 'content="noindex, follow"'), `${route}: configurable robots`);
  assert.ok(!html.includes('vvultimatum.net'), `${route}: no competitor navigation or assets`);
  const hrefs = [...html.matchAll(/<a\s[^>]*href="([^"]+)"/g)].map(x => x[1]);
  for (const href of hrefs) {
    if (href.startsWith('/') && !href.startsWith('/art/')) assert.ok(routes.includes(href), `${route}: invalid internal link ${href}`);
  }
  for (const [, src] of html.matchAll(/<img\s[^>]*src="([^"]+)"/g)) {
    assert.ok(src.startsWith('/art/'), `${route}: local original image`);
    assert.ok(fs.existsSync(path.join('public', src)), `${route}: missing image ${src}`);
  }
  const article = articles.find(x => x.locale === locale && `/${x.category}/${x.slug}` === pathname);
  if (article) {
    assert.ok(html.includes('class="article-body"') && html.includes('<h2>'), `${route}: rendered MDX`);
    assert.ok(!html.includes('&lt;section&gt;'), `${route}: MDX must compile`);
  }
  console.log(`PASS ${route}`);
}
const sitemapResponse = await fetch(`${base}/sitemap.xml`);
assert.equal(sitemapResponse.status, 200);
const xml = await sitemapResponse.text();
const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(x => x[1]);
assert.deepEqual(urls.sort(), routes.map(route => `${site}${route}`).sort(), 'sitemap must follow content discovery');
const robotsResponse = await fetch(`${base}/robots.txt`);
assert.equal(robotsResponse.status, 200);
const robots = await robotsResponse.text();
assert.ok(robots.includes(`Sitemap: ${site}/sitemap.xml`));
assert.ok(robots.includes(process.env.SITE_INDEXABLE === 'true' ? 'Allow: /' : 'Disallow: /'));
for (const route of ['/', '/races', '/races/shinigami']) {
  const response = await fetch(`${base}/en${route === '/' ? '' : route}`, { redirect: 'manual' });
  assert.equal(response.status, 308, `English alias ${route}`);
  assert.equal(new URL(response.headers.get('location'), base).pathname, route);
}
for (const route of ['/races/quincy', '/nonexistent-guide', '/fr/races', '/de/races/nonexistent'].filter(route => !routes.includes(route))) {
  const response = await fetch(`${base}${route}`);
  assert.equal(response.status, 404, `${route}: honest 404`);
}
console.log(`Verified ${routes.length} dynamically discovered pages, sitemap, robots, aliases, internal links and 404s.`);
