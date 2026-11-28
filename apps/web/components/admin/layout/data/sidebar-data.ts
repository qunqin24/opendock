import { Download, LayoutDashboard, Package, Settings } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { type SidebarData } from '../types'

/** Sidebar and command-menu entries, titled in the admin's language. */
export function useSidebarData(): SidebarData {
  const t = useTranslations('admin.nav')
  return {
    navGroups: [
      {
        title: t('group'),
        items: [
          { title: t('overview'), url: '/admin', icon: LayoutDashboard },
          { title: t('plugins'), url: '/admin/plugins', icon: Package },
          { title: t('installs'), url: '/admin/installs', icon: Download },
          { title: t('settings'), url: '/admin/settings/account', icon: Settings },
        ],
      },
    ],
  }
}
