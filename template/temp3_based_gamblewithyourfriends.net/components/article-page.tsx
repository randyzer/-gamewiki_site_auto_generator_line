import { MDXRemote } from 'next-mdx-remote/rsc';
import type { Article } from '@/lib/content';
import { getMessages } from '@/lib/messages';
import { Action, PageIntro } from './shared';
import { getMdxComponents } from './mdx-components';
import { mdxOptions } from '@/lib/mdx';
export function ArticlePage({ article }: { article: Article }) {
  const t = getMessages(article.locale);
  return <>
    <PageIntro locale={article.locale} title={<>{t.articleGame}<br />{article.title}</>} breadcrumbTitle={article.title} description={article.description} badge={article.category}>
      <div className="article-meta">{t.articleMeta}</div>
    </PageIntro>
    <article className="shell narrow page-sections article-body" data-mdx={article.slug}>
      <MDXRemote source={article.source} components={getMdxComponents(article.locale)} options={{ mdxOptions }} />
      <section className="article-cta surface" data-article-section><h2>{t.articleMore}</h2><p>{t.articleMoreDescription}</p><div className="actions"><Action locale={article.locale} slug="guide">{t.complete}</Action><Action locale={article.locale} slug="" secondary>{t.home}</Action></div></section>
    </article>
  </>;
}
