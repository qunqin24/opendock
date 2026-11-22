import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { getDb } from './client.ts';

/** Folder with the SQL migrations; overridable for deployments that move files around. */
export const migrationsFolder =
  process.env.OPENDOCK_MIGRATIONS_DIR ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../drizzle');

export async function runMigrations(folder = migrationsFolder): Promise<void> {
  await migrate(getDb(), { migrationsFolder: folder });
}
