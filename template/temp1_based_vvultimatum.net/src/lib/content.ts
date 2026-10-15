import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { locales, localizedPath, type Locale } from './i18n.ts';

export type Article = {
  locale: Locale;
  slug: string;
  category: string;
  title: string;
  description: string;
  publishedAt: string;
  updatedAt?: string;
  content: string;
  file: string;
};

export function discoverArticles(root = path.join(process.cwd(), 'content')): Article[] {
  const articles: Article[] = [];
  const walk = (directory: string): string[] => !fs.existsSync(directory) ? [] :
    fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
      const file = path.join(directory, entry.name);
      return entry.isDirectory() ? walk(file) : entry.name.endsWith('.mdx') ? [file] : [];
    });
  for (const locale of locales) {
    for (const file of walk(path.join(root, locale))) {
      const relative = path.relative(path.join(root, locale), file).split(path.sep);
      const { data, content } = matter(fs.readFileSync(file, 'utf8'));
      const slug = relative.at(-1)!.replace(/\.mdx$/, '');
      const category = relative.slice(0, -1).join('/');
      if (relative.length !== 2 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ||
          !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(category) ||
          ['title', 'description', 'category', 'publishedAt'].some(key => typeof data[key] !== 'string' || !data[key].trim()) ||
          data.category !== category || !/^\d{4}-\d{2}-\d{2}$/.test(data.publishedAt) ||
          Number.isNaN(Date.parse(data.publishedAt)) ||
          (data.updatedAt !== undefined && (typeof data.updatedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data.updatedAt) || Number.isNaN(Date.parse(data.updatedAt)))) || !content.trim()) {
        throw new Error(`Invalid MDX metadata or path: ${path.relative(root, file)}`);
      }
      articles.push({ locale, slug, category, title: data.title, description: data.description,
        publishedAt: data.publishedAt, updatedAt: data.updatedAt, content, file });
    }
  }
  return articles.sort((a, b) => a.file.localeCompare(b.file));
}

export function categoriesFor(locale: Locale, articles = discoverArticles()) {
  return [...new Set(['races', ...articles.filter(x => x.locale === locale).map(x => x.category)])];
}

export function siteRoutes(articles = discoverArticles()) {
  return locales.flatMap(locale => [localizedPath(locale),
    ...categoriesFor(locale, articles).map(category => localizedPath(locale, `/${category}`)),
    ...articles.filter(x => x.locale === locale).map(x => localizedPath(locale, `/${x.category}/${x.slug}`))]);
}

export function alternatePaths(pathname: string, articles = discoverArticles()): Record<string, string> {
  const result: Record<string, string> = {};
  const routes = new Set(siteRoutes(articles));
  for (const locale of locales) {
    const url = localizedPath(locale, pathname);
    if (routes.has(url)) result[locale] = url;
  }
  if (result.en) result['x-default'] = result.en;
  return result;
}
