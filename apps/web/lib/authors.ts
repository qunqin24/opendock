/**
 * Authors, grouped from plugin owners (same rules as the legacy site):
 * the page lives at `/authors/<login lower-cased>`, because GitHub logins are
 * case-insensitive and the dataset carries some people under two casings.
 * CI placeholders such as "GitHub Actions" are not people and get no page.
 */
import fs from 'node:fs';
import path from 'node:path';
import { dataVersion, getPlugins, type Plugin } from './data';

const SLUG_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export function authorSlug(owner: string | null | undefined): string | null {
  return owner && SLUG_RE.test(owner) ? owner.toLowerCase() : null;
}

export interface AuthorProfile {
  login: string;
  type: 'user' | 'org';
  name: string | null;
  bio: string | null;
  company: string | null;
  location: string | null;
  website: string | null;
  twitter: string | null;
}

let profiles: Record<string, AuthorProfile> | null = null;

/** GitHub profiles written by `scripts/fetch-authors.mjs`; empty when the file is missing. */
function loadProfiles(): Record<string, AuthorProfile> {
  if (profiles) return profiles;
  const dir = process.env.OPENDOCK_DATA_DIR ?? path.resolve(process.cwd(), '../../src/data');
  try {
    profiles = JSON.parse(fs.readFileSync(path.join(dir, 'authors.json'), 'utf8')).authors ?? {};
  } catch {
    profiles = {};
  }
  return profiles as Record<string, AuthorProfile>;
}

export interface Author {
  key: string;
  login: string;
  avatar: string | null;
  /** True when the login is a GitHub account (a repo owner), not just an npm publisher. */
  github: boolean;
  profileUrl: string;
  profile: AuthorProfile | null;
  plugins: Plugin[];
  downloadsMonth: number;
  stars: number;
}

let cache: { version: number; authors: Map<string, Author> } | null = null;

function build(): Map<string, Author> {
  const groups = new Map<string, Plugin[]>();
  for (const p of getPlugins()) {
    const key = authorSlug(p.owner);
    if (!key) continue;
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }
  const out = new Map<string, Author>();
  for (const [key, plugins] of groups) {
    const github = plugins.some((p) => p.repoSlug);
    const login = plugins[0].owner as string;
    // Stars belong to repositories; count each repository once.
    const repos = new Map<string, number>();
    for (const p of plugins) repos.set(p.repoSlug?.toLowerCase() ?? `npm:${p.slug}`, p.starsCredited);
    out.set(key, {
      key,
      login,
      avatar: plugins.find((p) => p.ownerAvatar)?.ownerAvatar ?? null,
      github,
      profileUrl: github ? `https://github.com/${login}` : `https://www.npmjs.com/~${login}`,
      profile: loadProfiles()[key] ?? null,
      plugins,
      downloadsMonth: plugins.reduce((n, p) => n + p.downloadsMonth, 0),
      stars: [...repos.values()].reduce((n, s) => n + s, 0),
    });
  }
  return out;
}

export function getAuthor(key: string): Author | undefined {
  if (cache?.version !== dataVersion()) cache = { version: dataVersion(), authors: build() };
  return cache.authors.get(key.toLowerCase());
}

export function authorHref(owner: string | null | undefined): string | null {
  const key = authorSlug(owner);
  return key ? `/authors/${key}` : null;
}
