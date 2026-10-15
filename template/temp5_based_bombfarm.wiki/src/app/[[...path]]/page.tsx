import { notFound } from 'next/navigation';
import { discoverContent, allRoutes } from '@/lib/content';
import { parsePath, locales } from '@/lib/i18n';
import { metadata } from '@/lib/seo';
import { messages } from '@/lib/messages';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Home } from '@/components/home';
import { DocumentPage } from '@/components/document';

export const dynamicParams = false;
export function generateStaticParams() {
  return allRoutes(discoverContent()).map(url => ({ path: url.split('/').filter(Boolean) }));
}
type Props = { params: Promise<{ path?: string[] }> };
export async function generateMetadata({ params }: Props) {
  const route = parsePath((await params).path);
  if (!route) return { title: 'Page not found', robots: { index: false } };
  const docs = discoverContent();
  const doc = docs.find(item => item.locale === route.locale && item.slug === route.slug);
  if (route.slug && !doc) return { title: 'Page not found', robots: { index: false } };
  return metadata(route.locale, route.slug, doc?.title ?? messages[route.locale].heroTitle, doc?.description ?? messages[route.locale].intro, docs);
}
export default async function Page({ params }: Props) {
  const route = parsePath((await params).path);
  if (!route) notFound();
  const docs = discoverContent();
  const doc = docs.find(item => item.locale === route.locale && item.slug === route.slug);
  if (route.slug && !doc) notFound();
  const available = route.slug ? locales.filter(locale => docs.some(item => item.locale === locale && item.slug === route.slug)) : [...locales];
  return <><Header locale={route.locale} slug={route.slug} available={available}/><main id="main-content"><div className="reference-banner" aria-hidden="true"/>{doc ? <DocumentPage doc={doc} docs={docs}/> : <Home locale={route.locale} docs={docs}/>}</main><Footer locale={route.locale}/></>;
}
