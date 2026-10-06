<div align="center">

# ✅ oc-todo

**Per-session todo lists for your OpenCode terminal.**
*Real plugin storage — not a decorative widget.*

![npm](https://img.shields.io/npm/v/oc-todo) ![license](https://img.shields.io/badge/license-MIT-blue) ![node](https://img.shields.io/badge/node-%E2%89%A522-green) ![downloads](https://img.shields.io/npm/dm/oc-todo) ![check](https://github.com/nathwn12/oc-todo/actions/workflows/check.yml/badge.svg)

</div>

---

## 🚀 Quick start

Add the plugin to your `opencode.jsonc`:

```jsonc
// opencode.jsonc
{ "plugins": ["oc-todo"] }
```

Restart OpenCode. **That's the whole setup** — no config file, no options. The
`todo` tool is available to the agent immediately, and the checklist appears in
the sidebar beside an open session whenever that session has todos.

---

## 🧰 The `todo` tool

The list is **real, per-session state**: every mutation is written to plugin
storage under a session-scoped key, and every read returns exactly what is
stored. Nothing here is ephemeral UI text.

| Action | Arguments | What it does |
|---|---|---|
| `list` | — | Read back the stored list for this session |
| `open` | — | Every unfinished todo across all sessions, ordered by priority then recency |
| `write` | `todos[]` (required) | **V1 `todowrite` parity** — replace the whole list |
| `add` | `content` `[status]` `[priority]` | Append one item |
| `update` | `id` `[content]` `[status]` `[priority]` | Change one item by id (exact or unambiguous prefix); an unknown status/priority is refused |
| `complete` | `id` | Mark one item completed |
| `clear` | — | Wipe the list |

`status`: `pending` · `in_progress` · `completed` · `cancelled`
`priority`: `high` · `medium` · `low`

A `write` item may carry an `id`; when it does, the existing item keeps its
identity and `createdAt`, so a rewrite is a true edit rather than a new list.
Blank items are dropped and unknown status/priority fall back to
`pending`/`medium`. `write` requires `todos`: a `write` with none is refused and
changes nothing. `update` is stricter — an out-of-vocabulary status or priority
is refused with the allowed set named, never silently defaulted. `open` sorts by
priority (`high` → `medium` → `low`) then by most-recently updated, so the order
is deterministic for a given set of rows; exact (priority, `updatedAt`) ties keep
their input order.

---

## 📋 The sidebar checklist

`tui.tsx` renders the stored list read-only in the `sidebar.content` slot. It
refreshes on `rpc.todo.changed` and falls back to a slow poll, so it also works
against a remote server whose events this TUI is not subscribed to.

Rendering rules — **decided, not configurable**:

- **No todos** → nothing renders.
- **Header** → one row while the list is non-empty: an ASCII toggle (`v`
  expanded, `>` collapsed), a space, then `Todos n/n` where the first `n` is the
  closed count. The collapsed and expanded headers share the same column offset.
- **Any pending / in_progress** → the full checklist; closed lines are muted.
- **All completed / cancelled** → auto-collapses to the header, `> Todos n/n`
  with `n == total`, so finished work leaves closure without a stale list.
- **Every row is columns** → a one-cell mark column, its guaranteed separator,
  then the value. Marks are single cells: `-` pending, `~` in_progress, `x`
  completed, `/` cancelled. For single-cell text the value is clipped to a
  28-cell budget so a long todo cannot wrap the sidebar, and a note count stays a
  suffix (` (2 notes)`); a wide-character content value is clipped at render time
  instead, so the row still cannot wrap. The marks, the toggle, and the ellipsis
  are single-cell and narrow.
- **Click the header to toggle** — a manual choice wins for that session. The
  removed V1 sidebar had the same toggle; this one works at any list length, not
  only above two items.

Storage never auto-prunes. Items change only when the caller mutates them
(`write`, `clear`, or a per-item action). The render rules are what keep the
surface quiet — the data keeps the history.

---

## 💾 Storage

Plugin storage under `todos/session/<sessionID>`, durable in the host's SQLite
store. The list is keyed by session id, so it is scoped to the calling session
and survives across turns and server restarts.

```jsonc
{ "version": 1, "todos": [
  { "id": "m1a2b", "content": "write docs", "status": "pending",
    "priority": "medium", "createdAt": 0, "updatedAt": 0 }
] }
```

---

## 🧩 Layout

A local directory plugin is resolved by **filename at the plugin root** — the
`package.json` `exports` map is only consulted for installed (named) packages —
so the entries sit at the root:

```
index.ts         server plugin: the `todo` tool + the RPC implementation
tui.tsx          CLI plugin: sidebar checklist renderer
contract.ts      shared RPC contract (plain JSON Schema, no bare imports)
```

- **As a package** (`"plugins": ["oc-todo"]`): `exports["."]` → `index.ts`,
  `exports["./tui"]` → `tui.tsx`.
- **As a local directory** (`"plugins": ["./plugins/oc-todo"]`): the same files
  at the directory root.

---

## ⚠️ V2 note

Both entrypoints are deliberately dependency-free at load time: `index.ts`
exports a plain `{ id, setup }` definition and the shared contract is a plain
object. That is always valid — `Plugin.define` and `Rpc.define` are identity
helpers — and it also keeps the plugin loadable where the bare
`@opencode/plugin` specifier is not resolvable from a local directory plugin
(observed on the stock 2.0.22 binary, 2026-10). The TUI entry keeps
`@opencode/plugin/tui`, which the TUI runtime injects.

## License

[MIT](LICENSE) © 2026 nathwn12
