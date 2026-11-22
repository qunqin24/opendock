import { useMemo } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { ExternalLink, Pencil } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { type AdminPlugin, publicPluginUrl } from '@/lib/admin/admin-api'
import { categoryName } from '@/lib/admin/category'
import { useFormat } from '@/lib/admin/format'
import { Badge } from '@/components/admin/ui/badge'
import { Button } from '@/components/admin/ui/button'
import { Checkbox } from '@/components/admin/ui/checkbox'
import { DataTableColumnHeader } from '@/components/admin/data-table'

export function useHealthOptions() {
  const t = useTranslations('admin.health')
  return useMemo(
    () => [
      { label: t('ok'), value: 'ok' },
      { label: t('warn'), value: 'warn' },
      { label: t('danger'), value: 'danger' },
    ],
    [t]
  )
}

const healthStyle = {
  ok: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  warn: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  danger: 'bg-red-500/15 text-red-700 dark:text-red-400',
} as const

export function useColumns(
  onEdit: (plugin: AdminPlugin) => void
): ColumnDef<AdminPlugin>[] {
  const t = useTranslations('admin.plugins')
  const { locale, formatNumber } = useFormat()
  const healthOptions = useHealthOptions()
  return useMemo<ColumnDef<AdminPlugin>[]>(() => [
    {
      id: 'select',
      enableSorting: false,
      enableHiding: false,
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected()
              ? true
              : table.getIsSomePageRowsSelected()
                ? 'indeterminate'
                : false
          }
          onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
          aria-label={t('selectPage')}
          className='translate-y-[2px]'
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(v) => row.toggleSelected(!!v)}
          aria-label={t('selectRow', { name: row.original.title })}
          className='translate-y-[2px]'
        />
      ),
    },
    {
      id: 'title',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('columns.title')} />
      ),
      enableSorting: false,
      cell: ({ row }) => {
        const p = row.original
        return (
          <div className='flex min-w-0 max-w-72 flex-col'>
            <a
              href={publicPluginUrl(p.slug)}
              target='_blank'
              rel='noreferrer'
              className='inline-flex items-center gap-1 truncate font-medium hover:underline'
            >
              <span className='truncate'>{p.title}</span>
              <ExternalLink className='size-3 shrink-0 text-muted-foreground' />
            </a>
            <span className='truncate font-mono text-xs text-muted-foreground'>
              {p.name}
            </span>
          </div>
        )
      },
    },
    {
      id: 'category',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('columns.category')} />
      ),
      enableSorting: false,
      cell: ({ row }) => (
        <span className='whitespace-nowrap'>
          {categoryName(
            {
              label: row.original.categoryLabel,
              labelZh: row.original.categoryLabelZh ?? undefined,
            },
            locale
          )}
        </span>
      ),
    },
    {
      id: 'downloads',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('columns.downloads')} />
      ),
      enableSorting: false,
      cell: ({ row }) => (
        <span className='tabular-nums'>
          {formatNumber(row.original.downloadsMonth)}
        </span>
      ),
    },
    {
      id: 'stars',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('columns.stars')} />
      ),
      enableSorting: false,
      cell: ({ row }) => (
        <span className='tabular-nums'>{formatNumber(row.original.stars)}</span>
      ),
    },
    {
      id: 'score',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('columns.score')} />
      ),
      enableSorting: false,
      cell: ({ row }) => (
        <span className='tabular-nums'>{row.original.score.toFixed(1)}</span>
      ),
    },
    {
      id: 'healthLevel',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('columns.healthLevel')} />
      ),
      enableSorting: false,
      cell: ({ row }) => {
        const level = row.original.healthLevel
        return (
          <Badge variant='secondary' className={healthStyle[level]}>
            {healthOptions.find((o) => o.value === level)?.label ?? level}
          </Badge>
        )
      },
    },
    {
      id: 'flags',
      header: t('columns.flags'),
      enableSorting: false,
      cell: ({ row }) => {
        const p = row.original
        return (
          <div className='flex flex-wrap gap-1'>
            {p.featured && <Badge>{t('flags.featured')}</Badge>}
            {p.blocked && <Badge variant='destructive'>{t('flags.blocked')}</Badge>}
            {p.override && <Badge variant='outline'>{t('flags.overridden')}</Badge>}
          </div>
        )
      },
    },
    {
      id: 'actions',
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => (
        <Button
          variant='ghost'
          size='sm'
          className='h-8'
          onClick={() => onEdit(row.original)}
        >
          <Pencil className='size-3.5' />
          {t('edit')}
        </Button>
      ),
    },
  ], [t, locale, formatNumber, healthOptions, onEdit])
}
