/**
 * Server start (Node only): apply database migrations, then make sure an
 * admin account exists. The public site runs on the JSON snapshot alone when
 * no database is configured, so this only runs with DATABASE_URL set.
 */
import path from 'node:path';
import { runMigrations } from '@opendock/db';
import { ensureAdmin } from './lib/auth/bootstrap';

const folder = process.env.OPENDOCK_MIGRATIONS_DIR ?? path.resolve(process.cwd(), '../../packages/db/drizzle');
try {
  await runMigrations(folder);
  await ensureAdmin();
} catch (error) {
  console.error('[opendock] database setup failed:', error);
}
