#!/usr/bin/env node
/**
 * Build-time data pipeline for OpenDock.
 *
 *   npm registry (keywords:opencode-plugin)  →  candidate packages
 *   npm packument                            →  license / deprecated / repo
 *   GitHub GraphQL (batched)                 →  stars / activity / README
 *   npm downloads API                        →  adoption
 *   data/history.json                        →  star deltas for "trending"
 *   data/curated.json                        →  human overrides + blocklist
 *                                            ↓
 *                                     src/data/plugins.json
 *
 * Usage: pnpm data          (full run)
 *        pnpm data --limit 80   (fast dev subset)
 */

import { writeFile, readFile, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getJSON, graphql, mapLimit } from './lib/http.mjs';
import { JSONCache } from './lib/cache.mjs';
import { classify, ALL_CATEGORIES } from './lib/categories.mjs';
import { computeScore, healthSignals, credibleStars } from './lib/score.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = path.join(ROOT, 'data');
const OUT_FILE = path.join(ROOT, 'src', 'data', 'plugins.json');
// READMEs are large and only needed on detail pages, so they live as
// individual files instead of bloating the dataset every page imports.
const README_DIR = path.join(ROOT, 'src', 'data', 'readme');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');
const CURATED_FILE = path.join(DATA_DIR, 'curated.json');
const CACHE_DIR = path.join(ROOT, '.cache');

// `--fresh` bypasses the caches entirely.
const NO_CACHE = process.argv.includes('--fresh');

const SEARCH_KEYWORDS = ['opencode-plugin', 'opencode-plugins'];
const HISTORY_WINDOW_DAYS = 60;

const argLimit = (() => {
  const i = process.argv.indexOf('--limit');
  return i > -1 ? Number(process.argv[i + 1]) : Infinity;
})();

const log = (...a) => console.log('›', ...a);

// ---------------------------------------------------------------- npm search

async function searchNpm(keyword) {
  const out = [];
  const size = 250;
  for (let from = 0; from < 5000; from += size) {
    const url = `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(`keywords:${keyword}`)}&size=${size}&from=${from}`;
    const page = await getJSON(url);
    if (!page?.objects?.length) break;
    out.push(...page.objects);
    if (out.length >= page.total) break;
  }
  return out;
}

// ------------------------------------------------------------- npm packument

/** Pulls the fields the search endpoint omits: license, deprecation, repo. */
async function fetchPackument(name) {
  const doc = await getJSON(`https://registry.npmjs.org/${name.replace('/', '%2f')}`);
  if (!doc) return null;

  const latestTag = doc['dist-tags']?.latest;
  const latest = latestTag ? doc.versions?.[latestTag] : null;
  const repoField = latest?.repository ?? doc.repository;

  return {
    version: latestTag ?? null,
    license: typeof latest?.license === 'string' ? latest.license : (latest?.license?.type ?? null),
    deprecated: Boolean(latest?.deprecated),
    repository: typeof repoField === 'string' ? repoField : (repoField?.url ?? null),
    repoDirectory: typeof repoField === 'object' ? (repoField?.directory ?? null) : null,
    homepage: latest?.homepage ?? doc.homepage ?? null,
    createdAt: doc.time?.created ?? null,
    modifiedAt: doc.time?.modified ?? null,
    keywords: latest?.keywords ?? doc.keywords ?? [],
    description: latest?.description ?? doc.description ?? null,
  };
}

/** git+https://github.com/o/r.git, git@github.com:o/r, https://github.com/o/r/tree/main/x → {owner, repo} */
function parseGitHub(url) {
  if (!url) return null;
  const m = String(url)
    .replace(/^git\+/, '')
    .replace(/\.git$/, '')
    .match(/github\.com[/:]([^/]+)\/([^/#?]+)/i);
  if (!m) return null;
  return { owner: m[1], repo: m[2] };
}

// ---------------------------------------------------------- GitHub GraphQL

const REPO_FRAGMENT = `
  nameWithOwner
  url
  description
  homepageUrl
  stargazerCount
  forkCount
  isArchived
  isFork
  isPrivate
  pushedAt
  createdAt
  licenseInfo { spdxId }
  repositoryTopics(first: 12) { nodes { topic { name } } }
  owner { login avatarUrl }
  defaultBranchRef { name }
  issues(states: OPEN) { totalCount }
  readme: object(expression: "HEAD:README.md") { ... on Blob { text } }
  readmeLower: object(expression: "HEAD:readme.md") { ... on Blob { text } }
`;

async function fetchRepos(slugs, cache) {
  // Each entry pulls two README blobs, so keep batches small enough that a
  // single query stays well under GitHub's node/timeout limits.
  const BATCH = 25;
  const result = new Map();

  const pending = [];
  for (const slug of slugs) {
    const hit = cache.get(slug.toLowerCase());
    if (hit !== undefined) {
      if (hit) result.set(slug.toLowerCase(), hit);
    } else {
      pending.push(slug);
    }
  }
  if (pending.length !== slugs.length) {
    log(`  ${slugs.length - pending.length} repos from cache, ${pending.length} to fetch`);
  }
  slugs = pending;

  for (let i = 0; i < slugs.length; i += BATCH) {
    const batch = slugs.slice(i, i + BATCH);
    const query = `query {\n${batch
      .map((s, n) => {
        const [owner, repo] = s.split('/');
        return `  r${n}: repository(owner: ${JSON.stringify(owner)}, name: ${JSON.stringify(repo)}) { ${REPO_FRAGMENT} }`;
      })
      .join('\n')}\n}`;

    const data = await graphql(query);
    batch.forEach((slug, n) => {
      const r = data?.[`r${n}`] ?? null;
      // Cache misses too — a deleted repo shouldn't be re-queried every run.
      cache.set(slug.toLowerCase(), r);
      if (r) result.set(slug.toLowerCase(), r);
    });
    process.stdout.write(`\r  repos ${Math.min(i + BATCH, slugs.length)}/${slugs.length}`);
    // Checkpoint so an interrupted crawl doesn't throw away its progress.
    if (i % (BATCH * 8) === 0) await cache.save();
  }
  if (slugs.length) process.stdout.write('\n');
  await cache.save();
  return result;
}

// ------------------------------------------------------------ npm downloads

/**
 * Downloads are an enrichment signal, not a hard requirement — a throttled
 * or failed call degrades that package to 0 rather than failing the build.
 */
async function fetchDownloads(names, period, cache) {
  const out = new Map();

  const pending = [];
  for (const name of names) {
    const hit = cache.get(`${period}:${name}`);
    if (hit !== undefined) out.set(name, hit);
    else pending.push(name);
  }
  names = pending;

  const scoped = names.filter((n) => n.startsWith('@'));
  const plain = names.filter((n) => !n.startsWith('@'));

  // The bulk endpoint accepts up to 128 unscoped packages per call.
  for (let i = 0; i < plain.length; i += 100) {
    const chunk = plain.slice(i, i + 100);
    const data = await getJSON(`https://api.npmjs.org/downloads/point/${period}/${chunk.join(',')}`).catch(() => null);
    for (const [name, v] of Object.entries(data ?? {})) {
      if (v?.downloads != null) {
        out.set(name, v.downloads);
        cache.set(`${period}:${name}`, v.downloads);
      }
    }
  }

  // Scoped packages are not supported by the bulk endpoint, so they need one
  // request each. api.npmjs.org sits behind Cloudflare and throttles on burst
  // rate, so pace them: low concurrency, a small gap, and few retries — a
  // package that stays throttled falls back to 0 rather than stalling the run.
  let n = 0;
  await mapLimit(scoped, 2, async (name) => {
    const data = await getJSON(`https://api.npmjs.org/downloads/point/${period}/${name}`, { retries: 2 }).catch(
      () => null,
    );
    if (data?.downloads != null) {
      out.set(name, data.downloads);
      cache.set(`${period}:${name}`, data.downloads);
    }
    if (++n % 100 === 0) {
      process.stdout.write(`\r  ${period} scoped ${n}/${scoped.length}`);
      await cache.save();
    }
    await new Promise((r) => setTimeout(r, 120));
  });
  if (scoped.length) process.stdout.write('\n');

  await cache.save();
  return out;
}

// ------------------------------------------------------------------ history

async function loadJSON(file, fallback) {
  if (!existsSync(file)) return fallback;
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function trimHistory(history, today) {
  const cutoff = new Date(Date.parse(today) - HISTORY_WINDOW_DAYS * 86_400_000).toISOString().slice(0, 10);
  for (const [name, points] of Object.entries(history)) {
    for (const day of Object.keys(points)) if (day < cutoff) delete points[day];
    if (!Object.keys(points).length) delete history[name];
  }
  return history;
}

/** Stars gained vs. the oldest snapshot inside the last `days` days. */
function starsDelta(points, stars, days, today) {
  if (!points) return 0;
  const since = new Date(Date.parse(today) - days * 86_400_000).toISOString().slice(0, 10);
  const older = Object.keys(points).filter((d) => d >= since).sort();
  if (!older.length) return 0;
  return Math.max(0, stars - points[older[0]]);
}

// --------------------------------------------------------------------- misc

function slugify(name) {
  return name.replace(/^@/, '').replace(/\//g, '--').toLowerCase();
}

/** Trims npm/GitHub boilerplate so cards get a usable one-liner. */
function cleanDescription(text) {
  if (!text) return null;
  return text
    .replace(/^\s*[\p{Emoji_Presentation}\p{Extended_Pictographic}]\s*/u, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 260) || null;
}

function displayName(name) {
  return name
    .replace(/^@[^/]+\//, '')
    .replace(/^opencode[-_]?/, '')
    .replace(/[-_]/g, ' ')
    .replace(/\bplugin\b/gi, '')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase()) || name;
}

// --------------------------------------------------------------------- main

async function main() {
  const today = new Date().toISOString().slice(0, 10);
  const now = Date.now();

  const curated = await loadJSON(CURATED_FILE, { featured: [], blocklist: [], overrides: {} });
  const blocklist = new Set(curated.blocklist ?? []);
  const featured = new Set(curated.featured ?? []);

  log('searching npm…');
  const seen = new Map();
  for (const kw of SEARCH_KEYWORDS) {
    const objects = await searchNpm(kw);
    log(`  keywords:${kw} → ${objects.length}`);
    for (const o of objects) if (!seen.has(o.package.name)) seen.set(o.package.name, o);
  }
  for (const name of curated.include ?? []) {
    if (!seen.has(name)) seen.set(name, { package: { name }, score: {} });
  }

  let candidates = [...seen.values()].filter((o) => !blocklist.has(o.package.name));
  if (Number.isFinite(argLimit)) candidates = candidates.slice(0, argLimit);
  log(`${candidates.length} unique candidates`);

  const noop = { get: () => undefined, set: () => {}, save: async () => {}, size: 0 };
  const cache = async (name, ttl) =>
    NO_CACHE ? noop : await new JSONCache(path.join(CACHE_DIR, name), ttl).load();

  // Downloads move slowly and packuments rarely change within a day; repo
  // metadata gets a shorter TTL because stars are the point of the site.
  const pkgCache = await cache('packuments.json', 20);
  const repoCache = await cache('repos.json', 20);
  const dlCache = await cache('downloads.json', 20);

  log('fetching npm packuments…');
  let done = 0;
  let pkgHits = 0;
  const packuments = await mapLimit(candidates, 25, async (o) => {
    const hit = pkgCache.get(o.package.name);
    if (hit !== undefined) {
      pkgHits++;
      return hit;
    }
    const doc = await fetchPackument(o.package.name).catch(() => null);
    pkgCache.set(o.package.name, doc);
    if (++done % 200 === 0) {
      process.stdout.write(`\r  ${done}/${candidates.length}`);
      await pkgCache.save();
    }
    return doc;
  });
  await pkgCache.save();
  process.stdout.write(`\r  ${done} fetched, ${pkgHits} cached\n`);

  // Merge search + packument into a normalised record.
  const records = candidates.map((o, i) => {
    const p = o.package;
    const doc = packuments[i] ?? {};
    const repoUrl = doc.repository ?? p.links?.repository ?? null;
    return {
      name: p.name,
      version: doc.version ?? p.version ?? null,
      description: cleanDescription(doc.description ?? p.description),
      keywords: [...new Set([...(doc.keywords ?? []), ...(p.keywords ?? [])])],
      license: doc.license ?? null,
      deprecated: doc.deprecated ?? false,
      publisher: p.publisher?.username ?? null,
      npmUrl: `https://www.npmjs.com/package/${p.name}`,
      homepage: doc.homepage ?? p.links?.homepage ?? null,
      createdAt: doc.createdAt ?? p.date ?? null,
      modifiedAt: doc.modifiedAt ?? p.date ?? null,
      gh: parseGitHub(repoUrl),
    };
  });

  const slugs = [...new Set(records.map((r) => r.gh && `${r.gh.owner}/${r.gh.repo}`).filter(Boolean))];
  log(`fetching ${slugs.length} GitHub repos…`);
  const repos = await fetchRepos(slugs, repoCache);

  log('fetching npm downloads…');
  const names = records.map((r) => r.name);
  const monthly = await fetchDownloads(names, 'last-month', dlCache);
  const weekly = await fetchDownloads(names, 'last-week', dlCache);

  const history = trimHistory(await loadJSON(HISTORY_FILE, {}), today);

  // ------------------------------------------------------------- assemble
  const plugins = records.map((r) => {
    const repo = r.gh ? repos.get(`${r.gh.owner}/${r.gh.repo}`.toLowerCase()) : null;
    const topics = repo?.repositoryTopics?.nodes?.map((n) => n.topic.name) ?? [];
    const readme = repo?.readme?.text ?? repo?.readmeLower?.text ?? null;
    const stars = repo?.stargazerCount ?? 0;
    const override = curated.overrides?.[r.name] ?? {};

    if (stars > 0) {
      (history[r.name] ??= {})[today] = stars;
    }

    const base = {
      slug: slugify(r.name),
      name: r.name,
      title: override.title ?? displayName(r.name),
      version: r.version,
      description: override.description ?? cleanDescription(r.description ?? repo?.description),
      keywords: r.keywords.slice(0, 12),
      topics,
      license: r.license ?? repo?.licenseInfo?.spdxId ?? null,
      deprecated: r.deprecated,
      npmUrl: r.npmUrl,
      homepage: r.homepage ?? repo?.homepageUrl ?? null,
      repoUrl: repo?.url ?? null,
      repoSlug: repo?.nameWithOwner ?? null,
      owner: repo?.owner?.login ?? r.publisher,
      ownerAvatar: repo?.owner?.avatarUrl ?? null,
      stars,
      forks: repo?.forkCount ?? 0,
      openIssues: repo?.issues?.totalCount ?? 0,
      archived: Boolean(repo?.isArchived),
      isFork: Boolean(repo?.isFork),
      pushedAt: repo?.pushedAt ?? r.modifiedAt ?? null,
      createdAt: repo?.createdAt ?? r.createdAt ?? null,
      downloadsMonth: monthly.get(r.name) ?? 0,
      downloadsWeek: weekly.get(r.name) ?? 0,
      readme,
      hasReadme: Boolean(readme && readme.length > 200),
      featured: featured.has(r.name),
    };

    base.starsDelta30d = starsDelta(history[r.name], stars, 30, today);
    base.starsDelta7d = starsDelta(history[r.name], stars, 7, today);
    base.category = override.category ?? classify({ ...base, description: base.description });
    base.score = computeScore({ ...base, now });

    // Surfaced so the UI can show the real repo figure while making clear the
    // ranking didn't take it at face value.
    base.starsCredited = credibleStars(stars, base.downloadsMonth);
    base.starsInherited = base.starsCredited < stars;
    base.health = healthSignals(base, now);
    base.healthLevel = base.health.some((h) => h.level === 'danger')
      ? 'danger'
      : base.health.some((h) => h.level === 'warn')
        ? 'warn'
        : 'ok';

    return base;
  });

  // Quality gate: something must vouch for the package existing on purpose.
  const kept = plugins.filter(
    (p) => p.description || p.readme || p.stars > 0 || p.downloadsMonth > 50 || p.featured,
  );
  kept.sort((a, b) => b.score - a.score || b.stars - a.stars);

  const categories = ALL_CATEGORIES.map(({ patterns, ...c }) => ({
    ...c,
    count: kept.filter((p) => p.category === c.id).length,
  })).filter((c) => c.count > 0);

  await mkdir(README_DIR, { recursive: true });
  await rm(README_DIR, { recursive: true, force: true });
  await mkdir(README_DIR, { recursive: true });

  let readmeCount = 0;
  await mapLimit(kept, 20, async (p) => {
    if (!p.hasReadme) return;
    await writeFile(path.join(README_DIR, `${p.slug}.md`), p.readme);
    readmeCount++;
  });
  for (const p of kept) delete p.readme;

  const payload = {
    generatedAt: new Date().toISOString(),
    total: kept.length,
    totals: {
      stars: kept.reduce((s, p) => s + p.stars, 0),
      downloadsMonth: kept.reduce((s, p) => s + p.downloadsMonth, 0),
      maintainers: new Set(kept.map((p) => p.owner).filter(Boolean)).size,
    },
    categories,
    plugins: kept,
  };

  await mkdir(path.dirname(OUT_FILE), { recursive: true });
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(OUT_FILE, JSON.stringify(payload, null, 2));
  await writeFile(HISTORY_FILE, JSON.stringify(history, null, 0));

  log(`wrote ${kept.length} plugins → src/data/plugins.json (dropped ${plugins.length - kept.length})`);
  log(`wrote ${readmeCount} readmes → src/data/readme/`);
  log(`categories: ${categories.map((c) => `${c.id}:${c.count}`).join(' ')}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
