import type { ReactNode } from 'react';
export function Icon({ name = 'target', className = '' }: { name?: string; className?: string }) {
  const shapes: Record<string, ReactNode> = {
    target: <><circle cx="12" cy="12" r="8"/><path d="M12 2v5m0 10v5M2 12h5m10 0h5"/></>,
    building: <><rect x="5" y="3" width="14" height="18"/><path d="M9 7h1m4 0h1M9 11h1m4 0h1M9 15h1m4 0h1M10 21v-3h4v3"/></>,
    flag: <><path d="M5 21V3m0 1h14l-3 5 3 5H5"/></>,
    system: <><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 4v3m0 10v3M4 12h3m10 0h3"/></>,
    trophy: <><path d="M8 3h8v7a4 4 0 0 1-8 0V3zm0 2H4v3c0 3 2 4 4 4m8-7h4v3c0 3-2 4-4 4M12 14v5m-4 2h8"/></>,
    book: <><path d="M4 4h7l1 2 1-2h7v16h-7l-1 1-1-1H4V4zm8 2v15M7 8h2m-2 4h2m6-4h2m-2 4h2"/></>,
    key: <><circle cx="8" cy="9" r="5"/><path d="m12 13 7 7 2-2-2-2 2-2-2-2-2 2"/></>,
    file: <><path d="M6 3h8l4 4v14H6V3zm8 0v5h4M9 12h6m-6 4h6"/></>,
    help: <><circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 4 3c-1 0-1 1-1 2m0 3h.01"/></>,
    search: <><circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/></>,
    arrow: <><path d="M4 12h15m-6-6 6 6-6 6"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h16"/></>,
    close: <><path d="m5 5 14 14M19 5 5 19"/></>,
  };
  return <svg aria-hidden="true" className={`icon ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{shapes[name] ?? shapes.target}</svg>;
}
export function Container({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`container ${className}`}>{children}</div>;
}
