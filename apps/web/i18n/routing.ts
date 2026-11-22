import { defineRouting } from 'next-intl/routing';

/**
 * English owns the bare paths (`/plugins`), Chinese lives under `/zh`
 * (`/zh/plugins`) — the same URLs as the legacy site. No automatic redirect
 * by browser language: every URL shows one language, which keeps links and
 * search results stable. The header switch changes language.
 */
export const routing = defineRouting({
  locales: ['en', 'zh'],
  defaultLocale: 'en',
  localePrefix: 'as-needed',
  localeDetection: false,
});

export type Locale = (typeof routing.locales)[number];

/** BCP 47 tags for `<html lang>`, Intl formatters and hreflang. */
export const LANG_TAG: Record<Locale, string> = { en: 'en', zh: 'zh-CN' };
