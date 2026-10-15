import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { locales, localePath, type Locale } from './i18n.ts';

export type Article = {
  locale: Locale; slug: string; category: string; title: string; description: string;
  publishedAt: string; updatedAt?: string; cover: string; body: string;
  quickAnswer?: string; author?: string; tags: string[];
};
function walk(directory: string): string[] {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(full) : entry.isFile() && entry.name.endsWith('.mdx') ? [full] : [];
  });
}
export function discoverArticles(root = path.join(process.cwd(), 'content')): Article[] {
  return locales.flatMap(locale => walk(path.join(root, locale)).map(file => {
    const relative = path.relative(path.join(root, locale), file).split(path.sep);
    const category = relative.shift()!;
    const slug = relative.join('/').replace(/\.mdx$/, '');
    const { data, content } = matter(fs.readFileSync(file, 'utf8'));
    for (const field of ['title', 'description', 'category', 'publishedAt']) {
      if (typeof data[field] !== 'string' || !data[field].trim()) throw new Error(`${file}: missing or invalid ${field}`);
    }
    if (data.category !== category) throw new Error(`${file}: category must match its directory`);
    if (!/^[a-z0-9-]+(?:\/[a-z0-9-]+)*$/.test(slug) || !/^[a-z0-9-]+$/.test(category)) throw new Error(`${file}: invalid URL path`);
    for (const key of ['publishedAt', 'updatedAt']) {
      if (data[key] !== undefined && (typeof data[key] !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data[key]) || !Number.isFinite(Date.parse(data[key])))) throw new Error(`${file}: invalid ${key}`);
    }
    if (!content.trim()) throw new Error(`${file}: empty MDX body`);
    const cover = typeof data.cover === 'string' ? data.cover : '/images/install.svg';
    if (!cover.startsWith('/images/') || !/\.(svg|png|webp|jpg)$/.test(cover)) throw new Error(`${file}: cover must be a local image`);
    return {
      locale, slug, category, title: data.title as string, description: data.description as string,
      publishedAt: data.publishedAt as string, updatedAt: data.updatedAt as string | undefined,
      cover, body: content, quickAnswer: data.quickAnswer as string | undefined,
      author: data.author as string | undefined,
      tags: Array.isArray(data.tags) ? data.tags.filter((tag): tag is string => typeof tag === 'string') : [],
    };
  })).sort((a, b) => (b.updatedAt ?? b.publishedAt).localeCompare(a.updatedAt ?? a.publishedAt) || a.slug.localeCompare(b.slug));
}
export function articlePath(article: Pick<Article, 'locale' | 'category' | 'slug'>) {
  return localePath(article.locale, `${article.category}/${article.slug}`);
}
export type SiteRoute = { locale: Locale; parts: string[]; path: string; article?: Article };
export function discoverRoutes(articles = discoverArticles()): SiteRoute[] {
  return locales.flatMap(locale => {
    const own = articles.filter(a => a.locale === locale);
    return [
      { locale, parts: [], path: localePath(locale) },
      ...[...new Set(own.map(a => a.category))].map(category => ({ locale, parts: [category], path: localePath(locale, category) })),
      ...own.map(article => ({ locale, parts: [article.category, ...article.slug.split('/')], path: articlePath(article), article })),
    ];
  });
}
export function translationPaths(locale: Locale, parts: string[], articles = discoverArticles()) {
  return Object.fromEntries(discoverRoutes(articles).filter(route => route.parts.join('/') === parts.join('/')).map(route => [route.locale, route.path]));
}
export { headingsFromMdx } from './headings.ts';
