import type { CSSProperties } from 'react';

const paths: Record<string, string> = {
  book: 'M12 5C8 2 3 3 3 3v15s5-1 9 2m0-15c4-3 9-2 9-2v15s-5-1-9 2V5',
  sword: 'm4 3 17 17m-6-2 3-3M3 21l6-6M3 3l5 1-4 4-1-5m18 0-5 1 4 4 1-5m-8 7 8-7M4 16l4 4',
  shield: 'm12 3 8 4v6c0 5-8 8-8 8s-8-3-8-8V7l8-4',
  map: 'm3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5m6-2v16m6-14v16',
  users: 'M16 21v-3c0-4-8-4-8 0v3m12-1v-3c0-2-2-3-3-3M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8',
  target: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20m0 4a6 6 0 1 0 0 12 6 6 0 0 0 0-12m0 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4',
  tool: 'm14 6 4 4 3-3c1 6-4 10-8 7L5 22l-3-3 8-8C7 7 11 2 17 3l-3 3',
  trophy: 'M8 3h8v8a4 4 0 0 1-8 0V3m0 3H3v3c0 3 5 4 5 4m8-7h5v3c0 3-5 4-5 4m-4 2v6m-4 0h8',
  star: 'm12 3 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6',
  code: 'm8 7-5 5 5 5m8-10 5 5-5 5m-3-13-2 16',
  news: 'M5 3h14v18H5V3m4 4h6m-6 4h6m-6 4h6',
  arrow: 'M4 12h16m-6-6 6 6-6 6', chevron: 'm8 4 8 8-8 8', down: 'm5 8 7 7 7-7',
  menu: 'M4 6h16M4 12h16M4 18h16', close: 'm5 5 14 14M5 19 19 5',
  moon: 'M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11',
  sun: 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10m0-5v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2',
  grid: 'M3 3h7v7H3V3m11 0h7v7h-7V3M3 14h7v7H3v-7m11 0h7v7h-7v-7',
  external: 'M14 3h7v7m0-7L10 14m0-11H3v18h18v-7',
  mail: 'M3 5h18v14H3V5m0 0 9 7 9-7',
};
export function Icon({ name = 'book', size = 16, style }: { name?: string; size?: number; style?: CSSProperties }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={style}><path d={paths[name] || paths.book} /></svg>;
}
