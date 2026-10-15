import Link from 'next/link';
import type { ReactNode } from 'react';
import { getArticles, type Article } from '@/lib/content';
import { localeNames, locales, localPath, type Locale } from '@/lib/i18n';
import { getMessages } from '@/lib/messages';
import { discoverRoutes } from '@/lib/routes';
export interface CardData { title: string; description?: string; slug?: string; category?: string; href?: string }
export function Divider() { return <div className="ornament" aria-hidden="true"><span>◆</span></div>; }
export function Eyebrow({ children }: { children: ReactNode }) { return <p className="eyebrow"><span aria-hidden="true">◆</span>{children}<span aria-hidden="true">◆</span></p>; }
export function PageHeading({ tag, title, description }: { tag: string; title: string; description: string }) { return <header className="page-heading"><Eyebrow>{tag}</Eyebrow><h1 className="gradient-text">{title}</h1><p>{description}</p><Divider /></header>; }
export function Section({ id, tag, title, children }: { id: string; tag: string; title: string; children: ReactNode }) { return <section id={id} className="home-section"><div className="section-heading"><p className="eyebrow">{tag}</p><h2>{title}</h2><Divider /></div>{children}</section>; }
export function Header({ locale, current }: { locale: Locale; current: string }) {
  const m = getMessages(locale);
  const primary = m.primaryNav;
  const secondary = m.secondaryNav;
  const item = (text: string, i: number, mobile = false) => i === 4 || i === 5 ? <Link key={i} href={localPath(locale, 'guide')} aria-current={i === 4 && current.startsWith('guide') ? 'page' : undefined}>{text}</Link> : <span key={i} aria-disabled="true" title={m.preview} className={mobile ? '' : 'nav-preview'}>{text}</span>;
  return <header className="site-header"><div className="header-top"><div className="container header-inner"><Link className="brand" href={localPath(locale)} aria-label={`Aurelia ${m.homeLink}`}><img src="/emblem.svg" alt="" width="42" height="42"/><span><span className="brand-name">Aurelia</span><span className="brand-tag">{m.tagline}</span></span></Link><nav aria-label={m.footerGroups.split('|')[0]} className="desktop-nav">{primary.map((s,i)=>item(s,i))}</nav><Link href={localPath(locale,'guide')} className="pill gold header-cta">{m.library}</Link></div></div><div className="desktop-secondary"><nav className="container" aria-label={m.footerGroups.split('|')[1]}>{secondary.map((text,i)=><span key={i} title={m.preview} aria-disabled="true">{text}</span>)}</nav></div><nav className="mobile-nav" aria-label={m.library}>{primary.map((s,i)=>item(s,i,true))}{secondary.map((text,i)=><span key={`secondary-${i}`} title={m.preview} aria-disabled="true">{text}</span>)}</nav></header>;
}
export function GuideCard({ data, locale, compact = false, icon, tag, children, className = '' }: { data: CardData; locale: Locale; compact?: boolean; icon?: string; tag?: string; children?: ReactNode; className?: string }) {
  const m=getMessages(locale);
  const body=<>{tag && <p className="card-tag">{tag}</p>}<div className="card-title-row">{icon && <span className="card-icon" aria-hidden="true">{icon}</span>}<h3>{data.title}</h3></div>{!compact && data.description && <p className="card-description">{data.description}</p>}{children}<span className="card-action">{data.href ? m.read : m.preview}{data.href && <span aria-hidden="true"> →</span>}</span></>;
  const cls=`card ${compact ? 'compact-card' : ''} ${className}`;
  return data.href ? <Link className={cls} href={data.href}>{body}</Link> : <div className={cls} data-preview="true" aria-label={`${data.title} — ${m.preview}`}>{body}</div>;
}
export function articleCard(a: Article): CardData { return { ...a, href: localPath(a.locale, `guide/${a.slug}`) }; }
export function guideCards(locale: Locale): CardData[] { const m=getMessages(locale);const [first,...rest]=m.previews;return [first,...getArticles(locale).map(articleCard),...rest]; }
export function Footer({ locale, suffix }: { locale: Locale; suffix: string }) {
  const m=getMessages(locale), articles=getArticles(locale), first=articles[0], groups=m.footerGroups.split('|');
  const columns=[m.topics.slice(1,6),[m.topics[0],m.topics[7],m.topics[15],m.topics[5],m.topics[8]],m.topics.slice(9,16),[...m.topics.slice(16),...m.previews.slice(3,18).map(p=>p.title)]];
  const variants=discoverRoutes().filter(r=>r.suffix===suffix);
  return <footer className="site-footer"><div className="container"><div className="footer-grid"><div className="footer-about"><Link className="brand footer-brand" href={localPath(locale)}><img src="/emblem.svg" alt="" width="36" height="36"/><span><span className="brand-name">Aurelia</span><span className="brand-tag">ATLAS · 2026</span></span></Link><p>{m.disclaimer}</p></div>{columns.map((labels,i)=><div key={i}><h2>{groups[i]}</h2><ul>{labels.map((text,j)=><li key={j}>{i===0&&j===0&&first ? <Link href={localPath(locale,`guide/${first.slug}`)}>{text}</Link> : <span title={m.preview} aria-disabled="true">{text}</span>}</li>)}{i===3&&<li><Link href={localPath(locale,'guide')}>{m.allGuides}</Link></li>}</ul></div>)}</div><nav className="language-links" aria-label={m.languagesLabel}><h2>{m.languagesLabel}</h2>{locales.map(l=><Link href={variants.find(r=>r.locale===l)?.url || localPath(l,'guide')} key={l} hrefLang={l} lang={l} aria-current={l===locale?'page':undefined}>{localeNames[l]}</Link>)}</nav><Divider/><div className="footer-bottom"><span>{m.copyright}</span><Link href={localPath(locale,'guide')}>{m.allGuides}</Link></div></div></footer>;
}
