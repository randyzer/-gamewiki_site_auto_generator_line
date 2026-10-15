import { notFound } from 'next/navigation';
import { Home } from '@/components/home';
import { ArticlePage } from '@/components/article';
import { getArticle } from '@/lib/content';
import { resolvePath } from '@/lib/i18n';
import { getMessages } from '@/lib/messages';
import { discoverRoutes } from '@/lib/routes';
import { pageMetadata } from '@/lib/seo';
import { guideCards, GuideCard, PageHeading } from '@/components/shared';
export const dynamicParams = false;
export const dynamic = 'force-static';
export function generateStaticParams() { return discoverRoutes().map(r => ({path:r.url.split('/').filter(Boolean)})); }
type Props = { params: Promise<{path?:string[]}> };
export async function generateMetadata({params}:Props) {
  const route=resolvePath((await params).path);if(!route)return {};
  const m=getMessages(route.locale);
  if(route.kind==='article'){const a=getArticle(route.locale,route.slug!);return a?pageMetadata(route.locale,route.suffix,a.title,a.description):{};}
  return pageMetadata(route.locale,route.suffix,route.kind==='home'?'Aurelia Atlas':m.listTitle,route.kind==='home'?m.heroDescription:m.listDescription);
}
export default async function Page({params}:Props) {
  const route=resolvePath((await params).path);if(!route)notFound();
  if(route.kind==='home')return <Home locale={route.locale}/>;
  if(route.kind==='article'){const article=getArticle(route.locale,route.slug!);if(!article)notFound();return <ArticlePage article={article}/>;}
  const m=getMessages(route.locale);
  return <div className="container list-shell"><PageHeading tag={m.walkthroughs} title={m.listTitle} description={m.listDescription}/><div className="grid-three guide-grid">{guideCards(route.locale).map((data,i)=><GuideCard key={data.slug??i} data={data} locale={route.locale} tag={data.category && data.category!=='walkthroughs'?data.category:m.category}/>)}</div></div>;
}
