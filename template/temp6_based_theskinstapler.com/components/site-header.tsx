'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { Guide } from '@/lib/guides';
import { guideHref, locales, languageNames, localePath, switchLocalePath, type Locale } from '@/lib/locales';
import type { Messages } from '@/lib/messages';
import { Brand } from './ui';

const paths = ['/', '/guides', '/guides#walkthrough', '/guides#ending', '/guides', '/guides#beginner'];

export function SiteHeader({ guides, locale, t }: { guides: Guide[]; locale: Locale; t: Messages }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const previousOverflow = useRef('');
  const pathname = usePathname();
  const router = useRouter();
  const normalizedQuery = query.toLocaleLowerCase(locale).trim();
  const results = normalizedQuery
    ? guides.filter((guide) => guide.status !== 'Draft' && `${guide.title} ${guide.description} ${guide.category}`.toLocaleLowerCase(locale).includes(normalizedQuery)).slice(0, 8)
    : guides.filter((guide) => guide.searchOrder !== undefined).sort((a, b) => a.searchOrder! - b.searchOrder!).slice(0, 4);

  function openSearch() {
    if (dialogRef.current?.open) return;
    setQuery(''); setSelected(0);
    previousOverflow.current = document.body.style.overflow;
    dialogRef.current?.showModal();
    document.body.style.overflow = 'hidden';
    inputRef.current?.focus();
  }
  function closeSearch() {
    dialogRef.current?.close();
    document.body.style.overflow = previousOverflow.current;
    triggerRef.current?.focus();
  }

  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      const target = event.target;
      const typing = target instanceof HTMLElement && (target.matches('input, textarea, select') || target.isContentEditable);
      if ((event.key === '/' && !typing && !event.metaKey && !event.ctrlKey && !event.altKey) || ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k')) {
        event.preventDefault(); openSearch();
      }
      if (event.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('keydown', shortcut);
    return () => { document.removeEventListener('keydown', shortcut); document.body.style.overflow = previousOverflow.current; };
  }, []);

  const navigation = t.nav.map((label, index) => ({ label, href: localePath(locale, paths[index]) }));
  return <>
    <header className="site-header"><div className="container header-row"><Brand locale={locale}/>
      <nav className="desktop-nav" aria-label={t.nav[4]}>{navigation.map(({ label, href }, index) => <Link key={`${href}-${index}`} href={href} aria-current={(index === 0 || index === 4) && pathname === href ? 'page' : undefined}>{label}</Link>)}</nav>
      <div className="header-actions">
        <button className="search-trigger" ref={triggerRef} onClick={openSearch} aria-label={t.search.label} aria-keyshortcuts="/ Control+k Meta+k"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg></button>
        <label className="sr-only" htmlFor="site-language">{t.languageLabel}</label>
        <select id="site-language" className="language-select" value={locale} onChange={(event) => { setMenuOpen(false); window.location.assign(switchLocalePath(pathname + window.location.search + window.location.hash, event.target.value as Locale)); }}>
          {locales.map((code) => <option value={code} key={code}>{languageNames[code]}</option>)}
        </select>
        <Link className="header-community" href={localePath(locale, '/guides/midnight-evidence-developer')}>{t.headerCommunity}</Link>
        <Link className="archive-button" href={localePath(locale, '/guides')}>▣ {t.headerAction}</Link>
        <button className="menu-button" aria-label={menuOpen ? t.menuClose : t.menuOpen} aria-controls="mobile-navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? '×' : '☰'}</button>
      </div>
    </div>
    {<nav hidden={!menuOpen} id="mobile-navigation" className="mobile-nav" aria-label={menuOpen ? t.menuClose : t.menuOpen}><div className="container">
      {[...navigation, { label: `${t.footerProject[1]} →`, href: localePath(locale, '/guides/midnight-evidence-developer') }, { label: `${t.footerProject[3]} →`, href: localePath(locale, '/#questions') }].map(({ label, href }, index) => <Link key={label} className={index === 7 ? 'mobile-secondary' : undefined} href={href} onClick={() => setMenuOpen(false)}>{label}</Link>)}
    </div></nav>}
    </header>
    <dialog ref={dialogRef} className="search-dialog" aria-labelledby="search-title" onCancel={(event) => { event.preventDefault(); closeSearch(); }} onClick={(event) => { if (event.target === event.currentTarget) closeSearch(); }}>
      <div className="search-input-row"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/></svg>
        <label className="sr-only" htmlFor="wiki-search" id="search-title">{t.search.label}</label>
        <input type="search" ref={inputRef} id="wiki-search" placeholder={t.search.placeholder} value={query} onChange={(event) => { setQuery(event.target.value); setSelected(0); }} onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setSelected((current) => results.length ? (current + (event.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length : 0);
          }
          if (event.key === 'Enter' && results[selected]) {
            event.preventDefault(); closeSearch(); router.push(guideHref(locale, results[selected]));
          }
        }}/><button onClick={closeSearch} aria-label={t.search.close}>ESC</button>
      </div>
      <div className="search-body"><div className="eyebrow" aria-live="polite">{query ? `${t.search.results} (${results.length})` : t.search.popular}</div>
        <div className="search-results">{results.map((guide, index) => <Link key={guide.slug} className={index === selected ? 'search-selected' : undefined} href={guideHref(locale, guide)} onClick={closeSearch}><span className="search-letter" aria-hidden="true">{(guide.searchTitle ?? guide.title)[0]}</span><div><h3>{guide.searchTitle ?? guide.shortTitle ?? guide.title}</h3><p>{!guide.available && `${t.previewLabel} · `}{guide.searchDescription ?? guide.summary ?? guide.description}</p></div></Link>)}</div>
        {!results.length && <p className="search-empty">{t.search.empty}</p>}
      </div>
      <div className="search-footer"><span>{t.search.keyboard}</span><span>Midnight Evidence Wiki</span></div>
    </dialog>
  </>;
}
