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

Add the plugin to your `opencode.json`, or run `opencode plugin add github:joe-broadhead/opencode-charts#v0.0.1`:

```json
{ "plugins": ["github:joe-broadhead/opencode-charts#v0.0.1"] }
```

```sh
opencode plugin add github:joe-broadhead/opencode-charts#v0.0.1
```

Run `opencode reload`, or restart OpenCode, then run `/charts-status`.

Each release has its own tag, and a Git install does not update by itself. To move to a newer release, remove the old entry with `opencode plugin remove github:joe-broadhead/opencode-charts#v0.0.1`, then add the new tag with `opencode plugin add github:joe-broadhead/opencode-charts#v<version>`.

Or add the plugin to `opencode.json` instead, with the same spec:

```json
{ "plugins": [{ "package": "github:joe-broadhead/opencode-charts#v0.0.1" }] }
```

The install takes the GitHub release tag. Its commit carries the built `dist/`, so the install runs no build.
A new release is a new tag: install it with its own `#v<version>` spec.

Options (all optional):

```json
{ "plugins": [["github:joe-broadhead/opencode-charts#v0.0.1", { "theme": "light", "locale": "en-GB", "outDir": "outputs/charts", "themes": { "acme": { "extends": "light", "colors": { "categorical": ["#0B5FFF", "#FF6A3D", "#00A87E"] } } } }]] }
```

Options, limits and errors are in [docs/configuration.md](docs/configuration.md).
## Use

Ask for the chart you want, as a question or a spec:

> Chart revenue by region for 2024 as bars, in the dark theme.

> Draw this table as a stacked area chart, and tell me if the axis is misleading.

> Make that chart dark and presentation-sized.

For the 14 standard types the agent writes a typed **chart document** for `charts_quick`: a recipe, its data, field
bindings and an explicit aggregation, checked strictly. The files come with an editable `<name>.chart.json`, and
`charts_update` then changes its theme, size or interactions without touching its data or meaning. Any other chart is
a Vega-Lite, Vega or ECharts spec for `charts_render`. The PNG comes back for the agent to look at. Every tool is
listed under [Tools](#tools); documents are described in [docs/documents.md](docs/documents.md).

- **Any chart.** 53 tested chart types:
  - statistical charts, facets, layers, dual axes and selections (Vega-Lite);
  - treemap, sunburst, tree, force network and word cloud (Vega);
  - Sankey, chord, gauge, funnel, calendar heatmap, candlestick, radar and parallel coordinates (ECharts);
  - world and US maps from bundled atlases.
- **Revisable.** A saved chart document keeps its data, theme base and defaults, so a theme, size or interaction
  change is a new immutable generation with the same data, aggregation and colours. Recipe sizes are the outer canvas,
  exact in SVG and PNG, with readable-label floors per target (inline, analysis, report, presentation, paper).
- **Interactive HTML that works offline.** Tooltips, legend highlight, temporal x zoom and scatter brushing, each
  tested in a real browser under the page's CSP; SVG and PNG show the initial view.
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
  {"action": "charts_update", "resource": "*", "effect": "allow"},
  {"action": "charts_recommend", "resource": "*", "effect": "allow"},
  {"action": "charts_capabilities", "resource": "*", "effect": "allow"},
  {"action": "charts_catalogue", "resource": "*", "effect": "allow"},
  {"action": "charts_themes", "resource": "*", "effect": "allow"},
  {"action": "charts_theme_save", "resource": "*", "effect": "allow"}
]
```
<!-- /rules:all -->

With `access: "ask-changes"`, the five reads run and the four writers ask:

<!-- rules:ask-changes -->
```json
[
  {"action": "charts_*", "resource": "*", "effect": "ask"},
  {"action": "charts_render", "resource": "*", "effect": "ask"},
  {"action": "charts_quick", "resource": "*", "effect": "ask"},
  {"action": "charts_validate", "resource": "*", "effect": "allow"},
  {"action": "charts_update", "resource": "*", "effect": "ask"},
  {"action": "charts_recommend", "resource": "*", "effect": "allow"},
  {"action": "charts_capabilities", "resource": "*", "effect": "allow"},
  {"action": "charts_catalogue", "resource": "*", "effect": "allow"},
  {"action": "charts_themes", "resource": "*", "effect": "allow"},
  {"action": "charts_theme_save", "resource": "*", "effect": "ask"}
]
```
<!-- /rules:ask-changes -->

With `access: "read-only"`, the five reads run and the four writers are denied:

<!-- rules:read-only -->
```json
[
  {"action": "charts_*", "resource": "*", "effect": "deny"},
  {"action": "charts_render", "resource": "*", "effect": "deny"},
  {"action": "charts_quick", "resource": "*", "effect": "deny"},
  {"action": "charts_validate", "resource": "*", "effect": "allow"},
  {"action": "charts_update", "resource": "*", "effect": "deny"},
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
| `charts_render` | Any spec (Vega-Lite, Vega or ECharts, detected) plus `data` (`rows`, or a workspace `path` to CSV, TSV, JSON, JSONL or Parquet, with optional Vega-Lite `transform`s). Writes `<name>.svg`, `<name>.png` and `<name>.vl.json` (plus `.html` on request), and returns a markdown image line to show it inline. Also takes a `document` (recipe or engine), or a saved `documentPath` to draw again from what it captured. |
| `charts_quick` | `bar`, `horizontal_bar`, `grouped_bar`, `stacked_bar`, `line`, `area`, `stacked_area`, `scatter`, `bubble`, `pie`, `donut`, `histogram`, `box_plot` and `heatmap`. Recommended: a typed recipe `document`, saved as `<name>.chart.json` in a generation folder `<outDir>/<name>-<digest>/`. The older form (type and field names) still works. |
| `charts_validate` | The same checks as render, plus the PNG, with no files written. It takes the same input as `charts_render`, checks the requested formats can be made, and returns `valid: true` or `valid: false` with the issues. Also returns the figure tree: every label, its box, and which ones collide or run off the edge, with ids the preview numbers. |
| `charts_update` | Change a saved chart's presentation (theme, token overrides, category colours, layout and size, title, alt text, interactions) from its `.chart.json` at a known revision; writes a new generation folder `<outDir>/<name>-<digest>/` with the new revision, and never overwrites the saved chart. Data, bindings, aggregation and sorting stay as saved. |
| `charts_recommend` | Which chart fits a question, its data and its medium: a ranked shortlist with a reason each, the encoding to use, a ready `charts_render` call on your own columns and, for a recipe type, a `charts_quick` document draft whose layout target is your medium. Advises; it never renders. |
| `charts_capabilities` | Exactly what this build can do: engines, working output formats, document versions, the recipes and their interactions, layout targets, themes and palette sizes, bundled fonts and the scripts they cover, data formats, limits, and what is known not to work. |
| `charts_catalogue` | Every chart type, and a working example of any: the exact tested call, with its data, title, currency and size; for a recipe type, its contract and exact `charts_quick` document calls. |
| `charts_themes` / `charts_theme_save` | List themes and their tokens; save a brand theme to `.charts/themes/<name>.json`. |

There is one list behind all of these: `src/registry.ts` defines each tool once, and the plugin's tool registration,
the Jelly declaration, the tools RPC and `docs/tool-parity.md` are projections of it. A test fails when they drift.

A document call (the recommended path for the standard types):

```json
{
  "document": {
    "version": 1,
    "chart": { "kind": "recipe", "recipe": "bar", "data": { "path": "data/sales.csv" }, "bindings": { "category": "region", "value": "revenue_eur" }, "options": { "aggregate": "sum", "sort": "value-descending", "yTitle": "Revenue (€)" } },
    "title": "Revenue by region, 2024",
    "currency": "EUR",
    "appearance": { "theme": "dark" },
    "layout": { "target": "report" }
  },
  "name": "revenue-by-region"
}
```

Then `charts_update` with the result's `.chart.json` path and revision changes its presentation:
`{"documentPath": "…/revenue-by-region.chart.json", "expectedRevision": "sha256:…", "patch": {"layout": {"target": "presentation"}}}`.

A raw spec (the advanced path, for any of the 53 types):

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
| `INPUT_CONFLICT` | A chart call mixes input arms: a legacy spec (or quick's type and fields), `document` and `documentPath` are one per call. Nothing is read or written; the error says where each legacy field goes in a document. |
| `DATA_INVALID`, `DATA_EMPTY`, `DATA_TOO_LARGE`, `DATA_FORMAT_UNKNOWN`, `TRANSFORM_INVALID` | The data or its transform; `DATA_EMPTY` is a table with no rows. |
| `PATH_INVALID`, `PATH_OUTSIDE_WORKSPACE`, `PATH_IS_URL`, `PATH_PRIVATE`, `FILE_NOT_FOUND`, `NOT_A_FILE` | A workspace path. |
| `THEME_NOT_FOUND`, `THEME_INVALID`, `THEME_CYCLE`, `THEME_NAME_INVALID`, `THEME_NAME_TAKEN`, `FONT_INVALID`, `FONT_TOO_LARGE` | A theme, a theme name, or its fonts. |
| `LOCALE_UNKNOWN`, `CURRENCY_UNKNOWN`, `ATLAS_UNKNOWN`, `CHART_TYPE_UNKNOWN`, `FIELD_MISSING`, `SIZE_INVALID`, `SCALE_INVALID` | A name or a value the call gives. |
| `PNG_UNAVAILABLE`, `PNG_TOO_LARGE`, `HTML_UNAVAILABLE`, `RENDER_FAILED` | A renderer. |
| `HTML_RUNTIME_FAILED` | Shown in an interactive HTML page, not returned by a tool: the live chart did not start in the browser, so the page keeps the static chart and shows the failure with a short diagnostic. |
| `OUTPUT_WRITE_FAILED` | Writing the files failed; every file is made before any is written, and the error names any file that could not be put back as it was. |
| `SKILLS_INVALID`, `STATUS_UNAVAILABLE` | Setup could not load a skill, or `/charts-status` could not be read (in the server log, or the session). |
| `NO_MARK`, `NO_MARKS`, `NO_SERIES`, `DATA_TWICE`, `AXES_MISSING`, `SANKEY_CYCLE`, `SERIES_TYPE_MISSING`, `ECHARTS_COMPONENT_UNSUPPORTED`, `ECHARTS_MARKUP_REFUSED`, `UNKNOWN_MARK`, `UNKNOWN_CHANNEL`, `UNKNOWN_PROPERTY`, `UNKNOWN_TYPE`, `UNKNOWN_DATASET`, `UNKNOWN_FIELD`, `TYPE_MISMATCH`, `PIE_NEGATIVE`, `DATA_MISSING` | A spec or data problem that stops the render, reported inside `SPEC_INVALID` with its JSON path and a fix. |
| `DOCUMENT_INVALID`, `DOCUMENT_VERSION_UNSUPPORTED`, `DOCUMENT_REVISION_MISMATCH`, `DOCUMENT_DEPENDENCY_CHANGED`, `ARTIFACT_INVALID` | A chart document or a saved `.chart.json` artifact: its shape (with the JSON path), a version this build does not read, a revision that is stale or does not match the content, a custom font whose bytes changed, or a file that is not a chart artifact. |
| `AGGREGATION_REQUIRED`, `POSITION_MISSING`, `LAYOUT_UNSUPPORTED`, `INTERACTION_UNSUPPORTED` | A recipe document that cannot compile as written: several rows for one mark without `options.aggregate`, a temporal or numeric x missing, or a layout or interaction preset its chart kind does not support. |
| `LAYOUT_UNSATISFIABLE` | A recipe chart that cannot be drawn as asked: no layout candidate fits the outer size with every label and legend entry at or above the target's readability floor (or a font override is below it). The error lists the measured conflicts and alternatives; nothing is written. |
| `INTERACTION_FORMAT_MISMATCH` | A document asks for an interaction only the HTML page carries (an explicit tooltip, legend highlight, x zoom or a brush), and the explicit `formats` list has no `html`. Refused before any file is written. |
| `VALUE_MISSING`, `CATEGORY_COLOR_UNUSED` | A recipe warning: rows without a measure (left out and counted, never read as zero), or a category colour for a category the data does not have. |
| `EMPTY_DATA`, `NOT_A_DATE`, `DATE_AS_CATEGORY`, `MISSING_UNITS`, `TRUNCATED_AXIS`, `DUAL_AXIS`, `DUPLICATE_TICKS`, `UNSORTED_BARS`, `OVERPLOTTING`, `TOO_MANY_SERIES`, `PIE_TOO_MANY_SLICES`, `RAINBOW_SEQUENTIAL`, `LOW_CONTRAST`, `LABEL_COLLISION`, `LABEL_CLIPPED`, `LABEL_DENSITY`, `FONT_NOT_BUNDLED`, `FONT_GLYPH_MISSING`, `VEGA_LITE_WARNING`, `VEGA_WARNING` | A lint or drawing warning, returned with the result beside the chart. |
| `SIZE_OVERRIDE_IGNORED` | The spec's own `width` or `height` beats the tool's (the spec keeps precedence), or an ECharts size is not a pixel count; the warning names both values and the path, such as `/spec/width`. |

## Configure

`theme`, `locale`, `outDir`, `themes`, `svgText` and the limits are in
[docs/configuration.md](docs/configuration.md), with their defaults. A theme saved in the workspace
(`.charts/themes/<name>.json`) wins over one in this config. `/charts-status` shows the values in force.

## Organisation rollout

A shared `opencode.json` (for example `/etc/opencode/opencode.json` on Linux and
`/Library/Application Support/opencode/opencode.json` on macOS) pins one `theme`, `outDir` and `themes` set for
everyone, and `access: "read-only"` stops agents writing files at all:

```json
{ "plugins": [["github:joe-broadhead/opencode-charts#v0.0.1", { "theme": "acme", "access": "read-only" }]] }
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

`opencode plugin remove github:joe-broadhead/opencode-charts#v0.0.1`. Rendered charts stay where they were written
(`outputs/charts` by default), and the plugin leaves no other state.

## Development

```bash
npm ci
npm run check              # build, typecheck, unit, browser, copies, forbidden, icons, whitelist, jelly, actionlint, pack, evals, host
bun scripts/gallery.ts /tmp/gallery     # 63 charts across all themes + contact sheets
bun eval/run.ts /tmp/eval  # 28 natural-language requests, checked
bun eval/recommend.ts /tmp/rec  # 21 advice cases against the committed baseline
bun eval/perf.ts           # timings
UPDATE_GOLDEN=1 bun test test/output.test.ts   # accept a reviewed change in output
```

A release is the tag `v<version>` and its GitHub Release, both made by `.github/workflows/release.yml` from a `master`
commit CI passed, after the owner approves the `release` environment ("Releasing" in CONTRIBUTING.md). Nothing is
published to npm.

`node scripts/data.mjs` regenerates the locales and atlases, and `bun scripts/cookbook.ts` regenerates the cookbook
skill and the recipe table in `docs/documents.md` (`test/generated.test.ts` fails when either is stale). The outputs
are committed. The browser stage needs playwright-core's headless Chromium once:
`npx playwright-core install --only-shell chromium` (on Linux add `--with-deps`).

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
- **Recipes cover the 14 standard types.** The other 39 catalogue types are raw specs; an engine document keeps its
  native layout (no outer-size fitting or responsive reflow) and its own interaction syntax.
- **Four interaction presets.** Tooltip, legend highlight, temporal x zoom and scatter/bubble brush, in the documented
  combinations; no series hiding, no ECharts zoom or brush, and SVG/PNG always show the initial view.
- **PNG and HTML need the packaged runtime.** A missing runtime is reported as `PNG_UNAVAILABLE` or `HTML_UNAVAILABLE`; reinstalling the plugin restores it.
- **Some catalogue examples and the light ramp have rough edges.** The candlestick example's date labels, close-set
  ticks in the histogram and binned heatmap examples, and treemap labels cut short in small cells; the light theme's
  sequential ramp starts near white, so the lowest values in a light heatmap or choropleth sit close to the canvas.
- **Package size.** The package is about 8 MB unpacked, and `dist/index.js` is 2.3 MB: Vega, ECharts and the PNG rasteriser are bundled, so a render needs no network.
- **Host range.** OpenCode `>=2.2.3 <2.3.0`, tested on 2.2.3, 2.2.4, 2.2.5 and 2.2.6.
- Updates are not automatic for a Git install, and `opencode plugin update` and `opencode plugin check` do not work on one: to move to a newer release, remove the old entry and add the new tag.

## Links

- [docs/documents.md](docs/documents.md), [docs/configuration.md](docs/configuration.md), [docs/status.md](docs/status.md), [docs/tool-parity.md](docs/tool-parity.md),
  [docs/scripting.md](docs/scripting.md), [docs/jelly.md](docs/jelly.md), [docs/architecture.md](docs/architecture.md).
- [DESIGN.md](DESIGN.md) for the design and its evidence.
- [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for licences.
