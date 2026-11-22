import { auditLog, getDb, hasDatabase, users } from '@opendock/db';
import { eq } from 'drizzle-orm';
import { body, clientKey, fail, json } from '@/lib/api';
import { verifyPassword } from '@/lib/auth/password';
import { createSession, toUser } from '@/lib/auth/session';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(req: Request) {
  if (!hasDatabase()) return fail(503, 'The database is not configured.');
  if (!rateLimit(`login:${clientKey(req)}`, 10, 15 * 60_000)) return fail(429, 'Too many attempts. Try again in 15 minutes.');
  const input = await body<{ username?: string; password?: string }>(req);
  const username = input?.username?.trim().toLowerCase();
  const password = input?.password;
  if (!username || !password) return fail(400, 'Username and password are required.');

  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
  // Same message whether the user exists or not.
  if (!user || !(await verifyPassword(password, user.passwordHash))) return fail(401, 'Wrong username or password.');

  const [updated] = await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id)).returning();
  await createSession(user.id);
  await db.insert(auditLog).values({ userId: user.id, action: 'auth.login' });
  return json({ user: toUser(updated) });
}
