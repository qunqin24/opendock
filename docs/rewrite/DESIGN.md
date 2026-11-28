# OpenDock rewrite — design

Status: **draft for review** (2026-11-22). Nothing here is implemented yet.

## 1. Goals

- Replace the static Astro site with a **Next.js** app backed by **PostgreSQL**,
  self-hosted on our VPS behind nginx, still at `https://www.opendock.net`.
- Move the data pipeline off GitHub Actions into a **worker on the VPS** that
  writes straight to the database. Data stops being committed to git.
- Keep the existing **data model** (fields of `plugins.json`, star history,
  curation layer) and the **public URLs**.
- Leave room for later phases: a public API (Hono under `/api`), a remote
  **MCP server** for querying the market, and an **OpenCode plugin** with a
  visual manager panel plus opt-in anonymous install telemetry.

Non-goals for the first release: user accounts, comments beyond the existing
Giscus embed, listing MCP servers as catalog entries.

## 2. Decisions

| Topic | Decision |
|---|---|
| Web framework | Next.js (App Router), React, TypeScript |
| Database | PostgreSQL 18, accessed through Drizzle ORM (schema + migrations in TS) |
| i18n | next-intl, `en` unprefixed, `zh` under `/zh` (same as today) |
| Search | Postgres full-text search + `pg_trgm`, served by a route handler; replaces the shipped Fuse.js index |
| Hosting | Docker Compose on the VPS (`postgres`, `web`, `worker`); host nginx stays as TLS terminator / reverse proxy |
| Builds | Images built in GitHub Actions, pushed to GHCR; the VPS only pulls and runs |
| Repo | Same repo. New code lives in `apps/` and `packages/` next to the legacy site until cutover |
| Curation | `data/curated.json` stays in git (changes go through PR review) and is applied by the worker |
| Analytics / comments | Keep Umami (behind the consent banner) and Giscus |

## 3. Repository layout during the rewrite

The legacy Astro site stays at the repo root and keeps its daily
`refresh.yml` cron and static deploy until cutover. New code is added
alongside it as pnpm workspace packages:

```
apps/
  web/            Next.js site
  worker/         data pipeline + scheduler (Node, long-running)
packages/
  core/           pure logic ported from scripts/lib: score, health, categories,
                  compat (V1/V2, surfaces), descriptions, readme-langs
  db/             Drizzle schema, migrations, query helpers, JSON importer
docker/
  compose.yml     production stack
  compose.dev.yml local Postgres only
docs/rewrite/     this document and follow-ups
(root)            legacy Astro site, scripts/, data/ — deleted at cutover,
                  except data/curated.json which moves to packages/db or stays
```

`pnpm-workspace.yaml` gains `packages: [apps/*, packages/*]`; the root
package keeps working as-is. `packages/core` is the only code shared by
worker and web, so ranking and health logic cannot drift between them.

## 4. Data model

Today one `plugins.json` row mixes npm data, GitHub data, downloads and
derived values. The schema splits these by source so each crawl stage
updates only what it owns, and history becomes a real table.

### Tables

**`packages`** — one row per npm package that is or was listed.

| Column | Notes |
|---|---|
| `name` (PK) | npm name, e.g. `@scope/pkg` |
| `slug` (unique) | URL slug, same algorithm as today (`@a/b` → `a--b`) |
| `title`, `version`, `description`, `keywords text[]`, `license` | from the packument |
| `deprecated bool`, `homepage`, `npm_url` | |
| `repo_id` → `repositories.id` (nullable) | several packages can share one repo (monorepos) |
| `opencode` enum `v1 \| v2 \| both \| unknown`, `opencode_inferred bool` | from `core/compat` |
| `surfaces text[]` | `server`, `tui`, `gui` |
| `category_id` → `categories.id` | after curated override |
| `featured bool`, `blocked bool` | from `curated.json` |
| `downloads_week`, `downloads_month` | latest values |
| `score real`, `stars_credited int`, `stars_inherited bool` | derived, recomputed each run |
| `health jsonb`, `health_level` enum `ok \| warn \| danger` | derived |
| `first_seen_at`, `last_seen_at`, `delisted_at` | lifecycle; a package that drops out of npm search is delisted, not deleted, so URLs can 301/410 deliberately |
| `search tsvector` (generated) | name, title, description, keywords |

**`repositories`** — `id`, `slug` (`owner/name`, unique), `owner`,
`owner_avatar`, `stars`, `forks`, `open_issues`, `archived`, `is_fork`,
`topics text[]`, `pushed_at`, `created_at`, `fetched_at`.

**`metrics_daily`** — `(package_name, day)` PK, `stars`, `downloads_week`,
`downloads_month`. Replaces `data/history.json`; `starsDelta7d/30d` become a
query (or a materialized view refreshed by the worker). Also enables trend
charts later.

**`categories`** — `id`, `icon`, `sort`, `label_en`, `label_zh`,
`description_en`, `description_zh`. Seeded from `core/categories`.

**`translations`** — `(package_name, field, locale)` PK, `source_hash`,
`text`, `provider`, `updated_at`. Replaces `data/translations.json`; a changed
source hash triggers re-translation.

**`readmes`** — `(package_name, lang)` PK, `content`, `is_primary`,
`source_path`, `etag`, `fetched_at`. Replaces `src/data/readme/` (46 MB of
Markdown, fine as `text`).

**`package_versions`** — `(package_name, version)` PK, `published_at`.
Replaces `versions` in `src/data/details/<slug>.json`.

**`repo_releases`** — `repo_id`, `tag`, `name`, `published_at`, `url`,
`prerelease`, `body`; **`repo_issues`** — `repo_id`, `number`, `title`,
`url`, state and dates. Both replace `releases` / `issues` in the details
files and are kept per repository, since monorepo packages share them
(today's `sharedRepo` flag becomes "repo has more than one package").

**`crawl_runs`** — `id`, `kind` (`full` / `light`), `started_at`,
`finished_at`, `status`, `stats jsonb`, `error`. Lets the site show "data as
of …" (today's `generatedAt`) and makes failures visible.

Later phase (not in the first release): **`install_events`** for opt-in
telemetry — `day`, `package_name`, `action` (`install`/`uninstall`/`update`),
`opencode_version`, `client_version`; no IP, no stable user id, aggregated
daily.

### Search

- `packages.search` GIN index for full-text matches on English text.
- `pg_trgm` GIN indexes on `name` and on the zh description in
  `translations`, so substring and Chinese queries work without a CJK
  tokenizer. To be validated against real queries during phase 2.

### Migrating existing data

A one-off importer in `packages/db` reads the committed snapshot
(`src/data/plugins.json`, `src/data/details/`, `src/data/readme/`,
`data/history.json`, `data/translations.json`) into an empty database. This preserves ~2 months of
star history for ~1.5k plugins and every cached translation, and it is also
how a fresh local database gets seeded until the public dump exists.

## 5. Worker (data pipeline)

Port `scripts/fetch-plugins.mjs` into `apps/worker`, keeping its stages and
using `packages/core` for logic and `packages/db` for writes:

1. **Discover** — npm search by keyword (`opencode-plugin`, …) + `curated.include`, minus `blocklist`.
2. **Manifests** — packuments (cached on disk, ETag-aware), compat and surfaces.
3. **GitHub** — GraphQL batch for repo stats, README and README variants,
   releases and open issues.
4. **Downloads** — npm downloads API in bulk chunks.
5. **Classify & translate** — categories, Bing translation for new/changed text.
6. **Derive** — score, health, credited stars.
7. **Write** — one transaction per run: upsert packages/repos, append
   `metrics_daily`, mark delisted packages, record `crawl_runs`.
8. **After commit** — revalidate the web cache, ping IndexNow with changed URLs.

Scheduling inside the worker process (no host cron):

- **Full run** daily at 03:00 UTC (same as today).
- **Light run** hourly: new packages from npm search and downloads/stars for
  the top N; cheap enough to make new plugins appear within the hour instead
  of the next day.

The crawler cache moves from the Actions cache to a Docker volume. Secrets
(`GITHUB_TOKEN`, IndexNow key, revalidation secret) live in an env file on
the VPS, never in the image.

## 6. Web app

- **Data access** — React Server Components query Postgres through
  `packages/db` (server-only). No client-side database access, no API needed
  for the site itself.
- **Caching** — pages are statically generated on demand and cached; the
  worker calls a secret-protected revalidation route after each run, which
  invalidates by tag (`plugins`, `plugin:<slug>`, `rankings`, …). Pages stay
  as fast as the static site without a rebuild per data refresh.
- **Client islands** — the plugin explorer (filters, sort) and the ⌘K palette
  become client components; search calls a route handler instead of
  downloading the whole index.
- **SEO parity** — canonical URLs, hreflang, sitemap, RSS, JSON-LD, robots,
  IndexNow key file, OG images.
- **UI** — rebuilt from scratch; Tailwind v4 + shadcn/ui remain the
  default unless the redesign decides otherwise.

### Routes (kept)

| Path (en; zh under `/zh`) | Purpose |
|---|---|
| `/` | home: featured, trending, categories |
| `/plugins`, `/plugins/[slug]` | explorer, detail (README with language switch, install snippet, health) |
| `/rankings` | leaderboards |
| `/categories`, `/categories/[id]` | category index and lists |
| `/authors/[author]` | author page |
| `/config-check` | config checker (V1/V2 aware) |
| `/submit` | how to get listed + package checker |
| `/about` | about |
| `/rss.xml`, `/facts.json`, `/snapshot.json`, `/plugins-index.json`, `/search-index.json` | machine-readable endpoints, kept for existing consumers |

Every existing route is kept for the first release. Features may be dropped
or merged during the redesign; a dropped route gets a 301 to its closest
replacement, never a 404.

## 7. Deployment

```
host nginx (TLS, opendock.net)  →  127.0.0.1:3000  web (Next.js standalone)
                                                   worker
                                                   postgres (volume)
```

- **CI** (`validate` replacement): typecheck, unit tests, and an integration
  test that starts a Postgres service container, runs migrations, imports a
  small fixture, and renders key pages.
- **CD** on push to `main`: build `web` and `worker` images → push to GHCR →
  SSH to the VPS → `docker compose pull && docker compose up -d`. A one-shot
  `migrate` service runs Drizzle migrations before `web` starts.
- **Backups**: daily `pg_dump` to `/srv/opendock/backups`, 14-day retention;
  off-site copy to be decided.
- **Cutover**: once the new stack has run in shadow mode (worker writing,
  site reachable on a private hostname), point the nginx `server` block at
  `127.0.0.1:3000`. Rollback is pointing it back at the static
  `/srv/opendock/current`. After a stable period, delete the legacy site,
  `refresh.yml`, `deploy-receive.py` and `push-snapshot.sh`.

## 8. Local development

```
docker compose -f docker/compose.dev.yml up -d   # Postgres
pnpm db:migrate
pnpm db:seed          # import the committed snapshot / public dump
pnpm --filter web dev
```

Cloning must keep working without tokens. Until cutover, `db:seed` imports
the committed JSON snapshot. After cutover the worker publishes a daily
public dump (no secrets, same data the site shows) that `db:seed` downloads.

## 9. Phases

| Phase | Scope | Done when |
|---|---|---|
| 0. Foundation | workspace, `packages/core` port with existing tests, `packages/db` schema + migrations, dev compose, JSON importer | `db:seed` loads today's snapshot; core tests pass |
| 1. Worker | pipeline writes Postgres; runs on the VPS in shadow mode next to the old cron | a week of runs whose output matches `plugins.json` within expected drift |
| 2. Web | all routes above at parity, both locales, SEO parity, new UI | side-by-side review against the live site |
| 3. Cutover | CD pipeline, backups, nginx switch | site served from the new stack; legacy deleted after a stable period |
| 4. API + MCP | Hono under `/api`, typed client, remote MCP server (search, details, compatibility) | MCP usable from Claude / OpenCode |
| 5. OpenCode plugin | V2 plugin: TUI manager panel (browse, install, update, uninstall via `opencode plugin` CLI), agent tools, opt-in telemetry | published on npm and listed on OpenDock |

Phase 5 needs an early prototype: the OpenCode docs do not document shell or
filesystem access from a plugin, which install/uninstall depend on.

## 10. Open questions

1. Which existing features to drop or merge, and which new site features
   (trend charts, comparison, collections) belong in phase 2 vs later.
2. Is the hourly light run worth it, or is daily enough?
3. Off-site backup target.
4. Hostname for shadow mode (e.g. `next.opendock.net`).
