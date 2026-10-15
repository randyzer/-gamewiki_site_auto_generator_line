import type { ComponentProps, ReactNode } from 'react';
import { Figure } from './shared';
import { getMessages } from '@/lib/messages';
import type { Locale } from '@/lib/site';

export function Section({ title, children, id }: { title: string; children: ReactNode; id?: string }) {
  return <section id={id} data-article-section><h2>{title}</h2>{children}</section>;
}
export function Callout({ title, children, tone = 'gold' }: { title?: string; children: ReactNode; tone?: string }) {
  return <div className={`callout tone-${tone}`}>{title && <h3>{title}</h3>}{children}</div>;
}
export function Step({ number, title, children }: { number: number | string; title: string; children: ReactNode }) {
  return <div className="card article-step"><span>{number}</span><div><h3>{title}</h3>{children}</div></div>;
}
export function Panel({ title, children, tone, variant }: { title: string; children: ReactNode; tone?: string; variant?: 'roles' | 'item' }) {
  return <div className={`card article-panel ${tone ? `tone-${tone}` : ''} ${variant || ''}`}><h3>{title}</h3>{children}</div>;
}
export function Grid({ children, columns = 2 }: { children: ReactNode; columns?: 2 | 3 | '2' | '3' }) {
  return <div className={`grid article-grid cols-${columns}`}>{children}</div>;
}
export function FaqItem({ question, children }: { question: string; children: ReactNode }) {
  return <details className="card faq"><summary>{question}<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg></summary>{children}</details>;
}
export function Quota({ label, value, children }: { label: string; value: string; children: ReactNode }) {
  return <div className="card quota-card"><small>{label}</small><strong>{value}</strong>{children}</div>;
}
export function getMdxComponents(locale: Locale) { return {
  Section, Callout, Step, Panel, Grid, Figure, FaqItem, Quota,
  table: (props: ComponentProps<'table'>) => <div className="article-table" tabIndex={0} role="region" aria-label={getMessages(locale).gamesTitle}><table {...props} /></div>,
}; }
