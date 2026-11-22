import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  type AdminPlugin,
  categoriesQueryOptions,
  deleteOverride,
  pluginsQueryKey,
  saveOverride,
} from '@/lib/admin-api'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'

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
  return (
    <div className='space-y-2'>
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={(v) => onChange(v as Tri)}>
        <SelectTrigger id={id} className='w-full'>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='data'>Use data</SelectItem>
          <SelectItem value='on'>Force on</SelectItem>
          <SelectItem value='off'>Force off</SelectItem>
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
    onSuccess: () => done('Override saved.'),
  })

  const remove = useMutation({
    mutationFn: () => deleteOverride(plugin!.name),
    onSuccess: () => done('Override removed.'),
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
            <Label htmlFor='override-category'>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id='override-category' className='w-full'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={USE_DATA}>Use data</SelectItem>
                {categories?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <TriSelect
            id='override-featured'
            label='Featured'
            value={featured}
            onChange={setFeatured}
          />
          <TriSelect
            id='override-blocked'
            label='Blocked (hidden on the public site)'
            value={blocked}
            onChange={setBlocked}
          />

          <div className='space-y-2'>
            <Label htmlFor='override-note'>Note</Label>
            <Textarea
              id='override-note'
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder='Why this override exists'
              rows={4}
            />
          </div>

          {plugin?.override && (
            <p className='text-xs text-muted-foreground'>
              Last updated {new Date(plugin.override.updatedAt).toLocaleString()}{' '}
              by {plugin.override.updatedBy}.
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
              Remove override
            </Button>
          ) : (
            <span />
          )}
          <Button disabled={busy} onClick={() => save.mutate()}>
            {save.isPending && <Loader2 className='animate-spin' />}
            Save
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
