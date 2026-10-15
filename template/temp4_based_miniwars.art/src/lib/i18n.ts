export const locales = ['en', 'de', 'pt-BR', 'es', 'zh-CN'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';
export const isLocale = (value: string): value is Locale => locales.includes(value as Locale);
export function localePath(locale: Locale, path = '/') {
  const normalized = `/${path.split('/').filter(Boolean).join('/')}`;
  return locale === defaultLocale ? normalized : `/${locale}${normalized === '/' ? '' : normalized}`;
}
export type Route = { locale: Locale; kind: 'home' | 'guides' | 'article' | 'not-found'; slug?: string };
export function parseRoute(path: string): Route {
  const parts = path.split('/').filter(Boolean);
  const locale = parts[0] && isLocale(parts[0]) ? parts.shift() as Locale : defaultLocale;
  if (!parts.length) return { locale, kind: 'home' };
  if (parts[0] === 'guides' && parts.length === 1) return { locale, kind: 'guides' };
  if (parts[0] === 'guides' && parts.length === 2) return { locale, kind: 'article', slug: parts[1] };
  return { locale, kind: 'not-found' };
}
