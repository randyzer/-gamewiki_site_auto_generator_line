import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { locales, parseRoute, type Locale } from '@/lib/locales';
import { discoverContentFiles } from '@/lib/content-files';
import { getGuide } from '@/lib/guides';
import { getMessages } from '@/lib/messages';
import { alternates } from '@/lib/site';
import { HomePage } from '@/components/home-page';
import { GuidesPage } from '@/components/guides-page';
import { ArticlePage } from '@/components/article-page';
import path from 'node:path';

type Props = { params: Promise<{ segments?: string[] }> };
export const dynamicParams = false;

export async function generateStaticParams() {
  const params: { segments: string[] }[] = [];
  for (const locale of locales) {
    const prefix = locale === 'en' ? [] : [locale];
    params.push({ segments: prefix }, { segments: [...prefix, 'guides'] });
    for (const slug of await discoverContentFiles(path.join(process.cwd(), 'content'), locale)) {
      params.push({ segments: [...prefix, 'guides', slug] });
    }
  }
  return params;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const route = parseRoute((await params).segments);
  if (!route) return { title: '404', robots: { index: false, follow: false } };
  const { locale, type, slug } = route;
  const t = getMessages(locale);
  const guide = type === 'article' ? await getGuide(locale, slug!) : null;
  if (type === 'article' && !guide) return { title: t.notFound[0], robots: { index: false, follow: false } };
  const routePath = type === 'home' ? '/' : type === 'guides' ? '/guides' : `/guides/${slug}`;
  const availableLocales: Locale[] = [];
  for (const code of locales) {
    if (type !== 'article' || await getGuide(code, slug!)) availableLocales.push(code);
  }
  const routeAlternates = alternates(locale, routePath, availableLocales);
  return {
    title: guide?.guide.title ?? (type === 'home' ? `${t.homeTitle} Wiki — ${t.guidesTitle}` : t.guidesTitle),
    description: guide?.guide.description ?? (type === 'home' ? t.homeDescription : t.guidesDescription),
    alternates: routeAlternates,
    openGraph: { locale: locale.replace('-', '_'), type: type === 'article' ? 'article' : 'website' },
  };
}

export default async function Page({ params }: Props) {
  const route = parseRoute((await params).segments);
  if (!route) notFound();
  if (route.type === 'home') return <HomePage locale={route.locale}/>;
  if (route.type === 'guides') return <GuidesPage locale={route.locale}/>;
  return <ArticlePage locale={route.locale} slug={route.slug!}/>;
}
