# opencode-go-usage-plugin

An [OpenCode](https://opencode.ai) TUI sidebar plugin that shows your OpenCode Go plan usage (5h / weekly / monthly) from the official usage API — no dashboard scraping.

```
Go Usage
5h █▏░░░░░ wk ████▏░░ mo ███████
22% · 2h   81% · 7d   100% · 28d
```

## Features

- **Plan gauges** — three eighth-block gauges (5h / wk / mo) sized to the sidebar, with percent and reset countdown beneath each
- **Proximity colors** — gauge and percent ramp through theme tokens as limits approach: `success` <50% → `accent` 50–74% → `warning` 75–89% → `error` ≥90% or `rate-limited`
- **Compact prompt line** — `Go month 100%` in the prompt bar when the sidebar is hidden, showing the binding constraint
- **Official API** — polls `GET https://opencode.ai/zen/go/v1/usage` with your existing Go key; zero config, no page scraping
- **Live updates** — 60s polling plus refresh on message/session events
- **Silent by design** — hidden entirely when no `opencode-go` key is present or the session is not using Go

## Install

```sh
opencode plugin --global @davidaayers/opencode-go-usage-plugin
```

or from inside OpenCode: press `ctrl+p` → "Install Plugin" → `@davidaayers/opencode-go-usage-plugin`. Restart OpenCode and the block appears in the sidebar once the session uses an `opencode-go` model.

### From source

OpenCode TUI plugins load from the `plugin` array in **`~/.config/opencode/tui.json`** (or a project-level `tui.json`) — *not* from `opencode.jsonc`, whose `plugin` array is server-side only. Adding a TUI-only module to `opencode.jsonc` will make the server fail to load it.

```jsonc
// ~/.config/opencode/tui.json
{
  "plugin": [
    "file:///absolute/path/to/opencode-go-usage-plugin/src/go-usage.tsx"
  ]
}
```

## How it works

- **Usage windows**: polls the official endpoint (Bearer auth with the `opencode-go` key from `~/.local/share/opencode/auth.json`) every 60s and on message/session events. Each window reports `percent` (0–100), `status` (`ok` / `rate-limited`), and `resetsAt`.
- **Rendering**: SolidJS JSX via `@opentui/solid`, registered into the `sidebar_content` and `session_prompt_right` slots through [`@opencode-ai/plugin/tui`](https://www.npmjs.com/package/@opencode-ai/plugin). Colors come from the active OpenCode theme.
- **Sidebar geometry**: the session sidebar is a fixed 42 columns (37 usable after padding); the gauge columns are sized so the widest possible row (`100% · 28d`) fits exactly.

## Development

```sh
bun install
bun run typecheck
bun scratch-repro.tsx   # headless render capture
```

Single-file plugin: everything lives in [`src/go-usage.tsx`](src/go-usage.tsx).

## License

[MIT](LICENSE) © 2026 David Ayers
