import { ConfigDrawer } from '@/components/admin/config-drawer'
import { Header } from '@/components/admin/layout/header'
import { ProfileDropdown } from '@/components/admin/profile-dropdown'
import { Search } from '@/components/admin/search'
import { ThemeSwitch } from '@/components/admin/theme-switch'

/** Top bar shared by every authenticated page. */
export function PageHeader() {
  return (
    <Header fixed>
      <Search className='me-auto' />
      <ThemeSwitch />
      <ConfigDrawer />
      <ProfileDropdown />
    </Header>
  )
}
