'use client'

import { useTranslations } from 'next-intl'
import { routing, type Locale } from '@/i18n/routing'
import { cn } from '@/lib/admin/utils'
import { useSwitchAdminLocale } from '@/lib/admin/locale'
import {
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/admin/ui/dropdown-menu'

/** Language names are always shown in their own language. */
export const LOCALE_NAMES: Record<Locale, string> = { en: 'English', zh: '中文' }

/** Language choice inside a dropdown menu (profile menu). */
export function LanguageMenuItems() {
  const t = useTranslations('admin.language')
  const { locale, switchLocale } = useSwitchAdminLocale()
  return (
    <>
      <DropdownMenuLabel className='text-xs font-normal text-muted-foreground'>
        {t('label')}
      </DropdownMenuLabel>
      <DropdownMenuRadioGroup
        value={locale}
        onValueChange={(v) => switchLocale(v as Locale)}
      >
        {routing.locales.map((l) => (
          <DropdownMenuRadioItem key={l} value={l} lang={l === 'zh' ? 'zh-CN' : 'en'}>
            {LOCALE_NAMES[l]}
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
    </>
  )
}

/** Small inline switch for pages without a menu (sign-in). */
export function LanguageLinks({ className }: { className?: string }) {
  const t = useTranslations('admin.language')
  const { locale, switchLocale } = useSwitchAdminLocale()
  return (
    <nav
      aria-label={t('switchTo')}
      className={cn('flex items-center justify-center gap-2 text-xs text-muted-foreground', className)}
    >
      {routing.locales.map((l, i) => (
        <span key={l} className='flex items-center gap-2'>
          {i > 0 && <span aria-hidden='true'>/</span>}
          <button
            type='button'
            lang={l === 'zh' ? 'zh-CN' : 'en'}
            aria-current={l === locale ? 'true' : undefined}
            onClick={() => switchLocale(l)}
            className={cn(
              'rounded-sm underline-offset-4 hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
              l === locale && 'font-medium text-foreground'
            )}
          >
            {LOCALE_NAMES[l]}
          </button>
        </span>
      ))}
    </nav>
  )
}
