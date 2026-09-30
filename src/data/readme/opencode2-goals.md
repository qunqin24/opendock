# opencode2-goals

![CI](https://github.com/wukrit/opencode2-goals/actions/workflows/ci.yml/badge.svg)
![license](https://img.shields.io/badge/license-Unlicense-blue)

An [OpenCode](https://opencode.ai/v2/docs/) **v2** plugin that implements a
Codex-style goal loop: durable, session-scoped goal state; a `/goal` command
surface; the objective injected into every model call; event-driven
continuation on turn boundaries; an evidence-gated completion tool; stall suppression;
budget caps safe by default; an unattended permission sandbox; and a live TUI
progress widget in the sidebar.

![The goal loop in the OpenCode TUI: /goal commands drive a durable goal whose live status, budget counters, and task breakdown render in the sidebar](demo.gif)

## What it does

### Commands — for you

| Command | Effect |
| --- | --- |
| `/goal set <objective> [--turns N] [--tokens N] [--unbounded]` | Start the loop. No flags = **10-turn / 100,000-token cap**; `--unbounded` (also `--no-cap`, `--unlimited`) opts out of numeric limits. |
| `/goal view` | Full state: status, budget usage, tasks, evidence, outcome. |
| `/goal pause` / `/goal resume` | Halt or re-arm continuation without losing state. |
| `/goal complete <evidence>` / `/goal block <reason>` | Terminal outcomes, same gates as the tools below. |
| `/goal clear` | Remove the goal (archived first — see Durability). |
| `/goal task add <title>` / `/goal task <n> todo\|doing\|done` | Drive the task breakdown from the keyboard (either order: `task 1 done` or `task done 1`). |
| `/goal history` | Every terminal or superseded goal this session produced (`log` is an alias). |

Verbs have aliases: `status` (`view`), `done` (`complete`), `blocked` (`block`),
`tasks` (`task list`). `--cap N` is an alias for `--turns N`, and a bare
`/goal <objective>` means `/goal set <objective>`.

### Tools — for the model

| Tool | Gate |
| --- | --- |
| `goal_set(objective, turns?, tokens?, unbounded?)` | Refuses while a non-terminal goal exists — the model can't clobber yours, and cap defaults match `/goal set`. |
| `goal_complete(evidence)` | Evidence ≥24 chars with a checkable anchor (path, number, test result), grounded in transcript tokens when history is available. Weak claims are rejected; the goal stays `active`. |
| `goal_block(reason)` | Requires a specific reason; the sanctioned "I can't proceed" exit. |
| `goal_clear(request)` | Must quote the user's own clearing ask, grounded against **non-assistant** transcript text — assistant prose can't launder it, and no transcript fails closed. |
| `goal_add_task(title)` / `goal_update_task(ref, status)` | None (active goal required); the widget stays in sync. |
| `goal_history()` | Read-only. |

### The loop

- The objective is re-injected into **every** agent-loop model call via
  `session.hook("context")`, keeping focus across long runs.
- Turn boundaries come from terminal `session.execution.*` events —
  `session.idle` is not delivered to plugins in this build. Exactly one
  continuation is injected per boundary, deduped by event id and scoped to
  the session's owning project.
- A continuation that makes no tool call counts as a **stall**; reaching a
  cap produces the distinct `budget_limited` outcome — neither completion
  nor blocked.

### Durability

- Goal state is stored per session (`goal/<sessionID>`) and survives reloads
  and restarts.
- Terminal goals — and any active goal superseded by a new `set` — are
  archived under `goal/<sessionID>/archived/<goalID>`, so outcomes, budgets
  consumed, and evidence survive across goal replacements.

### Safety

- Caps by default; `--unbounded` is always an explicit opt-in.
- **Permission sandbox:** while a goal is `active`, in-scope path requests
  are auto-allowed and out-of-scope ones auto-denied with a message steering
  the model to `goal_block`. Configured `deny` rules are never widened.
- Evidence gating is a **heuristic**, not semantic verification — see
  `src/evidence.ts` and *Safe configuration*.

## Status outcomes

`active · paused · completed · blocked · budget_limited · stalled · cleared`

## Requirements

- OpenCode v2 (`@opencode/plugin` 2.x). Built and live-verified on
  **2.0.15/2.0.16** (npm install, directory install, and the TUI widget);
  weekly CI ([Host compatibility](.github/workflows/compat.yml)) re-checks the
  type surface against the **latest 2.x** *and* boots a real isolated host to
  verify the plugin still loads. Run it any time with
  `gh workflow run compat.yml`.
- Bun, for tests, typecheck, and building the widget entry.

## Install

### From npm

```jsonc
// ~/.config/opencode/opencode.jsonc
{
  "plugins": [
    { "package": "opencode2-goals", "options": {} }
  ]
}
```

Shorthand works too (`"plugins": ["opencode2-goals"]`), but **prefer pinning**:
`"opencode2-goals@1.0.4"`. The host's `@latest` resolution caches aggressively
and may keep serving an older version for a while after a publish, so a pin
also gives you a knowingly-upgradeable install. (`npm view opencode2-goals
version` shows the current release. And note the `2`: the legacy npm name
`opencode-goals` belongs to an unrelated package.)

### From source (local directory)

```sh
git clone https://github.com/wukrit/opencode2-goals.git ~/Projects/opencode2-goals
```

```jsonc
{ "plugins": [{ "package": "/path/to/opencode2-goals", "options": {} }] }
```

With options (all optional):

```jsonc
{
  "package": "opencode2-goals",
  "options": {
    "stallLimit": 1,
    "defaultCapTurns": 10,
    "defaultCapTokens": 100000,
    "continuationText": "Continue the goal. End the turn with a tool call."
  }
}
```

`continuationText` replaces the default continuation prompt (the message
injected at each turn boundary); the other options set the stall tolerance and
the default caps that `/goal set` applies when no flags are given.

Then reload locations:

```sh
opencode api post /api/location/reload
```

A local (directory) install cannot resolve `@opencode/plugin`, so the runtime
entry imports only local modules and declares the context shape structurally.

## Usage

```sh
# in a session:
/goal set Land the release --turns 8
/goal view
/goal task add Write migration
/goal task 1 doing
/goal task done 1
/goal complete tests: 42/42 pass at commit abc123, output in build/log.txt
/goal block Waiting on credentials for the staging cluster
/goal pause
/goal resume
/goal clear
/goal history
```

The model can maintain the same breakdown with `goal_add_task(title)` and
`goal_update_task(ref, status)` — the widget stays in sync.

Unattended goals: rely on the default cap, keep work inside the session
working directory, and let the permission sandbox deny the rest. If a goal
genuinely needs no numeric limit, pass `--unbounded` explicitly.

## Live progress widget (sidebar)

The server exposes `goals.get({ sessionID })` and emits `goals.updated` on
every write (see `src/rpc.ts`). The TUI entry (source `src/tui.tsx`, shipped
as the pre-compiled `./tui` export) renders a live sidebar block in three
sections — objective; a counter grid
(`Status:`, `Turns:`, `Tokens:`, `Tasks:` sharing one label column) with a
task-progress bar; and the task list — updating via the RPC event, no
polling. Colored accents collapse to base text on light themes so the widget
stays legible in both modes.

With a **from-source (directory) install, no extra configuration is needed** —
the TUI discovers the `./tui` entry from the same location and renders the
widget automatically alongside the server plugin.

```jsonc
// opencode.jsonc — everything works from one directory entry
{ "plugins": [{ "package": "/path/to/opencode2-goals" }] }
```

The npm install renders the widget too: since v1.0.2 the `./tui` entry ships
pre-compiled (`dist/tui.js`), because the host's Solid/JSX transform skips
`.tsx` under `node_modules` — see [issue #3](https://github.com/wukrit/opencode2-goals/issues/3)
for the full root-cause writeup. No `cli.json` entry is required for either
install shape; adding one on top of a working location just duplicates the
widget.

## Safe configuration

- Keep each loaded location on a distinct project (the default). The plugin
  scopes continuation and permission decisions to the session's owning project;
  two locations sharing one project id would both act, and `ctx.storage` has
  no compare-and-set to arbitrate them.
- Run a single server process against the plugin DB. Two servers sharing one
  `opencode.db` race on last-write-wins storage.
- Treat evidence as a heuristic gate, not proof. A second-model or shell-check
  evaluator is out of scope; see `src/evidence.ts`.

## Development

```sh
bun install
bun run typecheck
bun test
bun run build:tui   # compiles the widget to dist/tui.js (also runs via prepack on publish)
```

If you change `src/tui.tsx`, run `bun run build:tui` before testing the
**npm** install shape — `exports["./tui"]` serves `dist/tui.js` (see issue #3
for why); directory installs compile the source directly.

### Releasing

Maintainers: bump `package.json`, date the `[Unreleased]` section in
[CHANGELOG.md](CHANGELOG.md), then push a tag —
`.github/workflows/release.yml` verifies the tag, runs typecheck + tests,
publishes to npm with **OIDC provenance**, and creates the GitHub release
with notes from the changelog:

```sh
git tag v1.0.4 && git push origin v1.0.4
```

Full flow and the trusted-publishing caveat are in
[CONTRIBUTING.md](CONTRIBUTING.md).

> **First CI publish:** npm does *not* auto-register trusted publishers — and
> trusted publishing needs **npm 11+** (the workflow runs node 24). Enable the
> publisher once on npmjs.com → package → **Access** tab → *Trusted publishing*
> → owner `wukrit`, repo `opencode2-goals`, workflow `release.yml`.

## Layout

```
index.ts            # loader entry: { id, setup } + goals RPC
demo.gif            # goal-loop demo for the README (recording flow in CONTRIBUTING)
tui.tsx             # top-level TUI shim (re-exports src/tui.tsx for directory-install discovery)
src/
  controller.ts     # the goal loop (commands, tools, hooks, events, permission sandbox, goal archive)
  state.ts          # durable goal record + tasks + pure transitions + archive keys
  command.ts        # /goal parsing (caps, --unbounded, tasks, history) + status formatting
  rpc.ts            # goals.get / goals.updated for the widget (import-free)
  tui.tsx           # sidebar progress widget source (pre-compiled to dist/tui.js, the ./tui export)
  evidence.ts       # completion-evidence gate + user-request gate for goal_clear
  permission.ts     # path sandbox (decidePermission, fail-closed containment)
  options.ts        # plugin options (stallLimit, continuationText, defaultCapTurns/Tokens)
  types.ts          # structural slice of the plugin context
dist/
  tui.js            # built widget (gitignored; produced by scripts/build-tui.ts)
scripts/
  build-tui.ts      # compiles src/tui.tsx with the host's own @opentui/solid bun-plugin
  live-smoke.sh     # boots an isolated real host and asserts /goal is registered (no model call)
  logcheck.py       # timestamp-accurate plugin-load verification against the opencode log
test/
  harness.ts        # mocked context + deterministic event bus (+ permission hook)
  goal-loop.test.ts # integration tests through the real setup()
  tasks.test.ts     # tasks + widget-bridge integration tests
```

## Changelog

Release history lives in [CHANGELOG.md](CHANGELOG.md) — GitHub releases reuse
its sections as notes.

## License

Released into the public domain under [The Unlicense](LICENSE). No
attribution required, no warranty of any kind.
