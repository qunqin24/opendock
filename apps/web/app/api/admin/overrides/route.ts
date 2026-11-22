import { auditLog, getDb, pluginOverrides } from '@opendock/db';
import { eq } from 'drizzle-orm';
import { type NextRequest } from 'next/server';
import { body, fail, json, requireAdmin } from '@/lib/api';
import { getAnyPlugin, getCategory } from '@/lib/data';
import { reloadOverrides } from '@/lib/overrides';

type Input = { name?: string; category?: string | null; featured?: boolean | null; blocked?: boolean | null; note?: string | null };

const triState = (v: unknown) => (v === true || v === false || v === null ? v : undefined);

export async function PUT(req: NextRequest) {
  const user = await requireAdmin();
  if (user instanceof Response) return user;
  const input = await body<Input>(req);
  if (!input) return fail(400, 'Expected a JSON body.');
  const name = input.name?.trim();
  if (!name || !getAnyPlugin(name)) return fail(404, 'No such plugin.');
  if (input.category != null && !getCategory(input.category)) return fail(400, 'Unknown category.');

  const values = {
    category: input.category === undefined ? undefined : input.category,
    featured: triState(input.featured),
    blocked: triState(input.blocked),
    note: input.note === undefined ? undefined : input.note?.trim().slice(0, 500) || null,
    updatedAt: new Date(),
    updatedBy: user.id,
  };
  const db = getDb();
  const [override] = await db
    .insert(pluginOverrides)
    .values({ packageName: name, ...values })
    .onConflictDoUpdate({ target: pluginOverrides.packageName, set: values })
    .returning();
  await db.insert(auditLog).values({ userId: user.id, action: 'override.set', target: name, detail: values });
  await reloadOverrides();
  return json({
    override: {
      category: override.category,
      featured: override.featured,
      blocked: override.blocked,
      note: override.note,
      updatedAt: override.updatedAt.toISOString(),
      updatedBy: user.username,
    },
  });
}

export async function DELETE(req: NextRequest) {
  const user = await requireAdmin();
  if (user instanceof Response) return user;
  const name = req.nextUrl.searchParams.get('name')?.trim();
  if (!name) return fail(400, 'Missing plugin name.');
  const db = getDb();
  await db.delete(pluginOverrides).where(eq(pluginOverrides.packageName, name));
  await db.insert(auditLog).values({ userId: user.id, action: 'override.removed', target: name });
  await reloadOverrides();
  return new Response(null, { status: 204 });
}
