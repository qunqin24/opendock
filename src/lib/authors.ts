import { plugins, type Plugin } from './plugins';
import { authorSlug } from './author-slug';

export { authorSlug };

export interface Author {
  /** Lower-cased login — the URL segment. */
  key: string;
  /** Display login, in the casing of the author's most-starred plugin. */
  login: string;
  avatar: string | null;
  /** Best score first. */
  plugins: Plugin[];
  /** True when the login came from a GitHub repo owner (vs. an npm publisher name). */
  github: boolean;
  profileUrl: string;
  /** Stars counted once per repository, so a monorepo's plugins don't multiply it. */
  stars: number;
  downloadsMonth: number;
  categories: string[];
}

function build(): Map<string, Author> {
  const groups = new Map<string, Plugin[]>();
  for (const p of plugins) {
    const key = authorSlug(p.owner);
    if (!key) continue;
    const list = groups.get(key);
    if (list) list.push(p);
    else groups.set(key, [p]);
  }

  const out = new Map<string, Author>();
  for (const [key, list] of groups) {
    list.sort((a, b) => b.score - a.score);
    const lead = [...list].sort((a, b) => b.stars - a.stars)[0];
    const github = list.some((p) => p.repoSlug);
    const login = lead.owner as string;

    const repoStars = new Map<string, number>();
    for (const p of list) {
      const id = p.repoSlug?.toLowerCase() ?? `npm:${p.slug}`;
      repoStars.set(id, Math.max(repoStars.get(id) ?? 0, p.stars));
    }

    out.set(key, {
      key,
      login,
      avatar: list.find((p) => p.ownerAvatar)?.ownerAvatar ?? null,
      plugins: list,
      github,
      profileUrl: github ? `https://github.com/${login}` : `https://www.npmjs.com/~${login}`,
      stars: [...repoStars.values()].reduce((a, b) => a + b, 0),
      downloadsMonth: list.reduce((sum, p) => sum + p.downloadsMonth, 0),
      categories: [...new Set(list.map((p) => p.category))],
    });
  }
  return out;
}

export const authors = build();
export const authorList = [...authors.values()];
