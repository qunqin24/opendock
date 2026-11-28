'use client'

import type * as React from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { cn } from '@/lib/admin/utils'
import { Button } from '@/components/admin/ui/button'

type GeneralErrorProps = React.HTMLAttributes<HTMLDivElement> & {
  minimal?: boolean
  reset?: () => void
}

export function GeneralError({
  className,
  minimal = false,
  reset,
}: GeneralErrorProps) {
  const t = useTranslations('admin.generalError')
  return (
    <div className={cn('h-svh w-full', className)}>
      <div className='m-auto flex h-full w-full flex-col items-center justify-center gap-2'>
        {!minimal && (
          <h1 className='text-[7rem] leading-tight font-bold'>500</h1>
        )}
        <span className='font-medium'>{t('title')}</span>
        <p className='text-center text-muted-foreground'>
          {t('description')}
        </p>
        {!minimal && (
          <div className='mt-6 flex gap-4'>
            {reset && (
              <Button variant='outline' onClick={reset}>
                {t('retry')}
              </Button>
            )}
            <Button asChild>
              <Link href='/admin'>{t('home')}</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
