import { queryOptions } from '@tanstack/react-query'
import { api } from '@/lib/admin/api'

export type HealthLevel = 'ok' | 'warn' | 'danger'
export type OpencodeCompat = 'v1' | 'v2' | 'both' | 'unknown'

export type PluginRef = { name: string; slug: string; title: string }

export type Overview = {
  dataRefreshedAt: string | null
  totals: {
    plugins: number
    downloadsMonth: number
    stars: number
    maintainers: number
  }
  health: Record<HealthLevel, number>
  compat: Record<OpencodeCompat, number>
  categories: { id: string; label: string; labelZh?: string; count: number }[]
  topDownloads: (PluginRef & { downloadsMonth: number })[]
  trending: (PluginRef & { starsDelta7d: number })[]
  overrides: {
    total: number
    blocked: number
    featured: number
    recategorized: number
  }
  installs: { last30d: number; last7d: number }
}

export type PluginOverride = {
  category: string | null
  featured: boolean | null
  blocked: boolean | null
  note: string
  updatedAt: string
  updatedBy: string
}

export type AdminPlugin = PluginRef & {
  owner: string
  description: string
  category: string
  categoryLabel: string
  categoryLabelZh?: string | null
  downloadsMonth: number
  stars: number
  score: number
  healthLevel: HealthLevel
  opencode: OpencodeCompat
  pushedAt: string | null
  featured: boolean
  blocked: boolean
  override: PluginOverride | null
}

export type PluginsResponse = {
  total: number
  page: number
  pageSize: number
  items: AdminPlugin[]
}

export type PluginSort = 'score' | 'downloads' | 'stars' | 'updated'

export type PluginsParams = {
  q?: string
  category?: string
  health?: HealthLevel
  overridden?: boolean
  sort?: PluginSort
  page: number
  pageSize: number
}

export type Category = { id: string; label: string; labelZh?: string }

export type OverrideInput = {
  name: string
  category?: string | null
  featured?: boolean | null
  blocked?: boolean | null
  note?: string
}

export type InstallsResponse = {
  days: number
  total: number
  byDay: { day: string; install: number; update: number; uninstall: number }[]
  topPlugins: { name: string; installs: number; uninstalls: number }[]
  byOpencodeVersion: { version: string; count: number }[]
}

export const overviewQueryOptions = queryOptions({
  queryKey: ['admin', 'overview'],
  queryFn: () => api<Overview>('/api/admin/overview'),
})

export const categoriesQueryOptions = queryOptions({
  queryKey: ['admin', 'categories'],
  queryFn: () => api<Category[]>('/api/admin/categories'),
  staleTime: 5 * 60 * 1000,
})

export const pluginsQueryKey = ['admin', 'plugins'] as const

export function pluginsQueryOptions(params: PluginsParams) {
  return queryOptions({
    queryKey: [...pluginsQueryKey, params],
    queryFn: () => {
      const qs = new URLSearchParams()
      if (params.q) qs.set('q', params.q)
      if (params.category) qs.set('category', params.category)
      if (params.health) qs.set('health', params.health)
      if (params.overridden) qs.set('overridden', '1')
      if (params.sort) qs.set('sort', params.sort)
      qs.set('page', String(params.page))
      qs.set('pageSize', String(params.pageSize))
      return api<PluginsResponse>(`/api/admin/plugins?${qs}`)
    },
    // Keep the previous page on screen while the next one loads.
    placeholderData: (prev) => prev,
  })
}

export function installsQueryOptions(days: number) {
  return queryOptions({
    queryKey: ['admin', 'installs', days],
    queryFn: () => api<InstallsResponse>(`/api/admin/installs?days=${days}`),
  })
}

export function saveOverride(input: OverrideInput) {
  return api<{ override: PluginOverride }>('/api/admin/overrides', {
    method: 'PUT',
    body: input,
  })
}

export function deleteOverride(name: string) {
  return api(`/api/admin/overrides?name=${encodeURIComponent(name)}`, {
    method: 'DELETE',
  })
}

/** Public site page for a plugin (served by apps/web outside /admin). */
export function publicPluginUrl(slug: string) {
  return `/plugins/${encodeURIComponent(slug)}`
}

export type BulkAction =
  | 'feature'
  | 'unfeature'
  | 'block'
  | 'unblock'
  | 'category'
  | 'reset'

/** Applies one curation action to many plugins (at most 500). */
export function bulkOverride(input: {
  names: string[]
  action: BulkAction
  category?: string
}) {
  return api<{ updated: number }>('/api/admin/overrides/bulk', {
    method: 'POST',
    body: input,
  })
}
