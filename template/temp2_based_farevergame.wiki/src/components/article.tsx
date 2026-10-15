import Link from 'next/link';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { getArticles, type Article } from '@/lib/content';
import { localPath } from '@/lib/i18n';
import { getMessages } from '@/lib/messages';
import { articleCard, Divider, GuideCard, PageHeading } from './shared';
export function ArticlePage({ article }: { article: Article }) {
  const m=getMessages(article.locale);
  const related=[...getArticles(article.locale).filter(a=>a.slug!==article.slug && a.category===article.category).map(articleCard),...m.previews.slice(0,2)].slice(0,2);
  return <article className="article-shell"><PageHeading tag={m.bestStart} title={article.title} description={article.description}/><div className="article-body"><MDXRemote source={article.content}/></div><Divider/><section className="related"><h2>{m.related}</h2><div className="grid-two">{related.map(d=><GuideCard key={d.slug} data={d} locale={article.locale} compact tag={m.category}/>)}</div></section><Divider/><p className="article-return">{m.browse} <Link href={localPath(article.locale,'guide')}>{m.hub}</Link>, {m.or} <Link href={localPath(article.locale)}>{m.homeLink}</Link>.</p></article>;
}
