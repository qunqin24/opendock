[![GitHub Actions CI Status](https://github.com/christiangalsterer/opencode-requesty-plugin/actions/workflows/ci.yaml/badge.svg)](https://github.com/christiangalsterer/opencode-requesty-plugin/actions/workflows/ci.yaml)
[![codecov](https://codecov.io/gh/christiangalsterer/opencode-requesty-plugin/graph/badge.svg?token=Q4POJZ46LC)](https://codecov.io/gh/christiangalsterer/opencode-requesty-plugin)
[![Coveralls](https://coveralls.io/repos/github/christiangalsterer/opencode-requesty-plugin/badge.svg?branch=main)](https://coveralls.io/github/christiangalsterer/opencode-requesty-plugin?branch=main)
[![Known Vulnerabilities](https://snyk.io/test/github/christiangalsterer/opencode-requesty-plugin/badge.svg)](https://github.com/christiangalsterer/opencode-requesty-plugin/security/advisories)
[![Socket Badge](https://badge.socket.dev/npm/package/@christiangalsterer/opencode-requesty-plugin)](https://socket.dev/npm/package/@christiangalsterer/opencode-requesty-plugin)
[![renovate](https://img.shields.io/badge/renovate-enabled-brightgreen.svg)](https://developer.mend.io/github/christiangalsterer/opencode-requesty-plugin)
[![npm downloads](https://img.shields.io/npm/dt/@christiangalsterer/opencode-requesty-plugin.svg)](https://www.npmjs.com/package/@christiangalsterer/opencode-requesty-plugin)
[![npm version](https://img.shields.io/npm/v/@christiangalsterer/opencode-requesty-plugin.svg)](https://www.npmjs.com/package/@christiangalsterer/opencode-requesty-plugin?activeTab=versions)
[![npm license](https://img.shields.io/npm/l/@christiangalsterer/opencode-requesty-plugin.svg)](https://www.npmjs.com/package/@christiangalsterer/opencode-requesty-plugin)
[![semver](https://img.shields.io/badge/semver-2.0.0-green)](https://semver.org)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://conventionalcommits.org)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)
![github stars](https://img.shields.io/github/stars/christiangalsterer/opencode-requesty-plugin.svg)

# opencode-requesty-plugin

An [opencode](https://opencode.ai) TUI plugin that shows your [Requesty.ai](https://www.requesty.ai) budget, current monthly spend, and per-model cost distribution right in the session prompt, in the session sidebar, plus a detail dialog via the `/requesty` slash command.

## Features

The plugin surfaces your Requesty.ai budget and usage in three places, each optimized for the space it occupies: a compact sidebar, a full detail dialog, and a minimal prompt-area readout.

### Sidebar widget

![Sidebar widget](docs/images/sidebar.png)

The sidebar gives a quick, at-a-glance view of your current month's Requesty usage:

- Monthly spend and monthly limit, pulled from `GET /v1/manage/apikey/self`
- A color-coded progress bar that turns yellow/red at configurable thresholds
- Projected month-end spend at the current run rate (`~$X EOM`), with a pace marker: ↑ over pace, → on pace, ↓ under pace
- Daily spend trend: today · daily average · 7-day average · 30-day average
- Optional input/output token breakdown for each spend metric (`sidebar.showTokens`)
- API key name in the header, linking to the Requesty analytics dashboard filtered by that key
- Top models for the current month (up to `sidebar.maxModels`), each with spend, total tokens, and input (↑) / output (↓) breakdown; click the header to collapse or expand the list
- Session cost for the current session: today's spend and spend since the session started (from the session's creation timestamp, falling back to a rolling 90-day window when unavailable), each with request count and token breakdown; click the header to collapse or expand (`sidebar.showSessionInfo`). Shows a "loading…" placeholder until the active session's data has been fetched, so it never displays an incorrect zero while loading.

You can disable the sidebar entirely with `"sidebar": { "enabled": false }`.

### Prompt indicator

![Prompt indicator](docs/images/session-prompt.png)

A compact readout on the right side of the session prompt shows:

- Today's spend
- Spend vs. limit with percentage and API key name, colored by the same thresholds as the sidebar
- Optional month-end projection (`~$X EOM ↑`) when `prompt.monthlyProjection` is enabled

Disable the readout with `"prompt": { "budgetIndicator": false }`.


### Detail dialog

![Detail dialog](docs/images/dialog.png)

Open the dialog with `/requesty` from the command palette for the full breakdown:

- KPI row: spent, limit, remaining, End of Month projection with a colored pace arrow, and last month's spend with a colored trend chevron
- *Budget Overview* card: wide progress bar, budget-health badge, days-to-exhaustion estimate based on your 7-day average, and today/daily avg/7d/30d averages
- *Model Breakdown (Current Month)* card: per-model table with spend, share of total spend, tokens, request count, and output/input ratio

Data comes from the [Requesty Management API](https://docs.requesty.ai/api-reference/management-apis) (`apikey/self` + `apikey/self/usage` grouped by `model_used`, current calendar month).

## Installation

Add the plugin to your `tui.json` (project root or `~/.config/opencode/tui.json`). Update the version number to the latest release.

```json
{
  $schema": "https://opencode.ai/tui.json",
  "plugin": ["@christiangalsterer/opencode-requesty-plugin@1.0.0"]
}
```

Or with options:

```json
{
  $schema": "https://opencode.ai/tui.json",
  "plugin": [
    [
      "@christiangalsterer/opencode-requesty-plugin@1.0.0",
      {
        "refreshIntervalMs": 300000,
        "warningThreshold": 0.6,
        "errorThreshold": 0.85
        "sidebar": {
          "enabled": true,
          "maxModels": 5,
          "showTokens": true,
          "order": 50
        }
      }
    ]
  ]
}
```

Plugin options must be the second item in the nested plugin entry. The same format is used for local plugins; use the generated `dist/tui.tsx` file as the plugin path:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": [
    [
      "/absolute/path/to/opencode-requesty-sidebar-plugin/dist/tui.tsx",
      {
        "sidebar": { "showKeyName": true },
        "prompt": { "showKeyName": true },
        "dialog": { "showKeyName": true }
      }
    ]
  ]
}
```

Restart opencode after changing the config — plugins are loaded at startup.

### Local development install

Point at a local checkout instead:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": [
    [
      "file:///absolute/path/to/opencode-requesty-plugin/dist/tui.tsx",
      {
        "sidebar": { "showKeyName": true },
        "prompt": { "showKeyName": true },
        "dialog": { "showKeyName": true }
      }
    ]
  ]
}
```

Run `bun install && bun run build` in the checkout first.

## Update

OpenCode does not currently support plugin updates reliably. See OpenCode PRs #35777, #32822, and #37300. To force OpenCode to download the configured plugin versions, clear its plugin cache:

```shell
rm -rf ~/.cache/opencode/packages/@christiangalsterer/opencode-requesty-plugin*
```

## API key detection

The plugin reads your Requesty API key from the opencode provider config: `provider.requesty.options.apiKey` in `opencode.json`, including `{env:VAR}` interpolation.

```json
{
  "provider": {
    "requesty": {
      "options": { "apiKey": "sk-..." }
    }
  }
}
```

Or via an environment variable:

```json
{
  "provider": {
    "requesty": {
      "options": { "apiKey": "{env:REQUESTY_API_KEY}" }
    }
  }
}
```

If no key is found, the widget shows a short setup hint instead of failing.

## Configuration

### Configuration options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `refreshIntervalMs`       | number  | `300000` (5 min)             | Periodic refresh interval (safety net) |
| `warningThreshold`        | number  | `0.7` (70%)                  | Budget usage ratio at which the bar turns yellow (accepts 0–1 or 0–100) |
| `errorThreshold`          | number  | `0.9` (90%)                  | Budget usage ratio at which the bar turns red (accepts 0–1 or 0–100) |
| `sidebar.enabled`         | boolean | `true`                       | Show the sidebar widget |
| `sidebar.maxModels`       | number  | `5`                          | Number of models shown in the compact sidebar list |
| `sidebar.showTokens`      | boolean | `true`                       | Show input/output token breakdown alongside spend in the sidebar averages block |
| `sidebar.showKeyName`      | boolean | `false`                      | Show the API key nickname in the sidebar header |
| `sidebar.showSessionInfo`  | boolean | `true`                       | Show the per-session cost collapsible section (today + since session start) |
| `sidebar.order`           | number  | `50`                         | Slot order for the sidebar widget; lower numbers appear first |
| `prompt.enabled`          | boolean | `true`                       | Show the prompt widget |
| `prompt.budgetIndicator`  | boolean | `true`                       | Show spend/limit readout on the right side of the session prompt |
| `prompt.todaySpend`       | boolean | `true`                       | Show today's spend (`T $X`) in the session prompt averages block |
| `prompt.dailyAvg`         | boolean | `false`                      | Show the current month's daily average (`D $X`) in the prompt averages block |
| `prompt."7dAvg"`          | boolean | `false`                      | Show the 7-day average (`7d $X`) in the prompt averages block |
| `prompt."30dAvg"`         | boolean | `false`                      | Show the 30-day average (`30d $X`) in the prompt averages block |
| `prompt.showTokens`       | boolean | `true`                       | Show today's input/output token breakdown (`↑X↓Y`) next to today's spend in the session prompt |
| `prompt.showKeyName`      | boolean | `false`                      | Show the API key nickname in the session prompt readout |
| `prompt.monthlyProjection`| boolean | `true`                       | Show a month-end projection (`~$X EOM ↑`) in the session prompt, red when the estimated spend exceeds the budget |
| `prompt.order`            | number  | `50`                         | Slot order for the prompt indicator; lower numbers appear first |
| `dialog.showKeyName`      | boolean | `false`                      | Show the API key nickname in the detail dialog title |

`warningThreshold` must be lower than `errorThreshold`; if the ordering is invalid, both fall back to the defaults (70%/90%). Values above `1` are treated as percents, e.g. `80` means 80%.

### Using Requesty with multiple API keys

If you utilize different API keys for various projects, it is highly recommended to enable `showKeyName` in your configuration. This allows you to easily identify which Requesty API key is currently active in the sidebar, session prompt, and detail dialog.

Example for enabling key identification:

```json
{
  "sidebar": { "showKeyName": true },
  "prompt": { "showKeyName": true },
  "dialog": { "showKeyName": true }
}
```

### Complete configuration example

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": [
    [
      "@christiangalsterer/opencode-requesty-plugin",
      {
        "refreshIntervalMs": 300000,
        "warningThreshold": 0.7,
        "errorThreshold": 0.9,
        "sidebar": {
          "enabled": true,
          "maxModels": 5,
          "showTokens": true,
          "showKeyName": true,
          "order": 50
        },
        "prompt": {
          "enabled": true,
          "budgetIndicator": true,
          "todaySpend": true,
          "dailyAvg": false,
          "7dAvg": false,
          "30dAvg": false,
          "showTokens": true,
          "showKeyName": true,
          "monthlyProjection": true,
          "order": 50
        },
        "dialog": {
          "showKeyName": true
        }
      }
    ]
  ]
}
```

Data is refreshed on startup, on a configurable periodic interval, when a new session is created, and when messages are updated.

## Metrics

All amounts are in USD and dates are evaluated in UTC.

- **Today** — spend and tokens for the current calendar day.
- **Daily avg** — current month's total spend and tokens divided by the number of days elapsed so far this month.
- **7d avg** — average spend and tokens over the previous 7 completed calendar days (excluding today). Days without usage count as `$0` / `0` tokens. Uses a rolling window to ensure accuracy across month boundaries.
- **30d avg** — average spend and tokens over the previous 30 completed calendar days (excluding today). Days without usage count as `$0` / `0` tokens. Uses a rolling window to ensure accuracy across month boundaries.
- **End of Month projection** — current spend projected forward at the current daily run rate through the end of the month.
- **Session cost** — spend, request count, and tokens for the currently active opencode session: **Today** and **Since <session start date>**. The window starts at the session's creation timestamp; if that is unavailable it falls back to the last 90 days. Attribution uses Requesty's `extra.X-Session-Affinity` metadata, so values are exact per session (not estimates). While a session's data is still loading the section shows a "…" placeholder rather than a misleading zero.

## Requirements

- opencode ≥ 1.18 (TUI plugin API with slots)
- A Requesty API key — create one at [app.requesty.ai/api-keys](https://app.requesty.ai/api-keys)

## Development

```bash
bun install
bun run format:fix
bun run typecheck
bun run test
bun run build
```

The project is fully typed TypeScript (`strict` mode). Sources live in `src/` (`.ts`/`.tsx`), tests in `test/`. The opencode host transforms TSX at load time via `@opentui/solid/preload` (Bun); no bundler is used.

## License

MIT
