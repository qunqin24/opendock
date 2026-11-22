# opencode-modelrank

[![npm](https://img.shields.io/npm/v/@catronomix/opencode-modelrank?cacheSeconds=3600)](https://www.npmjs.com/package/@catronomix/opencode-modelrank)
[![license](https://img.shields.io/npm/l/@catronomix/opencode-modelrank?cacheSeconds=3600)](LICENSE)
[![node](https://img.shields.io/node/v/@catronomix/opencode-modelrank?cacheSeconds=3600)](https://nodejs.org)

Zen and Go sell overlapping model catalogs at different prices, and "which one
should I actually run?" is not obvious from either list. This OpenCode V2 plugin
puts benchmark score and real cost side by side: a `/modelrank` menu to pick the
models and the ranking you care about, and a live comparison in the sidebar
while you work.

The ranking keeps the rules from the original `ocm` CLI:

- five tracked benchmarks — **Terminal-Bench 2.1**, **Terminal-Bench 4.0**,
  **SWE-Bench Verified**, **SWE-Bench Pro**, **DeepSWE 1.1**;
- each benchmark is normalised to its own 0–100 scale over the fetched
  catalog, and a model's score is the **median** of the scales it carries;
- a model with fewer than two tracked benchmarks is **unranked**, not last;
- cost uses a representative coding session (400k input, 80% cache reads, 50k
  output) instead of a raw $/1M blend, because agent traffic is mostly cache
  reads.

## Install

```sh
opencode plugin add @catronomix/opencode-modelrank
```

Or edit the TUI plugin list in `cli.json` directly:

```json title="~/.config/opencode/cli.json"
{
  "plugins": ["@catronomix/opencode-modelrank"]
}
```

The sidebar and the `/modelrank` command are a TUI part, so they are configured
in `cli.json`; the same entry is not enough in `opencode.jsonc`. That file loads
the package's server part (`.`), which is an empty entrypoint kept so the
package installs like any other plugin. The bare name installs the latest
release; use `@next` for prereleases.

No credentials are involved: everything is fetched from OpenCode's public
endpoints, anonymously.

The sidebar must be visible for the comparison panel to appear:

```jsonc
// cli.json
"session": { "sidebar": "show" }
```

## Use

`/modelrank` (alias `/mr`, also in the command palette as **Model comparison
(score vs price)**) opens a menu:

| Entry | What it does |
|---|---|
| **Sort** | `score per $`, `benchmark score`, `$/1M blended`, `cache ratio`, `context window`, `name` |
| **Benchmark focus** | overall median, or rank on one of the five tracked benchmarks |
| **Models included** | toggle rows on/off; quick actions for all / none / free / Go only / Zen only |
| **Sidebar rows** | 4, 6, 8, 12, 16 or 24 rows |
| **Refresh data** | refetch the Zen/Go catalogs and benchmark records |

Settings and the exclusion list persist in plugin storage across restarts.

The sidebar panel shows rank, model, focused score and blended $/1M. The model
you have selected is marked `▸`. A row appears once per model/price/context:
a model offered by both plans at the same price is a single row.

## Data

Everything comes from OpenCode's own public endpoints:

| Source | Used for |
|---|---|
| `opencode.ai/zen/v1/models` | Zen catalog, prices, context limits, `canonical_id` |
| `opencode.ai/inference/go/v1/models` | Go catalog, prices, peak-hour multipliers |
| `opencode.ai/data/<lab>/<slug>.json` | benchmark records for the `canonical_id` |

Results are cached at `~/.cache/opencode-modelrank/snapshot.json`
(`OPENCODE_MODELRANK_DATA` overrides the directory) and refreshed in the
background after 6 hours, or on demand from the menu. Models with no
benchmark record still appear with prices and rank last when a score is
required.

## Development

```sh
npm install
npm test              # ranking logic, node:test
npm run typecheck     # tsc --noEmit
npm run build         # tsup -> dist/ (also runs on prepack)
node scripts/inspect.ts   # live check of coverage + top rows per view
```

Published builds are bundled to `dist/` (ESM + `.d.ts`); `@opencode/plugin`,
`@opentui/*` and `solid-js` stay external peers so the plugin shares the host's
copies.

## Credits

A TypeScript re-make of [`opencode-models`](https://pypi.org/project/opencode-models/)
by codesam ([repo](https://github.com/codesam88/opencode-models)), the `ocm`
Python CLI (MIT); ranking semantics and benchmark selection are ported from it.
Benchmark numbers are taken from OpenCode's model catalog, which cites each run's
source page.
