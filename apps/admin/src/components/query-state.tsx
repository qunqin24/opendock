import { TriangleAlert } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

export function QueryError({
  error,
  onRetry,
}: {
  error: unknown
  onRetry?: () => void
}) {
  return (
    <Alert variant='destructive'>
      <TriangleAlert />
      <AlertTitle>Could not load data</AlertTitle>
      <AlertDescription>
        <p>
          {error instanceof Error ? error.message : 'Unknown error.'} The
          backend may be offline or the database not configured.
        </p>
        {onRetry && (
          <Button variant='outline' size='sm' className='mt-2' onClick={onRetry}>
            Retry
          </Button>
        )}
      </AlertDescription>
    </Alert>
  )
}
