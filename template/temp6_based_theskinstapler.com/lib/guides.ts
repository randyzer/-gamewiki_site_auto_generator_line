import path from 'node:path';
import { cache, type ComponentType } from 'react';
import type { MDXProps } from 'mdx/types';
import { discoverContentFiles, validateMetadata, type GuideMetadata } from './content-files';
import type { Locale } from './locales';
import enTopics from '@/messages/en-topics.json';
import deTopics from '@/messages/de-topics.json';
import ptTopics from '@/messages/pt-BR-topics.json';
import esTopics from '@/messages/es-topics.json';
import zhTopics from '@/messages/zh-CN-topics.json';

export type Guide = GuideMetadata & { slug: string; available: boolean };
type GuideModule = { default: ComponentType<MDXProps>; metadata: GuideMetadata };
const topics: Record<Locale, Array<GuideMetadata & { slug: string }>> = {
  en: enTopics as Array<GuideMetadata & { slug: string }>,
  de: deTopics as Array<GuideMetadata & { slug: string }>,
  'pt-BR': ptTopics as Array<GuideMetadata & { slug: string }>,
  es: esTopics as Array<GuideMetadata & { slug: string }>,
  'zh-CN': zhTopics as Array<GuideMetadata & { slug: string }>,
};

const loadModule = cache(async (locale: Locale, slug: string): Promise<GuideModule> => {
  const module: GuideModule = await import(`@/content/${locale}/${slug}.mdx`);
  validateMetadata(module.metadata, `${locale}/${slug}`);
  return module;
});

export const getGuides = cache(async (locale: Locale): Promise<Guide[]> => {
  const slugs = await discoverContentFiles(path.join(process.cwd(), 'content'), locale);
  const available = await Promise.all(slugs.map(async (slug) => ({ ...(await loadModule(locale, slug)).metadata, slug, available: true })));
  const guides: Guide[] = [...available, ...topics[locale].filter((topic) => !slugs.includes(topic.slug)).map((topic) => ({ ...topic, available: false }))];
  return guides.sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity) || a.slug.localeCompare(b.slug));
});

export async function getGuide(locale: Locale, slug: string) {
  const guide = (await getGuides(locale)).find((entry) => entry.slug === slug && entry.available);
  return guide ? { guide, Content: (await loadModule(locale, slug)).default } : null;
}

