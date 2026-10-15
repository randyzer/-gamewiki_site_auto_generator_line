import type { Metadata } from 'next';
import { alternatePaths } from './content.ts';
import { localizedPath, type Locale } from './i18n.ts';

export const siteUrl = (process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
export const indexable = process.env.SITE_INDEXABLE === 'true';
export function pageMetadata(locale: Locale, pathname: string, title: string, description: string): Metadata {
  const canonical = `${siteUrl}${localizedPath(locale, pathname)}`;
  return {
    metadataBase: new URL(siteUrl), title: `${title} | Spirit Atlas`, description,
    alternates: { canonical, languages: Object.fromEntries(Object.entries(alternatePaths(pathname)).map(([key, value]) => [key, `${siteUrl}${value}`])) },
    robots: { index: indexable, follow: true },
    openGraph: { title, description, url: canonical, siteName: 'Spirit Atlas', locale: locale.replace('-', '_'), type: 'website', images: ['/art/landscape.svg'] },
    twitter: { card: 'summary_large_image', title, description, images: ['/art/landscape.svg'] },
  };
}
