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
 *   data/translations.json + Bing web translator → descriptionZh (best effort)
 *   GitHub GraphQL (README.zh-CN.md etc.)    →  translated READMEs, readme/<slug>@<lang>.md
 *   npm versions + GitHub releases/issues    →  details/<slug>.json (changelog, community)
 *                                            ↓
 *                                     src/data/plugins.json
 *
 * Usage: pnpm data          (full run)
 *        pnpm data --limit 80   (fast dev subset)
 *        pnpm data --translate-max 200   (cap new translations this run; default 500)
 *
 * New translations are only fetched on GitHub Actions (the daily refresh job);
 * anywhere else the pipeline just applies data/translations.json. `--translate`
 * forces Bing on, `--no-translate` forces it off.
 */

import { writeFile, readFile, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getJSON, graphql, mapLimit } from './lib/http.mjs';
import { JSONCache } from './lib/cache.mjs';
import { fetchDownloads } from './lib/downloads.mjs';
import { classify, ALL_CATEGORIES } from './lib/categories.mjs';
import { computeScore, healthSignals, credibleStars } from './lib/score.mjs';
import { BingTranslator } from './lib/translate.mjs';
import { TranslationCache, translateDescriptions, formatStats } from './lib/descriptions.mjs';
import { findReadmeVariants, guessLang } from './lib/readme-langs.mjs';
import { detectCompat, recentVersions } from './lib/compat.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = path.join(ROOT, 'data');
const OUT_FILE = path.join(ROOT, 'src', 'data', 'plugins.json');
// READMEs are large and only needed on detail pages, so they live as
// individual files instead of bloating the dataset every page imports.
const README_DIR = path.join(ROOT, 'src', 'data', 'readme');
// Changelog and community data, also per plugin and only read by detail pages.
const DETAILS_DIR = path.join(ROOT, 'src', 'data', 'details');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');
const CURATED_FILE = path.join(DATA_DIR, 'curated.json');
const TRANSLATIONS_FILE = path.join(DATA_DIR, 'translations.json');
const CACHE_DIR = path.join(ROOT, '.cache');

// `--fresh` bypasses the caches entirely.
const NO_CACHE = process.argv.includes('--fresh');

const SEARCH_KEYWORDS = ['opencode-plugin', 'opencode-plugins'];
const HISTORY_WINDOW_DAYS = 60;

const NO_TRANSLATE =
  process.argv.includes('--no-translate') ||
  process.env.OPENDOCK_TRANSLATE === '0' ||
  (process.env.GITHUB_ACTIONS !== 'true' && !process.argv.includes('--translate'));
// New translations per pipeline run. The backlog drains over several daily runs
// instead of one run hammering an unofficial endpoint for half an hour.
const translateMax = (() => {
  const i = process.argv.indexOf('--translate-max');
  return i > -1 ? Number(process.argv[i + 1]) : 500;
})();

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
    compat: detectCompat(latest, latestTag ? (doc.time?.[latestTag] ?? null) : null),
    versions: recentVersions(doc.time),
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
  releases(first: 6, orderBy: { field: CREATED_AT, direction: DESC }) {
    nodes { tagName name publishedAt url isPrerelease description }
  }
  topIssues: issues(first: 6, orderBy: { field: COMMENTS, direction: DESC }) {
    nodes { number title url state createdAt comments { totalCount } }
  }
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

/**
 * Translated READMEs that a plugin's README links to ("English · 简体中文").
 * A second, smaller GraphQL pass: the paths are only known once the main
 * README is in hand. Returns Map<slug, [{ lang, text }]>.
 */
async function fetchReadmeVariants(plugins, cache) {
  const BATCH = 15;
  const wanted = [];
  for (const p of plugins) {
    if (!p.hasReadme || !p.repoSlug) continue;
    const own = guessLang(p.readme);
    const variants = findReadmeVariants(p.readme, p.repoSlug).filter((v) => v.lang !== own);
    if (variants.length) wanted.push({ p, variants });
  }

  const key = (p, v) => `${p.repoSlug.toLowerCase()}:${v.path}`;
  const pending = wanted.filter(({ p, variants }) => variants.some((v) => cache.get(key(p, v)) === undefined));

  for (let i = 0; i < pending.length; i += BATCH) {
    const batch = pending.slice(i, i + BATCH);
    const query = `query {\n${batch
      .map(({ p, variants }, n) => {
        const [owner, repo] = p.repoSlug.split('/');
        const blobs = variants
          .map((v, j) => `v${j}: object(expression: ${JSON.stringify(`HEAD:${v.path}`)}) { ... on Blob { text } }`)
          .join(' ');
        return `  r${n}: repository(owner: ${JSON.stringify(owner)}, name: ${JSON.stringify(repo)}) { ${blobs} }`;
      })
      .join('\n')}\n}`;

    const data = await graphql(query);
    batch.forEach(({ p, variants }, n) => {
      variants.forEach((v, j) => cache.set(key(p, v), data?.[`r${n}`]?.[`v${j}`]?.text ?? null));
    });
    process.stdout.write(`\r  readme variants ${Math.min(i + BATCH, pending.length)}/${pending.length} repos`);
  }
  if (pending.length) process.stdout.write('\n');
  await cache.save();

  const result = new Map();
  for (const { p, variants } of wanted) {
    const texts = variants
      .map((v) => ({ lang: v.lang, text: cache.get(key(p, v)) }))
      .filter((v) => v.text && v.text.length > 200);
    if (texts.length) result.set(p.slug, texts);
  }
  return result;
}

/**
 * Changelog and community data for one package. In a shared repo only
 * releases tagged with the package's own name are kept; issues stay but are
 * flagged, since they cover the whole repo.
 */
function buildDetails(r, repo, sharedRepo) {
  const bare = r.name.replace(/^@[^/]+\//, '').toLowerCase();
  const releases = (repo?.releases?.nodes ?? [])
    .filter((n) => n && (!sharedRepo || n.tagName.toLowerCase().includes(bare)))
    .slice(0, 5)
    .map((n) => ({
      tag: n.tagName,
      name: n.name && n.name !== n.tagName ? n.name.slice(0, 120) : null,
      date: n.publishedAt,
      url: n.url,
      prerelease: n.isPrerelease,
      // Notes are rendered as markdown on the page; cap the pathological ones.
      body: (n.description ?? '').slice(0, 4000) || null,
    }));
  const issues = (repo?.topIssues?.nodes ?? [])
    .filter((n) => n && n.comments.totalCount > 0)
    .map((n) => ({
      number: n.number,
      title: n.title.slice(0, 200),
      url: n.url,
      state: n.state === 'OPEN' ? 'open' : 'closed',
      comments: n.comments.totalCount,
      date: n.createdAt,
    }));
  return { versions: r.versions, releases, issues, sharedRepo };
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
  // Versioned names: entries cached before a field was added would hide it for a day.
  const pkgCache = await cache('packuments-v2.json', 20);
  const repoCache = await cache('repos-v2.json', 20);
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
      compat: doc.compat ?? { target: null, inferred: false },
      versions: doc.versions ?? [],
      gh: parseGitHub(repoUrl),
    };
  });

  const slugs = [...new Set(records.map((r) => r.gh && `${r.gh.owner}/${r.gh.repo}`).filter(Boolean))];
  log(`fetching ${slugs.length} GitHub repos…`);
  const repos = await fetchRepos(slugs, repoCache);

  log('fetching npm downloads…');
  const names = records.map((r) => r.name);
  // The committed snapshot survives expired/missing Actions caches. Never turn a
  // temporary downloads outage into zero adoption scores for existing packages.
  const previous = await loadJSON(OUT_FILE, { plugins: [] });
  const fallback = (field) => new Map(previous.plugins.map((p) => [p.name, p[field]]));
  const monthly = await fetchDownloads(names, 'last-month', dlCache, { fallback: fallback('downloadsMonth'), log });
  const weekly = await fetchDownloads(names, 'last-week', dlCache, { fallback: fallback('downloadsWeek'), log });

  const history = trimHistory(await loadJSON(HISTORY_FILE, {}), today);

  // Repos that several packages publish from: their releases and issues are
  // only partly about any one package.
  const repoShare = new Map();
  for (const r of records) if (r.gh) repoShare.set(`${r.gh.owner}/${r.gh.repo}`.toLowerCase(), (repoShare.get(`${r.gh.owner}/${r.gh.repo}`.toLowerCase()) ?? 0) + 1);

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
      // Filled from data/translations.json after ranking; null = show the original.
      descriptionZh: null,
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
      opencode: r.compat.target,
      opencodeInferred: r.compat.inferred,
      // Transient, written to details/<slug>.json and removed from the snapshot.
      details: buildDetails(r, repo, (repoShare.get(r.gh ? `${r.gh.owner}/${r.gh.repo}`.toLowerCase() : '') ?? 0) > 1),
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

  // Best effort: a blocked/broken translator must never fail the crawl.
  try {
    const cache = await new TranslationCache(TRANSLATIONS_FILE).load();
    const translator = NO_TRANSLATE ? null : new BingTranslator();
    log(`translating descriptions (${NO_TRANSLATE ? 'cache only' : `up to ${translateMax} new`})…`);
    const { result, stats } = await translateDescriptions(kept, {
      translator,
      cache,
      maxNew: translateMax,
      budgetMs: 10 * 60_000,
      log,
    });
    for (const p of kept) p.descriptionZh = result.get(p.name) ?? null;
    await cache.save({ force: true });
    log(`  ${formatStats(stats)}`);
  } catch (err) {
    log(`  translation skipped: ${err?.message ?? err}`);
  }

  const categories = ALL_CATEGORIES.map(({ patterns, ...c }) => ({
    ...c,
    count: kept.filter((p) => p.category === c.id).length,
  })).filter((c) => c.count > 0);

  // Best effort, like translation: a failed pass only costs the language switch.
  let variants = new Map();
  try {
    log('fetching translated READMEs…');
    variants = await fetchReadmeVariants(kept, await cache('readme-variants.json', 20));
  } catch (err) {
    log(`  readme variants skipped: ${err?.message ?? err}`);
  }

  await mkdir(README_DIR, { recursive: true });
  await rm(README_DIR, { recursive: true, force: true });
  await mkdir(README_DIR, { recursive: true });

  let readmeCount = 0;
  let variantCount = 0;
  await mapLimit(kept, 20, async (p) => {
    if (!p.hasReadme) return;
    await writeFile(path.join(README_DIR, `${p.slug}.md`), p.readme);
    // `@` never appears in a slug, so these can't collide with a plugin's own file.
    for (const v of variants.get(p.slug) ?? []) {
      await writeFile(path.join(README_DIR, `${p.slug}@${v.lang}.md`), v.text);
      variantCount++;
    }
    readmeCount++;
  });
  for (const p of kept) delete p.readme;

  await rm(DETAILS_DIR, { recursive: true, force: true });
  await mkdir(DETAILS_DIR, { recursive: true });
  let detailCount = 0;
  await mapLimit(kept, 20, async (p) => {
    const d = p.details;
    if (!d || !(d.versions.length || d.releases.length || d.issues.length)) return;
    await writeFile(path.join(DETAILS_DIR, `${p.slug}.json`), JSON.stringify(d));
    detailCount++;
  });
  for (const p of kept) delete p.details;

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
  log(`wrote ${readmeCount} readmes + ${variantCount} translated → src/data/readme/`);
  log(`wrote ${detailCount} changelog/community files → src/data/details/`);
  log(`categories: ${categories.map((c) => `${c.id}:${c.count}`).join(' ')}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
