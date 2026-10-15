import type { MetadataRoute } from 'next';
import { isIndexable, siteUrl } from '@/lib/seo';
export default function robots(): MetadataRoute.Robots {
  return { rules: isIndexable ? { userAgent: '*', allow: '/' } : { userAgent: '*', disallow: '/' }, sitemap: new URL('/sitemap.xml', siteUrl).href };
}
