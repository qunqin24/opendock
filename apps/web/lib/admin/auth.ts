import { queryOptions } from '@tanstack/react-query'
import { api } from '@/lib/admin/api'

export type AuthUser = {
  id: string
  username: string
  role: 'admin'
  mustChangePassword: boolean
  createdAt: string
  lastLoginAt: string | null
}

export const meQueryKey = ['auth', 'me'] as const

/** The current session. A 401 is handled by the route guard, not globally. */
export const meQueryOptions = queryOptions({
  queryKey: meQueryKey,
  queryFn: async () =>
    (await api<{ user: AuthUser }>('/api/auth/me', { skipUnauthorized: true }))
      .user,
  staleTime: 60 * 1000,
  retry: false,
})

export async function login(username: string, password: string) {
  const res = await api<{ user: AuthUser }>('/api/auth/login', {
    method: 'POST',
    body: { username, password },
    skipUnauthorized: true,
  })
  return res.user
}

export function logout() {
  return api('/api/auth/logout', { method: 'POST', skipUnauthorized: true })
}

export function changePassword(current: string, next: string) {
  return api('/api/auth/password', {
    method: 'POST',
    body: { current, next },
  })
}
