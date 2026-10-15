import type { Metadata } from 'next';
import { discoverRoutes } from './routes';
import { defaultLocale, type Locale } from './i18n';
export const siteUrl = new URL(process.env.SITE_URL || 'http://localhost:3000').origin;
export const indexable = process.env.SITE_INDEXABLE === 'true';
export function pageMetadata(locale: Locale, suffix: string, title: string, description: string): Metadata {
  const variants = discoverRoutes().filter(r => r.suffix === suffix);
  const current = variants.find(r => r.locale === locale);
  const fallback = variants.find(r => r.locale === defaultLocale) ?? variants[0];
  return { title: `${title} · Aurelia Atlas`, description, alternates: { canonical: current ? siteUrl + current.url : undefined, languages: { ...Object.fromEntries(variants.map(r => [r.locale, siteUrl + r.url])), ...(fallback ? { 'x-default': siteUrl + fallback.url } : {}) } }, robots: { index: indexable, follow: true }, openGraph: { title, description, url: current ? siteUrl + current.url : siteUrl, type: 'website', locale, siteName: 'Aurelia Atlas' } };
}
