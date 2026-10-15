export const locales = ['en', 'de', 'pt-BR', 'es', 'zh-CN'] as const;
export type Locale = (typeof locales)[number];
export const languageNames: Record<Locale, string> = {
  en: 'English', de: 'Deutsch', 'pt-BR': 'Português do Brasil', es: 'Español', 'zh-CN': '简体中文',
};

export function isLocale(value: string): value is Locale {
  return locales.some((locale) => locale === value);
}

export function localePath(locale: Locale, pathname = '/') {
  const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return locale === 'en' ? normalized : `/${locale}${normalized === '/' ? '' : normalized}`;
}

export function guideHref(locale: Locale, guide: { slug: string; available: boolean }) {
  return localePath(locale, guide.available ? `/guides/${guide.slug}` : `/guides#${guide.slug}`);
}

export function switchLocalePath(pathname: string, locale: Locale) {
  const suffixIndex = pathname.search(/[?#]/);
  const suffix = suffixIndex < 0 ? '' : pathname.slice(suffixIndex);
  const parts = (suffixIndex < 0 ? pathname : pathname.slice(0, suffixIndex)).split('/');
  if (isLocale(parts[1])) parts.splice(1, 1);
  return localePath(locale, parts.join('/') || '/') + suffix;
}

export type SiteRoute = { locale: Locale; type: 'home' | 'guides' | 'article'; slug?: string };
export function parseRoute(segments: string[] = []): SiteRoute | null {
  const parts = [...segments];
  const locale: Locale = parts[0] && isLocale(parts[0]) ? parts.shift() as Locale : 'en';
  if (!parts.length) return { locale, type: 'home' };
  if (parts[0] === 'guides' && parts.length === 1) return { locale, type: 'guides' };
  if (parts[0] === 'guides' && parts.length === 2) return { locale, type: 'article', slug: parts[1] };
  return null;
}
