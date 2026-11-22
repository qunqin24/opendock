'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, Eraser, EyeOff, FolderInput, Loader2, Star, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  type BulkAction,
  type Category,
  bulkOverride,
  pluginsQueryKey,
} from '@/lib/admin/admin-api'
import { useDescribeError } from '@/lib/admin/api-errors'
import { categoryName } from '@/lib/admin/category'
import { useFormat } from '@/lib/admin/format'
import { Button } from '@/components/admin/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/admin/ui/dropdown-menu'
import { Separator } from '@/components/admin/ui/separator'
import { ConfirmDialog } from '@/components/admin/confirm-dialog'

type Props = {
  names: string[]
  categories: Category[]
  onClear: () => void
}

/** Floating bar shown while plugins are selected: one action for all of them. */
export function BulkBar({ names, categories, onClear }: Props) {
  const t = useTranslations('admin.bulk')
  const { locale, formatNumber } = useFormat()
  const describeError = useDescribeError()
  const queryClient = useQueryClient()
  const [confirm, setConfirm] = useState<'block' | 'reset' | null>(null)

  const run = useMutation({
    mutationFn: (input: { action: BulkAction; category?: string }) =>
      bulkOverride({ names, ...input }),
    onSuccess: ({ updated }, { action }) => {
      toast.success(t(`done.${action}`, { count: formatNumber(updated) }))
      setConfirm(null)
      onClear()
      queryClient.invalidateQueries({ queryKey: pluginsQueryKey })
      queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] })
    },
    onError: (error) => toast.error(describeError(error)),
  })

  if (names.length === 0) return null
  const busy = run.isPending
  const count = formatNumber(names.length)

  return (
    <>
      <div
        role='toolbar'
        aria-label={t('toolbar')}
        className='fixed inset-x-0 bottom-6 z-40 mx-auto flex w-fit max-w-[calc(100vw-2rem)] flex-wrap items-center justify-center gap-1 rounded-xl border bg-background/95 p-1.5 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80'
      >
        <span className='px-2.5 text-sm font-medium whitespace-nowrap tabular-nums'>
          {t('selected', { count })}
        </span>
        <Separator orientation='vertical' className='mx-1 h-5' />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='ghost' size='sm' disabled={busy}>
              <Star />
              {t('featured')}
              <ChevronDown className='opacity-60' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='center' side='top'>
            <DropdownMenuItem onSelect={() => run.mutate({ action: 'feature' })}>
              {t('actions.feature')}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => run.mutate({ action: 'unfeature' })}>
              {t('actions.unfeature')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='ghost' size='sm' disabled={busy}>
              <EyeOff />
              {t('blocked')}
              <ChevronDown className='opacity-60' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='center' side='top'>
            <DropdownMenuItem variant='destructive' onSelect={() => setConfirm('block')}>
              {t('actions.block')}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => run.mutate({ action: 'unblock' })}>
              {t('actions.unblock')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='ghost' size='sm' disabled={busy}>
              <FolderInput />
              {t('category')}
              <ChevronDown className='opacity-60' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='center' side='top' className='max-h-80 overflow-y-auto'>
            {categories.map((c) => (
              <DropdownMenuItem
                key={c.id}
                onSelect={() => run.mutate({ action: 'category', category: c.id })}
              >
                {categoryName(c, locale)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant='ghost' size='sm' disabled={busy} onClick={() => setConfirm('reset')}>
          <Eraser />
          {t('reset')}
        </Button>

        <Separator orientation='vertical' className='mx-1 h-5' />
        {busy ? (
          <Loader2 className='mx-2 size-4 animate-spin text-muted-foreground' aria-label={t('working')} />
        ) : (
          <Button variant='ghost' size='icon' className='size-8' onClick={onClear} aria-label={t('clear')}>
            <X />
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={confirm === 'block' ? t('confirmBlock.title', { count }) : t('confirmReset.title', { count })}
        desc={confirm === 'block' ? t('confirmBlock.desc') : t('confirmReset.desc')}
        confirmText={confirm === 'block' ? t('actions.block') : t('reset')}
        destructive
        isLoading={busy}
        handleConfirm={() => confirm && run.mutate({ action: confirm })}
      />
    </>
  )
}
