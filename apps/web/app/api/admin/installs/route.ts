import { getDb, installEvents } from '@opendock/db';
import { desc, gte, sql } from 'drizzle-orm';
import { type NextRequest } from 'next/server';
import { json, requireAdmin } from '@/lib/api';

export async function GET(req: NextRequest) {
  const user = await requireAdmin();
  if (user instanceof Response) return user;
  const days = [7, 30, 90].includes(Number(req.nextUrl.searchParams.get('days'))) ? Number(req.nextUrl.searchParams.get('days')) : 30;
  const since = new Date(Date.now() - (days - 1) * 86_400_000).toISOString().slice(0, 10);
  const db = getDb();
  const n = (action: string) => sql<number>`count(*) filter (where ${installEvents.action} = ${action})`.mapWith(Number);

  const [perDay, topPlugins, versions] = await Promise.all([
    db
      .select({ day: installEvents.day, install: n('install'), update: n('update'), uninstall: n('uninstall') })
      .from(installEvents)
      .where(gte(installEvents.day, since))
      .groupBy(installEvents.day),
    db
      .select({ name: installEvents.packageName, installs: n('install'), uninstalls: n('uninstall') })
      .from(installEvents)
      .where(gte(installEvents.day, since))
      .groupBy(installEvents.packageName)
      .orderBy(desc(n('install')))
      .limit(20),
    db
      .select({ version: sql<string>`coalesce(${installEvents.opencodeVersion}, 'unknown')`, count: sql<number>`count(*)`.mapWith(Number) })
      .from(installEvents)
      .where(gte(installEvents.day, since))
      .groupBy(sql`1`)
      .orderBy(desc(sql`2`))
      .limit(10),
  ]);

  // Every day in the range, zeros included, so charts have a continuous axis.
  const byDate = new Map(perDay.map((d) => [d.day, d]));
  const byDay = Array.from({ length: days }, (_, i) => {
    const day = new Date(Date.now() - (days - 1 - i) * 86_400_000).toISOString().slice(0, 10);
    const d = byDate.get(day);
    return { day, install: d?.install ?? 0, update: d?.update ?? 0, uninstall: d?.uninstall ?? 0 };
  });

  return json({
    days,
    total: byDay.reduce((s, d) => s + d.install, 0),
    byDay,
    topPlugins,
    byOpencodeVersion: versions,
  });
}
