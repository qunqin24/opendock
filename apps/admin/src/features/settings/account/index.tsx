import { useQuery } from '@tanstack/react-query'
import { TriangleAlert } from 'lucide-react'
import { meQueryOptions } from '@/lib/auth'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ContentSection } from '../components/content-section'
import { AccountForm } from './account-form'

export function SettingsAccount() {
  const { data: user } = useQuery(meQueryOptions)

  return (
    <ContentSection
      title='Account'
      desc='Your admin sign-in and password.'
    >
      <div className='space-y-6'>
        {user?.mustChangePassword && (
          <Alert variant='destructive'>
            <TriangleAlert />
            <AlertTitle>Change your password to continue</AlertTitle>
            <AlertDescription>
              This account is still using its initial password. Set a new one
              before using the rest of the admin.
            </AlertDescription>
          </Alert>
        )}
        {user && (
          <dl className='grid grid-cols-[8rem_1fr] gap-y-1 text-sm'>
            <dt className='text-muted-foreground'>Username</dt>
            <dd className='font-medium'>{user.username}</dd>
            <dt className='text-muted-foreground'>Role</dt>
            <dd>{user.role}</dd>
            <dt className='text-muted-foreground'>Last sign-in</dt>
            <dd>
              {user.lastLoginAt
                ? new Date(user.lastLoginAt).toLocaleString()
                : 'Never'}
            </dd>
          </dl>
        )}
        <AccountForm />
      </div>
    </ContentSection>
  )
}
