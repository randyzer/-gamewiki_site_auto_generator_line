import type { MetadataRoute } from 'next';
import { discoverRoutes, getArticle } from '@/lib/content';
import { parseRoute } from '@/lib/i18n';
import { pageAlternates, siteUrl } from '@/lib/seo';
export default function sitemap(): MetadataRoute.Sitemap {
  return discoverRoutes().map(route => {
    const parsed = parseRoute(route.pathname);
    const path = parsed.kind === 'home' ? '/' : parsed.kind === 'guides' ? '/guides' : `/guides/${parsed.slug}`;
    const article = parsed.slug ? getArticle(route.locale, parsed.slug) : undefined;
    return { url: new URL(route.pathname, siteUrl).href, ...(article ? { lastModified: article.publishedAt } : {}), alternates: { languages: Object.fromEntries(Object.entries(pageAlternates(route.locale, path).languages).map(([language, href]) => [language, new URL(href, siteUrl).href])) } };
  });
}
