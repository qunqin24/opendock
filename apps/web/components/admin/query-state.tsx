import { TriangleAlert } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useDescribeError } from '@/lib/admin/api-errors'
import { Alert, AlertDescription, AlertTitle } from '@/components/admin/ui/alert'
import { Button } from '@/components/admin/ui/button'

export function QueryError({
  error,
  onRetry,
}: {
  error: unknown
  onRetry?: () => void
}) {
  const t = useTranslations('admin.errors')
  const retry = useTranslations('admin.common')
  const describe = useDescribeError()
  return (
    <Alert variant='destructive'>
      <TriangleAlert />
      <AlertTitle>{t('loadTitle')}</AlertTitle>
      <AlertDescription>
        <p>
          {describe(error, 'unknown')} {t('loadHint')}
        </p>
        {onRetry && (
          <Button variant='outline' size='sm' className='mt-2' onClick={onRetry}>
            {retry('retry')}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  )
}
