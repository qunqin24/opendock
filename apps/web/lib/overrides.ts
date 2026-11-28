import { getDb, hasDatabase, pluginOverrides } from '@opendock/db';
import { setOverrides, type Override } from './data';

const MAX_AGE_MS = 15_000;
let loadedAt = 0;
let inflight: Promise<void> | null = null;

/**
 * Pull admin overrides from the database into the in-memory data layer.
 * Cheap to call on every request: it reloads at most every 15 seconds, and
 * right away after an admin change (`invalidateOverrides`). Without a
 * database the site simply runs on the snapshot.
 */
export async function syncOverrides(): Promise<void> {
  if (!hasDatabase() || Date.now() - loadedAt < MAX_AGE_MS) return;
  inflight ??= (async () => {
    try {
      const rows = await getDb().select().from(pluginOverrides);
      setOverrides(
        new Map<string, Override>(rows.map((r) => [r.packageName, { category: r.category, featured: r.featured, blocked: r.blocked }])),
      );
      loadedAt = Date.now();
    } catch (error) {
      console.error('[opendock] could not load overrides, keeping the previous ones:', error);
      loadedAt = Date.now(); // do not hammer a failing database
    }
  })().finally(() => {
    inflight = null;
  });
  await inflight;
}

export async function reloadOverrides(): Promise<void> {
  loadedAt = 0;
  await syncOverrides();
}
