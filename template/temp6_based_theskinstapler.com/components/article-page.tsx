import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getGuide, getGuides } from '@/lib/guides';
import { guideHref, localePath, type Locale } from '@/lib/locales';
import { getMessages } from '@/lib/messages';
import { getMDXComponents } from '@/mdx-components';
import { SectionHeading, SourceCallout, OverviewNote } from './ui';

export async function ArticlePage({ locale, slug }: { locale: Locale; slug: string }) {
  const result = await getGuide(locale, slug);
  if (!result) notFound();
  const { guide, Content } = result;
  const t = getMessages(locale);
  const guides = await getGuides(locale);
  const preferred = guide.related?.flatMap((relatedSlug) => guides.filter((entry) => entry.slug === relatedSlug)) ?? [];
  const related = [...preferred, ...guides.filter((entry) => entry.category === guide.category), ...guides]
    .filter((entry, index, entries) => entry.slug !== slug && entry.status !== 'Draft' && entries.findIndex((item) => item.slug === entry.slug) === index).slice(0, 3);
  return <article className="article-page container">
    <nav aria-label={t.nav[4]} className="breadcrumbs"><Link href={localePath(locale)}>{t.nav[0]}</Link><span aria-hidden="true">/</span><Link href={localePath(locale, '/guides')}>{t.nav[4]}</Link><span aria-hidden="true">/</span><span aria-current="page">{slug.replaceAll('-', ' ')}</span></nav>
    <header className="article-header"><div className="flex flex-wrap gap-3"><span className="badge badge-green">{guide.category === 'Story' ? t.article.spoilers : t.article.guide}</span><span className="badge">{t.article.note}</span></div><h1>{guide.title}</h1><p>{guide.description}</p></header>
    <OverviewNote locale={locale}/>
    {guide.cover && <figure className="article-figure"><Image src={guide.cover} alt={t.article.caption} width={1600} height={900} priority/><figcaption><span>{t.article.caption}</span><span>{t.article.credit}</span></figcaption></figure>}
    <div className="article-body"><Content components={getMDXComponents(locale)}/></div>
    <nav className="card article-related" aria-label={t.article.related}><SectionHeading eyebrow={t.article.related}>{t.article.continue}</SectionHeading><div className="related-grid">{related.map((entry) => <Link href={guideHref(locale, entry)} key={entry.slug}><strong>{entry.shortTitle ?? entry.title}</strong><span>{entry.summary ?? entry.description}</span>{!entry.available && <small className="related-preview">{t.previewLabel}</small>}</Link>)}</div></nav>
    <SourceCallout locale={locale}/>
  </article>;
}
