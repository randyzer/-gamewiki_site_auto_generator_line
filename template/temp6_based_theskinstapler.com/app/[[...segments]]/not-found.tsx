import Link from 'next/link';

export default function NotFound() {
  return <div className="container not-found"><h1>Case file not found</h1><p>This page is not in the archive.</p><Link className="button button-primary" href="/guides">Browse all guides</Link></div>;
}
