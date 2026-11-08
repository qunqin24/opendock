# opencode-charts

Unofficial OpenCode plugin: deterministic, themed charts from a spec. It takes Vega-Lite, Vega or ECharts in, and
writes SVG, PNG (1–3x) and an optional offline interactive HTML page under `outputs/charts/`. The same input gives
the same bytes on the same platform, and the same picture on any: across platforms a coordinate can differ only in
its last digits. Nothing is ever loaded from the network.

- **Any chart.** 53 tested chart types:
  - statistical charts, facets, layers, dual axes and selections (Vega-Lite);
  - treemap, sunburst, tree, force network and word cloud (Vega);
  - Sankey, chord, gauge, funnel, calendar heatmap, candlestick, radar and parallel coordinates (ECharts);
  - world and US maps from bundled atlases.
- **Any theme.** `light`, `dark`, `high-contrast`, `print`, `presentation`, `toqan` and `toqan-night`, or your own tokens, saved by name. Palettes are colour-blind-safe and checked for contrast. Fonts are bundled (Inter, Geist, JetBrains Mono), so text measures and draws identically everywhere.
- **Right first time.**
  - Validation that teaches: `Field "revenu" is not in the data. Did you mean "revenue"?`, with the JSON path.
  - Lint for misleading or unreadable charts.
  - Overlap and clipping checks on the drawn chart.
  - The rendered PNG returned for the model to look at.
- **Safe.** No URLs, loaders or images. Workspace-confined paths, size and expression caps, and a worker with a time and memory limit.

## Install

```json
{ "plugin": ["@joe-broadhead/opencode-charts@0.0.2"] }
```

Options (all optional):

```json
{ "plugin": [["@joe-broadhead/opencode-charts@0.0.2", { "theme": "light", "locale": "en-GB", "outDir": "outputs/charts", "themes": { "acme": { "extends": "light", "colors": { "categorical": ["#0B5FFF", "#FF6A3D", "#00A87E"] } } } }]] }
```

The host range is `>=2.2.5 <2.3.0`. Options, permissions, limits and errors are in
[docs/configuration.md](docs/configuration.md).

## Permissions

The three tools that write files (`charts_render`, `charts_quick`, `charts_theme_save`) ask before they run, and the
three that only read run without asking: the plugin puts that default block after each agent's base allow rule, and
your own `permissions` can change it. Each tool also asks for `read` on a data file and `edit` on its output folder.

## Status

`/charts-status` shows the renderers, the defaults, the themes, the skills, the tools the agent can see, any agent
that would run the writers without asking, the OpenCode version and the next step.

## Tools

| Tool | What it does |
|---|---|
| `charts_render` | Any spec (Vega-Lite, Vega or ECharts, detected) plus `data` (`rows`, or a workspace `path` to CSV, TSV, JSON, JSONL or Parquet, with optional Vega-Lite `transform`s). Writes `<name>.svg`, `<name>.png` and `<name>.vl.json` (plus `.html` on request), and returns a markdown image line to show it inline. |
| `charts_quick` | `bar`, `horizontal_bar`, `grouped_bar`, `stacked_bar`, `line`, `area`, `stacked_area`, `scatter`, `bubble`, `pie`, `donut`, `histogram`, `box_plot` and `heatmap`, from field names. |
| `charts_validate` | The same checks as render, plus the PNG, with no files written. |
| `charts_catalogue` | Every chart type, and a working example of any. |
| `charts_themes` / `charts_theme_save` | List themes and their tokens; save a brand theme to `.charts/themes/<name>.json`. |

Example:

```json
{
  "spec": { "mark": "bar", "encoding": { "x": { "field": "region", "type": "nominal", "sort": "-y" }, "y": { "field": "revenue_eur", "type": "quantitative" } } },
  "data": { "path": "data/sales.csv" },
  "title": "Revenue by region, 2024",
  "theme": "toqan",
  "currency": "EUR",
  "locale": "de-DE"
}
```

In a spec, refer to the data as `{"name": "table"}` (or leave `data` out), to maps as `{"atlas": "world-110m"}`,
`"us-states-10m"` or `"world-land-110m"`, and to theme colours as `"theme:positive"`, `"theme:categorical.2"` and so on.

## Errors

Every error reads `CODE: what happened (at /json/path). Next step: what to do.` The code is also in the tool error's
metadata.

## Development

```bash
npm ci
npm run check              # typecheck, build, unit tests, shared copies, icons, package shape, pack
bun scripts/gallery.ts /tmp/gallery     # 67 charts across all themes + contact sheets
bun eval/run.ts /tmp/eval  # 30 natural-language requests, checked
bun eval/perf.ts           # timings
UPDATE_GOLDEN=1 bun test test/output.test.ts   # accept a reviewed change in output
```

A release is a `v<version>` tag on `master`: `.github/workflows/release.yml` checks, packs and publishes it to npm
with provenance, after approval in the `release` environment.

`node scripts/data.mjs` regenerates the locales and atlases, and `bun scripts/cookbook.ts` regenerates the cookbook
skill. Both outputs are committed.

See [DESIGN.md](DESIGN.md) for the design and its evidence, [docs/architecture.md](docs/architecture.md) for how
it is built, [docs/jelly.md](docs/jelly.md) for Jelly, and
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for licences: Vega and Vega-Lite (BSD-3-Clause), ECharts
(Apache-2.0), resvg (MPL-2.0), and the fonts (OFL-1.1).
