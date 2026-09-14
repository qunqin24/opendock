# GenUI Package (`opencode-gen-ui`)

> Rich, interactive, sandboxed Generative UI rendering system for OpenCode AI agents.

`opencode-gen-ui` enables AI models to dynamically generate and render interactive UI components—from standard KPI cards and data tables to rich 3D scenes, maps, and diagrams—directly within chat applications.

---

## Package layout — read this before importing

The package is split into two halves that resolve very differently:

| Import | Depends on | Works outside OpenCode? |
| :-- | :-- | :-- |
| `opencode-gen-ui` (root) | `solid-js` only | Yes — but see the CSS note below |
| `opencode-gen-ui/schema` | nothing | **Yes, always.** Zero dependencies — safe for any Node script, server, or MCP tool that just needs the widget schema types. |
| `opencode-gen-ui/registry` | nothing | Yes, always. |
| `opencode-gen-ui/renderer`, `/dialog-renderer`, `/ui/catalog/*`, `/ui/plugins/*` | `solid-js` + the relevant viz library | Yes in any Solid + bundler context (Vite, webpack, OpenCode's own build). **Not** in plain Node with no DOM — these render real UI. The `/ui/plugins/leaflet` widget also side-imports Leaflet's CSS, which only a bundler can resolve; a plain `node --experimental-vm` import of it (or of the root barrel, which re-exports it) will throw on that CSS import. |
| `opencode-gen-ui/tools/browser` | Node's `child_process` only | Yes, standalone — no OpenCode required. |
| `opencode-gen-ui/opencode-plugin`, `/tools/a2ui`, `/tools/weather` | `opencode/tool/tool` (and `@opencode-ai/ui/*` for the cards) | **No** — these only resolve inside a real OpenCode runtime by design. Importing them elsewhere throws a clear "Cannot find package 'opencode'" error rather than silently breaking. |

If you're building something that isn't OpenCode itself (a script, a server, an MCP tool) and you only need the widget schema/types, import `opencode-gen-ui/schema` — it has no runtime dependencies at all.

---

## ✨ Features

- ⚡ **Reactive & Lightweight**: Built with Solid.js for lightning-fast rendering and minimal overhead.
- 🔒 **Sandboxed Execution**: Isolated iframe runner ensuring safe script execution for dynamic HTML and 3D visualization widgets.
- 🤖 **LLM Tool Support**: Built-in `render_ui` tool definitions powered by [Effect TS](https://effect.website) for seamless AI tool-calling.
- 📊 **Built-in Widget Catalog**: Ready-to-use components including Line Charts, Bar Charts, Metric Cards, Timelines, Progress Indicators, and Data Tables.
- 🔌 **Rich Plugin Ecosystem**: Out-of-the-box support for popular visualization libraries:
  - **Mermaid**: Flowcharts and sequence diagrams
  - **Plotly**: Multi-series statistical charts
  - **D3.js**: Custom SVG data visualizations
  - **AG-Grid**: High-performance interactive data grids
  - **Leaflet**: Interactive geospatial maps
  - **Three.js**: Interactive 3D graphics and scenes
- 🌐 **Standalone browser control tool**: Docker-sandboxed browser automation, usable without OpenCode.

---

## 📦 Installation

```bash
npm install opencode-gen-ui
```

This installs a compiled `dist/` (real `.js` + `.d.ts`, not raw TypeScript), so it works with plain Node's module resolution — no bundler required for the OpenCode-independent subpaths.

`solid-js` and `effect` are peer dependencies — install them in your project if you don't already have them:

```bash
npm install solid-js effect
```

---

## 📁 Repository Structure

```text
gen-ui/
├── schema.ts              # Core TypeScript types (WidgetSchema, GenUISchema, DialogSchema) — zero dependencies
├── registry.ts            # Widget route resolution — zero dependencies
├── renderer.tsx           # Solid.js reactive renderer and sandboxed iframe wrapper
├── dialog-renderer.tsx    # Dialog schema renderer
├── opencode-plugin.ts     # OpenCode plugin manifest (tools + cards) — OpenCode-only, isolated from the main entry
├── tools/                 # Tool execution handlers for AI agents
│   ├── a2ui.ts            # Main `render_ui` tool schema & metadata generator (OpenCode-only: imports opencode/tool/tool)
│   ├── browser.ts         # Docker-sandboxed browser automation tool (standalone, no OpenCode dependency)
│   └── weather.ts         # Weather card tool handler (OpenCode-only)
└── ui/                    # UI component catalog and plugin implementations
    ├── catalog/           # Standard widgets (bar-chart, line-chart, data-table, etc.) — Solid.js only
    ├── plugins/            # Library plugins (plotly, mermaid, d3, ag-grid, leaflet, threejs) — Solid.js + the viz lib
    ├── a2ui-card.tsx       # A2UI container card (OpenCode-only: imports @opencode-ai/ui)
    ├── browser-card.tsx    # Embedded browser viewer card (OpenCode-only)
    └── weather-card.tsx    # Live weather status card (OpenCode-only)
```

The OpenCode-coupled files (`tools/a2ui.ts`, `tools/weather.ts`, `ui/*-card.tsx`, `opencode-plugin.ts`) are intentionally **not** re-exported from the package root — only from their own subpaths — so that importing the root package (or the framework-agnostic renderer/catalog) never requires an OpenCode runtime to be present.

---

## 🛠️ Usage

### 1. Rendering UI in Solid.js

```tsx
import { RenderGenUI } from "opencode-gen-ui/renderer"

const mySchema = {
  type: "widget",
  widget: "chart",
  engine: "chartjs",
  props: {
    title: "Monthly Revenue Growth",
    type: "line",
    labels: ["Jan", "Feb", "Mar", "Apr", "May"],
    data: [12000, 19000, 25000, 32000, 48000]
  }
}

function App() {
  return <RenderGenUI schema={mySchema} height={400} />
}
```

### 2. Registering the plugin with OpenCode

```typescript
import plugin from "opencode-gen-ui/opencode-plugin"

// plugin = { name: "opencode-gen-ui", tools: [A2UITool, BrowserTool, WeatherTool], cards: {...} }
// Wire this into OpenCode's plugin loader. This subpath requires an OpenCode
// runtime — do not import it from a standalone script or server.
```

### 3. Using just the schema (works anywhere, including a plain Node script or an MCP server)

```typescript
import type { WidgetSchema, GenUISchema } from "opencode-gen-ui/schema"
```

### 4. Using the standalone browser tool (no OpenCode required)

```typescript
import { BrowserTool } from "opencode-gen-ui/tools/browser"

// Requires a running "browser-sandbox" Docker container with the
// agent-browser CLI and Chromium installed — see gen-ui/tools/browser.ts.
const result = await BrowserTool.execute({ command: "open", args: ["https://example.com"] })
```

---

## 🎨 Supported Widgets & Components

| Component | Description | Sample Data Keys |
| :--- | :--- | :--- |
| `gen_ui` | Dialog schema or typed widget | `{ type: "dialog", dialog: { ... } }` |
| `widget` | Standard iframe chart | `{ widget: "chart", engine: "chartjs", props: { ... } }` |
| `bar_chart` | Categorical bar chart | `{ title, labels, values }` |
| `line_chart` | Time-series line chart | `{ title, labels, values }` |
| `table` | Standard data table | `{ headers, rows }` |
| `metric_card` | KPI metric highlights | `{ metrics: [{ label, value, change, trend }] }` |
| `timeline` | Chronological event list | `{ events: [{ date, title, description }] }` |
| `progress` | Progress bars | `{ items: [{ label, value, max }] }` |
| `mermaid` | Flowcharts & diagrams | `{ definition, theme }` |
| `plotly` | Statistical plots | `{ data, layout }` |
| `d3` | Custom SVG charts | `{ type, values, points }` |
| `leaflet` | Interactive maps | `{ center, zoom, markers }` |
| `threejs` | 3D scene objects | `{ background, objects }` |
| `ag_grid` | Large interactive data grid | `{ columns, rowData }` |

⚠️ The `html` component renders arbitrary model-provided HTML in a `sandbox="allow-scripts"` iframe. Sandboxing reduces but does not eliminate risk — do not remove the `sandbox` attribute, and add a Content-Security-Policy on whatever page hosts that iframe if you serve this over the network.

---

## Known limitations

- **`gen-ui/tools/weather.ts` has a broken import**: it imports `effect/unstable/http`, which does not exist in `effect@3.x`. This subpath will throw at import time until it's updated to the correct HTTP client API for the `effect` version you depend on (likely `@effect/platform`'s `HttpClient`). Left as-is pending a decision on which `effect` ecosystem package to standardize on.
- **`ui/plugins/leaflet.tsx` side-imports Leaflet's CSS**, which only a bundler (Vite/webpack/OpenCode's build) can resolve. Importing that subpath — or the root barrel, which re-exports it — in plain Node with no bundler will throw on the CSS import. This is inherent to shipping a Leaflet wrapper; use the `opencode-gen-ui/schema` subpath if you need a Node/server-only, DOM-free surface.

---

## 📄 License

[MIT](LICENSE) © Pranav Sai Madala
