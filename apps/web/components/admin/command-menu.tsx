import React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, ChevronRight, Laptop, Moon, Sun } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useSearch } from '@/components/admin/context/search-provider'
import { useTheme } from '@/components/admin/context/theme-provider'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/admin/ui/command'
import { useSidebarData } from './layout/data/sidebar-data'
import { ScrollArea } from './ui/scroll-area'

export function CommandMenu() {
  const router = useRouter()
  const { setTheme } = useTheme()
  const { open, setOpen } = useSearch()
  const t = useTranslations('admin.command')
  const theme = useTranslations('admin.common.theme')
  const sidebarData = useSidebarData()

  const runCommand = React.useCallback(
    (command: () => unknown) => {
      setOpen(false)
      command()
    },
    [setOpen]
  )

  return (
    <CommandDialog
      modal
      open={open}
      onOpenChange={setOpen}
      title={t('title')}
      description={t('description')}
    >
      <CommandInput placeholder={t('placeholder')} />
      <CommandList>
        <ScrollArea type='hover' className='h-72 pe-1'>
          <CommandEmpty>{t('empty')}</CommandEmpty>
          {sidebarData.navGroups.map((group) => (
            <CommandGroup key={group.title} heading={group.title}>
              {group.items.map((navItem, i) => {
                if (navItem.url)
                  return (
                    <CommandItem
                      key={`${navItem.url}-${i}`}
                      value={navItem.title}
                      onSelect={() => {
                        runCommand(() => router.push(navItem.url))
                      }}
                    >
                      <div className='flex size-4 items-center justify-center'>
                        <ArrowRight className='size-2 text-muted-foreground/80' />
                      </div>
                      {navItem.title}
                    </CommandItem>
                  )

                return navItem.items?.map((subItem, i) => (
                  <CommandItem
                    key={`${navItem.title}-${subItem.url}-${i}`}
                    value={`${navItem.title}-${subItem.url}`}
                    onSelect={() => {
                      runCommand(() => router.push(subItem.url))
                    }}
                  >
                    <div className='flex size-4 items-center justify-center'>
                      <ArrowRight className='size-2 text-muted-foreground/80' />
                    </div>
                    {navItem.title} <ChevronRight /> {subItem.title}
                  </CommandItem>
                ))
              })}
            </CommandGroup>
          ))}
          <CommandSeparator />
          <CommandGroup heading={t('theme')}>
            <CommandItem onSelect={() => runCommand(() => setTheme('light'))}>
              <Sun /> <span>{theme('light')}</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => setTheme('dark'))}>
              <Moon className='scale-90' />
              <span>{theme('dark')}</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => setTheme('system'))}>
              <Laptop />
              <span>{theme('system')}</span>
            </CommandItem>
          </CommandGroup>
        </ScrollArea>
      </CommandList>
    </CommandDialog>
  )
}
