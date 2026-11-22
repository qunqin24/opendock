import { type Locale } from '@/i18n/routing'

/** Category name in the admin's language (the API sends both). */
export const categoryName = (c: { label: string; labelZh?: string }, locale: Locale) =>
  (locale === 'zh' ? c.labelZh : null) ?? c.label
