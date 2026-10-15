import { contentRoot, getArticle, getArticles, type Article } from './content';
import type { Locale } from './i18n';
import type { Messages } from './messages';
export type GuideEntry = Pick<Article, 'slug' | 'title' | 'description' | 'category' | 'publishedAt' | 'minutes'> & { preview: boolean };
export function getGuideEntries(locale: Locale, messages: Messages, root = contentRoot): GuideEntry[] {
  const articles = getArticles(locale, root).map(article => ({ ...article, preview: false }));
  const previews = messages.previews.filter(preview => !articles.some(article => article.slug === preview.slug)).map(preview => ({ ...preview, preview: true }));
  return [...articles, ...previews];
}
export function getOpeningGuide(locale: Locale, root = contentRoot) {
  const article = getArticle(locale, 'beginner-opening-guide', root);
  if (!article) throw new Error(`${locale}: required beginner-opening-guide.mdx is missing`);
  return article;
}
export function formatDate(date: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale, { month: 'short', day: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));
}
