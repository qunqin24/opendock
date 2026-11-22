import { createHash, randomBytes } from 'node:crypto';
import { getDb, sessions, users } from '@opendock/db';
import { and, eq, gt } from 'drizzle-orm';
import { cookies } from 'next/headers';

export const SESSION_COOKIE = 'od_session';
const TTL_MS = 14 * 24 * 60 * 60 * 1000;
/** Extend the session when less than this is left (sliding expiry). */
const RENEW_MS = 7 * 24 * 60 * 60 * 1000;

const digest = (token: string) => createHash('sha256').update(token).digest('hex');

export interface SessionUser {
  id: string;
  username: string;
  role: 'admin';
  mustChangePassword: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

function toUser(row: typeof users.$inferSelect): SessionUser {
  return {
    id: row.id,
    username: row.username,
    role: row.role,
    mustChangePassword: row.mustChangePassword,
    createdAt: row.createdAt.toISOString(),
    lastLoginAt: row.lastLoginAt?.toISOString() ?? null,
  };
}

async function setCookie(token: string, expires: Date) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires,
  });
}

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + TTL_MS);
  await getDb().insert(sessions).values({ id: digest(token), userId, expiresAt });
  await setCookie(token, expiresAt);
}

/** The signed-in user, or null. Renews sessions that are past half their life. */
export async function currentUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const db = getDb();
  const id = digest(token);
  const [row] = await db
    .select({ user: users, expiresAt: sessions.expiresAt })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, id), gt(sessions.expiresAt, new Date())))
    .limit(1);
  if (!row) return null;
  if (row.expiresAt.getTime() - Date.now() < RENEW_MS) {
    const expiresAt = new Date(Date.now() + TTL_MS);
    await db.update(sessions).set({ expiresAt }).where(eq(sessions.id, id));
    try {
      await setCookie(token, expiresAt);
    } catch {
      /* cookies are read-only during rendering; the DB expiry still moved */
    }
  }
  return toUser(row.user);
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await getDb().delete(sessions).where(eq(sessions.id, digest(token)));
  jar.delete(SESSION_COOKIE);
}

export { toUser };
