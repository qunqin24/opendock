'use client'

import { useQuery } from '@tanstack/react-query'
import { TriangleAlert } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { meQueryOptions } from '@/lib/admin/auth'
import { useFormat } from '@/lib/admin/format'
import { Alert, AlertDescription, AlertTitle } from '@/components/admin/ui/alert'
import { ContentSection } from '../components/content-section'
import { AccountForm } from './account-form'

export function SettingsAccount() {
  const t = useTranslations('admin.settings.account')
  const role = useTranslations('admin.common.role')
  const common = useTranslations('admin.common')
  // Fixed zone (UTC) so server and client render the same text.
  const { dateTimeUtc } = useFormat()
  const { data: user } = useQuery(meQueryOptions)

  return (
    <ContentSection
      title={t('title')}
      desc={t('description')}
    >
      <div className='space-y-6'>
        {user?.mustChangePassword && (
          <Alert variant='destructive'>
            <TriangleAlert />
            <AlertTitle>{t('mustChangeTitle')}</AlertTitle>
            <AlertDescription>
              {t('mustChangeDescription')}
            </AlertDescription>
          </Alert>
        )}
        {user && (
          <dl className='grid grid-cols-[8rem_1fr] gap-y-1 text-sm'>
            <dt className='text-muted-foreground'>{t('username')}</dt>
            <dd className='font-medium'>{user.username}</dd>
            <dt className='text-muted-foreground'>{t('role')}</dt>
            <dd>{role(user.role)}</dd>
            <dt className='text-muted-foreground'>{t('lastSignIn')}</dt>
            <dd>
              {user.lastLoginAt
                ? dateTimeUtc(user.lastLoginAt)
                : common('never')}
            </dd>
          </dl>
        )}
        <AccountForm />
      </div>
    </ContentSection>
  )
}
