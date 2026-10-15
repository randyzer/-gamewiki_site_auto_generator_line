import Link from 'next/link';
import type { ReactNode } from 'react';
import type { Locale } from '@/lib/i18n';
import { localePath } from '@/lib/i18n';
import type { Messages } from '@/lib/messages';
import type { GuideEntry } from '@/lib/guides';
import { formatDate } from '@/lib/guides';

export { Container, Icon } from './primitives';
import { Icon } from './primitives';
export function Eyebrow({ children, line = false }: { children: ReactNode; line?: boolean }) {
  return <div className={`eyebrow ${line ? 'eyebrow-line' : ''}`}>{children}</div>;
}
export function Preview({ label, className = '', children }: { label: string; className?: string; children: ReactNode }) {
  return <div className={`preview ${className}`} data-preview="true"><span className="preview-state">{label}</span>{children}</div>;
}
export function SectionHeading({ eyebrow, title, action, locale, href }: { eyebrow: string; title: string; action?: string; locale: Locale; href?: string }) {
  return <div className="section-heading"><div><Eyebrow line>{eyebrow}</Eyebrow><h2>{title}</h2></div>{action && (href ? <Link className="text-link" href={localePath(locale, href)}>{action}<Icon name="arrow"/></Link> : <span className="text-link muted-action" aria-disabled="true">{action}<Icon name="arrow"/></span>)}</div>;
}
export function GuideCard({ guide, locale, m }: { guide: GuideEntry; locale: Locale; m: Messages }) {
  const content = <><div className="card-meta"><span className="category">{guide.category}</span><time dateTime={guide.publishedAt}>{formatDate(guide.publishedAt, locale)}</time>{guide.preview && <span className="inline-preview">{m.preview}</span>}</div><h3>{guide.title}</h3><p className="clamp-2">{guide.description}</p><div className="card-bottom"><span><Icon name="clock"/>{guide.minutes} {m.minutes}</span><span aria-hidden="true">↗</span></div></>;
  return guide.preview ? <div className="guide-card frame" data-guide-card data-preview="true">{content}</div> : <Link href={localePath(locale, `/guides/${guide.slug}`)} className="guide-card frame" data-guide-card>{content}</Link>;
}
export function Pairing({ title, description, items, m, eyebrow }: { title: string; description?: string; items: string[][]; m: Messages; eyebrow?: string }) {
  return <div className="pairing frame">{eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}<h2>{title}</h2>{description && <p>{description}</p>}<div className="grid gap-4 md:grid-cols-3">{items.map(([heading, text]) => <Preview key={heading} label={m.preview} className="small-frame frame"><h3>{heading}</h3><p>{text}</p></Preview>)}</div></div>;
}
