// Minimal fetch wrapper for the OpenDock admin API (same-origin, cookie session).

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
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
    throw new ApiError(0, 'Cannot reach the server.')
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`
    try {
      const data = await res.json()
      if (data && typeof data.error === 'string') message = data.error
    } catch {
      // Non-JSON error body (for example a proxy error page); keep the default.
    }
    if (res.status === 401 && !skipUnauthorized) onUnauthorized?.()
    throw new ApiError(res.status, message)
  }

  if (res.status === 204) return undefined as T
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

export function errorMessage(error: unknown, fallback = 'Something went wrong.') {
  return error instanceof Error && error.message ? error.message : fallback
}
