import { notFound } from 'next/navigation';
import { categoriesFor, discoverArticles, siteRoutes } from '@/lib/content';
import { resolvePath } from '@/lib/i18n';
import { pageMetadata } from '@/lib/seo';
import { messages } from '@/lib/messages';
import { SiteShell } from '@/components/site-shell';
import { HomePage, CategoryPage, ArticlePage } from '@/components/page-templates';

type Props = { params: Promise<{ segments?: string[] }> };
export const dynamicParams = false;
export function generateStaticParams() {
  return siteRoutes().map(route => ({ segments: route === '/' ? [] : route.slice(1).split('/') }));
}
export async function generateMetadata({ params }: Props) {
  const { locale, parts, pathname } = resolvePath((await params).segments);
  const m = messages[locale];
  const article = discoverArticles().find(x => x.locale === locale && `/${x.category}/${x.slug}` === pathname);
  return pageMetadata(locale, pathname, article?.title || (parts.length ? (parts[0] === 'races' ? m.raceTitle : parts[0]) : 'Spirit Atlas'), article?.description || (parts.length ? m.raceDescription : m.heroDescription));
}
export default async function Page({ params }: Props) {
  const { locale, parts, pathname } = resolvePath((await params).segments);
  const articles = discoverArticles();
  const article = articles.find(x => x.locale === locale && `/${x.category}/${x.slug}` === pathname);
  const isCategory = parts.length === 1 && categoriesFor(locale, articles).includes(parts[0]);
  if (parts.length && !isCategory && !article) notFound();
  const links = articles.filter(x => x.locale === locale && x.category === 'races').map(x => ({ title: x.title, path: `/${x.category}/${x.slug}` }));
  return <SiteShell locale={locale} pathname={pathname} articleLinks={links}>{article ? <ArticlePage article={article} related={articles.filter(x => x.locale === locale && x.category === article.category && x.slug !== article.slug)} /> : isCategory ? <CategoryPage locale={locale} category={parts[0]} articles={articles} /> : <HomePage locale={locale} />}</SiteShell>;
}
