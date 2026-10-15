import type { MetadataRoute } from 'next';
import { discoverArticles } from '@/lib/content';
import { discoverRoutes } from '@/lib/routes';
import { siteUrl } from '@/lib/seo';
export default function sitemap(): MetadataRoute.Sitemap {
  const routes=discoverRoutes(), articles=discoverArticles();
  return routes.map(r=>({url:siteUrl+r.url,lastModified:articles.find(a=>a.locale===r.locale&&`guide/${a.slug}`===r.suffix)?.updatedAt??articles.find(a=>a.locale===r.locale&&`guide/${a.slug}`===r.suffix)?.publishedAt,alternates:{languages:Object.fromEntries(routes.filter(v=>v.suffix===r.suffix).map(v=>[v.locale,siteUrl+v.url]))}}));
}
