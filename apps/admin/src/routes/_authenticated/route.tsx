import { createFileRoute, redirect } from '@tanstack/react-router'
import { ApiError } from '@/lib/api'
import { meQueryOptions } from '@/lib/auth'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ context, location }) => {
    let user
    try {
      user = await context.queryClient.ensureQueryData(meQueryOptions)
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        throw redirect({
          to: '/sign-in',
          search: { redirect: location.href },
          replace: true,
        })
      }
      throw error
    }
    // Force the password change before anything else.
    if (
      user.mustChangePassword &&
      !location.pathname.startsWith('/settings/account')
    ) {
      throw redirect({ to: '/settings/account', replace: true })
    }
    return { user }
  },
  component: AuthenticatedLayout,
})
