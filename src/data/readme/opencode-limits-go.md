# opencode-limits-go

[![Release](https://img.shields.io/github/v/release/cusvv/opencode-limits-go?style=flat-square)](https://github.com/cusvv/opencode-limits-go/releases/latest)
[![CI](https://img.shields.io/github/actions/workflow/status/cusvv/opencode-limits-go/ci.yml?branch=main&style=flat-square&label=CI)](https://github.com/cusvv/opencode-limits-go/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/opencode-limits-go?style=flat-square)](https://www.npmjs.com/package/opencode-limits-go)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![OpenCode](https://img.shields.io/badge/OpenCode-v2.3%2B-111827?style=flat-square)](https://opencode.ai)
[![Language](https://img.shields.io/badge/Lang-EN%20%7C%20RU-16a34a?style=flat-square)](#features)

**OpenCode Go** quota monitor plugin for **OpenCode v2.3+** (TUI & Desktop GUI).

Displays live usage across all three OpenCode Go windows — **5-hour rolling**, **weekly**, and **monthly** — with threshold alerts, flexible placement in Desktop GUI, automatic English/Russian localization matching your OpenCode UI language, and built-in GitHub auto-updates.

---

## Screenshots

<p align="center">
  <img src="docs/limits-dialog.png" alt="Desktop GUI limits dialog and topbar indicator" width="760" />
</p>

<details>
<summary>More screenshots: Settings dialog &amp; Terminal TUI</summary>
<br />
<p align="center">
  <img src="docs/settings-dialog.png" alt="Settings dialog with live preview and presets" width="520" />
</p>
<p align="center">
  <img src="docs/tui-limits.png" alt="Terminal TUI sidebar indicator and limits popup" width="760" />
</p>
</details>

---

## Features

- **All OpenCode Go windows**: `5h` / `1w` / `1m` percentages, reset timestamps, countdowns, elapsed-time markers (`|`), recent `~1h` deltas, and tightest-window summary.
- **Smart pace estimation v2**: Combines window-average and local snapshot history to suppress tiny spikes while catching fresh coding bursts across `5h`, `1w`, and `1m`.
- **OpenCode Zen & today's activity**: Displays active Console budgets (`$spent / $limit`) and today's local `opencode-go` tokens vs. `opencode` (Zen) USD spend inside the dialog and hover tooltip.
- **Works with any OpenCode auth setup**:
  - OpenCode Console **OAuth** account (`opencode`)
  - Saved **API key** (`opencode-go` or `opencode` integration)
  - Environment variables (`OPENCODE_GO_API_KEY`, `OPENCODE_API_KEY`, `OPENCODE_ZEN_API_KEY`)
  - Plugin options or provider settings in `opencode.json`
  - Lazy fallback to `opencode auth export` and legacy `~/.local/share/opencode/auth.json`
- **Desktop GUI**:
  - Clickable status strip with color-coded or monochrome progress bars and `⚡` fast-burn indicators
  - **Quick OpenCode Console access**: Direct button in the limits dialog and Settings page to open your org's Console usage page
  - **Settings window** (`/limits-settings`, gear button in the limits dialog, and native `Settings → OpenCode Go limits`) with a live strip preview and 1-click presets (`Standard`, `Only 5h`, `Text`, `Minimal`)
  - **Placement options**: Bottom bar (default), Top bar (`session.header`), Both, Titlebar / sidebar button, or Hidden
  - **Custom strip layout & behavior**: Show/hide individual windows (`5h`, `1w`, `1m`), switch indicator style (`Bar + %`, `Text only`, `Bars only`), toggle window labels, customize warning thresholds (`70%` / `80%` / `90%` / `100% only`) and refresh intervals (`30s` / `90s` / `5m`)
  - Instant activity updates on model turns and window focus
  - Light & dark theme support
- **TUI**:
  - Live sidebar indicator (`sidebar.content`) with semantic theme colors, optional mini-bars, and `⚡` burn indicator
  - `/limits` popup with Go windows, smart pace, `+1h` delta, and today's Go/Zen usage
  - `/limits-settings` & `/limits-windows` interactive selectors (toggle bars, window filter, thresholds, update check)
  - Command palette entries and `Ctrl+Shift+L` shortcut; auto-refreshes on `session.usage.updated`, periodically, and on credential changes
- **Bilingual (English / Russian)**: Automatically follows the OpenCode UI language (Desktop `ctx.locale`, or `OPENCODE_LANG` / `LC_ALL` / `LANG` in TUI).
- **Auto-Update**: Checks [GitHub Releases](https://github.com/cusvv/opencode-limits-go/releases) for new versions and automatically installs updates in the background (can be toggled or triggered manually in Settings).
- **Security-first**: Tokens never leave the server process — never sent over RPC, never shown in the UI, and automatically redacted from logs (`%TEMP%/opencode-limits-go.log` or `/tmp/opencode-limits-go.log`).

---

## Installation

Requires **OpenCode v2.3.0+** and an active OpenCode Go credential (via `opencode auth login` or `OPENCODE_API_KEY`).

### Option 1: Quick Install via OpenCode CLI (recommended)

```sh
opencode plugin add opencode-limits-go
# or directly from GitHub:
opencode plugin add github:cusvv/opencode-limits-go
```

Then restart **OpenCode Desktop** (or run `/reload` in open TUI sessions).

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

Download `opencode-limits-go.zip` or `opencode-limits-go.tar.gz` from the [Releases](https://github.com/cusvv/opencode-limits-go/releases) page and extract it so the folder is:

- Windows: `%USERPROFILE%\.config\opencode\local-plugins\opencode-limits-go`
- macOS / Linux: `~/.config/opencode/local-plugins/opencode-limits-go`

### Enable in `opencode.json` (Options 2 & 3)

For manual installs, add `./local-plugins/opencode-limits-go` to `plugins` in your global `~/.config/opencode/opencode.json`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    "./local-plugins/opencode-limits-go"
  ]
}
```

> **Optional:** You can also pass an API token directly via plugin options:
> ```jsonc
> {
>   "plugins": [
>     {
>       "package": "./local-plugins/opencode-limits-go",
>       "options": { "token": "{env:OPENCODE_GO_API_KEY}" }
>     }
>   ]
> }
> ```

Restart **OpenCode Desktop** (and run `/reload` in open TUI sessions). No `npm install` is required — `dist/gui-experimental.cjs` is prebuilt.

---

## Usage & Shortcuts

| Action | Shortcut / Command |
|---|---|
| Show limits dialog | `/limits` or `Ctrl+Shift+L` (or click the indicator in Desktop) |
| Open plugin settings (Desktop & TUI) | `/limits-settings`, gear button in dialog, or `Settings → OpenCode Go limits` |
| Filter TUI sidebar windows | `/limits-windows` |

### Verify via CLI

```sh
opencode plugin list
opencode api post /api/rpc/opencode-limits-go/status --data '{"input":{"force":true}}'
```

---

## Development

```sh
npm install
npm test          # Run unit tests (model, auth, updater)
npm run build     # Typecheck server/TUI/GUI and rebuild dist/gui-experimental.cjs
```

### Project Structure

```
src/
  index.ts        Server plugin: RPC endpoints, caching, event invalidation, auto-updater loop
  auth.ts         Multi-source credential discovery & deduplication
  api.ts          OpenCode Go usage HTTP client
  model.ts        Pure formatting, validation, EN/RU localization, semver, secret redaction
  updater.ts      GitHub Releases updater with HTTPS allowlist & staged verification
  rpc.ts          Portable RPC contract
  log.ts          Rotating JSON logger (256 KB max)
  tui.tsx         OpenTUI adapter
  gui.tsx         Desktop GUI adapter (SolidJS + OpenCode GUI SDK)
dist/
  gui-experimental.cjs   Prebuilt CommonJS Desktop GUI bundle
```

---

## License

[MIT](LICENSE)
