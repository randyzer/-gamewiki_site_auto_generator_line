export const locales = ['en', 'de', 'pt-BR', 'es', 'zh-CN'] as const;
export type Locale = typeof locales[number];
export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}
export function localizedPath(locale: Locale, pathname = '/') {
  const clean = pathname === '/' ? '' : `/${pathname.replace(/^\/+|\/+$/g, '')}`;
  return locale === 'en' ? clean || '/' : `/${locale}${clean}`;
}
export function resolvePath(segments: string[] = []) {
  const locale: Locale = isLocale(segments[0]) ? segments[0] : 'en';
  const parts = isLocale(segments[0]) ? segments.slice(1) : segments;
  return { locale, parts, pathname: parts.length ? `/${parts.join('/')}` : '/' };
}
