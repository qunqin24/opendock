'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useQuery } from '@tanstack/react-query'
import {
  type ColumnFiltersState,
  type OnChangeFn,
  type RowSelectionState,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  type AdminPlugin,
  type PluginSort,
  categoriesQueryOptions,
  pluginsQueryOptions,
} from '@/lib/admin/admin-api'
import { categoryName } from '@/lib/admin/category'
import { useFormat } from '@/lib/admin/format'
import { cn } from '@/lib/admin/utils'
import { useSearchNavigate } from '@/lib/admin/hooks/use-search-navigate'
import { useTableUrlState } from '@/lib/admin/hooks/use-table-url-state'
import { Label } from '@/components/admin/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/admin/ui/select'
import { Skeleton } from '@/components/admin/ui/skeleton'
import { Switch } from '@/components/admin/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/admin/ui/table'
import { DataTablePagination, DataTableToolbar } from '@/components/admin/data-table'
import { Main } from '@/components/admin/layout/main'
import { PageHeader } from '@/components/admin/page-header'
import { QueryError } from '@/components/admin/query-state'
import { useColumns, useHealthOptions } from './columns'
import { BulkBar } from './bulk-bar'
import { OverrideSheet } from './override-sheet'
import { parsePluginsSearch, type PluginsSearch } from './search'

const DEFAULT_PAGE_SIZE = 20

const SORT_VALUES: PluginSort[] = ['score', 'downloads', 'stars', 'updated']

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
  const t = useTranslations('admin.plugins')
  const { locale, formatNumber } = useFormat()
  const healthOptions = useHealthOptions()
  const searchParams = useSearchParams()
  const search = useMemo(
    () => parsePluginsSearch(new URLSearchParams(searchParams.toString())),
    [searchParams]
  )
  const navigate = useSearchNavigate(search)
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
    navigate,
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
      search: (prev) => {
        const p = prev as PluginsSearch
        return {
          ...p,
          page: undefined,
          category: pick('category', p.category),
          health: pick('healthLevel', p.health) as PluginsSearch['health'],
        }
      },
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

  // Selection is keyed by package name, so it survives paging; a new query
  // (search, filters, sort) starts a fresh selection.
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const queryKey = JSON.stringify([params.q, params.category, params.health, params.overridden, params.sort])
  useEffect(() => setRowSelection({}), [queryKey])
  const selectedNames = useMemo(
    () => Object.keys(rowSelection).filter((k) => rowSelection[k]),
    [rowSelection]
  )

  const columns = useColumns(setEditing)
  const pageCount = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : -1

  const table = useReactTable({
    data: data?.items ?? [],
    columns,
    pageCount,
    state: { pagination, globalFilter, columnFilters, rowSelection },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
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
    label: categoryName(c, locale),
    value: c.id,
  }))

  return (
    <>
      <PageHeader />
      <Main
        className={cn(
          'flex flex-1 flex-col gap-4 sm:gap-6',
          // Keep the last rows and pagination clear of the bulk bar.
          selectedNames.length > 0 && 'pb-24'
        )}
      >
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>{t('title')}</h1>
            <p className='text-muted-foreground'>
              {t('description')}
              {data && ` ${t('matching', { count: formatNumber(data.total) })}`}
            </p>
          </div>
        </div>

        <div className='flex flex-1 flex-col gap-4'>
          <DataTableToolbar
            table={table}
            searchPlaceholder={t('searchPlaceholder')}
            filters={[
              { columnId: 'category', title: t('category'), options: categoryOptions },
              { columnId: 'healthLevel', title: t('health'), options: healthOptions },
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
              <Label htmlFor='overridden-only' className='text-sm font-normal whitespace-nowrap'>
                {t('overriddenOnly')}
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
              <SelectTrigger size='sm' className='h-8 w-44' aria-label={t('sortBy')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_VALUES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {t('sortLabel', { option: t(`sort.${value}`) })}
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
                    <TableRow key={row.id} data-state={row.getIsSelected() ? 'selected' : undefined}>
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
                      {isError ? t('loadFailed') : t('empty')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <DataTablePagination table={table} className='mt-auto' />
        </div>
      </Main>

      <BulkBar
        names={selectedNames}
        categories={categories ?? []}
        onClear={() => setRowSelection({})}
      />

      <OverrideSheet
        plugin={editing}
        onOpenChange={(open) => {
          if (!open) setEditing(null)
        }}
      />
    </>
  )
}
