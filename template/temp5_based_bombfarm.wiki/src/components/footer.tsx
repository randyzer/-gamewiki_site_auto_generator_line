import Link from 'next/link';
import { localePath, type Locale } from '@/lib/i18n';
import { messages } from '@/lib/messages';
import { Logo, SteamButton } from './primitives';
export function Footer({ locale }: { locale: Locale }) {
  const m = messages[locale];
  return <footer className="site-footer"><div className="container"><div className="footer-grid"><div className="footer-brand"><Logo locale={locale} /><p>{m.footerIntro}</p><SteamButton locale={locale} /></div><div><h3>{m.sections[1][0]}</h3><ul>{m.nav.slice(1).map((name, index) => <li key={name}>{index === 0 ? <Link href={localePath(locale, 'guides')}>{name}</Link> : <span data-preview>{name}</span>}</li>)}</ul></div><div><h3>{m.sections[4][0]}</h3><ul>{[0, 1, 2, 3, 4, 5].map(index => <li key={index}>{index === 0 || index === 2 ? <Link href={localePath(locale, index === 0 ? 'guides' : 'guides/how-to-play')}>{m.guideTitles[index]}</Link> : <span data-preview>{m.guideTitles[index]}</span>}</li>)}</ul></div><div className="footer-legal"><h3>{m.legal}</h3><ul>{m.legalItems.map(text => <li key={text}><span data-preview>{text}<small>{m.preview}</small></span></li>)}</ul></div></div><div className="footer-bottom"><p>{m.disclaimer}</p><p>© 2026 Quarry Field Guide. {m.copyright}</p></div></div></footer>;
}
