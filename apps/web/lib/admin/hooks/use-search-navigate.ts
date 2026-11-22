'use client'

import { useCallback } from 'react'
import { usePathname } from 'next/navigation'

type SearchRecord = Record<string, unknown>

export type NavigateFn = (opts: {
  search: SearchRecord | ((prev: SearchRecord) => SearchRecord)
  replace?: boolean
}) => void

/** Query string for a flat search object; empty values are dropped, `true` becomes `1`. */
export function toQueryString(search: SearchRecord) {
  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(search)) {
    if (value === undefined || value === null || value === '' || value === false)
      continue
    qs.set(key, value === true ? '1' : String(value))
  }
  return qs.toString()
}

/**
 * Update the URL's query string from the current (already parsed) search
 * object. Stays on the current path.
 */
export function useSearchNavigate(current: SearchRecord): NavigateFn {
  const pathname = usePathname()
  return useCallback(
    ({ search, replace }) => {
      const next = typeof search === 'function' ? search(current) : search
      const qs = toQueryString(next)
      const url = qs ? `${pathname}?${qs}` : pathname
      // Next syncs history.pushState/replaceState with useSearchParams, so the
      // URL changes without a server round trip.
      if (replace) window.history.replaceState(null, '', url)
      else window.history.pushState(null, '', url)
    },
    [pathname, current]
  )
}
