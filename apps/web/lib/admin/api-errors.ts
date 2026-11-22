import { useTranslations } from 'next-intl'
import type { AdminMessages } from '@/i18n/admin'
import { ApiError } from '@/lib/admin/api'

/** English texts the API sends (`fail(status, text)` in app/api) -> message key. */
type ServerKey = keyof AdminMessages['errors']['server']

const SERVER_ERRORS: Record<string, ServerKey> = {
  'The database is not configured.': 'databaseNotConfigured',
  'Sign in required.': 'signInRequired',
  'Admins only.': 'adminsOnly',
  'Too many attempts. Try again in 15 minutes.': 'tooManyAttempts',
  'Username and password are required.': 'credentialsRequired',
  'Wrong username or password.': 'wrongCredentials',
  'Current and new password are required.': 'passwordsRequired',
  'The new password needs at least 10 characters.': 'passwordTooShort',
  'The new password must differ from the current one.': 'passwordSame',
  'The current password is wrong.': 'currentPasswordWrong',
  'Expected a JSON body.': 'jsonBodyExpected',
  'No such plugin.': 'noSuchPlugin',
  'Unknown category.': 'unknownCategory',
  'Missing plugin name.': 'missingPluginName',
  'Select between 1 and 500 plugins.': 'bulkSelectionSize',
  'Unknown action.': 'unknownAction',
}

export type ErrorTranslator = ReturnType<typeof useTranslations<'admin.errors'>>

/**
 * Text for an error in the admin's language. API errors are mapped from the
 * server's English text; anything else falls back to `fallback` (a message key)
 * or the generic message.
 */
export function describeError(
  t: ErrorTranslator,
  error: unknown,
  fallback: 'generic' | 'signInFailed' | 'unknown' = 'generic'
): string {
  if (error instanceof ApiError) {
    if (error.kind === 'network') return t('network')
    if (error.kind === 'http') return t('http', { status: error.status })
    const key = SERVER_ERRORS[error.message]
    if (key) return t(`server.${key}`)
    return error.message
  }
  return t(fallback)
}

/** Hook form of `describeError` for components. */
export function useDescribeError() {
  const t = useTranslations('admin.errors')
  return (error: unknown, fallback?: 'generic' | 'signInFailed' | 'unknown') =>
    describeError(t, error, fallback)
}
