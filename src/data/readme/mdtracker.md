# MdTracker

[中文说明](README.zh-CN.md)

An OpenCode **TUI sidebar plugin** that shows every Markdown file occupying the
**current session's context** — `@`-mentions, agent tool-reads, and `instructions`
— with live character / token counts. Files over 4 000 tokens are highlighted,
and the list auto-collapses to keep the sidebar tidy.

```
Markdown Context
6 files · 4,521 tokens
README.md            1,250ch / 312t
docs/style.md          860ch / 215t
big-file.md   ⚠ 18,400ch / 4,600t   ← over 4 000 tokens → warning
…
```

## What gets tracked

| Source | How it's captured | Scope |
| --- | --- | --- |
| `@`-mention / file attachment | `chat.message` + `experimental.chat.messages.transform` hooks (reads `FilePart.source.path`) | per session |
| Agent reads a `.md` (read/view/grep tools) | `tool.execute.before` hook (scans tool args) | per session |
| `instructions` in `opencode.json` | TUI reads config directly | always |

Tracked files are scoped to the **current session**: starting a new session (or
restarting OpenCode) resets the list, and files from other projects never appear.

## Sidebar behavior

- Title styled like the built-in panels (`Context`, `MCP`, …) — bold, no icon.
- Sorted by token count, highest first.
- Rows turn yellow when a file exceeds **4 000 tokens**.
- **Auto-collapses** when there are more than **6 files** (shows a one-line
  summary: `Markdown Context (N files, T tokens, M over limit)`). Click the
  ▼/▶ to expand; once you click, your choice is remembered for that session.

## Requirements

- OpenCode `>= 1.3.13`
  (Node.js is only needed to build from source.)

## Install

Install from npm — OpenCode fetches it into its package cache on startup:

```sh
opencode plugin mdtracker -g
```

This adds `"plugin": ["mdtracker"]` to your global config
(`~/.config/opencode/opencode.json`). **Restart OpenCode** to load it.

## Update

```sh
opencode plugin mdtracker@latest -g
```

(or change the version in your config's `plugin` array and restart)

## Uninstall

Remove `"mdtracker"` from the `plugin` array in `~/.config/opencode/opencode.json`,
then restart OpenCode. The cached package can be left in place (harmless).

## From source (development)

To test local changes before publishing, the included scripts build and deploy
to the standard plugins directory:

```powershell
.\install.ps1     # build + deploy to ~/.config/opencode/plugins/mdtracker + register
.\uninstall.ps1   # remove registration, deployed dir, and state files
```

Manual cross-platform build (for type-checking / inspecting output):

```sh
npm install && npm run build
```

## Test

A self-test command and sample files are included:

- `/test-md-tracker` — auto-tests the tool-read, metrics, multi-file, and
  warning-threshold paths, then prints a pass/fail table. (It cannot auto-trigger
  an `@`-mention — that's manual.)
- `test/PLUGIN_TEST.md` — sample file for the tool-read path (1,936ch / 489t).
- `test/MENTION_TEST.md` — sample file for the `@`-mention path (1,360ch / 344t).

Restart OpenCode once if `/test-md-tracker` isn't recognized.

## How it works

The plugin ships two entry points:

- `src/tui.tsx` — TUI plugin. Registers a Solid.js component into the native
  `sidebar_content` slot (`api.slots.register`). Updates **reactively** — a Solid
  effect tracks `api.state` (session messages + config), and
  `message.part.updated` / `session.idle` events trigger refreshes of the
  tool-read state file. No polling.
- `src/server.ts` — server plugin with the capture hooks. Writes resolved paths +
  metrics to a per-session state file.
- `src/metrics.ts` — path resolution (relative paths resolve against the project
  directory), file reading (Bun / `node:fs`), tokenization.
- `src/shared/state.ts` — per-session JSON state in the OS temp dir.

**Tokenizer:** [`gpt-tokenizer`](https://www.npmjs.com/package/gpt-tokenizer)
(pure-JS `cl100k_base`, no WASM). Falls back to a `chars / 4` heuristic if it
ever fails to load, so the sidebar never breaks.

## Limitations

- The TUI slot API (`@opencode-ai/plugin/tui`, `api.slots.register`) is **not**
  part of the public docs and is not guaranteed stable across OpenCode versions.
- `instructions` entries are matched literally (`.md` suffix); globs are not expanded.
- Token counts are model-encoding estimates (`cl100k_base`), not exact for every model.

## License

MIT
