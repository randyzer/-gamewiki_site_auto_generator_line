import { getGuides } from '@/lib/guides';
import { getMessages } from '@/lib/messages';
import type { Locale } from '@/lib/locales';
import { GuideCard, SourceCallout, OverviewNote } from './ui';

export async function GuidesPage({ locale }: { locale: Locale }) {
  const t = getMessages(locale);
  const guides = await getGuides(locale);
  return <div className="container guides-page"><div className="page-heading"><span className="badge">Midnight Evidence Wiki</span><h1>{t.guidesTitle}</h1><p>{t.guidesDescription}</p></div><OverviewNote locale={locale}/><div className="guide-shell"><div className="guide-grid">{guides.map((guide) => <GuideCard key={guide.slug} guide={guide} locale={locale}/>)}</div><SourceCallout locale={locale} index/></div></div>;
}
