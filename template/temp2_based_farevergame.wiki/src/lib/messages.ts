import en from './messages/en.json';
import de from './messages/de.json';
import pt from './messages/pt-BR.json';
import es from './messages/es.json';
import zh from './messages/zh-CN.json';
import type { Locale } from './i18n';
export type Messages = typeof en;
const messages: Record<Locale, Messages> = { en, de, 'pt-BR': pt, es, 'zh-CN': zh };
export function getMessages(locale: Locale) { return messages[locale]; }
