import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { adminMessages, resolveAdminLocale } from './admin';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  // Public site: the `[locale]` URL segment decides, nothing else (no cookie, no header).
  if (hasLocale(routing.locales, requested)) {
    return { locale: requested, messages: (await import(`../messages/${requested}.json`)).default };
  }
  // No locale segment: the unprefixed /admin app. Language comes from a cookie or
  // Accept-Language, and only the admin messages are loaded (under the `admin` key).
  const locale = await resolveAdminLocale();
  return { locale, messages: { admin: adminMessages[locale] } };
});
