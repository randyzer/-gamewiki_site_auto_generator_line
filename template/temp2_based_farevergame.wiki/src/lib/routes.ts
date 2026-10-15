import { discoverArticles } from './content';
import { locales, localPath, type Locale } from './i18n';
export interface Route { locale: Locale; suffix: string; url: string }
export function discoverRoutes(): Route[] {
  return [...locales.flatMap(locale => ['', 'guide'].map(suffix => ({ locale, suffix, url: localPath(locale, suffix) }))), ...discoverArticles().map(a => ({ locale: a.locale, suffix: `guide/${a.slug}`, url: localPath(a.locale, `guide/${a.slug}`) }))];
}
