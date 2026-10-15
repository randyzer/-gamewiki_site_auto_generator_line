'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { localePath, type Locale } from '@/lib/i18n';
import type { Messages } from '@/lib/messages';
import { Container, Icon } from './primitives';
export function Header({ locale, m, active }: { locale: Locale; m: Messages; active: boolean }) {
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    function onKey(event: KeyboardEvent) { if (event.key === 'Escape' && open) { setOpen(false); button.current?.focus(); } }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  const items = (mobile = false) => m.nav.map((label, i) => i === 4 ? <Link key={label} href={localePath(locale, '/guides')} data-guides-link className={active ? 'active' : ''} aria-current={active ? 'page' : undefined} onClick={() => setOpen(false)}>{label}</Link> : <span key={label} className="nav-preview" aria-disabled="true" title={`${label} · ${m.preview}`}>{label}{mobile && <small>{m.preview}</small>}</span>);
  return <header className="site-header" data-hydrated={hydrated}><div className="signal-bar"><Container><span><i className="live-dot"/>{m.signal}<span className="signal-context">　//　 {m.topContext}</span></span><span className="signal-context">{m.build}　//　{m.unofficial}</span></Container></div><Container className="header-main"><Link className="brand" href={localePath(locale)} aria-label={`${m.brand} ${m.tagline}`}><span className="brand-symbol"><Icon name="flag"/></span><span><strong>{m.brand}</strong><small>· {m.tagline} ·</small></span></Link><nav className="desktop-nav" aria-label={m.navigation}>{items()}</nav><div className="header-controls"><span className="search-preview" aria-disabled="true" title={`${m.search} · ${m.preview}`}><Icon name="search"/><span>{m.search}</span></span><button ref={button} type="button" className="menu-button" data-menu-button aria-label={open ? m.closeMenu : m.openMenu} aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setOpen(!open)}><Icon name={open ? 'close' : 'menu'}/></button></div></Container><div id="mobile-navigation" className="mobile-navigation" hidden={!open}><nav aria-label={m.navigation}>{items(true)}</nav></div></header>;
}
