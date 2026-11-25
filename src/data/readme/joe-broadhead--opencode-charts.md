# charts-plugin

Deterministic, publication-grade charts from a spec, with no model and no network. It takes Vega-Lite, Vega, ECharts,
Observable Plot, table and diagram input, and writes SVG, PNG, GIF and an optional offline interactive HTML page — or a
multi-panel dashboard — under `outputs/charts/`. The same input gives the same bytes on the same platform. Nothing is
ever loaded from the network.

Unofficial; not affiliated with OpenCode or Anomaly.

## Requirements

- OpenCode `>=2.4.1 <2.5.0`, tested on 2.4.1.
- macOS or Linux.
- No network, no system fonts and no provider: every render is local and deterministic.

## Install

Install from a release:

```sh
opencode plugin add github:we-the-rebel-alliance/charts-plugin#v<version>
```

The first release on plugin-contract is v0.0.0 (phase 4b).

Or add it to `opencode.json` with the same spec:

```json
{ "plugins": ["github:we-the-rebel-alliance/charts-plugin#v<version>"] }
```

Run `opencode reload`, or restart OpenCode, then run `/charts-status`. Options (all optional) go on the plugin's entry:

```json
{ "plugins": [["github:we-the-rebel-alliance/charts-plugin#v<version>", { "theme": "light", "locale": "en-GB", "outDir": "outputs/charts" }]] }
```

Every option and its default is in [docs/configuration.md](docs/configuration.md).

## Skills

Two skills load with the plugin:

- **`charts`** — when and how to draw: the typed recipe documents, the engines, tables, diagrams and dashboards, the
  document/`documentPath` arms, and when code on the machine is the better answer.
- **`charts-cookbook`** — a tested example for every chart type: a typed recipe document for the standard 14, an engine
  spec for the rest, and a board document.

The plugin pins no tool. Code Mode lists one namespace line; `search({ namespace: "charts", query })` finds any tool's
signature, and the two skills carry the workflow.

## Use

Ask for the chart you want, as a question or a spec:

> Chart revenue by region for 2024 as bars, in the dark theme.

For the 14 standard types the agent writes a typed **chart document** for `charts_quick`: a recipe, its data, field
bindings and an explicit aggregation, checked strictly. The files come with an editable `<name>.chart.json`, and
`charts_update` then changes its theme, size or interactions without touching its data or meaning. Any other chart is a
spec for `charts_render` on one of its six engines; tables, diagrams and dashboards have their own tools. Documents are
described in [docs/documents.md](docs/documents.md).

```json
{
  "document": {
    "version": 1,
    "chart": { "kind": "recipe", "recipe": "bar", "data": { "path": "data/sales.csv" }, "bindings": { "category": "region", "value": "revenue_eur" }, "options": { "aggregate": "sum", "yTitle": "Revenue (€)" } },
    "title": "Revenue by region, 2024",
    "currency": "EUR",
    "appearance": { "theme": "dark" },
    "layout": { "target": "report" }
  },
  "name": "revenue-by-region"
}
```

## Tools

| Tool | What it does |
|---|---|
| `charts_render` | Any spec on any of the six engines (Vega-Lite, Vega, ECharts, Observable Plot, table or diagram, detected) plus `data` (`rows`, or a workspace `path`), and the editorial frame, annotations and motion. Writes SVG, PNG (and GIF or HTML on request) and the resolved spec, and returns a markdown image line. Also takes a `document` or a saved `documentPath`. |
| `charts_quick` | `bar`, `horizontal_bar`, `grouped_bar`, `stacked_bar`, `line`, `area`, `stacked_area`, `scatter`, `bubble`, `pie`, `donut`, `histogram`, `box_plot` and `heatmap`, from a typed recipe `document` (recommended) or from a type and field names. |
| `charts_validate` | The same checks as render, plus the PNG, with no files written; returns `valid: true` or `valid: false` with the issues and the figure tree. |
| `charts_update` | Change a saved chart's presentation (theme, overrides, category colours, layout, title, alt text, interactions) from its `.chart.json` at a known revision; writes a new generation folder and never overwrites the saved chart. |
| `charts_board` | A multi-panel `BoardDocumentV1` dashboard: KPI strip, filters, chart and table panels, a 2× poster PNG, its SVG and an offline cross-filtering `.board.html`. |
| `charts_table` | A publication data-graphic table: spanners, row groups, a summary row, and inline bar, sparkline, bullet, delta, badge, heatmap and dot cells, to SVG, PNG and sortable HTML. |
| `charts_diagram` | A deterministic offline diagram from Mermaid DSL (flowchart, sequence, state, class, ER) or structured mindmap, org chart, fishbone and architecture specs, to SVG, PNG and terminal ASCII. |
| `charts_recommend` | Which chart fits a question, its data and its medium: a ranked shortlist with a reason each, the encoding, a ready call and, for a recipe type, a `charts_quick` document draft. Advises; it never renders. |
| `charts_capabilities` | Exactly what this build can do: engines, working output formats, document versions, recipes, layout targets, themes, fonts, data formats, limits, and what is known not to work. |
| `charts_catalogue` | Every chart type, and a working example of any, with its data; for a recipe type, its contract and exact `charts_quick` document calls. |
| `charts_themes` | The built-in and saved themes and their tokens; with a `seed`, a preview of a synthesised theme and its paired light and dark variants. |
| `charts_theme_save` | Save a custom theme by name in the workspace (`.charts/themes/<name>.json`), after checking its tokens and their contrast. |

`src/registry.ts` defines each tool once; the plugin's tool registration, the package declaration, the tools RPC and
`docs/tool-parity.md` are projections of it, and a test fails when they drift.

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
  {"action": "charts_board", "resource": "*", "effect": "allow"},
  {"action": "charts_table", "resource": "*", "effect": "allow"},
  {"action": "charts_diagram", "resource": "*", "effect": "allow"},
  {"action": "charts_recommend", "resource": "*", "effect": "allow"},
  {"action": "charts_capabilities", "resource": "*", "effect": "allow"},
  {"action": "charts_catalogue", "resource": "*", "effect": "allow"},
  {"action": "charts_themes", "resource": "*", "effect": "allow"},
  {"action": "charts_theme_save", "resource": "*", "effect": "allow"}
]
```
<!-- /rules:all -->

With `access: "ask-changes"`, the five reads run and the seven writers ask:

<!-- rules:ask-changes -->
```json
[
  {"action": "charts_*", "resource": "*", "effect": "ask"},
  {"action": "charts_render", "resource": "*", "effect": "ask"},
  {"action": "charts_quick", "resource": "*", "effect": "ask"},
  {"action": "charts_validate", "resource": "*", "effect": "allow"},
  {"action": "charts_update", "resource": "*", "effect": "ask"},
  {"action": "charts_board", "resource": "*", "effect": "ask"},
  {"action": "charts_table", "resource": "*", "effect": "ask"},
  {"action": "charts_diagram", "resource": "*", "effect": "ask"},
  {"action": "charts_recommend", "resource": "*", "effect": "allow"},
  {"action": "charts_capabilities", "resource": "*", "effect": "allow"},
  {"action": "charts_catalogue", "resource": "*", "effect": "allow"},
  {"action": "charts_themes", "resource": "*", "effect": "allow"},
  {"action": "charts_theme_save", "resource": "*", "effect": "ask"}
]
```
<!-- /rules:ask-changes -->

With `access: "read-only"`, the five reads run and the seven writers are denied:

<!-- rules:read-only -->
```json
[
  {"action": "charts_*", "resource": "*", "effect": "deny"},
  {"action": "charts_render", "resource": "*", "effect": "deny"},
  {"action": "charts_quick", "resource": "*", "effect": "deny"},
  {"action": "charts_validate", "resource": "*", "effect": "allow"},
  {"action": "charts_update", "resource": "*", "effect": "deny"},
  {"action": "charts_board", "resource": "*", "effect": "deny"},
  {"action": "charts_table", "resource": "*", "effect": "deny"},
  {"action": "charts_diagram", "resource": "*", "effect": "deny"},
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
`external_directory` allow:

```json
{ "permissions": [{ "action": "external_directory", "resource": "/path/to/charts/*", "effect": "allow" }] }
```

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
missing the plugin's default block, the OpenCode version and the next step.

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

## Links

- [docs/documents.md](docs/documents.md) — the chart document, the board document and the saved `.chart.json`.
- [docs/configuration.md](docs/configuration.md) — options, theme resolution, output files, limits and errors.
- [docs/scripting.md](docs/scripting.md) — the tools RPC, for a script with no model.
- [docs/architecture.md](docs/architecture.md) — how it is built.
- [docs/status.md](docs/status.md) — what does not work, and why.
- [docs/tool-parity.md](docs/tool-parity.md) — every tool, its class and every surface.
- [DESIGN.md](DESIGN.md) — the design and its evidence; [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) — licences.

## Development

```sh
npm ci
npx playwright-core install --only-shell chromium   # once; on Linux add --with-deps
npm run check
```

`npm run check` runs `build`, `typecheck`, `unit`, `kit`, `browser`, `copies`, `forbidden`, `icons`, `whitelist`,
`jelly`, `actionlint`, `pack`, `evals` and `host`; [CONTRIBUTING.md](CONTRIBUTING.md) describes each stage. The host
stage spawns a stock OpenCode 2.4.1 `opencode serve`, from `OPENCODE_BIN_2_4_1` or `$OPENCODE_STOCK_ROOT/2.4.1`.
`node scripts/data.mjs` regenerates the locales and atlases, and `bun scripts/cookbook.ts` regenerates the cookbook
skill and the recipe table in `docs/documents.md`; both outputs are committed.

## Known limits

- **OpenCode `>=2.4.1 <2.5.0`**, tested on 2.4.1. Status says when the host is untested or outside the range.
- **No PDF output and no Plotly input.** Mermaid is supported for the five diagram kinds `charts_diagram` draws.
- **Bundled fonts cover Latin, Greek and Cyrillic.** A label beyond them gets `FONT_GLYPH_MISSING`; the fix is a font
  file with `theme.font.files`.
- **Nothing is loaded from the network.** A remote data file or image is not fetched.
- **PNG and HTML need the packaged runtime.** A missing runtime is `PNG_UNAVAILABLE` or `HTML_UNAVAILABLE`;
  reinstalling the plugin restores it.
- **A render runs to its deadline.** Stop does not interrupt one already running; 10 s by default
  (`CHARTS_RENDER_TIMEOUT_MS`).
