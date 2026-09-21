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

It reads the already-synced TUI state (`context.data.session`), so it is instant, never calls an LLM and has **zero runtime dependencies**.

## Install

Add it to your global OpenCode 2 CLI config (`~/.config/opencode/cli.json`):

```json
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": ["opencode-context-usage"]
}
```

Or let the CLI do it:

```bash
opencode plugin opencode-context-usage
```

CLI plugin configuration is global (there is no project-local `cli.json`), and valid edits reload while the TUI is running.

## Usage

Open a session and run:

```
/context
```

Alias: `/ctx`. Close the dialog with `Esc` or `Ctrl+C`.

### Command name

The command registers as `/context`, with `/ctx` as an alias. You can change the name explicitly:

```json
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": [{ "package": "opencode-context-usage", "options": { "slash": "usage" } }]
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

- OpenCode `>= 2.0.0` (CLI plugins via `cli.json`, using `@opencode/plugin/tui`).
- Session and subagent totals come from the synced session state (`context.data.session`); the plugin never calls the server directly and never calls an LLM.
- The CLI plugin API is still evolving during the OpenCode 2 beta. If something breaks, please open an issue with your OpenCode version.

## Development

```bash
npm install
npm run typecheck
npm test        # builds dist/ and runs the unit tests
npm run build
```

To try a local checkout in OpenCode 2, use the plugin discovery directory. Create
`<global-config>/plugins/context-usage/tui.ts` (for example
`~/.config/opencode/plugins/context-usage/tui.ts`) that re-exports the built plugin:

```ts
export { default } from "/absolute/path/to/opencode-context-usage/dist/tui.js"
```

OpenCode discovers it automatically at startup — no `cli.json` entry is needed. Run
`opencode plugin list` to confirm it is loaded. (Listing the package path directly in
`cli.json` `plugins` is also documented, but an npm-installable package name is the
reliable form once published.)

## License

MIT
