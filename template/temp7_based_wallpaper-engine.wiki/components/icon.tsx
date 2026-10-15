import type { CSSProperties } from 'react';
export type IconName = 'search'|'moon'|'sun'|'globe'|'chevron'|'menu'|'close'|'arrow'|'external'|'book'|'share'|'calendar'|'user'|'clock'|'up'|'play'|'bulb';
const paths: Record<IconName, React.ReactNode> = {
  bulb:<><path d="M9 18h6m-5 3h4M8 14a6 6 0 1 1 8 0c-1 1-1 2-1 3H9c0-1 0-2-1-3Z"/></>,
  search:<><circle cx="10.5" cy="10.5" r="7.5"/><path d="m16 16 5 5"/></>,
  moon:<path d="M20.5 13a8.8 8.8 0 0 1-10-10A9 9 0 1 0 20.5 13Z"/>,
  sun:<><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></>,
  globe:<><circle cx="12" cy="12" r="10"/><ellipse cx="12" cy="12" rx="4.5" ry="10"/><path d="M2 12h20"/></>,
  chevron:<path d="m6 9 6 6 6-6"/>,menu:<path d="M4 5h16M4 12h16M4 19h16"/>,close:<path d="m6 6 12 12M6 18 18 6"/>,
  arrow:<path d="M4 12h16m-6-6 6 6-6 6"/>,external:<><path d="M14 3h7v7m0-7L10 14"/><path d="M10 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"/></>,
  book:<><path d="M12 5v16M12 5C8 2 4 3 2 4v16c3-2 6-2 10 1 4-3 7-3 10-1V4c-3-1-7-2-10 1Z"/></>,
  share:<><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m9 10 6-4M9 14l6 4"/></>,
  calendar:<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6m10-6v6M3 11h18"/></>,
  user:<><circle cx="12" cy="7" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3"/></>,
  clock:<><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/></>,up:<path d="M12 20V4m-6 6 6-6 6 6"/>,play:<path d="m9 5 11 7-11 7Z"/>,
};
export function Icon({name,size=20,style}:{name:IconName;size?:number;style?:CSSProperties}) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={style}>{paths[name]}</svg>;
}
