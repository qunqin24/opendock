# opencode-session-diff

> **Not an official OpenCode / SST product.** This is a community plugin, not affiliated with or endorsed by OpenCode.

**English** | [简体中文](README.zh-CN.md)

[![npm version](https://img.shields.io/npm/v/opencode-session-diff.svg)](https://www.npmjs.com/package/opencode-session-diff)
[![license](https://img.shields.io/github/license/imdlan/opencode-session-diff.svg)](LICENSE)

> Changes sidebar panel for OpenCode — see every file the current session touched, at a glance.

A TUI plugin for [OpenCode](https://opencode.ai) that adds a **Changes** section to the session sidebar. It lists every file the current session modified, added, or deleted, with ± line counts, highlights the file being edited right now, and click-through to the built-in diff viewer.

<!-- screenshot / GIF placeholder -->

```
▼ Changes (4)                              +154 −18
• src/agent/loop.ts                        +28 −9
• src/tools/fs.ts                          +110 −3
• test/loop.test.ts                        +13
• src/legacy/runner.ts                     −6
```

## Features

- **Session-scoped**: exactly what this conversation changed — powered by the server's `session.diff` snapshot, not a client-side guess.
- **Added / modified / deleted** with per-file `+additions −deletions` counters, right-aligned.
- **Live-edit highlight**: the file being edited turns warning-colored for a few seconds (`session.tool.*` events; filesystem watcher as fallback).
- **Click to review**: opens the official diff viewer, already scoped to this session's changes.
- **Events, not polling**: refreshes on round completion and `/undo`; no timers in the background.
- **Theme-aware**: all colors come from the host theme (dark/light/custom).
- **Zero config**.

## Install

```sh
opencode plugin add opencode-session-diff@latest
```

Recommended host setting so the diff viewer opens on the session's own changes rather than the git branch:

```jsonc
// ~/.config/opencode/cli.json
{
  "diffs": { "source": "turn" }
}
```

The sidebar shows when space allows (`session.sidebar: "auto"`). Toggle it with `Ctrl+X` then `B`.

## Usage

| Action | Result |
|---|---|
| Click the **Changes** title | Collapse / expand the section |
| Click a file row | Open the diff viewer (session source) |
| `Ctrl+P` → **Changes: toggle collapse** | Same collapse, keyboard-only |

Collapse state is persisted per TUI instance.

## Requirements

- OpenCode ≥ 2.0.x (V2 plugin API, `@opencode/plugin/tui`)
- A git repository is not required; the panel is driven by the session snapshot

## How it works

1. The plugin registers a `sidebar.content`-anchored claim (`after` the content boundary, below other sections, above the footer) with `@opencode/plugin`'s `ui.slot`.
2. It fetches `client.session.diff({ sessionID })` and classifies each `FileDiff.Info` by its authoritative `status` (`added` / `deleted` / `modified`), falling back to ± counts if `status` is absent.
3. Refreshes are debounced 500 ms and triggered by `session.execution.succeeded`, `session.idle`, and `session.revert.*` events.
4. The host paints only the synchronous snapshot returned by the slot render, so any state change re-registers the claim (documented in `docs/DEVELOPMENT.md`).

## Limitations

- The official diff viewer cannot focus a single file from the API; clicking opens the whole session diff (navigate files with `n` / `p` inside it).
- The plugin is TUI-only (V2). It ships a no-op server stub because the host loader requires one.

## Development

```sh
bun install
bun run build      # dist/index.js + dist/tui.js (host deps stay external)
bun test           # 34 unit tests
bun run typecheck
```

Deeper notes, verified API contracts, and edge cases live in [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md).

## License

[MIT](LICENSE)
