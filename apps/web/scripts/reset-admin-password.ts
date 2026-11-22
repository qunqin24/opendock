/**
 * Lost the admin password? Run on the server:
 *   pnpm --filter @opendock/web admin:reset-password [username]
 * Sets a new random password (printed once), forces a change at next
 * sign-in, and signs that user out everywhere.
 */
import { getDb, sessions, users } from '@opendock/db';
import { eq } from 'drizzle-orm';
import { generatePassword, hashPassword } from '../lib/auth/password.ts';

const username = (process.argv[2] ?? 'admin').toLowerCase();
const db = getDb();
const password = generatePassword();
const [user] = await db
  .update(users)
  .set({ passwordHash: await hashPassword(password), mustChangePassword: true })
  .where(eq(users.username, username))
  .returning({ id: users.id });
if (!user) {
  console.error(`No user named "${username}".`);
  process.exit(1);
}
await db.delete(sessions).where(eq(sessions.userId, user.id));
console.log(`New password for ${username}: ${password}\nSign in at /admin and change it.`);
process.exit(0);
