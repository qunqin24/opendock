import type * as React from 'react'
import { useTranslations } from 'next-intl'
import { Logo } from '@/components/admin/assets/logo'
import { LanguageLinks } from '@/components/admin/language-switch'

type AuthLayoutProps = {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const t = useTranslations('admin.common')
  return (
    <div className='container grid h-svh max-w-none items-center justify-center'>
      <div className='mx-auto flex w-[min(100vw-2rem,26rem)] flex-col justify-center space-y-2 py-8'>
        <div className='mb-4 flex items-center justify-center'>
          <Logo className='me-2 size-7' />
          <h1 className='text-2xl font-semibold tracking-tight'>{t('appName')}</h1>
        </div>
        {children}
        <LanguageLinks className='pt-4' />
      </div>
    </div>
  )
}
