import { Download, LayoutDashboard, Package, Settings } from 'lucide-react'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  navGroups: [
    {
      title: 'Admin',
      items: [
        { title: 'Overview', url: '/', icon: LayoutDashboard },
        { title: 'Plugins', url: '/plugins', icon: Package },
        { title: 'Installs', url: '/installs', icon: Download },
        { title: 'Settings', url: '/settings/account', icon: Settings },
      ],
    },
  ],
}
