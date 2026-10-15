import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { locales, type Locale } from './i18n';
export const contentRoot = path.join(process.cwd(), 'content');
export interface Article { locale: Locale; slug: string; title: string; description: string; category: string; publishedAt: string; updatedAt?: string; order: number; content: string }
function files(directory: string): string[] {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(path.join(directory, entry.name)) : entry.name.endsWith('.mdx') ? [path.join(directory, entry.name)] : []);
}
export function discoverArticles(root = contentRoot): Article[] {
  return locales.flatMap(locale => files(path.join(/* turbopackIgnore: true */ root, locale)).map(file => {
    const { data, content } = matter(fs.readFileSync(file, 'utf8'));
    for (const key of ['title', 'description', 'category', 'publishedAt']) {
      if (key === 'publishedAt' ? !data[key] || Number.isNaN(Date.parse(String(data[key]))) : typeof data[key] !== 'string' || !data[key].trim()) throw new Error(`${file}: invalid or missing ${key}`);
    }
    if (!content.trim()) throw new Error(`${file}: empty article body`);
    const date = (v: unknown) => new Date(String(v)).toISOString();
    return { locale, slug: path.relative(path.join(/* turbopackIgnore: true */ root, locale), file).replace(/\.mdx$/, '').split(path.sep).join('/'), title: data.title, description: data.description, category: data.category, publishedAt: date(data.publishedAt), updatedAt: data.updatedAt ? date(data.updatedAt) : undefined, order: typeof data.order === 'number' ? data.order : 100, content };
  })).sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug));
}
export function getArticles(locale: Locale) { return discoverArticles().filter(a => a.locale === locale); }
export function getArticle(locale: Locale, slug: string) { return getArticles(locale).find(a => a.slug === slug); }
