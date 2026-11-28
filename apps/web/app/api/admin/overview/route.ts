import { getDb, installEvents, pluginOverrides } from '@opendock/db';
import { count, gte, sql } from 'drizzle-orm';
import { json, requireAdmin } from '@/lib/api';
import { getAllPlugins, getCategories, getMeta, getPlugins, getTrending } from '@/lib/data';
import { reloadOverrides } from '@/lib/overrides';

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);

export async function GET() {
  const user = await requireAdmin();
  if (user instanceof Response) return user;
  await reloadOverrides();
  const db = getDb();

  const plugins = getPlugins();
  const meta = getMeta();
  const health = { ok: 0, warn: 0, danger: 0 };
  const compat = { v1: 0, v2: 0, both: 0, unknown: 0 };
  for (const p of plugins) {
    health[p.healthLevel]++;
    compat[p.opencode ?? 'unknown']++;
  }
  const brief = (p: (typeof plugins)[number]) => ({ name: p.name, slug: p.slug, title: p.title || p.name });

  const [overrides] = await db
    .select({
      total: count(),
      blocked: sql<number>`count(*) filter (where ${pluginOverrides.blocked} is true)`.mapWith(Number),
      featured: sql<number>`count(*) filter (where ${pluginOverrides.featured} is true)`.mapWith(Number),
      recategorized: sql<number>`count(*) filter (where ${pluginOverrides.category} is not null)`.mapWith(Number),
    })
    .from(pluginOverrides);
  const [installs] = await db
    .select({
      last30d: sql<number>`count(*) filter (where ${installEvents.action} = 'install')`.mapWith(Number),
      last7d: sql<number>`count(*) filter (where ${installEvents.action} = 'install' and ${installEvents.day} >= ${daysAgo(7)})`.mapWith(Number),
    })
    .from(installEvents)
    .where(gte(installEvents.day, daysAgo(30)));

  return json({
    dataRefreshedAt: meta.generatedAt,
    totals: {
      plugins: plugins.length,
      hidden: getAllPlugins().length - plugins.length,
      downloadsMonth: plugins.reduce((n, p) => n + p.downloadsMonth, 0),
      stars: meta.totals.stars,
      maintainers: meta.totals.maintainers,
    },
    health,
    compat,
    categories: getCategories().map((c) => ({ id: c.id, label: c.labelEn, labelZh: c.label, count: c.count })),
    topDownloads: plugins
      .toSorted((a, b) => b.downloadsMonth - a.downloadsMonth)
      .slice(0, 8)
      .map((p) => ({ ...brief(p), downloadsMonth: p.downloadsMonth })),
    trending: getTrending(8).map((p) => ({ ...brief(p), starsDelta7d: p.starsDelta7d })),
    overrides,
    installs,
  });
}
