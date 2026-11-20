# opencode-limits-go

[![Release](https://img.shields.io/github/v/release/cusvv/opencode-limits-go?style=flat-square)](https://github.com/cusvv/opencode-limits-go/releases/latest)
[![CI](https://img.shields.io/github/actions/workflow/status/cusvv/opencode-limits-go/ci.yml?branch=main&style=flat-square&label=CI)](https://github.com/cusvv/opencode-limits-go/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/opencode-limits-go?style=flat-square)](https://www.npmjs.com/package/opencode-limits-go)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![OpenCode](https://img.shields.io/badge/OpenCode-v2.3%2B-111827?style=flat-square)](https://opencode.ai)
[![Language](https://img.shields.io/badge/Lang-EN%20%7C%20RU-16a34a?style=flat-square)](#localization)

**OpenCode Go** quota monitor plugin for **OpenCode v2.3+** (TUI & Desktop GUI).

Live usage across all three OpenCode Go windows — **5-hour rolling**, **weekly**, and **monthly** — with risk verdicts, pace estimation, a 5h trend sparkline, threshold & reset alerts, deep strip/dialog customization, English/Russian localization, and checksum-verified GitHub updates.

---

## Screenshots

<p align="center">
  <img src="docs/limits-dialog.png" alt="Desktop GUI limits dialog with 5h trend sparkline and topbar indicator" width="760" />
</p>

<details>
<summary>Desktop settings dialog</summary>
<br />
<p align="center">
  <img src="docs/settings-dialog.png" alt="Compact settings dialog with live preview and presets" width="520" />
</p>
</details>

TUI is intentionally one line in the sidebar:

```text
5h ██░░ 42% · 1w █░░░ 31% · 1m ███░ 78% (3d 4h)
```

---

## Highlights

### Quota & pace intelligence
- **All OpenCode Go windows**: `5h` / `1w` / `1m` percentages, reset timestamps, countdowns, recent deltas (`+X%`), and a risk-ranked tightest window.
- **Risk verdicts**: each window says whether it will survive until reset, or roughly when it will hit 100%. A 5h window about to reset no longer hides a weekly window that will actually run out first.
- **Smart pace & 5h sparkline**: combines window-average and snapshot history to detect coding bursts (`⚡`) and renders a real 5h+ trend inside the dialog.
- **OpenCode Zen & today**: active Console budgets (`$spent / $limit`), today's Go tokens / Zen USD spend, top models, and a **last-7-days** slice.
- **Reset-aligned cold start**: persists the last valid snapshot for 0 ms startup, refreshes 3 seconds after any window resets, respects `Retry-After` on `429`/`503`, and slows background polling 3× when minimized.

### Alerts that reach you
- Threshold toasts (`70%` / `80%` / `90%` / `100%`), quota-reset recovery toasts, fast-burn spike alerts, and **"won't survive until reset"** warnings.
- **System notifications** when the app is not focused — **off by default**, opt-in, and only for 100% quota (max once per 10 minutes). In-app toasts remain separate.
- Alerts are deduplicated per account/window/reset, persisted in TUI storage across `/reload`, and never fire on stale disk-cache data.

### Deep customization
- **Desktop GUI**: window selection, auto-focus, auto-hide below `50%` / `70%` / `80%`, four bar palettes, three densities, indicator styles (`Bar + %`, text, bars), remaining-% mode, reset countdown modes, 24h/12h clocks, per-block dialog toggles.
- **TUI**: bars, remaining-% mode, window filter, alert threshold, fast-burn sensitivity, mute, hide-strip, plain ASCII, language override, and persisted alert state.
- **GUI ↔ TUI sync**: window filters, `% left`, alerts, thresholds, burn-spike sensitivity, and language sync via plugin RPC (or `options` in `opencode.json`).

### Credentials and updates
- Works with OpenCode Console **OAuth** (`opencode`), saved **API keys** (`opencode-go` / `opencode`), env vars (`OPENCODE_GO_API_KEY`, `OPENCODE_API_KEY`, `OPENCODE_ZEN_API_KEY`), plugin options, `opencode auth export`, and legacy `auth.json`.
- Tokens never leave the server process — never sent over RPC, never shown in the UI, and redacted from logs.
- **Dev installs (`git clone` or `local-plugins`) are never overwritten** by the updater. Release installs update only from a release that ships `SHA256SUMS`, with a version check, process lock, and `package.json` written last.

---

## Installation

Requires **OpenCode v2.3.0+** and an active OpenCode Go credential (`opencode auth login` or `OPENCODE_API_KEY`).

### Option 1: OpenCode CLI (recommended)

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
cd ~/.config/opencode/local-plugins/opencode-limits-go && npm install
```

```powershell
# Windows (PowerShell)
git clone https://github.com/cusvv/opencode-limits-go.git "$env:USERPROFILE\.config\opencode\local-plugins\opencode-limits-go"
cd "$env:USERPROFILE\.config\opencode\local-plugins\opencode-limits-go"; npm install
```

`npm install` is required for the TUI entrypoint (`solid-js` and `@opentui/solid`). The Desktop GUI bundle is prebuilt.

### Option 3: Release archive

Download `opencode-limits-go.zip` or `opencode-limits-go.tar.gz` plus `SHA256SUMS` from [Releases](https://github.com/cusvv/opencode-limits-go/releases), verify with `sha256sum -c SHA256SUMS` (Windows: `certutil -hashfile opencode-limits-go.zip SHA256`), and extract to:
- **Windows**: `%USERPROFILE%\.config\opencode\local-plugins\opencode-limits-go`
- **macOS / Linux**: `~/.config/opencode/local-plugins/opencode-limits-go`

Then run `npm install` in that directory, as for the git clone.

### Enable in `opencode.json` (Options 2 & 3)

Add `./local-plugins/opencode-limits-go` to `plugins` in `~/.config/opencode/opencode.json` (Windows: `%USERPROFILE%\.config\opencode\opencode.json`):

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    "./local-plugins/opencode-limits-go"
  ]
}
```

Optional defaults:

```jsonc
{
  "plugins": [
    {
      "package": "./local-plugins/opencode-limits-go",
      "options": {
        "token": "{env:OPENCODE_GO_API_KEY}",
        "showRemaining": false,
        "warnThreshold": 80,
        "burnSpikePct": 20,
        "langOverride": "auto",
        "autoUpdate": true
      }
    }
  ]
}
```

Restart **OpenCode Desktop** and run `/reload` in open TUI sessions.

---

## Usage & shortcuts

| Action | Shortcut / command |
|---|---|
| Show limits dialog / popup | `/limits` or `Ctrl+Shift+L` (or click the status strip in Desktop) |
| Quick settings | `/limits-settings`, gear button in Desktop, or **Settings → OpenCode Go limits** |
| Filter TUI sidebar windows | `/limits-windows` |

The TUI keybind can be rebound in OpenCode's keymap; `/limits` always works.

### Desktop vs TUI

| Capability | Desktop GUI | TUI |
|---|---|---|
| Three windows, pace, sparkline, Zen stats | Yes | Yes (popup) |
| System notifications | Yes | Yes |
| Bars / remaining % / window filter | Yes | Yes |
| Alert threshold / burn-spike / mute | Yes | Yes |
| Hide strip / plain ASCII | Placement **Hidden** | Settings |
| Palettes, density, auto-hide, 12h clock | Yes | No (24h only) |
| Settings sync with the other UI | Yes | Yes |

### Defaults

| Setting | Default |
|---|---|
| Placement (Desktop) | Bottom strip, always visible |
| TUI strip | All three windows, text only, visible |
| Poll interval | 90s (3× slower when Desktop is minimized) |
| Alert threshold | 80% and 100% |
| System notifications | Off; when enabled, 100% only, max once per 10 min |
| Fast-burn spike | +20% in 5–30 min |
| Auto-update | On for release installs; ignored for git/`local-plugins` installs |
| Language | Follow OpenCode UI (TUI falls back to `OPENCODE_LANG`/`LC_ALL`/`LANG`) |

### Verify via CLI

```sh
opencode plugin list
opencode api post /api/rpc/opencode-limits-go/status --data '{"input":{"force":true}}'
```

A healthy response has `"ok": true` and a non-empty `rows` array. `"ok": false` includes an actionable `error` (`NO_TOKEN`, expired token, rate limit, or network failure).

---

## Troubleshooting

**Plugin not listed in `opencode plugin list`**
- Check the `plugins` entry and restart the app. Local installs must point at the directory containing `package.json`.
- Run `npm install` in the plugin directory if the TUI strip never appears but Desktop works.

**`NO_TOKEN` / `401` / `403`**
- Run `opencode auth login`, or set `OPENCODE_API_KEY` / `OPENCODE_GO_API_KEY` and restart.
- In Desktop, the error dialog has **Copy login cmd**, **Console**, and **Retry**.

**Offline / `429` / `503`**
- The last good snapshot is shown with a stale marker and its age. The plugin honors `Retry-After` and backs off; no action is usually needed.

**Logs and diagnostics**
- Log: `%TEMP%\opencode-limits-go\limits.log` (Windows) or `/tmp/opencode-limits-go/limits.log` (macOS/Linux).
- Desktop settings include **Diagnostics → Copy info** with version, source, usage, and placement (no tokens).

**Uninstall**
- `opencode plugin remove opencode-limits-go`, or remove the `plugins` entry and delete the plugin directory.

---

## Security

- No telemetry. Network access is limited to the OpenCode Go usage endpoint and GitHub releases.
- Tokens are read server-side and never cross RPC. Credential lookup is time-bounded, and Windows CLI fallback blocks current-directory executable hijacking.
- Logs are created in a private directory with `0600` permissions and redact bearer tokens, JWTs, and common API-key formats.
- Updates require HTTPS GitHub hosts, `SHA256SUMS`, a matching `package.json` version, and a stale-aware process lock. Dev/git installs are excluded.

---

## Localization

Follows your OpenCode UI language (**English** / **Russian**), or can be overridden manually (`Auto` / `EN` / `RU`) in **Settings → Behavior & language** (Desktop) or TUI settings.

---

## Development

```sh
npm install
npm test          # core + server unit tests
npm run build     # typecheck server/TUI/GUI and rebuild dist/gui-experimental.cjs
```

### Project architecture

```text
src/
  index.ts              Server plugin: RPC endpoints, disk/memory cache, reset-aligned timers
  rpc.ts                Portable RPC contract (status, getPrefs/setPrefs, updates, events)
  gui.tsx               Desktop GUI entrypoint (SolidJS + OpenCode GUI SDK)
  tui.tsx               TUI entrypoint

  core/                 Pure domain logic
    types.ts            Types, window risk ranking, error text
    format.ts           Dates, durations, usage parsing, error labels
    pace.ts             Snapshot ring buffer, pace, verdicts, sparkline data
    alerts.ts           Threshold, reset recovery, fast-burn detectors
    stats.ts            Provider spend & top-model aggregation
    summary.ts          TUI sidebar & detail formatter
    utils.ts            Secret redaction, retry, semver

  server/               Node / IO layer
    api.ts              OpenCode Go HTTP client with Retry-After
    auth.ts             Multi-source credential discovery
    updater.ts          Checksum-verified GitHub updater with dev-install guard
    log.ts              Private rotating JSON logger

  gui/                  Desktop GUI modules
  tui/                  Terminal UI modules

dist/
  gui-experimental.cjs  Prebuilt CommonJS Desktop GUI bundle
```

---

## License

[MIT](LICENSE)
