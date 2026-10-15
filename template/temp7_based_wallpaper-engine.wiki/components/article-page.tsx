import Link from 'next/link';
import { evaluate } from '@mdx-js/mdx';
import * as runtime from 'react/jsx-runtime';
import remarkGfm from 'remark-gfm';
import { articlePath, headingsFromMdx, type Article } from '@/lib/content';
import { remarkHeadingIds } from '@/lib/headings';
import { getCatalog, getCategories } from '@/lib/previews';
import { categoryLabel, localePath, text } from '@/lib/i18n';
import { Breadcrumb, Card } from './shared';
import { AdSlot, ArticleTools, BackToTop, MobileContents, VideoPreview } from './interactive';
import { Icon } from './icon';
export async function ArticlePage({article}:{article:Article}) {
  const {locale}=article; const headings=headingsFromMdx(article.body);
  const compiled=await evaluate(article.body,{...runtime,remarkPlugins:[remarkGfm,remarkHeadingIds]});
  const Content=compiled.default;
  const catalog=getCatalog(locale);
  const related=catalog.filter(e=>e.slug!==article.slug&&e.category===article.category).slice(0,2);
  related.push(...catalog.filter(e=>e.category==='buying').slice(-1));
  const date=(value:string)=>new Date(value).toLocaleDateString(locale,{timeZone:'UTC'});
  return <div className="article-layout"><article className="article-main"><Breadcrumb locale={locale} category={article.category} detail/><header className="article-header"><p className="article-category"><Icon name="book" size={14}/>{article.category==='guide'?text(locale,'Wallpaper Engine Guides','Wallpaper Engine 使用指南'):categoryLabel(article.category,locale)}</p><h1 className="gradient-title">{article.title}</h1><p className="article-description">{article.description}</p><div className="article-meta"><span><Icon name="calendar" size={14}/>{date(article.publishedAt)}</span><span><Icon name="user" size={14}/>{article.author??text(locale,'Motion Desktop Editors','Motion Desktop 编辑组')}</span><span><Icon name="clock" size={14}/>{text(locale,'Last updated:','最后更新：')} {date(article.updatedAt??article.publishedAt)}</span><ArticleTools locale={locale}/></div></header>
    <section className="article-video"><VideoPreview locale={locale}/></section>
    {article.quickAnswer&&<aside className="quick-answer"><Icon name="bulb" size={16}/><div><p className="quick-answer-label">{text(locale,'Quick answer','快速解答')}</p><div className="quick-answer-copy">{article.quickAnswer}</div></div></aside>}
    <figure className="article-cover"><img src={article.cover} width="960" height="540" alt={text(locale,'Original illustration of a desktop wallpaper installation window','原创插图：动态壁纸首次安装界面')} fetchPriority="high"/><figcaption>{text(locale,'Illustrated first-run workspace: choose a wallpaper, then review your playback preferences. · Original Motion Desktop illustration','首次使用示意：选择壁纸之后，再检查自己的播放偏好。· Motion Desktop 原创插图')}</figcaption></figure>
    <MobileContents locale={locale} headings={headings}/>
    <div className="article-prose"><Content components={{AdSlot,table:({children})=><div className="table-scroll"><table>{children}</table></div>}}/></div>
    <div className="article-tags">{article.tags.map(tag=><span key={tag}># {tag}</span>)}</div><AdSlot/>
    <section className="related-section"><h2 className="accent-heading">{text(locale,'Related Articles','相关文章')}</h2><div className="related-grid">{related.map(e=><Card key={e.category+e.slug} entry={e} locale={locale} variant="related"/>)}</div></section>
  </article><aside className="article-sidebar"><div className="sidebar-sticky"><nav className="desktop-toc" aria-label={text(locale,'On this page','本页目录')}><p>{text(locale,'On this page','本页目录')}</p>{headings.map(h=><a href={`#${h.id}`} key={h.id}>{h.title}</a>)}</nav><div className="sidebar-catalog"><h2 className="accent-heading">MD Wiki</h2>{getCategories(catalog).map(category=><div key={category}><div className="sidebar-category"><Icon name="book" size={14}/>{catalog.some(e=>e.category===category&&e.article)?<Link href={localePath(locale,category)}>{categoryLabel(category,locale)}</Link>:<span>{categoryLabel(category,locale)}</span>}<small>{catalog.filter(e=>e.category===category).length}</small></div><ul>{catalog.filter(e=>e.category===category).map(e=><li key={e.slug}>{e.article?<Link href={articlePath(e.article)} aria-current={e.slug===article.slug?'page':undefined}>{e.title}</Link>:<span title={text(locale,'Preview','预览')}>{e.title}<small>{text(locale,'Preview','预览')}</small></span>}</li>)}</ul></div>)}</div></div></aside><BackToTop locale={locale}/></div>;
}
