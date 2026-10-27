# opencode-agent-dock

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![OpenCode Plugin](https://img.shields.io/badge/OpenCode-Plugin-green.svg)](https://opencode.ai)
[![npm version](https://img.shields.io/npm/v/opencode-agent-dock.svg)](https://www.npmjs.com/package/opencode-agent-dock)
[![GitHub repo](https://img.shields.io/badge/repo-arttttt%2Fopencode--agent--dock-181717?logo=github)](https://github.com/arttttt/opencode-agent-dock)

An [OpenCode](https://opencode.ai) **TUI plugin** that adds a **Claude-Code-style bottom panel** of your running **subagents** — visible at a glance under the prompt, with inline keyboard navigation to browse them collapsed and open any one.

Subagents normally only surface inline in the chat, and the chat scrolls away from where they were spawned. `opencode-agent-dock` keeps the active session's subagents pinned to the bottom of the screen, each with its status, elapsed time and token spend.

## How it works

```
active session route
  ↓
resolve current session
  ├─ parent session → its child sessions → keep the RUNNING ones
  └─ subagent session → pin the one currently in focus (panel stays up)
  ↓
bottom slot renders the roster:  ● title  elapsed · tokens
  (OpenCode 1: app_bottom · OpenCode 2: app)
  ↓
navigation: while the dock is focused, ↑/↓/Enter reach it BEFORE the prompt,
            so the prompt is "locked" and arrows move the cursor
  (OpenCode 1: keymap.intercept · OpenCode 2: a keymap layer above the prompt's)
```

Refresh: on OpenCode 1 the dock re-reads the roster on session events and every 300 ms; on OpenCode 2 it reads OpenCode's live session data, which updates by itself, and only ticks once a second for elapsed time.

## Features

- **Persistent bottom panel** — running subagents stay visible under the prompt (Claude-Code-style: plain rows, no panel chrome).
- **Per-subagent telemetry** — status glyph, elapsed time and total token usage on every row.
- **Inline keyboard navigation** — browse the list collapsed, `Enter` opens the selected subagent's session.
- **Stays visible inside a subagent** — the focused subagent is highlighted; native `←/→` between siblings updates it live.
- **Self-cleaning** — finished/cancelled subagents drop out of the panel automatically; it hides when there are none.
- **Escape stays native** — `Esc` is never hijacked, so it still cancels subagents.

## Install

This is a **TUI plugin**. On OpenCode 1 it is configured in `tui.json` (not `opencode.json`):

```jsonc
// ~/.config/opencode/tui.json  (user)  or  .opencode/tui.json  (project)
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["opencode-agent-dock"]
}
```

On OpenCode 2 the TUI reads `cli.json`, under `plugins`:

```jsonc
// ~/.config/opencode/cli.json
{
  "plugins": ["opencode-agent-dock"]
}
```

Coming from OpenCode 1 you need not do this: on its first start, OpenCode 2 writes `cli.json` from your `tui.json`, plugins included, as long as no `cli.json` exists yet.

Restart OpenCode after adding it.

## Compatibility

| OpenCode | Status |
| --- | --- |
| 1.0 – 1.3.3 | no TUI plugins in OpenCode itself |
| 1.3.4 – 1.17 | not supported: the plugin declares `engines.opencode` `^1.18.0 \|\| ^2.0.0`, so OpenCode refuses it |
| 1.18 – 1.x | supported |
| 2.x | supported |

On OpenCode 2:
- the dock sits where it does on OpenCode 1: under everything, on every screen (the `app` slot);
- it follows OpenCode 2's own session data, so it updates the moment a subagent starts, finishes or is deleted;
- the reduced "mini" TUI shows no plugin panels, so no dock there.

## Keybindings

| Key | Action |
| --- | --- |
| `ctrl+x` `v` &nbsp;— or `/subagents` | Focus the dock (toggle) |
| `↑` / `↓` | Previous / next subagent |
| `Enter` | Open the selected subagent's session |
| `↑` from the first row, or `ctrl+x` `v` again | Leave the dock |
| `Esc` | _(native)_ cancel subagents |

The toggle key (`<leader>v`) can be remapped under the `agent-dock.toggle` command if you prefer a different one: in `tui.json` on OpenCode 1, in `cli.json` `keybinds` on OpenCode 2.

> Why a toggle and not bare `↓`? In the parent session the prompt textarea captures arrow keys, and a plugin cannot blur the host prompt. `keymap.intercept` runs before the textarea, so once the dock is focused the arrows are ours. `↓` itself is also the prompt's history key, which made it an unreliable trigger.

## Develop

```sh
npm install
npm test        # builds dist/, then vitest: domain unit tests + the packed tarball loaded as OpenCode loads it
npm run typecheck
```

The package ships `dist/`, compiled by `npm run build` with the same Solid transform OpenCode applies to local plugins. Raw `.tsx` can't ship: OpenCode compiles none of the files under `node_modules`, where an npm install lives (1.0.0 shipped `src/` and never loaded from npm).

For local development a file plugin needs no build, since it is not under `node_modules`:

```jsonc
{ "plugin": [["file:///absolute/path/to/opencode-agent-dock/src/index.tsx"]] }
```

CI runs the typecheck and tests on every pull request and every push to `main`.

## License

MIT © Artem Bambalov
