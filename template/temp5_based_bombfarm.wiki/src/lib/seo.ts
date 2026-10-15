import type { Document } from './content';
import { locales, localePath, type Locale } from './i18n';
import type { Metadata } from 'next';
export function alternatePaths(slug: string, docs: Document[]): Record<string, string> {
  const available = slug ? locales.filter(locale => docs.some(doc => doc.locale === locale && doc.slug === slug)) : locales;
  const paths: Record<string, string> = Object.fromEntries(available.map(locale => [locale, localePath(locale, slug)]));
  if (available.length) paths['x-default'] = paths.en ?? paths[available[0]];
  return paths;
}
export function siteOrigin(): string {
  const origin = new URL(process.env.SITE_URL ?? 'http://localhost:3000');
  if (!['http:', 'https:'].includes(origin.protocol)) throw new Error('SITE_URL must be an HTTP(S) URL');
  return origin.origin;
}
export function metadata(locale: Locale, slug: string, title: string, description: string, docs: Document[]): Metadata {
  return {
    metadataBase: new URL(siteOrigin()), title: `${title} | Quarry Field Guide`, description,
    alternates: { canonical: localePath(locale, slug), languages: alternatePaths(slug, docs) },
    robots: { index: process.env.SITE_INDEXABLE === 'true', follow: true },
    openGraph: { title, description, url: localePath(locale, slug), type: slug.includes('/') ? 'article' : 'website', locale },
  };
}
