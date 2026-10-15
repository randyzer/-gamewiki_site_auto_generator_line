import type { Metadata } from 'next';
import { getArticle, contentRoot } from './content';
import { defaultLocale, locales, localePath, type Locale } from './i18n';

export const siteUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000');
export const isIndexable = process.env.SITE_INDEXABLE === 'true';
export function pageAlternates(locale: Locale, path: string, root = contentRoot): { canonical: string; languages: Record<string, string> } {
  const slug = path.startsWith('/guides/') ? path.slice('/guides/'.length) : undefined;
  const available = locales.filter(language => !slug || getArticle(language, slug, root));
  const fallback = available.includes(defaultLocale) ? defaultLocale : available[0];
  return {
    canonical: localePath(locale, path),
    languages: Object.fromEntries([
      ...available.map(language => [language, localePath(language, path)]),
      ...(fallback ? [['x-default', localePath(fallback, path)]] : []),
    ]),
  };
}
export function pageMetadata(locale: Locale, path: string, title: string, description: string): Metadata {
  return {
    title, description, metadataBase: siteUrl,
    alternates: pageAlternates(locale, path),
    robots: { index: isIndexable, follow: true },
    openGraph: { title, description, url: localePath(locale, path), type: path.startsWith('/guides/') ? 'article' : 'website', locale, siteName: 'Frontier Codex' },
  };
}
