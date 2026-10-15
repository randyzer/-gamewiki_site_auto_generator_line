import assert from 'node:assert/strict';
import { discoverRoutes, getArticle } from '../src/lib/content';
import { locales, localePath, parseRoute } from '../src/lib/i18n';
import { pageAlternates, siteUrl, isIndexable } from '../src/lib/seo';
const base = process.env.VERIFY_BASE_URL ?? 'http://localhost:3000';
const routes = discoverRoutes();
function decodeHtml(text: string) {
  const entities: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
  return text.replace(/&(#x[0-9a-f]+|#[0-9]+|amp|lt|gt|quot|apos);/gi, (_, entity: string) => entity[0] === '#' ? String.fromCodePoint(parseInt(entity.slice(entity[1].toLowerCase() === 'x' ? 2 : 1), entity[1].toLowerCase() === 'x' ? 16 : 10)) : entities[entity.toLowerCase()]);
}
const sitemap = await (await fetch(`${base}/sitemap.xml`)).text();
const sitemapUrls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]);
assert.deepEqual(new Set(sitemapUrls), new Set(routes.map(route => new URL(route.pathname, siteUrl).href)));
for (const route of routes) {
  const response = await fetch(`${base}${route.pathname}`);
  assert.equal(response.status, 200, route.pathname);
  const html = await response.text();
  const parsed = parseRoute(route.pathname);
  const path = parsed.kind === 'home' ? '/' : parsed.kind === 'guides' ? '/guides' : `/guides/${parsed.slug}`;
  const alternates = pageAlternates(route.locale, path);
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/);
  assert.ok(canonical, `${route.pathname}: canonical exists`);
  assert.equal(new URL(canonical[1]).href, new URL(alternates.canonical, siteUrl).href, `${route.pathname}: canonical`);
  for (const [language, url] of Object.entries(alternates.languages)) {
    const alternate = [...html.matchAll(/<link rel="alternate" hrefLang="([^"]+)" href="([^"]+)"/g)].find(match => match[1] === language);
    assert.ok(alternate, `${route.pathname}: ${language} alternate exists`);
    assert.equal(new URL(alternate[2]).href, new URL(url, siteUrl).href, `${route.pathname}: ${language}`);
  }
  assert.ok(html.includes(`<html lang="${route.locale}"`), `${route.pathname}: html lang`);
  assert.ok(html.includes(`content="${isIndexable ? 'index' : 'noindex'}, follow"`), `${route.pathname}: indexing`);
  assert.ok(!html.includes('href="https://miniwars.art'), 'No competitor navigation');
  if (parsed.kind === 'article') {
    assert.equal(decodeHtml(html.match(/<title>(.*?)<\/title>/)?.[1] ?? ''), getArticle(route.locale, parsed.slug!)!.title, `${route.pathname}: MDX title`);
    assert.ok(html.includes('data-mdx-body'), `${route.pathname}: MDX body`);
  }
  for (const match of html.matchAll(/href="(\/[^"#?]*)"/g)) {
    const href = match[1];
    if (href.startsWith('/_next/')) continue;
    assert.ok(routes.some(candidate => candidate.pathname === href), `${route.pathname}: nonexistent link ${href}`);
  }
}
for (const locale of locales) {
  assert.equal((await fetch(`${base}${localePath(locale, '/guides/not-a-real-guide')}`)).status, 404);
}
for (const path of ['/', '/guides', '/guides/beginner-opening-guide']) {
  const alias = await fetch(`${base}/en${path === '/' ? '' : path}`, { redirect: 'manual' });
  assert.equal(alias.status, 308);
  assert.equal(new URL(alias.headers.get('location')!, base).pathname, path);
}
assert.equal((await fetch(`${base}/fr/guides`)).status, 404);
const robots = await (await fetch(`${base}/robots.txt`)).text();
assert.ok(robots.includes(isIndexable ? 'Allow: /' : 'Disallow: /'));
console.log(`PASS: ${routes.length} dynamically discovered routes, exact sitemap set, MDX, links, locales, SEO, robots, redirects and 404.`);
