import Link from 'next/link';
import type { ReactNode } from 'react';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { headings, headingId, type Document as GuideDocument } from '@/lib/content';
import { localePath } from '@/lib/i18n';
import { messages } from '@/lib/messages';
import { relatedGuides } from '@/lib/guide-items';
import { Faq, GuideCard, Illustration, Preview } from './primitives';

type AstNode = { type: string; tagName?: string; value?: string; children?: AstNode[]; properties?: Record<string, unknown> };
function addHeadingIds() {
  return (tree: AstNode) => {
    const seen = new Map<string, number>();
    const text = (node: AstNode): string => node.value ?? node.children?.map(text).join('') ?? '';
    function walk(node: AstNode) {
      if (node.tagName === 'h2') node.properties = { ...node.properties, id: headingId(text(node), seen) };
      node.children?.forEach(walk);
    }
    walk(tree);
  };
}
export function DocumentPage({ doc, docs }: { doc: GuideDocument; docs: GuideDocument[] }) {
  const m = messages[doc.locale];
  const outline = headings(doc.body);
  const related = relatedGuides(doc.locale, doc.slug, docs);
  return <article className="document container"><nav className="breadcrumbs" aria-label={m.nav[1]}><Link href={localePath(doc.locale)}>{m.nav[0]}</Link><span>/</span><Link href={localePath(doc.locale, 'guides')}>{m.nav[1]}</Link><span>/</span><span aria-current="page">{doc.title}</span></nav><div className="document-heading"><span className="category-badge">{doc.category}</span><h1>{doc.title}</h1><p>{doc.description}</p><div className="document-date">{m.updated}: <time dateTime={doc.publishedAt}>{doc.publishedAt}</time></div></div><Illustration locale={doc.locale} className="document-cover"/><div className="document-columns"><div className="prose" data-mdx-body><MDXRemote source={doc.body} options={{ blockJS: true, mdxOptions: { rehypePlugins: [addHeadingIds] } }} components={{
    GuideLink: ({ slug, children }: { slug: string; children: ReactNode }) => <Link href={localePath(doc.locale, slug)}>{children}</Link>,
    Preview,
    VideoPreview: () => <figure className="video-preview"><img src="/images/quarry-board.svg" alt={m.video} width="1280" height="720"/><span className="play-mark" aria-hidden="true">▶</span><figcaption>{m.videoStatus}</figcaption></figure>,
  }}/></div><aside className="document-aside"><nav className="toc" aria-label={m.toc}><p>{m.toc}</p><ul>{outline.map(item => <li key={item.id}><a href={`#${item.id}`}>{item.text}</a></li>)}</ul></nav></aside></div><Faq locale={doc.locale} items={doc.faq}/><section className="related"><p className="eyebrow">{m.related}</p><h2>{m.keepReading}</h2><div className="grid-three">{related.map(item => <GuideCard locale={doc.locale} item={item} category={false} key={item.slug ?? item.title}/>)}</div></section></article>;
}
