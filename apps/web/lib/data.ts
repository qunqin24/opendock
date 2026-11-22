/**
 * Temporary data layer: reads the committed JSON snapshot from the legacy
 * site (`src/data/`). Phase 0 swaps the bodies of these functions for
 * Postgres queries through `packages/db`; pages only depend on the exported
 * functions and types, so they do not change when that happens.
 */
import fs from 'node:fs';
import path from 'node:path';
import { parseQuery } from './search-terms';

export type HealthLevel = 'ok' | 'warn' | 'danger';
export type Compat = 'v1' | 'v2' | 'both' | null;

export interface Plugin {
  slug: string;
  name: string;
  title: string;
  version: string | null;
  description: string | null;
  descriptionZh: string | null;
  keywords: string[];
  topics: string[];
  license: string | null;
  deprecated: boolean;
  npmUrl: string;
  homepage: string | null;
  repoUrl: string | null;
  repoSlug: string | null;
  owner: string | null;
  ownerAvatar: string | null;
  stars: number;
  starsCredited: number;
  starsInherited: boolean;
  forks: number;
  openIssues: number;
  archived: boolean;
  isFork: boolean;
  pushedAt: string | null;
  createdAt: string | null;
  downloadsMonth: number;
  downloadsWeek: number;
  hasReadme: boolean;
  featured: boolean;
  opencode: Compat;
  starsDelta30d: number;
  starsDelta7d: number;
  category: string;
  score: number;
  health: { id: string; level: HealthLevel; label: string }[];
  healthLevel: HealthLevel;
  surfaces?: ('server' | 'tui' | 'gui')[];
  /** Hidden by an admin override. */
  blocked?: boolean;
}

export interface Category {
  id: string;
  label: string;
  labelEn: string;
  description: string;
  descriptionEn: string;
  icon: string;
  count: number;
}

interface Snapshot {
  generatedAt: string;
  total: number;
  totals: { stars: number; downloadsMonth: number; maintainers: number };
  categories: Category[];
  plugins: Plugin[];
}

const DATA_DIR = process.env.OPENDOCK_DATA_DIR ?? path.resolve(process.cwd(), '../../src/data');

let cache: { snapshot: Snapshot } | null = null;
let haystacks: Map<string, string> | null = null;

function load() {
  if (cache) return cache;
  const snapshot = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'plugins.json'), 'utf8')) as Snapshot;
  snapshot.plugins.sort((a, b) => b.score - a.score);
  cache = { snapshot };
  return cache;
}

/**
 * Manual curation from the admin (database), applied on top of the snapshot.
 * A null field means "use the data". Set by lib/overrides.ts.
 */
export interface Override {
  category: string | null;
  featured: boolean | null;
  blocked: boolean | null;
}

let overrides = new Map<string, Override>();
let version = 0;
let view: {
  /** Every plugin with overrides applied, blocked ones included (admin). */
  all: Plugin[];
  /** What the public site shows. */
  plugins: Plugin[];
  bySlug: Map<string, Plugin>;
  allByName: Map<string, Plugin>;
  /** Snapshot values before overrides, for comparing against. */
  baseByName: Map<string, Plugin>;
  categories: Category[];
} | null = null;

export function setOverrides(next: Map<string, Override>) {
  overrides = next;
  version++;
  view = null;
  haystacks = null;
}

/** Changes whenever overrides change; caches built from plugin data key on it. */
export const dataVersion = () => version;

function build() {
  if (view) return view;
  const { snapshot } = load();
  const all = snapshot.plugins.map((p) => {
    const o = overrides.get(p.name);
    if (!o) return p;
    return { ...p, category: o.category ?? p.category, featured: o.featured ?? p.featured, blocked: o.blocked ?? false };
  });
  const plugins = all.filter((p) => !p.blocked);
  const counts = new Map<string, number>();
  for (const p of plugins) counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
  view = {
    all,
    plugins,
    bySlug: new Map(plugins.map((p) => [p.slug, p])),
    allByName: new Map(all.map((p) => [p.name, p])),
    baseByName: new Map(snapshot.plugins.map((p) => [p.name, p])),
    categories: snapshot.categories.map((c) => ({ ...c, count: counts.get(c.id) ?? 0 })),
  };
  return view;
}

export function getMeta() {
  const { snapshot } = load();
  return { generatedAt: snapshot.generatedAt, total: build().plugins.length, totals: snapshot.totals };
}

export function getCategories(): Category[] {
  return build().categories;
}

export function getCategory(id: string): Category | undefined {
  return getCategories().find((c) => c.id === id);
}

/** A plugin the public site shows (blocked ones are hidden). */
export function getPlugin(slug: string): Plugin | undefined {
  return build().bySlug.get(slug);
}

/** Plugins ordered by score (the default ranking), blocked ones hidden. */
export function getPlugins(): Plugin[] {
  return build().plugins;
}

/** Admin view: every plugin, blocked included, with overrides applied. */
export function getAllPlugins(): Plugin[] {
  return build().all;
}

export function getAnyPlugin(name: string): Plugin | undefined {
  return build().allByName.get(name);
}

/** The snapshot's own values for a plugin, ignoring overrides. */
export function getBasePlugin(name: string): Plugin | undefined {
  return build().baseByName.get(name);
}

export function getOverride(name: string): Override | undefined {
  return overrides.get(name);
}

export function getFeatured(): Plugin[] {
  return getPlugins().filter((p) => p.featured);
}

/**
 * Fastest-growing this week. Inherited monorepo stars and forks are left out:
 * a plugin living in a famous repo would otherwise "trend" on that repo's
 * growth, not its own.
 */
export function getTrending(limit = 8): Plugin[] {
  return getPlugins()
    .filter((p) => !p.starsInherited && !p.isFork && !p.deprecated && p.downloadsMonth >= 200)
    .toSorted((a, b) => b.starsDelta7d - a.starsDelta7d)
    .slice(0, limit);
}

export function getReadme(slug: string): string | null {
  try {
    return fs.readFileSync(path.join(DATA_DIR, 'readme', `${slug}.md`), 'utf8');
  } catch {
    return null;
  }
}

/**
 * The README in the reader's language when the repository ships one
 * (`README.zh-CN.md` and friends, saved as `<slug>@zh-CN.md`), else the main one.
 */
export function getLocalizedReadme(slug: string, locale: string): { markdown: string; translated: boolean } | null {
  if (locale === 'zh') {
    try {
      return { markdown: fs.readFileSync(path.join(DATA_DIR, 'readme', `${slug}@zh-CN.md`), 'utf8'), translated: true };
    } catch {
      /* fall through to the main README */
    }
  }
  const markdown = getReadme(slug);
  return markdown ? { markdown, translated: false } : null;
}

/** Published versions, newest first. */
export function getVersions(slug: string): { v: string; t: string }[] {
  try {
    const details = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'details', `${slug}.json`), 'utf8'));
    return details.versions ?? [];
  } catch {
    return [];
  }
}

export type SortKey = 'score' | 'stars' | 'downloads' | 'trending' | 'updated';

export interface Query {
  q?: string;
  category?: string;
  compat?: 'v1' | 'v2';
  sort?: SortKey;
}

const SORTERS: Record<SortKey, (a: Plugin, b: Plugin) => number> = {
  score: (a, b) => b.score - a.score,
  stars: (a, b) => b.starsCredited - a.starsCredited,
  downloads: (a, b) => b.downloadsMonth - a.downloadsMonth,
  trending: (a, b) => b.starsDelta7d - a.starsDelta7d,
  updated: (a, b) => (b.pushedAt ?? '').localeCompare(a.pushedAt ?? ''),
};


/** Everything a query can match besides the name, including the category's own labels. */
function haystackOf(p: Plugin): string {
  if (!haystacks) {
    const cats = new Map(getCategories().map((c) => [c.id, `${c.id} ${c.labelEn} ${c.label}`]));
    haystacks = new Map(
      getAllPlugins().map((x) => [
        x.name,
        [x.title, x.description, x.descriptionZh, ...x.keywords, cats.get(x.category)].join(' ').toLowerCase(),
      ]),
    );
  }
  return haystacks.get(p.name) ?? '';
}

/** Best score for one term group against `p`, or 0. */
function groupScore(p: Plugin, group: string[]): number {
  const name = p.name.toLowerCase();
  const haystack = haystackOf(p);
  let best = 0;
  for (const t of group) {
    if (name === t) return 12;
    if (name.startsWith(t) || name.includes(`-${t}`) || name.includes(`/${t}`)) best = Math.max(best, 6);
    else if (name.includes(t)) best = Math.max(best, 4);
    else if (haystack.includes(t)) best = Math.max(best, 1);
  }
  // The user's own spelling beats a synonym.
  return best && group[0] && (name.includes(group[0]) || haystack.includes(group[0])) ? best + 0.5 : best;
}

export interface SearchResult {
  items: Plugin[];
  /** False when no plugin matched every term and the list holds close matches. */
  exact: boolean;
}

export function searchPluginsDetailed({ q, category, compat, sort, includeBlocked }: Query & { includeBlocked?: boolean }): SearchResult {
  let list = includeBlocked ? getAllPlugins() : getPlugins();
  if (category) list = list.filter((p) => p.category === category);
  if (compat) list = list.filter((p) => p.opencode === compat || p.opencode === 'both');
  const groups = parseQuery(q ?? '');
  if (!groups.length) return { items: sort && sort !== 'score' ? list.toSorted(SORTERS[sort]) : list, exact: true };

  const scored = list.map((p) => {
    const parts = groups.map((g) => groupScore(p, g));
    return { p, hits: parts.filter(Boolean).length, r: parts.reduce((a, b) => a + b, 0) };
  });
  // Every term must match; with nothing left, fall back to most terms matched.
  let ranked = scored.filter((x) => x.hits === groups.length);
  const exact = ranked.length > 0 || groups.length === 1;
  if (!ranked.length && groups.length > 1) {
    const need = Math.max(1, Math.ceil(groups.length / 2));
    ranked = scored.filter((x) => x.hits >= need);
  }
  // Relevance first, score as the tie-breaker, unless a sort was chosen.
  ranked.sort((a, b) => (sort ? SORTERS[sort](a.p, b.p) : b.hits - a.hits || b.r - a.r || b.p.score - a.p.score));
  return { items: ranked.map((x) => x.p), exact };
}

export function searchPlugins(query: Query): Plugin[] {
  return searchPluginsDetailed(query).items;
}

/** The fields the dock console needs; keeps the search payload small. */
export function toCard(p: Plugin) {
  return {
    slug: p.slug,
    name: p.name,
    description: p.description,
    category: p.category,
    stars: p.starsCredited,
    downloadsMonth: p.downloadsMonth,
    opencode: p.opencode,
    healthLevel: p.healthLevel,
    tuiOnly: p.surfaces?.length === 1 && p.surfaces[0] === 'tui',
  };
}

export type PluginCard = ReturnType<typeof toCard>;
