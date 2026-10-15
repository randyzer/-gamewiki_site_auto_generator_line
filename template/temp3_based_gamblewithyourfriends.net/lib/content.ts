import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { locales, pathFor, type Locale } from './site';

export type Article = {
  locale: Locale;
  slug: string;
  title: string;
  description: string;
  category: string;
  publishedAt: string;
  updatedAt?: string;
  source: string;
};
const contentRoot = path.join(process.cwd(), 'content');
function mdxFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? mdxFiles(file) : entry.isFile() && entry.name.endsWith('.mdx') ? [file] : [];
  }).sort();
}
function dateField(value: unknown, field: string, file: string): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) {
    throw new Error(`${file}: invalid ${field}; use YYYY-MM-DD`);
  }
  return value;
}
export function getArticles(locale: Locale, root = contentRoot): Article[] {
  const directory = root === contentRoot
    ? path.join(process.cwd(), 'content', locale)
    : path.join(/* turbopackIgnore: true */ root, locale);
  return mdxFiles(directory).map(file => {
    const { data, content } = matter(readFileSync(file, 'utf8'));
    for (const field of ['title', 'description', 'category']) {
      if (typeof data[field] !== 'string' || !data[field].trim()) throw new Error(`${file}: missing ${field}`);
    }
    const slug = path.relative(directory, file).replace(/\.mdx$/, '').split(path.sep).join('/');
    if (slug === 'guide' || slug.split('/').some(part => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(part)) || locales.includes(slug.split('/')[0] as Locale)) {
      throw new Error(`${file}: invalid or reserved slug`);
    }
    if (!content.trim()) throw new Error(`${file}: article body is empty`);
    return {
      locale, slug, title: data.title, description: data.description, category: data.category,
      publishedAt: dateField(data.publishedAt, 'publishedAt', file),
      updatedAt: data.updatedAt === undefined ? undefined : dateField(data.updatedAt, 'updatedAt', file),
      source: content,
    };
  });
}
export function getArticle(locale: Locale, slug: string): Article | undefined {
  return getArticles(locale).find(article => article.slug === slug);
}
export function getPages() {
  return locales.flatMap(locale => [
    { locale, slug: '', path: pathFor(locale), article: undefined },
    { locale, slug: 'guide', path: pathFor(locale, 'guide'), article: undefined },
    ...getArticles(locale).map(article => ({ locale, slug: article.slug, path: pathFor(locale, article.slug), article })),
  ]);
}
export function translatedPaths(slug: string): Record<string, string> {
  const pages = getPages().filter(page => page.slug === slug);
  const paths: Record<string, string> = Object.fromEntries(pages.map(page => [page.locale, page.path]));
  if (pages.length) paths['x-default'] = paths.en || pages[0].path;
  return paths;
}
export function getCategories(locale: Locale): string[] {
  return [...new Set(getArticles(locale).map(article => article.category))];
}
