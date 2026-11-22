import { getDb, pluginOverrides, users } from '@opendock/db';
import { eq } from 'drizzle-orm';
import { type NextRequest } from 'next/server';
import { json, requireAdmin } from '@/lib/api';
import { getCategory, searchPluginsDetailed, type SortKey } from '@/lib/data';
import { reloadOverrides } from '@/lib/overrides';

const SORTS: SortKey[] = ['score', 'downloads', 'stars', 'updated', 'trending'];

export async function GET(req: NextRequest) {
  const user = await requireAdmin();
  if (user instanceof Response) return user;
  await reloadOverrides();
  const sp = req.nextUrl.searchParams;
  const q = sp.get('q')?.slice(0, 100) || undefined;
  const category = sp.get('category') || undefined;
  const health = sp.get('health');
  const overridden = sp.get('overridden') === '1';
  const sortParam = sp.get('sort') as SortKey | null;
  const sort = sortParam && SORTS.includes(sortParam) ? sortParam : undefined;
  const page = Math.max(1, Number(sp.get('page')) || 1);
  const pageSize = Math.min(100, Math.max(5, Number(sp.get('pageSize')) || 20));

  const rows = await getDb()
    .select({ o: pluginOverrides, updatedBy: users.username })
    .from(pluginOverrides)
    .leftJoin(users, eq(users.id, pluginOverrides.updatedBy));
  const overrides = new Map(rows.map((r) => [r.o.packageName, { ...r.o, updatedBy: r.updatedBy }]));

  // With a search term, "score" (the default) means best match first.
  let items = searchPluginsDetailed({ q, category, sort: q && sort === 'score' ? undefined : sort, includeBlocked: true }).items;
  if (health === 'ok' || health === 'warn' || health === 'danger') items = items.filter((p) => p.healthLevel === health);
  if (overridden) items = items.filter((p) => overrides.has(p.name));

  const slice = items.slice((page - 1) * pageSize, page * pageSize);
  return json({
    total: items.length,
    page,
    pageSize,
    items: slice.map((p) => {
      const o = overrides.get(p.name);
      return {
        name: p.name,
        slug: p.slug,
        title: p.title || p.name,
        owner: p.owner,
        description: p.description,
        category: p.category,
        categoryLabel: getCategory(p.category)?.labelEn ?? p.category,
        categoryLabelZh: getCategory(p.category)?.label ?? null,
        downloadsMonth: p.downloadsMonth,
        stars: p.starsCredited,
        score: p.score,
        healthLevel: p.healthLevel,
        opencode: p.opencode,
        pushedAt: p.pushedAt,
        featured: p.featured,
        blocked: Boolean(p.blocked),
        override: o
          ? { category: o.category, featured: o.featured, blocked: o.blocked, note: o.note, updatedAt: o.updatedAt.toISOString(), updatedBy: o.updatedBy }
          : null,
      };
    }),
  });
}
