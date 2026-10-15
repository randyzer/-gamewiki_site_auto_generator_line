import type { MetadataRoute } from 'next';
import { allRoutes, discoverContent } from '@/lib/content';
import { alternatePaths, siteOrigin } from '@/lib/seo';
import { parsePath } from '@/lib/i18n';
export default function sitemap(): MetadataRoute.Sitemap {
  const docs = discoverContent();
  const origin = siteOrigin();
  return allRoutes(docs).map(path => {
    const route = parsePath(path.split('/').filter(Boolean))!;
    const doc = docs.find(item => item.locale === route.locale && item.slug === route.slug);
    return { url: `${origin}${path}`, ...(doc ? { lastModified: doc.publishedAt } : {}), alternates: { languages: Object.fromEntries(Object.entries(alternatePaths(route.slug, docs)).map(([locale, url]) => [locale, `${origin}${url}`])) } };
  });
}
