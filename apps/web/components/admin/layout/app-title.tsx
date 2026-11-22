import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { Logo } from '@/components/admin/assets/logo'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/admin/ui/sidebar'

export function AppTitle() {
  const { setOpenMobile } = useSidebar()
  const t = useTranslations('admin.nav')
  const common = useTranslations('admin.common')
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size='lg' asChild>
          <Link href='/admin' onClick={() => setOpenMobile(false)}>
            <div className='flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground'>
              <Logo className='size-4' />
            </div>
            <div className='grid flex-1 text-start text-sm leading-tight'>
              <span className='truncate font-semibold'>{common('appName')}</span>
              <span className='truncate text-xs'>{t('tagline')}</span>
            </div>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
