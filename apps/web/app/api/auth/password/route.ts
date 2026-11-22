import { auditLog, getDb, sessions, users } from '@opendock/db';
import { and, eq, ne } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { createHash } from 'node:crypto';
import { body, fail, requireAdmin } from '@/lib/api';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { SESSION_COOKIE } from '@/lib/auth/session';

export async function POST(req: Request) {
  const user = await requireAdmin();
  if (user instanceof Response) return user;
  const input = await body<{ current?: string; next?: string }>(req);
  if (!input?.current || !input.next) return fail(400, 'Current and new password are required.');
  if (input.next.length < 10) return fail(400, 'The new password needs at least 10 characters.');
  if (input.next === input.current) return fail(400, 'The new password must differ from the current one.');

  const db = getDb();
  const [row] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  if (!row || !(await verifyPassword(input.current, row.passwordHash))) return fail(400, 'The current password is wrong.');

  await db.update(users).set({ passwordHash: await hashPassword(input.next), mustChangePassword: false }).where(eq(users.id, user.id));
  // Sign out every other session of this user.
  const token = (await cookies()).get(SESSION_COOKIE)?.value ?? '';
  const keep = createHash('sha256').update(token).digest('hex');
  await db.delete(sessions).where(and(eq(sessions.userId, user.id), ne(sessions.id, keep)));
  await db.insert(auditLog).values({ userId: user.id, action: 'auth.password_changed' });
  return new Response(null, { status: 204 });
}
