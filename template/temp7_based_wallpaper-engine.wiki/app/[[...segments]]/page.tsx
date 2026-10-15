import { notFound } from 'next/navigation';
import { discoverArticles, discoverRoutes, translationPaths, articlePath } from '@/lib/content';
import { resolveSegments, text, categoryLabel, type Locale } from '@/lib/i18n';
import { pageMetadata } from '@/lib/seo';
import { getCatalog } from '@/lib/previews';
import { Header } from '@/components/header';
import { Footer, Breadcrumb, Card } from '@/components/shared';
import { TopAd } from '@/components/interactive';
import { HomePage } from '@/components/home-page';
import { ArticlePage } from '@/components/article-page';
import { Icon } from '@/components/icon';
export const dynamicParams=false;
export function generateStaticParams() {
  return discoverRoutes().map(route=>({segments:[...(route.locale==='en'?[]:['zh-cn']),...route.parts]}));
}
export async function generateMetadata({params}:{params:Promise<{segments?:string[]}>}) {
  const {locale,parts}=resolveSegments((await params).segments);return pageMetadata(locale,parts);
}
function DirectoryPage({locale,category}:{locale:Locale;category:string}) {
  const catalog=getCatalog(locale).filter(e=>e.category===category);
  return <><header className="directory-header"><Breadcrumb locale={locale} category={category}/><div className="directory-title"><Icon name="book" size={28}/><h1 className="gradient-title">{category==='guide'?text(locale,'Wallpaper Engine Guides','Wallpaper Engine 使用指南'):categoryLabel(category,locale)}</h1></div><p>{category==='guide'?text(locale,'Understand the app, set up your first wallpaper, explore the Workshop and review the preferences that keep your desktop comfortable to use.','从认识应用、安装第一张动态壁纸，到了解创意工坊与基础性能设置，逐步建立适合自己日常使用的动态桌面。'):text(locale,`Published guides and upcoming topics in ${categoryLabel(category,locale)}.`,`浏览${categoryLabel(category,locale)}分类中已发布的指南和主题预览。`)}</p></header><div className="directory-grid">{catalog.map(entry=><Card key={entry.slug} entry={entry} locale={locale} variant="directory"/>)}</div></>;
}
export default async function Page({params}:{params:Promise<{segments?:string[]}>}) {
  const {locale,parts}=resolveSegments((await params).segments);
  const articles=discoverArticles();const route=discoverRoutes(articles).find(r=>r.locale===locale&&r.parts.join('/')===parts.join('/'));
  if(!route)notFound();
  const searchEntries=articles.filter(a=>a.locale===locale).map(a=>({title:a.title,description:a.description,href:articlePath(a),body:a.body}));
  return <><Header locale={locale} translations={translationPaths(locale,parts,articles)} searchEntries={searchEntries} category={parts[0]}/><TopAd locale={locale}/><div className="page-backdrop" aria-hidden="true"/><main className={`site-main ${route.article?'article-container':''}`} id="main-content">{route.article?<ArticlePage article={route.article}/>:parts.length?<DirectoryPage locale={locale} category={parts[0]}/>:<HomePage locale={locale}/>}</main><Footer locale={locale}/></>;
}
