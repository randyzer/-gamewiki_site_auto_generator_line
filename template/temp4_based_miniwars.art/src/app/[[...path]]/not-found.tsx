import Link from 'next/link';
export default function NotFound() {
  return <main className="not-found container"><p className="eyebrow">404 · FIELD SIGNAL LOST</p><h1>Signal not found</h1><p>This field report is outside the available codex.</p><Link className="button primary" href="/guides">Return to guides →</Link></main>;
}
