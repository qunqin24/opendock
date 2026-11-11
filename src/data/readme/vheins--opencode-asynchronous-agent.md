# @vheins/opencode-asynchronous-agent

[![npm version](https://img.shields.io/npm/v/@vheins/opencode-asynchronous-agent.svg)](https://www.npmjs.com/package/@vheins/opencode-asynchronous-agent)
[![npm downloads](https://img.shields.io/npm/dm/@vheins/opencode-asynchronous-agent.svg)](https://www.npmjs.com/package/@vheins/opencode-asynchronous-agent)
[![license: MIT](https://img.shields.io/npm/l/@vheins/opencode-asynchronous-agent.svg)](./LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/vheins/opencode-asynchronous-agent.svg)](https://github.com/vheins/opencode-asynchronous-agent/stargazers)
[![OpenCode](https://img.shields.io/badge/opencode-%3E%3D1.18.0-6e56cf.svg)](https://opencode.ai)

An [OpenCode](https://opencode.ai) plugin that makes every subagent call run
**asynchronously in the background** — automatically — **plus a TUI sidebar
monitor** for those background subagents.

Run every OpenCode subagent asynchronously in the background, with a live TUI
sidebar that tracks each child's activity, todo progress, elapsed time, and
token usage. The plugin forces `background = true` on every subagent call so the
parent never blocks, and it ships opt-in control tools, event-driven progress
reports, and an opt-out database cleanup layer. Everything is configured through
optional environment variables, so the defaults just work.

## Table of contents

- [How it works](#how-it-works)
- [Install](#install)
  - [From npm (recommended)](#from-npm-recommended)
  - [From a local checkout](#from-a-local-checkout)
  - [Register it](#register-it)
  - [Restart the service](#restart-the-service)
- [Configuration](#configuration)
  - [Examples](#examples)
- [Subagent status tool (opt-in)](#subagent-status-tool-opt-in)
  - [Liveness is measured by progress, not by activity](#liveness-is-measured-by-progress-not-by-activity)
  - [A running tool call is proof of life](#a-running-tool-call-is-proof-of-life)
- [Subagent control tools (opt-in, V1 only)](#subagent-control-tools-opt-in-v1-only)
  - [One source of truth](#one-source-of-truth)
  - [What a child list tells you](#what-a-child-list-tells-you)
  - [subagent_send checks liveness first](#subagent_send-checks-liveness-first)
  - [Following a long-running child](#following-a-long-running-child)
  - [Parent-agent filter on V1](#parent-agent-filter-on-v1)
- [Subagent progress reports (V1 only, on by default)](#subagent-progress-reports-v1-only-on-by-default)
  - [Completion notices (V1 only, on by default)](#completion-notices-v1-only-on-by-default)
- [Database cleanup (V1, opt-out)](#database-cleanup-v1-opt-out)
- [Behaviour notes](#behaviour-notes)
- [Files](#files)
- [Requirements](#requirements)
- [License](#license)

Works on **both** OpenCode V1 (`>=1.18.0`) and V2 (`>=2.0.0`):

- **`./server`** — the tool hook that forces `background = true`
- **`./tui`** — the sidebar monitor: a Saffteen-style collapsible InfoCard stack
  (activity/result, provider token report, task progress, workspace) plus
  per-subagent cards (title, activity, todo, elapsed time, Tools count, context
  used with percent). The async-agent identity
  is preserved: running/done/error/total counts, per-subagent elapsed time,
  **total tokens**, and a compact one-line status bar when the
  sidebar is collapsed.

```
Subagents · 3 runs
● 1 run · ✓ 1 done · ✕ 1 err · Σ 3
```

The sidebar renders a collapsible InfoCard stack. The `Subagents · N runs` aggregate is
rendered exactly once; each subagent appears as a single card (not a row plus a
card) showing its session title, activity, todo, elapsed time, tool-call count,
and context used with percent of the model limit. A child that
finished its turn stays visible with a **`Done`** label (rather than
disappearing), so the parent can see the subagent still exists and can be
messaged again. Each subagent card title also carries the child's todo progress
as **`completed/total`** (e.g. `Frontend · Working · 3/5`), read reactively from
the host sync store, so the parent can gauge progress without opening the child.
Running agents are listed **above** finished ones, so the live work stays at the
top of the sidebar. A finished card freezes its elapsed time at the child's last
activity instead of ticking forever. Clicking a subagent card navigates to that
subagent's session.

Above the `Creatures` card sit two animated progress bars: the main agent's own
todo completion, and the cumulative completion across the **currently active**
subagents only (finished children are excluded so they stop inflating the total).
Each bar is labelled `completed/total · NN%` and its fill tracks the real ratio
with sub-cell (eighth-block) precision; the color ramps from muted through accent
to success as progress rises, and a slow sweep highlights the filled region so a
live bar reads as loading without changing the level it reports. A bar with
nothing to report (`total` 0) collapses entirely, and the shared animation clock
stops whenever no bar has work left. The bar width scales with the terminal
between a sane minimum and maximum.
The `app_bottom` line mirrors the aggregate when the sidebar is collapsed. Status
segments are color-coded from the active theme: run (`accent`), done (`success`),
err (`error`), total (`textMuted`). The line also shows the size of the in-use
`opencode.db` in human-readable units (KB/MB/GB/TB), resolved with the same path
logic as the cleanup module and refreshed on a slow poll so it never adds
per-frame disk IO; a placeholder is shown when the database is unavailable.

OpenCode V2 ships a keybind (`ctrl+b`, command `session.background`) that moves a
*running* foreground subagent into background observation. This plugin gives you the
same outcome **without pressing anything**: the moment the parent agent invokes the
subagent tool, the call is forced into background mode, so the parent returns
immediately with a "working in the background" notice and is notified when the child
finishes.

> **Why:** blocking on a subagent stalls the parent for the entire duration of the
> child's work. Launching it in the background lets the parent keep working on
> non-overlapping tasks and get pinged on completion — the async pattern the
> `background` flag was designed for.

---

## How it works

The plugin registers a single tool hook:

```js
await ctx.tool.hook("execute.before", (event) => {
  if (event.tool === "subagent" || event.tool === "task") {
    event.input.background = true
  }
})
```

`execute.before` runs right before a tool executes and hands the callback a **mutable**
event. Replacing or mutating `event.input` changes the arguments the tool actually
executes with — the official V2 plugin docs describe this hook as *"inspect or replace
tool input before execution."* OpenCode relies on this itself: the built-in
`opencode.tool.input.repair` plugin rewrites `event.input` for every tool, and another
built-in fixup rewrites `event.input` for the subagent tool. Setting
`event.input.background = true` is therefore all that is needed.

There is **no experimental flag** involved. In OpenCode `v2.0.x`, `background` is a
first-class, always-available field of the subagent tool schema:

```
{ agent, description, prompt, model, sessionID, background }
```

Only *nested* subagents are gated (by `experimental.subagent_depth`), which is a
separate concern.

### Tool id across versions

The subagent tool is named **`subagent`** in current V2 builds. Older builds named it
**`task`**. The plugin matches **both** ids so it keeps working across versions.

---

## Install

### From npm (recommended)

```sh
opencode plugin @vheins/opencode-asynchronous-agent --global
```

That installs the **server** hook (subagents run in the background). For the
**TUI monitor**, add the same package to `~/.config/opencode/tui.json` as well:

```jsonc
// opencode.json — server hook (V1 uses `plugin`; V2 uses `plugins`)
{ "plugin": ["@vheins/opencode-asynchronous-agent"] }

// tui.json — TUI monitor (V1 TUI config; V1 does not read cli.json)
{ "$schema": "https://opencode.ai/tui.json", "plugin": ["@vheins/opencode-asynchronous-agent"] }
```

One package, two entrypoints: the loader resolves `./server` for the server
config and `./tui` for the TUI config (a single module may not export both).

### From a local checkout

Clone this repo somewhere stable, e.g.:

```sh
git clone https://github.com/vheins/opencode-asynchronous-agent.git \
  ~/.config/opencode/plugins/opencode-asynchronous-agent
```

### Register it

Add the plugin directory to the top-level `plugins` array in your OpenCode config
(`~/.config/opencode/opencode.json` for a global install):

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    "~/.config/opencode/plugins/opencode-asynchronous-agent"
  ]
}
```

Use an absolute path if your OpenCode build does not expand `~`.

### Restart the service

Plugin and config changes are picked up on restart:

```sh
opencode service restart
```

That's it. The next time the parent agent spawns a subagent, it will run in the
background.

---

## Configuration

All configuration is optional and read from environment variables at setup time.

| Variable | Default | Description |
| --- | --- | --- |
| `OPENCODE_AUTO_BG_SUBAGENT` | *(enabled)* | Set to `0`, `false`, `off`, or `no` to disable the plugin entirely. |
| `OPENCODE_AUTO_BG_AGENTS` | *(all)* | Comma-separated allowlist of **parent** agent ids. When set, only these parents auto-background their subagents. |
| `OPENCODE_AUTO_BG_EXCEPT` | *(none)* | Comma-separated denylist of **parent** agent ids. These parents never auto-background their subagents. |
| `OPENCODE_AUTO_BG_DEBUG` | *(off)* | Set to `1` to log each rewrite to stderr. |
| `OPENCODE_SUBAGENT_NOTIFY` | *(enabled)* | TUI monitor only. Set to `0`, `false`, `off`, or `no` to disable the toast shown when a background subagent finishes (`done`/`error`). |
| `OPENCODE_SUBAGENT_TASK_PROGRESS` | *(off)* | TUI monitor only. Set to a truthy value (`1`, `true`, `on`, …) to show the "Task progress" card. Hidden unless explicitly enabled. |
| `OPENCODE_SUBAGENT_STATUS` | *(off)* | Opt-in. Set to a truthy value (`1`, `true`, `on`, `yes`) to register the `subagent_status` server tool. Also enables the control tools. |
| `OPENCODE_SUBAGENT_STALE_MS` | `120000` | Age (ms) without **progress** after which a still-running child is reported as `stale`. A warning only. |
| `OPENCODE_SUBAGENT_DEAD_MS` | `600000` | Age (ms) without progress after which a child is reported as `dead` — actionable: cancel and re-dispatch. |
| `OPENCODE_SUBAGENT_TOOL_GRACE_MS` | `1800000` | How long (ms) a single in-flight tool call keeps counting as proof of life. A child inside this window is never reported stale. |
| `OPENCODE_SUBAGENT_DONE_RETENTION_MS` | `3600000` | How long a finished (`done`/`error`/`stale`/`dead`) record is kept before eviction. |
| `OPENCODE_SUBAGENT_PENDING_TTL_MS` | `600000` | Lifetime (ms) of an armed completion notice before it is pruned, so the pending map cannot leak. |
| `OPENCODE_SUBAGENT_CONTROL` | *(off)* | Opt-in. Set to a truthy value to register the five control tools (`subagent_children`, `subagent_result`, `subagent_cancel`, `subagent_send`, `subagent_watch`). |
| `OPENCODE_SUBAGENT_RESULT_CHARS` | `20000` | Cap for the text `subagent_result` returns. |
| `OPENCODE_SUBAGENT_WATCH_MAX_MS` | `30000` | Hard cap on `subagent_watch`'s `timeoutMs`, so it can never block the parent for long. |
| `OPENCODE_SUBAGENT_NUDGE` | *(off)* | Opt-in. Set to a truthy value to automatically resume **orphaned** children (see [Orphan resume nudges](#orphan-resume-nudges-v1-only-opt-in)). |
| `OPENCODE_SUBAGENT_NUDGE_AFTER_MS` | `300000` | Age (ms) without progress before a child becomes eligible for a resume nudge. |
| `OPENCODE_SUBAGENT_NUDGE_MAX` | `2` | Maximum resume attempts per child before it is left `dead` and reported once. |
| `OPENCODE_SUBAGENT_NUDGE_CHECK_MS` | `60000` | Spacing (ms) between nudge ticks. |
| `OPENCODE_SUBAGENT_NUDGE_PROMPT` | *(built-in)* | Override the resume prompt text. |
| `OPENCODE_SUBAGENT_NUDGE_DEBUG` | *(off)* | Set to `1` to log each nudge decision to stderr. |
| `OPENCODE_SUBAGENT_PROGRESS` | *(chat)* | Progress-report mode (legacy). Truthy (`1`/`true`/`on`/`yes`) injects the report into the parent session as a text part; `0`/`false`/`no`/`off` shows a transient TUI toast instead (no model turn); unset/other values disable it. When unset, the default channel is `chat`. |
| `OPENCODE_SUBAGENT_NOTIFICATION_TYPE` | `chat` | Progress channel: `toast` \| `chat` \| `inline` \| `both` \| `off`. Overrides `OPENCODE_SUBAGENT_PROGRESS`. |
| `OPENCODE_SUBAGENT_PROGRESS_MS` | `300000` | Minimum interval (ms) between two progress reports for the same child. |
| `OPENCODE_SUBAGENT_PROGRESS_MAX` | `5` | Max non-final progress reports per child (the final report is never capped). |
| `OPENCODE_SUBAGENT_COMPLETION_NOTIFY` | `inline` | Completion-notice channel for `subagent_send` follow-ups: `toast` \| `chat` \| `inline` \| `both` \| `off`. Decoupled from the progress channel; defaults to `inline` (waking) so the notice is never silenced. |
| `OPENCODE_DB_CLEANUP` | *(enabled)* | Set to `0`, `false`, `no`, `off`, or `n` to disable database cleanup entirely. |
| `OPENCODE_DB_CLEANUP_RETENTION_MS` | `259200000` (3 days) | Sessions untouched for longer than this have their `event` rows deleted and their old `part` tool payloads trimmed. |
| `OPENCODE_DB_CLEANUP_INTERVAL_MS` | `21600000` (6 h) | Minimum spacing between cleanup runs. |
| `OPENCODE_DB_CLEANUP_WAL_THRESHOLD` | `67108864` (64 MiB) | WAL size above which the governor issues a `wal_checkpoint(PASSIVE)`, and above which an adaptive prune may run early. |
| `OPENCODE_DB_CLEANUP_WAL_IDLE_MS` | `15000` | Idle window (ms): with no write this recent, the governor `wal_checkpoint(TRUNCATE)`s the WAL. |
| `OPENCODE_DB_CLEANUP_WAL_CHECK_MS` | `30000` | Spacing (ms) between WAL governor ticks. |
| `OPENCODE_DB_CLEANUP_PRUNE_FLOOR_MS` | `1800000` (30 min) | Floor delay (ms) between adaptive prune passes triggered by an oversized WAL. |
| `OPENCODE_DB_CLEANUP_PRUNE_JITTER_MS` | `60000` (60 s) | Max random jitter (ms) added to the floor interval, so multiple processes on the same DB do not prune in lockstep. |
| `OPENCODE_DB_CLEANUP_MAX_OUTPUT_CHARS` | `100000` | Write-time cap for a tool part's `state.output`. |
| `OPENCODE_DB_CLEANUP_MAX_DIFF_CHARS` | `64000` | Write-time cap for edit `metadata.diff`. |
| `OPENCODE_DB_CLEANUP_MAX_DISPLAY_CHARS` | `64000` | Write-time cap for read `metadata.display.text`. |
| `OPENCODE_DB_CLEANUP_MAX_DIAGNOSTICS_CHARS` | `32000` | Write-time cap for `metadata.diagnostics` (emptied to `{}` when exceeded). |
| `OPENCODE_DB_CLEANUP_PART_PREVIEW_CHARS` | `2000` | Length an old tool part's `state.output` is trimmed to during pruning. |
| `OPENCODE_DB_CLEANUP_EVENT_BATCH` | `500` | Max `event` rows deleted per statement during pruning (keeps the SQLite write lock short). |
| `OPENCODE_DB_CLEANUP_PART_BATCH` | `500` | Max `part` rows trimmed per cleanup run. |
| `OPENCODE_DB_CLEANUP_VACUUM` | *(off)* | Set to `1` to `VACUUM` at shutdown after a run that deleted rows (reclaims file space; the DB ships with `auto_vacuum=0`). |
| `OPENCODE_DB_CLEANUP_DEBUG` | *(off)* | Set to `1` to log cleanup decisions to stderr. |
| `OPENCODE_DB` | *(auto)* | Explicit override for the `opencode.db` path. When unset the path is resolved from the OpenCode data directory. Also honoured by the TUI's database-size readout. |

> **OpenCode V1 needs `OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS=true`.** V1 gates
> background subagents behind that flag (or the broader `OPENCODE_EXPERIMENTAL=true`).
> Export it *before* starting OpenCode — e.g. in `~/.zshrc` or `~/.bashrc`:
>
> ```sh
> export OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS=true
> ```
>
> OpenCode V2 always supports background subagents and needs no flag. When the flag is
> missing on V1 the plugin **degrades gracefully**: it leaves the call untouched and
> subagents run in the foreground, instead of failing with
> `Background subagents require OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS=true`.
> A one-line hint is logged to stderr at startup.

### Examples

Only let the `orchestrator` parent fan out into background subagents:

```sh
export OPENCODE_AUTO_BG_AGENTS=orchestrator
```

Background everything **except** the `debugger` parent:

```sh
export OPENCODE_AUTO_BG_EXCEPT=debugger
```

Temporarily disable:

```sh
export OPENCODE_AUTO_BG_SUBAGENT=0
```

> The allowlist/denylist match the **parent** agent — the one calling the subagent
> tool. On V2 `execute.before` carries the caller directly; on V1, which does not,
> the plugin learns the parent agent from the `chat.message` hook and remembers it
> per session. The child's own agent type is not known at call time.

---

## Subagent status tool (opt-in)

OpenCode has no built-in way for an agent to poll the liveness of the background
subagent sessions it spawned: the model is push-only, so the parent is notified
only when a child finishes. Set `OPENCODE_SUBAGENT_STATUS=1` to register a
`subagent_status` server tool that reports every tracked child as
`running` / `stale` / `dead` / `done` / `error`.

```sh
export OPENCODE_SUBAGENT_STATUS=1
```

The plugin subscribes to session events (`session.created`, `session.status`,
`session.idle`, `session.error`, `session.deleted`, message updates, and
`todo.updated`) and keeps an in-memory registry keyed by child session id.

### Liveness is measured by progress, not by activity

A child is not "alive" merely because *something* happened to its session. The
registry keeps two clocks:

- **`lastProgressAt`** — advances only on evidence the child actually did work:
  `message.updated`, `message.part.updated`, `todo.updated`, or a `busy` /
  `retry` session status. This is the only clock staleness reads.
- **`lastEventAt`** — advances on any event, and is kept for display only.

That distinction is the whole point: a `session.updated` event (a title change, a
parent touching the session) must not be able to make a wedged child look busy.

### A running tool call is proof of life

The progress clock alone is not enough. A subagent running `bash` — a build, a
test suite, `bun install` — can legitimately sit for many minutes emitting **zero**
session events. Judging it by message activity alone would report a perfectly
healthy child as `stale`, and then `dead`.

So the registry also tracks **in-flight tool calls**. When a `tool` part enters
`running`/`pending` it is recorded with its real start time; `completed`/`error`
clears it and counts as progress. While a tool call is in flight the child is
`running`, regardless of how old `lastProgressAt` is — bounded by
`OPENCODE_SUBAGENT_TOOL_GRACE_MS` (default 30 min), because a tool call wedged for
longer than that is not plausible work.

Each reported child therefore carries an `activity`:

| `activity` | Meaning |
| --- | --- |
| `tool` | A tool call is executing right now; `activeTool` names it and how long it has run |
| `streaming` | A message/text part advanced recently |
| `idle` | No tool call, no recent output — this is the state that becomes `stale` |

A child inside the tool grace window is described as
`running tool "bash" for 7m — expected for a long build, not stale` rather than
being handed a "consider cancelling" hint.

Two derived states follow from the progress clock:

| Status | Meaning | What to do |
| --- | --- | --- |
| `running` | Progress within `OPENCODE_SUBAGENT_STALE_MS` | Leave it alone |
| `stale` | No progress for `OPENCODE_SUBAGENT_STALE_MS` (default 120 s) | Check `subagent_result`; it may be in a long tool call |
| `dead` | No progress for `OPENCODE_SUBAGENT_DEAD_MS` (default 600 s) | Treat as gone: `subagent_cancel`, then re-dispatch |
| `done` / `error` | Terminal | Read it with `subagent_result` |

`stale` and `dead` are **derived**, never written into the record, so a child that
starts working again (a `subagent_send` follow-up) returns to `running` cleanly.

Two thresholds exist because one is not enough: a single 120 s rule produces
false alarms on legitimate long work. A `bash` build or test run can take five
minutes without emitting a single session event.

On every report the registry reconciles against `client.session.status()`, which
is the arbiter of liveness. A child the SDK reports as `busy` or `retry` is proof
of life right now.

**Absence from that map is not success.** The SDK's status map only carries the
sessions with a live engine — typically `busy`/`retry`, occasionally `idle`. A
child that is simply absent may have finished, or may have wedged, or may be an
orphan left over from an OpenCode restart. Guessing "done" from absence is
therefore wrong, and worse, it makes `dead` unobservable: a wedged child would
read `running → done`, `subagent_result` would return an empty answer, and the
`dead → subagent_cancel` remediation could never fire.

So the plugin only concludes a child has **finished** on a *positive* signal:

- the engine reports `idle` (`session.status` type `idle`, or a `session.idle`
  event), or
- a real final assistant answer exists in the session transcript.

Otherwise the child's lifecycle stays `running` and the derived `stale`/`dead`
tier speaks for it — which is the honest answer when we genuinely do not know
whether it succeeded. A child derived `dead` that is absent from the status map
is additionally confirmed **once** by reading its last message: a recorded
`finish` reason or a terminal `error` resolves it to `done`/`error`, while a
trailing unanswered user prompt keeps it `dead` (that is exactly the shape of a
restart orphan). The confirmation is cached per child, so a repeated report never
turns into a repeated `session.messages` call.

The tool accepts optional `parent` (parent session id) and `status` filters, and
returns a structured report: per-subagent `sessionID`, `title`, `slug`, `agent`,
`parentID`, `status`, `activity`, `activeTool`, `elapsedMs`,
`sinceLastProgressMs`, `sinceLastEventMs`, `stale`, and `dead`, plus aggregate
counts and both thresholds. Each non-terminal child carries an actionable hint,
so the model is told what to do instead of having to infer it. When the registry
is still empty it makes a best-effort hydration call to `client.session.list()`;
if that SDK method is unavailable it reports from events only and never fails.

> **V1 only.** Custom tools and plugin event handlers are registered through the
> V1 `server` entrypoint. The V2 plugin API cannot register either, so on a
> V2-only build the V2 entrypoint no-ops (the V1 `server` entrypoint still
> registers the tool on a dual build). The tool is non-destructive and disposed
> on unload; the background-forcing hook is unaffected.

---

## Subagent control tools (opt-in, V1 only)

Background subagents are push-only: the parent is told when a child finishes, but
it cannot list children, read a child's result on demand, cancel one, or steer a
running one. Set `OPENCODE_SUBAGENT_CONTROL=1` (or `OPENCODE_SUBAGENT_STATUS=1`)
to register five tools that close that gap on top of the public SDK:

| Tool | Purpose |
| --- | --- |
| `subagent_children` | List a parent session's child subagent sessions with their current status. |
| `subagent_result` | Fetch a child's answer — or, while it works, a live activity report or a transcript (`view`: `auto`/`result`/`activity`/`history`). |
| `subagent_cancel` | Abort a running child (for example once a sibling already answered). |
| `subagent_send` | Queue extra context into a child via the non-blocking async prompt endpoint. |
| `subagent_watch` | Return as soon as a child's status *changes*, bounded by a hard timeout. |

There is deliberately no `subagent_wait`. Blocking on a child defeats the
asynchronous model: OpenCode already pushes a completion notice to the parent
when a child finishes, and `subagent_children` / `subagent_result` cover
on-demand status. `subagent_watch` is not a completion wait in disguise — it
watches the in-memory registry for a *state change* and returns immediately when
one happens, capped at `OPENCODE_SUBAGENT_WATCH_MAX_MS` (default 30 s), so the
parent can never be parked indefinitely.

### One source of truth

The status registry is injected into the control suite, so `subagent_children`
and `subagent_status` can no longer disagree about the same child — a bug that
made the tools actively misleading. Each child row reports its `source`
(`registry`, `sdk`, or `unknown`), and an untracked session is reported as
`unknown` rather than being silently assumed idle.

### What a child list tells you

`subagent_children` is a triage view, not a dump of SDK fields. Rows are ordered
running → stale → dead → error → done so live work is always first, and each
child gets its identity plus what it costs:

```
3 children · 2 running · 1 done

● ses_abc123ef  frontend · hidden-panda · "Build checkout UI"  running  4m12s
    tool:bash 2m10s · todo 2/5 · 8 calls (1 err) · 12.3k/200k ctx 6% · last activity 4s ago
◐ ses_ghi789jk  backend · quiet-otter  running  12m04s
    idle · no progress 12m04s                              → subagent_cancel or subagent_result
✓ ses_def456mn  tests · brave-heron  done  1m03s
    todo 5/5 · 21 calls · 48.1k/200k ctx 24% · last activity 3m ago
```

All of this is accumulated **from events the plugin already ingests** — listing
twenty children never costs twenty `session.messages` calls. Token usage takes
the newest assistant message's values and is deliberately not summed across
turns; context percent is shown only when the model's limit is actually known.

`sessionID` is optional: omit it and the tool falls back to the registry, adding
a `parent=` column. `status`, `limit` (default 20) and `verbose` narrow the view,
and the full session id is always printed unshortened because it is the handle
every follow-up call needs.

### `subagent_send` checks liveness first

Queuing a prompt into a child that has already finished or died used to succeed
silently, and armed a completion notice that could never fire. The tool now
refuses when the child is `done`, `error`, `stale`, or `dead`, naming the state
and suggesting the fix. Pass `force: true` to override.

`subagent_send` reads the child session's own `agent`, `model`, and model
`variant` (reasoning effort) and passes them through with the prompt. OpenCode's
prompt endpoint falls back to the *default* agent (and its model) whenever they
are omitted, which silently rewrites a child's identity (a `Frontend` child
becomes the default `orchestrator` on the default model). Preserving them keeps
the child on its original agent/model/variant across every follow-up message.

### Following a long-running child

`subagent_result` no longer only hunts for a final answer. It takes a `view`:

| `view` | Returns |
| --- | --- |
| `auto` *(default)* | The final answer when the child is done; otherwise an **activity report** |
| `result` | Force the final answer only (today's behaviour) |
| `activity` | What the child is doing right now |
| `history` | A compact chronological transcript |

This matters because asking a still-working child for its result used to return
`No assistant answer found (the subagent may still be running)` — a dead end. The
SDK had already returned the child's whole message list; the plugin simply never
read it for anything but the final answer. `auto` now answers the question the
parent actually has: *what is this child doing?* — in-flight tool calls with
elapsed time, the current `in_progress` todo, the latest assistant snippet,
message and tool counts, and the last error.

`subagent_result` also accepts `sinceMessageID` and returns a `nextCursor`, so
following a child costs only the new output instead of re-reading the whole
answer. While the child is still working it reports `streaming: true` and
`partial: true`, so a partial answer is never mistaken for a final one, and
`limit` caps the `history` view (default 20 messages).

```sh
export OPENCODE_SUBAGENT_CONTROL=1
```

Every tool is non-destructive and degrades gracefully: if the running OpenCode
build lacks the underlying SDK method (`session.children`, `session.messages`,
`session.status`, `session.abort`, `session.promptAsync`), the tool returns a
short "unavailable" message instead of failing.

> **V1 only**, for the same reason as the status tool: the V2 plugin API cannot
> register custom tools. On a V2-only build the V2 entrypoint no-ops; a dual
> V1+V2 build registers the tools through the V1 `server` entrypoint.

### Parent-agent filter on V1

On V1 `tool.execute.before` does not receive the calling agent, so
`OPENCODE_AUTO_BG_AGENTS` / `OPENCODE_AUTO_BG_EXCEPT` would otherwise have no
effect. The plugin reads the agent from the `chat.message` hook (which does carry
it) and remembers it per session, so the allow/deny lists work on V1 too.

---

## Subagent progress reports (V1 only, on by default)

A background subagent runs with no visibility until it finishes. This feature
gives the parent a live progress stream, driven entirely by events (never
polling): whenever a child calls `todowrite`, OpenCode emits a `todo.updated`
event, and the plugin reports it to the parent.

Delivery is channel-based, chosen by `OPENCODE_SUBAGENT_NOTIFICATION_TYPE` (with
the legacy `OPENCODE_SUBAGENT_PROGRESS` still mapped). The **default channel is
`chat`**: the report is written as a hidden, no-reply part, so the parent pays
**no model turn** while progress stays visible in the TUI (the sidebar reads the
reactive session store, never injected parts).

- **Chat** (default) — a hidden, no-reply session part (`noReply` + `ignored`):
  no model turn, not shown in the transcript.
- **Inline** (truthy `OPENCODE_SUBAGENT_PROGRESS`) — the report is written into
  the parent session via the async prompt endpoint. It is a **visible** text part
  (not synthetic), so it renders inline in the parent's transcript, headed by an
  arrow icon, the reporting child agent, the child's session slug (its
  "nickname"), and the recipient parent, mirroring a tool-call row. Every
  injection costs the parent a full model turn.
- **Toast** (`0`/`false`/`no`/`off`) — the report is shown as a transient TUI
  toast instead, so **no model turn is spent** and the parent transcript stays
  clean. The toast title carries the child's identity (`agent · slug · session
  title`) and the message is the title of the `in_progress` todo.
- **Both** — every channel above fires.

Because every injected report can cost the parent a full model turn, reports are
coalesced:

- at most **one report per child per interval** (`OPENCODE_SUBAGENT_PROGRESS_MS`,
  default 300 s),
- at most **`OPENCODE_SUBAGENT_PROGRESS_MAX` non-final reports per child**
  (default 5), and
- exactly **one final report** when every todo is `completed`/`cancelled` (never
  counted against the cap).

A child that never calls `todowrite` produces no reports, so the plugin also
appends a short instruction to each child's system prompt telling it to keep its
todo list current (mark one item `in_progress`, then `completed` as it goes). The
instruction is injected only into child sessions, never the parent or root.

Injected report shape:

```text
⤷ frontend · hidden-panda · reporting to orchestrator · "Build checkout UI" — 1/3 done · 1 in_progress · 1 pending
  - [completed] Scaffold routes
  - [in_progress] Build form
  - [pending] Wire API
```

Toast mode (`title` / `message`):

```text
⤷ frontend · hidden-panda · Build checkout UI
Build form
```

```sh
export OPENCODE_SUBAGENT_NOTIFICATION_TYPE=chat    # default: hidden, no model turn
export OPENCODE_SUBAGENT_NOTIFICATION_TYPE=inline  # inject into the parent transcript
export OPENCODE_SUBAGENT_PROGRESS=0                # show a TUI toast instead
export OPENCODE_SUBAGENT_PROGRESS_MAX=5            # cap non-final reports per child
```

> **V1 only**, for the same reason as the control tools: the V2 plugin API cannot
> register event handlers or system-prompt transforms. Loop-safe by construction:
> only sessions with a parent are considered, so a parent's own `todowrite` never
> re-triggers a report.

### Completion notices (V1 only, on by default)

OpenCode pushes a completion notice to the parent only for the *initial*
`background: true` dispatch. A follow-up queued with `subagent_send` has no
parent tool part, so the plugin emulates the notice on the child's next idle.

Its channel is **decoupled from the progress channel** and defaults to `inline`
(waking), so a queued follow-up always reaches the parent even when progress is
silenced or routed to `chat`/`toast`. Override with
`OPENCODE_SUBAGENT_COMPLETION_NOTIFY` (`toast` | `chat` | `inline` | `both` |
`off`).

Because an injected notice costs the parent a **full model turn**, the notice is
written as two dense lines rather than prose:

```text
⤷ witty-river · backend · done in 12m04s · 21 calls · 48.1k ctx · "Fix sort order and split tests"
  → subagent_result sessionID=ses_e36c2afedffeG0bcjZWB9TK9Kp
```

- The **outcome** is stated explicitly (`done` | `error` | `stale` | `dead`), so
  a failed child is never reported as "completed".
- **Duration, tool-call count and context used** come from the status registry,
  so the parent can judge cost without a second call.
- The session id appears **once**, in copy-ready `sessionID=<id>` form.
- Segments whose data is unknown are **omitted**, never filled with placeholders.
- There is no instruction boilerplate: the previous wording repeated
  "the subagent finished processing your queued message. Read its answer with
  subagent_result." on every notice.
- The `(@agent subagent)` suffix is stripped from the title, because the agent
  already appears on the line.

The injected part also carries structured metadata (`sessionID`, `slug`, `agent`,
`outcome`, `elapsedMs`, `toolCalls`, `tokens`, `contextUsed`, `title`) so the
model never has to parse prose. A repeat notice for the same child inside the
de-duplication window is suppressed.

---

## Orphan resume nudges (V1 only, opt-in)

When OpenCode restarts, in-memory state is lost and a child that was mid-turn
becomes an **orphan**: its process is gone, no `session.idle` or `session.error`
will ever arrive, and nothing will ever continue its work. Its history survives
in SQLite, so `session.promptAsync` on that session starts a fresh turn on top of
the preserved context — which effectively resumes it.

This feature does that automatically, but only for genuine orphans:

```sh
export OPENCODE_SUBAGENT_NUDGE=1
```

A child is nudged only when **all** of these hold:

1. it is a tracked child (has a parent session),
2. the registry classifies it `stale` or `dead`,
3. it has `activity: "idle"` — **no tool call is in flight**, so a long `bash`
   build is never interrupted, and
4. it is **absent** from `client.session.status()` — the running engine no longer
   knows about the session.

Condition 4 is what separates an orphan from a wedged-but-alive child. A child the
SDK reports as `busy`/`retry` is genuinely working and is never touched; one it
reports as `idle` merely lost its completion event, so it is simply marked done.
If `session.status()` is unavailable the feature does nothing rather than nudging
blindly.

The nudge text asks the child to **continue**, not to report its status — asking a
working agent what it is doing makes it stop working:

```text
Continue your task from where you left off. If you cannot proceed, state the blocker in one line and stop. Do not restate work already completed.
```

Attempts are bounded so a genuinely stuck child cannot be nudged forever: a
maximum of `OPENCODE_SUBAGENT_NUDGE_MAX` tries (default 2) with exponential
backoff (5 min, then 10 min) plus jitter, after which it is left `dead` and a
single give-up notice is emitted. At most three children are nudged per tick, so
a restart with twenty orphans does not fire twenty simultaneous model turns.

The child's own agent, model and variant are preserved via `resolveTarget`, so a
resume cannot silently switch it to the default agent.

---

## Database cleanup (V1, opt-out)

OpenCode's session storage grows without bound. Two mechanisms cause it:

1. **Event duplication.** Every part update is written twice — once as a durable
   event row (`event` table) and once as a projection row (`part` table). The
   model reads only the projection, so the `event` copy is pure duplication kept
   for replay/sync.
2. **Unbounded tool payloads.** `edit`/`write`/`read`/`bash` results are stored
   verbatim in the `part` row, including large `metadata.diagnostics`,
   `metadata.diff`, and `metadata.display.text` blobs.

This plugin ships a cleanup layer that addresses both, in three parts:

- **Write-time cap** (`tool.execute.after`): truncates oversized `state.output`,
  `metadata.diff`, `metadata.filediff.patch`, and `metadata.display.text`, and
  empties `metadata.diagnostics` when it exceeds its budget. This prevents new
  bloat at the source. On real data a 117 KB edit metadata blob shrank to 6.5 KB.
- **WAL governor** (throttled tick, every 30 s, plus the `event` hook): OpenCode
  core runs its own in-transaction WAL auto-checkpoint (`wal_autocheckpoint`,
  ~4 MiB by default), which fires inside a write transaction and turns a write
  into an IO-block storm. The plugin cannot change core's PRAGMA, but it can keep
  the WAL small so core's auto-checkpoint rarely fires. When the `-wal` sidecar
  exceeds `OPENCODE_DB_CLEANUP_WAL_THRESHOLD` (default 64 MiB) it issues a
  non-blocking `wal_checkpoint(PASSIVE)`; once no write has happened for
  `OPENCODE_DB_CLEANUP_WAL_IDLE_MS` (default 15 s) it issues
  `wal_checkpoint(TRUNCATE)` to shrink the WAL back to zero. TRUNCATE is **never**
  issued while a write occurred within the idle window. The idle clock is
  **global**: it takes the max of this process's last write and the shared
  `-wal` file mtime, so when 2-5 OpenCode processes share one database a write by
  ANY of them keeps every governor passive.
- **Periodic prune** (throttled `event` hook, every 6 h): for sessions untouched
  beyond the retention window, deletes their `event` rows and trims old `part`
  tool payloads to a short preview (setting `state.time.compacted` so the model
  sees the existing `[Old tool result content cleared]` marker). It **never**
  touches `event_sequence`, `session`, or `message` rows, so session resume and
  compaction keep working. When the `-wal` exceeds the threshold it may also run
  **earlier** than 6 h, but never more often than
  `OPENCODE_DB_CLEANUP_PRUNE_FLOOR_MS` (default 30 min) plus a random
  `OPENCODE_DB_CLEANUP_PRUNE_JITTER_MS` (default 60 s), so concurrent processes
  de-synchronize and never prune in lockstep.

Cleanup is **enabled by default** and requires no configuration. Disable it with
`OPENCODE_DB_CLEANUP=0`. It runs independently of the background-subagent flag
and is **V1 only** — the V2 plugin API exposes no event or database access.

> **Locking.** A plugin runs inside the same OpenCode process that owns the
> database, and other sessions write to it concurrently. The live paths use only a
> `wal_checkpoint(PASSIVE)` (never blocks) during active writes; the blocking
> `wal_checkpoint(TRUNCATE)` is issued only when the shared database has been
> write-idle for `OPENCODE_DB_CLEANUP_WAL_IDLE_MS` (the max of this process's last
> write and the shared `-wal` mtime, so a peer's write also counts), and the
> optional `VACUUM` runs at plugin shutdown, when contention is gone. Running
> `TRUNCATE`/`VACUUM` while sessions are actively writing makes those sessions
> fail with `SQLiteError: database is locked`.

> **Reclaiming space.** Deletes free pages inside the DB but do not shrink the
> file when `auto_vacuum=0` (OpenCode's default). To reclaim file space, either
> set `OPENCODE_DB_CLEANUP_VACUUM=1` (the `VACUUM` then runs at shutdown), or let
> the WAL governor truncate the `-wal` while the process is write-idle. A
> multi-GB `-wal` file usually means a long-lived session is pinning it; closing
> that session lets the next quiescent tick truncate it.

---

## Behaviour notes

- **Explicit wins.** If the caller already set `background` on the tool input, the
  plugin leaves it untouched. It only forces `background: true` when it is not already
  `true`.
- **Idempotent.** Re-running the hook on an already-backgrounded call is a no-op.
- **Non-destructive.** Only the `background` field is added; every other field
  (`agent`, `prompt`, `description`, `model`, `sessionID`, …) is preserved.
- **Clean unload.** Setup returns a cleanup that disposes the hook registration, so
  reloading the plugin does not stack duplicate hooks.
- **No child session changes.** Backgrounding is a property of the *parent's* subagent
  tool call, not of the child session. The child runs normally; the parent just stops
  blocking on it.
- **Toast notifications (TUI only).** When a background subagent transitions to `done`
  or `error`, the TUI monitor shows a short toast. It is a display-only surface — it
  never injects session parts or prompts, so it cannot affect the parent agent's loop.
  Disable with `OPENCODE_SUBAGENT_NOTIFY=0`.
- **V1 flag-aware.** On OpenCode V1 the plugin only injects `background: true` when
  `OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS` (or `OPENCODE_EXPERIMENTAL`) is enabled,
  so a missing flag never turns a subagent call into a hard error. On V2 the flag is
  not required.

---

## Files

| File | Purpose |
| --- | --- |
| `src/index.js` | The plugin implementation (`id`/`setup` for V2, `server` for V1, hook logic). |
| `server.js` | `./server` entrypoint — re-exports `src/index.js` (V1 + V2). |
| `index.js` | Alternate directory entrypoint — mirrors `server.js`. |
| `src/tui.tsx` | Source of the TUI sidebar plugin (InfoCard stack + per-subagent cards + async identity). |
| `src/model.ts` | Sidebar data helpers: `activityDetail`, `sessionMetrics`, `sidebarActivity`. |
| `src/subagent-status.js` | Opt-in `subagent_status` tool: in-memory child-session registry with a progress clock, two-tier staleness (`stale`/`dead`), SDK reconciliation, and event ingestion. |
| `src/subagent-liveness.js` | Pure liveness math and report rendering: threshold readers, `classifyStatus`, `buildItem`, `summarizeStats`, `formatReport`. No I/O, so it is unit-testable without a runtime. |
| `src/subagent-status-tool.js` | The `subagent_status` tool definition; calls the registry's `report()` and renders it. |
| `src/subagent-rows.js` | Shared child-row projection (`sdkRow`/`registryRow`), SDK status mapping, aggregate counts, and the activity report. |
| `src/subagent-children-tool.js` | The `subagent_children` triage list, built from registry or SDK rows. |
| `src/subagent-result-tool.js` | The `subagent_result` tool with `view` (`auto`/`result`/`activity`/`history`) and the `sinceMessageID` read cursor. |
| `src/subagent-summarize.js` | Transcript helpers: final-answer extraction, activity and history summaries, todo summarising, cursor slicing. |
| `src/subagent-format.js` | Two-line child rendering, status glyphs, and duration/token formatters shared by every tool. |
| `src/subagent-control.js` | Wires the opt-in control tools (`children`/`result`/`cancel`/`send`/`watch`) over the public SDK, sharing the status registry as a single source of truth. |
| `src/subagent-completion.js` | Completion notices for finished children, with a pending-notice TTL so the map cannot leak. |
| `src/subagent-utils.js` | Dependency-free shared helpers: `unwrap`, `sessionApi`, `resolveTarget`, and the opt-in env gates. |
| `src/subagent-progress.js` | Opt-in progress reports: watches child `todo.updated` events and injects coalesced reports into the parent; injects a keep-todos-current instruction into child system prompts. |
| `src/cleanup.js` | V1 database cleanup: write-time output/metadata capping, DB path resolution, stale-session event prune + old part trim, passive checkpoint inline + WAL truncate/VACUUM at shutdown. |
| `src/subagent.ts` | Subagent detail fetch (`fetchSubagent`), summary (`subagentDetails`), duration (`elapsedLabel`). |
| `src/workspace.ts` | Bounded Git workspace scan for the "Workspace & files" card. |
| `dist/tui.js` | `./tui` entrypoint — the built TUI sidebar bundle (`bun run build`). |
| `README-monitor.md` | Attribution note and original documentation for the vendored `opencode-subagent-statusline` monitor. |
| `package.json` | Package metadata and entrypoint exports. |

OpenCode V2 resolves a plugin directory through its `server` entrypoint (root
`server.js` or the `./server` export). Both `server.js` and `index.js` are provided so
either resolution path works.

---

## Requirements

- OpenCode **V1** (`>=1.18.0`) or **V2** (`>=2.0.0`). The server hook uses V1's
  `tool.execute.before` on V1 and the V2 `ctx.tool.hook("execute.before")` API on V2;
  the TUI monitor needs a build with TUI plugin support.
- Node **>=22.13** (see `package.json`).

---

## License

MIT — see [LICENSE](./LICENSE).
