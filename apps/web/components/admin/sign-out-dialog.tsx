import { useTranslations } from 'next-intl'
import { useQueryClient } from '@tanstack/react-query'
import { logout } from '@/lib/admin/auth'
import { ConfirmDialog } from '@/components/admin/confirm-dialog'

interface SignOutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SignOutDialog({ open, onOpenChange }: SignOutDialogProps) {
  const t = useTranslations('admin.signOut')
  const queryClient = useQueryClient()

  const handleSignOut = async () => {
    try {
      await logout()
    } catch {
      // The session may already be gone; leave the app either way.
    }
    queryClient.clear()
    // Hard navigation: drops the client router cache of authenticated pages.
    window.location.replace('/admin/sign-in')
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('title')}
      desc={t('description')}
      confirmText={t('confirm')}
      destructive
      handleConfirm={handleSignOut}
      className='sm:max-w-sm'
    />
  )
}
