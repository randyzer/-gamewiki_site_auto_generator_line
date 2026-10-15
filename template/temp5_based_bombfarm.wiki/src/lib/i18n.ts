export const locales = ['en', 'de', 'pt-BR', 'es', 'zh-CN'] as const;
export type Locale = (typeof locales)[number];
export function isLocale(value: string): value is Locale { return locales.some(locale => locale === value); }
export function localePath(locale: Locale, slug = ''): string {
  const clean = slug.replace(/^\/+|\/+$/g, '');
  return `/${[locale === 'en' ? '' : locale, clean].filter(Boolean).join('/')}${locale !== 'en' || clean ? '/' : ''}`;
}
export function parsePath(path: string[] = []): { locale: Locale; slug: string } | null {
  if (path.some(part => !/^[\p{L}\p{N}-]+$/u.test(part))) return null;
  const locale = isLocale(path[0]) ? path[0] : 'en';
  const parts = isLocale(path[0]) ? path.slice(1) : path;
  if (parts.length && parts[0] !== 'guides') return null;
  return { locale, slug: parts.join('/') };
}
