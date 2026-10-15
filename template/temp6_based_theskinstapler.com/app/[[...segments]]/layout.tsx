import type { Metadata } from 'next';
import '@fontsource-variable/inter';
import '@fontsource-variable/oswald';
import '../globals.css';
import { isLocale } from '@/lib/locales';
import { getMessages } from '@/lib/messages';
import { getGuides } from '@/lib/guides';
import { indexable, siteUrl } from '@/lib/site';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';

type Props = Readonly<{ children: React.ReactNode; params: Promise<{ segments?: string[] }> }>;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: 'Midnight Evidence Wiki', template: '%s | Midnight Evidence Wiki' },
  robots: { index: indexable, follow: true },
};

export default async function Layout({ children, params }: Props) {
  const segments = (await params).segments ?? [];
  const locale = isLocale(segments[0] ?? '') ? segments[0] as typeof import('@/lib/locales').locales[number] : 'en';
  const t = getMessages(locale);
  const guides = await getGuides(locale);
  return <html lang={locale}><body><a className="skip-link" href="#main-content">{t.skip}</a><SiteHeader guides={guides} locale={locale} t={t}/><main id="main-content">{children}</main><SiteFooter locale={locale}/></body></html>;
}
