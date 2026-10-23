import { plugins, type HealthLevel, type OpencodeTarget } from './plugins';
import { pluginDescription, type Locale } from './i18n';
import { AVATAR_HOST } from './expand-doc';

/**
 * Per-plugin figures for the pages that work on an arbitrary set of plugins
 * in the browser: the compare table and the config checker. Fetched only by
 * those two pages, per locale (descriptions differ). Short keys for the same
 * reason as the search index: ~2600 entries.
 */
export interface Fact {
  /** slug */
  s: string;
  /** title */
  t: string;
  /** npm name */
  n: string;
  /** owner */
  o: string | null;
  /** owner avatar, GitHub host stripped */
  a: string | null;
  /** category id */
  c: string;
  /** description in the page's locale, trimmed */
  d: string | null;
  /** stars */
  r: number;
  /** stars gained in 7 days */
  w: number;
  /** monthly installs */
  m: number;
  /** score */
  sc: number;
  h: HealthLevel;
  /** latest version */
  v: string | null;
  /** license */
  l: string | null;
  /** last commit, YYYY-MM-DD */
  p: string | null;
  /** first published, YYYY-MM-DD */
  cr: string | null;
  /** open issues, null without a repo */
  i: number | null;
  oc: OpencodeTarget;
  /** `oc` inferred from the release date */
  oi: boolean;
  /** deprecated on npm */
  dp: boolean;
  /** repo archived */
  ar: boolean;
}


export function factsResponse(lang: Locale): Response {
  const facts: Fact[] = plugins.map((p) => ({
    s: p.slug,
    t: p.title,
    n: p.name,
    o: p.owner,
    // The `?u=…&v=4` cache-buster is a third of each URL and the avatar loads without it.
    a: p.ownerAvatar?.replace(AVATAR_HOST, '').replace(/\?.*$/, '') ?? null,
    c: p.category,
    d: pluginDescription(p, lang)?.slice(0, lang === 'zh' ? 60 : 100) ?? null,
    r: p.stars,
    w: p.starsDelta7d,
    m: p.downloadsMonth,
    sc: Math.round(p.score * 10) / 10,
    h: p.healthLevel,
    v: p.version,
    l: p.license,
    p: p.pushedAt?.slice(0, 10) ?? null,
    cr: p.createdAt?.slice(0, 10) ?? null,
    i: p.repoUrl ? p.openIssues : null,
    oc: p.opencode ?? null,
    oi: p.opencodeInferred ?? false,
    dp: p.deprecated,
    ar: p.archived,
  }));
  return new Response(JSON.stringify(facts), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'x-robots-tag': 'noindex',
    },
  });
}
