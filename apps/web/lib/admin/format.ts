import { useMemo } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { LANG_TAG, type Locale } from '@/i18n/routing'
import { formatCount, formatNumber as formatFull, formatRelative } from '@/lib/format'

/** Locale-aware number and time helpers for the admin (zh-CN vs en). */
export function useFormat() {
  const locale = useLocale() as Locale
  const t = useTranslations('admin.common')

  return useMemo(() => ({
    locale,
    formatCompact: (n: number) => formatCount(n, locale),
    formatNumber: (n: number) => formatFull(n, locale),
    /** "3 hours ago" style label for an ISO timestamp. */
    timeAgo(iso: string | null | undefined): string {
      if (!iso) return t('never')
      const diff = Date.now() - new Date(iso).getTime()
      if (Number.isNaN(diff)) return t('unknown')
      if (Math.abs(diff) < 60_000) return t('justNow')
      return formatRelative(iso, locale)
    },
    /** Date and time in UTC, fixed zone so server and client render the same text. */
    dateTimeUtc(iso: string): string {
      const text = new Intl.DateTimeFormat(LANG_TAG[locale], {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'UTC',
      }).format(new Date(iso))
      return `${text} UTC`
    },
    /** Date and time in the viewer's own zone (client-only content). */
    dateTime: (iso: string) => new Date(iso).toLocaleString(LANG_TAG[locale]),
  }), [locale, t])
}
