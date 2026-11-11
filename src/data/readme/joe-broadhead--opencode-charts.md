# Charts for OpenCode

Deterministic, themed charts from a spec, with no model and no network. It takes Vega-Lite, Vega or ECharts in, and
writes SVG, PNG (1–3x) and an optional offline interactive HTML page under `outputs/charts/`. The same input gives
the same bytes on the same platform, and the same picture on any: across platforms a coordinate can differ only in
its last digits. Nothing is ever loaded from the network.

Unofficial; not affiliated with OpenCode or Anomaly.

## Requirements

- OpenCode `>=2.2.3 <2.3.0`, tested on 2.2.3, 2.2.4, 2.2.5 and 2.2.6.
- macOS or Linux.
- No network, no system fonts and no provider: every render is local and deterministic.

## Install

Add the plugin to your `opencode.json`, or run `opencode plugin add github:joe-broadhead/opencode-charts#v0.0.0`:

```json
{ "plugins": ["github:joe-broadhead/opencode-charts#v0.0.0"] }
```

```sh
opencode plugin add github:joe-broadhead/opencode-charts#v0.0.0
```

Run `opencode reload`, or restart OpenCode, then run `/charts-status`.

Each release has its own tag, and a Git install does not update by itself. To move to a newer release, remove the old entry with `opencode plugin remove github:joe-broadhead/opencode-charts#v0.0.0`, then add the new tag with `opencode plugin add github:joe-broadhead/opencode-charts#v<version>`.

Or add the plugin to `opencode.json` instead, with the same spec:

```json
{ "plugins": [{ "package": "github:joe-broadhead/opencode-charts#v0.0.0" }] }
```

The install takes the GitHub release tag. Its commit carries the built `dist/`, so the install runs no build.
A new release is a new tag: install it with its own `#v<version>` spec.

Options (all optional):

```json
{ "plugins": [["github:joe-broadhead/opencode-charts#v0.0.0", { "theme": "light", "locale": "en-GB", "outDir": "outputs/charts", "themes": { "acme": { "extends": "light", "colors": { "categorical": ["#0B5FFF", "#FF6A3D", "#00A87E"] } } } }]] }
```

Options, limits and errors are in [docs/configuration.md](docs/configuration.md).
## Use

Ask for the chart you want, as a question or a spec:

> Chart revenue by region for 2024 as bars, in the dark theme.

> Draw this table as a stacked area chart, and tell me if the axis is misleading.

The agent picks `charts_quick` for a known type or `charts_render` for a full spec, and the PNG comes back for it to
look at. Every tool is listed under [Tools](#tools).

- **Any chart.** 53 tested chart types:
  - statistical charts, facets, layers, dual axes and selections (Vega-Lite);
  - treemap, sunburst, tree, force network and word cloud (Vega);
  - Sankey, chord, gauge, funnel, calendar heatmap, candlestick, radar and parallel coordinates (ECharts);
  - world and US maps from bundled atlases.
- **Any theme.** `light`, `dark`, `high-contrast`, `print` and `presentation`, or your own tokens, saved by name. Palettes are colour-blind-safe and checked for contrast. Fonts are bundled (Inter, JetBrains Mono), so text measures and draws identically everywhere.
- **Right first time.**
  - Validation that teaches: `Field "revenu" is not in the data. Did you mean "revenue"?`, with the JSON path.
  - Lint for misleading or unreadable charts.
  - Overlap and clipping checks on the drawn chart.
  - The rendered PNG returned for the model to look at.
- **Safe.** No URLs, loaders or images. Workspace-confined paths, size and expression caps, and a worker with a time and memory limit.

## Permissions

**Every tool is allowed by default.** The plugin inserts this block after each agent's base allow rule. `access: "all"`
is the default, so this is the block in force:

<!-- rules:all -->
```json
[
  {"action": "charts_*", "resource": "*", "effect": "allow"},
  {"action": "charts_render", "resource": "*", "effect": "allow"},
  {"action": "charts_quick", "resource": "*", "effect": "allow"},
  {"action": "charts_validate", "resource": "*", "effect": "allow"},
  {"action": "charts_recommend", "resource": "*", "effect": "allow"},
  {"action": "charts_capabilities", "resource": "*", "effect": "allow"},
  {"action": "charts_catalogue", "resource": "*", "effect": "allow"},
  {"action": "charts_themes", "resource": "*", "effect": "allow"},
  {"action": "charts_theme_save", "resource": "*", "effect": "allow"}
]
```
<!-- /rules:all -->

With `access: "ask-changes"`, the five reads run and the three writers ask:

<!-- rules:ask-changes -->
```json
[
  {"action": "charts_*", "resource": "*", "effect": "ask"},
  {"action": "charts_render", "resource": "*", "effect": "ask"},
  {"action": "charts_quick", "resource": "*", "effect": "ask"},
  {"action": "charts_validate", "resource": "*", "effect": "allow"},
  {"action": "charts_recommend", "resource": "*", "effect": "allow"},
  {"action": "charts_capabilities", "resource": "*", "effect": "allow"},
  {"action": "charts_catalogue", "resource": "*", "effect": "allow"},
  {"action": "charts_themes", "resource": "*", "effect": "allow"},
  {"action": "charts_theme_save", "resource": "*", "effect": "ask"}
]
```
<!-- /rules:ask-changes -->

With `access: "read-only"`, the five reads run and the three writers are denied:

<!-- rules:read-only -->
```json
[
  {"action": "charts_*", "resource": "*", "effect": "deny"},
  {"action": "charts_render", "resource": "*", "effect": "deny"},
  {"action": "charts_quick", "resource": "*", "effect": "deny"},
  {"action": "charts_validate", "resource": "*", "effect": "allow"},
  {"action": "charts_recommend", "resource": "*", "effect": "allow"},
  {"action": "charts_capabilities", "resource": "*", "effect": "allow"},
  {"action": "charts_catalogue", "resource": "*", "effect": "allow"},
  {"action": "charts_themes", "resource": "*", "effect": "allow"},
  {"action": "charts_theme_save", "resource": "*", "effect": "deny"}
]
```
<!-- /rules:read-only -->

So a render writes files into the project whenever an agent decides to, with no prompt; each tool still asks the host
for `read` on a data file and `edit` on its output folder. An output folder outside the project also needs an
`external_directory` allow, because OpenCode asks for that as well before anything is written:

```json
{ "permissions": [{ "action": "external_directory", "resource": "/path/to/charts/*", "effect": "allow" }] }
```

A refusal that names `external_directory` costs nothing: nothing was read and nothing was written.

To restrict, choose one of three:

1. **`access`**, one option for the plugin: `"all"` (the default), `"ask-changes"` (the five reads run, the writers
   ask) or `"read-only"` (the reads run, the writers are denied).
2. **An agent's own rules**, such as a drafts-only agent: `"permissions": [{ "action": "charts_*", "resource": "*",
   "effect": "deny" }, { "action": "charts_validate", "resource": "*", "effect": "allow" }]`.
3. **A per-tool rule** in your `opencode.json`: `{ "action": "charts_render", "resource": "*", "effect": "ask" }`, or
   `"deny"` to turn one tool off.

The last matching rule wins, so a later rule of yours still decides.

## Status

`/charts-status` shows the renderers, the defaults, the themes, the skills, the tools the agent can see, any agent
that is missing the plugin's default block (so the `access` value does not reach it), the OpenCode version and the
next step.

## Tools

| Tool | What it does |
|---|---|
| `charts_render` | Any spec (Vega-Lite, Vega or ECharts, detected) plus `data` (`rows`, or a workspace `path` to CSV, TSV, JSON, JSONL or Parquet, with optional Vega-Lite `transform`s). Writes `<name>.svg`, `<name>.png` and `<name>.vl.json` (plus `.html` on request), and returns a markdown image line to show it inline. |
| `charts_quick` | `bar`, `horizontal_bar`, `grouped_bar`, `stacked_bar`, `line`, `area`, `stacked_area`, `scatter`, `bubble`, `pie`, `donut`, `histogram`, `box_plot` and `heatmap`, from field names. |
| `charts_validate` | The same checks as render, plus the PNG, with no files written. Also returns the figure tree: every label, its box, and which ones collide or run off the edge, with ids the preview numbers. |
| `charts_recommend` | Which chart fits a question, its data and its medium: a ranked shortlist with a reason each, the encoding to use, and a ready `charts_render` call on your own columns. Advises; it never renders. |
| `charts_capabilities` | Exactly what this build can do: engines, working output formats, themes and palette sizes, bundled fonts and the scripts they cover, data formats, limits, and what is known not to work. |
| `charts_catalogue` | Every chart type, and a working example of any. |
| `charts_themes` / `charts_theme_save` | List themes and their tokens; save a brand theme to `.charts/themes/<name>.json`. |

There is one list behind all of these: `src/registry.ts` defines each tool once, and the plugin's tool registration,
the Jelly declaration, the tools RPC and `docs/tool-parity.md` are projections of it. A test fails when they drift.

Example:

```json
{
  "spec": { "mark": "bar", "encoding": { "x": { "field": "region", "type": "nominal", "sort": "-y" }, "y": { "field": "revenue_eur", "type": "quantitative" } } },
  "data": { "path": "data/sales.csv" },
  "title": "Revenue by region, 2024",
  "theme": "dark",
  "currency": "EUR",
  "locale": "de-DE"
}
```

In a spec, refer to the data as `{"name": "table"}` (or leave `data` out), to maps as `{"atlas": "world-110m"}`,
`"us-states-10m"` or `"world-land-110m"`, and to theme colours as `"theme:positive"`, `"theme:categorical.2"` and so on.

## Errors

Every error reads `CODE: what happened (at /json/path). Next step: what to do.` The code is also in the tool error's
metadata, and a test keeps this table and the code equal.

| Code | When |
| --- | --- |
| `SPEC_INVALID`, `SPEC_UNSAFE`, `SPEC_TOO_LARGE`, `SPEC_TOO_EXPENSIVE` | The spec cannot render, would load something, or is too large or slow. |
| `INPUT_INVALID`, `OPTIONS_INVALID` | The call does not match the tool's parameters, or the plugin's options are not valid. |
| `DATA_INVALID`, `DATA_EMPTY`, `DATA_TOO_LARGE`, `DATA_FORMAT_UNKNOWN`, `TRANSFORM_INVALID` | The data or its transform; `DATA_EMPTY` is a table with no rows. |
| `PATH_INVALID`, `PATH_OUTSIDE_WORKSPACE`, `PATH_IS_URL`, `PATH_PRIVATE`, `FILE_NOT_FOUND`, `NOT_A_FILE` | A workspace path. |
| `THEME_NOT_FOUND`, `THEME_INVALID`, `THEME_CYCLE`, `THEME_NAME_INVALID`, `THEME_NAME_TAKEN`, `FONT_INVALID`, `FONT_TOO_LARGE` | A theme, a theme name, or its fonts. |
| `LOCALE_UNKNOWN`, `CURRENCY_UNKNOWN`, `ATLAS_UNKNOWN`, `CHART_TYPE_UNKNOWN`, `FIELD_MISSING`, `SIZE_INVALID`, `SCALE_INVALID` | A name or a value the call gives. |
| `PNG_UNAVAILABLE`, `PNG_TOO_LARGE`, `HTML_UNAVAILABLE`, `RENDER_FAILED` | A renderer. |
| `SKILLS_INVALID`, `STATUS_UNAVAILABLE` | Setup could not load a skill, or `/charts-status` could not be read (in the server log, or the session). |
| `NO_MARK`, `NO_MARKS`, `NO_SERIES`, `DATA_TWICE`, `AXES_MISSING`, `SANKEY_CYCLE`, `SERIES_TYPE_MISSING`, `UNKNOWN_MARK`, `UNKNOWN_CHANNEL`, `UNKNOWN_PROPERTY`, `UNKNOWN_TYPE`, `UNKNOWN_DATASET`, `UNKNOWN_FIELD`, `TYPE_MISMATCH`, `PIE_NEGATIVE`, `DATA_MISSING` | A spec or data problem that stops the render, reported inside `SPEC_INVALID` with its JSON path and a fix. |
| `EMPTY_DATA`, `NOT_A_DATE`, `DATE_AS_CATEGORY`, `MISSING_UNITS`, `TRUNCATED_AXIS`, `DUAL_AXIS`, `DUPLICATE_TICKS`, `UNSORTED_BARS`, `OVERPLOTTING`, `TOO_MANY_SERIES`, `PIE_TOO_MANY_SLICES`, `RAINBOW_SEQUENTIAL`, `LOW_CONTRAST`, `LABEL_COLLISION`, `LABEL_CLIPPED`, `LABEL_DENSITY`, `FONT_NOT_BUNDLED`, `FONT_GLYPH_MISSING`, `VEGA_LITE_WARNING`, `VEGA_WARNING` | A lint or drawing warning, returned with the result beside the chart. |

## Configure

`theme`, `locale`, `outDir`, `themes`, `svgText` and the limits are in
[docs/configuration.md](docs/configuration.md), with their defaults. A theme saved in the workspace
(`.charts/themes/<name>.json`) wins over one in this config. `/charts-status` shows the values in force.

## Organisation rollout

A shared `opencode.json` (for example `/etc/opencode/opencode.json` on Linux and
`/Library/Application Support/opencode/opencode.json` on macOS) pins one `theme`, `outDir` and `themes` set for
everyone, and `access: "read-only"` stops agents writing files at all:

```json
{ "plugins": [["github:joe-broadhead/opencode-charts#v0.0.0", { "theme": "acme", "access": "read-only" }]] }
```

Charts makes no network call, sends nothing anywhere, and needs no credential, so a rollout has no data egress to
review.

## Troubleshooting

Run `/charts-status` first: it names the renderers that failed, the next step, and any agent the default block did
not reach, with the block to paste. A `PNG_UNAVAILABLE` or `HTML_UNAVAILABLE` means the packaged runtime is missing,
and reinstalling the plugin restores it. A refusal that names `permission.rejected: external_directory` means the
output folder is outside the project and needs the rule the README's Permissions section gives. Every error code and
its next step is in [docs/configuration.md](docs/configuration.md#errors).

## Uninstall

`opencode plugin remove github:joe-broadhead/opencode-charts#v0.0.0`. Rendered charts stay where they were written
(`outputs/charts` by default), and the plugin leaves no other state.

## Development

```bash
npm ci
npm run check              # typecheck, build, unit tests, shared copies, icons, package shape, pack, evals, host
bun scripts/gallery.ts /tmp/gallery     # 63 charts across all themes + contact sheets
bun eval/run.ts /tmp/eval  # 28 natural-language requests, checked
bun eval/recommend.ts /tmp/rec  # 21 advice cases against the committed baseline
bun eval/perf.ts           # timings
UPDATE_GOLDEN=1 bun test test/output.test.ts   # accept a reviewed change in output
```

A release is a `v<version>` tag on `master`: `.github/workflows/release.yml` checks, packs and publishes it to npm
with provenance, after approval in the `release` environment.

`node scripts/data.mjs` regenerates the locales and atlases, and `bun scripts/cookbook.ts` regenerates the cookbook
skill. Both outputs are committed.

Bundled fonts cover Latin, Greek and Cyrillic; a label beyond them gets `FONT_GLYPH_MISSING` and the fix is a font
file with `theme.font.files`. There is no PDF output and no Plotly or Mermaid input. `charts_capabilities` reports
the same list for the build you have, and [docs/status.md](docs/status.md) says what does not work and why.

See [DESIGN.md](DESIGN.md) for the design and its evidence, [docs/architecture.md](docs/architecture.md) for how
it is built, [docs/jelly.md](docs/jelly.md) for Jelly, and
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for licences: Vega and Vega-Lite (BSD-3-Clause), ECharts
(Apache-2.0), resvg (MPL-2.0), and the fonts (OFL-1.1).

## Known limits

- **No PDF output, and no Plotly or Mermaid input.** [docs/status.md](https://github.com/joe-broadhead/opencode-charts/blob/HEAD/docs/status.md) says what does not work and why, and `charts_capabilities` reports what this build supports.
- **Bundled fonts cover Latin, Greek and Cyrillic.** A label beyond them gets `FONT_GLYPH_MISSING`; the fix is a font file with `theme.font.files`.
- **Built-in themes are neutral.** Brand themes are not in the plugin. Save one with `charts_theme_save`, or set it in the plugin's options, and use it by name.
- **Nothing is loaded from the network.** A remote data file or image is not fetched.
- **PNG and HTML need the packaged runtime.** A missing runtime is reported as `PNG_UNAVAILABLE` or `HTML_UNAVAILABLE`; reinstalling the plugin restores it.
- **Package size.** The package is about 8 MB unpacked, and `dist/index.js` is 2.3 MB: Vega, ECharts and the PNG rasteriser are bundled, so a render needs no network.
- **Host range.** OpenCode `>=2.2.3 <2.3.0`, tested on 2.2.3, 2.2.4, 2.2.5 and 2.2.6.
- Updates are not automatic for a Git install, and `opencode plugin update` and `opencode plugin check` do not work on one: to move to a newer release, remove the old entry and add the new tag.

## Links

- [docs/configuration.md](docs/configuration.md), [docs/status.md](docs/status.md), [docs/tool-parity.md](docs/tool-parity.md),
  [docs/scripting.md](docs/scripting.md), [docs/jelly.md](docs/jelly.md), [docs/architecture.md](docs/architecture.md).
- [DESIGN.md](DESIGN.md) for the design and its evidence.
- [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for licences.
