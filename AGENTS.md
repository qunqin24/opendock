# OpenDock

Static plugin directory and rankings for OpenCode, built with Astro 7.
Pure static output — no backend, no database. Data is refreshed daily by a
GitHub Actions cron and committed to the repo.

## Commands

| Command | What it does |
|---|---|
| `pnpm dev` | Start the dev server |
| `pnpm build` | Production build |
| `pnpm check` | Type checking (`astro check`) |
| `pnpm data` | Full data pipeline run (npm + GitHub + downloads) |
| `pnpm data:dev` | Data pipeline with a ~120 package subset (fast) |

Requires Node `>=22.12.0` and pnpm (see `packageManager` in `package.json`).

## Dev server

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Architecture

- **Data pipeline** — `scripts/fetch-plugins.mjs` + `scripts/lib/`
  (`score.mjs` for scoring/health signals, `categories.mjs` for
  classification, `http.mjs`/`cache.mjs` for fetching). Reads npm,
  GitHub GraphQL, and the npm downloads API; merges star-history deltas
  from `data/history.json` and human overrides/blocklist from
  `data/curated.json`; writes `src/data/plugins.json` and per-plugin
  READMEs into `src/data/readme/`.
- **Pages** — `src/pages/` (index, rankings, categories, plugin detail
  pages, search index, RSS, submit, about). English owns the bare paths;
  Chinese lives under `src/pages/zh/`.
- **Interactive islands** — `src/components/PluginExplorer.tsx` is the
  only React island (search/filter on `/plugins` and category pages).
  Everything else is `.astro`. Full-site search is the ⌘K command palette
  (`CommandPalette.astro`) backed by Fuse.js, with the index loaded on
  demand from `search-index.json.ts`.
- **Styling** — Tailwind CSS v4 with shadcn/ui design tokens; global
  styles in `src/styles/global.css`.
- **i18n** — `src/lib/i18n.ts`; locales `en` (default, unprefixed) and
  `zh` (`/zh/`), configured in `astro.config.mjs`. The `site` URL there
  drives canonicals, hreflang, sitemap, RSS, and JSON-LD — changing it
  moves all of them.

## Conventions

- Plugin data snapshots (`src/data/plugins.json`, READMEs) are committed;
  cloning the repo works without any tokens.
- Do not edit `src/data/plugins.json` by hand — fix the pipeline or the
  overrides in `data/curated.json`, then rerun `pnpm data:dev` or `pnpm data`.
- After changes, run `pnpm check` to verify types.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
