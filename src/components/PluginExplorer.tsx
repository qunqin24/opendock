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
  const activeFilters = (category !== initialCategory ? 1 : 0) + (health !== 'all' ? 1 : 0) + (searching ? 1 : 0);

  // The dataset carries both languages on every category; pick per locale
  // rather than rendering the raw (Chinese) `label` field.
  const catLabel = (c: Category) => (lang === 'zh' ? c.label : c.labelEn);
  const catDescription = (c: Category) => (lang === 'zh' ? c.description : c.descriptionEn);
  const categoryLabels = useMemo(
    () => new Map(categories.map((c) => [c.id, lang === 'zh' ? c.label : c.labelEn])),
    [categories, lang],
  );

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
              title={catDescription(c)}
              onClick={() => setCategory(c.id)}
            >
              {catLabel(c)}
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
          <div className="sticky top-32 space-y-7">{filterPanel}</div>
        </aside>
      )}

      <div className="min-w-0">
        {/* ---- Top Toolbar ---- */}
        <div className="sticky top-14 z-30 -mx-4 border-b border-border/80 bg-background/90 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input Box */}
            <div className="relative min-w-[200px] flex-1">
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground"
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
                  'h-9 w-full rounded-md border border-input bg-card pr-12 pl-9 text-sm text-foreground transition-colors',
                  'placeholder:text-muted-foreground/70 focus:border-foreground/50 focus:outline-none',
                  '[&::-webkit-search-cancel-button]:hidden',
                )}
              />
              <div className="absolute top-1/2 right-2 -translate-y-1/2 flex items-center gap-1">
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
                  <kbd className="hidden rounded border border-border bg-muted/80 px-1.5 py-0.5 font-mono text-[0.625rem] text-muted-foreground sm:inline-block">
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
                'h-9 shrink-0 rounded-md border px-3 text-xs font-medium transition-colors',
                hasCategories ? 'lg:hidden' : 'hidden',
                activeFilters > 0 && !searching
                  ? 'border-foreground/40 bg-secondary text-foreground'
                  : 'border-input bg-card text-muted-foreground hover:text-foreground',
              )}
            >
              {t('explorer.filters')}
              {activeFilters - (searching ? 1 : 0) > 0 && (
                <span className="tabular ml-1.5 font-mono text-[0.625rem] opacity-80">
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
                  'h-9 cursor-pointer appearance-none rounded-md border border-input bg-card pr-8 pl-3 text-xs font-medium text-foreground transition-colors',
                  'focus:border-foreground/50 focus:outline-none hover:border-foreground/30',
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
                <svg viewBox="0 0 20 20" fill="currentColor" className="size-3.5">
                  <path
                    fillRule="evenodd"
                    d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>

            {/* View Mode Switcher */}
            <div className="hidden shrink-0 items-center rounded-md border border-input bg-card p-0.5 sm:flex">
              <ViewButton active={view === 'list'} onClick={() => setView('list')} label={t('explorer.viewList')}>
                <path d="M2 4h12M2 8h12M2 12h12" />
              </ViewButton>
              <ViewButton active={view === 'grid'} onClick={() => setView('grid')} label={t('explorer.viewGrid')}>
                <path d="M2.5 2.5h4.5v4.5H2.5zM9 2.5h4.5v4.5H9zM2.5 9h4.5v4.5H2.5zM9 9h4.5v4.5H9z" />
              </ViewButton>
            </div>
          </div>

          {/* Mobile Collapsible Filter Drawer */}
          {filtersOpen && hasCategories && (
            <div className="mt-3 max-h-[60vh] space-y-6 overflow-y-auto rounded-lg border border-border bg-card p-4 lg:hidden">
              {filterPanel}
            </div>
          )}
        </div>

        {/* ---- Result Meta Bar ---- */}
        <div className="flex items-center justify-between gap-3 py-3 font-mono text-xs text-muted-foreground">
          <p className="tabular">
            {results.length === docs.length
              ? t('explorer.total', { n: docs.length })
              : t('explorer.matches', { n: results.length })}
            {searching && (
              <span className="ml-2 rounded border border-border/70 px-1.5 py-0.5 text-[0.6875rem]">{t('explorer.byRelevance')}</span>
            )}
          </p>

          {activeFilters > 0 && (
            <button
              onClick={reset}
              className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
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
          <div className="rounded-lg border border-dashed border-border/80 px-6 py-20 text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-lg bg-secondary text-muted-foreground">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            </div>
            <p className="mt-4 text-base font-medium text-foreground">{t('explorer.emptyTitle')}</p>
            <p className="mx-auto mt-1.5 max-w-sm text-xs leading-5 text-muted-foreground">
              {t('explorer.emptyBody')}
            </p>
            <button
              onClick={reset}
              className="mt-5 inline-flex items-center rounded-md bg-foreground px-4 py-2 text-xs font-medium text-background transition-opacity hover:opacity-85"
            >
              {t('explorer.emptyReset')}
            </button>
          </div>
        ) : view === 'grid' ? (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {results.slice(0, visible).map((p, i) => (
              <li key={p.slug}>
                <Card doc={p} rank={i + 1} categoryLabel={categoryLabels.get(p.category)} lang={lang} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border/80 bg-card">
            {/* Column header — mirrors the row's fixed column widths */}
            <div className="meta hidden items-center gap-3 border-b border-border/80 bg-secondary/40 px-4 py-2 text-muted-foreground sm:flex">
              <span className="w-6 shrink-0">#</span>
              <span className="min-w-0 flex-1">{t('explorer.col.plugin')}</span>
              {hasCategories && (
                <span className="hidden w-28 shrink-0 lg:block">{t('explorer.col.category')}</span>
              )}
              <span className="w-20 shrink-0 text-right">{t('explorer.col.stars')}</span>
              <span className="hidden w-20 shrink-0 text-right md:block">{t('explorer.col.downloads')}</span>
              <span className="hidden w-24 shrink-0 text-right lg:block">{t('explorer.col.updated')}</span>
            </div>
            <ul className="divide-y divide-border/70">
              {results.slice(0, visible).map((p, i) => (
                <li key={p.slug}>
                  <Row
                    doc={p}
                    rank={i + 1}
                    categoryLabel={hasCategories ? (categoryLabels.get(p.category) ?? '') : undefined}
                    onSelectCategory={(catId) => setCategory(catId)}
                    lang={lang}
                  />
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ---- Load More Sentinel ---- */}
        {visible < results.length && (
          <div ref={sentinelRef} className="mt-8 flex justify-center pb-8">
            <button
              onClick={() => setVisible((v) => v + PAGE_SIZE)}
              className="rounded-md border border-border/80 px-6 py-2 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
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
      <h3 className="meta mb-2 px-2 text-muted-foreground">{title}</h3>
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
          'group relative flex w-full items-center justify-between gap-2 rounded-md py-1.5 pr-2.5 pl-3 text-left text-xs transition-colors',
          active
            ? 'bg-secondary font-medium text-foreground'
            : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
        )}
      >
        <span className="min-w-0 flex-1 truncate">{children}</span>
        {count !== undefined && (
          <span className="tabular font-mono text-[0.6875rem] text-muted-foreground/70">{count}</span>
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
          'rounded-[0.25rem] p-1.5 transition-colors',
          active ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground',
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



/** One line in the registry table — index, identity, then aligned metrics. */
function Row({
  doc: p,
  rank,
  categoryLabel,
  onSelectCategory,
  lang,
}: {
  doc: SearchDoc;
  rank: number;
  categoryLabel?: string;
  onSelectCategory?: (catId: string) => void;
  lang: Locale;
}) {
  const t = useTranslations(lang);

  return (
    <div className="group relative flex items-center gap-3 px-3 py-3 transition-colors hover:bg-secondary/50 sm:px-4">
      {/* The whole row is one click target, but the category cell is a second
          one, and a <button> inside an <a> is not valid HTML. So the link is
          an overlay and the category button sits on a layer above it. */}
      <a
        href={localePath(lang, `/plugins/${p.slug}`)}
        aria-label={p.title}
        className="absolute inset-0 z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-foreground/40 focus-visible:outline-none"
      />

      <span className="tabular hidden w-6 shrink-0 font-mono text-xs text-muted-foreground/60 sm:block">
        {rank}
      </span>

      {/* Avatar with maintenance lamp */}
      <div className="relative size-8 shrink-0">
        <div className="size-full overflow-hidden rounded-md border border-border/80 bg-secondary/50">
          {p.ownerAvatar ? (
            <img
              src={avatarUrl(p.ownerAvatar, 32)}
              alt={p.owner ?? p.name}
              width={32}
              height={32}
              className="size-full object-cover"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="flex size-full items-center justify-center font-mono text-xs text-foreground/70">
              {(p.owner ?? p.name).charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <span
          className={cn('lamp absolute -top-0.5 -right-0.5 z-10 ring-2 ring-card', HEALTH_DOT[p.healthLevel])}
          title={t(`health.tip.${p.healthLevel}` as const)}
        />
      </div>

      {/* Identity */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">{p.title}</span>
          {p.featured && (
            <span className="shrink-0 font-mono text-[0.625rem] tracking-[0.08em] text-amber-600 uppercase dark:text-amber-500">
              {t('common.featured')}
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          <span className="mr-2 font-mono text-foreground/50">{p.name}</span>
          {p.description ?? t('common.noDescription')}
        </p>
      </div>

      {/* Category (plain text, click to filter) */}
      {categoryLabel !== undefined && (
        <button
          type="button"
          onClick={() => onSelectCategory?.(p.category)}
          className="relative z-20 hidden w-28 shrink-0 truncate text-left text-xs text-muted-foreground transition-colors hover:text-foreground lg:block"
          title={t('explorer.filterBy', { category: categoryLabel })}
        >
          {categoryLabel}
        </button>
      )}

      {/* Metrics — fixed widths, aligned with the column header */}
      <span
        className="tabular flex w-20 shrink-0 items-center justify-end gap-1 font-mono text-xs"
        title={t('common.stars')}
      >
        <svg viewBox="0 0 16 16" fill="currentColor" className="size-3 text-amber-500" aria-hidden="true">
          <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z" />
        </svg>
        <span className="font-medium text-foreground">{compactNumber(p.stars)}</span>
        {p.starsDelta7d > 0 && (
          <span className="text-[0.6875rem] text-ok" title={t('explorer.starsDelta')}>
            +{compactNumber(p.starsDelta7d)}
          </span>
        )}
      </span>

      <span
        className="tabular hidden w-20 shrink-0 text-right font-mono text-xs text-muted-foreground md:block"
        title={t('explorer.downloadsTitle')}
      >
        {compactNumber(p.downloadsMonth)}
      </span>

      <span
        className="hidden w-24 shrink-0 text-right text-xs text-muted-foreground/80 lg:block"
        title={t('common.updated')}
      >
        {timeAgo(p.pushedAt, lang)}
      </span>
    </div>
  );
}

/** Card for the grid view — same content hierarchy as the table row. */
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
      className="group flex h-full flex-col rounded-lg border border-border/80 bg-card p-4 transition-colors hover:border-foreground/25"
    >
      <div className="flex items-center gap-3">
        {/* Avatar with maintenance lamp */}
        <div className="relative size-9 shrink-0">
          <div className="size-full overflow-hidden rounded-md border border-border/80 bg-secondary/50">
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
              <div className="flex size-full items-center justify-center font-mono text-xs text-foreground/70">
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
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-medium text-foreground">{p.title}</h3>
            {p.featured && (
              <span className="shrink-0 font-mono text-[0.625rem] tracking-[0.08em] text-amber-600 uppercase dark:text-amber-500">
                {t('common.featured')}
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">{p.name}</p>
        </div>

        {rank !== undefined && (
          <span className="tabular shrink-0 font-mono text-xs text-muted-foreground/60">#{rank}</span>
        )}
      </div>

      <p className="mt-3 line-clamp-2 min-h-[2.5rem] text-xs leading-5 text-muted-foreground">
        {p.description ?? t('common.noDescription')}
      </p>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-border/60 pt-3 font-mono text-xs text-muted-foreground">
        <span className="truncate font-sans text-[0.6875rem]">{categoryLabel ?? ''}</span>
        <span className="flex shrink-0 items-center gap-3">
          <span className="tabular inline-flex items-center gap-1" title={t('common.stars')}>
            <svg viewBox="0 0 16 16" fill="currentColor" className="size-3 text-amber-500" aria-hidden="true">
              <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z" />
            </svg>
            <span className="font-medium text-foreground">{compactNumber(p.stars)}</span>
          </span>
          <span className="tabular" title={t('explorer.downloadsTitle')}>
            {compactNumber(p.downloadsMonth)}
          </span>
        </span>
      </div>
    </a>
  );
}
