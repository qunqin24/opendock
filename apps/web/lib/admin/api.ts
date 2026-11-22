// Minimal fetch wrapper for the OpenDock admin API (same-origin, cookie session).

/**
 * `network`: the request never reached the server; `http`: an error response
 * without a usable message (for example a proxy error page); `server`: the API
 * answered with its own English `error` text (translated on screen, see
 * lib/admin/api-errors.ts).
 */
export type ApiErrorKind = 'network' | 'http' | 'server'

export class ApiError extends Error {
  status: number
  kind: ApiErrorKind

  constructor(status: number, message: string, kind: ApiErrorKind = 'server') {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.kind = kind
  }
}

type UnauthorizedHandler = () => void

let onUnauthorized: UnauthorizedHandler | null = null

/** Register what happens when any API call answers 401 (see main.tsx). */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  onUnauthorized = handler
}

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
  /** Skip the global 401 redirect (login attempts, the auth guard). */
  skipUnauthorized?: boolean
}

export async function api<T = void>(
  path: string,
  { body, skipUnauthorized, headers, ...init }: RequestOptions = {}
): Promise<T> {
  let res: Response
  try {
    res = await fetch(path, {
      credentials: 'same-origin',
      ...init,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(0, 'Cannot reach the server.', 'network')
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`
    let kind: ApiErrorKind = 'http'
    try {
      const data = await res.json()
      if (data && typeof data.error === 'string') {
        message = data.error
        kind = 'server'
      }
    } catch {
      // Non-JSON error body (for example a proxy error page); keep the default.
    }
    if (res.status === 401 && !skipUnauthorized) onUnauthorized?.()
    throw new ApiError(res.status, message, kind)
  }

  if (res.status === 204) return undefined as T
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}
