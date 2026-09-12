# @mirrowel/opencode-subagent-explorer

[![npm](https://img.shields.io/npm/v/@mirrowel/opencode-subagent-explorer)](https://www.npmjs.com/package/@mirrowel/opencode-subagent-explorer)
[![license](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

An [OpenCode](https://opencode.ai) plugin for exploring — and cleaning up — the subagent sessions of your current session.

Subagent (task tool) sessions pile up fast: every task call spawns a child session with its own messages and history, including hidden background ones (Magic Context's historian passes, plugin-registered agents). They live in OpenCode's database even after the conversation moved on. This plugin gives you a tree view of all of them, per-session details, single deletion, and a one-key cleanup that removes every idle session in the current tree.

<!-- TODO screenshot: docs/screenshots/tree.png -->

## What it looks like

Open the palette and run **Subagent Explorer: Open** (or `/subagent-explorer`):

- The current session's full subagent tree — nested children included, sorted by creation time
- Per row: agent, title, running state (`▶` green while busy), last activity, `[hidden]` badge for background agents
- `i` — details: agent, status, times, message count, last model, first prompt
- `enter` — delete one session (running ones ask a red extra confirmation)
- `c` — cleanup: delete every idle subagent session in the tree, sparing running ones
- `r` — refresh · `s` — explore another session's tree

Deleting a session permanently removes it, its messages, and its history. The parent session keeps the task result text — only the "view subagent" jump target is lost.

<!-- TODO screenshot: docs/screenshots/details.png -->

## Install

```jsonc
// ~/.config/opencode/opencode.json
{
  "plugin": ["@mirrowel/opencode-subagent-explorer"]
}
```

The plugin wires its TUI side automatically (a matching `tui.json` entry is mirrored at the same config level). Works on OpenCode v1 and the v2 beta.

### With Config Studio

If you use [Config Studio](https://github.com/Mirrowel/opencode-config-studio), the explorer integrates into its **Tools** section instead — enable the module there and the standalone entry stands down.

## How it works

- Sessions are listed via OpenCode's session API and walked by `parentID` from the current session (the TUI router's session; newest session as fallback)
- Running sessions are detected through the live active-session map — never guessed from timestamps
- Hidden/background classification: agents flagged `hidden` in your config, plus runtime-registered agents OpenCode doesn't expose
- All host calls are timeout-bounded and fail soft; a host without a session API gets a clear notice instead of a hang

## License

MIT
