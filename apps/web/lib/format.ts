import type { Locale } from '@/i18n/routing';

const TAG: Record<Locale, string> = { en: 'en', zh: 'zh-CN' };
const cache = new Map<string, Intl.NumberFormat | Intl.RelativeTimeFormat | Intl.DateTimeFormat>();
const memo = <T extends Intl.NumberFormat | Intl.RelativeTimeFormat | Intl.DateTimeFormat>(key: string, make: () => T): T => {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key) as T;
};

/** 1.2k / 4.7万 — short counts in the reader's language. */
export const formatCount = (n: number, locale: Locale = 'en') =>
  n < 1000 ? String(n) : memo(`c:${locale}`, () => new Intl.NumberFormat(TAG[locale], { notation: 'compact', maximumFractionDigits: 1 })).format(n).toLowerCase();

export const formatNumber = (n: number, locale: Locale = 'en') => memo(`n:${locale}`, () => new Intl.NumberFormat(TAG[locale])).format(n);

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 31_536_000],
  ['month', 2_592_000],
  ['week', 604_800],
  ['day', 86_400],
  ['hour', 3_600],
  ['minute', 60],
];

export function formatRelative(iso: string | null, locale: Locale = 'en', now = Date.now()): string {
  if (!iso) return locale === 'zh' ? '未知' : 'unknown';
  const rtf = memo(`r:${locale}`, () => new Intl.RelativeTimeFormat(TAG[locale], { numeric: 'auto' }));
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return rtf.format(0, 'second');
}

export const formatDate = (iso: string, locale: Locale = 'en') =>
  memo(`d:${locale}`, () => new Intl.DateTimeFormat(TAG[locale], { month: 'short', day: 'numeric', year: 'numeric' })).format(new Date(iso));

export const COMPAT_LABEL = { v1: 'V1', v2: 'V2', both: 'V1 + V2' } as const;
