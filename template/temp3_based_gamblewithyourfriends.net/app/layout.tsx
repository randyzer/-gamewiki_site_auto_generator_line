import type { Metadata } from 'next';
import { siteUrl, indexable } from '@/lib/site';
import './globals.css';
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: 'Co-op Fieldnotes', template: '%s · Co-op Fieldnotes' },
  robots: { index: indexable, follow: true },
  icons: { icon: '/images/mark.svg' },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
