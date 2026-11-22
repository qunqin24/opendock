'use client'

import type * as React from 'react'
import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2, LogIn } from 'lucide-react'
import { toast } from 'sonner'
import { useDescribeError } from '@/lib/admin/api-errors'
import { login, meQueryKey } from '@/lib/admin/auth'
import { cn } from '@/lib/admin/utils'
import { Button } from '@/components/admin/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/admin/ui/form'
import { Input } from '@/components/admin/ui/input'
import { PasswordInput } from '@/components/admin/password-input'

type FormValues = { username: string; password: string }

interface UserAuthFormProps extends React.HTMLAttributes<HTMLFormElement> {
  redirectTo?: string
}

export function UserAuthForm({
  className,
  redirectTo,
  ...props
}: UserAuthFormProps) {
  const t = useTranslations('admin.auth')
  const describe = useDescribeError()
  const [isLoading, setIsLoading] = useState(false)
  const queryClient = useQueryClient()

  const formSchema = useMemo(
    () =>
      z.object({
        username: z.string().trim().min(1, t('usernameRequired')),
        password: z.string().min(1, t('passwordRequired')),
      }),
    [t]
  )

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { username: '', password: '' },
  })

  async function onSubmit(data: FormValues) {
    setIsLoading(true)
    try {
      const user = await login(data.username, data.password)
      queryClient.setQueryData(meQueryKey, user)
      // Only follow same-app relative redirects.
      const target =
        redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('//')
          ? redirectTo
          : '/admin'
      // Hard navigation so the server renders the authenticated pages fresh.
      window.location.replace(target)
      return
    } catch (error) {
      toast.error(describe(error, 'signInFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn('grid gap-5', className)}
        {...props}
      >
        <FormField
          control={form.control}
          name='username'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('username')}</FormLabel>
              <FormControl>
                <Input className='h-11 text-[15px]' autoComplete='username' placeholder='admin' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='password'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('password')}</FormLabel>
              <FormControl>
                <PasswordInput
                  className='h-11 [&_input]:text-[15px]'
                  autoComplete='current-password'
                  placeholder='********'
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button className='mt-2 h-11 text-[15px]' disabled={isLoading}>
          {isLoading ? <Loader2 className='animate-spin' /> : <LogIn />}
          {t('submit')}
        </Button>
      </form>
    </Form>
  )
}
