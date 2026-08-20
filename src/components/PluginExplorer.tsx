import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import Fuse from 'fuse.js';
import type { Category, SearchDoc } from '../lib/plugins';
import { avatarUrl, cn, compactNumber, timeAgo } from '../lib/utils';
import { DEFAULT_LOCALE, localePath, useTranslations, type Locale } from '../lib/i18n';

const PAGE_SIZE = 60;

const SORTS = ['score', 'stars', 'trending', 'downloads', 'recent', 'updated'] as const;

type SortId = (typeof SORTS)[number];

const HEALTH_FILTERS = ['all', 'healthy', 'has-repo'] as const;

type HealthId = (typeof HEALTH_FILTERS)[number];
type ViewId = 'list' | 'grid';

interface Props {
  docs: SearchDoc[];
  categories: Category[];
  /** Preselects a category, e.g. when embedded on a category page. */
  initialCategory?: string;
  initialSort?: SortId;
  lang?: Locale;
}

const time = (iso: string | null) => (iso ? new Date(iso).getTime() : 0);

const comparators: Record<SortId, (a: SearchDoc, b: SearchDoc) => number> = {
  score: (a, b) => b.score - a.score,
  stars: (a, b) => b.stars - a.stars || b.score - a.score,
  trending: (a, b) => b.starsDelta7d - a.starsDelta7d || b.score - a.score,
  downloads: (a, b) => b.downloadsMonth - a.downloadsMonth || b.score - a.score,
  recent: (a, b) => time(b.createdAt) - time(a.createdAt),
  updated: (a, b) => time(b.pushedAt) - time(a.pushedAt),
};

function param(key: string): string | null {
  return new URLSearchParams(window.location.search).get(key);
}

export default function PluginExplorer({
  docs,
  categories,
  initialCategory = 'all',
  initialSort = 'score',
  lang = DEFAULT_LOCALE,
}: Props) {
  const t = useTranslations(lang);
  // These start at their defaults so the first client render matches the
  // server's. Reading the URL or localStorage in a lazy initialiser instead
  // would make `/plugins?q=x` hydrate with different text than was rendered,
  // and React throws the whole tree away and rebuilds it.
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(initialCategory);
  const [sort, setSort] = useState<SortId>(initialSort);
  const [health, setHealth] = useState<HealthId>('all');
  const [view, setView] = useState<ViewId>('list');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [restored, setRestored] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const deferredQuery = useDeferredValue(query);
  // Category pages scope their own dataset, so they render without a sidebar.
  const hasCategories = categories.length > 0;

  // Restore from the URL (`?q=…` deep links) and from the remembered view
  // once, after mount.
  useEffect(() => {
    const q = param('q');
    if (q) setQuery(q);
    const c = param('category');
    if (c) setCategory(c);
    const s = param('sort') as SortId | null;
    if (s && s in comparators) setSort(s);
    if (window.localStorage.getItem('opendock:view') === 'grid') setView('grid');
    setRestored(true);
  }, []);

  useEffect(() => {
    // Writing before the restore above would wipe the incoming query string.
    if (!restored) return;
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (category !== 'all') params.set('category', category);
    if (sort !== initialSort) params.set('sort', sort);
    const qs = params.toString();
    // Pass the existing state through. ClientRouter keeps its own {index,
    // scrollX, scrollY} on every entry and reads it back on popstate —
    // replacing it with null leaves the entry unmanaged, so going back to
    // this page changes the URL without ever swapping the document.
    window.history.replaceState(window.history.state, '', qs ? `?${qs}` : window.location.pathname);
  }, [query, category, sort, initialSort, restored]);

  useEffect(() => {
    if (!restored) return;
    window.localStorage.setItem('opendock:view', view);
  }, [view, restored]);

  const fuse = useMemo(
    () =>
      new Fuse(docs, {
        keys: [
          { name: 'title', weight: 3 },
          { name: 'name', weight: 3 },
          { name: 'description', weight: 2 },
          { name: 'keywords', weight: 1.5 },
          { name: 'owner', weight: 1 },
        ],
        // 0.35 is one step over a cliff: Fuse allows floor(threshold * query
        // length) errors, so at 0.35 a 3-letter query like "git" is allowed
        // one edit anywhere in any field and matches 1479 of 1481 plugins.
        // 0.3 keeps a one-character typo working for longer queries while
        // "git" drops to 112 real hits.
        threshold: 0.3,
        ignoreLocation: true,
        minMatchCharLength: 2,
      }),
    [docs],
  );

  const results = useMemo(() => {
    const q = deferredQuery.trim();
    // Fuse orders by relevance; only re-sort when the user isn't searching.
    let list = q ? fuse.search(q).map((r) => r.item) : [...docs].sort(comparators[sort]);

    if (category !== 'all') list = list.filter((p) => p.category === category);
    if (health === 'healthy') list = list.filter((p) => p.healthLevel === 'ok');
    if (health === 'has-repo') list = list.filter((p) => p.stars > 0 || p.healthLevel !== 'danger');

    return list;
  }, [deferredQuery, fuse, docs, sort, category, health]);

  useEffect(() => setVisible(PAGE_SIZE), [deferredQuery, category, sort, health]);

  // Scrolling to the end loads the next page on its own — with 1000+ rows,
  // clicking "load more" twenty times isn't browsing.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || visible >= results.length) return;
    const io = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setVisible((v) => v + PAGE_SIZE),
      { rootMargin: '600px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible, results.length]);

  const reset = useCallback(() => {
    setQuery('');
    setCategory(initialCategory);
    setHealth('all');
    setSort(initialSort);
    inputRef.current?.focus();
  }, [initialCategory, initialSort]);

  const searching = Boolean(deferredQuery.trim());
  // Fuse orders by relevance and the two date sorts order by time, so the
  // position number means nothing there — show it as a plain row index
  // instead of a medal, which reads as "#1 in the ecosystem".
  const ranked = !searching && sort !== 'recent' && sort !== 'updated';
  const activeFilters = (category !== initialCategory ? 1 : 0) + (health !== 'all' ? 1 : 0) + (searching ? 1 : 0);

  const categoryLabels = useMemo(() => new Map(categories.map((c) => [c.id, c.label])), [categories]);

  const filterPanel = (
    <>
      {hasCategories && (
        <FilterGroup title={t('explorer.groupCategory')}>
          <FilterItem active={category === 'all'} count={docs.length} onClick={() => setCategory('all')}>
            {t('explorer.allCategories')}
          </FilterItem>
          {categories.map((c) => (
            <FilterItem
              key={c.id}
              active={category === c.id}
              count={c.count}
              title={c.description}
              onClick={() => setCategory(c.id)}
            >
              {c.label}
            </FilterItem>
          ))}
        </FilterGroup>
      )}

      <FilterGroup title={t('explorer.groupHealth')}>
        {HEALTH_FILTERS.map((id) => (
          <FilterItem
            key={id}
            active={health === id}
            title={t(`explorer.health.${id}.hint` as const)}
            onClick={() => setHealth(id)}
          >
            {t(`explorer.health.${id}` as const)}
          </FilterItem>
        ))}
      </FilterGroup>
    </>
  );

  return (
    <div className={cn(hasCategories && 'lg:grid lg:grid-cols-[14rem_1fr] lg:gap-8')}>
      {/* ---- sidebar (desktop) ---- */}
      {hasCategories && (
        <aside className="hidden lg:block">
          <div className="sticky top-28 space-y-7 rounded-2xl border border-border/80 bg-card p-4 shadow-xs">
            {filterPanel}
          </div>
        </aside>
      )}

      <div className="min-w-0">
        {/* ---- Top Toolbar ---- */}
        <div className="sticky top-14 z-30 -mx-4 border-b border-border/80 bg-background/90 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input Box */}
            <div className="relative min-w-[200px] flex-1">
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z"
                  clipRule="evenodd"
                />
              </svg>
              <input
                ref={inputRef}
                data-plugin-search
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('explorer.searchPlaceholder')}
                aria-label={t('explorer.searchAria')}
                className={cn(
                  'h-10 w-full rounded-xl border border-input bg-card pr-14 pl-10 text-sm text-foreground transition-all',
                  'placeholder:text-muted-foreground/70 focus:border-foreground/80 focus:ring-4 focus:ring-foreground/5 focus:outline-none',
                  '[&::-webkit-search-cancel-button]:hidden',
                )}
              />
              <div className="absolute top-1/2 right-2.5 -translate-y-1/2 flex items-center gap-1">
                {query ? (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      inputRef.current?.focus();
                    }}
                    className="grid size-5 place-items-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    title={t('explorer.clearSearch')}
                  >
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="size-2.5">
                      <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
                    </svg>
                  </button>
                ) : (
                  <kbd className="hidden rounded-md border border-border bg-muted/80 px-1.5 py-0.5 font-mono text-[0.625rem] text-muted-foreground sm:inline-block">
                    /
                  </kbd>
                )}
              </div>
            </div>

            {/* Mobile Filter Trigger Button */}
            <button
              type="button"
              onClick={() => setFiltersOpen((o) => !o)}
              aria-expanded={filtersOpen}
              className={cn(
                'h-10 shrink-0 rounded-xl border px-3 text-xs font-semibold transition-all sm:text-sm',
                hasCategories ? 'lg:hidden' : 'hidden',
                activeFilters > 0 && !searching
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-input bg-card hover:bg-secondary',
              )}
            >
              {t('explorer.filters')}
              {activeFilters - (searching ? 1 : 0) > 0 && (
                <span className="tabular ml-1.5 rounded-full bg-dock px-1.5 py-0.5 text-[0.625rem] font-bold text-dock-foreground">
                  {activeFilters - (searching ? 1 : 0)}
                </span>
              )}
            </button>

            {/* Sort Dropdown */}
            <div className="relative shrink-0">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortId)}
                aria-label={t('explorer.sortAria')}
                disabled={searching}
                title={searching ? t('explorer.sortWhileSearching') : t(`explorer.sort.${sort}.hint` as const)}
                className={cn(
                  'h-10 cursor-pointer appearance-none rounded-xl border border-input bg-card pr-8 pl-3 text-xs font-medium text-foreground transition-all sm:text-sm',
                  'focus:border-foreground/80 focus:ring-4 focus:ring-foreground/5 focus:outline-none hover:border-foreground/30',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                )}
              >
                {SORTS.map((id) => (
                  <option key={id} value={id}>
                    {t(`explorer.sort.${id}` as const)}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground">
                <svg viewBox="0 0 20 20" fill="currentColor" className="size-4">
                  <path
                    fillRule="evenodd"
                    d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>

            {/* View Mode Switcher */}
            <div className="hidden shrink-0 items-center rounded-xl border border-input bg-card p-1 sm:flex">
              <ViewButton active={view === 'list'} onClick={() => setView('list')} label={t('explorer.viewList')}>
                <path d="M2 4h12M2 8h12M2 12h12" />
              </ViewButton>
              <ViewButton active={view === 'grid'} onClick={() => setView('grid')} label={t('explorer.viewGrid')}>
                <path d="M2.5 2.5h4.5v4.5H2.5zM9 2.5h4.5v4.5H9zM2.5 9h4.5v4.5H2.5zM9 9h4.5v4.5H9z" />
              </ViewButton>
            </div>
          </div>

          {/* Quick Health Status Pills (Visible on all screen sizes) */}
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="font-mono text-[0.6875rem] text-muted-foreground mr-1">{t('explorer.quickFilter')}</span>
            {HEALTH_FILTERS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setHealth(id)}
                title={t(`explorer.health.${id}.hint` as const)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all',
                  health === id
                    ? 'border-foreground bg-foreground text-background shadow-xs'
                    : 'border-border/80 bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground',
                )}
              >
                {id === 'healthy' && (
                  <span className={cn('size-1.5 rounded-full', health === id ? 'bg-background' : 'bg-ok')} />
                )}
                {id === 'has-repo' && (
                  <svg viewBox="0 0 16 16" fill="currentColor" className="size-3">
                    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
                  </svg>
                )}
                {t(`explorer.health.${id}` as const)}
              </button>
            ))}
          </div>

          {/* Mobile Collapsible Filter Drawer */}
          {filtersOpen && hasCategories && (
            <div className="mt-3 max-h-[60vh] space-y-6 overflow-y-auto rounded-xl border border-border bg-card p-4 shadow-lg lg:hidden">
              {filterPanel}
            </div>
          )}
        </div>

        {/* ---- Result Meta Bar ---- */}
        <div className="flex items-center justify-between gap-3 py-4 text-xs sm:text-sm text-muted-foreground">
          <p className="tabular">
            {results.length === docs.length
              ? t('explorer.total', { n: docs.length })
              : t('explorer.matches', { n: results.length })}
            {searching && (
              <span className="ml-2 rounded bg-secondary px-1.5 py-0.5 text-[0.6875rem]">{t('explorer.byRelevance')}</span>
            )}
          </p>

          {activeFilters > 0 && (
            <button
              onClick={reset}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="size-2.5">
                <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
              </svg>
              <span>{t('explorer.clearFilters')}</span>
            </button>
          )}
        </div>

        {/* ---- Results List / Grid ---- */}
        {results.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/80 bg-card/40 px-6 py-20 text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-secondary text-muted-foreground">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            </div>
            <p className="mt-4 text-base font-semibold text-foreground">{t('explorer.emptyTitle')}</p>
            <p className="mx-auto mt-1.5 max-w-sm text-xs leading-5 text-muted-foreground">
              {t('explorer.emptyBody')}
            </p>
            <button
              onClick={reset}
              className="mt-5 inline-flex items-center rounded-xl bg-foreground px-4 py-2 text-xs font-semibold text-background transition-opacity hover:opacity-90 shadow-sm"
            >
              {t('explorer.emptyReset')}
            </button>
          </div>
        ) : view === 'grid' ? (
          <ul className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
            {results.slice(0, visible).map((p, i) => (
              <li key={p.slug}>
                <Card doc={p} rank={ranked ? i + 1 : undefined} categoryLabel={categoryLabels.get(p.category)} lang={lang} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="space-y-2.5">
            {results.slice(0, visible).map((p, i) => (
              <Row
                key={p.slug}
                doc={p}
                rank={i + 1}
                ranked={ranked}
                categoryLabel={hasCategories ? (categoryLabels.get(p.category) ?? '') : undefined}
                onSelectCategory={(catId) => setCategory(catId)}
                lang={lang}
              />
            ))}
          </div>
        )}

        {/* ---- Load More Sentinel ---- */}
        {visible < results.length && (
          <div ref={sentinelRef} className="mt-8 flex justify-center pb-8">
            <button
              onClick={() => setVisible((v) => v + PAGE_SIZE)}
              className="rounded-xl border border-border/80 bg-card px-6 py-2.5 text-xs font-semibold text-foreground transition-all hover:bg-secondary hover:shadow-xs"
            >
              {t('explorer.loadMore', { n: results.length - visible })}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 px-2 text-[0.6875rem] font-bold tracking-wider text-muted-foreground uppercase">{title}</h3>
      <ul className="space-y-0.5">{children}</ul>
    </div>
  );
}

function FilterItem({
  active,
  count,
  title,
  onClick,
  children,
}: {
  active: boolean;
  count?: number;
  title?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        title={title}
        aria-pressed={active}
        className={cn(
          'group relative flex w-full items-center justify-between gap-2 rounded-xl py-1.5 pr-2.5 pl-3 text-left text-xs transition-all',
          active
            ? 'bg-foreground font-semibold text-background shadow-xs'
            : 'text-muted-foreground hover:bg-secondary/70 hover:text-foreground',
        )}
      >
        <span className="min-w-0 flex-1 truncate">{children}</span>
        {count !== undefined && (
          <span
            className={cn(
              'tabular font-mono text-[0.6875rem]',
              active ? 'text-background/80' : 'text-muted-foreground/60 group-hover:text-muted-foreground',
            )}
          >
            {count}
          </span>
        )}
      </button>
    </li>
  );
}

function ViewButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cn(
        'rounded-lg p-1.5 transition-all',
        active ? 'bg-secondary text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      <svg
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        className="size-4"
        aria-hidden="true"
      >
        {children}
      </svg>
    </button>
  );
}

const HEALTH_DOT: Record<string, string> = {
  ok: 'bg-ok',
  warn: 'bg-warn',
  danger: 'bg-danger',
};



/** Redesigned modern row component */
function Row({
  doc: p,
  rank,
  ranked,
  categoryLabel,
  onSelectCategory,
  lang,
}: {
  doc: SearchDoc;
  rank: number;
  /** False when the order isn't a ranking — see `ranked` in the parent. */
  ranked: boolean;
  categoryLabel?: string;
  onSelectCategory?: (catId: string) => void;
  lang: Locale;
}) {
  const t = useTranslations(lang);
  const isTop1 = ranked && rank === 1;
  const isTop2 = ranked && rank === 2;
  const isTop3 = ranked && rank === 3;

  return (
    <div
      className={cn(
        'group relative flex flex-col justify-between gap-3 rounded-2xl border border-border/80 bg-card p-4 transition-all duration-200',
        'hover:-translate-x-0.5 hover:border-foreground/30 hover:bg-secondary/35 hover:shadow-xs sm:flex-row sm:items-center sm:gap-4',
      )}
    >
      {/* The whole row is one click target, but the category chip is a second
          one, and a <button> inside an <a> is not valid HTML. So the link is
          an overlay and the chip sits on a layer above it. */}
      <a
        href={localePath(lang, `/plugins/${p.slug}`)}
        aria-label={p.title}
        className="absolute inset-0 z-10 rounded-2xl focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:outline-none"
      />
      {/* Left Pod: Rank + Avatar + Plugin Identity */}
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        {/* Rank Badge */}
        <span
          className={cn(
            'tabular flex size-7 shrink-0 items-center justify-center rounded-xl font-mono text-xs font-bold shadow-2xs',
            isTop1
              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
              : isTop2
                ? 'bg-slate-400/15 text-slate-600 dark:text-slate-300'
                : isTop3
                  ? 'bg-orange-600/15 text-orange-600 dark:text-orange-400'
                  : 'bg-muted/80 text-muted-foreground',
          )}
        >
          {String(rank).padStart(2, '0')}
        </span>

        {/* Plugin Avatar with Health Status indicator */}
        <div className="relative size-9 shrink-0">
          <div className="size-full overflow-hidden rounded-xl border border-border/80 bg-secondary/50 shadow-2xs">
            {p.ownerAvatar ? (
              <img
                src={avatarUrl(p.ownerAvatar, 36)}
                alt={p.owner ?? p.name}
                width={36}
                height={36}
                className="size-full object-cover"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div className="flex size-full items-center justify-center font-mono text-xs font-bold text-foreground/70">
                {(p.owner ?? p.name).charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <span
            className={cn('lamp absolute -top-0.5 -right-0.5 z-10 ring-2 ring-card', HEALTH_DOT[p.healthLevel])}
            title={t(`health.tip.${p.healthLevel}` as const)}
          />
        </div>

        {/* Core details */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-semibold tracking-tight text-foreground transition-colors group-hover:text-foreground">
              {p.title}
            </span>

            {p.featured && (
              <span className="rounded bg-foreground px-1.5 py-0.5 text-[0.625rem] font-bold text-background">
                {t('common.featured')}
              </span>
            )}

            {categoryLabel && (
              <button
                type="button"
                onClick={() => onSelectCategory?.(p.category)}
                className="relative z-20 rounded-md border border-border/60 bg-secondary/70 px-2 py-0.5 text-[0.6875rem] font-medium text-foreground/80 transition-colors hover:border-foreground/40 hover:bg-secondary"
                title={t('explorer.filterBy', { category: categoryLabel ?? '' })}
              >
                {categoryLabel}
              </button>
            )}
          </div>

          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
            <span className="font-mono text-foreground/60 mr-2">{p.name}</span>
            {p.description ?? t('common.noDescription')}
          </p>
        </div>
      </div>

      {/* Right Pod: Metrics & Score */}
      <div className="flex shrink-0 items-center justify-between gap-4 self-end pl-10 font-mono text-xs text-muted-foreground sm:self-center sm:pl-0">
        {/* Stars */}
        <span className="tabular inline-flex items-center gap-1" title={t('common.stars')}>
          <svg viewBox="0 0 16 16" fill="currentColor" className="size-3.5 text-amber-500" aria-hidden="true">
            <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z" />
          </svg>
          <span className="font-medium text-foreground">{compactNumber(p.stars)}</span>
          {p.starsDelta7d > 0 && (
            <span className="text-[0.6875rem] font-bold text-ok" title={t('explorer.starsDelta')}>
              +{compactNumber(p.starsDelta7d)}
            </span>
          )}
        </span>

        {/* Downloads */}
        <span className="tabular hidden items-center gap-1 sm:inline-flex" title={t('explorer.downloadsTitle')}>
          <svg viewBox="0 0 16 16" fill="currentColor" className="size-3.5 text-muted-foreground/70" aria-hidden="true">
            <path d="M7.25 1.75a.75.75 0 0 1 1.5 0v6.44l2.22-2.22a.75.75 0 1 1 1.06 1.06l-3.5 3.5a.75.75 0 0 1-1.06 0l-3.5-3.5a.75.75 0 0 1 1.06-1.06l2.22 2.22V1.75ZM2.5 11a.75.75 0 0 1 .75.75v1.5h9.5v-1.5a.75.75 0 0 1 1.5 0v2.25a.75.75 0 0 1-.75.75H2.5a.75.75 0 0 1-.75-.75v-2.25A.75.75 0 0 1 2.5 11Z" />
          </svg>
          <span>{compactNumber(p.downloadsMonth)}</span>
        </span>

        {/* Updated Time */}
        <span className="hidden truncate text-[0.6875rem] text-muted-foreground/80 md:inline-block" title={t('common.updated')}>
          {timeAgo(p.pushedAt, lang)}
        </span>

        {/* Score Badge */}
        <span
          className="tabular rounded-md border border-border/70 bg-secondary px-2 py-0.5 text-xs font-semibold text-foreground"
          title={t('common.score')}
        >
          {p.score.toFixed(0)}
        </span>

        {/* Arrow */}
        <span className="text-xs text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all">
          →
        </span>
      </div>
    </div>
  );
}

/** Redesigned modern card component */
function Card({
  doc: p,
  rank,
  categoryLabel,
  lang,
}: {
  doc: SearchDoc;
  rank?: number;
  categoryLabel?: string;
  lang: Locale;
}) {
  const t = useTranslations(lang);
  return (
    <a
      href={localePath(lang, `/plugins/${p.slug}`)}
      className={cn(
        'group flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-card p-5 transition-all duration-200',
        'hover:-translate-y-1 hover:border-foreground/30 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)]',
        'dark:hover:shadow-[0_8px_30px_rgb(0,0,0,0.35)]',
      )}
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Avatar with health status */}
            <div className="relative size-10 shrink-0">
              <div className="size-full overflow-hidden rounded-xl border border-border/80 bg-secondary/50 shadow-2xs">
                {p.ownerAvatar ? (
                  <img
                    src={avatarUrl(p.ownerAvatar, 40)}
                    alt={p.owner ?? p.name}
                    width={40}
                    height={40}
                    className="size-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center font-mono text-xs font-bold text-foreground/70">
                    {(p.owner ?? p.name).charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <span
                className={cn('lamp absolute -top-0.5 -right-0.5 z-10 ring-2 ring-card', HEALTH_DOT[p.healthLevel])}
                title={t(`health.tip.${p.healthLevel}` as const)}
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                {rank !== undefined && (
                  <span className="tabular shrink-0 font-mono text-xs font-bold text-muted-foreground/70">
                    #{String(rank).padStart(2, '0')}
                  </span>
                )}
                <h3 className="truncate text-sm font-semibold tracking-tight text-foreground">{p.title}</h3>
              </div>
              <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">{p.name}</p>
            </div>
          </div>

          <span
            className="tabular shrink-0 rounded-md border border-border/70 bg-secondary px-2 py-0.5 text-xs font-semibold text-foreground"
            title={t('common.score')}
          >
            {p.score.toFixed(0)}
          </span>
        </div>

        <p className="mt-3.5 line-clamp-2 min-h-[2.5rem] text-xs leading-relaxed text-muted-foreground">
          {p.description ?? t('common.noDescription')}
        </p>

        {/* Category Pill & Keywords */}
        <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
          {categoryLabel && (
            <span className="rounded-md border border-border/60 bg-secondary/70 px-2 py-0.5 text-[0.6875rem] font-medium text-foreground/80">
              {categoryLabel}
            </span>
          )}
          {p.keywords && p.keywords.slice(0, 2).map((k) => (
            <span key={k} className="rounded border border-border/40 bg-secondary/40 px-1.5 py-0.5 font-mono text-[0.625rem] text-muted-foreground">
              #{k}
            </span>
          ))}
        </div>
      </div>

      {/* Bottom stats */}
      <div className="mt-5 flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted-foreground font-mono">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1" title={t('common.stars')}>
            <svg viewBox="0 0 16 16" fill="currentColor" className="size-3.5 text-amber-500" aria-hidden="true">
              <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z" />
            </svg>
            <span className="tabular font-medium text-foreground">{compactNumber(p.stars)}</span>
          </span>

          <span className="inline-flex items-center gap-1" title={t('explorer.downloadsTitle')}>
            <svg viewBox="0 0 16 16" fill="currentColor" className="size-3.5 text-muted-foreground/70" aria-hidden="true">
              <path d="M7.25 1.75a.75.75 0 0 1 1.5 0v6.44l2.22-2.22a.75.75 0 1 1 1.06 1.06l-3.5 3.5a.75.75 0 0 1-1.06 0l-3.5-3.5a.75.75 0 0 1 1.06-1.06l2.22 2.22V1.75ZM2.5 11a.75.75 0 0 1 .75.75v1.5h9.5v-1.5a.75.75 0 0 1 1.5 0v2.25a.75.75 0 0 1-.75.75H2.5a.75.75 0 0 1-.75-.75v-2.25A.75.75 0 0 1 2.5 11Z" />
            </svg>
            <span className="tabular">{compactNumber(p.downloadsMonth)}</span>
          </span>
        </div>

        <span className="text-[0.6875rem] text-muted-foreground/75 font-sans">
          {timeAgo(p.pushedAt, lang)}
        </span>
      </div>
    </a>
  );
}
