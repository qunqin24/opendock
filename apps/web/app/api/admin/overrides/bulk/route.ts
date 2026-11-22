import { auditLog, getDb, pluginOverrides } from '@opendock/db';
import { and, inArray, isNull } from 'drizzle-orm';
import { type NextRequest } from 'next/server';
import { body, fail, json, requireAdmin } from '@/lib/api';
import { getBasePlugin, getCategory } from '@/lib/data';
import { reloadOverrides } from '@/lib/overrides';

const BULK_ACTIONS = ['feature', 'unfeature', 'block', 'unblock', 'category', 'reset'] as const;
type BulkAction = (typeof BULK_ACTIONS)[number];
type Input = { names?: unknown; action?: unknown; category?: unknown };

const MAX_NAMES = 500;

/**
 * Applies one curation action to many plugins at once.
 * A value equal to the snapshot's own is stored as null ("use the data"),
 * and override rows left with nothing in them are removed.
 */
export async function POST(req: NextRequest) {
  const user = await requireAdmin();
  if (user instanceof Response) return user;
  const input = await body<Input>(req);
  if (!input) return fail(400, 'Expected a JSON body.');

  const names = Array.isArray(input.names)
    ? [...new Set(input.names.filter((n): n is string => typeof n === 'string').map((n) => n.trim()).filter(Boolean))]
    : [];
  if (names.length === 0 || names.length > MAX_NAMES) return fail(400, `Select between 1 and ${MAX_NAMES} plugins.`);
  if (names.some((n) => !getBasePlugin(n))) return fail(404, 'No such plugin.');

  const action = input.action as BulkAction;
  if (!BULK_ACTIONS.includes(action)) return fail(400, 'Unknown action.');
  const category = typeof input.category === 'string' ? input.category : null;
  if (action === 'category' && (!category || !getCategory(category))) return fail(400, 'Unknown category.');

  const db = getDb();
  await db.transaction(async (tx) => {
    if (action === 'reset') {
      await tx.delete(pluginOverrides).where(inArray(pluginOverrides.packageName, names));
      return;
    }
    const now = new Date();
    for (const name of names) {
      const base = getBasePlugin(name)!;
      const set =
        action === 'category'
          ? { category: category === base.category ? null : category }
          : action === 'feature' || action === 'unfeature'
            ? { featured: (action === 'feature') === base.featured ? null : action === 'feature' }
            : { blocked: action === 'block' ? true : null };
      await tx
        .insert(pluginOverrides)
        .values({ packageName: name, ...set, updatedAt: now, updatedBy: user.id })
        .onConflictDoUpdate({ target: pluginOverrides.packageName, set: { ...set, updatedAt: now, updatedBy: user.id } });
    }
    // Drop rows that no longer override anything.
    await tx
      .delete(pluginOverrides)
      .where(
        and(
          inArray(pluginOverrides.packageName, names),
          isNull(pluginOverrides.category),
          isNull(pluginOverrides.featured),
          isNull(pluginOverrides.blocked),
          isNull(pluginOverrides.note),
        ),
      );
  });
  await db.insert(auditLog).values({
    userId: user.id,
    action: 'override.bulk',
    target: `${names.length} plugins`,
    detail: { action, category: action === 'category' ? category : undefined, names },
  });
  await reloadOverrides();
  return json({ updated: names.length });
}
