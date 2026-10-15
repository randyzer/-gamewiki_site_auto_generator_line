import Link from 'next/link';
import type { ReactNode } from 'react';
import { localePath, type Locale } from '@/lib/i18n';
import { messages } from '@/lib/messages';
import type { GuideItem } from '@/lib/guide-items';

export const steamUrl = 'https://store.steampowered.com/app/4892010/Bomb_Farm/';
export function Logo({ locale }: { locale: Locale }) {
  return <Link className="logo" href={localePath(locale)} aria-label="Quarry Field Guide"><img src="/icon.svg" width="28" height="28" alt="" /><span>Quarry Field<small>W I K I</small></span></Link>;
}
export function SteamButton({ locale, primary = false }: { locale: Locale; primary?: boolean }) {
  return <a className={`button ${primary ? 'primary' : ''}`} href={steamUrl} target="_blank" rel="noopener noreferrer">{messages[locale].steam}{primary && <span aria-hidden="true"> →</span>}</a>;
}
export function Preview({ children }: { children: ReactNode }) {
  return <span className="preview-inline" data-preview>{children}</span>;
}
export function SectionHeading({ label, title }: { label: string; title: string }) {
  return <div className="section-heading"><p className="eyebrow">{label}</p><h2>{title}</h2></div>;
}
export function Illustration({ locale, className = '' }: { locale: Locale; className?: string }) {
  return <img className={`illustration ${className}`} src="/images/quarry-board.svg" width="1280" height="720" alt={messages[locale].videoStatus} />;
}
export function GuideCard({ item, locale, category = true }: { item: GuideItem; locale: Locale; category?: boolean }) {
  const m = messages[locale];
  const content = <>{category && <span className="eyebrow">{item.category}</span>}<h3>{item.title}</h3><p>{item.description}</p><span className="card-action">{item.slug ? m.read : m.preview}<span aria-hidden="true"> {item.slug ? '→' : '·'}</span></span></>;
  return item.slug ? <Link className="card guide-card" href={localePath(locale, item.slug)}>{content}</Link> : <article className="card guide-card" data-preview>{content}</article>;
}
export function Faq({ locale, items, home = false }: { locale: Locale; items: { question: string; answer: string }[]; home?: boolean }) {
  const m = messages[locale];
  return <section className="faq" aria-labelledby="faq-heading"><div className="faq-heading"><p className="eyebrow">FAQ</p><h2 id="faq-heading">{home ? m.wikiFaq : m.faqTitle}</h2><p>{m.faqIntro}</p></div><div className="faq-list">{items.map(item => <details key={item.question}><summary>{item.question}<span className="chevron" aria-hidden="true" /></summary><div className="faq-answer">{item.answer}</div></details>)}</div></section>;
}
