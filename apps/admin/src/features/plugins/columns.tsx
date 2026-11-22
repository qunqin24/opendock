import { type ColumnDef } from '@tanstack/react-table'
import { ExternalLink, Pencil } from 'lucide-react'
import { type AdminPlugin, publicPluginUrl } from '@/lib/admin-api'
import { formatNumber } from '@/lib/format'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTableColumnHeader } from '@/components/data-table'

export const healthOptions = [
  { label: 'Healthy', value: 'ok' },
  { label: 'Warning', value: 'warn' },
  { label: 'At risk', value: 'danger' },
]

const healthStyle = {
  ok: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  warn: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  danger: 'bg-red-500/15 text-red-700 dark:text-red-400',
} as const

export function getColumns(
  onEdit: (plugin: AdminPlugin) => void
): ColumnDef<AdminPlugin>[] {
  return [
    {
      id: 'title',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Plugin' />
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
        <DataTableColumnHeader column={column} title='Category' />
      ),
      enableSorting: false,
      cell: ({ row }) => (
        <span className='whitespace-nowrap'>{row.original.categoryLabel}</span>
      ),
    },
    {
      id: 'downloads',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Downloads/mo' />
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
        <DataTableColumnHeader column={column} title='Stars' />
      ),
      enableSorting: false,
      cell: ({ row }) => (
        <span className='tabular-nums'>{formatNumber(row.original.stars)}</span>
      ),
    },
    {
      id: 'score',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Score' />
      ),
      enableSorting: false,
      cell: ({ row }) => (
        <span className='tabular-nums'>{row.original.score.toFixed(1)}</span>
      ),
    },
    {
      id: 'healthLevel',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Health' />
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
      header: 'Flags',
      enableSorting: false,
      cell: ({ row }) => {
        const p = row.original
        return (
          <div className='flex flex-wrap gap-1'>
            {p.featured && <Badge>Featured</Badge>}
            {p.blocked && <Badge variant='destructive'>Blocked</Badge>}
            {p.override && <Badge variant='outline'>Overridden</Badge>}
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
          Edit
        </Button>
      ),
    },
  ]
}
