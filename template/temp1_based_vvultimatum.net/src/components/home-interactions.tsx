'use client';

import { useRef, useState } from 'react';
import { messages } from '@/lib/messages';
import type { Locale } from '@/lib/i18n';
import { Icon } from './icon';

export function Faq({ locale }: { locale: Locale }) {
  const m = messages[locale];
  const [open, setOpen] = useState<number | null>(0);
  return <div className="faq-list">{m.faqs.map(([question, answer], index) => <div className="faq-item" key={question}><h3><button aria-expanded={open === index} aria-controls={`faq-answer-${index}`} onClick={() => setOpen(open === index ? null : index)}>{question}<Icon name="down" size={14} /></button></h3><div className="faq-answer" id={`faq-answer-${index}`} hidden={open !== index}>{answer}</div></div>)}</div>;
}

export function Trending({ locale }: { locale: Locale }) {
  const m = messages[locale];
  const viewport = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(0);
  const scrollTo = (index: number) => {
    const container = viewport.current;
    if (!container) return;
    const item = container.children[Math.max(0, Math.min(index, m.trendingCards.length - 1))] as HTMLElement;
    container.scrollTo({ left: item.offsetLeft - container.offsetLeft, behavior: 'smooth' });
  };
  return <section className="trending-section"><div className="trending-heading"><div><div className="eyebrow">{m.popular}</div><h2>{m.trending}</h2></div><div className="carousel-controls"><button aria-label={m.previous} onClick={() => scrollTo(position - 2)} disabled={position === 0}><Icon name="chevron" style={{ transform: 'rotate(180deg)' }} size={14} /></button><button aria-label={m.next} onClick={() => scrollTo(position + 2)} disabled={position >= m.trendingCards.length - 2}><Icon name="chevron" size={14} /></button></div></div>
    <div className="carousel-viewport" ref={viewport} tabIndex={0} role="region" aria-label={m.trending} onKeyDown={e => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); scrollTo(position + (e.key === 'ArrowRight' ? 2 : -2)); } }} onScroll={() => { const node = viewport.current; if (node) { const cards = [...node.children] as HTMLElement[]; const nearest = cards.reduce((best, card, index) => Math.abs(card.offsetLeft - node.offsetLeft - node.scrollLeft) < Math.abs(cards[best].offsetLeft - node.offsetLeft - node.scrollLeft) ? index : best, 0); setPosition(node.scrollLeft >= node.scrollWidth - node.clientWidth - 2 ? cards.length - 1 : nearest); } }}>
      {m.trendingCards.map(([title, description], index) => <div key={title} className="trending-card" aria-disabled="true"><img src={`/art/${index % 3 === 1 ? 'crest' : index % 3 === 2 ? 'ruins' : 'landscape'}.svg`} width="672" height="378" alt={title} /><div className="trending-copy"><small>{m.preview}</small><h3>{title}</h3><p>{description}</p></div></div>)}
    </div><div className="carousel-dots">{Array.from({ length: Math.ceil(m.trendingCards.length / 2) }, (_, index) => <button key={index} className={Math.floor(position / 2) === index ? 'selected' : ''} aria-label={`${m.page} ${index + 1}`} aria-current={Math.floor(position / 2) === index ? 'true' : undefined} onClick={() => scrollTo(index * 2)} />)}</div><div className="topic-chips">{m.chips.map(text => <span aria-disabled="true" key={text}>{text} <small>{m.preview}</small><Icon name="chevron" size={12} /></span>)}</div></section>;
}
