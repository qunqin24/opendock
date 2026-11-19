<div align="center">

# OpenDock

**An automatically updated directory and leaderboard for OpenCode plugins**

[English](README.md) · [简体中文](README.zh-CN.md)

[Browse OpenDock](https://www.opendock.net) · [Submit a plugin](https://www.opendock.net/submit) · [Report an issue](https://github.com/qunqin24/opendock/issues/new)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Astro](https://img.shields.io/badge/Astro-7-BC52EE?logo=astro&logoColor=white)](https://astro.build)

</div>

## What OpenDock does

OpenDock helps you find and compare OpenCode plugins without digging through manually maintained lists. It refreshes public data from npm and GitHub daily.

- **Plugin discovery:** Finds npm packages with the `opencode-plugin` keyword.
- **Five leaderboards:** Overall score, GitHub stars, trending this week, downloads, and recently added.
- **Project health:** Flags archived projects, projects inactive for six months, missing documentation, and missing licenses.
- **Copyable install config:** Each plugin page includes an `opencode.json` snippet.
- **Bilingual site:** English and Simplified Chinese, with localized SEO, structured data, and RSS.
- **Static site:** No application backend, database, or tracking.

## How it works

```text
npm discovery → GitHub metadata → scoring and health checks → plugins.json → Astro build
```

The ranking, categorization, and health rules are open source. See the repository layout below.

## Tech stack

| Area | Tools |
|---|---|
| Framework | Astro 7, with static output and ClientRouter navigation |
| Interactivity | React 19 islands for search and filters on the plugin and category pages |
| Styling | Tailwind CSS v4 and shadcn/ui design tokens |
| Search | Fuse.js for page filters and the on-demand site-wide ⌘K search |
| Hosting | Self-hosted static site served by Nginx |
| Data refresh | Daily GitHub Actions workflow |

## Local development

```bash
pnpm install
pnpm dev
```

The repository includes a data snapshot, so you can start the dev server without a token.

### Refresh the data

```bash
pnpm data        # Full crawl, typically 10–20 minutes
pnpm data:dev    # Crawl 120 packages to check the pipeline quickly
```

The crawler caches responses in `.cache/` for 20 hours. Rerunning an interrupted crawl fills in missing results. Use `pnpm data --fresh` to bypass the cache.

Download counts are optional enrichment. Each request has a 10-second timeout, with separate three-minute budgets for weekly and monthly counts. On timeouts, rate limits, or partial responses, the crawler keeps cached or previously committed counts rather than replacing them with zero. Only new packages with no historical count fall back to zero. This fallback also applies with `--fresh`. The logs summarize which counts were updated, cached, retained, or unavailable.

The crawler needs a GitHub token for GraphQL. It uses `gh auth token` locally or `GITHUB_TOKEN` in CI. If you do not have the GitHub CLI, set `GITHUB_TOKEN` in your shell before running the crawler.

```bash
pnpm test     # HTTP timeout, retry, fallback, and budget regression tests
pnpm check    # Type checks
pnpm build    # Static build
```

## Repository layout

```text
scripts/
  fetch-plugins.mjs      Crawler entry point
  lib/categories.mjs     Category rules
  lib/score.mjs          Ranking and health checks
  lib/http.mjs           HTTP retries, GraphQL, and concurrency
data/
  curated.json           Featured plugins, exclusions, and overrides
  history.json           Generated daily star history for growth rankings
src/
  data/plugins.json      Generated plugin dataset
  data/readme/*.md       Generated plugin READMEs, stored separately
  lib/plugins.ts         Types and sorted views
  lib/readme.ts          README rendering and sanitization
  components/            UI components
  pages/                 Routes
```

## Curate the directory

| To change | Edit |
|---|---|
| Category rules | `scripts/lib/categories.mjs` |
| Ranking weights | `scripts/lib/score.mjs` |
| Featured plugins, exclusions, or individual plugin metadata | `data/curated.json` |

```jsonc
{
  "featured": ["oh-my-opencode-slim"],
  "include": ["some-package"],            // Include even without the keyword
  "blocklist": ["spam-package"],
  "overrides": {
    "some-package": { "category": "memory", "title": "A better name" }
  }
}
```

Run `pnpm data` after making changes.

## Deployment

Set `site` in `astro.config.mjs` to your public URL. Astro uses it for canonical URLs, the sitemap, and RSS.

The [refresh workflow](.github/workflows/refresh.yml) runs daily at 03:00 UTC. It fetches fresh data, checks types, runs tests, builds the site, commits the snapshot if it changed, and deploys the build to the production server over SSH. You can also run it manually in GitHub Actions.

### Self-hosted automatic deployment

- Configure the repository secrets `OPENDOCK_DEPLOY_HOST`, `OPENDOCK_DEPLOY_KEY`, and `OPENDOCK_DEPLOY_KNOWN_HOSTS`. Pin the SSH host key and keep host verification enabled.
- Use a dedicated `opendock-deploy` user. Restrict the SSH key to `scripts/deploy-receive.py` with a forced command and no interactive shell or forwarding.
- Install the script as `/usr/local/bin/opendock-deploy-receive`, owned by root. Give the deploy user write access to `/srv/opendock` and `/srv/opendock/releases`.
- Mount `/srv/opendock:/site:ro` in Nginx and serve from `/site/current`. The script verifies the uploaded files, switches `current` atomically, and rolls back if the live check fails. It retains recent releases and does not restart the web server.
- The workflow still deploys when the data is unchanged, so a manual run can restore the live build.

## Known limitations

- **Monorepo stars:** Packages in a monorepo inherit the repository's total stars.
- **Trending needs history:** Growth is based on daily snapshots, so a fresh installation starts without trending history.
- **npm discovery only:** Local-only plugins are not discovered automatically.

See the [About page](https://www.opendock.net/about) for details.

## License

[MIT](LICENSE). The snapshots in `src/data/` use public npm and GitHub metadata. Individual plugin READMEs and code remain the property of their respective authors.

OpenDock is a community project and is not affiliated with OpenCode.
