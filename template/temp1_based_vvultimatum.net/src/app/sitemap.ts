import type { MetadataRoute } from 'next';
import { alternatePaths, discoverArticles, siteRoutes } from '@/lib/content';
import { resolvePath } from '@/lib/i18n';
import { siteUrl } from '@/lib/seo';

export default function sitemap(): MetadataRoute.Sitemap {
  const articles = discoverArticles();
  return siteRoutes(articles).map(route => {
    const { locale, pathname } = resolvePath(route.split('/').filter(Boolean));
    const article = articles.find(x => x.locale === locale && `/${x.category}/${x.slug}` === pathname);
    return { url: `${siteUrl}${route}`, ...(article ? { lastModified: article.updatedAt || article.publishedAt } : {}), alternates: { languages: Object.fromEntries(Object.entries(alternatePaths(pathname, articles)).map(([key, value]) => [key, `${siteUrl}${value}`])) } };
  });
}
