'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { locales, localePath, type Locale } from '@/lib/i18n';
import { messages } from '@/lib/messages';
import { Logo, SteamButton } from './primitives';

const names: Record<Locale, string> = { en: 'English', de: 'Deutsch', 'pt-BR': 'Português (Brasil)', es: 'Español', 'zh-CN': '简体中文' };
const short: Record<Locale, string> = { en: 'EN', de: 'DE', 'pt-BR': 'PT', es: 'ES', 'zh-CN': '中文' };
export function Header({ locale, slug, available }: { locale: Locale; slug: string; available: Locale[] }) {
  const m = messages[locale];
  const [mobile, setMobile] = useState(false);
  const [dropdown, setDropdown] = useState<number | null>(null);
  const root = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    function escape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      const hadMenu = mobile;
      const focused = document.activeElement;
      const trigger = focused?.closest('.nav-group')?.querySelector<HTMLButtonElement>('button') ?? focused?.closest('.language')?.querySelector<HTMLElement>('summary');
      setMobile(false); setDropdown(null);
      root.current?.querySelectorAll('details[open]').forEach(node => node.removeAttribute('open'));
      if (hadMenu) toggle.current?.focus();
      else trigger?.focus();
    }
    function outside(event: MouseEvent) {
      if (root.current && !root.current.contains(event.target as Node)) {
        setDropdown(null); root.current.querySelectorAll('details[open]').forEach(node => node.removeAttribute('open'));
      }
    }
    document.addEventListener('keydown', escape); document.addEventListener('click', outside);
    return () => { document.removeEventListener('keydown', escape); document.removeEventListener('click', outside); };
  }, [mobile]);
  const groups = [m.guideTitles.concat([m.popular[1], m.popular[2], m.popular[3], m.updates[2], m.updates[4], m.updates[3]]), [m.nav[2], ...m.hubChips[1], m.browse[0]], [m.nav[3], ...m.hubChips[2]], [m.nav[4]], [m.nav[5], ...m.hubChips[4], m.browse[6], m.updates[1]], [m.nav[6], ...m.hubChips[5], m.browse[10]]];
  function overview(group: number) {
    const title = `${m.all} ${m.nav[group + 1]}`;
    return group === 0 ? <Link className="nav-overview" href={localePath(locale, 'guides')} onClick={() => { setMobile(false); setDropdown(null); }}>{title}</Link> : <span className="nav-overview nav-preview" data-preview>{title}<small>{m.preview}</small></span>;
  }
  function entry(title: string, group: number, index: number) {
    const target = group === 0 && index === 0 ? 'guides' : group === 0 && index === 2 ? 'guides/how-to-play' : null;
    return target ? <Link key={`${index}-${title}`} href={localePath(locale, target)} onClick={() => { setMobile(false); setDropdown(null); }}>{title}</Link> : <span key={`${index}-${title}`} className="nav-preview" data-preview>{title}<small>{m.preview}</small></span>;
  }
  return <header className="site-header" ref={root}>
    <a className="skip-link" href="#main-content">{m.skip}</a>
    <div className="container header-inner"><Logo locale={locale} /><nav className="desktop-nav" aria-label={m.nav[0]}><Link className={!slug ? 'active' : ''} href={localePath(locale)}>{m.nav[0]}</Link>{groups.map((items, index) => <div key={index} className="nav-group" onMouseEnter={() => setDropdown(index)} onMouseLeave={() => setDropdown(null)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setDropdown(null); }}><button aria-expanded={dropdown === index} aria-controls={`desktop-group-${index}`} className={slug.startsWith('guides') && index === 0 ? 'active' : ''} onClick={() => setDropdown(dropdown === index ? null : index)}>{m.nav[index + 1]}<span className="chevron" aria-hidden="true" /></button><div className="nav-dropdown" id={`desktop-group-${index}`} hidden={dropdown !== index}>{overview(index)}{items.map((title, itemIndex) => entry(title, index, itemIndex))}</div></div>)}</nav>
      <div className="header-actions"><details className="language"><summary aria-label={m.language}><span aria-hidden="true">◎</span> {short[locale]} <span className="chevron" aria-hidden="true" /></summary><div className="language-options">{locales.map(value => <Link href={localePath(value, available.includes(value) ? slug : 'guides')} hrefLang={value} lang={value} aria-current={locale === value ? 'true' : undefined} key={value}>{names[value]}</Link>)}</div></details><div className="header-steam"><SteamButton locale={locale} primary /></div><button className="hamburger" ref={toggle} aria-expanded={mobile} aria-controls="mobile-menu" aria-label={mobile ? m.closeMenu : m.openMenu} onClick={() => setMobile(!mobile)}><span/><span/><span/></button></div>
    </div>
    <nav id="mobile-menu" className="container mobile-nav" hidden={!mobile} aria-label={m.openMenu}><Link href={localePath(locale)} onClick={() => setMobile(false)}>{m.nav[0]}</Link>{groups.map((items, index) => <details key={index} className="mobile-group"><summary>{m.nav[index + 1]}<span className="chevron" aria-hidden="true" /></summary><div>{overview(index)}{items.map((title, itemIndex) => entry(title, index, itemIndex))}</div></details>)}<SteamButton locale={locale} primary /></nav>
  </header>;
}
