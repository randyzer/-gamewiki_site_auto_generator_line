import { locales, localePath, type Locale } from './locales';

export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
export const indexable = process.env.SITE_INDEXABLE === 'true';

export function alternates(locale: Locale, path: string, availableLocales: readonly Locale[] = locales) {
  return {
    canonical: localePath(locale, path),
    languages: {
      ...Object.fromEntries(availableLocales.map((code) => [code, localePath(code, path)])),
      'x-default': localePath(availableLocales.includes('en') ? 'en' : availableLocales[0] ?? locale, path),
    } as Record<string, string>,
  };
}
