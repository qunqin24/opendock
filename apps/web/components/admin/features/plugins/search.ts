import { type HealthLevel, type PluginSort } from '@/lib/admin/admin-api'

/** URL state of the plugins table (`/admin/plugins?q=&category=&…`). */
export type PluginsSearch = {
  q?: string
  category?: string
  health?: HealthLevel
  overridden?: boolean
  sort?: PluginSort
  page?: number
  pageSize?: number
}

const HEALTH: HealthLevel[] = ['ok', 'warn', 'danger']
const SORTS: PluginSort[] = ['score', 'downloads', 'stars', 'updated']

function int(value: string | null, min: number, max = Infinity) {
  if (value === null) return undefined
  const n = Number(value)
  return Number.isInteger(n) && n >= min && n <= max ? n : undefined
}

/** Lenient parse: anything invalid is treated as absent. */
export function parsePluginsSearch(sp: URLSearchParams): PluginsSearch {
  const health = sp.get('health') as HealthLevel | null
  const sort = sp.get('sort') as PluginSort | null
  const overridden = sp.get('overridden')
  return {
    q: sp.get('q') || undefined,
    category: sp.get('category') || undefined,
    health: health && HEALTH.includes(health) ? health : undefined,
    overridden:
      overridden === '1' || overridden === 'true' ? true : undefined,
    sort: sort && SORTS.includes(sort) ? sort : undefined,
    page: int(sp.get('page'), 1),
    pageSize: int(sp.get('pageSize'), 1, 100),
  }
}
