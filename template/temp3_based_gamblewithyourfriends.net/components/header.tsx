'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { pathFor, steamUrl, type Locale } from '@/lib/site';
import type { Messages } from '@/lib/messages';

export function Header({ locale, slug, t }: { locale: Locale; slug: string; t: Messages }) {
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  useEffect(() => { setOpen(false); }, [locale, slug]);
  function close() { setOpen(false); toggle.current?.focus(); }
  const items = t.nav.map((name, index) => index === 0 ?
    <Link key={name} href={pathFor(locale, 'guide')} aria-current={slug === 'guide' ? 'page' : undefined} className={slug === 'guide' ? 'active' : ''} onClick={() => setOpen(false)}>{name}</Link> :
    <span key={name} aria-disabled="true" title={t.preview}>{name}</span>);
  return <header className="site-header" onKeyDown={event => { if (event.key === 'Escape' && open) close(); }}>
    <div className="shell header-row">
      <Link className="brand" href={pathFor(locale)} aria-label={`Co-op Fieldnotes · ${t.home}`}>
        <img src="/images/mark.svg" alt="" width="36" height="24" />
        <span><b>Co-op</b> Fieldnotes</span>
      </Link>
      <nav className="desktop-nav" aria-label={t.navLabel}>{items}</nav>
      <a className="steam-button" href={steamUrl} target="_blank" rel="noopener noreferrer"><span aria-hidden="true">◉</span> {t.steam}</a>
      <button ref={toggle} className="menu-toggle" aria-label={open ? t.closeMenu : t.openMenu} aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setOpen(value => !value)}>
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">{open ? <path d="m6 6 12 12M18 6 6 18" /> : <path d="M4 6h16M4 12h16M4 18h16" />}</svg>
      </button>
    </div>
    <nav id="mobile-navigation" className="mobile-nav shell" hidden={!open} aria-label={t.navLabel}>
      {items}<a className="mobile-steam" href={steamUrl} target="_blank" rel="noopener noreferrer">{t.buySteam}</a>
    </nav>
  </header>;
}
