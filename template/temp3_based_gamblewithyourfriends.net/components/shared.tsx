import Link from 'next/link';
import type { ReactNode } from 'react';
import { getMessages, type Messages } from '@/lib/messages';
import { getArticles, type Article } from '@/lib/content';
import { pathFor, steamUrl, type Locale } from '@/lib/site';

export function Breadcrumb({ locale, title }: { locale: Locale; title: string }) {
  return <nav className="breadcrumb" aria-label={getMessages(locale).home}><Link href={pathFor(locale)}>{getMessages(locale).home}</Link><span aria-hidden="true">/</span><span aria-current="page">{title}</span></nav>;
}
export function PageIntro({ locale, title, description, badge, children, guide = false, breadcrumbTitle }: { locale: Locale; title: ReactNode; description: string; badge: string; children?: ReactNode; guide?: boolean; breadcrumbTitle?: string }) {
  return <div className={`page-intro ${guide ? 'guide-intro' : ''}`}><div className={`shell ${guide ? 'intro-shell' : 'narrow'}`}>
    <Breadcrumb locale={locale} title={breadcrumbTitle || (guide ? getMessages(locale).guide : typeof title === 'string' ? title : getMessages(locale).beginner)} />
    <span className="badge green">{badge}</span>
    <h1>{title}</h1><p>{description}</p>{children}
  </div></div>;
}
export function Preview({ children, className = '', label }: { children: ReactNode; className?: string; label: string }) {
  return <span className={className} aria-disabled="true" title={label}>{children}</span>;
}
export function Action({ locale, slug, children, secondary = false }: { locale: Locale; slug?: string; children: ReactNode; secondary?: boolean }) {
  const classes = `button ${secondary ? 'secondary' : 'primary'}`;
  return slug === undefined ? <span className={`${classes} unavailable`} aria-disabled="true" title={getMessages(locale).preview}>{children}<small>{getMessages(locale).preview}</small></span> : <Link className={classes} href={pathFor(locale, slug)}>{children}</Link>;
}
const icons = ['📚','🎰','🧭','♟️','🎯','🏆','✅','👒','🃏','🎁','📷','🔧','🎮','🛠️'];
const colors = ['blue','green','green','green','pink','gold','gold','purple','purple','gold','blue','orange','gray','pink'];
export function GuideCard({ locale, index, article, list = false }: { locale: Locale; index: number; article?: Article; list?: boolean }) {
  const t = getMessages(locale);
  const href = article ? pathFor(locale, article.slug) : index === 1 ? pathFor(locale, 'guide') : undefined;
  const body = <>
    <div className="card-top">{!list && <span className="card-icon" aria-hidden="true">{icons[index]}</span>}{list && <h3>{article?.title || t.cardTitles[index]}</h3>}<span className={`badge ${list ? 'muted-gold' : colors[index]}`}>{article?.category || t.cardTags[index]}</span></div>
    {!list && <h3>{article?.title || t.cardTitles[index]}</h3>}
    <p>{article?.description || t.cardDescriptions[index]}</p>
    <span className="card-read">{href ? list ? t.open : t.read : t.preview}</span>
  </>;
  const classes = `card guide-card ${list ? 'list-card' : ''}`;
  return href ? <Link className={classes} href={href} data-guide-card>{body}</Link> : <div className={`${classes} preview-card`} aria-disabled="true" data-preview data-guide-card>{body}</div>;
}
export function GuideCards({ locale, list = false }: { locale: Locale; list?: boolean }) {
  const articles = getArticles(locale);
  const beginner = articles.find(article => article.slug === 'beginner-guide');
  const indexes = list ? [2,3,13,9,8,5] : Array.from({ length: 14 }, (_, i) => i);
  return <div className={`grid guide-grid ${list ? 'list-grid' : ''}`}>
    {indexes.map(index => <GuideCard key={index} locale={locale} index={index} article={index === 2 ? beginner : undefined} list={list} />)}
    {articles.filter(article => article.slug !== 'beginner-guide').map(article => <GuideCard key={article.slug} locale={locale} index={2} article={article} list={list} />)}
  </div>;
}
export function FAQ({ items }: { items: string[][] }) {
  return <div className="faq-list">{items.map(([question, answer]) => <details className="card faq" key={question}>
    <summary>{question}<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg></summary><p>{answer}</p>
  </details>)}</div>;
}
export function Figure({ src = '/images/casino-original.png', caption, square = false }: { src?: string; caption: string; square?: boolean }) {
  return <figure className="illustration"><img src={src} alt={caption} width={square ? 1200 : 1600} height={square ? 900 : 900} className={square ? 'four-three' : ''} loading="lazy" /><figcaption>{caption}</figcaption></figure>;
}
export function Footer({ locale }: { locale: Locale }) {
  const t: Messages = getMessages(locale);
  const groups = [[0,1,2,3,4,5,6,7,5],[8,9,10,11,12,13]];
  return <footer className="site-footer"><div className="shell footer-main grid">
    <div className="footer-about"><Link className="brand" href={pathFor(locale)}><img src="/images/mark.svg" alt="" width="40" height="26" /><span><b>Co-op</b> Fieldnotes</span></Link><p>{t.footerDescription}</p><small>{t.footerDisclaimer}</small></div>
    {groups.map((group, g) => <div key={g}><h2>{g === 0 ? t.footerGuides : t.footerInfo}</h2><ul>{group.map((index, i) => <li key={`${index}-${i}`}>{index === 1 || index === 2 ? <Link href={pathFor(locale, index === 1 ? 'guide' : 'beginner-guide')}>{t.cardTitles[index]}</Link> : <Preview label={t.preview}>{g === 0 && i === 8 ? t.footerEnding : t.cardTitles[index]}</Preview>}</li>)}</ul>{g === 1 && <a className="gold footer-steam" href={steamUrl} target="_blank" rel="noopener noreferrer">{t.viewSteam}</a>}</div>)}
  </div><div className="shell"><div className="footer-bottom"><span>{t.footerCopyright}</span><span>{t.footerCredit}</span></div></div></footer>;
}
