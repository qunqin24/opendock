import { type NextRequest } from 'next/server';
import { getCategory, searchPluginsDetailed, toCard } from '@/lib/data';
import { categoryLabel, pluginDescription } from '@/lib/localize';
import { syncOverrides } from '@/lib/overrides';

/**
 * Header search. `exact` is false when no plugin matched every word and the
 * list holds the closest matches instead.
 */
export async function GET(req: NextRequest) {
  await syncOverrides();
  const q = req.nextUrl.searchParams.get('q')?.slice(0, 100) ?? '';
  const locale = req.nextUrl.searchParams.get('locale') === 'zh' ? 'zh' : 'en';
  const limit = Math.min(20, Math.max(1, Number(req.nextUrl.searchParams.get('limit')) || 5));
  const { items, exact } = q.trim() ? searchPluginsDetailed({ q }) : { items: [], exact: true };
  return Response.json(
    {
      q,
      total: items.length,
      exact,
      items: items.slice(0, limit).map((p) => {
        const cat = getCategory(p.category);
        return {
          ...toCard(p),
          description: pluginDescription(p, locale),
          title: p.title,
          owner: p.owner,
          categoryLabel: cat ? categoryLabel(cat, locale) : null,
          categoryIcon: cat?.icon ?? 'package',
        };
      }),
    },
    { headers: { 'cache-control': 'public, max-age=60' } },
  );
}
