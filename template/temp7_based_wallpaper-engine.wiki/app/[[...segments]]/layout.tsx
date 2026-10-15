import type { ReactNode } from 'react';
import '../globals.css';
import { resolveSegments } from '@/lib/i18n';
export default async function RootLayout({children,params}:{children:ReactNode;params:Promise<{segments?:string[]}>}) {
  const {locale}=resolveSegments((await params).segments);
  return <html lang={locale} suppressHydrationWarning><head><link rel="icon" href="/logo.svg" type="image/svg+xml"/><script dangerouslySetInnerHTML={{__html:`try{document.documentElement.dataset.theme=localStorage.getItem('motion-theme')||'dark'}catch{document.documentElement.dataset.theme='dark'}`}}/></head><body>{children}</body></html>;
}
