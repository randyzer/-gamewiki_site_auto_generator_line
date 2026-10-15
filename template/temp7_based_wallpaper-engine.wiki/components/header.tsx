'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { categories, categoryLabel, localePath, type Locale, text } from '@/lib/i18n';
import { Icon } from './icon';
export type SearchEntry = {title:string;description:string;href:string;body?:string};
export function Header({locale,translations,searchEntries,category}:{locale:Locale;translations:Record<string,string>;searchEntries:SearchEntry[];category?:string}) {
  const [menu,setMenu]=useState(false); const [language,setLanguage]=useState(false);
  const [light,setLight]=useState(false); const [query,setQuery]=useState('');
  const dialog=useRef<HTMLDialogElement>(null); const languageRef=useRef<HTMLDivElement>(null); const menuRef=useRef<HTMLDivElement>(null);
  const input=useRef<HTMLInputElement>(null); const searchButton=useRef<HTMLButtonElement>(null);
  useEffect(()=>{
    setLight(document.documentElement.dataset.theme==='light');
    const close=(e:KeyboardEvent)=>{if(e.key==='Escape'){if(languageRef.current?.contains(document.activeElement))languageRef.current.querySelector('button')?.focus();if(menuRef.current?.contains(document.activeElement))menuRef.current.querySelector('button')?.focus();setMenu(false);setLanguage(false);}};
    const click=(e:PointerEvent)=>{if(!languageRef.current?.contains(e.target as Node))setLanguage(false);if(!menuRef.current?.contains(e.target as Node))setMenu(false);};
    document.addEventListener('keydown',close);document.addEventListener('pointerdown',click);
    return()=>{document.removeEventListener('keydown',close);document.removeEventListener('pointerdown',click);};
  },[]);
  function toggleTheme(){const value=!light;setLight(value);document.documentElement.dataset.theme=value?'light':'dark';try{localStorage.setItem('motion-theme',value?'light':'dark');}catch{}}
  function openSearch(){setQuery('');dialog.current?.showModal();input.current?.focus();}
  const results=query.trim()?searchEntries.filter(e=>(e.title+' '+e.description+' '+(e.body??'')).toLocaleLowerCase(locale).includes(query.toLocaleLowerCase(locale).trim())):[];
  const nav=(mobile=false)=><nav aria-label={text(locale,'Main navigation','主导航')} className={mobile?'mobile-links':'desktop-nav'}>{categories.map(c=><Link key={c} href={localePath(locale)+`#${c}`} className={c===category?'active':''} onClick={()=>setMenu(false)}>{categoryLabel(c,locale)}</Link>)}</nav>;
  return <>
    <header className="site-header"><div className="header-inner">
      <Link href={localePath(locale)} className="brand" aria-label={text(locale,'Motion Desktop Wiki home','Motion Desktop Wiki 首页')}><img src="/logo.svg" width="24" height="24" alt=""/><span>Motion Desktop<br/>Wiki</span></Link>
      {nav()}
      <div className="header-tools">
        <button ref={searchButton} className="icon-button" aria-label={text(locale,'Search','搜索')} onClick={openSearch}><Icon name="search"/></button>
        <button className="icon-button" aria-label={text(locale,light?'Switch to dark theme':'Switch to light theme',light?'切换为深色主题':'切换为浅色主题')} onClick={toggleTheme}><Icon name={light?'sun':'moon'}/></button>
        <div className="language-control" ref={languageRef}>
          <button className="language-button" aria-expanded={language} aria-controls="language-menu" onClick={()=>{setLanguage(!language);setMenu(false);}}><Icon name="globe" size={16}/><span>{locale==='en'?'English':'简体中文'}</span><Icon name="chevron" size={12}/></button>
          {<div className="language-menu" id="language-menu" hidden={!language}>{Object.entries(translations).map(([lang,href])=><a key={lang} href={href} hrefLang={lang} lang={lang} aria-current={lang===locale?'true':undefined}>{lang==='en'?'English':'简体中文'}{lang===locale&&<span aria-hidden="true">✓</span>}</a>)}</div>}
        </div>
        <div className="mobile-control" ref={menuRef}>
          <button className="icon-button" aria-label={text(locale,menu?'Close menu':'Open menu',menu?'关闭菜单':'打开菜单')} aria-expanded={menu} aria-controls="mobile-navigation" onClick={()=>{setMenu(!menu);setLanguage(false);}}><Icon name={menu?'close':'menu'}/></button>
          {<div id="mobile-navigation" className="mobile-navigation" hidden={!menu}>{nav(true)}</div>}
        </div>
      </div>
    </div></header>
    <dialog className="search-dialog" ref={dialog} onClick={e=>{if(e.target===e.currentTarget)dialog.current?.close();}} onClose={()=>searchButton.current?.focus()} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();dialog.current?.close();}}} aria-label={text(locale,'Search the wiki','搜索本站')}>
      <div className="search-input-row"><Icon name="search"/><input ref={input} type="search" placeholder={text(locale,'Search the wiki...','搜索本站内容…')} value={query} onChange={e=>setQuery(e.target.value)} aria-label={text(locale,'Search the wiki','搜索本站')}/><button className="icon-button" aria-label={text(locale,'Close search','关闭搜索')} onClick={()=>dialog.current?.close()}><Icon name="close" size={18}/></button></div>
      <div className="search-results" aria-live="polite">{query.trim()&&(!results.length?<p>{text(locale,'No published articles found.','未找到已发布的文章。')}</p>:results.map(e=><Link href={e.href} key={e.href} onClick={()=>dialog.current?.close()}><strong>{e.title}</strong><span>{e.description}</span></Link>))}</div>
      <div className="search-footer"><span><kbd>Esc</kbd> {text(locale,'Close','关闭')} · <kbd>↵</kbd> {text(locale,'Search','搜索')}</span><small>{text(locale,'Search published guides','搜索已发布的指南')}</small></div>
    </dialog>
  </>;
}
