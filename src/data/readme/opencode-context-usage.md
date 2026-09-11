# opencode-context-usage

[![npm version](https://img.shields.io/npm/v/opencode-context-usage)](https://www.npmjs.com/package/opencode-context-usage)
[![CI](https://github.com/angeloper86/opencode-context-usage/actions/workflows/ci.yml/badge.svg)](https://github.com/angeloper86/opencode-context-usage/actions/workflows/ci.yml)
[![license](https://img.shields.io/github/license/angeloper86/opencode-context-usage)](LICENSE)

An OpenCode **TUI plugin** that adds a `/context` command: the exact breakdown behind the built-in Context panel, plus the session-wide usage and cost totals OpenCode tracks internally — including delegated subagent sessions.

## Example output

The examples below use illustrative numbers.

### Simple session

```text
Context usage — Refactoring the auth middleware
provider/model · build

Context window (last request)
  Input (no cache)                       83
  Output                              1,012
  Reasoning                             342
  Cache read (hits)                 118,528
  Total                   119,965 / 1M (12%)

Session total — 29 turns · 4 prompts
  Input (no cache)                  156,297
  Output                             31,389
  Reasoning                          28,405
  Cache read (hits)               1,808,128
  Total                           2,024,219
  Cache hit rate                     92.0%
  Cost                           $0.043687
```

### Session with delegated subagents

When the agent delegates work with `task`, each subagent runs in its own child session. The plugin walks that tree and adds two extra blocks:

```text
Context usage — Fixing the checkout flow
provider/model · build

Context window (last request)
  Input (no cache)                       83
  Output                              1,012
  Reasoning                             342
  Cache read (hits)                 118,528
  Total                   119,965 / 1M (12%)

Session total — 29 turns · 4 prompts
  Input (no cache)                  156,297
  Output                             31,389
  Reasoning                          28,405
  Cache read (hits)               1,808,128
  Total                           2,024,219
  Cache hit rate                     92.0%
  Cost                           $0.043687

Subagents — 1 session
  Input (no cache)                   41,002
  Output                             18,544
  Reasoning                          12,301
  Cache read (hits)               1,092,999
  Total                           1,164,846
  Cache hit rate                     96.4%
  Cost                           $0.034800

Combined total — session + subagents
  Total                           3,189,065
  Cost                           $0.078487
```

## Why

OpenCode's sidebar `Context` panel mixes two different scopes: `tokens` and `% used` are a snapshot of the **last request**, while `spent` is the **session total**. There is no built-in way to see the accumulated traffic of a session either.

This plugin makes both scopes explicit and shows the arithmetic behind each number, so you can answer questions like:

- How full is my context window right now?
- How many tokens have actually passed through the API in this session?
- How much of the prompt is served from cache, and how much of the cost is cache vs fresh tokens?
- How much did the subagents I delegated work to consume? (OpenCode tracks each subagent — `task` calls — in its own child session, excluded from the parent's totals. The plugin walks the delegation tree and shows the combined total.)

It reads the already-synced TUI state (`api.state.session`), so it is instant, never calls an LLM and has **zero runtime dependencies**.

## Install

```bash
opencode plugin opencode-context-usage
```

OpenCode installs the package and adds it to your `tui.json`. Or add it manually (global `~/.config/opencode/tui.json` or project `.opencode/tui.json`):

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["opencode-context-usage"]
}
```

Restart OpenCode after changing `tui.json` (TUI plugins load at startup).

## Usage

Open a session and run:

```
/context
```

Alias: `/ctx`. Close the dialog with `Esc` or `Ctrl+C`.

### Command name

The command defaults to `/context`. If another command already uses that slash name (for example a future built-in `/context`), the plugin automatically registers as `/context-usage` instead. You can also set the name explicitly:

```json
{
  "plugin": [["opencode-context-usage", { "slash": "usage" }]]
}
```

## How the numbers are computed

OpenCode normalizes provider usage in `Session.getUsage`: `input` excludes cache tokens and `output` excludes reasoning tokens.

| Metric | Meaning |
| --- | --- |
| `Input (no cache)` | Prompt tokens not served from cache |
| `Output` | Generated tokens excluding reasoning (includes tool calls) |
| `Reasoning` | Reasoning / thinking tokens |
| `Cache read (hits)` | Prompt tokens served from cache |
| `Cache write` | Prompt tokens written to cache (row hidden when 0) |
| `Total` (window) | `input + output + reasoning + cache read + cache write` of the last completed request — the same number the built-in panel shows |
| `Cache hit rate` | `cache read / (input + cache read + cache write)` |
| `Cost` | Sum of the per-turn costs OpenCode records for the session (`session.cost`) |
| `Subagents` | Aggregated usage of every child session delegated from this one (recursively) |
| `Combined total` | Session total + subagents total (tokens and cost) |

Session totals come from the authoritative session aggregate that OpenCode stores (the same source the built-in panel uses), not from re-summing the messages loaded in the TUI. On long sessions the TUI keeps only a window of recent messages, so the turn and prompt counts may show a `+` (for example `95+ turns`) to indicate there are more messages than the loaded window. Subagent totals use the same session aggregates for each child session, so they are exact.

## Compatibility

- OpenCode `>= 1.18.0 < 2` (TUI plugins via `tui.json`).
- Subagent totals use the session children endpoint. If your build does not expose it, the plugin simply hides the subagents and combined blocks.
- The TUI plugin API is young and may change between OpenCode versions. If something breaks, please open an issue with your OpenCode version.

## Development

```bash
npm install
npm run typecheck
npm test        # builds dist/ and runs the unit tests
npm run build
```

To try a local checkout in OpenCode, point `tui.json` at the built file:

```json
{
  "plugin": ["/absolute/path/to/opencode-context-usage/dist/tui.js"]
}
```

## License

MIT
