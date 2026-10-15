export const locales = ['en', 'de', 'pt-BR', 'es', 'zh-CN'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';
export const localeNames: Record<Locale, string> = { en: '🇬🇧 English', de: '🇩🇪 Deutsch', 'pt-BR': '🇧🇷 Português', es: '🇪🇸 Español', 'zh-CN': '🇨🇳 简体中文' };
export function isLocale(value: string): value is Locale { return locales.includes(value as Locale); }
export function localPath(locale: Locale, suffix = '') { return `${locale === defaultLocale ? '' : `/${locale}`}/${suffix.replace(/^\/|\/$/g, '')}${suffix ? '/' : ''}`; }
export function resolvePath(path: string[] = []) {
  const [first, ...rest] = path;
  const locale = first && isLocale(first) ? first : defaultLocale;
  const segments = first && isLocale(first) ? rest : path;
  if (first === defaultLocale) return null;
  if (!segments.length) return { locale, kind: 'home' as const, suffix: '' };
  if (segments[0] !== 'guide') return null;
  return segments.length === 1 ? { locale, kind: 'guide' as const, suffix: 'guide' } : { locale, kind: 'article' as const, slug: segments.slice(1).join('/'), suffix: segments.join('/') };
}
