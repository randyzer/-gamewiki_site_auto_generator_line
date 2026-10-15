'use client';
import { useEffect, useRef, useState } from 'react';
import { type Locale, text } from '@/lib/i18n';
import { Icon } from './icon';
export function TopAd({locale}:{locale:Locale}) {
  const [closed,setClosed]=useState(false);
  return closed?null:<div className="top-ad"><div className="ad-blank" aria-label={text(locale,'Advertisement placeholder','广告占位区域')}/><button className="ad-close" aria-label={text(locale,'Close ad','关闭广告')} onClick={()=>setClosed(true)}><Icon name="close" size={12}/></button></div>;
}
export function AdSlot(){return <div className="ad-slot" aria-label="Advertisement"><span>ADVERTISEMENT</span></div>;}
export function VideoPreview({locale}:{locale:Locale}) {
  const dialog=useRef<HTMLDialogElement>(null);
  return <><button className="video-poster" aria-label={text(locale,'Open video preview','打开视频预览')} onClick={()=>dialog.current?.showModal()}><img src="/images/video.svg" alt={text(locale,'Original illustration of an animated desktop on a laptop','原创插图：笔记本电脑上的动态桌面')} width="960" height="540"/><span className="play-button"><Icon name="play" size={32}/></span></button>
    <dialog ref={dialog} className="video-dialog" aria-label={text(locale,'Video preview','视频预览')} onClick={e=>{if(e.target===e.currentTarget)dialog.current?.close();}}><button className="icon-button dialog-close" aria-label={text(locale,'Close video preview','关闭视频预览')} onClick={()=>dialog.current?.close()}><Icon name="close"/></button><img src="/images/video.svg" alt=""/><p>{text(locale,'Video preview — an original video has not been supplied for this template.','视频预览：此模板暂未提供原创视频。')}</p></dialog></>;
}
export function Faq({items}:{items:{question:string;answer:string}[]}) {
  const [open,setOpen]=useState<Record<number,boolean>>({});
  return <div className="faq-grid">{items.map((item,i)=><div className="faq-item" key={item.question}><button aria-expanded={!!open[i]} aria-controls={`faq-answer-${i}`} onClick={()=>setOpen({...open,[i]:!open[i]})}>{item.question}<Icon name="chevron" size={16}/></button><div id={`faq-answer-${i}`} hidden={!open[i]}><p>{item.answer}</p></div></div>)}</div>;
}
export function ArticleTools({locale}:{locale:Locale}) {
  const [message,setMessage]=useState('');
  async function share(){try{await navigator.clipboard.writeText(location.href);setMessage(text(locale,'Link copied','链接已复制'));}catch{setMessage(text(locale,'Copy this page address from your browser.','请从浏览器地址栏复制页面地址。'));}}
  return <div className="article-share"><button onClick={share}><Icon name="share" size={14}/>{text(locale,'Share','分享')}</button><span role="status">{message}</span></div>;
}
export function MobileContents({locale,headings}:{locale:Locale;headings:{title:string;id:string}[]}) {
  const [open,setOpen]=useState(false);
  return <div className="mobile-toc"><button aria-expanded={open} aria-controls="mobile-toc-links" onClick={()=>setOpen(!open)}>{text(locale,'On this page','本页目录')}<Icon name="chevron" size={14}/></button><nav id="mobile-toc-links" hidden={!open} aria-label={text(locale,'Article contents','文章目录')}>{headings.map(h=><a key={h.id} href={`#${h.id}`} onClick={()=>setOpen(false)}>{h.title}</a>)}</nav></div>;
}
export function BackToTop({locale}:{locale:Locale}) {
  const [visible,setVisible]=useState(false);
  useEffect(()=>{const handler=()=>setVisible(scrollY>500);handler();addEventListener('scroll',handler,{passive:true});return()=>removeEventListener('scroll',handler);},[]);
  return visible?<button className="back-top" aria-label={text(locale,'Back to top','返回顶部')} onClick={()=>scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})}><Icon name="up" size={18}/></button>:null;
}
export function CookieSettings({locale}:{locale:Locale}) {
  const dialog=useRef<HTMLDialogElement>(null);const [saved,setSaved]=useState(false);
  function save(){try{localStorage.setItem('motion-cookie-preference','essential-only');}catch{}setSaved(true);dialog.current?.close();}
  return <><button className="footer-button" onClick={()=>{setSaved(false);dialog.current?.showModal();}}>{text(locale,'Cookie settings','Cookie 设置')}</button><span className="sr-only" role="status">{saved?text(locale,'Preferences saved','偏好已保存'):''}</span><dialog ref={dialog} className="cookie-dialog" aria-label={text(locale,'Cookie settings','Cookie 设置')}><h2>{text(locale,'Cookie settings','Cookie 设置')}</h2><p>{text(locale,'This template uses local storage for your theme and preferences. No analytics or advertising cookies are installed.','此模板仅使用本地存储保存主题与偏好，不安装分析或广告 Cookie。')}</p><button className="button primary" onClick={save}>{text(locale,'Save preferences','保存偏好')}</button></dialog></>;
}
