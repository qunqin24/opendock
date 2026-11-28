'use client'

import type * as React from 'react'
import { type SVGProps } from 'react'
import { Root as Radio, Item } from '@radix-ui/react-radio-group'
import { CircleCheck, RotateCcw, Settings } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { IconLayoutCompact } from '@/components/admin/assets/custom/icon-layout-compact'
import { IconLayoutDefault } from '@/components/admin/assets/custom/icon-layout-default'
import { IconLayoutFull } from '@/components/admin/assets/custom/icon-layout-full'
import { IconSidebarFloating } from '@/components/admin/assets/custom/icon-sidebar-floating'
import { IconSidebarInset } from '@/components/admin/assets/custom/icon-sidebar-inset'
import { IconSidebarSidebar } from '@/components/admin/assets/custom/icon-sidebar-sidebar'
import { IconThemeDark } from '@/components/admin/assets/custom/icon-theme-dark'
import { IconThemeLight } from '@/components/admin/assets/custom/icon-theme-light'
import { IconThemeSystem } from '@/components/admin/assets/custom/icon-theme-system'
import { cn } from '@/lib/admin/utils'
import { type Collapsible, useLayout } from '@/components/admin/context/layout-provider'
import { useTheme } from '@/components/admin/context/theme-provider'
import { Button } from '@/components/admin/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/admin/ui/sheet'
import { useSidebar } from './ui/sidebar'

export function ConfigDrawer() {
  const t = useTranslations('admin.config')
  const header = useTranslations('admin.header')
  const { setOpen } = useSidebar()
  const { resetTheme } = useTheme()
  const { resetLayout } = useLayout()

  const handleReset = () => {
    setOpen(true)
    resetTheme()
    resetLayout()
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          size='icon'
          variant='ghost'
          aria-label={header('openThemeSettings')}
          className='rounded-full'
        >
          <Settings aria-hidden='true' />
        </Button>
      </SheetTrigger>
      <SheetContent className='flex flex-col'>
        <SheetHeader className='pb-0 text-start'>
          <SheetTitle>{t('title')}</SheetTitle>
          <SheetDescription>{t('description')}</SheetDescription>
        </SheetHeader>
        <div className='space-y-6 overflow-y-auto px-4'>
          <ThemeConfig />
          <SidebarConfig />
          <LayoutConfig />
        </div>
        <SheetFooter className='gap-2'>
          <Button
            variant='destructive'
            onClick={handleReset}
            aria-label={t('resetAll')}
          >
            {t('reset')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function SectionTitle({
  title,
  showReset = false,
  onReset,
  resetAriaLabel,
  className,
}: {
  title: string
  showReset?: boolean
  onReset?: () => void
  /** Shown on the small per-section reset (RotateCcw) for accessibility and tests. */
  resetAriaLabel?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground',
        className
      )}
    >
      {title}
      {showReset && onReset && (
        <Button
          type='button'
          size='icon'
          variant='secondary'
          className='size-4 rounded-full'
          onClick={onReset}
          aria-label={resetAriaLabel}
        >
          <RotateCcw className='size-3' />
        </Button>
      )}
    </div>
  )
}

function RadioGroupItem({
  item,
  isTheme = false,
}: {
  item: {
    value: string
    label: string
    icon: (props: SVGProps<SVGSVGElement>) => React.ReactElement
  }
  isTheme?: boolean
}) {
  const t = useTranslations('admin.config')
  return (
    <Item
      value={item.value}
      className={cn('group outline-none', 'transition duration-200 ease-in')}
      aria-label={t('select', { option: item.label.toLowerCase() })}
      aria-describedby={`${item.value}-description`}
    >
      <div
        className={cn(
          'relative rounded-[6px] ring-[1px] ring-border',
          'group-data-[state=checked]:shadow-2xl group-data-[state=checked]:ring-primary',
          'group-focus-visible:ring-2'
        )}
        role='img'
        aria-hidden='false'
        aria-label={t('preview', { option: item.label })}
      >
        <CircleCheck
          className={cn(
            'size-6 fill-primary stroke-white',
            'group-data-[state=unchecked]:hidden',
            'absolute top-0 right-0 translate-x-1/2 -translate-y-1/2'
          )}
          aria-hidden='true'
        />
        <item.icon
          className={cn(
            !isTheme &&
              'fill-primary stroke-primary group-data-[state=unchecked]:fill-muted-foreground group-data-[state=unchecked]:stroke-muted-foreground'
          )}
          aria-hidden='true'
        />
      </div>
      <div
        className='mt-1 text-xs'
        id={`${item.value}-description`}
        aria-live='polite'
      >
        {item.label}
      </div>
    </Item>
  )
}

function ThemeConfig() {
  const { defaultTheme, theme, setTheme } = useTheme()
  const t = useTranslations('admin.config.theme')
  const names = useTranslations('admin.common.theme')
  return (
    <div>
      <SectionTitle
        title={t('title')}
        showReset={theme !== defaultTheme}
        onReset={() => setTheme(defaultTheme)}
        resetAriaLabel={t('reset')}
      />
      <Radio
        value={theme}
        onValueChange={setTheme}
        className='grid w-full max-w-md grid-cols-3 gap-4'
        aria-label={t('label')}
        aria-describedby='theme-description'
      >
        {[
          {
            value: 'system',
            label: names('system'),
            icon: IconThemeSystem,
          },
          {
            value: 'light',
            label: names('light'),
            icon: IconThemeLight,
          },
          {
            value: 'dark',
            label: names('dark'),
            icon: IconThemeDark,
          },
        ].map((item) => (
          <RadioGroupItem key={item.value} item={item} isTheme />
        ))}
      </Radio>
      <div id='theme-description' className='sr-only'>
        {t('description')}
      </div>
    </div>
  )
}

function SidebarConfig() {
  const { defaultVariant, variant, setVariant } = useLayout()
  const t = useTranslations('admin.config.sidebar')
  return (
    <div className='max-md:hidden'>
      <SectionTitle
        title={t('title')}
        showReset={defaultVariant !== variant}
        onReset={() => setVariant(defaultVariant)}
        resetAriaLabel={t('reset')}
      />
      <Radio
        value={variant}
        onValueChange={setVariant}
        className='grid w-full max-w-md grid-cols-3 gap-4'
        aria-label={t('label')}
        aria-describedby='sidebar-description'
      >
        {[
          {
            value: 'inset',
            label: t('inset'),
            icon: IconSidebarInset,
          },
          {
            value: 'floating',
            label: t('floating'),
            icon: IconSidebarFloating,
          },
          {
            value: 'sidebar',
            label: t('sidebar'),
            icon: IconSidebarSidebar,
          },
        ].map((item) => (
          <RadioGroupItem key={item.value} item={item} />
        ))}
      </Radio>
      <div id='sidebar-description' className='sr-only'>
        {t('description')}
      </div>
    </div>
  )
}

function LayoutConfig() {
  const { open, setOpen } = useSidebar()
  const { defaultCollapsible, collapsible, setCollapsible } = useLayout()
  const t = useTranslations('admin.config.layout')

  const radioState = open ? 'default' : collapsible

  return (
    <div className='max-md:hidden'>
      <SectionTitle
        title={t('title')}
        showReset={radioState !== 'default'}
        onReset={() => {
          setOpen(true)
          setCollapsible(defaultCollapsible)
        }}
        resetAriaLabel={t('reset')}
      />
      <Radio
        value={radioState}
        onValueChange={(v) => {
          if (v === 'default') {
            setOpen(true)
            return
          }
          setOpen(false)
          setCollapsible(v as Collapsible)
        }}
        className='grid w-full max-w-md grid-cols-3 gap-4'
        aria-label={t('label')}
        aria-describedby='layout-description'
      >
        {[
          {
            value: 'default',
            label: t('default'),
            icon: IconLayoutDefault,
          },
          {
            value: 'icon',
            label: t('icon'),
            icon: IconLayoutCompact,
          },
          {
            value: 'offcanvas',
            label: t('offcanvas'),
            icon: IconLayoutFull,
          },
        ].map((item) => (
          <RadioGroupItem key={item.value} item={item} />
        ))}
      </Radio>
      <div id='layout-description' className='sr-only'>
        {t('description')}
      </div>
    </div>
  )
}
