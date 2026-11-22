import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { changePassword, meQueryKey, type AuthUser } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { PasswordInput } from '@/components/password-input'

const formSchema = z
  .object({
    current: z.string().min(1, 'Please enter your current password.'),
    next: z.string().min(10, 'New password must be at least 10 characters.'),
    confirm: z.string().min(1, 'Please confirm the new password.'),
  })
  .refine((v) => v.next === v.confirm, {
    message: 'Passwords do not match.',
    path: ['confirm'],
  })

type FormValues = z.infer<typeof formSchema>

export function AccountForm() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { current: '', next: '', confirm: '' },
  })

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      changePassword(values.current, values.next),
    onSuccess: () => {
      toast.success('Password updated.')
      form.reset()
      // Clear the "must change password" flag locally so the guard lets go.
      queryClient.setQueryData<AuthUser>(meQueryKey, (user) =>
        user ? { ...user, mustChangePassword: false } : user
      )
      queryClient.invalidateQueries({ queryKey: meQueryKey })
      navigate({ to: '/' })
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
              <FormLabel>Current password</FormLabel>
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
              <FormLabel>New password</FormLabel>
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
              <FormLabel>Confirm new password</FormLabel>
              <FormControl>
                <PasswordInput autoComplete='new-password' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type='submit' disabled={mutation.isPending}>
          {mutation.isPending && <Loader2 className='animate-spin' />}
          Update password
        </Button>
      </form>
    </Form>
  )
}
