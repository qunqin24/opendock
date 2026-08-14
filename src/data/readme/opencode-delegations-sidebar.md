# opencode-delegations-sidebar

> **Browser tabs for your opencode sub-agents.**
>
> *Third-party plugin — not built by the OpenCode team and not affiliated with it.*

[![npm version](https://img.shields.io/npm/v/opencode-delegations-sidebar?style=flat-square)](https://www.npmjs.com/package/opencode-delegations-sidebar)
[![npm downloads](https://img.shields.io/npm/dm/opencode-delegations-sidebar?style=flat-square)](https://www.npmjs.com/package/opencode-delegations-sidebar)
[![GitHub release](https://img.shields.io/github/v/release/alcidesbsilvaneto/opencode-delegations-sidebar?style=flat-square)](https://github.com/alcidesbsilvaneto/opencode-delegations-sidebar/releases)
[![License](https://img.shields.io/github/license/alcidesbsilvaneto/opencode-delegations-sidebar?style=flat-square)](LICENSE)
[![Made with TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Made with Solid](https://img.shields.io/badge/Solid-2C4F7C?style=flat-square&logo=solid&logoColor=white)](https://www.solidjs.com/)

A TUI plugin for [opencode](https://opencode.ai) that adds a **Delegations** section to the session sidebar, showing every sub-agent your session has spawned — running, done, failed — with a live status indicator and one-click navigation.

---

## Demo

<!--
  Demo GIF captured at 690x194 px, 124 KB.
  See docs/demo.gif.
-->

![Delegations Sidebar demo](docs/demo.gif)

---

## Why?

Long opencode sessions fan out into a tree of sub-agent (task tool) delegations. By the time you've run a handful of explorations and refactors, switching between them looks like this:

1. `ctrl+x` to open the session list
2. mash arrow keys — up, left, right, down — through a flat list of every session in the project
3. hit enter
4. realize you picked the wrong one, repeat

When the parent session has spawned a dozen delegations, the navigation gets noisy fast — there's no way to tell at a glance which are still running, which finished, and which failed. **Delegations Sidebar** puts that information in front of you, in order, with color-coded status — no more arrow-juggling, no more guessing.

Think of it as the browser tab bar for your sub-agents.

---

## What it looks like

In the right-hand sidebar of a session that has used the `task` tool:

```
┌─────────────────────────────┐
│ Delegations                 │
│ ● explore  find TODOs       │
│   scan repo for unfinished  │
│ ◐ general  refactor auth    │
│   restructure the auth flow │
│ ✗ general  summarize changes│
└─────────────────────────────┘
```

The section auto-hides when the current session has no delegations, so sessions that never used the `task` tool look exactly like before.

---

## Features

- **Live status indicator.** Color-coded dot per delegation that updates in real time as children transition between idle, busy, and retry states — driven by opencode's `session.status` event stream.
- **Click to navigate.** Click a row to jump straight into the child session's chat view via `api.route.navigate("session", { sessionID })`. No more `ctrl+x` + arrow-key hunting.
- **Spawn-order rows.** Children are listed in the order they were spawned, with the agent name, the child's title, and the task's description (or the first line of its prompt).
- **Collapsible header.** Once you have more than two delegations, a chevron appears in the section header so you can collapse the list to save space.
- **Auto-hide.** The section disappears entirely when the parent has no children — zero visual cost for sessions that never spawned a sub-agent.
- **No runtime dependencies.** `@opencode-ai/plugin`, `@opentui/solid`, and `solid-js` are peer-deps that opencode's own runtime provides.

---

## Installation

### From npm (recommended)

Add the package to your `opencode.jsonc`. opencode installs the package and resolves peer dependencies from its own runtime — no manual `npm install` needed.

```jsonc
// ~/.config/opencode/opencode.jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "opencode-delegations-sidebar"
  ]
}
```

### From a local checkout (development)

```bash
git clone https://github.com/alcidesbsilvaneto/opencode-delegations-sidebar.git
cd opencode-delegations-sidebar
npm install        # pulls in solid-js, @opentui/solid, @opencode-ai/plugin
npx bun run build  # compiles src/tui.tsx + src/server.ts into dist/
```

```jsonc
// ~/.config/opencode/opencode.jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "/absolute/path/to/opencode-delegations-sidebar"
  ]
}
```

Pointing at the **package directory** (not a file) is important: the loader reads `package.json` from that directory to decide which entry to use for the server vs. the TUI. We ship two compiled files:

- `dist/server.js` — a no-op `server()` stub. The opencode server loader requires every plugin to default-export a `server()` function; this stub satisfies that without doing anything.
- `dist/tui.js` — the real TUI plugin. Reached via `exports["./tui"]` in `package.json`.

The runtime JSX transform from the opencode binary's `bunfig.toml` doesn't apply to dynamically-imported plugin files, so we pre-compile with `Bun.build` using the `@opentui/solid/bun-plugin` plugin (transforms JSX → `createElement` calls at build time).

---

## Status legend

| Glyph | Color   | Meaning                          |
| ----- | ------- | -------------------------------- |
| `●`   | green   | idle / completed                 |
| `◐`   | yellow  | busy (animated spinner)          |
| `✗`   | red     | retrying                         |
| `○`   | muted   | unknown                          |

---

## How it works

1. On every session change, the plugin calls `client.session.children` to list the child sessions (`parentID === current`) and `client.session.messages` to walk the parent's assistant messages and collect every `subtask` Part (the in-message record the `task` tool emits).
2. Each child session is matched with its `subtask` Part in spawn order. The row shows the agent name, the child session's title, and the task's description (or the first line of its prompt).
3. Live updates: subscribes to `session.created`, `session.updated`, `session.deleted`, `message.part.updated`, and `session.status` and re-fetches as needed. The status dot re-renders on every `session.status` event for any of the listed children.
4. Clicking a row calls `api.route.navigate("session", { sessionID: child.id })`, which drops you into the child session's normal chat view. Use the session switcher (or your normal `go back` keybind) to return.

The sidebar slot used is `sidebar_content` with `order: 150`, so the section appears just below the built-in `Context` panel and above the `MCP` / `LSP` / `Todo` / `Files` sections.

---

## Configuration

This plugin has no configuration. It reads from opencode's runtime and renders automatically.

If you want to change the row order, the slot order, or the row truncation length, the implementation is small enough to fork — see [`src/tui.tsx`](src/tui.tsx).

---

## Development

```bash
npm run typecheck    # tsc --noEmit
npx bun run build    # invokes scripts/build.mjs
```

- `npm run typecheck` — `tsc --noEmit` against the locally installed `@opencode-ai/plugin@1.15.13` and `@opencode-ai/sdk@1.15.13` (uses `jsxImportSource: "@opentui/solid"`).
- `npx bun run build` — invokes `scripts/build.mjs` which calls `Bun.build` with the `@opentui/solid/bun-plugin` plugin, producing `dist/tui.js` (the actual TUI plugin) and `dist/server.js` (a no-op `server()` stub) with the JSX already transformed to `createElement` calls.

### Project layout

```
src/
  tui.tsx       The actual TUI plugin (Solid + @opentui/solid)
  server.ts     No-op server() stub (the opencode server loader requires every plugin to default-export one)
scripts/
  build.mjs     Bun.build script with the @opentui/solid JSX transform
```

---

## Peer dependencies

- `@opencode-ai/plugin >= 1.4.0`
- `@opentui/solid >= 0.1.0`
- `solid-js >= 1.8.0`

These are resolved from opencode's runtime in production. When developing from a local checkout, the plugin's own `node_modules` provides them so `tsc` and `bun` both work standalone.

---

## Related projects

- [`opencode-subagent-statusline`](https://www.npmjs.com/package/opencode-subagent-statusline) — surfaces subagent session state in the statusline. Complementary: statusline vs. sidebar.
- [`@opencode-ai/plugin`](https://www.npmjs.com/package/@opencode-ai/plugin) — the official plugin SDK used by this project.

---

## License

[MIT](LICENSE)
