'use client'

import { type ReactNode } from 'react'
import { cn } from '@/lib/admin/utils'
import { LayoutProvider, type LayoutInitial } from '@/components/admin/context/layout-provider'
import { SearchProvider } from '@/components/admin/context/search-provider'
import { SidebarInset, SidebarProvider } from '@/components/admin/ui/sidebar'
import { AppSidebar } from '@/components/admin/layout/app-sidebar'
import { SkipToMain } from '@/components/admin/skip-to-main'

type AuthenticatedLayoutProps = {
  children: ReactNode
  /** Initial sidebar state, read from cookies on the server. */
  defaultOpen: boolean
  layout: LayoutInitial
}

export function AuthenticatedLayout({
  children,
  defaultOpen,
  layout,
}: AuthenticatedLayoutProps) {
  return (
    <SearchProvider>
      <LayoutProvider initial={layout}>
        <SidebarProvider defaultOpen={defaultOpen}>
          <SkipToMain />
          <AppSidebar />
          <SidebarInset
            className={cn(
              // Set content container, so we can use container queries
              '@container/content',

              // If layout is fixed, set the height
              // to 100svh to prevent overflow
              'has-data-[layout=fixed]:h-svh',

              // If layout is fixed and sidebar is inset,
              // set the height to 100svh - spacing (total margins) to prevent overflow
              'peer-data-[variant=inset]:has-data-[layout=fixed]:h-[calc(100svh-(var(--spacing)*4))]'
            )}
          >
            {children}
          </SidebarInset>
        </SidebarProvider>
      </LayoutProvider>
    </SearchProvider>
  )
}
