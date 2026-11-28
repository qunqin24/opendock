'use client'

import { useTranslations } from 'next-intl'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/admin/ui/card'
import { AuthLayout } from '../auth-layout'
import { UserAuthForm } from './components/user-auth-form'

export function SignIn({ redirect }: { redirect?: string }) {
  const t = useTranslations('admin.auth')
  return (
    <AuthLayout>
      <Card className='w-full gap-6 py-8'>
        <CardHeader className='px-8'>
          <CardTitle className='text-2xl tracking-tight'>{t('title')}</CardTitle>
          <CardDescription className='text-[15px]'>
            {t('description')}
          </CardDescription>
        </CardHeader>
        <CardContent className='px-8'>
          <UserAuthForm redirectTo={redirect} />
        </CardContent>
      </Card>
    </AuthLayout>
  )
}
