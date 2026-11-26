# Charts

Publication-grade charts, maps, tables and diagrams from your data and workspace files: deterministic SVG, PNG, GIF
and offline HTML, with no network at runtime.

Charts draws 79 chart types across six engines from a spec or a chart document: Vega-Lite for statistical charts, Vega for
treemaps and networks, ECharts for Sankey, chord and gauge, Observable Plot for the Plot recipes, plus publication
tables, Mermaid or structured diagrams, and a board document that becomes a self-contained dashboard. Every chart is
validated and linted before anything is written, and every file is written under `outputs/charts/` unless a call names
another folder.

## Install

Install from a release tag:

```sh
opencode plugin add github:we-the-rebel-alliance/charts-plugin#v0.0.0
```

`v0.0.0` is the first release of this rebuild on plugin-contract. The package is
`@we-the-rebel-alliance/charts-plugin`; it exports its server entry and its terminal UI, and it has no runtime
dependencies.

## Sign in

Nothing to sign in to. Charts has no provider, no integration and no credentials; its `capabilities` manifest declares
no `accounts`. The only data it reads is a workspace file a call names, with your host's `read` rule asserted for that
file.

## Access

`access` decides how much the plugin's methods may do:

| Level | Reads | Writes |
|---|---|---|
| `all` (default) | run | run |
| `ask-changes` | run | ask first |
| `read-only` | run | are off |

A read is `validate`, `recommend`, `capabilities`, `catalogue`, `themes`, `status`, `state`, `theme_get` and the nine
`plan_*` methods. The nine commits (`render`, `quick`, `update`, `board`, `table`, `diagram`, `theme_save`,
`theme_sync`, `theme_clear`) are writes. Every commit takes only the `planId` its plan answered, so a person confirms
the files and changes before anything is written; the three theme commits ask even under `all`, because they change
what every later render in the session uses.

An agent's own rules still narrow the plugin's level, and a per-tool rule wins for that one tool for that account. The
rules the plugin generates are durable defaults; an agent that already lacks them is named in `status`, and nothing
patches it behind the person's back.

## What it draws

- **Charts**: bars, lines, areas, scatters, bubbles, pie and donut, histograms, box plots, heatmaps, maps, sankey, chord,
  gauge, funnel, calendar, candlestick, radar, parallel coordinates, treemaps, networks and word clouds.
- **Tables**: publication data-graphic tables with inline nanoplots, spanners, row groups, summary rows and a
  sortable, accessible HTML version.
- **Diagrams**: Mermaid flowcharts, sequence, state, class and ER diagrams; mindmaps, org charts, fishbones and
  architecture sketches; every diagram also answers a Unicode outline for a terminal.
- **Boards**: a dashboard document with datasets, filters, KPI cards and chart or table panels, published as a retina
  PNG, its poster SVG, an offline `.board.html` and the `.board.json` it was built from.
- **Chart documents**: a typed recipe or an engine chart, validated with a JSON path for each problem, saved as an
  editable `<name>.chart.json` and replayable or updatable without changing its data.

Nothing is fetched: the bundled fonts, atlases and locales are the only runtime data, and an interactive page carries
its own scripts and fonts.

## Tools

Every method is a tool in Code Mode and an RPC method under the one id `charts`; the manifest's table below is the
authority. The nine writes are plan/commit pairs, and nothing is pinned.

## Capabilities

Every method, its class and its operations come from the installed manifest.

<!-- generated:capabilities -->
### Methods

| Method | Class | Accounts | Operations |
|---|---|---|---|
| `status` | read | none | — |
| `state` | read | none | `file.read` |
| `plan_render` | read | none | `charts.plan_render`, `charts.render`, `file.read` |
| `render` | write | none | `charts.render`, `file.read`, `file.write` |
| `plan_quick` | read | none | `charts.plan_quick`, `charts.quick`, `file.read` |
| `quick` | write | none | `charts.quick`, `file.read`, `file.write` |
| `plan_update` | read | none | `charts.plan_update`, `charts.update`, `file.read` |
| `update` | write | none | `charts.update`, `file.read`, `file.write` |
| `plan_board` | read | none | `charts.plan_board`, `charts.board`, `file.read` |
| `board` | write | none | `charts.board`, `file.read`, `file.write` |
| `plan_table` | read | none | `charts.plan_table`, `charts.table`, `file.read` |
| `table` | write | none | `charts.table`, `file.read`, `file.write` |
| `plan_diagram` | read | none | `charts.plan_diagram`, `charts.diagram`, `file.read` |
| `diagram` | write | none | `charts.diagram`, `file.read`, `file.write` |
| `plan_theme_save` | read | none | `charts.plan_theme_save`, `charts.theme_save`, `file.read` |
| `theme_save` | write | none | `charts.theme_save`, `file.read`, `file.write` |
| `plan_theme_sync` | read | none | `charts.plan_theme_sync`, `charts.theme_sync`, `file.read` |
| `theme_sync` | write | none | `charts.theme_sync`, `file.read` |
| `plan_theme_clear` | read | none | `charts.plan_theme_clear`, `charts.theme_clear` |
| `theme_clear` | write | none | `charts.theme_clear` |
| `validate` | read | none | `charts.validate`, `file.read` |
| `recommend` | read | none | `charts.recommend`, `file.read` |
| `capabilities` | read | none | `charts.capabilities` |
| `catalogue` | read | none | `charts.catalogue` |
| `themes` | read | none | `charts.themes`, `file.read` |
| `theme_get` | read | none | `charts.theme_get` |

### Sources

| Source | Kind | Reads or output | Method | Cost |
|---|---|---|---|---|
| `charts.state` | snapshot | `list` | `state` | free |

### Actions

None.

### Bus events

`rpc.charts.changed`
<!-- /generated:capabilities -->

## Errors

<!-- generated:errors -->
| Code | Meaning |
|---|---|
| `NEEDS_SIGN_IN` | the account is not signed in |
| `SCOPE_MISSING` | the call needs a scope the person has not confirmed |
| `ACCOUNT_REQUIRED` | the plugin serves several accounts and the call names none |
| `ACCOUNT_UNKNOWN` | the call names an alias the plugin does not serve |
| `ACCOUNT_MISMATCH` | the item belongs to another account |
| `CURSOR_INVALID` | the cursor is malformed, or belongs to another source, account or scope |
| `CURSOR_EXPIRED` | the provider no longer keeps the history the cursor names |
| `RATE_LIMITED` | the provider asked the plugin to slow down |
| `BUDGET_EXCEEDED` | the read would cost more than the person allows |
| `SOURCE_DISABLED` | the person turned this source or action off |
| `TOO_LARGE` | the answer is larger than the source's maxBytes |
| `INPUT_INVALID` | the input does not match the method's schema |
| `SOURCE_UNKNOWN` | the plugin declares no such source |
| `SCHEMA_VIOLATION` | an answer does not keep the contract's shape |
| `PERMISSION_DENIED` | the person's grant does not cover the call |
| `PLAN_INVALID` | the plan is missing, or belongs to another method |
| `PLAN_USED` | the plan was already used by an earlier commit |
| `GRANT_INVALID` | the action grant did not verify, or was already spent |
| `HOST_UNTESTED` | OpenCode is outside the plugin's tested range |
| `OPTIONS_INVALID` | the plugin's options do not match their schema |
| `UNAVAILABLE` | the provider could not be reached |
<!-- /generated:errors -->

A chart problem also carries its own code in the sentence, such as `SPEC_UNSAFE` or `DATA_EMPTY`, with the path it is
at and one next step.

## Troubleshooting

- **`status` reports `error` or `nextStep` names the agent list.** An agent's rules could not be read; check the
  OpenCode server log and reload the plugin.
- **A call is refused with `PERMISSION_DENIED`.** The person's `access` level or an agent rule denies it. Reads always
  run; `ask-changes` asks for the writes, and `read-only` turns them off. `theme_save`, `theme_sync` and `theme_clear`
  ask even under `all`.
- **No files appear.** A render writes under `outputs/charts/` (or the configured `outDir`) in the session's workspace.
  Charts refuses an output folder outside the workspace; keep `outDir` inside it.
- **A PNG or HTML file is missing.** The PNG rasteriser and the browser runtimes ship in `dist/`; reinstall the
  release if `capabilities` says one is unavailable.
- **A saved chart will not update.** `update` needs the `revision` the call that wrote it returned; a stale revision is
  `DOCUMENT_REVISION_MISMATCH` before anything is drawn. A change of data or meaning is a new document.
- **A theme is not used.** A host's synced theme applies to that session only; a call's own `theme` wins, then the
  session's synced theme, then the plugin's configured default.

## Docs

- [plugin-contract](https://github.com/we-the-rebel-alliance/plugin-contract): the standard, the contract and the kit.
- [Capabilities](docs/capabilities.md): every method, source, action and bus event, and the class convention.
- [Configuration](docs/configuration.md): the options and their defaults.
- [Accounts](docs/accounts.md): why there are none.
- [Automations](docs/automations.md): refreshing a chart on a schedule.
- [Architecture](docs/architecture.md): the layers, the renderer and what is cached.
- [Security](docs/security.md): what leaves the machine, redaction and the plan/commit flow.
