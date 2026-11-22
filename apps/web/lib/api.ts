import { hasDatabase } from '@opendock/db';
import { currentUser, type SessionUser } from './auth/session';

export const json = (data: unknown, init?: number | ResponseInit) =>
  Response.json(data, typeof init === 'number' ? { status: init } : init);

export const fail = (status: number, error: string) => Response.json({ error }, { status });

/**
 * Guard for admin endpoints: a configured database and a signed-in admin.
 * Returns the user, or the error response to send.
 */
export async function requireAdmin(): Promise<SessionUser | Response> {
  if (!hasDatabase()) return fail(503, 'The database is not configured.');
  const user = await currentUser();
  if (!user) return fail(401, 'Sign in required.');
  if (user.role !== 'admin') return fail(403, 'Admins only.');
  return user;
}

/** Parses a JSON body, or null when it is not valid JSON. */
export async function body<T>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}

/** Client address for rate limiting only; never stored. */
export const clientKey = (req: Request) =>
  req.headers.get('x-real-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
