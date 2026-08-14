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
  ├─ parent session → client.session.children() → keep the RUNNING ones
  └─ subagent session → pin the one currently in focus (panel stays up)
  ↓
app_bottom slot renders the roster:  ● title  elapsed · tokens
  ↓
navigation: keymap.intercept catches ↑/↓/Enter BEFORE the prompt textarea
            (the same mechanism opencode uses for copy-on-select), so while the
            dock is focused the prompt is "locked" and arrows move the cursor
```

## Features

- **Persistent bottom panel** — running subagents stay visible under the prompt (Claude-Code-style: plain rows, no panel chrome).
- **Per-subagent telemetry** — status glyph, elapsed time and total token usage on every row.
- **Inline keyboard navigation** — browse the list collapsed, `Enter` opens the selected subagent's session.
- **Stays visible inside a subagent** — the focused subagent is highlighted; native `←/→` between siblings updates it live.
- **Self-cleaning** — finished/cancelled subagents drop out of the panel automatically; it hides when there are none.
- **Escape stays native** — `Esc` is never hijacked, so it still cancels subagents.

## Install

This is a **TUI plugin**, so it is configured in `tui.json` (not `opencode.json`):

```jsonc
// ~/.config/opencode/tui.json  (user)  or  .opencode/tui.json  (project)
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["opencode-agent-dock"]
}
```

Restart OpenCode after adding it.

## Keybindings

| Key | Action |
| --- | --- |
| `ctrl+x` `v` &nbsp;— or `/subagents` | Focus the dock (toggle) |
| `↑` / `↓` | Previous / next subagent |
| `Enter` | Open the selected subagent's session |
| `↑` from the first row, or `ctrl+x` `v` again | Leave the dock |
| `Esc` | _(native)_ cancel subagents |

The toggle key (`<leader>v`) can be remapped in `tui.json` under the `agent-dock.toggle` command if you prefer a different one.

> Why a toggle and not bare `↓`? In the parent session the prompt textarea captures arrow keys, and a plugin cannot blur the host prompt. `keymap.intercept` runs before the textarea, so once the dock is focused the arrows are ours. `↓` itself is also the prompt's history key, which made it an unreliable trigger.

## Develop

```sh
npm install
npm test        # vitest — domain unit tests
npm run typecheck
```

OpenCode runs on Bun and loads `.ts`/`.tsx` natively, so there is no build step for local file-plugin use:

```jsonc
{ "plugin": [["file:///absolute/path/to/opencode-agent-dock/src/index.tsx"]] }
```

## License

MIT © Artem Bambalov
