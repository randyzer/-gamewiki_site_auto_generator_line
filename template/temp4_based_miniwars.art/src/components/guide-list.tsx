import Link from 'next/link';
import { localePath, type Locale } from '@/lib/i18n';
import type { Messages } from '@/lib/messages';
import { getGuideEntries, getOpeningGuide } from '@/lib/guides';
import { Container, Eyebrow, GuideCard, Pairing } from './ui';
export function GuideList({ locale, m }: { locale: Locale; m: Messages }) {
  const entries = getGuideEntries(locale, m);
  const opening = getOpeningGuide(locale);
  return <main><section className="page-hero"><Container><Eyebrow line>{m.guides.eyebrow}</Eyebrow><h1>{m.guides.title}</h1><p>{m.guides.description}</p></Container></section><section className="list-intro"><Container className="list-intro-grid"><div><Eyebrow>{m.guides.about}</Eyebrow><div className="intro-text">{m.guides.paragraphs.map(p => <p key={p}>{p}</p>)}</div><div className="reading-grid"><div className="frame reading-card"><h2>{m.guides.reading}</h2>{m.guides.readingItems.map((p, i) => <p key={p}>{i === 0 ? <Link href={localePath(locale, `/guides/${opening.slug}`)}>{p}</Link> : p}</p>)}</div><div className="frame reading-card"><h2>{m.guides.topics}</h2>{m.guides.topicItems.map(p => <p key={p}>{p}</p>)}</div></div></div><aside className="jump-panel frame"><Eyebrow>{m.guides.jump}</Eyebrow><ul>{entries.map(e => <li key={e.slug}><span aria-hidden="true">›</span>{e.preview ? <span className="jump-preview">{e.title}<small>{m.preview}</small></span> : <Link href={localePath(locale, `/guides/${e.slug}`)}>{e.title}</Link>}</li>)}{m.guides.extra.map(t => <li key={t}><span aria-hidden="true">›</span><span className="jump-preview">{t}<small>{m.preview}</small></span></li>)}</ul></aside></Container></section><section className="guide-list-section container"><h2 className="sr-only">{m.allGuides}</h2><div className="three-grid">{entries.map(e => <GuideCard key={e.slug} guide={e} locale={locale} m={m}/>)}</div><Pairing title={m.guides.pair} items={m.guides.pairItems} m={m}/></section></main>;
}
