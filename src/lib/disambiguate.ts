import type { Plugin } from './plugins';

const scopeOf = (name: string) => name.match(/^@([^/]+)\//)?.[1] ?? null;
const bareName = (name: string) => name.replace(/^@[^/]+\//, '').toLowerCase();

/**
 * Makes plugins that look the same tell themselves apart, at load time so
 * it applies to the committed snapshot as is.
 *
 * Republished copies. `@keakon/opencode-dcp` is `@tarquinen/opencode-dcp`
 * published under another scope with package.json untouched, so its repo,
 * owner, avatar and stars are all the original's. When packages share a
 * repo *and* a bare name, the one whose scope matches the repo owner (or
 * the unscoped one, or the most installed) is the original; each scoped
 * copy is credited to its own scope and points at the original.
 *
 * Shared titles. Titles drop the scope (`@x/opencode-dcp` → "Dcp"), so 500+
 * plugins share one with another. Scoped ones in a clash get the scope
 * back ("Dcp (@keakon)"); any clash left falls back to the npm name.
 */
export function disambiguate(list: Plugin[]): Plugin[] {
  const out = list.map((p) => ({ ...p }));

  const copies = new Map<string, Plugin[]>();
  for (const p of out) {
    if (!p.repoSlug) continue;
    const key = `${p.repoSlug.toLowerCase()}|${bareName(p.name)}`;
    copies.set(key, [...(copies.get(key) ?? []), p]);
  }
  for (const group of copies.values()) {
    if (group.length < 2) continue;
    const repoOwner = group[0].repoSlug!.split('/')[0].toLowerCase();
    const original =
      group.find((p) => scopeOf(p.name)?.toLowerCase() === repoOwner) ??
      group.find((p) => !scopeOf(p.name)) ??
      [...group].sort((a, b) => b.downloadsMonth - a.downloadsMonth)[0];
    for (const p of group) {
      const scope = scopeOf(p.name);
      if (p === original || !scope || scope.toLowerCase() === repoOwner) continue;
      p.republishOf = original.slug;
      p.owner = scope;
      p.ownerAvatar = null;
    }
  }

  const byTitle = new Map<string, Plugin[]>();
  for (const p of out) byTitle.set(p.title, [...(byTitle.get(p.title) ?? []), p]);
  for (const group of byTitle.values()) {
    if (group.length < 2) continue;
    for (const p of group) {
      const scope = scopeOf(p.name);
      if (scope) p.title = `${p.title} (@${scope})`;
    }
  }
  const counts = new Map<string, number>();
  for (const p of out) counts.set(p.title, (counts.get(p.title) ?? 0) + 1);
  for (const p of out) if ((counts.get(p.title) ?? 0) > 1) p.title = p.name;

  return out;
}
