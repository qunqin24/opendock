import { ChevronLeft, ChevronRight, LayoutGrid, List, SlidersHorizontal, X } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CatIcon, HealthMark } from '@/components/icons';
import { PluginCard } from '@/components/plugin-card';
import { PluginListItem } from '@/components/plugin-list-item';
import { SortSelect } from '@/components/sort-select';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { getCategories, getCategory, getPlugins, searchPluginsDetailed, type SortKey } from '@/lib/data';
import { formatNumber } from '@/lib/format';
import { categoryLabel } from '@/lib/localize';
import { alternates } from '@/lib/seo';
import { syncOverrides } from '@/lib/overrides';

const PAGE_SIZE = 30;
const SORT_IDS: SortKey[] = ['score', 'downloads', 'trending', 'updated'];
const VISIBLE_CATEGORIES = 10;

type Search = Record<string, string | string[] | undefined>;
type Props = { params: Promise<{ locale: Locale }>; searchParams: Promise<Search> };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'list' });
  return { title: t('metaTitle'), alternates: alternates(locale, '/plugins') };
}

let compatCounts: { v2: number; v1: number; maintained: number } | null = null;
function counts() {
  if (!compatCounts) {
    const all = getPlugins();
    compatCounts = {
      v2: all.filter((p) => p.opencode === 'v2' || p.opencode === 'both').length,
      v1: all.filter((p) => p.opencode === 'v1' || p.opencode === 'both').length,
      maintained: all.filter((p) => p.healthLevel === 'ok').length,
    };
  }
  return compatCounts;
}

export default async function PluginsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await syncOverrides();
  const t = await getTranslations('list');
  const sp = await searchParams;
  const q = one(sp.q);
  const category = one(sp.category);
  const compat = one(sp.compat) === 'v1' || one(sp.compat) === 'v2' ? (one(sp.compat) as 'v1' | 'v2') : undefined;
  const maintained = one(sp.maintained) === '1' ? '1' : undefined;
  const sort = SORT_IDS.find((s) => s === one(sp.sort));
  const view = one(sp.view) === 'list' ? 'list' : undefined;
  const page = Math.max(1, Number(one(sp.page)) || 1);

  const result = searchPluginsDetailed({ q, category, compat, sort });
  const items = maintained ? result.items.filter((p) => p.healthLevel === 'ok') : result.items;
  const pages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const slice = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const categories = getCategories().toSorted((a, b) => (a.id === 'other' ? 1 : b.id === 'other' ? -1 : b.count - a.count));
  const current = category ? getCategory(category) : undefined;
  const n = counts();
  const num = (x: number) => formatNumber(x, locale);

  /** Same view with some parameters changed; every view is a shareable URL. */
  const href = (patch: Record<string, string | undefined>) => {
    const query = new URLSearchParams();
    const next = { q, category, compat, maintained, sort, view, ...patch };
    for (const [k, v] of Object.entries(next)) if (v) query.set(k, String(v));
    const s = query.toString();
    return s ? `/plugins?${s}` : '/plugins';
  };
  const toggle = (patch: Record<string, string | undefined>) => href({ ...patch, page: undefined });

  const item = (active: boolean) =>
    `flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[14px] transition-colors ${
      active ? 'bg-[var(--fg)] font-medium text-[var(--bg)]' : 'text-[var(--fg)] hover:bg-[var(--card-hover)]'
    }`;
  const count = (active: boolean) => `font-[family-name:var(--font-site-mono)] text-[12px] ${active ? 'opacity-70' : 'text-[var(--faint)]'}`;
  const heading = 'px-2.5 text-[11px] font-semibold tracking-[0.08em] text-[var(--faint)] uppercase';

  const catItem = (c: (typeof categories)[number]) => (
    <li key={c.id}>
      <Link href={toggle({ category: category === c.id ? undefined : c.id })} aria-current={category === c.id ? 'page' : undefined} className={item(category === c.id)}>
        <CatIcon name={c.icon} className="size-4 shrink-0" />
        <span className="min-w-0 truncate">{categoryLabel(c, locale)}</span>
        <span className={count(category === c.id)}>{c.count}</span>
      </Link>
    </li>
  );

  const filters = (
    <div className="grid gap-7">
      <div>
        <p className={heading}>{t('categories')}</p>
        <ul className="mt-2 grid gap-0.5">{categories.slice(0, VISIBLE_CATEGORIES).map(catItem)}</ul>
        {categories.length > VISIBLE_CATEGORIES && (
          <details className="group" open={categories.slice(VISIBLE_CATEGORIES).some((c) => c.id === category)}>
            <summary className="cursor-pointer list-none px-2.5 py-1.5 text-[14px] text-[var(--muted)] hover:text-[var(--fg)] group-open:hidden">{t('showMore')}</summary>
            <ul className="grid gap-0.5">{categories.slice(VISIBLE_CATEGORIES).map(catItem)}</ul>
          </details>
        )}
      </div>
      <div>
        <p className={heading}>{t('opencode')}</p>
        <ul className="mt-2 grid gap-0.5">
          {([['v2', t('worksOnV2'), n.v2], ['v1', t('worksOnV1'), n.v1]] as const).map(([id, label, total]) => (
            <li key={id}>
              <Link href={toggle({ compat: compat === id ? undefined : id })} aria-current={compat === id ? 'true' : undefined} className={item(compat === id)}>
                <span className="grid size-4 place-items-center font-[family-name:var(--font-site-mono)] text-[10px] font-semibold">{id.toUpperCase()}</span>
                <span>{label}</span>
                <span className={count(compat === id)}>{num(total)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className={heading}>{t('status')}</p>
        <ul className="mt-2 grid gap-0.5">
          <li>
            <Link href={toggle({ maintained: maintained ? undefined : '1' })} aria-current={maintained ? 'true' : undefined} className={item(Boolean(maintained))}>
              <HealthMark level="ok" className={`size-4 ${maintained ? '!text-[var(--bg)]' : ''}`} />
              <span>{t('maintainedOnly')}</span>
              <span className={count(Boolean(maintained))}>{num(n.maintained)}</span>
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );

  const active = [
    q && { label: `“${q}”`, clear: toggle({ q: undefined }) },
    current && { label: categoryLabel(current, locale), clear: toggle({ category: undefined }) },
    compat && { label: `OpenCode ${compat.toUpperCase()}`, clear: toggle({ compat: undefined }) },
    maintained && { label: t('maintained'), clear: toggle({ maintained: undefined }) },
  ].filter((x): x is { label: string; clear: string } => Boolean(x));

  const layoutLink = (on: boolean) =>
    `flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] ${on ? 'bg-[var(--pill)] font-medium' : 'text-[var(--muted)] hover:text-[var(--fg)]'}`;

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-5 pt-10 sm:px-6 sm:pt-12 lg:grid-cols-[13.5rem_minmax(0,1fr)]">
      <nav aria-label={t('filters')} className="hidden lg:block">
        <div className="sticky top-24">{filters}</div>
      </nav>

      <div className="min-w-0">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[clamp(1.9rem,3.5vw,2.4rem)] font-semibold tracking-[-0.04em]">
              {q ? t('searchTitle') : current ? categoryLabel(current, locale) : t('title')}
            </h1>
            <p className="mt-1 text-[14px] text-[var(--muted)]" aria-live="polite">
              {q && !result.exact ? t('closest', { count: num(items.length) }) : t('results', { count: items.length })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-[var(--line)] bg-[var(--card)] p-0.5" role="group" aria-label={t('layout')}>
              <Link href={toggle({ view: 'list' })} aria-current={view === 'list' ? 'true' : undefined} className={layoutLink(view === 'list')}>
                <List aria-hidden strokeWidth={1.75} className="size-4" /> {t('listView')}
              </Link>
              <Link href={toggle({ view: undefined })} aria-current={!view ? 'true' : undefined} className={layoutLink(!view)}>
                <LayoutGrid aria-hidden strokeWidth={1.75} className="size-4" /> {t('cardsView')}
              </Link>
            </div>
            <SortSelect
              value={sort ?? 'score'}
              options={SORT_IDS.map((id) => ({ id, label: t(`sort.${id}`) }))}
              hrefs={Object.fromEntries(SORT_IDS.map((id) => [id, toggle({ sort: id === 'score' ? undefined : id })]))}
            />
          </div>
        </div>

        {/* Filters on small screens. */}
        <details className="mt-5 rounded-xl border border-[var(--line)] lg:hidden">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-[14px] font-medium">
            <SlidersHorizontal aria-hidden strokeWidth={1.75} className="size-4" /> {t('filters')}
            {active.length > 0 && <span className="text-[var(--faint)]">· {active.length}</span>}
          </summary>
          <div className="border-t border-[var(--line)] p-3">{filters}</div>
        </details>

        {active.length > 0 && (
          <ul className="mt-5 flex flex-wrap gap-2" aria-label={t('activeFilters')}>
            {active.map((a) => (
              <li key={a.label}>
                <Link href={a.clear} className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] py-1 pr-2 pl-3 text-[13px] hover:bg-[var(--pill)]">
                  {a.label}
                  <X aria-label={t('remove', { label: a.label })} strokeWidth={2} className="size-3.5 text-[var(--faint)]" />
                </Link>
              </li>
            ))}
            {active.length > 1 && (
              <li>
                <Link href="/plugins" className="inline-flex py-1 text-[13px] text-[var(--muted)] underline-offset-4 hover:underline">
                  {t('clearAll')}
                </Link>
              </li>
            )}
          </ul>
        )}

        {slice.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-[var(--line)] py-20 text-center">
            <p className="font-medium">{t('empty')}</p>
            <p className="mt-1 text-[14px] text-[var(--muted)]">{t('emptyHint')}</p>
          </div>
        ) : view === 'list' ? (
          <ul className="mt-4">{slice.map((p) => <PluginListItem key={p.name} p={p} />)}</ul>
        ) : (
          <ul className="mt-6 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">{slice.map((p) => <PluginCard key={p.name} p={p} />)}</ul>
        )}

        {pages > 1 && (
          <nav aria-label={t('pages')} className="mt-10 flex items-center justify-between text-[14px]">
            {page > 1 ? (
              <Link href={href({ page: String(page - 1) })} className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 hover:bg-[var(--pill)]">
                <ChevronLeft aria-hidden className="size-4" strokeWidth={1.75} /> {t('previous')}
              </Link>
            ) : (
              <span />
            )}
            <span className="font-[family-name:var(--font-site-mono)] text-[13px] text-[var(--faint)]">{t('page', { page: String(page), pages: String(pages) })}</span>
            {page < pages ? (
              <Link href={href({ page: String(page + 1) })} className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 hover:bg-[var(--pill)]">
                {t('next')} <ChevronRight aria-hidden className="size-4" strokeWidth={1.75} />
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}
      </div>
    </div>
  );
}
