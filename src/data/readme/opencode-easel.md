# opencode-easel — Plugin Documentation (EN)

`opencode-easel` implements the `easel` module for OpenCode V2. It renders terminal charts directly in the
conversation and opens a dedicated `/easel` side panel with every chart generated in the current session.
The six forms — `line`, `columns`, `bars`, `sparks`, `share` and `pie` — mirror `easel` from Claude Code 2.1.330:
Braille line plots, columns with double vertical resolution, horizontal bars with fractional blocks,
sparklines, 100% share bars and circular pies drawn with half-blocks.

The plugin has two layers:

- **server side** (`index.ts`) registers the `easel_chart` tool, automatically charts MCP responses from
  Prometheus / Datadog / Grafana, stores the chart index and exposes RPC;
- **client TUI side** (`tui.tsx`, Solid + OpenTUI) renders ```` ```easel ```` blocks in the transcript,
  shows the `/easel` panel and footer badge, and handles key bindings.

## Contents

1. Overview and purpose
2. Architecture
3. The six chart forms
4. Supported input formats
5. `easel_chart` parameters
6. Automatic MCP charts
7. `/easel` panel, commands and keys
8. Installation and update
9. Limitations
10. Sample data

---

## 1. Overview and purpose

`easel_chart` accepts tabular data or a file path and returns an ```` ```easel ```` block containing a
self-contained JSON payload. The model must include that block verbatim in its reply. The TUI recognizes
the `easel` language (and `easel-chart`) and replaces the code block with a full-colour chart in the chat.

Highlights:

- **six forms** with automatic form selection based on the X axis kind;
- **any input shape**: JSON, CSV, TSV, SSV, Markdown/SQL tables, aligned CLI output, XML, a local file, an
  array of row objects, or the latest tool result;
- **automatic charts** for monitoring MCP responses;
- **shared `/easel` panel** and a `▁▃▅▇ easel (N)` footer badge;
- **a shared on-disk index** visible to every plugin location instance;
- **SVG export** through `format: "svg"`.

Every series gets a letter `a`..`h` and a fixed palette colour:

```text
a #5c9cf5   b #e5a93c   c #58b970   d #b48ef0
e #4ec9c9   f #e06c75   g #e58ac8   h #d7c25a
```

## 2. Architecture

```text
opencode-easel/
├── src/
│   ├── index.ts          server: tool, hooks, commands, RPC
│   ├── tui.tsx           client TUI: Solid + OpenTUI
│   ├── rpc.ts            easel RPC contract (methods, events, JSON schemas)
│   └── core/
│       ├── types.ts      types, palette, constants, series letters
│       ├── parser.ts     format parsers and the MCP metric detector
│       ├── request.ts    request normalization and aliases
│       ├── charting.ts   data model, calculations and all six renderers
│       ├── chart-store.ts shared easel-charts.json index
│       ├── panel-layout.ts `/easel` page packing and two-column grid
│       ├── transcript.ts ```easel block scanner for session messages
│       ├── svg.ts        SVG renderer
│       └── index.ts      single core export surface
├── LICENSE
├── package.json
└── README.md
```

### `index.ts` — server

`Plugin.define({ id: "easel", setup })` does the following:

1. Reads `autoCharts` / `autoChartSkip` from plugin options and `ctx.storage`.
2. Subscribes to `ctx.tool.hook("execute.after")`:
   - caches up to 12 recent tool results per session;
   - pre-strips `<line>: ` prefixes from `read` output;
   - skips its own `easel_chart` and any result that already contains ```` ```easel ````;
   - detects Prometheus / Datadog / Grafana and appends a ready chart block to the result.
3. Adds the `easel` namespace and `chart` tool through `ctx.tool.transform`.
4. Adds a short `[easel:instructions]` system note through `ctx.session.hook("context")`.
5. Registers `/easel-auto` and `/easel-chart` through `ctx.command.transform`.
6. Publishes RPC methods and events through `ctx.rpc.register(EaselRpc, …)`.
7. Maintains `~/.local/share/opencode/easel-charts.json` (atomic temp-file + rename writes), serializes
   read-modify-write cycles with an internal lock, and merges data from every location.

### `tui.tsx` — client

The Solid + OpenTUI plugin `easel.tui`:

- registers Markdown code-block renderers for `easel` and `easel-chart`;
- converts `StyledLine[]` into `StyledText` chunks (`fg`, `bg`, `bold`, `dim`);
- **assigns `node.content = styled` through a ref/effect**, never through the JSX `content` prop, because
  Solid stringifies `StyledText` and the panel would display `[object Object]`;
- opens the `easel.panel` side panel, syncs it over RPC and scans session messages;
- shows the `▁▃▅▇ easel (N)` badge in `prompt.footer.status`;
- registers key bindings and palette commands.

### `rpc.ts` — contract

`Rpc.define({ id: "easel", methods, events })`:

| Method | Input | Output |
| --- | --- | --- |
| `chartsList` | `{ sessionID }` | `{ charts: ChartEntry[], deletedKeys }` |
| `chartsClear` | `{ sessionID }` | `{ cleared: number }` |
| `chartDelete` | `{ sessionID, chartID?, key? }` | `{ deleted, count, deletedKeys }` |
| `chartRecord` | `{ sessionID, payload }` | `{ chart, count }` |
| `configGet` | `{}` | `{ autoCharts, autoChartSkip }` |
| `configSet` | `{ autoCharts?, autoChartSkip? }` | current configuration |
| `autoToggle` | `{}` | `{ autoCharts }` |
| `status` | `{}` | `{ autoCharts, autoChartSkip, sessions }` |

Events: `updated` (a chart was recorded or cleared) and `config` (automatic charting was toggled). Every TUI
call passes `location`, because server plugin instances are scoped to a working directory.

### `core/` — model and rendering

- `ParsedTable` — `{ columns, rows, format, source }`.
- `ChartModel` — form, title, unit, X axis (`time | number | category`), series, parts, `combine`, `scale`,
  `marks`, notes, width and the resolved column mapping.
- `SeriesModel` — `key`, `label`, letter, colour, values per X, and `max / maxX / last / min / mean / total /
  count` statistics.
- `EaselPayload` — `{ v: 1, request, table, meta, auto? }`; fully self-contained, so the TUI can redraw a
  chart without re-parsing the original text.

`chart-store.ts` stores `ChartStoreFile = { version: 1, sessions: Record<sessionID, ChartEntry[]> }`,
deduplicates charts by a canonical key (title + form + axes + table shape), keeps at most 100 charts per
session and filters out diagnostic titles.

`transcript.ts` recursively walks messages, text parts, tool content and metadata, finds
```` ```easel ```` / ```` ```easel-chart ```` blocks, decodes payloads and removes duplicates.

## 3. The six chart forms

### `line` — Braille line plots

Up to 8 series. Each character cell is a 2×4 Braille dot matrix (`⠀`..`⣿`), giving two horizontal and four
vertical dots per cell. Adjacent points are connected by linear interpolation. Series letters appear to the
right of the plot, Y ticks to the left, and the X axis with labels below.

If series maxima differ by more than 10×, the chart is split into up to three separate plots so small series
do not collapse into a flat line at zero. In the sample data, `Person`/`AI agent` share one plot and
`Script` gets its own.

```text
Daily aitmpl downloads by client type · downloads · Nov 3 2026 → Nov 16
a Person   max 6,594 at Nov 13  last 453  min  90  avg 1,616
b AI agent max 5,318 at Nov 15  last 178  min 147  avg 1,306
10,000 ┤                                                    ab
       │
       │
       │                                       ⠠⠡
 5,000 ┤                                      ⢀⠂ ⢂     ⠌⠄
       │                                      ⠄   ⢂   ⠌ ⠐⡀
       │                               ⣀⢄⡀   ⠌     ⠄ ⠌   ⠐⡀
       │    ⣀⣤⣤⣤⣤⣤⣀⣀   ⣀⣀⣀⡀⣀⣀⣀⣀⠤⠤⠤⠔⢒⡲⠖⠮⠤⠤⠬⣑⣢⡴⣀⣀    ⠈⠍⠑⠒⠒⠤⣀⠠
     0 ┤ ⡤⠖⠊⠁      ⠉⠉⠉⠉⠉⠉⠉⠉⠉⠉⠉⠑⠒⠒⠊⠉⠁           ⠉⠉⠉⠉⠉      ⠉⠳

c Script   max   636 at Nov 15  last 315  min  14  avg   151
1,000 ┤                                                      c
      │
      │                                                 ⠠⡀
  500 ┤                                                ⠠⠁⠈⠢⡀
      │        ⣀⢄                                     ⡠⠁   ⠈⠢
      │    ⣀⠤⠒⠉  ⠑⢄                 ⣀⡀               ⡐
    0 ┤ ⡠⠔⠊        ⠑⠤⠔⠒⠊⠉⠒⠒⠤⠤⠤⣀⣀⣀⠤⠒⠉ ⠈⠉⠑⠒⠒⠒⠉⠉⠉⠑⠒⠒⠒⠒⠒⠒
      └──────────────────────────────────────────────────────
        Nov 3 Nov 5   Nov 7   Nov 9  Nov 11  Nov 13  Nov 15
```

Algorithm: values are normalized to the axis (`y = (1 - ratio) × (height × 4 - 1)`), the corresponding bit
is set from the Braille table, and the line between points is filled in `max(1, |Δx|)` steps.

`scale: "log"` switches to a logarithmic axis (ticks `1`, `10`, `100`, `1k`, …). `marks` adds `▲` markers
with labels on the X axis (supported by `line` and `columns`; a date may be written as `2026-11-15` or as a
Unix timestamp).

### `columns` — vertical columns

One column per X value. Each terminal cell uses **two half-rows** and the characters `▀` (top half), `▄`
(bottom half) and `█` (both), with `fg`/`bg`, so stacked segments join seamlessly.

- `combine: "sum"` — columns stack vertically; height is scaled to the column total.
- any other aggregation — series are drawn **side by side** inside the slot (grouped); height is scaled to
  the tallest individual series.

Stacked segment shares are apportioned with the largest-remainder (Hamilton) method, so the segments always
add up to the column height and a non-zero segment never disappears. If a segment is physically thinner than
half a row, the note `the thinnest parts of a column are too thin to draw` appears.

```text
Daily aitmpl downloads by client type · downloads · Nov 3 2026 → Nov 16 · total max 7,806 at Nov 15
a Person   max 6,594 at Nov 13  last 453  min  90  avg 1,616
b AI agent max 5,318 at Nov 15  last 178  min 147  avg 1,306
c Script   max   636 at Nov 15  last 315  min  14  avg   151
8,000 ┤                               ▄▄    ▀▀
      │                               ▀▀    ██
6,000 ┤                               ██    ██
      │                               ██    ██
4,000 ┤                         ▀▀    ██    ██
      │    ▀▀ ▀▀             ▀▀ ██ ▄▄ ██ ▀▀ ██
2,000 ┤    ▀▀ ▀▀ ▀▀ ▀▀ ▀▀ ▀▀ ▀▀ ██ ██ ██ ██ ██
      │ ▄▄ ██ ██ ▀▀ ▀▀ ██ ██ ██ ██ ██ ██ ██ ██ ▀▀
    0 ┼ ─┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬
        Nov 3Nov 5 Nov 7 Nov 9Nov 11Nov 13Nov 15
                                             ▲ peak
the thinnest parts of a column are too thin to draw
```

The Y axis is built so ticks are exactly two terminal rows apart (four half-rows), including the baseline.
When space is tight, columns are sampled down and X labels never collide: a label that does not fit is
skipped whole rather than partially overwritten.

### `bars` — horizontal bars

Up to 40 categories. Bar length is scaled to the maximum value; precision is conveyed with fractional blocks
`▏▎▍▌▋▊▉█` (each is 1/8 of a cell). The value and its percentage of the total are printed on the right.

```text
Daily aitmpl downloads by client type · downloads · Nov 3 2026 → Nov 16 · total 43,014
a Person   ████████████████████████████████████ 22,620  52.6%
b AI agent █████████████████████████████▏       18,284  42.5%
c Script   ███▍                                  2,110   4.9%
```

If `line` or `columns` is requested for a categorical X axis, the form automatically becomes `bars` with the
note `x is categorical; showing bars instead of …`.

### `sparks` — sparklines

One compact strip per series: values are normalized from min to max and encoded with `▁▂▃▄▅▆▇█`. `max` and
`avg` (the arithmetic average, `mean` in the API) are printed next to the strip. Up to 40 series; the array is sampled down to the strip width when
needed.

```text
Daily aitmpl downloads by client type · downloads · Nov 3 2026 → Nov 16
a Person    ▁▃▂▂▂▂▃▃▂▂█▃▃▁  max 6,594  avg 1,616
b AI agent  ▁▃▂▂▂▂▂▂▄▃▂▂█▁  max 5,318  avg 1,306
c Script    ▁▃▄▁▂▁▁▂▂▂▂▂█▄  max 636  avg 151
```

### `share` — 100% share bar

A horizontal bar 20–70 cells wide. Up to 8 coloured parts `a`..`h`; everything beyond is collected into a
grey `rest` part. Cells are apportioned with the Hamilton method: the bar **always** occupies exactly the
requested width, and every non-zero part gets at least one `█`.

```text
Daily aitmpl downloads by client type · downloads · Nov 3 2026 → Nov 16 · total 43,014
 ██████████████████████████████████████████████████████████
a Person    22,620  52.6%
b AI agent  18,284  42.5%
c Script     2,110   4.9%
```

In a terminal the bar is coloured by part; the plain-text example cannot show colours, but segments run in
`a`, `b`, `c` order. The old independent `Math.round` algorithm could produce `width - 1` or `width + 1`
cells and drop a tiny non-zero part — it now uses the shared `apportionHalves` helper.

### `pie` — circular pie disc

A circular pie drawn with half-block cells `▀`, `▄` and `█`: each terminal cell is two vertical half-rows,
and a `1.15` horizontal aspect ratio keeps the disc round in monospace fonts. The disc is nine terminal rows
tall (18 half-rows × 21 columns). Slices start at 12 o'clock and run clockwise; up to 8 coloured parts are
shown and everything beyond is merged into a grey `rest` part. A side-by-side legend prints each letter, a
`●` swatch, the label, the value and its percentage. When the legend has fewer rows than the nine-row disc,
it is vertically centred. Tiny non-zero slices are boosted to a minimum visual wedge so a 1–5% part still
paints visible half-cells, while the legend keeps the exact mathematical percentage.

```text
Daily aitmpl downloads by client type · downloads · Nov 3 2026 → Nov 16 · total 43,014
       ▄▄▄▄▄▄▄▄▄
    ▄█████████████▄
   █████████████████
  ███████████████████     a ● Person    22,620   52.6%
  ███████████████████     b ● AI agent  18,284   42.5%
  ███████████████████     c ● Script     2,110    4.9%
   █████████████████
    ▀█████████████▀
       ▀▀▀▀▀▀▀▀▀
```

`pie` works for both categorical and time-series data: parts are the series totals when several series are
present, or the largest X categories for a single series.

### SVG export

`format: "svg"` returns a standalone document in an ```` ```svg ```` block. `line` draws polylines, a grid and
up to 7 X labels; `columns` draws grouped/stacked rectangles and up to 7 X labels; `bars`/`sparks` draw
horizontal bars; `share` draws segments and a legend; `pie` draws `<path>` wedge arcs with a legend to the
right of the disc (or a single `<circle>` for a 100% slice). SVG width is derived from `width` (520–1400 px),
and height is 520 px for lines and 460 px for the other forms.

## 4. Supported input formats

| Format | Example | Notes |
| --- | --- | --- |
| JSON array | `[{"date":"2026-01-01","value":4}]` | array of row objects |
| Nested JSON | `{"data":{"rows":[…]}}` | searches `data`, `rows`, `records`, `items`, `points`, `series`, `results`, `frames` |
| CSV | `date,value` | commas, quotes and `""` escapes supported |
| TSV | `date<TAB>value` | tab separated |
| SSV | `date;value` | semicolon separated |
| Markdown table | `\| date \| value \|` | `---` separator rows are ignored |
| SQL/psql | `+---+---+`, `\| alpha \| 11 \|` | box tables with `├┼┤` |
| Aligned CLI | `NAME   REQUESTS` | 2+ spaces or tabs; at least one numeric column is required |
| XML | `<records><record>…</record></records>` | records under a repeated tag; attributes and child elements |
| `path` | `/tmp/data.csv` | read when `data` is not supplied |
| Previous result | no `data`/`path` | the latest completed result from another tool in the session |

Additional cleanup:

- ANSI escape codes are stripped;
- an outer Markdown fence is removed;
- `1: `, `2: `, … prefixes are stripped when they dominate at least 60% of non-empty lines;
- `read` headers such as `Read file /path, lines 1-43`, `Showing lines…`, `(End of file…)`, `<file>` and
  `</file>` are removed;
- `1,234`, `$12` and `42%` are recognized as numbers;
- `YYYY-MM-DD`, `YYYY/MM/DD`, `YYYY-MM`, years and Unix timestamps (seconds/milliseconds) are recognized as
  dates.

Automatic column inference:

1. Date/time — by name (`date`, `time`, `timestamp`, `ts`, `day`, `month`, `year`, `period`, `window`) and by
   values.
2. Numeric columns — at least 70% of non-empty values parse as numbers, and the column does not look like a
   date.
3. Series column — a text column with 2–40 distinct values, fewer than the row count.
4. X — explicit `x`, then a date column, then a text column, then the first column.
5. Y — explicit `y`, otherwise a numeric column other than X and the series column; names such as `value`,
   `count` and `total` are lower priority.

A wide table (`date,cpu,mem`) becomes multiple series; a long table (`date,client,downloads`) becomes series
split by `client`.

## 5. `easel_chart` parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `data` | `string \| object[]` | Data in any supported format, or an array of row objects. |
| `path` | `string` | Local file. Used when `data` is empty. |
| `form` | `line \| columns \| bars \| sparks \| share \| pie` | Chart form. |
| `x` | `string` | X axis / category column. |
| `y` | `string \| string[]` | Numeric value column. An array selects multiple numeric columns of a wide table. |
| `series` | `string \| string[]` | Column that splits data into series; the first array entry is used. |
| `by` | `string \| string[]` | Alias for `series`. |
| `title` | `string` | Chart title. |
| `unit` | `string` | Header unit: `downloads`, `req/s`, `ms`, … |
| `combine` | `none \| sum \| mean \| max \| min` | Aggregation of repeated `(x, series)` pairs. `sum` additionally enables stacked columns and prints `total` in stats. `none` sums repeated pairs. `avg` is accepted as an alias of `mean`. |
| `scale` | `linear \| log` | Axis scale. `log` enables the logarithmic axis. |
| `log` | `boolean` | Alias for `scale: "log"`; `true` enables it. |
| `marks` | `array` | Event markers: `{ "x": "2026-11-15", "label": "peak", "color": "#e5a93c" }`. `at` may be used instead of `x`. A date may be an ISO day or a Unix timestamp. |
| `width` | `integer` | Width 40–220. The model clamps it to 48–220. The panel passes its own width. |
| `limit` | `integer` | Series limit. Defaults to 8 for `line`/`columns` and 40 otherwise; the value is clamped to that default. |
| `top` | `integer` | Alias for `limit`. |
| `format` | `text \| svg` | `text` returns an `easel` block (default); `svg` returns a standalone SVG block. |

Example call:

```jsonc
{
  "path": "~/downloads.csv",
  "form": "columns",
  "combine": "sum",
  "title": "Daily aitmpl downloads by client type",
  "unit": "downloads",
  "marks": [{ "x": "2026-11-15", "label": "peak" }]
}
```

The tool returns:

````text
```easel
{"v":1,"request":{…},"table":{…},"meta":{…}}
```
````

The block must be included **verbatim**: do not change the JSON, rename the `easel` language, wrap it in
another fence, or summarize it. That block is exactly what the TUI turns into a chart.

## 6. Automatic MCP charts

With `autoCharts: true`, the `execute.after` hook inspects every completed tool result. If the tool name
contains `prometheus`, `datadog` or `grafana`, or the JSON structurally resembles a monitoring response, the
plugin:

1. parses the metrics into a `timestamp / value / series` table;
2. verifies that X is time and has at least 3 points;
3. builds a `line` chart titled `Prometheus · metric`, `Datadog · metric` or `Grafana · metric`;
4. records the chart in the shared index;
5. appends an ```` ```easel ```` block to the tool result and sets metadata `easel.automatic = true`.

Supported shapes:

- **Prometheus matrix**: `data.result[].metric` + `values`;
- **Prometheus vector**: `data.result[].metric` + `value` (when the tool name identifies Prometheus);
- **Datadog**: `series[].metric` + `pointlist` (also `points`, `datapoints`, `values`) and `scope`;
- **Grafana data frames**: `frames[].schema.fields` + `data.values`;
- **Grafana series**: `results.*.series[].points`;
- **Grafana rows/data**: arrays of tabular rows under `data`.

Timestamps may be ISO strings, seconds or milliseconds. Series labels are built from `metric`, `labels`,
`name` and `scope`.

Configuration:

| Option | Default | Description |
| --- | --- | --- |
| `autoCharts` | `true` | Automatically chart MCP metric responses. |
| `autoChartSkip` | `["*easel_chart*"]` | Glob patterns for tool names that must not be auto-charted. `*` and `**` match any fragment. |

Example `opencode.json(c)`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "~/.config/opencode/plugins/easel",
      "options": {
        "autoCharts": true,
        "autoChartSkip": ["*easel_chart*", "prometheus_targets"]
      }
    }
  ]
}
```

Toggle at runtime:

```sh
/easel-auto off
/easel-auto on
/easel-auto status
```

You can also press `a` in the panel or run the `Easel: toggle automatic charting` palette command. Settings
are persisted in plugin storage and survive restarts.

## 7. `/easel` panel, commands and keys

### Panel

`/easel` (alias `/charts`) opens the side panel for the current session. Charts come from:

1. the shared index `~/.local/share/opencode/easel-charts.json` via RPC `chartsList`;
2. the local TUI cache;
3. a scan of session messages (history, Plan mode, manually pasted blocks).

The panel now packs as many charts as fit instead of showing one chart with empty space below it. Chart
rows are filled onto each page according to the terminal height: typically two or more full XY charts, or
three to five compact `bars` / `sparks` / `share` / `pie` charts. Consecutive charts are separated by a
three-row separator (blank line, dim `─` rule, blank line) so the page breathes. In wide fullscreen mode (at
least 104 columns, fullscreen on) the panel switches to a two-column masonry dashboard: each chart is
appended to the shorter column, blank outer lines are trimmed, and a spacious `   │   ` vertical divider
separates the columns while per-column `─` rules are resized to the measured content width. The left column
is padded to its actual content width rather than the nominal column width, so a compact `pie` or sparkline
never leaves a wide empty void before the divider. Each chart keeps its own form override while the panel is
open, so changing one chart does not reset the others. The chart area also gets a one-row top and bottom
margin between the status line and the hotkey hint. The selection marker (`▸ 2/4`), index and form are merged
into each chart's own title line, so the title is printed once above the chart instead of twice.

The header shows `▁▃▅▇ easel`, the page number, the visible chart range, the selected chart and its form,
plus `auto on/off`. The bottom line shows the key hints.

Key bindings while the panel is open:

| Key | Action |
| --- | --- |
| `]` | Next page (advances the chart when everything fits on one page). |
| `[` | Previous page (moves back a chart on a single page). |
| `↑` / `↓` (`k` / `j`) | Select the previous / next chart; the selection keeps moving across page boundaries. |
| `m` | Cycle the selected chart `line → columns → bars → sparks → share → pie`; other charts on the page keep their forms. |
| `f` | Toggle fullscreen (re-layouts into the two-column grid when wide). |
| `a` | Toggle automatic MCP charts. |
| `Del` (`delete`) | Delete the selected chart from the session. |
| `Esc` | Close the panel. |

The session footer shows `▁▃▅▇ easel (N)` whenever the active session has charts.

### Slash commands

| Command | Action |
| --- | --- |
| `/easel` | Open the chart panel. |
| `/charts` | Alias for `/easel`. |
| `/easel-auto` | Toggle `autoCharts`. |
| `/easel-auto on` / `off` / `status` | Explicit control of automatic charts. |
| `/easel-auto <text>` | Ask the model to chart the latest tool result with extra instructions. |
| `/easel-chart` | Ask the model to chart the latest tool result. |

### Palette commands

- `Easel: open chart panel` — open the panel;
- `Easel: cycle chart form` — cycle the active chart form;
- `Easel: delete current chart` — delete the current chart;
- `Easel: toggle automatic charting` — toggle automatic charts.

### Manual RPC

```sh
opencode api post /api/rpc/easel/status --data '{"input":{}}'
opencode api post /api/rpc/easel/chartsList --data '{"input":{"sessionID":"ses_…"}}'
opencode api post /api/rpc/easel/chartDelete \
  --data '{"input":{"sessionID":"ses_…","chartID":"easel_…"}}'
opencode api post /api/rpc/easel/configSet \
  --data '{"input":{"autoCharts":false,"autoChartSkip":["prometheus_targets"]}}'
```

Right after server startup RPC may not be registered yet (registration is asynchronous). If you receive
`RPC is unavailable: easel`, retry once after a second.

## 8. Installation and update

### npm package

```sh
opencode plugin add opencode-easel
```

OpenCode reads the package `exports` (`.`, `./tui`, `./rpc`) and loads every part. The package ships TypeScript
sources (`src/`); the entry points are `src/index.ts`, `src/tui.tsx` and `src/rpc.ts`.

### From GitHub

```sh
opencode plugin add github:KURANOV07/opencode-easel
```

### Local copy

```sh
git clone https://github.com/KURANOV07/opencode-easel.git
cd opencode-easel
```

OpenCode automatically loads local plugins from `~/.config/opencode/plugins/`. Copy the plugin parts directly
into that directory, without a `package.json` or `node_modules`: OpenCode resolves `@opencode/plugin`,
`@opencode/plugin/tui`, `@opencode/plugin/rpc`, `@opentui/core`, `@opentui/solid` and `solid-js` from its own
runtime.

```sh
mkdir -p ~/.config/opencode/plugins/easel/core
cp src/index.ts src/tui.tsx src/rpc.ts ~/.config/opencode/plugins/easel/
cp src/core/*.ts ~/.config/opencode/plugins/easel/core/
```

Verify:

```sh
opencode plugin list
# ID     VERSION  SOURCE
# easel  local    ~/.config/opencode/plugins/easel

opencode api post /api/rpc/easel/status --data '{"input":{}}'
```

### Update

With a package install:

```sh
opencode plugin update
```

With a local copy:

```sh
cd opencode-easel
git pull
cp src/index.ts src/tui.tsx src/rpc.ts ~/.config/opencode/plugins/easel/
cp src/core/*.ts ~/.config/opencode/plugins/easel/core/
diff -rq src ~/.config/opencode/plugins/easel   # must be empty
```

Restart OpenCode/TUI after copying, or wait for the file watcher to reload the plugin. Then repeat
`opencode plugin list` and the RPC check.

### Shared index

Default path:

```text
~/.local/share/opencode/easel-charts.json
```

Override:

```sh
EASEL_CHART_STORE=/path/to/easel-charts.json opencode
```

The file is shared across locations, so charts created in two different working directories appear in the
same panel. Writes are atomic, and concurrent `easel_chart` calls are serialized by an internal lock.

Charts deleted with `Del` are recorded per session in `deleted` (canonical key and `id:`), so transcript
scanning and index merges never add them back. An explicit `easel_chart` request clears the tombstone and
can re-create the chart; passive registration from the TUI cannot.

## 9. Limitations

- Chart width is estimated from the renderer width; in a narrow panel statistics are dropped in the order
  `total → avg → min → last`, and 30+ columns are compressed to one cell per column.
- `marks` are drawn by `line` and `columns`; `bars`, `sparks`, `share` and `pie` have no shared X axis for markers.
- Fractional and negative values are displayed, but columns and bars scale from zero.
- SVG is a separate export; it does not replace the interactive `easel` block in the chat.
- Grafana detection covers `frames`, `series`/`points` and tabular `data`, but not arbitrary panel plugin
  formats.
- `chartsClear` removes the session entry from the shared index; ```` ```easel ```` blocks already present in
  the transcript remain in message history.

## 10. Sample data

The examples above use this 42-row sample (same rows in CSV and JSON):

```csv
date,client,downloads
2026-11-03,AI agent,147
2026-11-04,AI agent,1263
...
2026-11-16,Script,315
```

The series rank by maximum:

```text
a Person   max 6,594 at Nov 13  last 453  min  90  avg 1,616
b AI agent max 5,318 at Nov 15  last 178  min 147  avg 1,306
c Script   max   636 at Nov 15  last 315  min  14  avg   151
```

`columns` + `combine: "sum"` produces the header
`Daily aitmpl downloads by client type · downloads · Nov 3 2026 → Nov 16 · total max 7,806 at Nov 15`,
ticks `8,000`…`0` and labels `Nov 3`…`Nov 15`.

---

# opencode-easel — Документация плагина (RU)

`opencode-easel` — реализация модуля `easel` для OpenCode V2. Плагин строит терминальные графики прямо в
диалоге и открывает отдельную боковую панель `/easel` со всеми графиками текущей сессии. Шесть форм —
`line`, `columns`, `bars`, `sparks`, `share`, `pie` — повторяют поведение `easel` из Claude Code 2.1.330:
линии на шрифте Брайля, столбцы с двойным вертикальным разрешением, горизонтальные полосы с дробными
блоками, спарклайны, стопроцентные диаграммы пропорций и круговые диаграммы из полублоков.

Плагин работает на двух уровнях:

- **серверная часть** (`index.ts`) регистрирует инструмент `easel_chart`, автоматически графит ответы MCP
  Prometheus / Datadog / Grafana, хранит индекс графиков и публикует RPC;
- **клиентская TUI-часть** (`tui.tsx`) на Solid + OpenTUI рисует блоки ```` ```easel ```` в транскрипте,
  показывает панель `/easel`, счётчик в футере и обрабатывает горячие клавиши.

## Содержание

1. Обзор и назначение
2. Архитектура
3. Шесть форм графиков
4. Форматы входных данных
5. Параметры инструмента `easel_chart`
6. Автоматические графики MCP
7. Панель `/easel`, команды и клавиши
8. Установка и обновление
9. Ограничения
10. Пример данных

---

## 1. Обзор и назначение

`easel_chart` принимает табличные данные или путь к файлу и возвращает блок ```` ```easel ```` с
самодостаточным JSON-payload. Модель обязана вставить этот блок в ответ дословно. TUI распознаёт язык
`easel` (а также `easel-chart`) и заменяет код на цветной график в чате.

Ключевые свойства:

- **шесть форм** и автоматический выбор формы по типу оси X;
- **входные данные любого вида**: JSON, CSV, TSV, SSV, Markdown/SQL-таблицы, выровненный вывод CLI,
  XML, локальный файл, массив объектов или предыдущий результат инструмента;
- **автоматические графики** ответов MCP-мониторинга;
- **общая панель** `/easel` и счётчик `▁▃▅▇ easel (N)` в футере;
- **общий индекс на диске**, который видят все location-инстансы плагина;
- **SVG-экспорт** через `format: "svg"`.

Каждый график получает буквы серий `a`..`h` и фиксированную палитру:

```text
a #5c9cf5   b #e5a93c   c #58b970   d #b48ef0
e #4ec9c9   f #e06c75   g #e58ac8   h #d7c25a
```

## 2. Архитектура

```text
opencode-easel/
├── src/
│   ├── index.ts          серверная часть: инструмент, хуки, команды, RPC
│   ├── tui.tsx           клиентская TUI-часть: Solid + OpenTUI
│   ├── rpc.ts            RPC-контракт easel (методы, события, JSON-схемы)
│   └── core/
│       ├── types.ts      типы, палитра, константы, буквы серий
│       ├── parser.ts     парсеры форматов и детектор MCP-метрик
│       ├── request.ts    нормализация параметров и синонимов
│       ├── charting.ts   модель данных, расчёты и все шесть рендереров
│       ├── chart-store.ts общий индекс easel-charts.json
│       ├── panel-layout.ts упаковка страниц `/easel` и сетка из двух колонок
│       ├── transcript.ts сканер блоков ```easel в сообщениях
│       ├── svg.ts        SVG-рендерер
│       └── index.ts      единая точка экспорта core
├── LICENSE
├── package.json
└── README.md
```

### `index.ts` — сервер

`Plugin.define({ id: "easel", setup })` делает следующее:

1. Читает конфигурацию `autoCharts` / `autoChartSkip` из опций плагина и `ctx.storage`.
2. Подписывается на `ctx.tool.hook("execute.after")`:
   - кэширует до 12 последних результатов инструментов на сессию;
   - для `read` заранее срезает префиксы `<line>: `;
   - пропускает собственный `easel_chart` и результаты, уже содержащие ```` ```easel ````;
   - распознаёт Prometheus / Datadog / Grafana и добавляет готовый блок графика в результат.
3. Через `ctx.tool.transform` добавляет namespace `easel` и инструмент `chart`.
4. Через `ctx.session.hook("context")` добавляет модели краткую инструкцию `[easel:instructions]`.
5. Через `ctx.command.transform` регистрирует `/easel-auto` и `/easel-chart`.
6. Через `ctx.rpc.register(EaselRpc, …)` публикует RPC-методы и события.
7. Ведёт общий файл `~/.local/share/opencode/easel-charts.json` (атомарная запись через временный файл и
   `rename`), сериализует read-modify-write через внутренний lock и сливает данные всех location.

### `tui.tsx` — клиент

Solid + OpenTUI-плагин `easel.tui`:

- регистрирует markdown-рендереры для языков `easel` и `easel-chart`;
- превращает `StyledLine[]` в `StyledText` (chunks с `fg`, `bg`, `bold`, `dim`);
- **присваивает `node.content = styled` через ref/effect**, а не через JSX-проп `content`, иначе Solid
  приводит `StyledText` к строке и в панели появляется `[object Object]`;
- открывает панель `easel.panel`, синхронизирует её по RPC и сканирует сообщения сессии;
- показывает индикатор `▁▃▅▇ easel (N)` в `prompt.footer.status`;
- регистрирует горячие клавиши и команды палитры.

### `rpc.ts` — контракт

`Rpc.define({ id: "easel", methods, events })`:

| Метод | Вход | Выход |
| --- | --- | --- |
| `chartsList` | `{ sessionID }` | `{ charts: ChartEntry[], deletedKeys }` |
| `chartsClear` | `{ sessionID }` | `{ cleared: number }` |
| `chartDelete` | `{ sessionID, chartID?, key? }` | `{ deleted, count, deletedKeys }` |
| `chartRecord` | `{ sessionID, payload }` | `{ chart, count }` |
| `configGet` | `{}` | `{ autoCharts, autoChartSkip }` |
| `configSet` | `{ autoCharts?, autoChartSkip? }` | актуальная конфигурация |
| `autoToggle` | `{}` | `{ autoCharts }` |
| `status` | `{}` | `{ autoCharts, autoChartSkip, sessions }` |

События: `updated` (новый график или очистка) и `config` (переключение авто-графиков). Все вызовы из TUI
передают `location`, потому что серверные инстансы плагина привязаны к рабочему каталогу.

### `core/` — модель и рендеринг

- `ParsedTable` — `{ columns, rows, format, source }`.
- `ChartModel` — форма, заголовок, единицы, ось X (`time | number | category`), серии, части, `combine`,
  `scale`, `marks`, заметки, ширина и итоговый маппинг колонок.
- `SeriesModel` — `key`, `label`, буква, цвет, значения по X и статистика `max / maxX / last / min / mean /
  total / count`.
- `EaselPayload` — `{ v: 1, request, table, meta, auto? }`; полностью самодостаточен, поэтому TUI может
  перерисовать график без повторного парсинга исходного текста.

`chart-store.ts` хранит `ChartStoreFile = { version: 1, sessions: Record<sessionID, ChartEntry[]> }`,
дедуплицирует графики по каноническому ключу (заголовок + форма + оси + форма таблицы), ограничивает
историю 100 графиками на сессию и отбрасывает диагностические заголовки.

`transcript.ts` рекурсивно обходит сообщения, text-части, tool-контент и metadata, находит блоки
```` ```easel ```` / ```` ```easel-chart ````, декодирует payload и удаляет дубликаты.

## 3. Шесть форм графиков

### `line` — линии на шрифте Брайля

До 8 серий. Каждое знакоместо — матрица 2×4 точки Брайля (`⠀`..`⣿`), поэтому график имеет разрешение
2 точки по горизонтали и 4 по вертикали на ячейку. Соседние точки соединяются линейной интерполяцией.
Справа от плота — буквы серий, слева — отметки оси Y, снизу — ось X и подписи.

Если максимумы серий различаются больше чем в 10 раз, график автоматически делится до трёх отдельных
плотов, чтобы маленькие серии не превращались в прямую у нуля. На данных примера `Person`/`AI agent`
попадают в один плот, а `Script` — в отдельный.

```text
Daily aitmpl downloads by client type · downloads · Nov 3 2026 → Nov 16
a Person   max 6,594 at Nov 13  last 453  min  90  avg 1,616
b AI agent max 5,318 at Nov 15  last 178  min 147  avg 1,306
10,000 ┤                                                    ab
       │
       │
       │                                       ⠠⠡
 5,000 ┤                                      ⢀⠂ ⢂     ⠌⠄
       │                                      ⠄   ⢂   ⠌ ⠐⡀
       │                               ⣀⢄⡀   ⠌     ⠄ ⠌   ⠐⡀
       │    ⣀⣤⣤⣤⣤⣤⣀⣀   ⣀⣀⣀⡀⣀⣀⣀⣀⠤⠤⠤⠔⢒⡲⠖⠮⠤⠤⠬⣑⣢⡴⣀⣀    ⠈⠍⠑⠒⠒⠤⣀⠠
     0 ┤ ⡤⠖⠊⠁      ⠉⠉⠉⠉⠉⠉⠉⠉⠉⠉⠉⠑⠒⠒⠊⠉⠁           ⠉⠉⠉⠉⠉      ⠉⠳

c Script   max   636 at Nov 15  last 315  min  14  avg   151
1,000 ┤                                                      c
      │
      │                                                 ⠠⡀
  500 ┤                                                ⠠⠁⠈⠢⡀
      │        ⣀⢄                                     ⡠⠁   ⠈⠢
      │    ⣀⠤⠒⠉  ⠑⢄                 ⣀⡀               ⡐
    0 ┤ ⡠⠔⠊        ⠑⠤⠔⠒⠊⠉⠒⠒⠤⠤⠤⣀⣀⣀⠤⠒⠉ ⠈⠉⠑⠒⠒⠒⠉⠉⠉⠑⠒⠒⠒⠒⠒⠒
      └──────────────────────────────────────────────────────
        Nov 3 Nov 5   Nov 7   Nov 9  Nov 11  Nov 13  Nov 15
```

Алгоритм: значения нормируются в долю оси, `y = (1 - ratio) × (height × 4 - 1)`, бит устанавливается по
таблице Брайля; линия между точками заполняется по шагам `max(1, |Δx|)`.

`scale: "log"` включает логарифмическую ось (тики `1`, `10`, `100`, `1k`, …). `marks` добавляет маркеры
`▲` с подписями на оси X (поддерживаются `line` и `columns`; дата может быть записана как `2026-11-15` или
как Unix-timestamp).

### `columns` — вертикальные столбцы

Один столбец на значение X. Каждая терминальная ячейка столбца использует **два полуряда** и символы
`▀` (верхняя половина), `▄` (нижняя) и `█` (обе), с `fg`/`bg`, поэтому переходы между сегментами
стекового столбца выглядят бесшовно.

- `combine: "sum"` — столбцы складываются вертикально; высота нормируется по сумме колонки.
- любая другая агрегация — серии рисуются **рядом** внутри слота (grouped), высота нормируется по
  максимуму отдельной серии.

Доли стековых сегментов распределяются методом наибольших остатков (Гамильтона), поэтому сумма всегда
равна высоте столбца, а ненулевой сегмент не исчезает. Если сегмент физически тоньше половины строки,
внизу появляется примечание
`the thinnest parts of a column are too thin to draw`.

```text
Daily aitmpl downloads by client type · downloads · Nov 3 2026 → Nov 16 · total max 7,806 at Nov 15
a Person   max 6,594 at Nov 13  last 453  min  90  avg 1,616
b AI agent max 5,318 at Nov 15  last 178  min 147  avg 1,306
c Script   max   636 at Nov 15  last 315  min  14  avg   151
8,000 ┤                               ▄▄    ▀▀
      │                               ▀▀    ██
6,000 ┤                               ██    ██
      │                               ██    ██
4,000 ┤                         ▀▀    ██    ██
      │    ▀▀ ▀▀             ▀▀ ██ ▄▄ ██ ▀▀ ██
2,000 ┤    ▀▀ ▀▀ ▀▀ ▀▀ ▀▀ ▀▀ ▀▀ ██ ██ ██ ██ ██
      │ ▄▄ ██ ██ ▀▀ ▀▀ ██ ██ ██ ██ ██ ██ ██ ██ ▀▀
    0 ┼ ─┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬
        Nov 3Nov 5 Nov 7 Nov 9Nov 11Nov 13Nov 15
                                             ▲ peak
the thinnest parts of a column are too thin to draw
```

Ось Y строится так, чтобы расстояние между тиками было ровно 2 терминальные строки (4 полуряда), включая
базовую линию. При нехватке места столбцы прореживаются, а подписи X не наезжают друг на друга: целиком
пропускается та подпись, которая не помещается.

### `bars` — горизонтальные полосы

До 40 категорий. Длина полосы нормируется по максимальному значению, точность передаётся дробными
блоками `▏▎▍▌▋▊▉█` (каждый — 1/8 знакоместа). Справа печатаются значение и процент от суммы.

```text
Daily aitmpl downloads by client type · downloads · Nov 3 2026 → Nov 16 · total 43,014
a Person   ████████████████████████████████████ 22,620  52.6%
b AI agent █████████████████████████████▏       18,284  42.5%
c Script   ███▍                                  2,110   4.9%
```

Если `line` или `columns` запрошены для категориальной оси X, форма автоматически заменяется на `bars`
с примечанием `x is categorical; showing bars instead of …`.

### `sparks` — спарклайны

Компактная строка на серию: значения нормируются от минимума к максимуму и кодируются блоками
`▁▂▃▄▅▆▇█`. Рядом печатаются `max` и `avg` (среднее арифметическое; в API — `mean`). До 40 серий; при необходимости массив прореживается до
ширины полоски.

```text
Daily aitmpl downloads by client type · downloads · Nov 3 2026 → Nov 16
a Person    ▁▃▂▂▂▂▃▃▂▂█▃▃▁  max 6,594  avg 1,616
b AI agent  ▁▃▂▂▂▂▂▂▄▃▂▂█▁  max 5,318  avg 1,306
c Script    ▁▃▄▁▂▁▁▂▂▂▂▂█▄  max 636  avg 151
```

### `share` — стопроцентная диаграмма

Горизонтальная полоса шириной 20–70 знакомест. До 8 цветных частей `a`..`h`; всё, что дальше,
собирается в серую часть `rest`. Ячейки распределяются методом Гамильтона: полоса **всегда** занимает
ровно заданную ширину, а каждая ненулевая часть получает минимум один `█`.

```text
Daily aitmpl downloads by client type · downloads · Nov 3 2026 → Nov 16 · total 43,014
 ██████████████████████████████████████████████████████████
a Person    22,620  52.6%
b AI agent  18,284  42.5%
c Script     2,110   4.9%
```

В терминале полоса окрашена в цвета частей; в текстовом примере цвета не видны, но сегменты идут в
порядке `a`, `b`, `c`. Старый алгоритм независимого `Math.round` мог дать `width - 1` или `width + 1`
ячейку и потерять маленькую ненулевую часть — теперь используется общий `apportionHalves`.

### `pie` — круговая диаграмма

Круговая диаграмма из полублоков `▀`, `▄` и `█`: каждая терминальная ячейка — два вертикальных полуряда,
а горизонтальный коэффициент `1.15` сохраняет круглую форму в моноширинном шрифте. Диск занимает девять
терминальных строк (18 полурядов × 21 колонка). Секторы начинаются на 12 часах и идут по часовой стрелке;
показываются до 8 цветных частей, остальные объединяются в серую часть `rest`. Легенда сбоку печатает
букву, маркер `●`, подпись, значение и процент. Если строк в легенде меньше, чем в девятирядном диске, она
выравнивается по центру по вертикали. Крошечные ненулевые части получают минимальный визуальный угол,
поэтому доля в 1–5% всё равно рисует заметные полублоки, а легенда сохраняет точный математический процент.

```text
Daily aitmpl downloads by client type · downloads · Nov 3 2026 → Nov 16 · total 43,014
       ▄▄▄▄▄▄▄▄▄
    ▄█████████████▄
   █████████████████
  ███████████████████     a ● Person    22,620   52.6%
  ███████████████████     b ● AI agent  18,284   42.5%
  ███████████████████     c ● Script     2,110    4.9%
   █████████████████
    ▀█████████████▀
       ▀▀▀▀▀▀▀▀▀
```

`pie` работает и для категориальных, и для временных данных: части — это суммы серий, если серий
несколько, или крупнейшие категории X для одной серии.

### SVG-экспорт

`format: "svg"` возвращает самостоятельный документ в блоке ```` ```svg ````. Для `line` рисуются
полилинии, сетка и до 7 подписей X; для `columns` — grouped/stacked прямоугольники и до 7 подписей X;
для `bars`/`sparks` — горизонтальные полосы; для `share` — сегменты и легенда; для `pie` — дуги-секторы
`<path>` с легендой справа от диска (или один `<circle>` для сектора 100%). Ширина SVG вычисляется из
`width` (520–1400 px), высота — 520 px для линий и 460 px для остальных форм.

## 4. Форматы входных данных

| Формат | Пример | Примечание |
| --- | --- | --- |
| JSON-массив | `[{"date":"2026-01-01","value":4}]` | массив объектов-строк |
| Вложенный JSON | `{"data":{"rows":[…]}}` | ищет `data`, `rows`, `records`, `items`, `points`, `series`, `results`, `frames` |
| CSV | `date,value` | запятая, кавычки и `""` поддерживаются |
| TSV | `date<TAB>value` | табуляция |
| SSV | `date;value` | точка с запятой |
| Markdown-таблица | `\| date \| value \|` | строки-разделители `---` игнорируются |
| SQL/psql | `+---+---+`, `\| alpha \| 11 \|` | box-таблицы и `├┼┤` |
| Выровненный CLI | `NAME   REQUESTS` | 2+ пробела или табуляция; нужна хотя бы одна числовая колонка |
| XML | `<records><record>…</record></records>` | записи по повторяющемуся тегу; атрибуты и дочерние элементы |
| `path` | `/tmp/data.csv` | файл читается, если не передан `data` |
| Предыдущий результат | без `data`/`path` | берётся последний завершённый результат другого инструмента в сессии |

Дополнительно:

- ANSI-коды удаляются;
- внешний Markdown-fence снимается;
- префиксы `1: `, `2: `, … срезаются, если занимают ≥60% непустых строк;
- заголовки `read` вида `Read file /path, lines 1-43`, `Showing lines…`, `(End of file…)`, `<file>` и
  `</file>` удаляются;
- значения `1,234`, `$12`, `42%` распознаются как числа;
- даты `YYYY-MM-DD`, `YYYY/MM/DD`, `YYYY-MM`, годы и Unix-timestamp (секунды/миллисекунды) распознаются
  как время.

Автоопределение колонок:

1. Дата/время — по имени (`date`, `time`, `timestamp`, `ts`, `day`, `month`, `year`, `period`, `window`)
   и по значениям.
2. Числовые колонки — если ≥70% непустых значений числа и колонка не похожа на дату.
3. Колонка серий — текстовая колонка с 2–40 уникальными значениями, которых меньше числа строк.
4. X — явный `x`, затем дата, затем текстовая колонка, затем первая колонка.
5. Y — явный `y`, иначе числовая колонка, не совпадающая с X и сериями; имена вроде `value`, `count`,
   `total` считаются менее приоритетными.

Широкая таблица (`date,cpu,mem`) превращается в несколько серий; длинная таблица
(`date,client,downloads`) — в серии по `client`.

## 5. Параметры инструмента `easel_chart`

| Параметр | Тип | Описание |
| --- | --- | --- |
| `data` | `string \| object[]` | Данные в любом поддерживаемом формате или массив объектов-строк. |
| `path` | `string` | Локальный файл. Используется, если `data` пуст. |
| `form` | `line \| columns \| bars \| sparks \| share \| pie` | Форма графика. |
| `x` | `string` | Колонка оси X / категорий. |
| `y` | `string \| string[]` | Числовая колонка значений. Массив выбирает несколько числовых колонок широкой таблицы. |
| `series` | `string \| string[]` | Колонка, разбивающая данные на серии; используется первая строка массива. |
| `by` | `string \| string[]` | Синоним `series`. |
| `title` | `string` | Заголовок. |
| `unit` | `string` | Единицы в шапке: `downloads`, `req/s`, `ms`, … |
| `combine` | `none \| sum \| mean \| max \| min` | Агрегация повторяющихся пар `(x, series)`. `sum` дополнительно включает стековые столбцы и печатает `total` в статистике. `none` для повторяющихся пар складывает значения. `avg` принимается как синоним `mean`. |
| `scale` | `linear \| log` | Шкала. `log` включает логарифмическую ось. |
| `log` | `boolean` | Синоним `scale: "log"`; `true` включает лог-шкалу. |
| `marks` | `array` | Маркеры событий: `{ "x": "2026-11-15", "label": "peak", "color": "#e5a93c" }`. Вместо `x` можно использовать `at`. Дата может быть ISO-днём или Unix-timestamp. |
| `width` | `integer` | Ширина 40–220. Внутри модели зажимается в 48–220. Панель передаёт собственную ширину. |
| `limit` | `integer` | Ограничение числа серий. По умолчанию 8 для `line`/`columns`, 40 для остальных; значение зажимается этим пределом. |
| `top` | `integer` | Синоним `limit`. |
| `format` | `text \| svg` | `text` — блок `easel` (по умолчанию), `svg` — самостоятельный SVG-блок. |

Пример вызова:

```jsonc
{
  "path": "~/downloads.csv",
  "form": "columns",
  "combine": "sum",
  "title": "Daily aitmpl downloads by client type",
  "unit": "downloads",
  "marks": [{ "x": "2026-11-15", "label": "peak" }]
}
```

Инструмент возвращает:

````text
```easel
{"v":1,"request":{…},"table":{…},"meta":{…}}
```
````

Блок нужно вставить в ответ **дословно**: не менять JSON, не переименовывать язык `easel`, не оборачивать
в дополнительный fence и не сокращать. Именно этот блок TUI превращает в график.

## 6. Автоматические графики MCP

При `autoCharts: true` хук `execute.after` проверяет каждый завершённый результат инструмента. Если имя
инструмента содержит `prometheus`, `datadog` или `grafana`, либо JSON структурно похож на ответ
мониторинга, плагин:

1. парсит метрики в таблицу `timestamp / value / series`;
2. проверяет, что X — время и в нём минимум 3 точки;
3. строит `line`-график с заголовком `Prometheus · metric`, `Datadog · metric` или `Grafana · metric`;
4. записывает график в общий индекс;
5. добавляет блок ```` ```easel ```` в конец результата инструмента и metadata `easel.automatic = true`.

Поддерживаются:

- **Prometheus matrix**: `data.result[].metric` + `values`;
- **Prometheus vector**: `data.result[].metric` + `value` (при имени инструмента Prometheus);
- **Datadog**: `series[].metric` + `pointlist` (также `points`, `datapoints`, `values`) и `scope`;
- **Grafana Data Frames**: `frames[].schema.fields` + `data.values`;
- **Grafana series**: `results.*.series[].points`;
- **Grafana rows/data**: массивы `data` с табличными строками.

Timestamp понимается как ISO-строка, секунды или миллисекунды. Метка серии собирается из `metric`,
`labels`, `name` и `scope`.

Конфигурация:

| Опция | По умолчанию | Описание |
| --- | --- | --- |
| `autoCharts` | `true` | Автоматически строить графики метрик MCP. |
| `autoChartSkip` | `["*easel_chart*"]` | Glob-шаблоны имён инструментов, которые не надо графить. `*` и `**` означают любой фрагмент. |

Пример `opencode.json(c)`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "~/.config/opencode/plugins/easel",
      "options": {
        "autoCharts": true,
        "autoChartSkip": ["*easel_chart*", "prometheus_targets"]
      }
    }
  ]
}
```

Управление без редактирования конфигурации:

```sh
/easel-auto off
/easel-auto on
/easel-auto status
```

Или клавиша `a` в панели, или команда палитры `Easel: toggle automatic charting`. Настройки сохраняются
в storage плагина и переживают перезапуск.

## 7. Панель `/easel`, команды и клавиши

### Панель

`/easel` (алиас `/charts`) открывает боковую панель текущей сессии. Источники графиков:

1. общий индекс `~/.local/share/opencode/easel-charts.json` через RPC `chartsList`;
2. локальный кэш TUI;
3. сканирование сообщений сессии (включая историю, Plan mode и блоки, вставленные вручную).

Панель теперь заполняет экран графиками, а не показывает один график с пустым местом под ним. Строки
графиков упаковываются на каждую страницу в зависимости от высоты терминала: обычно два и более полных
XY-графика либо три–пять компактных графиков `bars` / `sparks` / `share` / `pie`. Соседние графики
разделяет трёхрядный разделитель (пустая строка, тусклая линия `─`, пустая строка), поэтому страница
«дышит». В широком полноэкранном режиме (не менее 104 колонок, включён fullscreen) панель переходит на
двухколоночную masonry-раскладку: каждый график добавляется в более короткую колонку, пустые внешние
строки обрезаются, а просторный вертикальный разделитель `   │   ` разделяет колонки, при этом линии `─`
в каждой колонке подгоняются под измеренную ширину содержимого. Левая колонка дополняется до фактической
ширины содержимого, а не до номинальной ширины колонки, поэтому компактный `pie` или спарклайн не
оставляет широкой пустоты перед разделителем. До закрытия панели у каждого графика сохраняется собственная
форма, поэтому смена формы одного графика не сбрасывает остальные. Область графиков также получает отступ
в одну строку сверху и снизу между строкой статуса и подсказкой по клавишам. Маркер выбора (`▸ 2/4`), номер
и форма выводятся в собственной строке заголовка графика, поэтому название печатается один раз, а не дважды.

В заголовке панели: `▁▃▅▇ easel`, номер страницы, диапазон видимых графиков, выбранный график и его форма,
а также состояние `auto on/off`. Внизу — подсказка по клавишам.

Горячие клавиши в открытой панели:

| Клавиша | Действие |
| --- | --- |
| `]` | Следующая страница (на одной странице — следующий график). |
| `[` | Предыдущая страница (на одной странице — предыдущий график). |
| `↑` / `↓` (`k` / `j`) | Выбрать предыдущий / следующий график; выделение продолжает двигаться через границы страниц. |
| `m` | Цикл формы выбранного графика `line → columns → bars → sparks → share → pie`; остальные графики на странице сохраняют свои формы. |
| `f` | Полноэкранный режим (при широком экране включает сетку из двух колонок). |
| `a` | Автоматические MCP-графики вкл/выкл. |
| `Del` (`delete`) | Удалить выбранный график из сессии. |
| `Esc` | Закрыть панель. |

Футер сессии показывает `▁▃▅▇ easel (N)`, когда в активной сессии есть графики.

### Slash-команды

| Команда | Действие |
| --- | --- |
| `/easel` | Открыть панель графиков. |
| `/charts` | Алиас `/easel`. |
| `/easel-auto` | Переключить `autoCharts`. |
| `/easel-auto on` / `off` / `status` | Явное управление авто-графиками. |
| `/easel-auto <текст>` | Попросить модель построить график последнего результата инструмента с дополнительным указанием. |
| `/easel-chart` | Попросить модель построить график последнего результата инструмента. |

### Команды палитры

- `Easel: open chart panel` — открыть панель;
- `Easel: cycle chart form` — сменить форму активного графика;
- `Easel: delete current chart` — удалить текущий график;
- `Easel: toggle automatic charting` — включить/выключить авто-графики.

### RPC вручную

```sh
opencode api post /api/rpc/easel/status --data '{"input":{}}'
opencode api post /api/rpc/easel/chartsList --data '{"input":{"sessionID":"ses_…"}}'
opencode api post /api/rpc/easel/chartDelete \
  --data '{"input":{"sessionID":"ses_…","chartID":"easel_…"}}'
opencode api post /api/rpc/easel/configSet \
  --data '{"input":{"autoCharts":false,"autoChartSkip":["prometheus_targets"]}}'
```

Сразу после старта сервера RPC может быть ещё не зарегистрирован (регистрация асинхронная). Если пришёл
ответ `RPC is unavailable: easel`, повторите запрос через секунду.

## 8. Установка и обновление

### Пакет в npm

```sh
opencode plugin add opencode-easel
```

OpenCode читает `exports` пакета (`.`, `./tui`, `./rpc`) и загружает все его части. В пакет входят
TypeScript-исходники (`src/`); входные точки — `src/index.ts`, `src/tui.tsx` и `src/rpc.ts`.

### Из GitHub

```sh
opencode plugin add github:KURANOV07/opencode-easel
```

### Локальная копия

```sh
git clone https://github.com/KURANOV07/opencode-easel.git
cd opencode-easel
```

OpenCode автоматически загружает локальные плагины из `~/.config/opencode/plugins/`. Части плагина
кладутся прямо в каталог, без `package.json` и `node_modules`: OpenCode разрешает `@opencode/plugin`,
`@opencode/plugin/tui`, `@opencode/plugin/rpc`, `@opentui/core`, `@opentui/solid` и `solid-js` из своего
runtime.

```sh
mkdir -p ~/.config/opencode/plugins/easel/core
cp src/index.ts src/tui.tsx src/rpc.ts ~/.config/opencode/plugins/easel/
cp src/core/*.ts ~/.config/opencode/plugins/easel/core/
```

Проверка:

```sh
opencode plugin list
# ID     VERSION  SOURCE
# easel  local    ~/.config/opencode/plugins/easel

opencode api post /api/rpc/easel/status --data '{"input":{}}'
```

### Обновление

Установка из пакета:

```sh
opencode plugin update
```

Локальная копия:

```sh
cd opencode-easel
git pull
cp src/index.ts src/tui.tsx src/rpc.ts ~/.config/opencode/plugins/easel/
cp src/core/*.ts ~/.config/opencode/plugins/easel/core/
diff -rq src ~/.config/opencode/plugins/easel   # должно быть пусто
```

После копирования перезапустите OpenCode/TUI или дождитесь перезагрузки watcher. Затем повторите
`opencode plugin list` и RPC-проверку.

### Общий индекс

По умолчанию:

```text
~/.local/share/opencode/easel-charts.json
```

Переопределение:

```sh
EASEL_CHART_STORE=/path/to/easel-charts.json opencode
```

Файл общий для всех location, поэтому графики, построенные в разных рабочих каталогах, видны
в одной панели. Запись атомарная; параллельные `easel_chart` сериализуются внутренним lock.

Удалённые клавишей `Del` графики сохраняются в `deleted` по каждой сессии (канонический ключ и `id:`),
поэтому сканирование транскрипта и слияние индексов не добавляют их обратно. Активный запрос
`easel_chart` снимает tombstone и может построить график заново; пассивная регистрация из TUI — нет.

## 9. Ограничения

- Ширина графика в чате оценивается по ширине рендерера; в узкой панели статистика сокращается в порядке
  `total → avg → min → last`, а 30+ столбцов ужимаются до одного знакоместа на столбец.
- `marks` рисуются формами `line` и `columns`; у `bars`, `sparks`, `share` и `pie` нет общей оси X для маркеров.
- Дробные значения и отрицательные величины отображаются, но столбцы и полосы нормируются от нуля.
- SVG — отдельный экспорт; он не заменяет интерактивный блок `easel` в чате.
- Автоопределение Grafana покрывает `frames`, `series`/`points` и табличные `data`, но не произвольные
  плагинные форматы панелей.
- `chartsClear` очищает запись сессии в общем индексе; уже вставленные в транскрипт блоки ```` ```easel ````
  остаются в истории сообщений.

## 10. Пример данных

В примерах выше используется этот набор из 42 строк (одни и те же данные в CSV и JSON):

```csv
date,client,downloads
2026-11-03,AI agent,147
2026-11-04,AI agent,1263
...
2026-11-16,Script,315
```

Серии ранжируются по максимуму:

```text
a Person   max 6,594 at Nov 13  last 453  min  90  avg 1,616
b AI agent max 5,318 at Nov 15  last 178  min 147  avg 1,306
c Script   max   636 at Nov 15  last 315  min  14  avg   151
```

`columns` + `combine: "sum"` даёт шапку
`Daily aitmpl downloads by client type · downloads · Nov 3 2026 → Nov 16 · total max 7,806 at Nov 15`,
тики `8,000`…`0` и подписи `Nov 3`…`Nov 15`.
