import Link from 'next/link';
import './globals.css';
export default function GlobalNotFound() {
  return <html lang="en"><body><main className="not-found container"><p className="eyebrow">404 · FIELD SIGNAL LOST</p><h1>Signal not found</h1><p>This field report is outside the available codex.</p><Link className="button primary" href="/guides">Return to guides →</Link></main></body></html>;
}
