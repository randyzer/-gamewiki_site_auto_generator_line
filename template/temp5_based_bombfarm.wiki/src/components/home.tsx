import Link from 'next/link';
import { messages } from '@/lib/messages';
import { localePath, type Locale } from '@/lib/i18n';
import type { Document } from '@/lib/content';
import { GuideCard, Illustration, SectionHeading, SteamButton, Faq } from './primitives';
import { previewGuides } from '@/lib/guide-items';

export function Home({ locale, docs }: { locale: Locale; docs: Document[] }) {
  const m = messages[locale];
  const play = docs.find(doc => doc.locale === locale && doc.slug === 'guides/how-to-play')!;
  const preview = previewGuides(locale);
  const featured = [preview[0], { title: play.title, description: play.description, category: play.category, slug: play.slug }, preview[2], preview[3], preview[5], preview[6]];
  const heading = (index: number) => <SectionHeading label={m.sections[index][0]} title={m.sections[index][1]} />;
  return <>
    <section className="hero"><div className="hero-backdrop"/><div className="container hero-inner"><div className="hero-copy"><div className="hero-badge"><span/> {m.badge}</div><h1><span>Quarry Field</span> Wiki</h1><p className="hero-subtitle">{m.subtitle}</p><p className="hero-description">{m.intro}</p><div className="hero-actions"><SteamButton locale={locale} primary/><Link className="button" href={localePath(locale, 'guides/how-to-play')}>{m.beginner}</Link></div><nav className="hero-links" aria-label={m.sections[1][0]}>{m.nav.slice(1, 6).map((title, index) => index === 0 ? <Link href={localePath(locale, 'guides')} key={title}>{title}</Link> : <span data-preview key={title}>{title}</span>)}</nav></div><Illustration locale={locale} className="hero-image"/><div className="stats">{['3', '8', '5', 'Demo'].map((value, index) => <div className="stat" key={value}><strong>{value}</strong><span>{m.statLabels[index]}</span></div>)}</div></div></section>
    <section className="container home-section">{heading(0)}<div className="about-grid"><Illustration locale={locale}/><div className="about-copy"><p>{m.overview}</p><div className="facts"><h3>{m.quickFacts}</h3><dl>{m.factLabels.map((label, index) => <div key={label}><dt>{label}</dt><dd>{m.factValues[index]}</dd></div>)}</dl></div></div></div></section>
    <section className="container home-section">{heading(1)}<div className="hub-grid">{m.nav.slice(1).map((title, index) => <article className="card hub-card" key={title}><span className="hub-number" aria-hidden="true">0{index + 1}</span><h3>{title}</h3><p>{m.hubDescriptions[index]}</p><div className="hub-chips">{m.hubChips[index].map((chip, chipIndex) => index === 0 && chipIndex === 1 ? <Link key={chip} href={localePath(locale, play.slug)}>{chip}</Link> : <span key={chip} data-preview>{chip}</span>)}</div>{index === 0 ? <Link className="card-action" href={localePath(locale, 'guides')}>{m.all} {title} →</Link> : <span className="card-action" data-preview>{m.preview} · {title}</span>}</article>)}</div></section>
    <section className="container home-section">{heading(2)}<div className="grid-three">{featured.map(item => <GuideCard item={item} locale={locale} key={item.title}/>)}</div></section>
    <section className="container home-section">{heading(3)}<div className="grid-three update-grid">{m.updates.map((title, index) => <article className="card compact-card" data-preview key={title}><div><span className="eyebrow">{index === 1 ? m.nav[5] : m.nav[1]}</span><time dateTime="2026-10-12">2026-10-12</time><small>{m.preview}</small></div><h3>{title}</h3></article>)}</div></section>
    <section className="container home-section">{heading(4)}<ol className="popular-list">{m.popular.map((title, index) => <li className="card" data-preview key={title}><span className="number">{index + 1}</span><div><span className="eyebrow">{index < 4 ? m.nav[1] : m.nav[2]}</span><h3>{title}</h3></div><span className="list-preview">{m.preview}</span><span aria-hidden="true">›</span></li>)}</ol></section>
    <section className="container home-section">{heading(5)}<ol className="steps-grid">{m.stepTitles.map((title, index) => <li className="card step-card" key={title}><span className="number">{index + 1}</span><div><h3>{title}</h3><p>{m.stepDescriptions[index]}</p></div></li>)}</ol></section>
    <section className="container home-section">{heading(6)}<div className="browse-grid">{m.browse.map((title, index) => <div className="browse-row" data-preview key={title}><span className="eyebrow">{m.nav[index < 1 ? 2 : index < 3 ? 3 : index < 7 ? 5 : 6]}</span><span>{title}</span><small>{m.preview}</small></div>)}</div></section>
    <div className="container home-section"><Faq locale={locale} home items={m.faqQuestions.map((question, index) => ({ question, answer: m.faqAnswers[index] }))}/></div>
    <section className="container home-section final-section"><div className="card final-cta"><h2>{m.ctaTitle}</h2><p>{m.ctaText}</p><Link className="button primary" href={localePath(locale, 'guides/how-to-play')}>{m.beginner} <span aria-hidden="true">→</span></Link></div></section>
  </>;
}
