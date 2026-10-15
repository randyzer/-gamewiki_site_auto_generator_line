import type { MetadataRoute } from 'next';
import { getPages, translatedPaths } from '@/lib/content';
import { siteUrl } from '@/lib/site';
export default function sitemap(): MetadataRoute.Sitemap {
  return getPages().map(page => ({
    url: `${siteUrl}${page.path}`,
    lastModified: page.article ? new Date(page.article.updatedAt || page.article.publishedAt) : undefined,
    alternates: { languages: Object.fromEntries(Object.entries(translatedPaths(page.slug)).map(([locale, pathname]) => [locale, `${siteUrl}${pathname}`])) },
  }));
}
