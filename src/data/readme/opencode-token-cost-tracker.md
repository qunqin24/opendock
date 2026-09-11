# opencode-token-cost-tracker

[![npm version](https://img.shields.io/npm/v/opencode-token-cost-tracker?logo=npm&color=cb3837)](https://www.npmjs.com/package/opencode-token-cost-tracker)
[![npm downloads](https://img.shields.io/npm/dm/opencode-token-cost-tracker)](https://www.npmjs.com/package/opencode-token-cost-tracker)
[![license](https://img.shields.io/npm/l/opencode-token-cost-tracker)](./LICENSE)
[![opencode](https://img.shields.io/badge/opencode-%E2%89%A51.15.0-000000)](https://opencode.ai)

Live tokens/sec, full-session token totals, and a per-model cost breakdown for the [opencode](https://opencode.ai) terminal UI — including **DeepSeek peak/off-peak pricing**.

Zero config: add it to `tui.json`, restart opencode, done.

## Contents

- [Preview](#preview)
- [Features](#features)
- [Requirements](#requirements)
- [Install](#install)
- [Usage](#usage)
- [How it works](#how-it-works)
- [Limitations](#limitations)
- [Troubleshooting](#troubleshooting)
- [Development](#development)
- [License](#license)

## Preview

**Status line** (bottom of the chat pane, centered, never overlapping the sidebar):

```
cache 12.34k  ·  in 45.67k  ·  out 8.90k  ·  reason 1.20k  ·  avg 42.3 t/s  ● off-peak
```

**Cost panel** (right sidebar, collapsible):

```
▾ Cost                        $0.0154
  ▸ deepseek-flash             $0.0070
    In $0.15 · Out $0.60 · C $0.003
    cache         12.3k    $0.0000
    input         45.7k    $0.0069
    output         0.9k    $0.0011

  ▸ deepseek-flash (peak)      $0.0210
    In $0.30 · Out $1.20 · C $0.006
    cache          4.1k    $0.0000
    input         30.0k    $0.0090
    output         6.0k    $0.0144
```

## Features

- **Status line** — session-wide token totals (cache reads, input, output, reasoning), token-weighted average speed (`t/s`), and a blinking DeepSeek peak/off-peak indicator.
- **Cost panel** — per-model totals, the catalog rates (`In` / `Out` / `C`), and per-category tokens with estimated cost. Click a model name to expand `output` and `reason` separately; collapsed, they are combined.
- **Full-session accuracy** — totals are read from the whole session through the SDK, not just the recent window the TUI keeps in memory, so counts do not shrink when you reopen a session.
- **DeepSeek peak/off-peak pricing** — peak usage is shown as its own `‹model› (peak)` entry priced at 2× the listed off-peak rates (peak = 01:00–04:00 and 06:00–10:00 UTC, Mon–Fri).
- **Zero config, no build step** — opencode's runtime transpiles the TSX and provides `solid-js` / `@opentui`.

## Requirements

- opencode `>= 1.15.0`
- Terminal wider than 120 columns (or a manually toggled sidebar) to see the Cost panel.

## Install

### From npm (recommended)

Add the package to your global `tui.json` (`~/.config/opencode/tui.json`):

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["opencode-token-cost-tracker"]
}
```

Restart opencode. The package is installed automatically on first run.

### From a local file

Copy `tps-monitor.tsx` into `~/.config/opencode/tui/` and reference it by path:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["./tui/tps-monitor.tsx"]
}
```

## Usage

- The status line is centered within the chat column so it never runs under the sidebar.
- The Cost panel renders in the right sidebar. Click the **Cost** header to collapse or expand the whole panel.
- Click a model name to toggle its `output`/`reason` breakdown.
- Prices come from [models.dev](https://models.dev) — the same catalog opencode uses.

State is kept in opencode's KV store:

| Key | Default | Meaning |
| --- | --- | --- |
| `token-cost-tracker.cost_expanded` | `true` | Cost panel expanded |
| `token-cost-tracker.model.<provider>/<model>` | `false` | Per-model expanded (add `#peak` for peak entries) |

## How it works

- Totals are computed from `session.messages` (no limit) via the SDK and cached per session. The live TUI store is merged on top so streaming stays real-time.
- Average `t/s` = Σ(output + reasoning) ÷ Σ(turn span), where a turn's span runs from its first streamed text/reasoning token to completion (the in-progress turn uses "now").
- Cost = tokens × catalog rate ÷ 1,000,000. Reasoning is billed at the output rate when no dedicated rate exists. DeepSeek peak turns are priced at 2×.
- No build step: opencode's Bun runtime transpiles the TSX and injects `solid-js` / `@opentui`.

## Limitations

- Costs are **estimates** and can differ from your provider invoice (tiered `>200k` context pricing, cache-write pricing, promos, rounding).
- Peak/off-peak is decided from each turn's **start** time, so a turn that crosses a boundary is classified by its start.
- Cache **write** tokens are not included; most providers bill those separately.

## Troubleshooting

- **Cost panel is missing** — widen the terminal past 120 columns or toggle the sidebar; the panel renders in the sidebar slot.
- **Plugin does not load** — make sure `tui.json` is valid JSON and the name matches the npm package, then restart opencode.
- **Numbers look stale** — history refreshes every 30 seconds; the live window updates immediately.

## Development

```bash
git clone https://github.com/sulaimanh7877/opencode-token-cost-tracker
```

The plugin entry point is `tps-monitor.tsx` (exported as `./tui`). There is no build step.

## License

[MIT](./LICENSE) © Sulaiman
