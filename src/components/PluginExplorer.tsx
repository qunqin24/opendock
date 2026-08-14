import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import Fuse from 'fuse.js';
import type { Category, SearchDoc } from '../lib/plugins';
import { cn, compactNumber, timeAgo } from '../lib/utils';

const PAGE_SIZE = 60;

const SORTS = [
  { id: 'score', label: '综合评分', hint: '星标 + 下载 + 活跃度 + 增长' },
  { id: 'stars', label: '星标数', hint: 'GitHub 累计星标' },
  { id: 'trending', label: '本周飙升', hint: '近 7 天新增星标' },
  { id: 'downloads', label: '下载量', hint: '近 30 天 npm 下载' },
  { id: 'recent', label: '最新发布', hint: '按首次发布时间' },
  { id: 'updated', label: '最近更新', hint: '按最后提交时间' },
] as const;

type SortId = (typeof SORTS)[number]['id'];

const HEALTH_FILTERS = [
  { id: 'all', label: '全部', hint: '不过滤维护状态' },
  { id: 'healthy', label: '仅维护活跃', hint: '排除已归档、已废弃与长期停更' },
  { id: 'has-repo', label: '有源码仓库', hint: '排除找不到公开仓库的包' },
] as const;

type HealthId = (typeof HEALTH_FILTERS)[number]['id'];
type ViewId = 'list' | 'grid';

interface Props {
  docs: SearchDoc[];
  categories: Category[];
  /** Preselects a category, e.g. when embedded on a category page. */
  initialCategory?: string;
  initialSort?: SortId;
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

export default function PluginExplorer({ docs, categories, initialCategory = 'all', initialSort = 'score' }: Props) {
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
    window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
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
        threshold: 0.35,
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

  const categoryLabels = useMemo(() => new Map(categories.map((c) => [c.id, c.label])), [categories]);

  // Header and rows must share one track definition or the columns drift.
  // Category pages drop the 分类 column — every row would say the same thing.
  const gridCols = hasCategories
    ? 'grid-cols-[2.25rem_1fr_4.5rem] sm:grid-cols-[2.5rem_1fr_4.5rem_4.5rem] lg:grid-cols-[2.5rem_1fr_6rem_4.5rem_4.5rem_4.5rem]'
    : 'grid-cols-[2.25rem_1fr_4.5rem] sm:grid-cols-[2.5rem_1fr_4.5rem_4.5rem] lg:grid-cols-[2.5rem_1fr_4.5rem_4.5rem_4.5rem]';

  const filterPanel = (
    <>
      {hasCategories && (
        <FilterGroup title="分类">
          <FilterItem active={category === 'all'} count={docs.length} onClick={() => setCategory('all')}>
            全部
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

      <FilterGroup title="维护状态">
        {HEALTH_FILTERS.map((h) => (
          <FilterItem key={h.id} active={health === h.id} title={h.hint} onClick={() => setHealth(h.id)}>
            {h.label}
          </FilterItem>
        ))}
      </FilterGroup>
    </>
  );

  return (
    <div className={cn(hasCategories && 'lg:grid lg:grid-cols-[13rem_1fr] lg:gap-10')}>
      {/* ---- sidebar (desktop) ---- */}
      {hasCategories && (
        <aside className="hidden lg:block">
          <div className="sticky top-32 space-y-7 pb-10">{filterPanel}</div>
        </aside>
      )}

      <div className="min-w-0">
        {/* ---- toolbar ---- */}
        <div className="sticky top-14 z-30 -mx-4 border-b border-border bg-background/85 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <svg
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              >
                <circle cx="7" cy="7" r="4.75" />
                <path d="m10.5 10.5 3.5 3.5" strokeLinecap="round" />
              </svg>
              <input
                ref={inputRef}
                data-plugin-search
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索插件名、功能、作者…"
                aria-label="搜索插件"
                className={cn(
                  'h-10 w-full rounded-lg border border-input bg-card pr-3 pl-9 text-sm',
                  'placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/25 focus:outline-none',
                  '[&::-webkit-search-cancel-button]:hidden',
                )}
              />
            </div>

            {/* Filters live in the sidebar on desktop; on narrow screens they
                fold into this toggle instead of a chip strip that scrolls
                half of them off the edge. */}
            <button
              type="button"
              onClick={() => setFiltersOpen((o) => !o)}
              aria-expanded={filtersOpen}
              className={cn(
                'h-10 shrink-0 rounded-lg border px-3 text-sm transition-colors',
                hasCategories ? 'lg:hidden' : 'hidden',
                activeFilters > 0 && !searching
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-input bg-card hover:bg-secondary',
              )}
            >
              筛选
              {activeFilters - (searching ? 1 : 0) > 0 && (
                <span className="tabular ml-1.5">{activeFilters - (searching ? 1 : 0)}</span>
              )}
            </button>

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortId)}
              aria-label="排序方式"
              disabled={searching}
              title={searching ? '搜索时按相关度排序' : SORTS.find((s) => s.id === sort)?.hint}
              className={cn(
                'h-10 shrink-0 rounded-lg border border-input bg-card px-3 text-sm',
                'focus:border-ring focus:ring-2 focus:ring-ring/25 focus:outline-none',
                'disabled:cursor-not-allowed disabled:opacity-50',
              )}
            >
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>

            <div className="hidden shrink-0 items-center rounded-lg border border-input bg-card p-0.5 sm:flex">
              <ViewButton active={view === 'list'} onClick={() => setView('list')} label="列表视图">
                <path d="M2 4h12M2 8h12M2 12h12" />
              </ViewButton>
              <ViewButton active={view === 'grid'} onClick={() => setView('grid')} label="卡片视图">
                <path d="M2.5 2.5h4.5v4.5H2.5zM9 2.5h4.5v4.5H9zM2.5 9h4.5v4.5H2.5zM9 9h4.5v4.5H9z" />
              </ViewButton>
            </div>
          </div>

          {/* Capped height: the full list is taller than a phone screen, and
              it lives inside the sticky bar so the page can't scroll it. */}
          {filtersOpen && hasCategories && (
            <div className="mt-3 max-h-[60vh] space-y-6 overflow-y-auto border-t border-border pt-4 lg:hidden">
              {filterPanel}
            </div>
          )}
        </div>

        {/* ---- result meta ---- */}
        <div className="flex items-center justify-between gap-3 py-4 text-sm text-muted-foreground">
          <p className="tabular">
            {results.length === docs.length ? (
              <>
                共 <span className="font-medium text-foreground">{docs.length}</span> 个插件
              </>
            ) : (
              <>
                找到 <span className="font-medium text-foreground">{results.length}</span> 个结果
              </>
            )}
            {searching && <span className="ml-2 text-xs">按相关度排序</span>}
          </p>
          {activeFilters > 0 && (
            <button
              onClick={reset}
              className="rounded-md px-2 py-1 text-xs transition-colors hover:bg-secondary hover:text-foreground"
            >
              清除筛选
            </button>
          )}
        </div>

        {/* ---- results ---- */}
        {results.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-6 py-20 text-center">
            <p className="text-sm font-medium">没有匹配的插件</p>
            <p className="mt-1.5 text-sm text-muted-foreground">试试更宽泛的关键词，或清除筛选条件。</p>
            <button
              onClick={reset}
              className="mt-5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              重置
            </button>
          </div>
        ) : view === 'grid' ? (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {results.slice(0, visible).map((p, i) => (
              <li key={p.slug}>
                <Card doc={p} rank={!searching && sort !== 'recent' ? i + 1 : undefined} />
              </li>
            ))}
          </ul>
        ) : (
          <div>
            {/* Sits directly under the sticky toolbar (56px header + 65px bar)
                so the numeric columns stay labelled however far you scroll. */}
            <div
              className={cn(
                'meta sticky top-[7.625rem] z-20 grid gap-3 border-b border-border bg-background/85 px-1 py-2 text-muted-foreground backdrop-blur-xl',
                gridCols,
              )}
            >
              <span>{searching ? '#' : '排名'}</span>
              <span>插件</span>
              {hasCategories && <span className="hidden lg:block">分类</span>}
              <span className={cn('text-right', sort === 'stars' && 'text-foreground')}>星标</span>
              <span className={cn('hidden text-right sm:block', sort === 'downloads' && 'text-foreground')}>
                月装机
              </span>
              <span className={cn('hidden text-right lg:block', sort === 'updated' && 'text-foreground')}>更新</span>
            </div>

            <ul>
              {results.slice(0, visible).map((p, i) => (
                <li key={p.slug}>
                  <Row
                    doc={p}
                    rank={i + 1}
                    sort={sort}
                    gridCols={gridCols}
                    categoryLabel={hasCategories ? (categoryLabels.get(p.category) ?? '') : undefined}
                  />
                </li>
              ))}
            </ul>
          </div>
        )}

        {visible < results.length && (
          <div ref={sentinelRef} className="mt-8 flex justify-center">
            <button
              onClick={() => setVisible((v) => v + PAGE_SIZE)}
              className="rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-medium transition-colors hover:bg-secondary"
            >
              加载更多（还有 {results.length - visible} 个）
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
      <ul className="space-y-px">{children}</ul>
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
          'relative flex w-full items-center gap-2 rounded-md py-1.5 pr-2 pl-3 text-left text-sm transition-colors',
          active ? 'bg-secondary font-medium text-foreground' : 'text-muted-foreground hover:text-foreground',
        )}
      >
        {active && <span className="absolute top-1.5 bottom-1.5 left-0 w-0.5 rounded-full bg-dock" />}
        <span className="min-w-0 flex-1 truncate">{children}</span>
        {count !== undefined && <span className="tabular shrink-0 text-xs opacity-50">{count}</span>}
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
        'rounded-md p-1.5 transition-colors',
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

const HEALTH_TITLE: Record<string, string> = {
  ok: '维护活跃',
  warn: '需留意：长期未更新或缺少文档',
  danger: '不建议使用：已归档或已废弃',
};

/** Compact row — the default view, tuned for scanning hundreds at a time. */
function Row({
  doc: p,
  rank,
  sort,
  gridCols,
  categoryLabel,
}: {
  doc: SearchDoc;
  rank: number;
  sort: SortId;
  gridCols: string;
  /** Undefined drops the column entirely — see `gridCols` in the parent. */
  categoryLabel?: string;
}) {
  return (
    <a
      href={`/plugins/${p.slug}`}
      className={cn(
        'group relative grid items-center gap-3 border-b border-border/60 px-1 py-2.5',
        'transition-[background-color,transform] duration-200 hover:translate-x-1 hover:bg-secondary/50',
        gridCols,
      )}
    >
      <span
        className="pointer-events-none absolute top-0 left-0 h-full w-0.5 scale-y-0 bg-dock transition-transform duration-200 group-hover:scale-y-100"
        aria-hidden="true"
      />

      <span className="tabular font-mono text-[0.8125rem] text-muted-foreground/70 group-hover:text-foreground">
        {String(rank).padStart(2, '0')}
      </span>

      <span className="min-w-0">
        <span className="flex items-center gap-2">
          <span
            className={cn('size-1.5 shrink-0 rounded-full', HEALTH_DOT[p.healthLevel])}
            title={HEALTH_TITLE[p.healthLevel]}
          />
          <span className="truncate text-sm font-medium tracking-tight group-hover:underline">{p.title}</span>
          {p.starsDelta7d > 0 && (
            <span className="tabular shrink-0 font-mono text-[0.6875rem] text-ok" title="近 7 天新增星标">
              +{compactNumber(p.starsDelta7d)}
            </span>
          )}
        </span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">{p.description ?? p.name}</span>
      </span>

      {categoryLabel !== undefined && (
        <span className="hidden truncate text-xs text-muted-foreground lg:block">{categoryLabel}</span>
      )}

      <span
        className={cn(
          'tabular text-right font-mono text-[0.8125rem]',
          sort === 'stars' ? 'text-foreground' : 'text-muted-foreground',
        )}
      >
        {compactNumber(p.stars)}
      </span>

      <span
        className={cn(
          'tabular hidden text-right font-mono text-[0.8125rem] sm:block',
          sort === 'downloads' ? 'text-foreground' : 'text-muted-foreground',
        )}
      >
        {compactNumber(p.downloadsMonth)}
      </span>

      <span
        className={cn(
          'tabular hidden truncate text-right font-mono text-[0.6875rem] lg:block',
          sort === 'updated' ? 'text-foreground' : 'text-muted-foreground',
        )}
      >
        {timeAgo(p.pushedAt)}
      </span>
    </a>
  );
}

function Card({ doc: p, rank }: { doc: SearchDoc; rank?: number }) {
  return (
    <a
      href={`/plugins/${p.slug}`}
      className={cn(
        'group flex h-full flex-col rounded-xl border border-border bg-card p-5',
        // Matches PluginCard.astro: tight contact shadow, no transform.
        'transition-[box-shadow,border-color] duration-150',
        'hover:border-foreground/25',
        'hover:shadow-[0_1px_2px_rgb(0_0_0/0.05),0_2px_5px_-3px_rgb(0_0_0/0.08)]',
        'dark:hover:shadow-[0_1px_2px_rgb(0_0_0/0.35),0_2px_5px_-3px_rgb(0_0_0/0.45)]',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {rank !== undefined && (
              <span className="tabular shrink-0 text-xs font-semibold text-muted-foreground/70">
                {String(rank).padStart(2, '0')}
              </span>
            )}
            <h3 className="truncate text-[0.9375rem] font-semibold tracking-tight">{p.title}</h3>
            <span
              className={cn('size-1.5 shrink-0 rounded-full', HEALTH_DOT[p.healthLevel])}
              title={HEALTH_TITLE[p.healthLevel]}
            />
          </div>
          <p className="mt-1 truncate font-mono text-xs text-muted-foreground">{p.name}</p>
        </div>
        <span
          className="tabular shrink-0 rounded-md border border-border bg-secondary px-2 py-1 text-xs font-semibold"
          title="综合评分"
        >
          {p.score.toFixed(0)}
        </span>
      </div>

      <p className="mt-3 line-clamp-2 min-h-[2.5rem] text-sm leading-5 text-muted-foreground">
        {p.description ?? '暂无描述'}
      </p>

      <div className="mt-4 flex items-center gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
        <span className="tabular inline-flex items-center gap-1" title="GitHub 星标">
          <svg viewBox="0 0 16 16" fill="currentColor" className="size-3.5" aria-hidden="true">
            <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z" />
          </svg>
          {compactNumber(p.stars)}
        </span>
        {p.starsDelta7d > 0 && (
          <span className="tabular font-medium text-ok" title="近 7 天新增星标">
            +{compactNumber(p.starsDelta7d)}
          </span>
        )}
        <span className="tabular inline-flex items-center gap-1" title="近 30 天下载量">
          <svg viewBox="0 0 16 16" fill="currentColor" className="size-3.5" aria-hidden="true">
            <path d="M7.25 1.75a.75.75 0 0 1 1.5 0v6.44l2.22-2.22a.75.75 0 1 1 1.06 1.06l-3.5 3.5a.75.75 0 0 1-1.06 0l-3.5-3.5a.75.75 0 0 1 1.06-1.06l2.22 2.22V1.75ZM2.5 11a.75.75 0 0 1 .75.75v1.5h9.5v-1.5a.75.75 0 0 1 1.5 0v2.25a.75.75 0 0 1-.75.75H2.5a.75.75 0 0 1-.75-.75v-2.25A.75.75 0 0 1 2.5 11Z" />
          </svg>
          {compactNumber(p.downloadsMonth)}
        </span>
        <span className="ml-auto truncate" title="最近提交">
          {timeAgo(p.pushedAt)}
        </span>
      </div>
    </a>
  );
}
