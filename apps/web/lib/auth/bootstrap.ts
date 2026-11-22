import { getDb, users } from '@opendock/db';
import { count } from 'drizzle-orm';
import { generatePassword, hashPassword } from './password';

/**
 * First start: when there is no account yet, create `admin` with a random
 * password and print it once to the server log. The password must be
 * changed at first sign-in.
 */
export async function ensureAdmin(): Promise<void> {
  const db = getDb();
  const [{ n }] = await db.select({ n: count() }).from(users);
  if (n > 0) return;
  const password = generatePassword();
  const inserted = await db
    .insert(users)
    .values({ username: 'admin', passwordHash: await hashPassword(password), mustChangePassword: true })
    .onConflictDoNothing()
    .returning({ id: users.id });
  if (!inserted.length) return; // another process won the race
  const line = '═'.repeat(58);
  console.log(
    [
      '',
      `╔${line}╗`,
      '║  OpenDock admin account created                          ║',
      '║                                                          ║',
      `║  username: admin${' '.repeat(41)}║`,
      `║  password: ${password}${' '.repeat(Math.max(0, 46 - password.length))}║`,
      '║                                                          ║',
      '║  Sign in at /admin and change it. Shown only this once.  ║',
      `╚${line}╝`,
      '',
    ].join('\n'),
  );
}
