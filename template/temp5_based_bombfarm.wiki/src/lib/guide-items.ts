import type { Document } from './content';
import type { Locale } from './i18n';
import { messages } from './messages';
export type GuideItem = { title: string; description: string; category: string; slug?: string };
export function previewGuides(locale: Locale): GuideItem[] {
  const m = messages[locale];
  return [1, 3, 4, 5, 6, 7, 8].map(index => ({ title: m.guideTitles[index], description: m.guideDescriptions[index], category: index === 8 ? m.nav[2] : m.nav[1] }));
}
export function relatedGuides(locale: Locale, slug: string, docs: Document[]): GuideItem[] {
  const real = docs.filter(doc => doc.locale === locale && doc.slug !== slug).map(doc => ({ title: doc.title, description: doc.description, category: doc.category, slug: doc.slug }));
  return [...real, ...previewGuides(locale)].slice(0, Math.max(6, real.length));
}
