'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { localizedPath, type Locale } from '@/lib/i18n';
import { messages } from '@/lib/messages';
import { Icon } from './icon';
import { Preview } from './primitives';

const icons = ['book', 'sword', 'shield', 'map', 'users', 'target', 'tool', 'trophy', 'tool', 'star', 'book', 'code', 'news'];
const counts = [14, 6, 29, 7, 3, 9, 20, 6, 0, 7, 13, 0, 0];

function WikiNavigation({ locale, pathname, articleLinks, instance = 'desktop' }: { locale: Locale; pathname: string; articleLinks: { title: string; path: string }[]; instance?: string }) {
  const m = messages[locale];
  const [expanded, setExpanded] = useState<string[]>(pathname.startsWith('/races') ? ['1'] : []);
  const toggle = (id: string) => setExpanded(list => list.includes(id) ? list.filter(x => x !== id) : [...list, id]);
  return <><div className="wiki-panel"><h3>{m.wiki}</h3><nav aria-label={m.wiki}>{m.sidebar.map((title, index) => <div key={title}>
    <button className={`wiki-row ${expanded.includes(String(index)) ? 'active' : ''}`} onClick={() => toggle(String(index))} aria-expanded={expanded.includes(String(index))} aria-controls={`${instance}-wiki-section-${index}`}>
      <span className="icon-box"><Icon name={icons[index]} size={13} /></span><span>{title}</span>{counts[index] > 0 && <small>{index === 1 ? Math.max(6, articleLinks.length) : counts[index]}</small>}<Icon name="down" size={12} />
    </button>
    <div id={`${instance}-wiki-section-${index}`} hidden={!expanded.includes(String(index))} className="wiki-children">
      {index === 1 ? <><Link className={pathname === '/races' ? 'selected' : ''} href={localizedPath(locale, '/races')}>{m.overview}</Link>{articleLinks.map(item => <Link key={item.path} className={pathname === item.path ? 'selected' : ''} href={localizedPath(locale, item.path)}>{item.title}</Link>)}{m.raceCards.slice(1).map(([name]) => <Preview key={name}>{name}<small>{m.preview}</small></Preview>)}</> : <Preview>{m.overview}<small>{m.preview}</small></Preview>}
    </div>
  </div>)}</nav></div><div className="sidebar-code"><div className="flex items-center justify-between gap-2"><h3>{m.codeTitle}</h3><small className="preview-tag">{m.preview}</small></div><p className="code-note">{m.codeNote}</p><p className="code-description">{m.codeBody}</p><Preview className="all-codes">{m.allCodes} →</Preview></div><div className="sidebar-feature"><img src="/art/landscape.svg" alt="Spirit Atlas" width="264" height="149" /><h3>Spirit Atlas</h3><p>{m.sidebarAbout}</p><Preview className="action">{m.play}</Preview></div></>;
}

export function SiteShell({ locale, pathname, articleLinks, children }: { locale: Locale; pathname: string; articleLinks: { title: string; path: string }[]; children: ReactNode }) {
  const m = messages[locale];
  const [menu, setMenu] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [light, setLight] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { const stored = localStorage.getItem('spirit-atlas-theme'); setLight(stored === 'light'); }, []);
  useEffect(() => { document.documentElement.dataset.theme = light ? 'light' : 'dark'; }, [light]);
  useEffect(() => {
    if (!drawer) return;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    drawerRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDrawer(false);
      if (event.key === 'Tab') {
        const elements = [...(drawerRef.current?.querySelectorAll<HTMLElement>('button, a[href]') || [])].filter(e => e.getClientRects().length);
        const first = elements[0], last = elements.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = oldOverflow; document.removeEventListener('keydown', onKey); triggerRef.current?.focus(); };
  }, [drawer]);
  const themeButton = <button className="theme-button" aria-label={light ? m.darkTheme : m.theme} onClick={() => { const next = !light; setLight(next); localStorage.setItem('spirit-atlas-theme', next ? 'light' : 'dark'); }}><Icon name={light ? 'sun' : 'moon'} /></button>;
  const navItems = m.nav.map((title, i) => i === 0 ? <Link className={pathname.startsWith('/races') ? 'nav-active' : ''} key={title} href={localizedPath(locale, '/races')}>{title}</Link> : <Preview key={title}>{title}<span className="sr-only"> · {m.preview}</span></Preview>);
  return <><header className="site-header"><div className="header-inner"><Link href={localizedPath(locale)} className="brand"><img src="/art/logo.svg" width="36" height="36" alt="Spirit Atlas" /><span>SPIRIT ATLAS</span></Link><nav className="desktop-nav" aria-label={m.wiki}>{navItems}</nav><div className="desktop-theme">{themeButton}</div><button className="menu-button" aria-label={menu ? m.close : m.open} aria-expanded={menu} aria-controls="mobile-navigation" onClick={() => setMenu(!menu)}><Icon name={menu ? 'close' : 'menu'} size={20} /></button></div><nav id="mobile-navigation" className="mobile-navigation" aria-label={m.wiki} hidden={!menu}>{navItems}{themeButton}</nav></header>
    <div className="site-frame"><main>{children}</main><aside className="site-sidebar"><div className="sidebar-inner"><WikiNavigation locale={locale} pathname={pathname} articleLinks={articleLinks} /></div></aside></div>
    <Footer locale={locale} />
    <button ref={triggerRef} className="category-trigger" aria-label={drawer ? m.categoriesClose : m.categoriesOpen} aria-expanded={drawer} aria-controls="mobile-categories" onClick={() => setDrawer(!drawer)}><Icon name="grid" size={20} /></button>
    <div hidden={!drawer} className="drawer-backdrop" onClick={() => setDrawer(false)}><div ref={drawerRef} id="mobile-categories" className="category-drawer" role="dialog" aria-modal="true" aria-label={m.wiki} onClick={e => e.stopPropagation()}><div className="drawer-heading"><strong>{m.wiki}</strong><button aria-label={m.categoriesClose} onClick={() => setDrawer(false)}><Icon name="close" /></button></div><WikiNavigation locale={locale} pathname={pathname} articleLinks={articleLinks} instance="mobile" /></div></div>
  </>;
}

function Footer({ locale }: { locale: Locale }) {
  const m = messages[locale];
  return <footer className="site-footer"><div className="footer-banner">{m.disclaimer}</div><div className="footer-inner"><div className="footer-grid"><div className="footer-brand"><img src="/art/logo.svg" width="56" height="56" alt="Spirit Atlas" /><div><h2>Spirit Atlas Wiki</h2><p>{m.footerAbout}</p></div></div><div className="footer-columns">{m.footerHeadings.map((heading, index) => <div key={heading}><h3>{heading}</h3>{m.footerLinks[index].map((text, item) => index === 1 && item === 1 ? <Link key={text} href={localizedPath(locale, '/races')}>{text}</Link> : <Preview key={text}>{text}<span className="sr-only"> · {m.preview}</span></Preview>)}</div>)}</div></div><div className="socials"><Preview aria-label="Community preview"><Icon name="users" /></Preview><Preview><Icon name="news" /></Preview><Preview><Icon name="grid" /></Preview></div><div className="footer-bottom"><p>{m.copyright}</p><Preview className="email"><Icon name="mail" size={14} />{m.email}</Preview></div></div></footer>;
}
