# opencode-beads-sidebar

[![CI](https://github.com/nycdubliner/opencode-beads-sidebar/actions/workflows/ci.yml/badge.svg)](https://github.com/nycdubliner/opencode-beads-sidebar/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/opencode-beads-sidebar)](https://www.npmjs.com/package/opencode-beads-sidebar)

Shows your current [beads](https://github.com/gastownhall/beads) plan — and how far
through it you are — in the [OpenCode V2](https://opencode.ai/v2) sidebar.

![The Beads panel following a plan from 0% to 100% as its tasks close](https://raw.githubusercontent.com/nycdubliner/opencode-beads-sidebar/main/docs/beads-burndown.gif)

```
▼ Beads bt-avj 75% (3/4)
[✓] Extract dice geometry
[✓] Add face normals
[✓] Numerals flush with surface
[○] Update smoke test
```

Beads is durable and dependency-aware; opencode's todos die with the session.
This puts the durable plan where you already look.

This is a TUI plugin only. It pairs well with
[`opencode-beads`](https://github.com/joshuadavidthomas/opencode-beads), which
covers the server side — `bd prime` context injection, `/bd-*` commands, a task
subagent — and renders nothing. Neither needs the other.

## Install

Needs [`bd`](https://github.com/gastownhall/beads) on your `PATH` and
**OpenCode ≥ 2.0.32**. This branch targets the V2 CLI plugin API; use package
version `0.1.1` for legacy V1 installations.

Add the package to the global `~/.config/opencode/cli.json` (or
`$XDG_CONFIG_HOME/opencode/cli.json`):

```json
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": ["opencode-beads-sidebar"]
}
```

Merge this into your existing configuration, preserving other plugins. V2
uses `cli.json`, not V1's `tui.json`; there is no project-local `cli.json`.
For an unpublished migration checkout, use the absolute checkout path instead
and build it first (see [Hacking on it](#hacking-on-it)). The npm `0.1.1`
release remains V1 until a V2 release is published.

Open a session in a repo with a `.beads` directory. The active session's actual
worktree root is resolved through the V2 client, including sessions launched
from subdirectories and linked Git worktrees. While a session is loading or
a location lookup fails, the panel and its actions stay inactive rather than
operating on another workspace. Run `/bd-refresh` to retry a failed lookup.

`bd` runs on the machine running the TUI. Use this plugin only when the
server's project paths refer to that same filesystem; remote-server paths
are not translated or executed remotely.

## What it shows

The panel picks what to display in this order:

1. an epic you pinned with **Beads: focus an epic**
2. the epic owning the bead `bd` last touched — this is what makes it follow
   along as the agent works
3. otherwise, the workspace's in-progress and ready work

In a repo with no `.beads` directory it renders nothing at all — no empty box,
no error.

Glyphs match `bd statuses`, so the panel reads like the CLI:

| glyph | meaning |
|---|---|
| `✓` | closed |
| `◐` | in progress |
| `○` | ready — open, nothing blocking it |
| `●` | blocked |
| `❄` | deferred |

Blocked is inferred rather than read: beads leaves a blocked issue's status as
`open`, so anything open that `bd ready` doesn't return is shown as blocked.

## Commands

In the command palette (`ctrl+p`), and as slash commands.

| command | slash | what it does |
|---|---|---|
| Beads: focus an epic | `/bd-focus` | pin the panel to one epic for this session |
| Beads: clear focus | `/bd-unfocus` | go back to following the last-touched bead |
| Beads: start work | `/bd-start` | `bd update <id> --status in_progress` |
| Beads: close | `/bd-close` | `bd close <id>` |
| Beads: reopen | `/bd-reopen` | `bd reopen <id>` |
| Beads: refresh | `/bd-refresh` | drop the cache and re-read |

Clicking a row opens that bead's details.

Actions go through a picker rather than a cursor in the panel. Cancelling a
picker leaves beads unchanged. Switching sessions while a picker is open
keeps that action bound to the workspace in which it started.

Keybindings are yours to set in `cli.json` under `keybinds`, using flat command
IDs (not a nested `beads` object):

```json
{
  "keybinds": {
    "beads.focus": "<leader>bf",
    "beads.refresh": "<leader>br"
  }
}
```

Focus pins are per session and saved in V2 plugin storage, including across
hot reloads and TUI restarts. Legacy V1 KV pins are not migrated; run
`/bd-focus` once to restore a pin after upgrading.

## What it does to your data

Reads run as `bd --readonly` and can't modify anything. The only writes are the
three commands you invoke explicitly — start, close, reopen — and each is
reversible with `bd`.

`bd` is invoked directly rather than through a shell, so bead titles and ids are
passed as arguments and never interpreted as shell commands; ids sourced from
`.beads/last-touched` or bd's own JSON are additionally validated before use, so
a crafted id can't be smuggled in as a flag. The plugin makes no network calls or telemetry requests. `bd` can have its own
usage metrics; set `BD_DISABLE_METRICS=1` to disable those for the TUI and its
subprocesses. CI uses that opt-out for real-bd integration tests.

One caveat worth knowing: if the agent is also editing beads while you act on
one, `bd` is last-write-wins. The panel re-reads after every write so it won't
show you a state the agent has already moved past.

## Configuration

The panel appends to V2's `sidebar.content` slot. V2 no longer exposes V1's
numeric panel ordering, so exact placement relative to other plugins follows
their enable order. The old `internal:sidebar-todo` override does not apply.

**Trace what it's doing.** Set `BEADS_SIDEBAR_DEBUG=/tmp/beads.log` to log
refreshes, scope resolution, and pinning.

## How it stays cheap

A `bd` call costs 0.3–0.6s, far too slow to sit on a render. So the panel polls
a signature of the `.beads` directory — newest mtime, depth- and count-capped —
and only shells out when something actually changed. An idle repo costs one
`bd` run at startup and nothing after.

`.beads/last-touched` looks like the obvious change signal but isn't one: it
records the bead you last *viewed*, so `bd show` rewrites it while `bd close`
doesn't. It's still used to decide which epic to follow, just not to detect
change. The visible consequence: closing a bead from the CLI updates progress
right away, but doesn't by itself move the panel's attention to another epic.

## Hacking on it

Use Node ≥ 26.4 (required by the V2 OpenTUI development dependencies).

```bash
git clone https://github.com/nycdubliner/opencode-beads-sidebar
cd opencode-beads-sidebar && npm install
```

Then point `~/.config/opencode/cli.json` at the checkout:

```json
{ "plugins": ["/absolute/path/to/opencode-beads-sidebar"] }
```

Before sending a change:

```bash
npm run build       # compile src/ → dist/ (the plugin loads dist, even from a checkout)
npm run lint        # biome
npm run typecheck   # tsc --noEmit
npm test            # node --test
```

The unit tests cover the non-JSX modules (`bd.ts`, `scope.ts`, `commands.ts`, `store.ts`, `session.ts`)
— everything that can run under plain Node. The `.tsx` files need opencode's
live renderer and are exercised only by the host. `test/integration.test.ts`
runs against a real `bd` from your `PATH` and skips itself when there isn't
one; CI runs it on a macOS runner with `brew install beads`.

The root `tui.js` shim is required for V2 directory installs, which resolve
`<checkout>/tui` rather than the package export. It forwards to the same
precompiled `dist/tui.js` used by npm installs.

A path-loaded plugin uses its own `node_modules` at runtime, so `npm install`
isn't optional, and the installed `@opentui/*` must match the version opencode
itself runs. The dev pins track `@opencode/plugin`'s own peer range, which
is what keeps a plain `npm install` conflict-free; the package declares
`@opentui/*` as peer dependencies so a published install lets opencode pick
versions matching itself — which is why the npm install route is the robust
one.

For manual V2 verification, load the built checkout, switch between sessions
in different worktrees, pin/unpin an epic, cancel each picker, run start/close/
reopen, click a row, edit beads externally, and hot-reload/disable the plugin.
Check that old timers stop and navigation cannot redirect a pending action.
`opencode plugin check` alone is not a runtime compatibility test.

Three things here are load-bearing and easy to undo by accident. Each one fails
by rendering an empty panel rather than raising an error, so none of them
announce themselves:

- **What ships is `dist/tui.js`, compiled by `npm run build` — never raw
  `.tsx`.** opencode's runtime Solid transform explicitly skips files under
  `node_modules`, so raw `.tsx` in a published install falls back to Bun's
  plain jsx-runtime: every reactive expression is evaluated exactly once, the
  panel renders its mount-time values, and no update ever re-renders — no
  error, just a frozen panel. The build (`scripts/build.mjs`) bakes in the
  Solid *universal* transform (`moduleName: "@opentui/solid"`) and leaves
  `solid-js`/`@opentui/*` imports bare so the host maps them onto its own
  runtime instances at load. Rebuild after editing `src/` — the dev path
  install loads `dist/` too.
- **Background refreshes must run under the panel's reactive owner.** The store
  captures `getOwner()` from inside the component body — not from the slot
  callback, which runs outside the tracking scope — and commits through
  `runWithOwner`. Without it, re-rendering throws `No renderer found`.
- **Don't wrap the render path in a `try`/`catch` that swallows.** opencode's
  slot registry already replaces a throwing plugin with an empty placeholder,
  so a second layer of swallowing makes failures invisible.

## License

MIT
