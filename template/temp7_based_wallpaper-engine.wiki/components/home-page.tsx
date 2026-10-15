import Link from 'next/link';
import { getCatalog, getCategories, type Entry } from '@/lib/previews';
import { discoverArticles, articlePath } from '@/lib/content';
import { categoryLabel, localePath, text, type Locale } from '@/lib/i18n';
import { Card, SectionHeading } from './shared';
import { AdSlot, Faq, VideoPreview } from './interactive';
import { Icon } from './icon';
export function HomePage({locale}:{locale:Locale}) {
  const articles=discoverArticles(); const catalog=getCatalog(locale,articles);
  const guide=catalog.filter(e=>e.category==='guide');
  const startFirst=guide.find(e=>e.slug==='what-is-wallpaper-engine')??guide[0];
  const install=guide.find(e=>e.slug==='install-and-setup')??guide[0];
  const performance=guide.find(e=>e.slug==='performance-settings')??guide[0];
  const safety=catalog.find(e=>e.category==='safety'&&e.slug==='safe-downloads')!;
  const faqs=locale==='en'?[
    ['Where can I check the current price?','Use the official Steam listing for the price and purchase terms in your own region. This template does not keep a live price feed.'],
    ['Is the application the same as a wallpaper?','The application provides the desktop playback tools. A wallpaper is an individual scene, video or other background that you choose to display.'],
    ['Will it run on my computer?','Compare your operating system and hardware with the current official system requirements before installing. Different platforms have different options.'],
    ['How should I check an unfamiliar download?','Start with the official application listing, review the source of community content and avoid running unexpected executable files.'],
    ['Can I pause wallpapers while gaming?','Review the playback rules in the application settings and test them with the games and monitor arrangement you normally use.'],
    ['What should I check for a phone?','Consult the official companion application instructions for current device support, pairing steps and the formats that can be transferred.'],
    ['Where should I start the setup?','Open our installation guide for a complete first session, including the Steam installation, choosing a background and reviewing basic preferences.'],
  ]:[
    ['在哪里查看当前购买价格？','请打开官方 Steam 商店页面，查看所在地区的价格与购买条款。本模板不提供实时价格数据。'],
    ['应用和壁纸有什么不同？','应用提供桌面播放与控制工具；壁纸则是你选择显示的场景、视频或其他形式的背景内容。'],
    ['我的电脑可以使用吗？','安装之前，先将电脑系统与硬件配置和当前官方要求进行比较。不同平台有不同的实现方案。'],
    ['怎样检查不熟悉的下载内容？','从官方应用页面开始，确认社区内容的来源，避免运行来源不清楚、用途不明确的可执行文件。'],
    ['玩游戏时能暂停动态壁纸吗？','检查应用设置中的播放规则，再结合日常使用的游戏和显示器布局进行实际测试。'],
    ['手机使用需要先确认什么？','查看官方伴侣应用的说明，确认当前设备支持、配对步骤以及能够传输的内容格式。'],
    ['第一次使用应该从哪里开始？','阅读本站安装指南，按步骤完成 Steam 安装、选择背景和基础偏好设置，建立自己的第一个动态桌面。'],
  ];
  const featured=(entry:Entry,title:string,description:string):Entry=>({...entry,title,description});
  return <>
    <section className="hero"><div className="hero-copy"><p className="eyebrow">{text(locale,'Fan-made reference site','爱好者制作的参考站')}</p><h1 className="gradient-title">Motion Desktop<br/>Wiki</h1><p className="hero-description">{text(locale,'Make a Windows desktop feel like your own with animated scenes, video backgrounds and community creations. Explore a practical starting point for Wallpaper Engine: how to install it, choose your first wallpaper, check your platform and understand the preferences that matter in everyday use.','用动态场景、视频背景与社区作品打造自己的 Windows 桌面。从这里开始认识 Wallpaper Engine：了解安装流程、选择第一张壁纸、确认平台支持，并逐步检查影响日常体验的启动、播放与画质偏好设置。')}</p><div className="hero-actions"><a className="button primary" href="https://store.steampowered.com/app/431960/Wallpaper_Engine/" target="_blank" rel="noreferrer"><Icon name="external" size={16}/>{text(locale,'Buy on Steam','前往 Steam 购买')}</a><Link className="button" href={install.article?articlePath(install.article):localePath(locale,'guide')}>{text(locale,'Start with the basics','从基础开始')}</Link></div></div><VideoPreview locale={locale}/></section>
    <section className="section start-section"><p className="eyebrow">{text(locale,'Start here','从这里开始')}</p><h2 className="start-title accent-heading">{text(locale,'Get Your Live Desktop Running','开始使用你的动态桌面')}</h2><div className="start-grid"><Card entry={featured(startFirst,text(locale,'What a live wallpaper actually does','动态壁纸究竟能做什么'),text(locale,'Explore animated scenes, video backgrounds and the tools that bring a personal desktop to life.','认识动态场景、视频背景，以及让你的桌面呈现不同效果的基本工具和使用方式。'))} locale={locale} variant="start"/><Card entry={featured(install,text(locale,'Install your first live wallpaper','完成安装，选择第一张动态壁纸'),text(locale,'Install from Steam, choose a background and review the three groups of settings to check first.','从 Steam 安装应用，选择喜欢的桌面背景，并检查第一次使用时值得关注的三组基础设置。'))} locale={locale} variant="start"/></div></section>
    <section className="section updates-section"><div className="updates-columns"><div><SectionHeading title={text(locale,'Latest Changes','最近更新')} href={localePath(locale,'guide')} label={text(locale,'Browse all','浏览全部')}/><div className="two-grid"><Card entry={install} locale={locale}/><Card entry={performance} locale={locale}/></div></div><div><SectionHeading title={text(locale,'Answers People Look For','大家关心的问题')}/><div className="two-grid"><Card entry={featured(performance,text(locale,'Performance preferences worth checking first','先检查这些性能与播放偏好'),text(locale,'A preview of frame rate, quality and playback rules when the desktop needs a little more breathing room.','当动态桌面需要为其他应用腾出资源时，先了解帧率、画质与播放规则的基本调整方向。'))} locale={locale}/><Card entry={featured(safety,text(locale,'Know where your wallpapers come from','了解你的动态壁纸来自哪里'),text(locale,'Separate the application from community content, and check the source before trying a new download.','区分应用本身与社区创作内容，在尝试下载之前确认来源、文件格式与基本使用方式。'))} locale={locale}/></div></div></div><AdSlot/></section>
    {getCategories(catalog).map(category=>{const entries=catalog.filter(e=>e.category===category);const hasReal=articles.some(a=>a.locale===locale&&a.category===category);return <section className="section category-section" id={category} key={category}><SectionHeading title={categoryLabel(category,locale)} href={hasReal?localePath(locale,category):undefined} label={hasReal?text(locale,'View more','查看更多'):text(locale,'Preview','主题预览')}/><div className={`category-grid count-${Math.min(entries.length,4)}`}>{entries.map(entry=><Card key={entry.slug} entry={entry} locale={locale}/>)}</div></section>;})}
    <section className="section faq-section" id="faq"><h2 className="accent-heading">{text(locale,'Live Desktop FAQ','动态桌面常见问题')}</h2><p>{text(locale,'A few useful answers before your first installation, and a starting point for what comes next.','安装之前需要了解的几个问题，以及第一次使用之后值得继续探索的方向。')}</p><Faq items={faqs.map(([question,answer])=>({question,answer}))}/></section>
    <section className="section"><div className="bottom-cta"><h2 className="accent-heading">{text(locale,'Start with the checks that make a difference','先确认真正影响使用体验的事项')}</h2><p>{text(locale,'Check the application requirements and learn how your downloads are managed. A few minutes of preparation makes it easier to build a wallpaper library that works for your desktop.','先确认应用要求，再了解下载内容的管理方式。安装之前做一点准备，让之后建立的壁纸库更适合自己的电脑和日常使用习惯。')}</p><div className="hero-actions"><Link className="button primary" href={localePath(locale,'guide/install-and-setup')}>{text(locale,'Read the installation guide','阅读安装指南')}</Link><Link className="button" href={localePath(locale,'guide')}>{text(locale,'Explore the guide topics','浏览使用指南')}</Link></div></div></section>
  </>;
}
