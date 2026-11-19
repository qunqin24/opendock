# opencode-limits-go

[![Release](https://img.shields.io/github/v/release/cusvv/opencode-limits-go?style=flat-square)](https://github.com/cusvv/opencode-limits-go/releases/latest)
[![CI](https://img.shields.io/github/actions/workflow/status/cusvv/opencode-limits-go/ci.yml?branch=main&style=flat-square&label=CI)](https://github.com/cusvv/opencode-limits-go/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/opencode-limits-go?style=flat-square)](https://www.npmjs.com/package/opencode-limits-go)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![OpenCode](https://img.shields.io/badge/OpenCode-v2.3%2B-111827?style=flat-square)](https://opencode.ai)
[![Language](https://img.shields.io/badge/Lang-EN%20%7C%20RU-16a34a?style=flat-square)](#localization)

**OpenCode Go** quota monitor plugin for **OpenCode v2.3+** (TUI & Desktop GUI).

Live usage across all three OpenCode Go windows — **5-hour rolling**, **weekly**, and **monthly** — with smart pace estimation, a 5h trend sparkline, threshold & reset alerts, deep strip/dialog customization, English/Russian localization, and GitHub auto-updates.

---

## Screenshots

<p align="center">
  <img src="docs/limits-dialog.png" alt="Desktop GUI limits dialog with 5h trend sparkline and topbar indicator" width="760" />
</p>

<details>
<summary>More screenshots: Compact Settings Dialog &amp; Terminal TUI</summary>
<br />
<p align="center">
  <img src="docs/settings-dialog.png" alt="Compact settings dialog with live preview and presets" width="520" />
</p>
<p align="center">
  <img src="docs/tui-limits.png" alt="Terminal TUI sidebar indicator and limits popup" width="760" />
</p>
</details>

---

## Highlights

### Quota & Pace Intelligence
- **All OpenCode Go windows**: `5h` / `1w` / `1m` percentages, reset timestamps, countdowns, elapsed-time markers (`|`), recent deltas (`+X%`), and tightest-window summary.
- **Smart pace estimation & 5h sparkline**: Combines window-average and snapshot history to detect coding bursts (`⚡`) and renders a `5h trend` SVG sparkline inside the dialog.
- **OpenCode Zen & today's models**: Shows active Console budgets (`$spent / $limit`), today's Go tokens / Zen USD spend, and the **top 3 models** used today.
- **Reset-aligned & instant cold start**: Persists the last valid snapshot to disk for 0 ms startup, schedules a targeted refresh 3 seconds after any window resets, respects `Retry-After` on `429`/`503`, and slows background polling 3× when minimized.

### Deep Customization (Desktop GUI & TUI)
- **Window modes**: Show any combination of `5h` / `1w` / `1m` (click window labels right inside `/limits` to toggle), or enable **Auto-focus (`tightest`)** to display only the most constrained window.
- **Auto-hide below threshold**: Keep the strip hidden while all windows are below `50%` / `70%` / `80%`.
- **Visual themes & density**:
  - **4 bar palettes**: `Traffic` (green/amber/red), `Monochrome`, `Calm blue`, and `Stealth` (neutral until `100%`).
  - **3 strip densities**: `Compact`, `Normal`, `Wide`.
  - **Indicator styles**: `Bar + %`, `Text only`, `Bars only`, optional **Remaining %** mode (`% left` instead of `% used`), toggleable `⚡` icon and `|` elapsed marker.
  - **Reset countdown on strip**: `Never`, `At 100% only` (default), `At warning & 100%`, or `Always`.
- **Dialog & time formatting**: `24h` / `12h` clocks, `Date + countdown` / `Countdown only` / `Date only`, and individual toggles for pace banner, sparkline, Zen stats, and auth footer.
- **Smart alerts**: Threshold toasts (`70%` / `80%` / `90%` / `100%`), **quota-reset recovery toasts** when a `100%` window clears, and **fast-burn spike alerts** (`+15%` / `+20%` / `+30%` in 5–30 min).
- **GUI ↔ TUI sync**: Window filters, `% left` mode, thresholds, burn-spike sensitivity, and language override sync across Desktop GUI and TUI via plugin RPC (and can also be seeded via `options` in `opencode.json`).

### Works with any OpenCode auth setup
- OpenCode Console **OAuth** account (`opencode`)
- Saved **API key** (`opencode-go` or `opencode` integration)
- Environment variables (`OPENCODE_GO_API_KEY`, `OPENCODE_API_KEY`, `OPENCODE_ZEN_API_KEY`)
- Plugin options or provider settings in `opencode.json`
- Lazy fallback to `opencode auth export` and legacy `~/.local/share/opencode/auth.json`

### Localization
Automatically follows your OpenCode UI language (**English** / **Russian**), or can be overridden manually (`Auto` / `EN` / `RU`) in **Settings → Behavior & language**.

### Security & Auto-Updates
- Tokens never leave the server process — never sent over RPC, never shown in the UI, and automatically redacted from logs (`%TEMP%/opencode-limits-go.log` or `/tmp/opencode-limits-go.log`).
- Local/manual installs auto-update from [GitHub Releases](https://github.com/cusvv/opencode-limits-go/releases); CLI-managed installs (`opencode plugin add`) defer cleanly to `opencode plugin update`.

---

## Installation

Requires **OpenCode v2.3.0+** and an active OpenCode Go credential (`opencode auth login` or `OPENCODE_API_KEY`).

### Option 1: Quick Install via OpenCode CLI (recommended)

```sh
opencode plugin add opencode-limits-go
# or directly from GitHub:
opencode plugin add github:cusvv/opencode-limits-go
```

Restart **OpenCode Desktop** (or run `/reload` in open TUI sessions).

### Option 2: Clone with Git

```sh
# macOS / Linux
git clone https://github.com/cusvv/opencode-limits-go.git ~/.config/opencode/local-plugins/opencode-limits-go
```

```powershell
# Windows (PowerShell)
git clone https://github.com/cusvv/opencode-limits-go.git "$env:USERPROFILE\.config\opencode\local-plugins\opencode-limits-go"
```

### Option 3: Download Release Archive

Download `opencode-limits-go.zip` or `opencode-limits-go.tar.gz` from [Releases](https://github.com/cusvv/opencode-limits-go/releases) and extract it to:
- **Windows**: `%USERPROFILE%\.config\opencode\local-plugins\opencode-limits-go`
- **macOS / Linux**: `~/.config/opencode/local-plugins/opencode-limits-go`

### Enable in `opencode.json` (Options 2 & 3)

Add `./local-plugins/opencode-limits-go` to `plugins` in `~/.config/opencode/opencode.json`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    "./local-plugins/opencode-limits-go"
  ]
}
```

> **Optional dotfiles defaults:** You can also pass a token or shared defaults via `options`:
> ```jsonc
> {
>   "plugins": [
>     {
>       "package": "./local-plugins/opencode-limits-go",
>       "options": {
>         "token": "{env:OPENCODE_GO_API_KEY}",
>         "showRemaining": false,
>         "warnThreshold": 80,
>         "burnSpikePct": 20,
>         "langOverride": "auto"
>       }
>     }
>   ]
> }
> ```

Restart **OpenCode Desktop** (and run `/reload` in open TUI sessions). No `npm install` is required — `dist/gui-experimental.cjs` is prebuilt.

---

## Usage & Shortcuts

| Action | Shortcut / Command |
|---|---|
| Show limits dialog / popup | `/limits` or `Ctrl+Shift+L` (or click the status strip) |
| Open quick settings (Desktop & TUI) | `/limits-settings`, gear button in dialog, or `Settings → OpenCode Go limits` |
| Filter TUI sidebar windows | `/limits-windows` (`All`, `5h·1w`, `5h·1m`, `1w·1m`, or single window) |

### Verify via CLI

```sh
opencode plugin list
opencode api post /api/rpc/opencode-limits-go/status --data '{"input":{"force":true}}'
```

---

## Development

```sh
npm install
npm test          # Run unit tests across src/core and src/server
npm run build     # Typecheck server/TUI/GUI and rebuild dist/gui-experimental.cjs
```

### Project Architecture

```text
src/
  index.ts              Server plugin: RPC endpoints, disk/memory cache, reset-aligned timers
  rpc.ts                Portable RPC contract (status, getPrefs/setPrefs, updates, events)
  gui.tsx               Desktop GUI entrypoint (SolidJS + OpenCode GUI SDK)
  tui.tsx               TUI entrypoint

  core/                 Pure domain logic (zero Node/UI dependencies)
    index.ts            Barrel exports
    types.ts            Types, error codes, window selection & auto-hide helpers
    format.ts           Dates (24h/12h), durations, usage parsing, short error labels
    pace.ts             Snapshot ring buffer, deltas, pace estimation, SVG sparkline data
    alerts.ts           Threshold, reset recovery, and fast-burn spike detectors
    stats.ts            Provider spend & top-model aggregation
    summary.ts          TUI sidebar & detail formatter
    utils.ts            Secret redaction, retry, semver

  server/               Node / IO layer
    api.ts              OpenCode Go HTTP client with Retry-After support
    auth.ts             Multi-source credential discovery & deduplication
    updater.ts          GitHub Releases updater with HTTPS allowlist & recursive sync
    log.ts              Rotating async JSON logger with secret redaction

  gui/                  Desktop GUI modules
    i18n.ts             EN/RU translations
    stores.ts           Effect Schema stores & constants
    components.tsx      MiniBar, Sparkline, LimitsStrip, SectionDivider

  tui/                  Terminal UI modules
    i18n.ts             EN/RU TUI copy
    plugin.tsx          OpenTUI adapter

dist/
  gui-experimental.cjs  Prebuilt CommonJS Desktop GUI bundle
```

---

## License

[MIT](LICENSE)
