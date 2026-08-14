# opencode-quota-sidebar

[![npm version](https://img.shields.io/npm/v/@leo000001/opencode-quota-sidebar.svg)](https://www.npmjs.com/package/@leo000001/opencode-quota-sidebar)
[![license](https://img.shields.io/npm/l/@leo000001/opencode-quota-sidebar.svg)](https://github.com/xihuai18/opencode-quota-sidebar/blob/main/LICENSE)

[简体中文](./README.zh-CN.md)

OpenCode plugin that shows token usage and provider quota in the TUI sidebar, while keeping the shared session title compact and readable across Desktop, Web, and TUI.

![Example sidebar title with usage and quota](./assets/OpenCode-Quota-Sidebar.png)

The screenshot above comes from [`./assets/OpenCode-Quota-Sidebar.png`](./assets/OpenCode-Quota-Sidebar.png) and shows the actual TUI sidebar layout this plugin renders.

## What It Does

- Renders dedicated `TITLE`, `USAGE`, and `QUOTA` blocks in the TUI sidebar
- Keeps the shared `session.title` on a compact single line instead of pushing multiline telemetry into every client
- Aggregates usage for `session`, `day`, `week`, and `month`
- Supports provider quota/balance fetchers for OpenAI, Copilot, Anthropic, Kimi, Zhipu, MiniMax, and RightCode
- Can include descendant subagent sessions in session-scoped usage/quota totals
- Exposes `quota_summary` and `quota_show` tools for reports and title toggling

## Architecture Overview

This repository is a pure plugin implementation. It does not modify OpenCode core.

- Server layer: aggregates usage, fetches quota snapshots, stores state, manages title refresh, and exposes tools
- TUI layer: renders the sidebar panel UI and reads persisted sidebar-panel payloads
- Persistence layer: stores global state plus day-partitioned session chunks so historical sessions can render without full rescans
- Provider adapter layer: maps each provider to a common `QuotaSnapshot` shape through a registry of adapters

The implementation is built on top of `@opencode-ai/plugin` and `@opencode-ai/sdk`.

## How It Works

This plugin has two display layers:

- TUI sidebar panel: renders structured `TITLE`, `USAGE`, and `QUOTA` blocks
- Shared session title: stays compact so Desktop, Web, and TUI can all read the same title cleanly

In `sidebar.titleMode="auto"`, the shared title remains a compact single line. The richer multiline layout is handled by the dedicated TUI plugin instead of being written into `session.title` for every client.

Session-scoped aggregation can include descendant subagent sessions when `sidebar.includeChildren=true`. Day/week/month summaries do not merge descendants.

## Supported Providers

Built-in quota adapters:

| Provider            | Endpoint family                                            | Auth    | Quota shape                | Notes                                                                                                                            |
| ------------------- | ---------------------------------------------------------- | ------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| OpenAI Codex        | `chatgpt.com/backend-api/wham/usage`                       | OAuth   | Multi-window subscription  | Reads ChatGPT usage windows such as short-term + weekly; Pro plans may also expose Codex Spark limits (`additional_rate_limits`) |
| GitHub Copilot      | `api.github.com/copilot_internal/user`                     | OAuth   | Monthly subscription       | Uses the Copilot internal user endpoint                                                                                          |
| Anthropic           | `api.anthropic.com/api/oauth/usage`                        | OAuth   | Multi-window subscription  | Supports plan-based usage windows                                                                                                |
| Kimi For Coding     | `api.kimi.com/coding/v1/usages`                            | API key | Multi-window subscription  | Typically `5h` + weekly windows                                                                                                  |
| Zhipu Coding Plan   | `bigmodel.cn/api/monitor/usage/quota/limit`                | API key | Token quota                | Coding-plan style quota window                                                                                                   |
| MiniMax Coding Plan | `www.minimaxi.com/v1/api/openplatform/coding_plan/remains` | API key | Multi-window subscription  | Typically `5h` + weekly windows                                                                                                  |
| RightCode           | `www.right.codes/account/summary`                          | API key | Daily quota and/or balance | Prefix-based subscription matching, with balance fallback                                                                        |

Generic providers without a built-in quota endpoint can still contribute usage totals, but they will not show quota/balance unless an adapter exists.

Provider notes:

- OpenAI, Copilot, and Anthropic quota support is based on OAuth/session auth, not generic API-key billing endpoints
- **OpenAI Codex Spark**: OpenAI Pro subscriptions may expose additional per-feature windows (e.g. `GPT-5.3-Codex-Spark`) in the `additional_rate_limits` field of the `wham/usage` response. When present, the plugin automatically parses and renders these as extra windows under the OpenAI quota line. No extra config is required. Code review quota (`code_review_rate_limit`) is not displayed yet.
- RightCode can show both a daily allowance line and a balance line
- Copilot quota is supported, but API-equivalent cost is intentionally not shown because runtime pricing is not reliable enough

## Display Rules

- Sidebar quota lines show providers actually used in the current session and recognized by an adapter
- `quota_summary` fetches default quota providers even if they were not used in the current session
- The TUI sidebar reads persisted `sidebarPanel` / usage state first, so historical sessions can render quickly on open or resume
- Compact-title quota parsing is only a fallback path; the TUI panel prefers persisted structured data
- `quota_show` toggles title decoration on or off, but the TUI panel remains the main rich display path

## Install

OpenCode loads the server plugin from `opencode.json` and the TUI plugin from `tui.json`.

`opencode.json`

```json
{
  "plugin": ["@leo000001/opencode-quota-sidebar@latest"]
}
```

`tui.json`

```json
{
  "plugin": ["@leo000001/opencode-quota-sidebar@latest"]
}
```

For OpenCode `>=1.2.15`, keep server plugins in `opencode.json` and TUI plugins in `tui.json`.

## Sidebar Demo

Typical TUI sidebar layout (with Codex Spark windows):

```text
TITLE
  Fix quota adapter matching
USAGE
  R184 I189k O53.2k
  CR31.4k CW3.2k Cd66%
  API $12.8
QUOTA
  OAI 5h80 R3h20m
      W70 R2D04h
      Sk5h100 R1h00m
      SkW100 R3D04h
  Cop M78 R12D00h
  RC D$88.9/$60 E6D00h
     B260
```

Compact shared title example:

```text
Fix quota adapter matching | OAI 5h80 R3h20m W70 R2D04h | RC D$88.9/$60 B260 | Cd66% | API$12.8
```

## Pricing And API Cost

`API cost` is an API-equivalent estimate. It is not your subscription fee, not a provider invoice, and not necessarily what the upstream service actually billed.

Pricing source priority:

1. explicit model prices from your OpenCode main config (`opencode.jsonc` / `opencode.json`)
2. fast/tier prices derived from those explicit base-model prices
3. non-zero runtime prices from `provider.list()`
4. fast/tier prices derived from runtime metadata
5. `models.dev` remote model catalog pricing
6. bundled fallback pricing shipped by this plugin

Important notes:

- OpenAI / Anthropic OAuth runtime metadata often reports `cost: 0`, so runtime pricing is only a supplemental source
- `provider.list()` is a runtime metadata view of the models OpenCode currently exposes; it is useful when non-zero, but it is not a stable authoritative pricing API
- OpenCode main-config pricing layers merge field-by-field, so a later override can replace only `input` / `output` without discarding earlier `cache_*` or `context_over_200k` fields
- `models.dev` is used as a structured remote supplement only for runtime-discovered models that are still missing prices after config, runtime, and bundled sources are considered; this mainly helps newer models that are not in the plugin's bundled table yet
- if `models.dev` is unreachable, the plugin falls back to the higher-priority sources above; API cost may remain `0` for uncovered models until pricing becomes available again
- bundled pricing covers common models, so token usage and quota features do not require manual pricing config
- if you use a new or not-yet-bundled model and runtime pricing is still zero, `API cost` may stay `$0.00` until you add an explicit model price override in your OpenCode main config

To get complete `API cost` coverage for new models, at least one of these must be true:

1. the model already exists in the plugin's bundled pricing table
2. you configured that model's price in OpenCode main config
3. runtime `provider.list()` returns a non-zero price for it
4. runtime `provider.list()` exposes the model and `models.dev` has pricing for it

## Tool Report Demo

Example historical `quota_summary` markdown output shape:

```md
## Quota History - Daily since 2026-02-18

### Quota Status

- OpenAI: 5h | 80.0% | reset 3h20m; Weekly | 70.0% | reset 2D04h
- Copilot: Monthly | 78.0% | reset 12D00h
- RightCode: Daily $88.9/$60 | reset 6D00h

### Totals

| Metric       | Total | Avg/Period |
| ------------ | ----: | ---------: |
| Requests     |   184 |       26.3 |
| Total Tokens |  277k |      39.6k |
| Cache Hit    | 63.1% |      58.4% |
| API Cost     | $12.8 |      $1.83 |

### Provider Breakdown

| Provider  | Req | Input | Output | Total | Share | Cache Hit | API Cost |
| --------- | --: | ----: | -----: | ----: | ----: | --------: | -------: |
| OpenAI    | 140 |  160k |    61k |  221k | 79.8% |     66.2% |    $10.4 |
| Anthropic |  44 |   29k |  27.1k | 56.1k | 20.2% |     51.3% |    $2.34 |

### Period Detail

| Period       | Requests | Input | Output | Cache | Cache Hit | Total | API Cost |
| ------------ | -------: | ----: | -----: | ----: | --------: | ----: | -------: |
| 2026-02-18   |       12 | 18.3k |   4.2k |  8.9k |     32.7% | 31.4k |    $1.12 |
| 2026-02-24\* |       17 |  8.1k |   2.0k |  3.4k |     66.0% | 13.5k |    $0.88 |
```

The tool already returns full markdown. Clients should display that report directly instead of replacing it with a short summary.

Sidebar output uses compact tokens. Toasts and markdown reports keep fuller human-readable wording.

## Why The TUI Panel Exists

OpenCode renders the sidebar title as plain text inside a single styled title field. That means the shared title is great for compact telemetry, but not ideal for a rich multi-section layout.

This plugin therefore uses:

- shared compact titles for cross-client compatibility
- a dedicated TUI sidebar panel for the detailed block layout

That split avoids polluting Desktop/Web titles while still giving TUI users a readable quota dashboard.

## Abbreviations

Usage tokens:

- `R`: requests
- `I`: input tokens
- `O`: output tokens, including reasoning tokens
- `CR`: cache read tokens
- `CW`: cache write tokens
- `Cd`: cached ratio / cache coverage
- `API`: API-equivalent cost estimate

Quota tokens:

- `OAI`: OpenAI
- `Cop`: GitHub Copilot
- `Ant`: Anthropic
- `RC`: RightCode
- `B`: balance
- `D`: daily window
- `W`: weekly window
- `M`: monthly window
- `Sk5h`: OpenAI Codex Spark short window (e.g. 5h)
- `SkW`: OpenAI Codex Spark weekly window
- `R3h20m`: resets in `3h20m`
- `R2D04h`: resets in `2D04h`
- `E6D00h`: expires in `6D00h`

Example compact quota fragments:

- `OAI 5h80 R3h20m`: OpenAI short window, 80% remaining, resets in `3h20m`
- `OAI Sk5h100 R1h00m`: OpenAI Codex Spark 5h window, 100% remaining, resets in `1h00m`
- `OAI SkW100 R3D04h`: OpenAI Codex Spark weekly window, 100% remaining, resets in `3D04h`
- `Cop M78 R12D00h`: Copilot monthly quota, 78% remaining, resets in `12D00h`
- `RC D$88.9/$60 E6D00h B260`: RightCode daily quota plus balance

## Config

Recommended config file locations:

- `~/.config/opencode/quota-sidebar.config.json`
- `<worktree>/quota-sidebar.config.json`
- `<directory>/quota-sidebar.config.json`
- `<worktree>/.opencode/quota-sidebar.config.json`
- `<directory>/.opencode/quota-sidebar.config.json`
- `OPENCODE_QUOTA_CONFIG=/absolute/path/to/config.json`

Minimal example:

```json
{
  "sidebar": {
    "enabled": true,
    "titleMode": "auto",
    "showCost": true,
    "showQuota": true,
    "includeChildren": true
  }
}
```

See [`quota-sidebar.config.example.json`](./quota-sidebar.config.example.json) for a fuller config example.

Important config notes:

- `sidebar.titleMode`: `auto`, `compact`, or `multiline`
- `sidebar.showCost`: controls API-equivalent cost in sidebar, title, markdown report, toast, and CLI output
- `sidebar.wrapQuotaLines`: wraps long quota lines with indentation instead of dropping fields
- `sidebar.includeChildren`: includes descendant subagent sessions for `period=session`
  Config is layered. The later source overrides the earlier one:

1. global config
2. worktree config
3. directory config
4. worktree `.opencode` config
5. directory `.opencode` config
6. `OPENCODE_QUOTA_CONFIG`

OpenCode main pricing config candidates are read from these locations:

1. `~/.config/opencode/opencode.jsonc`
2. `~/.config/opencode/opencode.json`
3. `<worktree>/opencode.jsonc`
4. `<worktree>/opencode.json`
5. `<directory>/opencode.jsonc`
6. `<directory>/opencode.json`
7. `<worktree>/.opencode/opencode.jsonc`
8. `<worktree>/.opencode/opencode.json`
9. `<directory>/.opencode/opencode.jsonc`
10. `<directory>/.opencode/opencode.json`

## Linux CLI Notes

- `opencode-quota` will auto-start a temporary `opencode serve` when no local server is already reachable
- recent releases clean up that temporary server more aggressively on Linux/Unix so the CLI can exit normally after printing the report
- if the CLI still hangs on Linux, upgrade to a version that includes the server-process cleanup fix

## Persistence And Aggregation

The plugin stores:

- global state in `<opencode-data>/quota-sidebar.state.json`
- session chunks in `<opencode-data>/quota-sidebar-sessions/YYYY/MM/DD.json`

Those persisted chunks keep title state, cached usage, sidebar-panel payloads, and quota cache data. This lets the TUI sidebar render from stored structured state on session open/resume instead of depending entirely on live message scans.

Usage aggregation is incremental. The plugin tracks a cursor per session and processes only new messages when possible. If message history changes in a way that invalidates the incremental view, it can rescan and refresh persisted usage.

Pricing cache notes:

- newer releases persist a `pricingFingerprint` alongside cached session usage
- changing a model price from one non-zero value to another non-zero value now invalidates old cached API-cost totals automatically
- older plugin versions only keyed cache freshness on billing version, so historical session API-cost values could remain stale until a forced recompute
- legacy decorated titles that still contain `Est$...` are recognized during cleanup/restore, but newly rendered titles always use `API$...`

## Tools

- `quota_summary`: shows usage and quota for `session`, `day`, `week`, or `month`
- `quota_show`: toggles title decoration on or off

Behavior notes:

- `quota_summary` returns the full markdown report body
- `quota_summary` can show a toast in addition to returning markdown
- `quota_summary` accepts `period`, `since`, `last`, `toast`, and `includeChildren`
- `quota_summary(includeChildren=true)` only changes `period=session`
- `day/week/month` scans all sessions in the selected time range, so child sessions are included when they have activity in that range
- `day/week/month` does not do parent-tree rollup; child sessions are counted as independent sessions, not merged through `includeChildren`
- `since` and `last` are mutually exclusive
- `period=session` does not accept `since` or `last`
- `quota_show(enabled=true|false)` can explicitly force a state instead of toggling
- Historical reports support both absolute `since` and relative `last`
- `since` accepts `YYYY-MM` or `YYYY-MM-DD`
- `last` accepts a positive integer and is relative to the current period: `day=7`, `week=8`, `month=6`
- Empty `period=day|week|month` means the current natural day/week/month

Example command aliases:

For direct in-chat history output, define command aliases that call `quota_summary`.
The old TUI history popup path was removed; history now goes through the tool report directly.
These aliases are still OpenCode command templates, so they expand into prompt text before the model/tool chain runs. For the cleanest direct output path, prefer the standalone CLI.

Examples:

- `quota_summary(period=day)` -> today
- `quota_summary(period=week)` -> this week
- `quota_summary(period=month)` -> this month
- `quota_summary(period=day,last=7)` -> last 7 days
- `quota_summary(period=week,last=8)` -> last 8 weeks
- `quota_summary(period=month,last=6)` -> last 6 months
- `quota_summary(period=month,since=2026-01)` -> since Jan 2026

```json
{
  "command": {
    "qday": {
      "description": "Today / last N days / since date",
      "template": "Run /qday for opencode-quota-sidebar. Call tool quota_summary exactly once and return its full report directly. If `$ARGUMENTS` is empty: period=day, toast=true. If `$ARGUMENTS` is a positive integer: period=day, last=<that integer>, toast=true. If `$ARGUMENTS` matches YYYY-MM-DD: period=day, since=<that date>, toast=true. Otherwise briefly explain: empty, positive integer, or YYYY-MM-DD."
    },
    "qweek": {
      "description": "This week / last N weeks / since date",
      "template": "Run /qweek for opencode-quota-sidebar. Call tool quota_summary exactly once and return its full report directly. If `$ARGUMENTS` is empty: period=week, toast=true. If `$ARGUMENTS` is a positive integer: period=week, last=<that integer>, toast=true. If `$ARGUMENTS` matches YYYY-MM-DD: period=week, since=<that date>, toast=true. Otherwise briefly explain: empty, positive integer, or YYYY-MM-DD."
    },
    "qmonth": {
      "description": "This month / last N months / since month",
      "template": "Run /qmonth for opencode-quota-sidebar. Call tool quota_summary exactly once and return its full report directly. If `$ARGUMENTS` is empty: period=month, toast=true. If `$ARGUMENTS` is a positive integer: period=month, last=<that integer>, toast=true. If `$ARGUMENTS` matches YYYY-MM: period=month, since=<that month>, toast=true. Otherwise briefly explain: empty, positive integer, or YYYY-MM."
    },
    "qtoggle": {
      "description": "Toggle sidebar usage display on/off",
      "template": "Call tool quota_show (no arguments, it toggles)."
    }
  }
}
```

## CLI

The package exposes a standalone CLI dashboard. After installing globally or making the `bin` available:

```bash
npm install -g @leo000001/opencode-quota-sidebar
```

If you prefer not to install globally, you can also run it with `npx @leo000001/opencode-quota-sidebar <args>`.

```bash
# Current period (single snapshot)
opencode-quota day          # today
opencode-quota week         # this week (Monday-based)
opencode-quota month        # this month

# Multi-period history
opencode-quota day 7        # last 7 days
opencode-quota week 8       # last 8 weeks
opencode-quota month 6      # last 6 months

# Absolute start date
opencode-quota day --since 2026-04-01
opencode-quota week --since 2026-04-01
opencode-quota month --since 2026-01

# Also accepted as positional (equivalent to --since)
opencode-quota day 2026-04-01
opencode-quota month 2026-01
```

When called without `last` or `--since`, the CLI renders a single-period snapshot (`QUOTA + TOTALS + PROVIDERS`). When called with `last` or `--since`, it renders multi-period history with a larger multi-line `TREND` block.

### CLI semantics

- `day` = current natural day; `week` = current natural week (Monday-based); `month` = current natural month
- A positional integer maps to `last=<N>` (number of periods back from now)
- A positional date string maps to `--since` (`YYYY-MM-DD` for day/week, `YYYY-MM` for month)
- `--since` and `--last` are mutually exclusive
- `last` is limited to 90 for day, reasonable ranges for week/month

### Trend section

The `TREND` block appears only in multi-period mode. Each metric (`Sessions`, `Requests`, `Tokens`, `Cached`, `API Cost`) is rendered as a small multi-line bar chart:

- one summary line: the current value only
- one bar row per visible period (latest 8 periods max), ordered oldest-to-newest
- the current period is marked with `*`

Interpretation example:

```text
Requests 12.3k
  04-08   | ███░░░░░░░░░░░░░░░ | 4.1k
  04-09   | ██████░░░░░░░░░░░░ | 8.2k
  04-10*  | █████████████░░░░░ | 12.3k
```

This means the current bucket has `12.3k` requests, and the bar rows below show the relative size of each visible bucket from oldest to newest.

### Connection behavior

- The CLI talks to the local OpenCode API at `http://localhost:4096` by default
- Set `OPENCODE_BASE_URL` to override (e.g. `http://192.168.1.10:4096`)
- If no server is running and `OPENCODE_BASE_URL` is not set, the CLI attempts to start one:
  - **Linux/macOS**: runs `opencode serve --hostname=127.0.0.1 --port=4096`
  - **Windows**: tries `opencode.cmd`, then `opencode` via `shell: true`, then `bash -lc opencode`
- The auto-start waits up to 10 seconds for the server to print `opencode server listening on <url>`
- If auto-start fails, check that `opencode` is in your `PATH`
- On Windows, the `shell: true` path is usually the most reliable when `opencode.cmd` is not directly spawnable from Node

### Platform notes

- **Terminal encoding**: the dashboard uses Unicode box-drawing and block elements (`█░`). Requires a UTF-8 capable terminal. Windows users should use Windows Terminal, PowerShell 7+, or a terminal that supports UTF-8. Classic cmd.exe with legacy codepages (CP437/CP850) may render garbled characters.
- **Alignment**: weekly/monthly trend labels can still be truncated when the visible label is very long (for example long absolute week ranges). This is a known presentation tradeoff in the current terminal renderer.
- **Windows PATH**: the CLI tries multiple command forms to find `opencode`. If none work, ensure `opencode` or `opencode.cmd` is on your PATH, or start the server manually and set `OPENCODE_BASE_URL`.
- **Node.js**: requires `>=18`

### Environment variables

| Variable                     | Default                   | Purpose                                                                          |
| ---------------------------- | ------------------------- | -------------------------------------------------------------------------------- |
| `OPENCODE_BASE_URL`          | `http://localhost:4096`   | OpenCode API endpoint; set this if the server is remote or on a non-default port |
| `OPENCODE_QUOTA_CONFIG_HOME` | `~/.config/opencode`      | Global config directory override                                                 |
| `OPENCODE_QUOTA_DATA_HOME`   | `~/.local/share/opencode` | Global data directory override                                                   |

## Development

```bash
npm install
npm run build
npm test
```

For local development, load:

- `file:///ABSOLUTE/PATH/opencode-quota-sidebar/dist/index.js` in `opencode.json`
- `file:///ABSOLUTE/PATH/opencode-quota-sidebar/dist/tui.tsx` in `tui.json`

On Windows, use forward slashes in `file:///` URLs.

## Compatibility And Caveats

- Node.js `>=18`
- OpenCode plugin SDK `@opencode-ai/plugin` / `@opencode-ai/sdk` `^1.3.5`
- For OpenCode `>=1.2.15`, TUI config belongs in `tui.json`
- The shared title is still one `session.title` value for all clients
- The plugin avoids ANSI styling in sidebar titles to keep resize behavior stable
- Some providers expose true quota windows, others only expose balance data

## Contributing

- Changelog: [CHANGELOG.md](./CHANGELOG.md)
- Adapter and architecture notes: [CONTRIBUTING.md](./CONTRIBUTING.md)
- Security policy: [SECURITY.md](./SECURITY.md)

## Documentation Navigation

- English README: [`README.md`](./README.md)
- Simplified Chinese README: [`README.zh-CN.md`](./README.zh-CN.md)
- Changelog: [`CHANGELOG.md`](./CHANGELOG.md)
- Contributing guide: [`CONTRIBUTING.md`](./CONTRIBUTING.md)
- Security policy: [`SECURITY.md`](./SECURITY.md)
