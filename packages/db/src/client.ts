import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.ts';

export type Db = ReturnType<typeof drizzle<typeof schema>>;

const globalForDb = globalThis as unknown as { __opendockDb?: Db };

/** True when a database is configured; the public site works without one. */
export const hasDatabase = () => Boolean(process.env.DATABASE_URL);

/**
 * One pool per process (kept on globalThis so dev hot reloads reuse it).
 * Throws when DATABASE_URL is missing; callers check `hasDatabase()` first.
 */
export function getDb(): Db {
  if (globalForDb.__opendockDb) return globalForDb.__opendockDb;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  // onnotice: silence "already exists, skipping" notices from idempotent migrations.
  const client = postgres(url, { max: 10, idle_timeout: 30, onnotice: () => {} });
  globalForDb.__opendockDb = drizzle(client, { schema });
  return globalForDb.__opendockDb;
}
