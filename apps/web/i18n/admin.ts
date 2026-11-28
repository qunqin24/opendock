import { cookies, headers } from 'next/headers';
import en from '../messages/admin/en.json';
import zh from '../messages/admin/zh.json';
import { ADMIN_LOCALE_COOKIE } from './cookie';
import { routing, type Locale } from './routing';

/** Admin strings live apart from the public messages so the public client payload stays small. */
export type AdminMessages = typeof en;
// Typing `zh` as `AdminMessages` makes `tsc` fail when a key is missing from it.
export const adminMessages: Record<Locale, AdminMessages> = { en, zh };

const isLocale = (value: string | undefined): value is Locale => routing.locales.some((l) => l === value);

/** First language in an `Accept-Language` header we support (`zh*` → zh). */
export function localeFromAcceptLanguage(header: string | null | undefined): Locale {
  for (const part of (header ?? '').split(',')) {
    const primary = part.split(';')[0]?.trim().toLowerCase().split('-')[0];
    if (primary === 'zh') return 'zh';
    if (primary === 'en') return 'en';
  }
  return routing.defaultLocale;
}

/** Admin language: the cookie when set, otherwise the browser's `Accept-Language`, otherwise English. */
export async function resolveAdminLocale(): Promise<Locale> {
  const saved = (await cookies()).get(ADMIN_LOCALE_COOKIE)?.value;
  if (isLocale(saved)) return saved;
  return localeFromAcceptLanguage((await headers()).get('accept-language'));
}
