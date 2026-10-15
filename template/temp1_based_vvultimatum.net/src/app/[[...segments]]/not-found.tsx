import Link from 'next/link';

export default function NotFound() {
  return <main className="not-found"><span>404</span><h1>Page not found</h1><p>This guide is not available. Preview cards do not have article routes.</p><Link href="/">Back to home</Link></main>;
}
