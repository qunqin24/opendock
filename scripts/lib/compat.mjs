/**
 * Which OpenCode plugin API a package targets.
 *
 * OpenCode 2.0 moved the plugin SDK from `@opencode-ai/*` to `@opencode/*`
 * (`@opencode/plugin` first published 2026-09-02, 2.0.0 shipped 2026-09-12).
 * The strongest signal is which SDK the published manifest depends on; a few
 * packages also declare `engines.opencode`, a `./v2` export or a keyword.
 * A `./gui-experimental` export also declares V2 Desktop GUI support. The
 * crawler separately inspects archives without an exports map.
 * Packages with no signal at all whose latest release predates V2 can only
 * have been written for V1, so they are marked V1 with `inferred: true`.
 */

export const V2_FIRST_PUBLISHED = '2026-09-02';

const V1_SDK = ['@opencode-ai/plugin', '@opencode-ai/sdk'];
const V2_SDK = ['@opencode/plugin', '@opencode/client', '@opencode/schema'];
const NODE_CONDITIONS = new Set(['default', 'import', 'node', 'node-addons']);
const BUN_CONDITIONS = new Set(['default', 'import', 'node', 'bun']);

/** Follow common npm export conditions without downloading the package. */
function importTarget(target, conditions) {
  if (target === null) return null;
  if (typeof target === 'string') return target.startsWith('./') ? target : undefined;
  if (Array.isArray(target)) {
    for (const item of target) {
      const resolved = importTarget(item, conditions);
      if (resolved) return resolved;
    }
  } else if (target && typeof target === 'object') {
    for (const [key, value] of Object.entries(target)) {
      if (!conditions.has(key)) continue;
      const resolved = importTarget(value, conditions);
      if (resolved !== undefined) return resolved;
    }
  }
}

function hasGuiBundle(entry) {
  return [NODE_CONDITIONS, BUN_CONDITIONS].some((conditions) =>
    /^\.\/.+\.c?js$/.test(importTarget(entry, conditions) ?? ''),
  );
}

/**
 * Majors (1 and/or 2) an `engines.opencode` range admits. Deliberately small:
 * ranges in the wild are `^1.0.0`, `>=2`, `1.x || 2.x`, `>=1.4 <2`.
 * @returns {{ v1: boolean, v2: boolean } | null}
 */
export function rangeMajors(range) {
  if (typeof range !== 'string' || !range.trim()) return null;
  let v1 = false;
  let v2 = false;
  for (const alt of range.split('||')) {
    const parts = [...alt.matchAll(/(>=|<=|>|<|\^|~|=)?\s*v?(\d+|x|\*)/gi)];
    if (!parts.length) continue;
    let lo = 0;
    let hi = Infinity;
    for (const [, op = '', raw] of parts) {
      if (raw === 'x' || raw === '*') continue;
      const n = Number(raw);
      if (op === '>=' || op === '>') lo = Math.max(lo, n);
      else if (op === '<') hi = Math.min(hi, n - 1);
      else if (op === '<=') hi = Math.min(hi, n);
      else (lo = n), (hi = n);
      // Only the major of each comparator matters here; skip its minor/patch.
      break;
    }
    // A second comparator (`>=1.4 <2`) narrows the upper bound.
    const upper = alt.match(/<(=?)\s*v?(\d+)/);
    if (upper && parts.length > 1) hi = Math.min(hi, upper[1] ? Number(upper[2]) : Number(upper[2]) - 1);
    if (lo <= 1 && hi >= 1) v1 = true;
    if (lo <= 2 && hi >= 2) v2 = true;
  }
  return v1 || v2 ? { v1, v2 } : null;
}

/**
 * @param {object | null} manifest the latest version's package.json, as npm serves it
 * @param {string | null} publishedAt when that version was published (ISO)
 * @returns {{ target: 'v1' | 'v2' | 'both' | null, inferred: boolean, desktop: boolean }}
 */
export function detectCompat(manifest, publishedAt) {
  if (!manifest) return { target: null, inferred: false, desktop: false };
  const deps = {
    ...manifest.peerDependencies,
    ...manifest.devDependencies,
    ...manifest.dependencies,
  };
  let v1 = V1_SDK.some((d) => d in deps);
  let v2 = V2_SDK.some((d) => d in deps);

  const engines = rangeMajors(manifest.engines?.opencode);
  if (engines) {
    v1 ||= engines.v1;
    v2 ||= engines.v2;
  }
  const exportsField = manifest.exports;
  const desktop = hasGuiBundle(exportsField?.['./gui-experimental']);
  v2 ||= desktop;
  if (exportsField && typeof exportsField === 'object' && './v2' in exportsField) v2 = true;
  const keywords = (manifest.keywords ?? []).map((k) => String(k).toLowerCase());
  if (keywords.some((k) => /^opencode-?v2$/.test(k))) v2 = true;
  if (keywords.some((k) => /^opencode-?v1$/.test(k))) v1 = true;

  if (v1 && v2) return { target: 'both', inferred: false, desktop };
  if (v1) return { target: 'v1', inferred: false, desktop };
  if (v2) return { target: 'v2', inferred: false, desktop };
  if (publishedAt && publishedAt < V2_FIRST_PUBLISHED) return { target: 'v1', inferred: true, desktop };
  return { target: null, inferred: false, desktop };
}

/** Most recent versions with publish dates, newest first: `[{ v, t }]`. */
export function recentVersions(time, max = 12) {
  if (!time || typeof time !== 'object') return [];
  return Object.entries(time)
    .filter(([v]) => v !== 'created' && v !== 'modified')
    .sort((a, b) => (a[1] < b[1] ? 1 : -1))
    .slice(0, max)
    .map(([v, t]) => ({ v, t }));
}
