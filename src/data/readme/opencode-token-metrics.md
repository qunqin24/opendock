# opencode-token-metrics

[![npm version](https://img.shields.io/npm/v/opencode-token-metrics)](https://www.npmjs.com/package/opencode-token-metrics)

A live throughput meter for the [OpenCode](https://opencode.ai) TUI. It renders to the right of the session prompt as a VU-style time-series of generation speed, with average, peak, trend, and time-to-first-token.

```
tok/s ▃▆▇▇█▆▄ 42.0 ▲15% · avg 38.2 · pk 45.0 · ttft 0.8s
```

![opencode-token-metrics running in the OpenCode TUI](assets/demo.gif)

## What it looks like

The graph grows one column per second as the model streams, scaled to the turn's busiest second:

```
tok/s ▁ 18.0                                             first token
tok/s ▁▃▅ 33.0 ▲12%                                      ramping up
tok/s ▃▆▇▇█ 45.0 ▲18% · avg 41.2 · pk 45.0 · ttft 0.8s
tok/s ▃▆▇▇█▆▄ - · avg 41.2 · pk 45.0 · ttft 0.8s         tool call — average holds
tok/s ▃▆▇▇█▆▄█▆ 43.0 ▲2% · avg 41.0 · pk 45.0 · ttft 0.8s   resumed
tok/s ▃▆▇▇█▆▄█▆ 43.0 · avg 41.0 · pk 45.0 · ttft 0.8s        holds, scaled to exact tokens
tok/s idle                                               nothing running
```

The rate and trend are color-coded: red below `slowTps`, yellow up to `fastTps`, green at or above it.

- **VU meter** — one half-block column per second, growing as the turn progresses (no reserved empty space), scaled to the turn's busiest second
- **Average** — active generation speed: tokens per second over the time actually spent streaming, so tool pauses don't drag it down
- **Held frame** — when a turn ends the graph, rate, average, peak, and TTFT freeze and stay on screen until the next turn produces tokens
- **Exact totals** — on completion the graph and peak are rescaled to the provider's reported token count
- **Peak hold** — the fastest rate observed during the turn, never below the average
- **Trend** — up/down against the previous second, with percent
- **TTFT** — time from the assistant message being created to the first streamed token

## Install (humans)

One command:

```bash
opencode plugin opencode-token-metrics -g
```

This installs the package from npm and adds it to `~/.config/opencode/tui.json`. TUI plugins belong in `tui.json`, **not** `opencode.json`. Restart the TUI afterwards — plugins load at startup and are not hot-reloaded.

The package ships TypeScript source and is transpiled by OpenCode's own runtime, so there is no separate build step.

Manual setup:

```jsonc
// ~/.config/opencode/tui.json
{
  "plugin": ["opencode-token-metrics"]
}
```

Add options by using the tuple form:

```jsonc
{
  "plugin": [
    ["opencode-token-metrics", { "vuColumns": 20, "vuScale": "fixed", "vuFullTps": 80 }]
  ]
}
```

## Install (for AI agents)

If you are an agent installing this for a user, the full procedure is:

```text
GOAL: install opencode-token-metrics into the user's OpenCode TUI.

1. Run: opencode plugin opencode-token-metrics -g
2. This installs the npm package and adds "opencode-token-metrics" to the
   "plugin" array in ~/.config/opencode/tui.json.
3. If the installer is unavailable, add "opencode-token-metrics" to that
   "plugin" array by hand. Do NOT remove sibling entries. Do NOT add a version suffix.
4. TUI plugins go in tui.json, never opencode.json.
5. Tell the user to restart the TUI. Plugins load at startup; there is no hot reload.
6. Do not touch any other top-level key in tui.json.

Optionally pass options with the tuple form:
["opencode-token-metrics", { "alwaysShow": true }]
```

## Options

Pass options as the second element of the plugin tuple:

```jsonc
{
  "plugin": [
    ["opencode-token-metrics", { "vuColumns": 20, "showTtft": false }]
  ]
}
```

| Option | Default | Description |
| --- | --- | --- |
| `enabled` | `true` | Disable rendering without uninstalling |
| `rollingWindowMs` | `5000` | Averaging window for the live rate |
| `idleTimeoutMs` | `1500` | Silence after which the rate reads as inactive |
| `minSpanMs` | `300` | Floor on the elapsed span so early samples don't spike |
| `vuColumns` | `12` | Maximum seconds of history shown in the VU meter |
| `vuScale` | `"auto"` | `auto` scales columns to the turn peak; `fixed` uses `vuFullTps` |
| `vuFullTps` | `50` | Full-scale tokens/sec when `vuScale` is `fixed` |
| `slowTps` | `10` | Below this is "slow" (red) |
| `fastTps` | `30` | At or above this is "fast" (green) |
| `showVu` | `true` | Show the VU meter |
| `showTrend` | `true` | Show the trend arrow |
| `showAvg` | `true` | Show the turn average |
| `showPeak` | `true` | Show the peak |
| `showTtft` | `true` | Show time to first token |
| `showTokenCount` | `false` | Show the token counter |
| `showElapsed` | `false` | Show elapsed turn time |
| `alwaysShow` | `false` | Keep the meter visible when idle instead of hiding it |
| `idleText` | `"idle"` | Placeholder shown with `alwaysShow` when there is no data (`tok/s idle`) |
| `label` | `"tok/s"` | Leading label |

## How it works

The plugin subscribes to the TUI event bus:

- `message.updated` — on an assistant message being created, opens a turn and records its start time (for TTFT). On completion, swaps the estimate for the provider's exact `tokens.output + tokens.reasoning`, freezes the final frame, and keeps it on screen.
- `message.part.delta` — records streamed `text` and `reasoning` chunks and buckets them per second.
- `message.part.updated` — restarts the live rate when a tool part runs, while keeping the graph continuous across the gap.
- `session.deleted` — frees that session's meter.

The live rate is `tokens in window / elapsed span` over the trailing window, measured on the wall clock. The average is `turn tokens / active generation time` — the time spent streaming, excluding tool pauses. Peak is the highest one-second rate seen during the turn (never below the average); trend compares the last two complete seconds. VU columns auto-scale to the largest bucket in view, scaled to the provider's exact token total when the turn completes.

## License

MIT
