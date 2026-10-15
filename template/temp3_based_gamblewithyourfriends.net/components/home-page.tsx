import { getMessages } from '@/lib/messages';
import { steamUrl, type Locale } from '@/lib/site';
import { Action, FAQ, GuideCards, Preview } from './shared';
export const gameNames = ['Blackjack','Roulette','Slots',"Dragon’s Tower",'Crash','Plinko','Keno','HiLo','Duck Race','Penguin Cross','Mine Sweeper','Money Wheel','Street Craps','Wheel of Fortune'];
export function HomePage({ locale }: { locale: Locale }) {
  const t = getMessages(locale);
  return <>
    <section className="home-hero" data-section="hero">
      <img className="hero-image" src="/images/casino-original.png" alt="" fetchPriority="high" />
      <div className="hero-shade" /><div className="shell hero-content">
        <div className="hero-badge">● {t.heroBadge}</div>
        <h1>{t.heroTitle}<br /><span className="gold">{t.heroHighlight}</span></h1>
        <p>{t.heroDescription}</p>
        <div className="actions"><Action locale={locale} slug="guide">{t.heroButton}</Action><Action locale={locale} secondary>{t.fixButton}</Action></div>
        <div className="hero-stats grid">{['17','55','4','3'].map((value, i) => <div key={value}><strong>{value}</strong><span>{t.stats[i]}</span></div>)}</div>
      </div>
    </section>
    <section className="shell home-section" data-section="about"><div className="about-grid grid">
      <div><h2>{t.aboutTitle}</h2>{t.about.map(p => <p key={p}>{p}</p>)}<a className="gold about-steam" href={steamUrl} target="_blank" rel="noopener noreferrer">{t.viewSteam}</a></div>
      <div className="feature-grid grid">{t.features.map(([title, desc], i) => <div className="card feature" key={title}><span aria-hidden="true">{['👥','🏦','⏱️','📈','🎰','🔄'][i]}</span><div><strong>{title}</strong><small>{desc}</small></div></div>)}</div>
    </div></section>
    <section className="surface home-section" data-section="guides"><div className="shell"><div className="section-heading"><h2>{t.allTitle}</h2><p>{t.allDescription}</p></div><GuideCards locale={locale} /></div></section>
    <section className="shell home-section game-section" data-section="games"><div className="section-heading"><h2>{t.gamesTitle}</h2><p>{t.gamesDescription}</p></div><div className="game-chips">{gameNames.map(game => <Preview className="game-chip" label={t.preview} key={game}>{game}</Preview>)}</div><Action locale={locale} secondary>{t.gamesButton}</Action></section>
    <section className="surface home-section" data-section="tips"><div className="shell"><div className="section-heading"><h2>{t.tipsTitle}</h2><p>{t.tipsDescription}</p></div><div className="tips-grid grid">{t.tips.map(([title, text], i) => <div className="card tip" key={title}><span className="tip-number">0{i + 1}</span><h3>{title}</h3><p>{text}</p></div>)}</div><div className="center tips-action"><Action locale={locale} slug="beginner-guide">{t.tipsButton}</Action></div></div></section>
    <section className="shell narrow home-section" data-section="faq"><div className="section-heading"><h2>{t.faqTitle}</h2></div><FAQ items={t.faq} /></section>
    <section className="home-cta" data-section="cta"><div className="shell narrow"><h2>{t.ctaTitle}</h2><p>{t.ctaDescription}</p><div className="actions"><Action locale={locale} slug="guide">{t.complete}</Action><Action locale={locale} slug="beginner-guide" secondary>{t.ctaSecondary}</Action></div></div></section>
  </>;
}
