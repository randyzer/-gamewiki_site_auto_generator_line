import type { ReactNode } from 'react';
import { parseRoute } from '@/lib/i18n';
import { getMessages } from '@/lib/messages';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import '../globals.css';
export default async function RootLayout({ children, params }: { children: ReactNode; params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await params;
  const route = parseRoute(`/${path.join('/')}`);
  const m = await getMessages(route.locale);
  return <html lang={route.locale}><body><Header locale={route.locale} m={m} active={route.kind === 'guides' || route.kind === 'article'}/>{children}<Footer locale={route.locale} m={m}/></body></html>;
}
