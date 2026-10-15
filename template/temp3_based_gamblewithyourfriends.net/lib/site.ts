export const locales = ['en', 'de', 'pt-BR', 'es', 'zh-CN'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';
export const brand = 'Co-op Fieldnotes';
export const steamUrl = 'https://store.steampowered.com/app/3892270/Gamble_With_Your_Friends/';
export const siteUrl = new URL(process.env.SITE_URL || 'http://localhost:3000').origin;
export const indexable = process.env.SITE_INDEXABLE === 'true';
export function isLocale(value: string): value is Locale {
  return locales.some(locale => locale === value);
}
export function pathFor(locale: Locale, slug = ''): string {
  const parts = [locale === defaultLocale ? '' : locale, slug].filter(Boolean);
  return `/${parts.join('/')}${parts.length ? '/' : ''}`;
}
export function parseRoute(segments: string[] = []): { locale: Locale; slug: string } | null {
  if (segments[0] === defaultLocale) return null;
  let locale: Locale = defaultLocale;
  let parts = segments;
  if (isLocale(segments[0])) {
    locale = segments[0];
    parts = segments.slice(1);
  }
  if (parts.some(part => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(part))) return null;
  return { locale, slug: parts.join('/') };
}
