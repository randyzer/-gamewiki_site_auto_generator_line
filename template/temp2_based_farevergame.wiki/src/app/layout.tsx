import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/metamorphous/latin-400.css';
import '@fontsource/metamorphous/latin-ext-400.css';
import './globals.css';
import { Header, Footer } from '@/components/shared';
import { resolvePath } from '@/lib/i18n';
import { siteUrl } from '@/lib/seo';
export const metadata: Metadata = { metadataBase: new URL(siteUrl), icons: { icon: '/emblem.svg' } };
export default async function Layout({ children, params }: { children: ReactNode; params: Promise<{ path?: string[] }> }) {
  const route=resolvePath((await params).path), locale=route?.locale??'en';
  return <html lang={locale}><body><Header locale={locale} current={route?.suffix??''}/><main>{children}</main><Footer locale={locale} suffix={route?.suffix??''}/></body></html>;
}
