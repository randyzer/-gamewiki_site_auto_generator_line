import { notFound } from 'next/navigation';
import { discoverRoutes, getArticle } from '@/lib/content';
import { parseRoute } from '@/lib/i18n';
import { getMessages } from '@/lib/messages';
import { pageMetadata } from '@/lib/seo';
import { Home } from '@/components/home';
import { GuideList } from '@/components/guide-list';
import { Article } from '@/components/article';
export const dynamicParams = false;
export function generateStaticParams() {
  return discoverRoutes().map(route => ({ path: route.pathname.split('/').filter(Boolean) }));
}
export async function generateMetadata({ params }: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await params;
  const route = parseRoute(`/${path.join('/')}`);
  const m = await getMessages(route.locale);
  if (route.kind === 'home') return pageMetadata(route.locale, '/', `${m.brand} · ${m.tagline}`, m.hero.description);
  if (route.kind === 'guides') return pageMetadata(route.locale, '/guides', m.guides.title, m.guides.description);
  const article = route.slug && getArticle(route.locale, route.slug);
  if (article) return pageMetadata(route.locale, `/guides/${article.slug}`, article.title, article.description);
  return { title: m.notFound.title, robots: { index: false } };
}
export default async function Page({ params }: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await params;
  const route = parseRoute(`/${path.join('/')}`);
  const m = await getMessages(route.locale);
  if (route.kind === 'home') return <Home locale={route.locale} m={m}/>;
  if (route.kind === 'guides') return <GuideList locale={route.locale} m={m}/>;
  const article = route.slug && getArticle(route.locale, route.slug);
  if (article) return <Article article={article} locale={route.locale} m={m}/>;
  notFound();
}
