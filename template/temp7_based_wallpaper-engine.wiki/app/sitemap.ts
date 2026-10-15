import type { MetadataRoute } from 'next';
import { discoverRoutes, translationPaths } from '@/lib/content';
import { siteUrl } from '@/lib/seo';
export default function sitemap():MetadataRoute.Sitemap {
  return discoverRoutes().map(route=>{const translations=translationPaths(route.locale,route.parts);return {url:siteUrl()+route.path,...(route.article?{lastModified:new Date(route.article.updatedAt??route.article.publishedAt)}:{}),alternates:{languages:{...Object.fromEntries(Object.entries(translations).map(([lang,path])=>[lang,siteUrl()+path])),'x-default':siteUrl()+(translations.en??route.path)}}};});
}
