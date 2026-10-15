import en from '../../messages/en.json';
import type { Locale } from './i18n';
export type Messages = typeof en;
export async function getMessages(locale: Locale): Promise<Messages> {
  const messages = await import(`../../messages/${locale}.json`);
  return messages.default;
}
