import type { MetadataRoute } from 'next';
import path from 'node:path';
import { discoverContentFiles } from '@/lib/content-files';
import { locales, localePath } from '@/lib/locales';
import { alternates, siteUrl } from '@/lib/site';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const files = await Promise.all(locales.map(async (locale) => ({ locale, slugs: await discoverContentFiles(path.join(process.cwd(), 'content'), locale) })));
  return files.flatMap(({ locale, slugs }) => ['/', '/guides', ...slugs.map((slug) => `/guides/${slug}`)].map((routePath) => {
    const available = files.filter((entry) => !routePath.startsWith('/guides/') || entry.slugs.includes(routePath.slice('/guides/'.length))).map((entry) => entry.locale);
    return { url: new URL(localePath(locale, routePath), siteUrl).toString(), alternates: { languages: Object.fromEntries(Object.entries(alternates(locale, routePath, available).languages).map(([code, route]) => [code, new URL(route, siteUrl).toString()])) } };
  }));
}
