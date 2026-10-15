import { getMessages } from '@/lib/messages';
import { type Locale } from '@/lib/site';
import { getCategories } from '@/lib/content';
import { Action, Figure, GuideCards, PageIntro } from './shared';
export function GuidePage({ locale }: { locale: Locale }) {
  const t = getMessages(locale);
  return <>
    <PageIntro locale={locale} title={t.guideTitle} description={t.guideDescription} badge={t.complete} guide />
    <div className="shell guide-shell page-sections" data-categories={getCategories(locale).join(',')}>
      <section className="quick-grid grid" data-section="quick-start"><div className="card quick-card"><h2>{t.quickTitle}</h2><p>{t.quickDescription}</p><div className="actions left"><Action locale={locale} slug="beginner-guide">{t.beginner}</Action><Action locale={locale} secondary>{t.strategyButton}</Action></div></div><Figure caption={t.figureCaption} /></section>
      <section data-section="main-guides"><h2>{t.mainGuides}</h2><GuideCards locale={locale} list /></section>
      <section data-section="checklist"><h2>{t.checklistTitle}</h2><div className="grid checklist-grid">{t.checklist.map(([title, desc]) => <div className="card" key={title}><h3>{title}</h3><p>{desc}</p></div>)}</div></section>
      <section className="card search-answers" data-section="answers"><h2>{t.answersTitle}</h2><div className="grid checklist-grid">{t.answers.map(([title, desc]) => <div key={title}><h3 className="gold">{title}</h3><p>{desc}</p></div>)}</div></section>
      <section data-section="more-help"><h2>{t.moreHelp}</h2><div className="help-list">{t.moreRows.map(text => <div className="card help-row" aria-disabled="true" data-preview key={text}><span>{text}</span><span className="gold">{t.preview}</span></div>)}</div></section>
    </div>
  </>;
}
