import data from '../data/plugins.json';
import { DEFAULT_LOCALE, type Locale } from './i18n';
import { AVATAR_HOST } from './expand-doc';

export type HealthLevel = 'ok' | 'warn' | 'danger';

/** Mirrors the ids emitted by scripts/lib/score.mjs. Keeping it a union means
 *  a signal without a translation fails the type check instead of rendering
 *  its raw id. */
export type HealthSignalId =
  | 'healthy'
  | 'archived'
  | 'deprecated'
  | 'stale-year'
  | 'stale'
  | 'no-repo'
  | 'no-readme'
  | 'no-license';

export interface HealthSignal {
  id: HealthSignalId;
  level: HealthLevel;
  label: string;
}

export interface Plugin {
  slug: string;
  name: string;
  title: string;
  version: string | null;
  description: string | null;
  /** Machine translation of `description` (zh-Hans), or null when absent/not needed. */
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
  /** Stars actually counted toward the score — capped when inherited from a shared repo. */
  starsCredited: number;
  /** True when `stars` overstates this package, i.e. it came from a monorepo. */
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
  starsDelta30d: number;
  starsDelta7d: number;
  category: string;
  score: number;
  health: HealthSignal[];
  healthLevel: HealthLevel;
  /**
   * OpenCode plugin API the latest release targets (see scripts/lib/compat.mjs).
   * Optional: snapshots from before the field existed don't carry it.
   */
  opencode?: OpencodeTarget;
  /** True when `opencode` is 'v1' only because the release predates V2. */
  opencodeInferred?: boolean;
}

export type OpencodeTarget = 'v1' | 'v2' | 'both' | null;

/** Whether a plugin is known to run on a given OpenCode major. */
export function supports(p: Pick<Plugin, 'opencode'>, major: 'v1' | 'v2'): boolean {
  return p.opencode === major || p.opencode === 'both';
}

/** Changelog and community data, one file per plugin (scripts/fetch-plugins.mjs → details/). */
export interface PluginDetails {
  /** npm versions, newest first. */
  versions: { v: string; t: string }[];
  releases: {
    tag: string;
    name: string | null;
    date: string;
    url: string;
    prerelease: boolean;
    body: string | null;
  }[];
  /** The repo's most-discussed issues, open or closed. */
  issues: {
    number: number;
    title: string;
    url: string;
    state: 'open' | 'closed';
    comments: number;
    date: string;
  }[];
  /** The repo publishes several packages, so issues aren't all about this one. */
  sharedRepo: boolean;
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

export interface PluginDataset {
  generatedAt: string;
  total: number;
  totals: { stars: number; downloadsMonth: number; maintainers: number };
  categories: Category[];
  plugins: Plugin[];
}

const dataset = data as unknown as PluginDataset;

export const plugins = dataset.plugins;
export const categories = dataset.categories;
export const totals = dataset.totals;
export const generatedAt = dataset.generatedAt;

export const categoryMap = new Map(categories.map((c) => [c.id, c]));

export function categoryLabel(id: string, lang: Locale = DEFAULT_LOCALE): string {
  const c = categoryMap.get(id);
  if (!c) return lang === 'zh' ? '其他' : 'Other';
  return lang === 'zh' ? c.label : c.labelEn;
}

export function categoryDescription(id: string, lang: Locale = DEFAULT_LOCALE): string {
  const c = categoryMap.get(id);
  if (!c) return '';
  return lang === 'zh' ? c.description : c.descriptionEn;
}

/** Ranking views. Each answers a different question, so none is "the" order. */
export const rankings = {
  /** Composite score: popularity + adoption + activity + growth. */
  top: [...plugins].sort((a, b) => b.score - a.score),
  /** Raw star count — the leaderboard people expect to see. */
  stars: [...plugins].sort((a, b) => b.stars - a.stars),
  /** Stars gained recently: surfaces plugins the total-count board buries. */
  trending: [...plugins].sort(
    (a, b) => b.starsDelta7d - a.starsDelta7d || b.starsDelta30d - a.starsDelta30d || b.score - a.score,
  ),
  /** Newest first, so fresh work has a way in. */
  recent: [...plugins].sort(
    (a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime(),
  ),
  /** Most installed in the last 30 days. */
  downloads: [...plugins].sort((a, b) => b.downloadsMonth - a.downloadsMonth),
};

export type RankingKey = keyof typeof rankings;

export const featured = plugins.filter((p) => p.featured).sort((a, b) => b.score - a.score);

/** Berth census for the edition line — how much of the dock is actually alive. */
export const census = {
  total: plugins.length,
  active: plugins.filter((p) => p.healthLevel === 'ok').length,
  ailing: plugins.filter((p) => p.healthLevel === 'warn').length,
  abandoned: plugins.filter((p) => p.healthLevel === 'danger').length,
};

export const lampClass: Record<HealthLevel, string> = {
  ok: 'lamp-ok',
  warn: 'lamp-warn',
  danger: 'lamp-danger',
};

export function byCategory(id: string): Plugin[] {
  return plugins.filter((p) => p.category === id).sort((a, b) => b.score - a.score);
}

export function bySlug(slug: string): Plugin | undefined {
  return plugins.find((p) => p.slug === slug);
}

/** Same category first, then closest by score — used for related plugins. */
export function related(plugin: Plugin, limit = 6): Plugin[] {
  const tags = new Set([...plugin.keywords, ...plugin.topics].map((t) => t.toLowerCase()));
  return plugins
    .filter((p) => p.slug !== plugin.slug)
    .map((p) => {
      const overlap = [...p.keywords, ...p.topics].filter((t) => tags.has(t.toLowerCase())).length;
      return { p, rank: (p.category === plugin.category ? 3 : 0) + overlap * 2 + p.score / 100 };
    })
    .sort((a, b) => b.rank - a.rank)
    .slice(0, limit)
    .map((x) => x.p);
}

/**
 * READMEs are stored one-file-per-plugin and pulled in lazily so only the
 * detail page being rendered pays for its own markdown.
 */
const readmeModules = import.meta.glob<string>('../data/readme/*.md', {
  query: '?raw',
  import: 'default',
});

export async function loadReadme(slug: string, lang?: string): Promise<string | null> {
  const loader = readmeModules[`../data/readme/${slug}${lang ? `@${lang}` : ''}.md`];
  return loader ? await loader() : null;
}

const detailModules = import.meta.glob<PluginDetails>('../data/details/*.json', { import: 'default' });

export async function loadDetails(slug: string): Promise<PluginDetails | null> {
  const loader = detailModules[`../data/details/${slug}.json`];
  return loader ? await loader() : null;
}

/** Languages with a translated README on disk (`<slug>@<lang>.md`, written by the pipeline). */
export function readmeLangs(slug: string): string[] {
  const prefix = `../data/readme/${slug}@`;
  return Object.keys(readmeModules)
    .filter((k) => k.startsWith(prefix))
    .map((k) => k.slice(prefix.length, -'.md'.length));
}

/** Minimal shape shipped to the client-side search island. */
export interface SearchDoc {
  slug: string;
  name: string;
  title: string;
  description: string | null;
  /** Only populated for the zh build — English pages don't ship it to the client. */
  descriptionZh: string | null;
  owner: string | null;
  ownerAvatar: string | null;
  category: string;
  keywords: string[];
  stars: number;
  downloadsMonth: number;
  score: number;
  starsDelta7d: number;
  createdAt: string | null;
  pushedAt: string | null;
  healthLevel: HealthLevel;
  featured: boolean;
  opencode: OpencodeTarget;
  opencodeInferred: boolean;
}

export const searchDocs: SearchDoc[] = plugins.map((p) => ({
  slug: p.slug,
  name: p.name,
  title: p.title,
  description: p.description,
  descriptionZh: p.descriptionZh ?? null,
  owner: p.owner,
  ownerAvatar: p.ownerAvatar,
  category: p.category,
  keywords: p.keywords.slice(0, 8),
  stars: p.stars,
  downloadsMonth: p.downloadsMonth,
  score: p.score,
  starsDelta7d: p.starsDelta7d,
  createdAt: p.createdAt,
  pushedAt: p.pushedAt,
  healthLevel: p.healthLevel,
  featured: p.featured,
  opencode: p.opencode ?? null,
  opencodeInferred: p.opencodeInferred ?? false,
}));

const searchDocsEn: SearchDoc[] = searchDocs.map((d) => ({ ...d, descriptionZh: null }));


/**
 * The explorer's full dataset as served from /plugins-index.json: avatars
 * without the shared host and cache-buster, dates without the time of day.
 * `expandDoc` (lib/expand-doc.ts) restores the avatar on the client.
 */
export function compactDocs(lang: Locale): SearchDoc[] {
  return searchDocsFor(lang).map((d) => ({
    ...d,
    ownerAvatar: d.ownerAvatar?.replace(AVATAR_HOST, '').replace(/\?.*$/, '') ?? null,
    createdAt: d.createdAt?.slice(0, 10) ?? null,
    pushedAt: d.pushedAt?.slice(0, 10) ?? null,
  }));
}

/** Search docs for a locale: English pages skip the translated text entirely. */
export function searchDocsFor(lang: Locale): SearchDoc[] {
  return lang === 'zh' ? searchDocs : searchDocsEn;
}
