<div align="center">

# ✅ oc-todo

**Per-session todo lists for your OpenCode terminal.**
*Real plugin storage — not a decorative widget.*

[![npm version](https://img.shields.io/npm/v/oc-todo)](https://www.npmjs.com/package/oc-todo) [![license: MIT](https://img.shields.io/badge/license-MIT-blue)](./LICENSE) [![node >=22](https://img.shields.io/badge/node-%E2%89%A522-green)](https://nodejs.org) [![opencode v2](https://img.shields.io/badge/opencode-v2-blueviolet)](https://opencode.ai) [![npm weekly downloads](https://img.shields.io/npm/dw/oc-todo)](https://www.npmjs.com/package/oc-todo) [![CI](https://github.com/nathwn12/oc-todo/actions/workflows/check.yml/badge.svg)](https://github.com/nathwn12/oc-todo/actions/workflows/check.yml)

</div>

---

## ⚡ Quick start

```text
Install the oc-todo OpenCode plugin:
1. Add "oc-todo" to the "plugins" array in ~/.config/opencode/opencode.jsonc.
2. Restart OpenCode.
3. Verify: the `todo` tool is available to the agent.
```

Add the plugin to your `opencode.jsonc` - stable (npm) or bleeding edge (github):

```jsonc
// opencode.jsonc - stable (npm):
{ "plugins": ["oc-todo@0.4.0"] }
```

```jsonc
// opencode.jsonc - bleeding edge (github) instead of stable, not in addition:
{ "plugins": ["oc-todo@git+https://github.com/nathwn12/oc-todo.git#ac48febf140034a3c6b98387f8cfe80700d82e16"] }
```

See [INSTALL.md](./INSTALL.md) for the three routes: pinned npm, the github package spec, and a no-npm local directory entry.

Restart OpenCode. **That's the whole setup** — no config file, no options. The `todo` tool is available to the agent immediately, and the checklist appears in the sidebar beside an open session whenever that session has todos.

---

## 🧰 What it does

The list is **real, per-session state**: every mutation is written to plugin storage under a session-scoped key, and every read returns exactly what is stored. Nothing here is ephemeral UI text.

### ✅ The `todo` tool

| Action | Arguments | What it does |
|---|---|---|
| `list` | — | Read back the stored list for this session |
| `open` | — | Every unfinished todo across all sessions, ordered by priority then recency |
| `write` | `todos[]` (required) | **V1 `todowrite` parity** — replace the whole list |
| `add` | `content` `[status]` `[priority]` `[notes]` | Append one item |
| `update` | `id` `[content]` `[status]` `[priority]` `[notes]` | Change one item by id (exact or unambiguous prefix); an unknown status/priority is refused |
| `complete` | `id` | Mark one item completed |
| `move` | `id` plus exactly one of `before` `after` `position` | Reorder one item: insert before/after a target id, or at a position |
| `clear` | — | Wipe the list |

`status`: `pending` · `in_progress` · `completed` · `cancelled`
`priority`: `high` · `medium` · `low`

A `write` item may carry an `id`; when it does, the existing item keeps its identity and `createdAt`, so a rewrite is a true edit rather than a new list. Blank items are dropped and unknown status/priority fall back to `pending`/`medium`. `write` requires `todos`: a `write` with none is refused and changes nothing. `update` is stricter — an out-of-vocabulary status or priority is refused with the allowed set named, never silently defaulted. `open` sorts by priority (`high` → `medium` → `low`) then by most-recently updated, so the order is deterministic for a given set of rows; exact (priority, `updatedAt`) ties keep their input order.

### 📋 The sidebar checklist

`tui.tsx` renders the stored list read-only in the `sidebar.content` slot. It refreshes on `rpc.todo.changed` and falls back to a slow poll, so it also works against a remote server whose events this TUI is not subscribed to.

Rendering rules — **decided, not configurable**:

- **No todos** -> one muted hint line (`todo - use the todo tool for multi-step work`), clipped to the same 28-cell budget.
- **Header** -> one row while the list is non-empty: a toggle (`String.fromCharCode(0x25BC)` U+25BC expanded, `String.fromCharCode(0x25B6)` U+25B6 collapsed), a space, then `Todos n/n` where the first `n` is the closed count. The collapsed and expanded headers share the same column offset.
- **Any pending / in_progress** → the full checklist; closed lines are muted.
- **All completed / cancelled** -> auto-collapses to the header, `String.fromCharCode(0x25B6) Todos n/n` with `n == total`, so finished work leaves closure without a stale list.
- **Every row is columns** → a one-cell mark column, its guaranteed separator, then the value. Marks are single cells: pending `String.fromCharCode(0x25CB)` (U+25CB), in_progress `String.fromCharCode(0x25D0)` (U+25D0), completed `String.fromCharCode(0x25CF)` (U+25CF), cancelled `String.fromCharCode(0x2297)` (U+2297). For single-cell text the value is clipped to a 28-cell budget so a long todo cannot wrap the sidebar, and a note count stays a suffix (` (2 notes)`); a wide-character content value is clipped at render time instead, so the row still cannot wrap. The marks, the toggle, and the ellipsis are single-cell and narrow.
- **Click the header to toggle** — a manual choice wins for that session. The removed V1 sidebar had the same toggle; this one works at any list length, not only above two items.

Storage never auto-prunes. Items change only when the caller mutates them (`write`, `clear`, or a per-item action). The render rules are what keep the surface quiet — the data keeps the history.

### 💾 Storage

Plugin storage under `todos/session/<sessionID>`, durable in the host's SQLite store. The list is keyed by session id, so it is scoped to the calling session and survives across turns and server restarts.

```jsonc
{ "version": 1, "todos": [
  { "id": "m1a2b", "content": "write docs", "status": "pending",
    "priority": "medium", "createdAt": 0, "updatedAt": 0 }
] }
```

---

## ⚙️ Configure

**You don't need any.** Install it and the tool works — no config file, no options, nothing to learn.

The rendering rules above are **decided, not configurable**: the sidebar exposes no knobs, so the `plugins` entry in `opencode.jsonc` is the entire configuration surface.

---

## 🛡️ Safety

**It stores your todos and renders them. Nothing else.**

- **No network.** The plugin makes no outbound calls — the `todo` tool and the sidebar both work offline. Nothing is fetched, nothing is sent.
- **No telemetry.** Nothing is collected or phoned home.
- **One storage location.** Every mutation is written to plugin storage under `todos/session/<sessionID>` in the host's own SQLite store — a session-scoped key, not a file the plugin owns. Nothing is written anywhere else.
- **Read-only rendering.** The sidebar only reads the stored list; the `tui.tsx` entry never mutates it. An empty session renders only the muted hint line.

Delete the plugin and the stock sidebar is back, exactly as it was.

---

## 🧹 Uninstall

Remove `"oc-todo"` from the `plugins` array in `opencode.jsonc` and restart OpenCode. Nothing else was installed, so there is nothing else to undo.

---

## 🛠️ Development

A local directory plugin is resolved by **filename at the plugin root** — the `package.json` `exports` map is only consulted for installed (named) packages — so the entries sit at the root:

```
index.ts         server plugin: the `todo` tool + the RPC implementation
tui.tsx          CLI plugin: sidebar checklist renderer
contract.ts      shared RPC contract (plain JSON Schema, no bare imports)
```

- **As a package** (`"plugins": ["oc-todo"]`): `exports["."]` → `index.ts`, `exports["./tui"]` → `tui.tsx`.
- **As a local directory** (`"plugins": ["./plugins/oc-todo"]`): the same files at the directory root.

```sh
bun install
bun run check      # tests + typecheck
```

---

## 🧭 Compatibility

| | |
|---|---|
| Host | OpenCode V2 (`opencode2`) |
| Building from source | Node ≥ 22 or Bun ≥ 1.4 |
| Storage | Plugin storage in the host's SQLite store — session-scoped, no files of its own |

Both entrypoints are deliberately dependency-free at load time: `index.ts` exports a plain `{ id, setup }` definition and the shared contract is a plain object. That is always valid — `Plugin.define` and `Rpc.define` are identity helpers — and it also keeps the plugin loadable where the bare `@opencode/plugin` specifier is not resolvable from a local directory plugin (observed on the stock 2.0.22 binary, 2026-10). The TUI entry keeps `@opencode/plugin/tui`, which the TUI runtime injects.

---

## 📄 License

MIT © 2026 nathwn12 — see [LICENSE](./LICENSE).
