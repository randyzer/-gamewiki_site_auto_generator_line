import Link from 'next/link';
import { localePath, type Locale } from '@/lib/locales';
import { getMessages } from '@/lib/messages';
import { Brand } from './ui';

export function SiteFooter({ locale }: { locale: Locale }) {
  const t = getMessages(locale);
  const groups = [
    { title: t.footerGroups[0], labels: t.footerGuides, paths: ['/guides', '/guides#characters', '/guides#walkthrough', '/guides#ending', '/guides', '/guides#beginner'] },
    { title: t.footerGroups[1], labels: t.footerProject, paths: ['/#about', '/guides/midnight-evidence-developer', '/guides#recordings', '/#questions'] },
    { title: t.footerGroups[2], labels: t.legal, paths: [null, null, null, null] },
  ];
  return <footer className="site-footer"><div className="container footer-grid">
    <div className="footer-brand"><Brand locale={locale} footer/><p>{t.footerDescription}</p><span className="footer-small">{t.footerNote}</span></div>
    {groups.map((group) => <div key={group.title}><h3>{group.title}</h3><ul>{group.labels.map((label, index) => <li key={label}>{group.paths[index] ? <Link href={localePath(locale, group.paths[index]!)}>{label}</Link> : <span aria-disabled="true" title={t.previewLabel}>{label}</span>}</li>)}</ul></div>)}
  </div><div className="container footer-bottom"><span>© 2026 Midnight Evidence Wiki — {t.copyright}</span><span>{t.credits}</span></div></footer>;
}
