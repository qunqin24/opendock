# @omnichroma/opencode-stats-for-nerds

OpenCode v2 TUI plugin that shows token usage, context window, generation speed, cost, and file changes in the sidebar after each response. This fork targets OpenCode **2.0.18+** and is based on [imluckii/opencode-stats-for-nerds](https://github.com/imluckii/opencode-stats-for-nerds). For OpenCode v1, use the original unscoped package's 1.x releases.

## Install

```sh
opencode plugin add @omnichroma/opencode-stats-for-nerds@^2
```

Or add the package to `~/.config/opencode/cli.json`:

```json
{
  "plugins": ["@omnichroma/opencode-stats-for-nerds"]
}
```

Merge the entry with any existing plugins, then restart OpenCode and open a session with the right sidebar visible. A **Stats for Nerds** panel appears there. This is a CLI-only plugin, so it also works when the CLI connects to a remote server.

To use a checkout instead, run `npm install` in its directory and replace the package name in `cli.json` with its absolute directory path. On Windows, use forward slashes, for example `C:/Users/you/source/repos/opencode-stats-for-nerds`.

## What it shows

```
▼ Stats for Nerds
  Input        13k
  Output       1.2k
  Thinking     2.0k
  Cached       6.5k
  Context      23k / 200k (12%)
  ────────────────
  Cost         $0.0070
  Gen Time     2m 14s
  TTFT         1.35s
  Speed        42.3 tok/s
  ────────────────
  Changes      +234 -56 · 5 files
  Model        claude-sonnet-4
```

Click the header to collapse/expand.

### Stats reference

| Stat | Scope | Description |
|------|-------|-------------|
| **Tokens** | Last response | Input, output, and thinking tokens from the last completed model step |
| **Cached** | Last response | Cache reads and writes combined |
| **Context** | Last response | Full token count vs that response's model limit, with percentage |
| **Cost** | Cumulative | Total session cost at provider rates |
| **Gen Time** | Cumulative | Total model request time, excluding tool settlement when V2 supplies a stream-end timestamp |
| **Think Time** | Cumulative | Total time the model spent reasoning (off by default) |
| **TTFT** | Last response | Time to first text or reasoning block, recovered from V2's session log |
| **Speed** | Last response | Output tokens divided by model request time |
| **Activity** | Cumulative | Tool-call steps and invocations (off by default) |
| **Changes** | Session at current location | Net file additions, deletions, and count across turns |
| **Model** | Last response | Model ID |

## Configuration

Disable any stat via the `options` object in `~/.config/opencode/cli.json`:

```json
{
  "plugins": [
    {
      "package": "@omnichroma/opencode-stats-for-nerds",
      "options": {
        "show": {
          "cache": false,
          "activity": true,
          "model": false
        }
      }
    }
  ]
}
```

All options default to `true` except `thinkTime` and `activity`.

| Key | Default | Controls |
|-----|---------|----------|
| `tokens` | `true` | Input/output/thinking rows |
| `cache` | `true` | Combined cache read/write row |
| `context` | `true` | Context window used / limit (%) |
| `cost` | `true` | Session cost |
| `genTime` | `true` | Total generation time |
| `thinkTime` | `false` | Total reasoning time |
| `ttft` | `true` | Time-to-first-token |
| `speed` | `true` | Tokens per second |
| `activity` | `false` | Steps and tool calls |
| `changes` | `true` | File additions/deletions |
| `model` | `true` | Model name |

## Requirements

- [OpenCode](https://opencode.ai) v2.0.18 or newer.
- The v2 [CLI plugin API](https://opencode.ai/v2/docs/build/plugins/cli/) and [global CLI configuration](https://opencode.ai/v2/docs/cli/plugins). The v1 `tui.json` tuple format is no longer used.

The last completed response stays visible during generation. A new session starts with `waiting...`. TTFT is omitted when no timestamp was recorded; it is not estimated. File changes require OpenCode's session snapshots. If a session moves to another directory, changes cover turns since that move because V2 cannot diff across locations.

## Development

```sh
npm ci
npm run typecheck
npm test
npm run test:tui
npm pack --dry-run
```

The unit tests use Node.js 22.18+ (or 24+). The renderer smoke test requires Bun 1.3+ and exercises the real OpenTUI renderer, V2 package entrypoint, live updates, configuration, session switching, and cleanup.

## License

MIT
