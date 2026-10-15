import type { ReactNode } from 'react';
import '@fontsource-variable/figtree';
import '@fontsource-variable/oxanium';
import '../globals.css';
import { parsePath } from '@/lib/i18n';

export default async function RootLayout({ children, params }: { children: ReactNode; params: Promise<{ path?: string[] }> }) {
  const { path } = await params;
  const locale = parsePath(path)?.locale ?? 'en';
  return <html lang={locale}><body>{children}</body></html>;
}
