import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  type ColumnFiltersState,
  type OnChangeFn,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { getRouteApi } from '@tanstack/react-router'
import {
  type AdminPlugin,
  type PluginSort,
  categoriesQueryOptions,
  pluginsQueryOptions,
} from '@/lib/admin-api'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useTableUrlState } from '@/hooks/use-table-url-state'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DataTablePagination, DataTableToolbar } from '@/components/data-table'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/page-header'
import { QueryError } from '@/components/query-state'
import { getColumns, healthOptions } from './columns'
import { OverrideSheet } from './override-sheet'

const route = getRouteApi('/_authenticated/plugins/')

const DEFAULT_PAGE_SIZE = 20

const sortOptions: { label: string; value: PluginSort }[] = [
  { label: 'Score', value: 'score' },
  { label: 'Downloads', value: 'downloads' },
  { label: 'Stars', value: 'stars' },
  { label: 'Recently updated', value: 'updated' },
]

/** Debounce a fast-changing value (the search box) before it hits the API. */
function useDebounced<T>(value: T, ms = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(id)
  }, [value, ms])
  return debounced
}

export function Plugins() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const [editing, setEditing] = useState<AdminPlugin | null>(null)

  const { data: categories } = useQuery(categoriesQueryOptions)

  // Search box and pagination live in the URL through the template hook.
  const {
    globalFilter,
    onGlobalFilterChange,
    pagination,
    onPaginationChange,
    ensurePageInRange,
  } = useTableUrlState({
    search,
    navigate: navigate as never,
    pagination: { defaultPage: 1, defaultPageSize: DEFAULT_PAGE_SIZE },
    globalFilter: { enabled: true, key: 'q' },
  })

  // Category and health are single-select filters mirrored from the URL.
  const columnFilters: ColumnFiltersState = useMemo(() => {
    const out: ColumnFiltersState = []
    if (search.category) out.push({ id: 'category', value: [search.category] })
    if (search.health) out.push({ id: 'healthLevel', value: [search.health] })
    return out
  }, [search.category, search.health])

  const onColumnFiltersChange: OnChangeFn<ColumnFiltersState> = (updater) => {
    const next = typeof updater === 'function' ? updater(columnFilters) : updater
    // The API takes one value per filter: keep the most recently added one.
    const pick = (id: string, prev?: string) => {
      const values = (next.find((f) => f.id === id)?.value ?? []) as string[]
      return values.find((v) => v !== prev) ?? values[0]
    }
    navigate({
      search: (prev) => ({
        ...prev,
        page: undefined,
        category: pick('category', prev.category),
        health: pick('healthLevel', prev.health) as typeof prev.health,
      }),
    })
  }

  const q = useDebounced((globalFilter ?? '').trim())
  const params = {
    q: q || undefined,
    category: search.category,
    health: search.health,
    overridden: search.overridden,
    sort: search.sort ?? ('score' as const),
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
  }
  const { data, error, isError, isPending, isFetching, refetch } = useQuery(
    pluginsQueryOptions(params)
  )

  const columns = useMemo(() => getColumns(setEditing), [])
  const pageCount = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : -1

  const table = useReactTable({
    data: data?.items ?? [],
    columns,
    pageCount,
    state: { pagination, globalFilter, columnFilters },
    manualPagination: true,
    manualFiltering: true,
    manualSorting: true,
    getRowId: (row) => row.name,
    onPaginationChange,
    onGlobalFilterChange,
    onColumnFiltersChange,
    getCoreRowModel: getCoreRowModel(),
  })

  useEffect(() => {
    if (pageCount > 0) ensurePageInRange(pageCount)
  }, [pageCount, ensurePageInRange])

  const categoryOptions = (categories ?? []).map((c) => ({
    label: c.label,
    value: c.id,
  }))

  return (
    <>
      <PageHeader />
      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>Plugins</h1>
            <p className='text-muted-foreground'>
              Curate the directory: recategorize, feature or block plugins.
              {data && ` ${formatNumber(data.total)} matching.`}
            </p>
          </div>
        </div>

        <div className='flex flex-1 flex-col gap-4'>
          <DataTableToolbar
            table={table}
            searchPlaceholder='Search plugins...'
            filters={[
              { columnId: 'category', title: 'Category', options: categoryOptions },
              { columnId: 'healthLevel', title: 'Health', options: healthOptions },
            ]}
            extraFiltered={!!search.overridden}
            onReset={() =>
              navigate({
                search: (prev) => ({ ...prev, overridden: undefined, page: undefined }),
              })
            }
          >
            <div className='flex h-8 items-center gap-2 rounded-md border px-2'>
              <Switch
                id='overridden-only'
                checked={!!search.overridden}
                onCheckedChange={(checked) =>
                  navigate({
                    search: (prev) => ({
                      ...prev,
                      overridden: checked || undefined,
                      page: undefined,
                    }),
                  })
                }
              />
              <Label htmlFor='overridden-only' className='text-sm font-normal'>
                Overridden only
              </Label>
            </div>
            <Select
              value={search.sort ?? 'score'}
              onValueChange={(v) =>
                navigate({
                  search: (prev) => ({
                    ...prev,
                    sort: v === 'score' ? undefined : (v as PluginSort),
                    page: undefined,
                  }),
                })
              }
            >
              <SelectTrigger size='sm' className='h-8 w-44' aria-label='Sort by'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    Sort: {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </DataTableToolbar>

          {isError && <QueryError error={error} onRetry={() => refetch()} />}

          <div
            className={cn(
              'overflow-hidden rounded-md border transition-opacity',
              isFetching && !isPending && 'opacity-60'
            )}
          >
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id}>
                    {hg.headers.map((header) => (
                      <TableHead key={header.id} colSpan={header.colSpan}>
                        {header.isPlaceholder
                          ? null
                          : typeof header.column.columnDef.header === 'function'
                            ? header.column.columnDef.header(header.getContext())
                            : header.column.columnDef.header}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {isPending && !isError ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={columns.length}>
                        <Skeleton className='h-6 w-full' />
                      </TableCell>
                    </TableRow>
                  ))
                ) : table.getRowModel().rows.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {typeof cell.column.columnDef.cell === 'function'
                            ? cell.column.columnDef.cell(cell.getContext())
                            : null}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className='h-24 text-center text-muted-foreground'
                    >
                      {isError ? 'Unable to load plugins.' : 'No plugins match these filters.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <DataTablePagination table={table} className='mt-auto' />
        </div>
      </Main>

      <OverrideSheet
        plugin={editing}
        onOpenChange={(open) => {
          if (!open) setEditing(null)
        }}
      />
    </>
  )
}
