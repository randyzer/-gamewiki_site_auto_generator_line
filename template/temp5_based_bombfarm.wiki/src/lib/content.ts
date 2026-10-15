import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import matter from 'gray-matter';
import { locales, localePath, type Locale } from './i18n';
export type Heading = { text: string; id: string };
export type Document = { locale: Locale; slug: string; title: string; description: string; category: string; publishedAt: string; body: string; faq: { question: string; answer: string }[] };
export function discoverContent(root = resolve('content')): Document[] {
  const docs: Document[] = [];
  for (const locale of locales) {
    // Fixture roots are configurable; Next's tracing is explicitly scoped in next.config.ts.
    const folder = join(/*turbopackIgnore: true*/ root, locale);
    if (!existsSync(/*turbopackIgnore: true*/ folder)) continue;
    function walk(dir: string) {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const file = join(dir, entry.name);
        if (entry.isDirectory()) { walk(file); continue; }
        if (!entry.isFile() || !entry.name.endsWith('.mdx')) continue;
        const slug = relative(folder, file).replace(/\\/g, '/').replace(/\.mdx$/, '').replace(/\/index$/, '');
        if (!/^guides(?:\/[a-z0-9-]+)*$/.test(slug)) throw new Error(`Invalid content path: ${file}`);
        const { data, content: body } = matter(readFileSync(file, 'utf8'));
        for (const key of ['title', 'description', 'category', 'publishedAt']) {
          if (typeof data[key] !== 'string' || !data[key].trim()) throw new Error(`${file}: invalid ${key}`);
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(data.publishedAt) || Number.isNaN(Date.parse(data.publishedAt))) throw new Error(`${file}: invalid publishedAt`);
        if (!body.trim()) throw new Error(`${file}: empty MDX`);
        const faq = data.faq ?? [];
        if (!Array.isArray(faq) || faq.some(item => typeof item.question !== 'string' || typeof item.answer !== 'string')) throw new Error(`${file}: invalid faq`);
        if (docs.some(doc => doc.locale === locale && doc.slug === slug)) throw new Error(`${file}: duplicate route`);
        docs.push({ locale, slug, title: data.title, description: data.description, category: data.category, publishedAt: data.publishedAt, faq, body });
      }
    }
    walk(folder);
  }
  return docs.sort((a, b) => a.locale.localeCompare(b.locale) || a.slug.localeCompare(b.slug));
}
export function allRoutes(docs: Document[]): string[] {
  return [...new Set([...locales.map(locale => localePath(locale)), ...docs.map(doc => localePath(doc.locale, doc.slug))])];
}
export function headingId(text: string, seen: Map<string, number>): string {
  const base = text.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').trim().replace(/\s+/g, '-') || 'section';
  let count = (seen.get(base) ?? 0) + 1;
  let id = count === 1 ? base : `${base}-${count}`;
  while (seen.has(id)) { count++; id = `${base}-${count}`; }
  seen.set(base, count);
  seen.set(id, seen.get(id) ?? 1);
  return id;
}
export function headings(body: string): Heading[] {
  const seen = new Map<string, number>();
  const plain = body.replace(/^```[\s\S]*?^```/gm, '');
  return [...plain.matchAll(/^##\s+(.+)$/gm)].map(match => {
    const text = match[1].replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[*_`]/g, '').trim();
    return { text, id: headingId(text, seen) };
  });
}
