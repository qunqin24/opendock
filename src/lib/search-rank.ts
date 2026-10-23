/**
 * Orders fuzzy-search hits the way people expect: a blend of how well the
 * *name* matches and how much the plugin is used.
 *
 * Fuse's score alone ranks a description that mentions "dcp" above a
 * package called `opencode-dcp`, and orders equally good name matches
 * arbitrarily — so "dcp" put the 51k-installs original eighth. But a name
 * match can't simply win outright either: five tiny packages literally
 * called "memory" would bury every well-used memory plugin. So each hit
 * scores its popularity (0–100) plus a bonus for the name match: exact +40,
 * prefix +25, contains +15. Other hits (description, keywords) get up to +20
 * by Fuse's relevance *relative to the best hit* — raw scores swing from
 * 0–0.3 for "memory" to 0.2–0.97 for "oh my opencode" — and the far tail of
 * near-misses (half of that query's 1268 hits only matched "opencode") is
 * dropped.
 *
 * No dataset import: the explorer island and the ⌘K palette both use it.
 */

export interface Hit<T> {
  item: T;
  /** Fuse score: 0 is a perfect match, 1 none. */
  score?: number;
}

/** "@scope/opencode-dcp-plugin" / "Dcp (@scope)" → "dcp" */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s*\(@[^)]*\)$/, '')
    .replace(/^@[^/]+\//, '')
    .replace(/^opencode[-_ ]?/, '')
    .replace(/[-_ ]?plugin$/, '')
    .replace(/[-_\s.]+/g, '');
}

/** Exact, prefix and substring name matches; anything else is tier 3. */
const NAME_BONUS = [40, 25, 15];
/** Non-name hits further than this from the best one (0–1) are dropped. */
const TAIL = 0.5;

function tier(q: string, title: string, name: string): number {
  const t = normalize(title);
  const n = normalize(name);
  if (t === q || n === q) return 0;
  if (t.startsWith(q) || n.startsWith(q)) return 1;
  if (t.includes(q) || n.includes(q)) return 2;
  return 3;
}

/**
 * Search weight from the site score. A republished copy inherits the
 * original's repo, so its score is mostly the original's stars and commits;
 * halved, it no longer outranks independent plugins of the same name.
 */
export function searchWeight(score: number, republished?: boolean): number {
  return republished ? score / 2 : score;
}

export function rankHits<T>(
  hits: Hit<T>[],
  query: string,
  /** Title, npm name and popularity on a 0–100 scale (the site's score). */
  key: (item: T) => { title: string; name: string; weight: number },
): T[] {
  // "opencode" normalizes to nothing; match it as typed instead.
  const q = normalize(query) || query.toLowerCase().replace(/[-_\s.]+/g, '');
  if (!q) return hits.map((h) => h.item);
  const best = Math.min(1, ...hits.map((h) => h.score ?? 1));
  return hits
    .flatMap((h) => {
      const k = key(h.item);
      const t = tier(q, k.title, k.name);
      // 0 for the best hit, 1 for a non-match.
      const rel = best < 1 ? ((h.score ?? 1) - best) / (1 - best) : 0;
      if (t === 3 && rel > TAIL) return [];
      const bonus = t < 3 ? NAME_BONUS[t] : 20 * (1 - rel) ** 2;
      return [{ item: h.item, value: k.weight + bonus }];
    })
    .sort((a, b) => b.value - a.value)
    .map((r) => r.item);
}
