import Link from 'next/link';
export default function NotFound() {
  return <html lang="en"><body><main className="shell narrow not-found"><h1>Page not found</h1><p>This article is not published. Browse the guide for available content.</p><Link href="/guide/" className="button primary">Open the guide</Link></main></body></html>;
}
