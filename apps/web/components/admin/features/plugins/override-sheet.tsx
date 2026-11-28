import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import {
  type AdminPlugin,
  categoriesQueryOptions,
  deleteOverride,
  pluginsQueryKey,
  saveOverride,
} from '@/lib/admin/admin-api'
import { categoryName } from '@/lib/admin/category'
import { useFormat } from '@/lib/admin/format'
import { Button } from '@/components/admin/ui/button'
import { Label } from '@/components/admin/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/admin/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/admin/ui/sheet'
import { Textarea } from '@/components/admin/ui/textarea'

const USE_DATA = '__data__'

type Tri = 'data' | 'on' | 'off'

const toTri = (v: boolean | null | undefined): Tri =>
  v === true ? 'on' : v === false ? 'off' : 'data'
const fromTri = (v: Tri): boolean | null =>
  v === 'on' ? true : v === 'off' ? false : null

function TriSelect({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: Tri
  onChange: (v: Tri) => void
}) {
  const t = useTranslations('admin.override')
  return (
    <div className='space-y-2'>
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={(v) => onChange(v as Tri)}>
        <SelectTrigger id={id} className='w-full'>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='data'>{t('useData')}</SelectItem>
          <SelectItem value='on'>{t('forceOn')}</SelectItem>
          <SelectItem value='off'>{t('forceOff')}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}

type Props = {
  plugin: AdminPlugin | null
  onOpenChange: (open: boolean) => void
}

export function OverrideSheet({ plugin, onOpenChange }: Props) {
  const queryClient = useQueryClient()
  const t = useTranslations('admin.override')
  const { locale, dateTime } = useFormat()
  const { data: categories } = useQuery(categoriesQueryOptions)

  const [category, setCategory] = useState(USE_DATA)
  const [featured, setFeatured] = useState<Tri>('data')
  const [blocked, setBlocked] = useState<Tri>('data')
  const [note, setNote] = useState('')

  // Reset the form whenever a different plugin is opened.
  useEffect(() => {
    if (!plugin) return
    setCategory(plugin.override?.category ?? USE_DATA)
    setFeatured(toTri(plugin.override?.featured))
    setBlocked(toTri(plugin.override?.blocked))
    setNote(plugin.override?.note ?? '')
  }, [plugin])

  const done = (message: string) => {
    toast.success(message)
    queryClient.invalidateQueries({ queryKey: pluginsQueryKey })
    queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] })
    onOpenChange(false)
  }

  const save = useMutation({
    mutationFn: () =>
      saveOverride({
        name: plugin!.name,
        category: category === USE_DATA ? null : category,
        featured: fromTri(featured),
        blocked: fromTri(blocked),
        note,
      }),
    onSuccess: () => done(t('saved')),
  })

  const remove = useMutation({
    mutationFn: () => deleteOverride(plugin!.name),
    onSuccess: () => done(t('removed')),
  })

  const busy = save.isPending || remove.isPending

  return (
    <Sheet open={!!plugin} onOpenChange={onOpenChange}>
      <SheetContent className='flex flex-col gap-0 sm:max-w-md'>
        <SheetHeader className='text-start'>
          <SheetTitle>{plugin?.title}</SheetTitle>
          <SheetDescription className='font-mono text-xs'>
            {plugin?.name}
          </SheetDescription>
        </SheetHeader>

        <div className='flex-1 space-y-5 overflow-y-auto px-4 pb-4'>
          <div className='space-y-2'>
            <Label htmlFor='override-category'>{t('category')}</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id='override-category' className='w-full'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={USE_DATA}>{t('useData')}</SelectItem>
                {categories?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {categoryName(c, locale)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <TriSelect
            id='override-featured'
            label={t('featured')}
            value={featured}
            onChange={setFeatured}
          />
          <TriSelect
            id='override-blocked'
            label={t('blocked')}
            value={blocked}
            onChange={setBlocked}
          />

          <div className='space-y-2'>
            <Label htmlFor='override-note'>{t('note')}</Label>
            <Textarea
              id='override-note'
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('notePlaceholder')}
              rows={4}
            />
          </div>

          {plugin?.override && (
            <p className='text-xs text-muted-foreground'>
              {t('lastUpdated', {
                when: dateTime(plugin.override.updatedAt),
                by: plugin.override.updatedBy,
              })}
            </p>
          )}
        </div>

        <SheetFooter className='flex-row justify-between gap-2 border-t'>
          {plugin?.override ? (
            <Button
              variant='outline'
              disabled={busy}
              onClick={() => remove.mutate()}
            >
              {remove.isPending && <Loader2 className='animate-spin' />}
              {t('remove')}
            </Button>
          ) : (
            <span />
          )}
          <Button disabled={busy} onClick={() => save.mutate()}>
            {save.isPending && <Loader2 className='animate-spin' />}
            {t('save')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
