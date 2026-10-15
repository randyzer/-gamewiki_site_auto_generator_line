import Link from 'next/link';
import type { ReactNode } from 'react';
import { Icon } from './icon';

export function Preview({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`preview ${className}`} aria-disabled="true">{children}</span>;
}
export function Action({ children, href, preview, primary = false }: { children: ReactNode; href?: string; preview: string; primary?: boolean }) {
  const content = <><Icon name="sword" />{children}{href ? <Icon name="arrow" /> : <small className="preview-tag">{preview}</small>}</>;
  return href ? <Link className={`action ${primary ? 'primary' : ''}`} href={href}>{content}</Link> : <Preview className={`action ${primary ? 'primary' : ''}`}>{content}</Preview>;
}
export function AdSlot({ label }: { label: string }) {
  return <div className="ad-wrap"><div className="ad-slot" role="note" aria-label={label}><span>{label}</span></div></div>;
}
export function GuideCard({ title, description, href, preview, read }: { title: string; description: string; href?: string; preview: string; read: string }) {
  const inner = <><div className="card-heading"><h3>{title}</h3>{!href && <small className="preview-tag">{preview}</small>}</div><p>{description}</p><span className="read-more">{href ? read : preview}<Icon name="arrow" size={13} /></span></>;
  return href ? <Link className="guide-card" href={href}>{inner}</Link> : <Preview className="guide-card">{inner}</Preview>;
}
export function Breadcrumb({ home, category, current, homeHref, categoryHref }: { home: string; category: string; current?: string; homeHref: string; categoryHref: string }) {
  return <nav className="breadcrumb" aria-label="Breadcrumb"><Link href={homeHref}>{current ? <><Icon name="book" size={14} /><span className="sr-only">{home}</span></> : home}</Link><Icon name="chevron" size={12} />{current ? <><Link href={categoryHref}>{category}</Link><Icon name="chevron" size={12} /><span aria-current="page">{current}</span></> : <span aria-current="page">{category}</span>}</nav>;
}
