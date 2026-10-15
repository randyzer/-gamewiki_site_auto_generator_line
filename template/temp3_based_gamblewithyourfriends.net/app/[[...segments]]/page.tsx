import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getArticle, getPages, translatedPaths } from '@/lib/content';
import { getMessages } from '@/lib/messages';
import { indexable, parseRoute, pathFor, siteUrl } from '@/lib/site';
import { Header } from '@/components/header';
import { Footer } from '@/components/shared';
import { HomePage } from '@/components/home-page';
import { GuidePage } from '@/components/guide-page';
import { ArticlePage } from '@/components/article-page';

export const dynamic = 'force-static';
export const dynamicParams = false;
type Props = { params: Promise<{ segments?: string[] }> };
export function generateStaticParams() {
  return getPages().map(page => ({ segments: page.path.split('/').filter(Boolean) }));
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const route = parseRoute((await params).segments);
  if (!route) return {};
  const t = getMessages(route.locale);
  const article = getArticle(route.locale, route.slug);
  const title = route.slug === '' ? `${t.heroTitle} ${t.heroHighlight}` : route.slug === 'guide' ? t.guideTitle : article?.title;
  if (!title) return {};
  const description = route.slug === '' ? t.heroDescription : route.slug === 'guide' ? t.guideDescription : article!.description;
  return {
    title, description,
    alternates: { canonical: pathFor(route.locale, route.slug), languages: translatedPaths(route.slug) },
    robots: { index: indexable, follow: true },
    openGraph: { title, description, locale: route.locale.replace('-', '_'), url: `${siteUrl}${pathFor(route.locale, route.slug)}`, type: article ? 'article' : 'website' },
  };
}
export default async function Page({ params }: Props) {
  const route = parseRoute((await params).segments);
  if (!route) notFound();
  const t = getMessages(route.locale);
  const article = route.slug && route.slug !== 'guide' ? getArticle(route.locale, route.slug) : undefined;
  if (route.slug && route.slug !== 'guide' && !article) notFound();
  return <html lang={route.locale}><body>
    <Header locale={route.locale} slug={route.slug} t={t} />
    <main>{route.slug === '' ? <HomePage locale={route.locale} /> : route.slug === 'guide' ? <GuidePage locale={route.locale} /> : <ArticlePage article={article!} />}</main>
    <Footer locale={route.locale} />
  </body></html>;
}
