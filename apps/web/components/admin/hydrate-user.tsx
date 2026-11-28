'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { type AuthUser, meQueryKey } from '@/lib/admin/auth'

/** Seeds the `me` query with the user the server already resolved. */
export function HydrateUser({ user }: { user: AuthUser }) {
  const queryClient = useQueryClient()
  useState(() => {
    queryClient.setQueryData(meQueryKey, user)
  })
  return null
}
