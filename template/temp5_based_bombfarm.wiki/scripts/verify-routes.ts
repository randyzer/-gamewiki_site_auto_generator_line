import assert from 'node:assert/strict';
import { discoverContent, allRoutes } from '../src/lib/content';
import { locales, localePath, parsePath } from '../src/lib/i18n';
import { alternatePaths } from '../src/lib/seo';
const base = process.env.VERIFY_BASE_URL ?? 'http://localhost:3000';
const origin = new URL(process.env.VERIFY_SITE_ORIGIN ?? base).origin;
const docs = discoverContent();
const paths = allRoutes(docs);
for (const locale of locales) {
  for (const slug of ['', 'guides', 'guides/how-to-play']) assert.ok(paths.includes(localePath(locale, slug)), `Missing core route: ${locale}/${slug}`);
}
for (const path of paths) {
  const response = await fetch(new URL(path, base));
  assert.equal(response.status, 200, path);
  const html = await response.text();
  const links = [...html.matchAll(/<link\s[^>]*>/g)].map(match => Object.fromEntries([...match[0].matchAll(/([\w-]+)="([^"]*)"/g)].map(attribute => [attribute[1].toLowerCase(), attribute[2].replaceAll('&amp;', '&')])));
  assert.equal(links.find(link => link.rel === 'canonical')?.href, `${origin}${path}`, `Canonical: ${path}`);
  const route = parsePath(path.split('/').filter(Boolean))!;
  const actual = Object.fromEntries(links.filter(link => link.rel === 'alternate' && link.hreflang).map(link => [link.hreflang, link.href]));
  const expected = Object.fromEntries(Object.entries(alternatePaths(route.slug, docs)).map(([locale, url]) => [locale, `${origin}${url}`]));
  assert.deepEqual(actual, expected, `hreflang / x-default: ${path}`);
  assert.ok(html.includes(`content="${process.env.SITE_INDEXABLE === 'true' ? 'index' : 'noindex'}, follow"`), `Index configuration: ${path}`);
}
const sitemapResponse = await fetch(new URL('/sitemap.xml', base));
assert.equal(sitemapResponse.status, 200);
const sitemap = await sitemapResponse.text();
const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => new URL(match[1]).pathname);
assert.deepEqual([...urls].sort(), [...paths].sort());
const robots = await (await fetch(new URL('/robots.txt', base))).text();
assert.ok(robots.includes(`Sitemap: ${origin}/sitemap.xml`));
assert.ok(robots.includes('Disallow: /en/'));
assert.equal((await fetch(new URL('/guides/not-a-real-guide/', base))).status, 404);
assert.equal((await fetch(new URL('/fr/guides/', base))).status, 404);
const alias = await fetch(new URL('/en/guides/', base), { redirect: 'manual' });
assert.equal(alias.status, 308);
const canonicalAlias = await fetch(new URL('/en/guides/', base));
assert.equal(canonicalAlias.status, 200);
assert.equal(new URL(canonicalAlias.url).pathname, '/guides/');
console.log(`Verified ${paths.length} discovered routes, sitemap, English redirect, and 404s.`);
