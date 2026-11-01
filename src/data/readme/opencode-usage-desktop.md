# opencode-usage-desktop

[![npm](https://img.shields.io/npm/v/opencode-usage-desktop.svg)](https://www.npmjs.com/package/opencode-usage-desktop)
[![GitHub release](https://img.shields.io/github/v/release/sthsmall/opencode-usage-desktop.svg)](https://github.com/sthsmall/opencode-usage-desktop/releases)

English | [简体中文](https://github.com/sthsmall/opencode-usage-desktop/blob/main/README.zh-CN.md)

Usage, quota, TPS/TTFT and session statistics for OpenCode Desktop. It covers the OpenChamber usage / live TPS ideas and adds settings, notifications and a full stats dialog.

## Features

- Pinned **Usage** tab in the session sidebar, without taking space above the composer
- 5h / 1w / 1mo quota with **used / remaining** toggle
- Quota **pace**: a marker on the bar shows elapsed window time, with `on pace`, `x% under pace`, `x% over pace`
- Threshold colors: 50% warning and 80% danger by default, configurable in settings
- **TTFT / TPS** cards for the current turn and a global average
- **15m / 24h / 30d** performance card:
  - `15m`: real-time TPS in the top-left plus a 15-minute chart, one bar per minute
  - `24h`: hourly TPS and TTFT history for the current session
  - `30d`: daily TPS and TTFT history for the current session
- Session cards: cost, tokens, cache read/write, cache hit, context fill, reasoning share and cost per 1M tokens
- Stats dialog:
  - 7d / 30d / 90d / all ranges
  - token activity, token mix, efficiency, top models
  - project scope: all projects or the current project
  - per-tool detail on demand
  - TPS / TTFT bars for the current session
- Commands:
  - `Usage: open details`
  - `Usage: open stats`
  - `Usage: refresh`
  - `Usage: copy performance metrics`
- Settings page: display mode, thresholds, live TPS card and quota notifications
- Desktop notification when a quota crosses the danger threshold

## Install

### npm

```sh
opencode plugin add opencode-usage-desktop
```

Or add it to the global `~/.config/opencode/opencode.json`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-usage-desktop"]
}
```

### GitHub

```sh
opencode plugin add github:sthsmall/opencode-usage-desktop
```

Or:

```jsonc
{
  "plugins": ["github:sthsmall/opencode-usage-desktop"]
}
```

The repository commits `dist/`, so a GitHub install does not need a local build.

### Local development

```jsonc
{
  "plugins": ["/absolute/path/to/opencode-usage-desktop"]
}
```

On Windows, use a path such as `D:\\work\\opencode-usage-desktop`.

After changing the config, restart OpenCode Desktop, or open **Settings → Extensions → Plugins** and press **Reload**. The pinned **Usage** tab appears in the session sidebar.

### Requirements

- OpenCode Desktop 2.2.x (the GUI plugin API is still experimental)
- OpenCode Go / Zen sign-in for quota data; TPS, TTFT and session stats work without it
- The plugin is read-only: it does not modify sessions, messages or prompts

## Data and algorithms

### Quota

- **Go plan**: the server part reads the active `opencode-go` integration and calls
  `https://opencode.ai/zen/go/v1/usage`. Credentials stay in the server process.
- **Console budgets**: when the active integration is `opencode`, the plugin reads `data.location.usage.limits()`.
- The GUI calls the RPC through the current session's server client and location, so remote servers and workspace switches do not read the wrong directory.
- **Pace**: estimated from `resetsAt - window length`; the marker is elapsed time. `under pace` means usage is slower than time, `over pace` means it may run out early. Monthly uses 30 days as an estimate; the server's `resetsAt` is authoritative.

### TTFT

- Current turn: `session.step.started.started` to the first `session.text`, `session.reasoning` or `session.tool` event.
- Historical reasoning/tool-first responses use the first reasoning/tool part timestamp.
- Text-first historical responses have no first-token timestamp, so TTFT shows `—`.
- Timestamps come from events, not from message completion times.

### TPS

- Current turn: character deltas are estimated as `chars / 4`, corrected by a per-model factor learned from finished steps (0.25–4×).
- When a step ends, provider-reported `output + reasoning` tokens replace the estimate and the value is labelled `measured`.
- The denominator is net generation time between deltas; gaps longer than 1 second (thinking, tools, waiting) are excluded.
- Global TPS: weighted average of the last 20 responses after the last completed compaction.
- `time.streamed` is the end of the provider stream, not the first token, so TTFT is calculated separately.

### 15-minute chart

- The live chart covers the last **15 minutes** with 15 bars, one minute per bar.
- Empty bars mean no tokens were generated in that minute: the model was thinking, calling tools or waiting.
- The top-left value is real-time TPS while generating, or the last turn's average while idle.
- If there are no turns, the card shows `No turns yet` instead of an empty chart.

### Stats TPS / TTFT

- Data comes from the current session's assistant messages.
- Two time spans:
  - `24h`: the last 24 hours, one bar per hour
  - current Stats range (`7d / 30d / 90d / all`): one bar per calendar day; ranges over 92 days group by week
- Empty periods keep a 1px baseline, so the chart has a real time axis.
- Shows `avg / p50 / p95 / n` for TPS and TTFT.
- `TPS = (output + reasoning tokens) / (streamed - first output)`. Historical values include tool/thinking time in the denominator and can be lower than live TPS.
- `TTFT = first reasoning/tool time - message.time.created`. Text-only history has no timestamp.
- If older messages of the current session are not loaded, `Load older` fetches one more page.
- The aggregate stats endpoint only exposes token/cost/activity, not per-response timing, so these charts are **current-session** only.

### Token activity

- The stats Activity chart uses **tokens**, not steps.
- Total tokens = `input + output + reasoning + cache.read + cache.write`. Cache-heavy days can look very large.
- Days without activity keep a baseline; ranges over 92 days group by week.
- Because `experimental.session.stats` only returns daily steps, the chart requests one stats range per day/week with `tools: "none"` and sums tokens.
- Results are cached for 60 seconds. The 30d/90d views may show a short `Loading token activity…` state.

### Session metrics

- **Cache hit**: `cache.read / (input + cache.read + cache.write)`
- **Context**: last assistant message with tokens divided by the model context limit; after compaction it shows `—` until the next response
- **Reasoning share**: `reasoning / (output + reasoning)`
- **Cost / 1M**: `cost / total tokens × 1,000,000`; Go subscriptions often show `$0`

### Stats dialog

Uses `experimental.session.stats` with 7d / 30d / 90d / all ranges and shows prompts, steps, sessions, active days, tokens, cost, cache hit, cost per 1M, reasoning share, tool success, subagents, streak, top models and token activity.

Additional sections:

- **Project scope**: `All projects` or the current project; the cache key includes the project
- **Token mix**: stacked input / output / cache read / cache write shares
- **Efficiency**: average cost, tokens and steps per session
- **Tool detail**: loads `tools: "detail"` on demand with calls, success rate, failed, unfinished and p50 duration
- **Token activity**: per-day or per-week token totals with a real calendar axis

## Commands

| Command | What it does |
| --- | --- |
| `Usage: open details` | Opens the pinned Usage panel |
| `Usage: open stats` | Opens the stats dialog |
| `Usage: refresh` | Refreshes quota and usage data |
| `Usage: copy performance metrics` | Copies the current performance snapshot as JSON |

## Build

```sh
npm install
npm run typecheck
npm run build
```

Outputs:

- `dist/index.js`: server plugin entry
- `dist/rpc.js`: shared RPC definition
- `dist/gui-experimental.cjs`: Desktop GUI bundle

## Uninstall

```sh
opencode plugin remove opencode-usage-desktop
```

Or remove the entry from the `plugins` array in the global `opencode.json`.

## Structure

```text
src/
├── index.ts    server plugin: registers RPC, reads OpenCode Go credentials and requests the usage endpoint
├── rpc.ts      shared RPC definition (JSON Schema)
├── metrics.ts  event-driven live TPS/TTFT/sparkline engine with per-model calibration
└── gui.tsx     GUI: sidebar panel, settings page, stats dialog, commands
```

## Known limits

- Quota support covers OpenCode Go / Console; custom providers such as `mi` are not included.
- The GUI plugin API is experimental in OpenCode 2.2.x and may need adaptation after a major upgrade.
- Live TPS is a character estimate until a step finishes; provider-reported tokens then replace it and mark it `measured`.
- Historical text-first responses have no TTFT timestamp and show `—`.
- Stats TPS/TTFT charts are current-session only because the aggregate stats endpoint does not return per-response timing.
- `cost` is often `$0` for Go subscriptions.

## License

MIT
