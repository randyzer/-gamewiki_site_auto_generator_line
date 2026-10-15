import assert from 'node:assert/strict';
import { compileMDX } from 'next-mdx-remote/rsc';
import { discoverArticles } from '../src/lib/content';
import { discoverRoutes } from '../src/lib/routes';
import { localPath, defaultLocale } from '../src/lib/i18n';
const base = process.env.VERIFY_BASE_URL || 'http://localhost:3000';
const routes = discoverRoutes();
const urls = new Set(routes.map(r => r.url));
assert.equal(urls.size, routes.length, 'Duplicate routes');
const xml = await (await fetch(`${base}/sitemap.xml`)).text();
const sitemapUrls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => new URL(m[1]).pathname);
assert.deepEqual(sitemapUrls.sort(), [...urls].sort(), 'Sitemap must match discovered real pages');
const robots = await (await fetch(`${base}/robots.txt`)).text();
assert.match(robots, /Sitemap:/);
for (const r of routes) {
  const response = await fetch(base + r.url);
  assert.equal(response.status, 200, r.url);
  const html = await response.text();
  assert.ok(html.includes(`lang="${r.locale}"`), `html lang: ${r.url}`);
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/);
  assert.equal(canonical && new URL(canonical[1]).pathname, r.url, `canonical: ${r.url}`);
  const expected = routes.filter(v => v.suffix === r.suffix);
  for (const v of expected) assert.ok(html.includes(`hrefLang="${v.locale}"`), `hreflang ${v.locale}: ${r.url}`);
  assert.ok(html.includes('hrefLang="x-default"'), `x-default: ${r.url}`);
  assert.ok(html.includes('name="robots"'), `robots: ${r.url}`);
  const links = [...html.matchAll(/<a\b[^>]*href="([^"]+)"/g)].map(m=>m[1]);
  for(const href of links){
    assert.ok(!href.includes('farevergame.wiki'), 'Competitor link');
    if(href.startsWith('/')&&!href.startsWith('//'))assert.ok(urls.has(href.split('#')[0]), `Unknown link ${href} in ${r.url}`);
  }
}
for (const article of discoverArticles()) {
  const result = await compileMDX({ source: article.content });
  assert.ok(result.content, `${article.locale}/${article.slug}: MDX compilation`);
  const html = await (await fetch(base + localPath(article.locale, `guide/${article.slug}`))).text();
  assert.ok(html.includes(article.title), 'MDX title');
  assert.ok(html.includes('article-body'), 'MDX body');
}
for (const suffix of ['', 'guide', ...discoverArticles().filter(a=>a.locale===defaultLocale).map(a=>`guide/${a.slug}`)]) {
  const response = await fetch(`${base}/en/${suffix}${suffix?'/':''}`, { redirect: 'manual' });
  assert.ok([301,308].includes(response.status), `Default alias /en/${suffix}`);
  assert.equal(new URL(response.headers.get('location')!,base).pathname, localPath(defaultLocale,suffix));
}
for (const url of ['/unknown/', '/fr/', '/guide/preview-0/', '/guide/missing/', '/de/guide/missing/']) assert.equal((await fetch(base+url)).status, 404, url);
console.log(`PASS: ${routes.length} dynamically discovered routes, MDX, sitemap, metadata, aliases, internal links and 404.`);
