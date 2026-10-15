import assert from 'node:assert/strict';
import { discoverArticles, discoverRoutes, translationPaths, articlePath, headingsFromMdx } from '../lib/content.ts';
import { locales, localePath } from '../lib/i18n.ts';
import { getCatalog } from '../lib/previews.ts';
import { siteUrl, indexable } from '../lib/seo.ts';
const base=process.env.VERIFY_BASE_URL||'http://localhost:3000';
const articles=discoverArticles(); const routes=discoverRoutes(articles);
function escapeHtml(value:string){return value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('\"','&quot;').replaceAll("'",'&#x27;');}
function attribute(tag:string,name:string){return tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1]?.replaceAll('&amp;','&');}
function links(html:string,rel:string){return [...html.matchAll(/<link\b[^>]*>/g)].map(m=>m[0]).filter(tag=>attribute(tag,'rel')===rel);}
for(const locale of locales) for(const path of ['', 'guide', 'guide/install-and-setup']) assert(routes.some(r=>r.path===localePath(locale,path)),`Missing required core route ${localePath(locale,path)}`);
for(const route of routes){
  const response=await fetch(base+route.path);assert.equal(response.status,200,route.path);
  const html=await response.text();
  assert.match(html,new RegExp(`<html[^>]+lang="${route.locale}"`),`HTML locale: ${route.path}`);
  assert.equal(links(html,'canonical').length,1,`One canonical: ${route.path}`);
  assert.equal(attribute(links(html,'canonical')[0],'href'),siteUrl()+route.path,`Canonical: ${route.path}`);
  const available=translationPaths(route.locale,route.parts,articles);
  const alternates=new Map(links(html,'alternate').map(tag=>[attribute(tag,'hrefLang')??attribute(tag,'hreflang'),attribute(tag,'href')]));
  for(const [locale,path] of Object.entries(available))assert.equal(alternates.get(locale),siteUrl()+path,`Hreflang ${locale}: ${route.path}`);
  assert.equal(alternates.get('x-default'),siteUrl()+(available.en??route.path));
  const robotTags=[...html.matchAll(/<meta\b[^>]*>/g)].map(m=>m[0]).filter(tag=>attribute(tag,'name')==='robots');
  assert(robotTags.some(tag=>attribute(tag,'content')?.includes(indexable()?'index,':'noindex')),'Configured robots');
  if(route.article){
    for(const heading of headingsFromMdx(route.article.body)) assert(html.includes(`id="${heading.id}"`),`MDX heading: ${heading.id}`);
    assert(html.includes(escapeHtml(route.article.title)),'MDX title rendered');
  }
  for(const tag of [...html.matchAll(/<a\b[^>]*>/g)].map(m=>m[0])){
    const href=attribute(tag,'href');if(!href||!href.startsWith('/'))continue;
    const path=href.split('#')[0]||route.path;
    assert(routes.some(r=>r.path===path),`Invalid internal link ${href} on ${route.path}`);
  }
  for(const tag of [...html.matchAll(/<img\b[^>]*>/g)].map(m=>m[0])){
    const src=attribute(tag,'src');if(src?.startsWith('/'))assert.equal((await fetch(base+src)).status,200,`Image ${src}`);
  }
  console.log(`OK ${route.path}`);
}
const sitemapResponse=await fetch(base+'/sitemap.xml');assert.equal(sitemapResponse.status,200);
const sitemap=await sitemapResponse.text();
const submitted=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
assert.deepEqual([...submitted].sort(),routes.map(r=>siteUrl()+r.path).sort(),'Sitemap equals discovered real routes');
for(const locale of locales)for(const preview of getCatalog(locale).filter(e=>!e.article))assert(!submitted.includes(siteUrl()+localePath(locale,`${preview.category}/${preview.slug}`)),'Preview excluded');
const robotsResponse=await fetch(base+'/robots.txt');assert.equal(robotsResponse.status,200);
const robots=await robotsResponse.text();assert(robots.includes(`Sitemap: ${siteUrl()}/sitemap.xml`));assert(robots.includes(indexable()?'Allow: /':'Disallow: /'));
for(const route of routes.filter(r=>r.locale==='en')){
  const alias='/en'+route.path;const response=await fetch(base+alias,{redirect:'manual'});
  assert.equal(response.status,308,alias);const resolved=await fetch(base+alias);assert.equal(resolved.status,200,`Alias resolves: ${alias}`);assert.equal(new URL(resolved.url).pathname,route.path);
}
for(const path of ['/missing-page/','/fr/','/zh-cn/missing-page/','/guide/not-published/','/zh-cn/guide/not-published/'])assert.equal((await fetch(base+path)).status,404,path);
for(const locale of locales){
  const preview=getCatalog(locale).find(e=>!e.article)!;assert.equal((await fetch(base+localePath(locale,`${preview.category}/${preview.slug}`))).status,404,'Preview URL is not an article');
}
assert(articles.every(a=>routes.some(r=>r.path===articlePath(a))));
console.log(`PASS: ${routes.length} dynamically discovered routes, ${articles.length} MDX translations; SEO, images, internal links, sitemap, robots, aliases and 404s.`);
