'use client'

import { useMemo } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { changePassword, meQueryKey, type AuthUser } from '@/lib/admin/auth'
import { Button } from '@/components/admin/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/admin/ui/form'
import { PasswordInput } from '@/components/admin/password-input'

type FormValues = { current: string; next: string; confirm: string }

export function AccountForm() {
  const t = useTranslations('admin.settings.account')
  const queryClient = useQueryClient()
  const formSchema = useMemo(
    () =>
      z
        .object({
          current: z.string().min(1, t('currentRequired')),
          next: z.string().min(10, t('newTooShort')),
          confirm: z.string().min(1, t('confirmRequired')),
        })
        .refine((v) => v.next === v.confirm, {
          message: t('mismatch'),
          path: ['confirm'],
        }),
    [t]
  )
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { current: '', next: '', confirm: '' },
  })

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      changePassword(values.current, values.next),
    onSuccess: () => {
      toast.success(t('updated'))
      form.reset()
      // Clear the "must change password" flag locally so the guard lets go.
      queryClient.setQueryData<AuthUser>(meQueryKey, (user) =>
        user ? { ...user, mustChangePassword: false } : user
      )
      queryClient.invalidateQueries({ queryKey: meQueryKey })
      // Hard navigation: the server guard re-reads mustChangePassword.
      window.location.assign('/admin')
    },
  })

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        className='space-y-6'
      >
        <FormField
          control={form.control}
          name='current'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('currentPassword')}</FormLabel>
              <FormControl>
                <PasswordInput autoComplete='current-password' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='next'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('newPassword')}</FormLabel>
              <FormControl>
                <PasswordInput autoComplete='new-password' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='confirm'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('confirmPassword')}</FormLabel>
              <FormControl>
                <PasswordInput autoComplete='new-password' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type='submit' disabled={mutation.isPending}>
          {mutation.isPending && <Loader2 className='animate-spin' />}
          {t('submit')}
        </Button>
      </form>
    </Form>
  )
}
