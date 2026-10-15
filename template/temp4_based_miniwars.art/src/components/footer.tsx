import Link from 'next/link';
import { localePath, type Locale } from '@/lib/i18n';
import type { Messages } from '@/lib/messages';
import { Container, Icon } from './ui';
export function Footer({ locale, m }: { locale: Locale; m: Messages }) {
  return <footer className="site-footer"><Container className="footer-grid"><div><Link className="brand footer-brand" href={localePath(locale)}><span className="brand-symbol"><Icon name="flag"/></span><span><strong>{m.brand}</strong><small>{m.tagline}</small></span></Link><p className="footer-description">{m.footer.description}</p><p className="footer-notice">{m.footer.notice}</p></div><div><h3>{m.footer.codex}</h3><ul>{m.nav.slice(0, 4).map(item => <li key={item}><span title={m.preview} aria-disabled="true">{item}</span></li>)}</ul></div><div><h3>{m.footer.players}</h3><ul>{[5, 4, 6, 7, 8].map(i => <li key={i}>{i === 4 ? <Link href={localePath(locale, '/guides')}>{m.nav[i]}</Link> : <span title={m.preview} aria-disabled="true">{m.nav[i]}</span>}</li>)}</ul></div></Container><div className="footer-bottom"><Container><span>{m.footer.copyright}</span><span>{m.footer.built}</span></Container></div></footer>;
}
