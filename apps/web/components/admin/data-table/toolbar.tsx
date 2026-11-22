import type * as React from 'react'
import { Cross2Icon } from '@radix-ui/react-icons'
import { type Table } from '@tanstack/react-table'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/admin/ui/button'
import { Input } from '@/components/admin/ui/input'
import { DataTableFacetedFilter } from './faceted-filter'
import { DataTableViewOptions } from './view-options'

type DataTableToolbarProps<TData> = {
  table: Table<TData>
  searchPlaceholder?: string
  searchKey?: string
  filters?: {
    columnId: string
    title: string
    options: {
      label: string
      value: string
      icon?: React.ComponentType<{ className?: string }>
    }[]
  }[]
  /** Extra controls rendered after the faceted filters. */
  children?: React.ReactNode
  /** Treat the toolbar as filtered even when no table filter is set. */
  extraFiltered?: boolean
  /** Called when "Reset" is clicked, after table filters are cleared. */
  onReset?: () => void
}

export function DataTableToolbar<TData>({
  table,
  searchPlaceholder,
  searchKey,
  filters = [],
  children,
  extraFiltered = false,
  onReset,
}: DataTableToolbarProps<TData>) {
  const t = useTranslations('admin.table')
  const placeholder = searchPlaceholder ?? t('filterPlaceholder')
  const isFiltered =
    table.getState().columnFilters.length > 0 ||
    !!table.getState().globalFilter ||
    extraFiltered

  return (
    <div className='flex items-center justify-between'>
      <div className='flex flex-1 flex-col-reverse items-start gap-y-2 sm:flex-row sm:items-center sm:space-x-2'>
        {searchKey ? (
          <Input
            placeholder={placeholder}
            value={
              (table.getColumn(searchKey)?.getFilterValue() as string) ?? ''
            }
            onChange={(event) =>
              table.getColumn(searchKey)?.setFilterValue(event.target.value)
            }
            className='h-8 w-37.5 lg:w-62.5'
          />
        ) : (
          <Input
            placeholder={placeholder}
            value={table.getState().globalFilter ?? ''}
            onChange={(event) => table.setGlobalFilter(event.target.value)}
            className='h-8 w-37.5 lg:w-62.5'
          />
        )}
        <div className='flex flex-wrap gap-x-2 gap-y-2'>
          {filters.map((filter) => {
            const column = table.getColumn(filter.columnId)
            if (!column) return null
            return (
              <DataTableFacetedFilter
                key={filter.columnId}
                column={column}
                title={filter.title}
                options={filter.options}
              />
            )
          })}
          {children}
        </div>
        {isFiltered && (
          <Button
            variant='ghost'
            onClick={() => {
              table.resetColumnFilters()
              table.setGlobalFilter('')
              onReset?.()
            }}
            className='h-8 px-2 lg:px-3'
          >
            {t('reset')}
            <Cross2Icon className='ms-2 h-4 w-4' />
          </Button>
        )}
      </div>
      <DataTableViewOptions table={table} />
    </div>
  )
}
