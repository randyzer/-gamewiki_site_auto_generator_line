import '@fontsource-variable/inter';
import '../globals.css';
import { resolvePath } from '@/lib/i18n';
import type { ReactNode } from 'react';

export default async function RootLayout({ children, params }: { children: ReactNode; params: Promise<{ segments?: string[] }> }) {
  const { locale } = resolvePath((await params).segments);
  return <html lang={locale} data-theme="dark" suppressHydrationWarning><body>{children}</body></html>;
}
