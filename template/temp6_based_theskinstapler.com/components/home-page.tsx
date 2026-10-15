import Link from 'next/link';
import Image from 'next/image';
import { getGuides } from '@/lib/guides';
import { getMessages } from '@/lib/messages';
import { guideHref, localePath, type Locale } from '@/lib/locales';
import { ButtonLink, SectionHeading } from './ui';

const mechanics = [ ['precinct', 'gameplay'], ['recording', 'recordings'], ['diner', 'voice-cast'], ['station', 'making-of'] ];
const sidebarPaths = ['/#about', '/guides/midnight-evidence-developer', '/guides#walkthrough', '/guides#recordings', '/guides#characters'];

export async function HomePage({ locale }: { locale: Locale }) {
  const t = getMessages(locale);
  const guides = await getGuides(locale);
  const start = ['beginner', 'walkthrough', 'characters', 'puzzles'].flatMap((slug) => guides.filter((guide) => guide.slug === slug));
  const popular = ['characters', 'identity', 'voice-cast', 'ending'].flatMap((slug) => guides.filter((guide) => guide.slug === slug));
  return <>
    <section className="hero"><Image className="hero-image" src="/illustrations/night-drive.svg" width={1600} height={900} alt="" priority/><div className="hero-shade" aria-hidden="true"/>
      <div className="container hero-content"><span className="hero-badge"><i/>{t.badge}</span><h1>{t.homeTitle}</h1><p>{t.homeDescription}</p>
        <div className="hero-actions"><ButtonLink href={localePath(locale, '/guides#beginner')}>{t.buttons[0]}</ButtonLink><ButtonLink href={localePath(locale, '/guides#characters')} variant="outline">{t.buttons[1]}</ButtonLink><ButtonLink href={localePath(locale, '/guides')} variant="neutral">{t.buttons[2]}</ButtonLink></div>
        <Link className="trailer-link" href={localePath(locale, '/guides#making-of')}>{t.trailer}</Link>
        <div className="stats-grid">{t.stats.map((stat) => <div className="stat-card" key={stat}>{stat}</div>)}</div>
      </div>
    </section>
    <div className="container home-layout"><div className="home-main">
      <section><SectionHeading eyebrow={t.start[0]}>{t.start[1]}</SectionHeading><div className="start-grid">{start.map((guide, index) => <Link className="card start-card" href={guideHref(locale, guide)} key={guide.slug}><div className="start-media"><Image src={`/illustrations/${['night-drive', 'diner', 'precinct', 'station'][index]}.svg`} width={800} height={450} alt={guide.title}/><span className="step-number">{index + 1}</span>{!guide.available && <span className="preview-mark">{t.previewLabel}</span>}</div><div className="start-copy"><h3>{guide.title}</h3><p>{guide.description}</p></div></Link>)}</div></section>
      <section id="about" className="about-section"><SectionHeading>{t.aboutTitle}</SectionHeading><div className="about-copy"><p>{t.about[0]}</p>{t.aboutSections.map((section) => <div key={section.title}><h3>{section.title}</h3>{section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>)}</div>
        <div className="facts-grid">{t.facts.map(([label, value]) => <div className="card fact-card" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div><ButtonLink href={localePath(locale, '/guides')} variant="outline">{t.buttons[2]}</ButtonLink>
      </section>
      <section className="mechanics-section"><SectionHeading eyebrow={t.mechanicsHeading[0]}>{t.mechanicsHeading[1]}</SectionHeading><p className="section-intro">{t.mechanicsIntro}</p><div className="mechanics-grid">{t.mechanics.map((item, index) => <Link className="card mechanic-card" href={localePath(locale, `/guides#${mechanics[index][1]}`)} key={item.title}><div className="start-media"><Image src={`/illustrations/${mechanics[index][0]}.svg`} width={800} height={450} alt={item.title}/><span className="preview-mark">{t.previewLabel}</span></div><div><h3>{item.title}</h3><p>{item.description}</p></div></Link>)}</div></section>
      <section className="popular-guides"><SectionHeading eyebrow={t.popular[0]}>{t.popular[1]}</SectionHeading><div className="popular-grid">{popular.map((guide) => <Link className="card popular-card" href={guideHref(locale, guide)} key={guide.slug}><h3>{guide.shortTitle ?? guide.title}</h3><p>{guide.summary ?? guide.description}</p><span className="popular-preview">{!guide.available && t.previewLabel} <b aria-hidden="true">→</b></span></Link>)}</div></section>
      <section id="questions" className="faq-section"><SectionHeading eyebrow={t.faqHeading[0]}>{t.faqHeading[1]}</SectionHeading><div className="faq-list">{t.faq.map(([question, answer]) => <article className="card faq-card" key={question}><h3>{question}</h3><p>{answer}</p></article>)}</div></section>
    </div><aside className="home-sidebar" aria-label={t.sidebarTitle}><section className="card sidebar-card"><h2>{t.sidebarTitle}</h2><ul>{t.sidebarLinks.map((label, index) => <li key={label}><Link href={localePath(locale, sidebarPaths[index])}>{label}<span aria-hidden="true">↗</span></Link></li>)}</ul></section><section className="card sidebar-card"><h2>{t.languageNote[0]}</h2><p>{t.languageNote[1]}</p></section></aside></div>
    <section className="cta-strip"><div className="container"><SectionHeading>{t.cta[0]}</SectionHeading><p>{t.cta[1]}</p><div className="flex flex-wrap justify-center gap-4"><ButtonLink href={localePath(locale, '/guides#beginner')}>{t.cta[2]}</ButtonLink><ButtonLink href={localePath(locale, '/guides')} variant="outline">{t.cta[3]}</ButtonLink></div></div></section>
  </>;
}
