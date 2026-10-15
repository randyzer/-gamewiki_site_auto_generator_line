import en from './messages/en.json';
import de from './messages/de.json';
import ptBR from './messages/pt-BR.json';
import es from './messages/es.json';
import zhCN from './messages/zh-CN.json';
import type { Locale } from './site';
export type Messages = typeof en;
const messages: Record<Locale, Messages> = { en, de, 'pt-BR': ptBR, es, 'zh-CN': zhCN };
export function getMessages(locale: Locale): Messages { return messages[locale]; }
