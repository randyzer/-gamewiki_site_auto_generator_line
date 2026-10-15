import Link from 'next/link';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { localePath, type Locale } from '@/lib/i18n';
import type { Messages } from '@/lib/messages';
import type { Article as ArticleData } from '@/lib/content';
import { formatDate, getGuideEntries } from '@/lib/guides';
import { siteUrl } from '@/lib/seo';
import { Container, Eyebrow, GuideCard, Icon, Pairing, SectionHeading } from './ui';
export function Article({ article, locale, m }: { article: ArticleData; locale: Locale; m: Messages }) {
  const related = getGuideEntries(locale, m).filter(e => e.slug !== article.slug).slice(0, 3);
  const schema = { '@context': 'https://schema.org', '@type': 'Article', headline: article.title, description: article.description, datePublished: article.publishedAt, inLanguage: locale, author: { '@type': 'Organization', name: article.author }, url: new URL(localePath(locale, `/guides/${article.slug}`), siteUrl).href };
  return <main><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }}/><section className="article-hero page-hero"><div className="article-heading"><Link className="back-link" href={localePath(locale, '/guides')}>← {m.backGuides}</Link><Eyebrow>{m.article.eyebrow} <span className="dim">//</span> {article.category}</Eyebrow><h1>{article.title}</h1><p>{article.description}</p><div className="article-meta"><span>♙ {article.author}</span><time dateTime={article.publishedAt}>▣ {formatDate(article.publishedAt, locale)}</time><span><Icon name="clock"/>{article.minutes} {m.minutes} {m.read}</span></div><div className="tags">{article.tags.map(tag => <span key={tag}>#{tag}</span>)}</div></div></section><article className="article-container"><div className="article-body frame" data-mdx-body><MDXRemote source={article.body} options={{ blockJS: true }}/></div><Pairing eyebrow={m.article.seeAlso} title={m.article.apply} description={m.article.applyDescription} items={m.article.pairItems} m={m}/></article><section className="related-section tinted bordered"><Container><SectionHeading eyebrow={m.article.continue} title={m.article.more} action={m.allGuides} locale={locale} href="/guides"/><div className="three-grid">{related.map(g => <GuideCard key={g.slug} guide={g} locale={locale} m={m}/>)}</div></Container></section></main>;
}
