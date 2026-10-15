import { readdir } from 'node:fs/promises';
import path from 'node:path';

export type GuideMetadata = {
  title: string;
  description: string;
  category: string;
  publishedAt: string;
  order?: number;
  cover?: string;
  status?: 'Reviewed' | 'Draft';
  listDescription?: string;
  shortTitle?: string;
  summary?: string;
  related?: string[];
  searchOrder?: number;
  searchTitle?: string;
  searchDescription?: string;
};

export async function discoverContentFiles(root: string, locale: string) {
  const files = await readdir(path.join(root, locale), { withFileTypes: true });
  return files.filter((file) => file.isFile() && file.name.endsWith('.mdx'))
    .map((file) => file.name.slice(0, -4)).sort();
}

export function validateMetadata(value: unknown, slug: string): asserts value is GuideMetadata {
  if (!value || typeof value !== 'object') throw new Error(`Missing MDX metadata: ${slug}`);
  const fields = value as Record<string, unknown>;
  for (const field of ['title', 'description', 'category', 'publishedAt']) {
    if (typeof fields[field] !== 'string' || !fields[field]) throw new Error(`Invalid MDX ${field}: ${slug}`);
  }
  if (Number.isNaN(Date.parse(fields.publishedAt as string))) throw new Error(`Invalid MDX publishedAt: ${slug}`);
  for (const field of ['listDescription', 'shortTitle', 'summary', 'cover', 'searchTitle', 'searchDescription']) {
    if (fields[field] !== undefined && (typeof fields[field] !== 'string' || !fields[field])) {
      throw new Error(`Invalid MDX ${field}: ${slug}`);
    }
  }
  if (fields.order !== undefined && (typeof fields.order !== 'number' || !Number.isFinite(fields.order))) {
    throw new Error(`Invalid MDX order: ${slug}`);
  }
  if (fields.searchOrder !== undefined && (typeof fields.searchOrder !== 'number' || !Number.isFinite(fields.searchOrder))) {
    throw new Error(`Invalid MDX searchOrder: ${slug}`);
  }
  if (fields.status !== undefined && !['Reviewed', 'Draft'].includes(fields.status as string)) {
    throw new Error(`Invalid MDX status: ${slug}`);
  }
  if (fields.related !== undefined && (!Array.isArray(fields.related) || fields.related.some((slug) => typeof slug !== 'string'))) {
    throw new Error(`Invalid MDX related: ${slug}`);
  }
}
