'use client'

import type * as React from 'react'
import { Palette, Wrench } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Separator } from '@/components/admin/ui/separator'
import { ConfigDrawer } from '@/components/admin/config-drawer'
import { Header } from '@/components/admin/layout/header'
import { Main } from '@/components/admin/layout/main'
import { ProfileDropdown } from '@/components/admin/profile-dropdown'
import { Search } from '@/components/admin/search'
import { ThemeSwitch } from '@/components/admin/theme-switch'
import { SidebarNav } from './components/sidebar-nav'

export function Settings({ children }: { children: React.ReactNode }) {
  const t = useTranslations('admin.settings')
  const sidebarNavItems = [
    {
      title: t('nav.account'),
      href: '/admin/settings/account',
      icon: <Wrench size={18} />,
    },
    {
      title: t('nav.appearance'),
      href: '/admin/settings/appearance',
      icon: <Palette size={18} />,
    },
  ]
  return (
    <>
      {/* ===== Top Heading ===== */}
      <Header>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main fixed>
        <div className='space-y-0.5'>
          <h1 className='text-2xl font-bold tracking-tight md:text-3xl'>
            {t('title')}
          </h1>
          <p className='text-muted-foreground'>
            {t('description')}
          </p>
        </div>
        <Separator className='my-4 lg:my-6' />
        <div className='flex flex-1 flex-col space-y-2 overflow-hidden md:space-y-2 lg:flex-row lg:space-y-0 lg:space-x-12'>
          <aside className='top-0 lg:sticky lg:w-1/5'>
            <SidebarNav items={sidebarNavItems} />
          </aside>
          <div className='flex w-full overflow-y-hidden p-1'>
            {children}
          </div>
        </div>
      </Main>
    </>
  )
}
