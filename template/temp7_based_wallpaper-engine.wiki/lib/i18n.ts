export const locales = ['en', 'zh-CN'] as const;
export type Locale = (typeof locales)[number];
export function isLocale(value: string): value is Locale { return locales.includes(value as Locale); }
export function localePath(locale: Locale, path = ''): string {
  const clean = path.replace(/^\/+|\/+$/g, '');
  return `${locale === 'en' ? '' : '/zh-cn'}/${clean ? `${clean}/` : ''}`;
}
export function resolveSegments(segments: string[] = []): { locale: Locale; parts: string[] } {
  return segments[0] === 'zh-cn' ? { locale: 'zh-CN', parts: segments.slice(1) } : { locale: 'en', parts: segments };
}
export function text(locale: Locale, en: string, zh: string) { return locale === 'en' ? en : zh; }
export const categories = ['guide', 'platforms', 'wallpapers', 'safety', 'buying'] as const;
export function categoryLabel(category: string, locale: Locale) {
  const labels: Record<string, [string, string]> = { guide: ['Guide', '使用指南'], platforms: ['Platforms', '支持平台'], wallpapers: ['Wallpapers', '壁纸'], safety: ['Safety', '安全'], buying: ['Buying', '购买'] };
  return labels[category]?.[locale === 'en' ? 0 : 1] ?? category.replaceAll('-', ' ');
}
