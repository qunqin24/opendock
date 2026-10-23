import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Fuse from 'fuse.js';
import type { Category, HealthLevel, SearchDoc } from '../lib/plugins';
import { avatarUrl, cn, compactNumber, formatNumber, letterAvatar, timeAgo } from '../lib/utils';
import { DEFAULT_LOCALE, localePath, pluginDescription, useTranslations, type Locale } from '../lib/i18n';
import { categoryIcons } from '../lib/icons';
import { authorSlug } from '../lib/author-slug';
import { getCompare, onCompareChange, toggleCompare } from '../lib/compare-store';

/**
 * The plugin table: faceted filters on the left, a sortable table on the
 * right. Every facet option shows how many plugins it would leave given the
 * other filters, so a click never lands on an empty table. Below lg the
 * filters move into a sheet and the table collapses into compact rows.
 */

const PAGE_SIZE = 60;

const SORTS = ['score', 'stars', 'trending', 'downloads', 'updated', 'recent'] as const;
type SortId = (typeof SORTS)[number];
type Dir = 'desc' | 'asc';

const LEVELS: HealthLevel[] = ['ok', 'warn', 'danger'];
const UPDATED = ['any', 'week', 'month', 'half'] as const;
type UpdatedId = (typeof UPDATED)[number];
const UPDATED_DAYS: Record<UpdatedId, number> = { any: Infinity, week: 7, month: 30, half: 182 };
const MIN_STARS = ['any', '10', '100', '1000'] as const;
type MinStarsId = (typeof MIN_STARS)[number];
// "v2" and "v1" mean "known to run on it", so a V1 + V2 plugin is in both.
const COMPAT = ['any', 'v2', 'v1', 'unknown'] as const;
type CompatId = (typeof COMPAT)[number];
const compatMatch = (d: SearchDoc, c: CompatId) =>
  c === 'any' || (c === 'unknown' ? !d.opencode : d.opencode === c || d.opencode === 'both');

const time = (iso: string | null) => (iso ? new Date(iso).getTime() : 0);

const sortValue: Record<SortId, (d: SearchDoc) => number> = {
  score: (d) => d.score,
  stars: (d) => d.stars,
  trending: (d) => d.starsDelta7d,
  downloads: (d) => d.downloadsMonth,
  updated: (d) => time(d.pushedAt),
  recent: (d) => time(d.createdAt),
};

interface Props {
  docs: SearchDoc[];
  categories: Category[];
  /** Preselects a category, e.g. when embedded on a category page. */
  initialCategory?: string;
  initialSort?: SortId;
  lang?: Locale;
}

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
  // Defaults on the first render so hydration matches the server's HTML;
  // the URL is read after mount.
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(initialCategory);
  const [levels, setLevels] = useState<HealthLevel[]>([]);
  const [updated, setUpdated] = useState<UpdatedId>('any');
  const [minStars, setMinStars] = useState<MinStarsId>('any');
  const [compat, setCompat] = useState<CompatId>('any');
  // Slugs in the compare tray, kept in step with other islands and tabs.
  const [compared, setCompared] = useState<Set<string>>(new Set());
  useEffect(() => {
    const sync = () => setCompared(new Set(getCompare().map((x) => x.s)));
    sync();
    return onCompareChange(sync);
  }, []);
  const [sort, setSort] = useState<SortId>(initialSort);
  const [dir, setDir] = useState<Dir>('desc');
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [restored, setRestored] = useState(false);
  const [view, setView] = useState<'card' | 'table'>('card');
  const inputRef = useRef<HTMLInputElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDialogElement>(null);

  const deferredQuery = useDeferredValue(query);
  const searching = Boolean(deferredQuery.trim());
  // Category pages scope their own dataset, so they render without that facet.
  const hasCategories = categories.length > 0;

  // "Recent" is measured from the newest commit in the data, not from the
  // reader's clock: the server and the browser agree on it, and an old
  // snapshot doesn't read as abandoned.
  const reference = useMemo(() => Math.max(...docs.map((d) => time(d.pushedAt))), [docs]);

  useEffect(() => {
    const q = param('q');
    if (q) setQuery(q);
    const c = param('category');
    if (c) setCategory(c);
    const s = param('sort') as SortId | null;
    if (s && (SORTS as readonly string[]).includes(s)) setSort(s);
    if (param('dir') === 'asc') setDir('asc');
    const h = param('health');
    if (h) setLevels(h.split(',').filter((l): l is HealthLevel => (LEVELS as string[]).includes(l)));
    const u = param('updated') as UpdatedId | null;
    if (u && (UPDATED as readonly string[]).includes(u)) setUpdated(u);
    const m = param('stars') as MinStarsId | null;
    if (m && (MIN_STARS as readonly string[]).includes(m)) setMinStars(m);
    const o = param('opencode') as CompatId | null;
    if (o && (COMPAT as readonly string[]).includes(o)) setCompat(o);
    try {
      if (window.localStorage.getItem('opendock:view') === 'table') setView('table');
    } catch {
      // Storage blocked: cards it is.
    }
    setRestored(true);
  }, []);

  useEffect(() => {
    if (!restored) return;
    try {
      window.localStorage.setItem('opendock:view', view);
    } catch {
      // Storage blocked: the choice just doesn't persist.
    }
  }, [view, restored]);

  useEffect(() => {
    // Writing before the restore above would wipe the incoming query string.
    if (!restored) return;
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (category !== initialCategory) params.set('category', category);
    if (levels.length) params.set('health', levels.join(','));
    if (updated !== 'any') params.set('updated', updated);
    if (minStars !== 'any') params.set('stars', minStars);
    if (compat !== 'any') params.set('opencode', compat);
    if (sort !== initialSort) params.set('sort', sort);
    if (dir === 'asc') params.set('dir', 'asc');
    const qs = params.toString();
    // Keep ClientRouter's own history state; replacing it with null leaves
    // the entry unmanaged and breaks going back to this page.
    window.history.replaceState(window.history.state, '', qs ? `?${qs}` : window.location.pathname);
  }, [query, category, levels, updated, minStars, compat, sort, dir, initialCategory, initialSort, restored]);

  const fuse = useMemo(
    () =>
      new Fuse(docs, {
        keys: [
          { name: 'title', weight: 3 },
          { name: 'name', weight: 3 },
          { name: 'description', weight: 2 },
          // Lets Chinese queries hit the translated text (null on English pages).
          { name: 'descriptionZh', weight: 2 },
          { name: 'keywords', weight: 1.5 },
          { name: 'owner', weight: 1 },
        ],
        // 0.3, not 0.35: Fuse allows floor(threshold × length) edits, so at
        // 0.35 a three-letter query like "git" matches nearly everything.
        threshold: 0.3,
        ignoreLocation: true,
        minMatchCharLength: 2,
      }),
    [docs],
  );

  const searched = useMemo(() => {
    const q = deferredQuery.trim();
    return q ? fuse.search(q).map((r) => r.item) : docs;
  }, [deferredQuery, fuse, docs]);

  // One predicate per facet. Each facet's counts apply every predicate but
  // its own, which is what "how many would this leave" means.
  const predicates = useMemo(() => {
    const days = UPDATED_DAYS[updated];
    const stars = minStars === 'any' ? 0 : Number(minStars);
    return {
      category: (d: SearchDoc) => category === 'all' || d.category === category,
      level: (d: SearchDoc) => !levels.length || levels.includes(d.healthLevel),
      updated: (d: SearchDoc) => days === Infinity || (d.pushedAt !== null && reference - time(d.pushedAt) <= days * 864e5),
      stars: (d: SearchDoc) => d.stars >= stars,
      compat: (d: SearchDoc) => compatMatch(d, compat),
    };
  }, [category, levels, updated, minStars, compat, reference]);

  type Facet = keyof typeof predicates;
  const except = useCallback(
    (skip: Facet) =>
      searched.filter((d) => (Object.keys(predicates) as Facet[]).every((k) => k === skip || predicates[k](d))),
    [searched, predicates],
  );

  const counts = useMemo(() => {
    const byCategory = new Map<string, number>();
    const forCategory = except('category');
    for (const d of forCategory) byCategory.set(d.category, (byCategory.get(d.category) ?? 0) + 1);

    const forLevel = except('level');
    const byLevel = Object.fromEntries(LEVELS.map((l) => [l, forLevel.filter((d) => d.healthLevel === l).length]));

    const forUpdated = except('updated');
    const byUpdated = Object.fromEntries(
      UPDATED.map((u) => {
        const days = UPDATED_DAYS[u];
        return [u, forUpdated.filter((d) => days === Infinity || (d.pushedAt !== null && reference - time(d.pushedAt) <= days * 864e5)).length];
      }),
    );

    const forStars = except('stars');
    const byStars = Object.fromEntries(MIN_STARS.map((m) => [m, forStars.filter((d) => d.stars >= (m === 'any' ? 0 : Number(m))).length]));

    const forCompat = except('compat');
    const byCompat = Object.fromEntries(COMPAT.map((c) => [c, forCompat.filter((d) => compatMatch(d, c)).length]));

    return { byCategory, allCategories: forCategory.length, byLevel, byUpdated, byStars, byCompat };
  }, [except, reference]);

  const results = useMemo(() => {
    const list = searched.filter((d) => (Object.values(predicates) as ((d: SearchDoc) => boolean)[]).every((ok) => ok(d)));
    // While searching, relevance wins unless a column was explicitly chosen.
    if (searching && sort === initialSort && dir === 'desc') return list;
    const value = sortValue[sort];
    const sign = dir === 'desc' ? -1 : 1;
    return [...list].sort((a, b) => sign * (value(a) - value(b)) || b.score - a.score);
  }, [searched, predicates, searching, sort, dir, initialSort]);

  useEffect(() => setVisible(PAGE_SIZE), [deferredQuery, category, levels, updated, minStars, compat, sort, dir]);

  // Scrolling near the end loads the next page on its own.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || visible >= results.length) return;
    const io = new IntersectionObserver(([entry]) => entry.isIntersecting && setVisible((v) => v + PAGE_SIZE), {
      rootMargin: '600px',
    });
    io.observe(el);
    return () => io.disconnect();
  }, [visible, results.length]);

  const toggleSort = (key: SortId) => {
    if (sort === key) setDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    else {
      setSort(key);
      setDir('desc');
    }
  };

  const toggleLevel = (level: HealthLevel) =>
    setLevels((prev) => (prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]));

  const reset = useCallback(() => {
    setQuery('');
    setCategory(initialCategory);
    setLevels([]);
    setUpdated('any');
    setMinStars('any');
    setCompat('any');
  }, [initialCategory]);

  const catLabel = (c: Category) => (lang === 'zh' ? c.label : c.labelEn);
  const categoryLabels = useMemo(
    () => new Map(categories.map((c) => [c.id, lang === 'zh' ? c.label : c.labelEn])),
    [categories, lang],
  );
  const activeCategory = categories.find((c) => c.id === category);

  // Install counts span 0 to 600k+, so their bars use a log scale.
  const maxInstalls = useMemo(() => Math.log10(Math.max(1, ...docs.map((d) => d.downloadsMonth)) + 1), [docs]);

  const colon = lang === 'zh' ? '：' : ': ';
  const chips: { label: string; clear: () => void }[] = [
    ...(searching ? [{ label: t('explorer.chip.search', { q: deferredQuery.trim() }), clear: () => setQuery('') }] : []),
    ...(hasCategories && activeCategory && category !== initialCategory
      ? [{ label: catLabel(activeCategory), clear: () => setCategory(initialCategory) }]
      : []),
    ...levels.map((l) => ({ label: t(`explorer.level.${l}`), clear: () => toggleLevel(l) })),
    ...(updated !== 'any' ? [{ label: `${t('explorer.groupUpdated')}${colon}${t(`explorer.updated.${updated}`)}`, clear: () => setUpdated('any') }] : []),
    ...(minStars !== 'any' ? [{ label: `${t('explorer.groupStars')}${colon}${t(`explorer.stars.${minStars}`)}`, clear: () => setMinStars('any') }] : []),
    ...(compat !== 'any' ? [{ label: `${t('explorer.groupCompat')}${colon}${t(`explorer.compat.${compat}`)}`, clear: () => setCompat('any') }] : []),
  ];
  const filterCount = chips.length - (searching ? 1 : 0);

  const filters = (
    <div className="space-y-3">
      {hasCategories && (
        <FilterGroup title={t('explorer.groupCategory')}>
          <Option
            active={category === 'all'}
            count={counts.allCategories}
            marker={<Icon path={GRID_ICON} />}
            onClick={() => setCategory('all')}
          >
            {t('explorer.allCategories')}
          </Option>
          {categories.map((c) => (
            <Option
              key={c.id}
              active={category === c.id}
              count={counts.byCategory.get(c.id) ?? 0}
              marker={<Icon path={categoryIcons[c.icon] ?? categoryIcons.package} />}
              onClick={() => setCategory(c.id)}
            >
              {catLabel(c)}
            </Option>
          ))}
        </FilterGroup>
      )}

      <FilterGroup title={t('explorer.groupHealth')}>
        {LEVELS.map((l) => (
          <Option
            key={l}
            role="checkbox"
            active={levels.includes(l)}
            count={counts.byLevel[l]}
            marker={<Checkbox checked={levels.includes(l)} dot={HEALTH_DOT[l]} />}
            onClick={() => toggleLevel(l)}
          >
            {t(`explorer.level.${l}`)}
          </Option>
        ))}
      </FilterGroup>

      <FilterGroup title={t('explorer.groupCompat')}>
        {COMPAT.map((c) => (
          <Option
            key={c}
            role="radio"
            active={compat === c}
            count={counts.byCompat[c]}
            marker={<Radio checked={compat === c} />}
            onClick={() => setCompat(c)}
          >
            {t(`explorer.compat.${c}`)}
          </Option>
        ))}
      </FilterGroup>

      <FilterGroup title={t('explorer.groupUpdated')}>
        {UPDATED.map((u) => (
          <Option
            key={u}
            role="radio"
            active={updated === u}
            count={counts.byUpdated[u]}
            marker={<Radio checked={updated === u} />}
            onClick={() => setUpdated(u)}
          >
            {t(`explorer.updated.${u}`)}
          </Option>
        ))}
      </FilterGroup>

      <FilterGroup title={t('explorer.groupStars')}>
        <li className="grid grid-cols-4 gap-1 rounded-lg bg-muted p-[3px]">
          {MIN_STARS.map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={minStars === m}
              onClick={() => setMinStars(m)}
              disabled={minStars !== m && counts.byStars[m] === 0}
              className="h-7 rounded-md text-xs font-medium text-muted-foreground transition-[color,box-shadow] hover:text-foreground disabled:opacity-40 aria-pressed:bg-background aria-pressed:text-foreground aria-pressed:shadow-sm"
            >
              {t(`explorer.stars.${m}`)}
            </button>
          ))}
        </li>
      </FilterGroup>
    </div>
  );

  const sortHeader = (key: SortId, label: string, className?: string) => (
    <button
      type="button"
      onClick={() => toggleSort(key)}
      aria-label={t('explorer.sortBy', { column: label })}
      className={cn(
        'group inline-flex items-center justify-end gap-1 rounded px-1 -mx-1 transition-colors hover:text-foreground',
        sort === key && 'text-foreground',
        className,
      )}
    >
      {label}
      <Icon
        path={sort === key ? (dir === 'desc' ? ARROW_DOWN_ICON : ARROW_UP_ICON) : SORT_ICON}
        className={cn('size-3.5', sort !== key && 'opacity-40 group-hover:opacity-100')}
      />
    </button>
  );

  // # · plugin · stars · 7d · installs · score · updated
  const columns = 'lg:grid-cols-[2rem_minmax(0,1fr)_4.5rem_7rem_4.75rem] xl:grid-cols-[2rem_minmax(0,1fr)_4.5rem_4rem_7rem_3.5rem_4.75rem]';

  return (
    <div className={cn('lg:grid lg:gap-8', 'lg:grid-cols-[15rem_minmax(0,1fr)]')}>
      {/* ---- filters (desktop) ---- */}
      <aside className="hidden lg:block">
        <div className="sticky top-20 max-h-[calc(100dvh-6rem)] overflow-y-auto pb-6">{filters}</div>
      </aside>

      <div className="min-w-0">
        {/* ---- toolbar ---- */}
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative min-w-[12rem] flex-1">
            <span className="sr-only">{t('explorer.searchAria')}</span>
            <Icon path={SEARCH_ICON} className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={inputRef}
              data-plugin-search
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('explorer.searchBig', { n: formatNumber(docs.length) })}
              className={cn(
                'h-10 w-full rounded-lg border border-input bg-background pr-10 pl-9 text-sm shadow-xs transition-[border-color,box-shadow]',
                'placeholder:text-muted-foreground focus:border-ring focus:ring-3 focus:ring-ring/20 focus:outline-none',
                '[&::-webkit-search-cancel-button]:hidden',
              )}
            />
            <span className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center">
              {query ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    inputRef.current?.focus();
                  }}
                  className="grid size-6 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  aria-label={t('explorer.clearSearch')}
                >
                  <Icon path={X_ICON} className="size-3.5" />
                </button>
              ) : (
                <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[0.625rem] text-muted-foreground sm:inline-block">
                  /
                </kbd>
              )}
            </span>
          </label>

          <button
            type="button"
            onClick={() => sheetRef.current?.showModal()}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border border-input bg-background px-3 text-sm font-medium shadow-xs transition-colors hover:bg-accent lg:hidden"
          >
            <Icon path={SLIDERS_ICON} />
            {t('explorer.filters')}
            {filterCount > 0 && (
              <span className="tabular grid size-5 place-items-center rounded-full bg-primary text-[0.6875rem] text-primary-foreground">
                {filterCount}
              </span>
            )}
          </button>

          {/* Cards have no column headers, and neither does the table below lg. */}
          <label className={cn('relative shrink-0', view === 'table' && 'lg:hidden')}>
            <span className="sr-only">{t('explorer.sortAria')}</span>
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value as SortId);
                setDir('desc');
              }}
              className="h-10 cursor-pointer appearance-none rounded-lg border border-input bg-background pr-9 pl-3 text-sm font-medium shadow-xs focus:border-ring focus:ring-3 focus:ring-ring/20 focus:outline-none"
            >
              {SORTS.map((id) => (
                <option key={id} value={id}>
                  {t(`explorer.sort.${id}` as const)}
                </option>
              ))}
            </select>
            <Icon path={CHEVRON_ICON} className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
          </label>
          <button
            type="button"
            onClick={() => setDir((d) => (d === 'desc' ? 'asc' : 'desc'))}
            aria-label={t('explorer.sortDir')}
            title={t('explorer.sortDir')}
            className={cn(
              'grid size-10 shrink-0 place-items-center rounded-lg border border-input bg-background shadow-xs transition-colors hover:bg-accent',
              view === 'table' && 'lg:hidden',
            )}
          >
            <Icon path={dir === 'desc' ? ARROW_DOWN_ICON : ARROW_UP_ICON} />
          </button>

          <div className="hidden h-10 shrink-0 items-center rounded-lg bg-muted p-[3px] sm:inline-flex" role="group">
            {(['card', 'table'] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                onClick={() => setView(v)}
                aria-label={t(v === 'card' ? 'explorer.viewCards' : 'explorer.viewTable')}
                title={t(v === 'card' ? 'explorer.viewCards' : 'explorer.viewTable')}
                className="grid h-full place-items-center rounded-md px-2.5 text-muted-foreground transition-[color,box-shadow] hover:text-foreground aria-pressed:bg-background aria-pressed:text-foreground aria-pressed:shadow-sm"
              >
                <Icon path={v === 'card' ? GRID_ICON : LIST_ICON} />
              </button>
            ))}
          </div>
        </div>

        {/* ---- summary + active filters ---- */}
        <div className="flex min-h-11 flex-wrap items-center gap-2 py-2">
          <p className="tabular mr-1 text-sm text-muted-foreground">
            {results.length === docs.length
              ? t('explorer.total', { n: formatNumber(docs.length) })
              : t('explorer.matches', { n: formatNumber(results.length) })}
          </p>
          {chips.map((c) => (
            <span key={c.label} className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-secondary pr-1 pl-2.5 text-sm">
              <span className="max-w-[14rem] truncate">{c.label}</span>
              <button
                type="button"
                onClick={c.clear}
                aria-label={t('explorer.removeFilter', { name: c.label })}
                className="grid size-5 place-items-center rounded text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
              >
                <Icon path={X_ICON} className="size-3" />
              </button>
            </span>
          ))}
          {chips.length > 1 && (
            <button
              type="button"
              onClick={reset}
              className="inline-flex h-7 items-center rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {t('explorer.clearFilters')}
            </button>
          )}
        </div>

        {/* ---- table ---- */}
        {results.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-6 py-20 text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
              <Icon path={SEARCH_ICON} className="size-5" />
            </div>
            <p className="mt-4 font-medium">{t('explorer.emptyTitle')}</p>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">{t('explorer.emptyBody')}</p>
            <button
              type="button"
              onClick={reset}
              className="mt-6 inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90"
            >
              {t('explorer.emptyReset')}
            </button>
          </div>
        ) : view === 'card' ? (
          <ol className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {results.slice(0, visible).map((d, i) => (
              <li key={d.slug}>
                <PluginCard
                  doc={d}
                  rank={i + 1}
                  categoryLabel={hasCategories ? categoryLabels.get(d.category) : undefined}
                  installsWidth={(Math.log10(d.downloadsMonth + 1) / maxInstalls) * 100}
                  lang={lang}
                  compared={compared.has(d.slug)}
                />
              </li>
            ))}
          </ol>
        ) : (
          <div className="rounded-xl border border-border bg-card shadow-xs">
            {/* Column headers stay pinned under the site header while scrolling. */}
            <div
              className={cn(
                'sticky top-14 z-10 hidden h-10 items-center gap-3 rounded-t-xl border-b border-border bg-muted/90 px-4 text-xs font-medium text-muted-foreground backdrop-blur lg:grid',
                columns,
              )}
            >
              <span className="text-right">#</span>
              <span>{t('explorer.col.plugin')}</span>
              {sortHeader('stars', t('explorer.col.stars'), 'justify-self-end')}
              {sortHeader('trending', t('explorer.col.trending'), 'hidden justify-self-end xl:inline-flex')}
              {sortHeader('downloads', t('explorer.col.downloads'), 'justify-self-end')}
              {sortHeader('score', t('explorer.col.score'), 'hidden justify-self-end xl:inline-flex')}
              {sortHeader('updated', t('explorer.col.updated'), 'justify-self-end')}
            </div>

            <ol className="divide-y divide-border [&>li:last-child>a]:rounded-b-xl">
              {results.slice(0, visible).map((d, i) => (
                <li key={d.slug}>
                  <a
                    href={localePath(lang, `/plugins/${d.slug}`)}
                    className={cn(
                      'grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1 px-4 py-3 transition-colors hover:bg-muted/50 lg:gap-y-0',
                      columns,
                    )}
                  >
                    <span className="tabular hidden text-right text-xs text-muted-foreground lg:block">{i + 1}</span>

                    <span className="flex min-w-0 items-center gap-3 max-lg:col-span-2">
                      <Avatar doc={d} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium">{d.title}</span>
                          {d.featured && <FeaturedBadge lang={lang} />}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                          {hasCategories && <span className="text-foreground/70">{categoryLabels.get(d.category)} · </span>}
                          {pluginDescription(d, lang) ?? t('common.noDescription')}
                        </span>
                      </span>
                    </span>

                    {/* Compact stats line in place of the columns below lg */}
                    <span className="tabular col-span-2 flex flex-wrap gap-x-4 gap-y-1 pl-12 text-xs text-muted-foreground lg:hidden">
                      <span>
                        ★ <span className="font-medium text-foreground">{compactNumber(d.stars)}</span>
                        {d.starsDelta7d > 0 && <span className="ml-1 text-ok">+{compactNumber(d.starsDelta7d)}</span>}
                      </span>
                      <span>↓ {compactNumber(d.downloadsMonth)}</span>
                      <span>{timeAgo(d.pushedAt, lang)}</span>
                    </span>

                    <span className="tabular hidden text-right text-sm font-medium lg:block">{compactNumber(d.stars)}</span>
                    <span className="tabular hidden text-right text-sm xl:block">
                      {d.starsDelta7d > 0 ? (
                        <span className="text-ok">+{compactNumber(d.starsDelta7d)}</span>
                      ) : (
                        <span className="text-muted-foreground/60">—</span>
                      )}
                    </span>
                    <span className="hidden items-center justify-end gap-2 lg:flex">
                      <span className="h-1.5 w-10 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                        <span
                          className="block h-full rounded-full bg-foreground/70"
                          style={{ width: `${((Math.log10(d.downloadsMonth + 1) / maxInstalls) * 100).toFixed(1)}%` }}
                        />
                      </span>
                      <span className="tabular w-11 text-right text-sm">{compactNumber(d.downloadsMonth)}</span>
                    </span>
                    <span className="tabular hidden text-right text-sm xl:block">{d.score.toFixed(0)}</span>
                    <span className="hidden text-right text-xs text-muted-foreground lg:block">{timeAgo(d.pushedAt, lang)}</span>
                  </a>
                </li>
              ))}
            </ol>
          </div>
        )}

        {visible < results.length && (
          <div ref={sentinelRef} className="mt-6 flex justify-center pb-4">
            <button
              type="button"
              onClick={() => setVisible((v) => v + PAGE_SIZE)}
              className="inline-flex h-9 items-center rounded-md border border-border bg-background px-4 text-sm font-medium shadow-xs transition-colors hover:bg-accent"
            >
              {t('explorer.loadMore', { n: formatNumber(results.length - visible) })}
            </button>
          </div>
        )}
      </div>

      {/* ---- filters (mobile sheet) ---- */}
      <dialog
        ref={sheetRef}
        aria-label={t('explorer.filters')}
        onClick={(e) => e.target === sheetRef.current && sheetRef.current?.close()}
        className="mx-0 mt-auto mb-0 max-h-[85dvh] w-full max-w-none rounded-t-2xl border-0 bg-background p-0 text-foreground shadow-2xl backdrop:bg-black/40 lg:hidden"
      >
        <div className="flex max-h-[85dvh] flex-col">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="font-semibold">{t('explorer.filters')}</h2>
            <button
              type="button"
              onClick={() => sheetRef.current?.close()}
              aria-label={t('explorer.clearSearch')}
              className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Icon path={X_ICON} />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">{filters}</div>
          <div className="flex gap-2 border-t border-border p-4">
            <button
              type="button"
              onClick={reset}
              className="inline-flex h-10 items-center rounded-md border border-border px-4 text-sm font-medium hover:bg-accent"
            >
              {t('explorer.clearFilters')}
            </button>
            <button
              type="button"
              onClick={() => sheetRef.current?.close()}
              className="inline-flex h-10 flex-1 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              {t('explorer.applyFilters', { n: formatNumber(results.length) })}
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}

// --- filter pieces -------------------------------------------------------------

function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="px-2 pb-1 text-xs font-medium text-muted-foreground">{title}</h3>
      <ul className="space-y-0.5">{children}</ul>
    </section>
  );
}

function Option({
  active,
  count,
  marker,
  role,
  onClick,
  children,
}: {
  active: boolean;
  count: number;
  marker: ReactNode;
  role?: 'checkbox' | 'radio';
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <li>
      <button
        type="button"
        role={role}
        aria-checked={role ? active : undefined}
        aria-pressed={role ? undefined : active}
        onClick={onClick}
        disabled={!active && count === 0}
        className={cn(
          'flex w-full items-center gap-2.5 rounded-md px-2 py-1 text-left text-sm transition-colors disabled:pointer-events-none disabled:opacity-40',
          active ? 'bg-accent font-medium text-foreground' : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
        )}
      >
        <span className={cn('grid size-4 shrink-0 place-items-center', active ? 'text-foreground' : 'text-muted-foreground')}>{marker}</span>
        <span className="min-w-0 flex-1 truncate">{children}</span>
        <span className="tabular text-xs text-muted-foreground">{formatNumber(count)}</span>
      </button>
    </li>
  );
}

function Checkbox({ checked, dot }: { checked: boolean; dot: string }) {
  return (
    <span
      className={cn(
        'relative grid size-4 place-items-center rounded-[4px] border transition-colors',
        checked ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-background',
      )}
    >
      {checked ? <Icon path={CHECK_ICON} className="size-3" /> : <span className={cn('size-1.5 rounded-full', dot)} />}
    </span>
  );
}

function Radio({ checked }: { checked: boolean }) {
  return (
    <span className={cn('grid size-4 place-items-center rounded-full border', checked ? 'border-primary' : 'border-input bg-background')}>
      {checked && <span className="size-2 rounded-full bg-primary" />}
    </span>
  );
}

// --- row pieces -------------------------------------------------------------------

const HEALTH_BADGE: Record<HealthLevel, string> = {
  ok: 'border-ok/25 bg-ok-bg text-ok',
  warn: 'border-warn/25 bg-warn-bg text-warn',
  danger: 'border-danger/25 bg-danger-bg text-danger',
};

/** Card view: the same facts as a table row, laid out to be read at a glance. */
function PluginCard({
  doc: d,
  rank,
  categoryLabel,
  installsWidth,
  lang,
  compared,
}: {
  doc: SearchDoc;
  rank: number;
  categoryLabel?: string;
  installsWidth: number;
  lang: Locale;
  compared: boolean;
}) {
  const t = useTranslations(lang);
  const owner = authorSlug(d.owner);
  return (
    // Not an <a>: the owner is a link of its own, and anchors can't nest. The
    // title link stretches over the whole card (after:inset-0); the owner link
    // sits above it (z-10) so it stays separately clickable.
    <div
      className="group relative flex h-full flex-col rounded-xl border border-border bg-card p-5 shadow-xs transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md motion-reduce:hover:translate-y-0"
    >
      <div className="flex items-start gap-3">
        <Avatar doc={d} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold">
              <a
                href={localePath(lang, `/plugins/${d.slug}`)}
                className="after:absolute after:inset-0 after:rounded-xl after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring"
              >
                {d.title}
              </a>
            </h3>
            {d.featured && <FeaturedBadge lang={lang} />}
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {categoryLabel ? `${categoryLabel} · ` : ''}
            {owner && d.owner ? (
              <a
                href={localePath(lang, `/authors/${owner}`)}
                aria-label={t('plugin.byOwnerAria', { owner: d.owner })}
                className="relative z-10 underline-offset-2 hover:text-foreground hover:underline"
              >
                {d.owner}
              </a>
            ) : (
              (d.owner ?? d.name)
            )}
          </p>
        </div>
        <span className="flex shrink-0 items-center gap-1">
          {/* Shown on hover (always on touch screens) and whenever it's on. */}
          <button
            type="button"
            aria-pressed={compared}
            onClick={() => toggleCompare({ s: d.slug, t: d.title })}
            title={t(compared ? 'compare.added' : 'compare.cta')}
            className={cn(
              'relative z-10 inline-flex h-6 items-center gap-1 rounded-md border px-1.5 text-[0.6875rem] font-medium transition-[opacity,color,background-color] focus-visible:opacity-100',
              compared
                ? 'border-foreground bg-foreground text-background'
                : 'border-border bg-background text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground [@media(hover:none)]:opacity-100',
            )}
          >
            <Icon path={compared ? CHECK_ICON : COMPARE_ICON} className="size-3" />
            {t('compare.cta')}
          </button>
          <span className="tabular rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">#{rank}</span>
        </span>
      </div>

      <p className="mt-3 line-clamp-2 min-h-10 text-sm leading-5 text-muted-foreground">
        {pluginDescription(d, lang) ?? t('common.noDescription')}
      </p>

      <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-border pt-4">
        <div className="min-w-0">
          <dt className="text-[0.6875rem] text-muted-foreground">{t('explorer.col.stars')}</dt>
          <dd className="tabular mt-0.5 flex items-baseline gap-1 text-sm font-semibold">
            {compactNumber(d.stars)}
            {d.starsDelta7d > 0 && <span className="text-[0.6875rem] font-medium text-ok">+{compactNumber(d.starsDelta7d)}</span>}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[0.6875rem] text-muted-foreground">{t('explorer.col.downloads')}</dt>
          <dd className="tabular mt-0.5 text-sm font-semibold">{compactNumber(d.downloadsMonth)}</dd>
          <dd className="mt-1 h-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
            <span className="block h-full rounded-full bg-foreground/70" style={{ width: `${installsWidth.toFixed(1)}%` }} />
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[0.6875rem] text-muted-foreground">{t('explorer.col.score')}</dt>
          <dd className="tabular mt-0.5 text-sm font-semibold">{d.score.toFixed(0)}</dd>
          <dd className="mt-1 h-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
            <span className="block h-full rounded-full bg-foreground/70" style={{ width: `${Math.min(100, d.score).toFixed(1)}%` }} />
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex items-center justify-between gap-3 text-xs">
        {/* Short labels: the full ones ("Actively maintained", "updated 5 days
            ago") wrap to two lines in a three-column grid. */}
        <span className="flex shrink-0 items-center gap-1.5">
          <span
            className={cn('inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-medium whitespace-nowrap', HEALTH_BADGE[d.healthLevel])}
            title={t(`explorer.level.${d.healthLevel}`)}
          >
            <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
            {t(`home.pulse.${d.healthLevel}`)}
          </span>
          <CompatChip doc={d} lang={lang} />
        </span>
        <span
          className="inline-flex min-w-0 items-center gap-1 text-muted-foreground"
          title={t('explorer.updatedAgo', { ago: timeAgo(d.pushedAt, lang) })}
        >
          <Icon path={CLOCK_ICON} className="size-3.5" />
          <span className="truncate">{timeAgo(d.pushedAt, lang)}</span>
        </span>
      </div>
    </div>
  );
}

/** OpenCode API the plugin targets; nothing when it isn't known. */
function CompatChip({ doc: d, lang }: { doc: SearchDoc; lang: Locale }) {
  const t = useTranslations(lang);
  if (!d.opencode) return null;
  const tip = t(d.opencodeInferred ? 'compat.tip.inferred' : `compat.tip.${d.opencode}`);
  return (
    <span
      title={tip}
      className={cn(
        'inline-flex items-center rounded-md border px-1.5 py-0.5 font-mono text-[0.6875rem] font-medium whitespace-nowrap',
        d.opencode === 'v1' ? 'border-border text-muted-foreground' : 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400',
      )}
    >
      {t(`compat.${d.opencode}`)}
      {d.opencodeInferred && '*'}
    </span>
  );
}

const HEALTH_DOT: Record<HealthLevel, string> = { ok: 'bg-ok', warn: 'bg-warn', danger: 'bg-danger' };
const HEALTH_LAMP: Record<HealthLevel, string> = { ok: 'lamp-ok', warn: 'lamp-warn', danger: 'lamp-danger' };

function Avatar({ doc: d }: { doc: SearchDoc }) {
  return (
    <span className="relative size-9 shrink-0">
      <span className="block size-full overflow-hidden rounded-lg border border-border bg-muted">
        {d.ownerAvatar ? (
          <img src={avatarUrl(d.ownerAvatar, 36)} alt="" width={36} height={36} className="size-full object-cover" loading="lazy" decoding="async" />
        ) : (
          <span className="grid size-full place-items-center text-xs font-medium text-white" style={{ background: letterAvatar(d.title).color }}>
            {letterAvatar(d.title).letter}
          </span>
        )}
      </span>
      <span className={cn('lamp absolute -right-0.5 -bottom-0.5 ring-2 ring-card', HEALTH_LAMP[d.healthLevel])} aria-hidden="true" />
    </span>
  );
}

function FeaturedBadge({ lang }: { lang: Locale }) {
  const t = useTranslations(lang);
  return (
    <span className="inline-flex shrink-0 items-center rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[0.6875rem] font-medium text-amber-700 dark:text-amber-400">
      {t('common.featured')}
    </span>
  );
}

// --- icons (lucide paths, inline so the island ships no icon library) ---------

const SEARCH_ICON = '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>';
const X_ICON = '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>';
const CHECK_ICON = '<path d="M20 6 9 17l-5-5"/>';
const COMPARE_ICON = '<path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3"/><path d="M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3"/><path d="M12 20v2"/><path d="M12 14v2"/><path d="M12 8v2"/><path d="M12 2v2"/>';
const CLOCK_ICON = '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>';
const CHEVRON_ICON = '<path d="m6 9 6 6 6-6"/>';
const SORT_ICON = '<path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/>';
const ARROW_DOWN_ICON = '<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>';
const ARROW_UP_ICON = '<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>';
const SLIDERS_ICON =
  '<path d="M10 5H3"/><path d="M12 19H3"/><path d="M14 3v4"/><path d="M16 17v4"/><path d="M21 12h-9"/><path d="M21 19h-5"/><path d="M21 5h-7"/><path d="M8 10v4"/><path d="M8 12H3"/>';
const LIST_ICON = '<path d="M3 12h.01"/><path d="M3 18h.01"/><path d="M3 6h.01"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M8 6h13"/>';
const GRID_ICON =
  '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>';

function Icon({ path, className = 'size-4' }: { path: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('shrink-0', className)}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: path }}
    />
  );
}
