import Link from 'next/link';
import type { ReactNode } from 'react';
import type { Guide } from '@/lib/guides';
import { localePath, type Locale } from '@/lib/locales';
import { getMessages } from '@/lib/messages';

export function Brand({ locale, footer = false }: { locale: Locale; footer?: boolean }) {
  return <Link href={localePath(locale)} className={`brand${footer ? ' footer-logo' : ''}`} aria-label="Midnight Evidence Wiki">
    <svg className="logo" viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="8" fill="#100e1d"/><path d="M10 29V11l10 12 10-12v18" fill="none" stroke="#9b86ff" strokeWidth="2"/><path d="M7 6h26v28H7z" fill="none" stroke="#594885"/><circle cx="20" cy="32" r="1.5" fill="#65c9bd"/></svg>
    <span className="brand-name"><span>Midnight Evidence</span> Wiki</span>
  </Link>;
}

export function ButtonLink({ href, children, variant = 'primary' }: { href: string; children: ReactNode; variant?: 'primary' | 'outline' | 'neutral' }) {
  return <Link className={`button button-${variant}`} href={href}>{children}</Link>;
}

export function SectionHeading({ eyebrow, children }: { eyebrow?: string; children: ReactNode }) {
  return <>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h2 className="section-title">{children}</h2></>;
}

export function GuideCard({ guide, locale }: { guide: Guide; locale: Locale }) {
  const t = getMessages(locale);
  const category = guide.available ? guide.category : t.previewLabel;
  const contents = <>
    <div className="guide-card-top"><h2>{guide.title}</h2><span className={`badge ${guide.status === 'Reviewed' ? 'badge-green' : ''}`}>{t.categories[category as keyof typeof t.categories] ?? category}</span></div>
    <p>{guide.listDescription ?? guide.description}</p>
    <span className="card-link">{guide.available ? t.openGuide : t.previewGuide}</span>
  </>;
  return guide.available ? <Link id={guide.slug} className="card guide-card" href={localePath(locale, `/guides/${guide.slug}`)}>{contents}</Link>
    : <article id={guide.slug} className="card guide-card draft-card">{contents}</article>;
}

export function OverviewNote({ locale }: { locale: Locale }) {
  const t = getMessages(locale);
  return <p className="overview-note">{t.overviewBefore}<Link href={localePath(locale)}>Midnight Evidence</Link>{t.overviewAfter}</p>;
}

export function SourceCallout({ locale, index = false }: { locale: Locale; index?: boolean }) {
  const t = getMessages(locale);
  return <section className={`card source-callout${index ? ' index-callout' : ' article-callout'}`}>
    <h2>{t.callout[index ? 0 : 3]}</h2><p>{t.callout[index ? 1 : 4]}</p>
    <div className="callout-actions"><ButtonLink href={localePath(locale, '/guides#beginner')}>{t.callout[2]}</ButtonLink>{!index && <ButtonLink href={localePath(locale, '/guides')} variant="outline">{t.callout[5]}</ButtonLink>}</div>
  </section>;
}
