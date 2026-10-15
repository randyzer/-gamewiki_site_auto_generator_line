import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import { locales, localePath, type Locale } from './i18n';

export const contentRoot = join(process.cwd(), 'content');
export type Article = {
  slug: string; locale: Locale; title: string; description: string;
  category: string; publishedAt: string; author: string;
  minutes: number; tags: string[]; body: string;
};
// MDX is explicitly included by next.config; test fixture paths must not trace the whole workspace.
export function getArticles(locale: Locale, root = contentRoot): Article[] {
  const directory = join(/* turbopackIgnore: true */ root, locale);
  if (!existsSync(/* turbopackIgnore: true */ directory)) return [];
  return readdirSync(/* turbopackIgnore: true */ directory).filter(file => file.endsWith('.mdx')).map(file => {
    const slug = file.slice(0, -4);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error(`Invalid MDX slug: ${file}`);
    const { data, content } = matter(readFileSync(/* turbopackIgnore: true */ join(/* turbopackIgnore: true */ directory, file), 'utf8'));
    for (const field of ['title', 'description', 'category']) {
      if (typeof data[field] !== 'string' || !data[field].trim()) throw new Error(`${locale}/${file}: missing ${field}`);
    }
    const date = data.publishedAt instanceof Date ? data.publishedAt.toISOString().slice(0, 10) : data.publishedAt;
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) {
      throw new Error(`${locale}/${file}: invalid publishedAt`);
    }
    if (!content.trim()) throw new Error(`${locale}/${file}: empty MDX body`);
    if (data.tags && (!Array.isArray(data.tags) || data.tags.some((tag: unknown) => typeof tag !== 'string'))) throw new Error(`${locale}/${file}: invalid tags`);
    if (data.minutes !== undefined && (!Number.isFinite(data.minutes) || data.minutes <= 0)) throw new Error(`${locale}/${file}: invalid minutes`);
    return {
      slug, locale, title: data.title, description: data.description, category: data.category,
      publishedAt: date, author: typeof data.author === 'string' ? data.author : 'Frontier Codex',
      minutes: data.minutes ?? Math.max(1, Math.ceil(content.split(/\s+/).length / 180)),
      tags: data.tags ?? [], body: content,
    };
  }).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.slug.localeCompare(b.slug));
}
export function getArticle(locale: Locale, slug: string, root = contentRoot) {
  return getArticles(locale, root).find(article => article.slug === slug);
}
export function discoverRoutes(root = contentRoot) {
  return locales.flatMap(locale => [
    { locale, pathname: localePath(locale), kind: 'home' as const },
    { locale, pathname: localePath(locale, '/guides'), kind: 'guides' as const },
    ...getArticles(locale, root).map(article => ({ locale, pathname: localePath(locale, `/guides/${article.slug}`), kind: 'article' as const })),
  ]);
}
