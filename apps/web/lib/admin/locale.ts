'use client'

import { startTransition } from 'react'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { ADMIN_LOCALE_COOKIE } from '@/i18n/cookie'
import { type Locale } from '@/i18n/routing'
import { setCookie } from '@/lib/admin/cookies'

const ONE_YEAR = 60 * 60 * 24 * 365

/** Switches the admin language: stores it in a cookie and re-renders in place (the URL does not change). */
export function useSwitchAdminLocale() {
  const router = useRouter()
  const locale = useLocale()
  return {
    locale,
    switchLocale(next: Locale) {
      if (next === locale) return
      setCookie(ADMIN_LOCALE_COOKIE, next, ONE_YEAR)
      startTransition(() => router.refresh())
    },
  }
}
