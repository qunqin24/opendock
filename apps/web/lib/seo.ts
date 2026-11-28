import type { Metadata } from 'next';
import type { Locale } from '@/i18n/routing';

/**
 * Canonical + hreflang for a path that exists in both languages.
 * English owns the bare path; Chinese adds `/zh`.
 */
export function alternates(locale: Locale, path: string): Metadata['alternates'] {
  const clean = path === '/' ? '' : path;
  const en = clean || '/';
  const zh = `/zh${clean}`;
  return {
    canonical: locale === 'zh' ? zh : en,
    languages: { en, 'zh-CN': zh, 'x-default': en },
  };
}
