import type { Metadata } from 'next';
import { discoverArticles, discoverRoutes, translationPaths } from './content.ts';
import { type Locale, text, categoryLabel } from './i18n.ts';
export const siteName = 'Motion Desktop Wiki';
export function siteUrl() { return new URL(process.env.SITE_URL || 'http://localhost:3000').origin; }
export function indexable() { return process.env.SITE_INDEXABLE === 'true'; }
export function pageMetadata(locale: Locale, parts: string[]): Metadata {
  const articles=discoverArticles();
  const route=discoverRoutes(articles).find(r=>r.locale===locale&&r.parts.join('/')===parts.join('/'));
  if(!route) return {title:'Page not found',robots:{index:false,follow:false}};
  const title=route.article?.title ?? (parts.length ? (parts[0]==='guide'?text(locale,'Wallpaper Engine Guides','Wallpaper Engine 使用指南'):categoryLabel(parts[0],locale)) : text(locale,'Live Wallpapers, Setup and Desktop Guides','动态壁纸、桌面设置与使用指南'));
  const description=route.article?.description ?? text(locale,'Independent desktop wallpaper guides, with practical installation steps and a clear introduction to the topics to explore next.','独立的动态桌面参考站，提供清晰的安装步骤、壁纸使用说明与后续主题预览。');
  const translations=translationPaths(locale,parts,articles);
  const languages: Record<string,string>=Object.fromEntries(Object.entries(translations).map(([lang,p])=>[lang,siteUrl()+p]));
  languages['x-default']=siteUrl()+(translations.en ?? route.path);
  return {
    metadataBase:new URL(siteUrl()),title:`${title} — ${siteName}`,description,
    alternates:{canonical:siteUrl()+route.path,languages},
    robots:{index:indexable(),follow:true},
    openGraph:{title,description,url:siteUrl()+route.path,siteName,locale:locale==='en'?'en_US':'zh_CN',type:route.article?'article':'website',images:[{url:route.article?.cover??'/images/galaxy.svg'}]},
  };
}
