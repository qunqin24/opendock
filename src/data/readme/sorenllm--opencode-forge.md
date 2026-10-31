# opencode-forge

Single general-purpose **forge** agent + two orthogonal harnesses for
[opencode](https://opencode.ai) ≥ 1.18: a **plan harness** (decide first,
execute later) and a **goal harness** (arm an objective, let the loop drive
itself to a host-verified finish). They share nothing but a safety interop;
OpenSpec spec workflows remain a third, separate lane.

```
/plan fix login timeout   → read-only recon → plan_write (draft, writes denied)
                           → present, end turn → USER REVIEW (revise / discard / go-ahead)
                           → plan_approve (user dialog = final gate) on explicit go-ahead
                           → execute task by task, plan_tick on each (timestamped audit)
                           → all ticked → per-criterion self-check → plan_close
                             (user dialog = completion gate) → done
/plan                     → list in-progress plans with progress
/plan resume              → continue the most recent unfinished plan
/plan discard             → abandon the current plan (abandoned, writes restored)
```

```
/goal make the suite green --check "npm test" --contains "src/a.ts::export const A"
                          → goal_write (arm=true; the user dialog IS the arm action)
                          → loop: work → goal_check (advisory) → idle → continuation brief
                          → goal_complete re-runs EVERY check itself on the host
                            (fail-closed) + per-criterion attestations → user dialog
                            = completion gate → completed
/goal add ...             → queue an inert goal (no dialog, no loop)
/goal                     → live goal + queue overview
/goal pause | resume | discard/stop/cancel
```

- Plan files: `.opencode/plan/<date>-<slug>.md` in your project, frontmatter
  state machine `draft → approved → done`, exits `abandoned` (plain discard) and
  `superseded` (`plan_discard {reason, supersede: "<successor path>"}` —
  the exit for work whose execution moves to another harness, e.g.
  `.opencode/crew/2026-10-01-....md`, rather than ends). Every terminal
  transition appends a dated narrative section to the file body in the same
  write as the status flip: close = each acceptance criterion's
  pass/evidence; discard/supersede = the reason verbatim (`(none given)`
  when absent; a supersession also records the successor path). Appended
  sections are parser-inert — status reads frontmatter only, tick
  counts read the Task List only — and a superseded plan's Task List
  stays the frozen decision snapshot: closure IS the supersession, and
  crew/goal results never tick it.
- While a plan is in draft, `write` / `edit` / `bash` are **denied at the
  permission layer** — including your own `allow` config, and for every agent
  in that session (the draft protects shared session state; see Agent
  partition below) — and `task` is **shape-gated**: dispatch to an
  effective-readonly forge scout passes, every other target is denied (see
  Design stance). The only exits are approval and discard. This is deliberate;
  see Design stance.
- `plan_approve` / `plan_close` are pinned to a confirmation dialog: the
  model can never flip the state itself.
- Goal files: `.opencode/goal/<date>-<slug>.md`, state machine
  `queued → active ⇄ paused → completed / abandoned`, one live goal per
  session plus a workspace queue. Completion is **verified by the plugin**,
  not attested by the model: `goal_complete` re-executes every check itself
  and refuses (fail-closed) on any failure.
- The native `build` / `plan` agents **stay installed and independent**:
  forge coexists with them in the Tab cycle. The plugin hard-partitions the
  two worlds (see Agent partition below) instead of hiding anything; plan
  and goal files are never deleted on uninstall.

## Agent partition (who sees what)

The plugin draws a hard line between two agent families, enforced at the
tool layer (verified against the host's `tools` filter):

| | **forge family** — `forge` + your forge.json `forge-*` workers | **everyone else** — native `build` / `plan` / `general` / `explore` and your own agents |
| --- | --- | --- |
| exec surface | `forge_shell` / `forge_jobs` only; builtin `shell`/`bash` hidden (unconditional, probe-independent; covers user-defined `agent.forge` entries too) | builtin `shell`/`bash`, fully native |
| forge tools (`plan_*`, `goal_*`, `crew_*`, `forge_shell`, `forge_jobs`) | `forge` sees all; `forge-*` workers only `forge_shell` + `forge_jobs` | none visible |
| dispatching `forge-*` via `task` | allowed | refused at the tool layer |
| writing `.opencode/plan/` / `.opencode/goal/` | allowed (state machine governs) | refused at the tool layer (reads stay open) |
| forge system prompts (job guidance, plan/goal notices) | injected | never injected — zero forge text |
| watchdog (stuck builtin shell) | governed | untouched — no markers, no kills |

Escape hatches: `jobs.keepBuiltinShell: true` gives the forge family the
builtin shell back; `jobs.mode: "native"` retires `forge_shell`/`forge_jobs`
entirely (the hide is withdrawn in the same stroke). The forge family is
prompted to route every shell command through `forge_shell` — on hosts that
ignore injected tools maps the builtin tool stays visible but is refused at
call time, and the channel mandate is what keeps the model from trying it
first (the belt refusal remains the backstop). On such unfiltered hosts the
fallback belt family is a three-part enumeration of hard refusals at the
tool layer: a forge-family builtin `shell`/`bash` call is refused with a
pointer to `forge_shell`; a non-forge agent's call of any forge tool is
refused with the partition guidance; and a `forge-*` worker (any family
member whose agent name is not exactly `forge`) calling a harness state tool
(`plan_*`, `goal_*`, `crew_begin`, `crew_close`) is refused as primary-only.
That refusal fires before any execution or user confirmation dialog, so a
worker's state-tool call never reaches a gate, and the error names the way
out: report findings back to the orchestrating session — the primary forge
agent alone calls the state tools. Mixed sessions (Tab
between agents in one session): harness state (plans/goals) stays
session-bound, tool surfaces follow the current speaker, and the goal loop
parks instead of driving a non-forge turn. One deliberate exception: a
draft-phase write ban binds the **session** (protecting shared state), so a
non-forge agent is write-blocked until the draft is approved or discarded in
forge. Running `/plan` `/goal` `/crew` under a non-forge agent redirects to
forge instead of executing.

**Default subject.** The host otherwise defaults new sessions to `build`
once a build agent exists — the plugin pins `default_agent: "forge"`
automatically (a `default_agent` you set yourself always wins), so bare
runs and fresh sessions still land on forge under coexistence.

## Install

Requires opencode ≥ 1.18.

```bash
# npm (recommended)
opencode plugin @sorenllm/opencode-forge --global
# or GitHub source
opencode plugin github:ChengZiiii/opencode-forge --global
```

Local development: add `"file:///<repo abs path>"` to the `plugin` array in
your opencode config. Single-file install: copy `dist/index.js` to
`~/.config/opencode/plugin/forge.js` — it is fully self-contained (the plan
discipline rides inside the /plan command template; there is no separate
skill file).

Note: do not enable opencode's experimental plan mode
(`OPENCODE_EXPERIMENTAL_PLAN_MODE`) together with forge — two plan mechanisms
would overlap.

## Configuration

Everything works with zero config. Optional knobs (your config, your files —
the plugin never writes them):

```jsonc
{
  "agent": {
    "forge": {
      "model": "provider/model",   // pick any model for forge
      "disable": true              // one-knob return to native: no forge,
                                   // no injections at all, no tools/commands
    }
  },
  // per-plugin options ride the plugin entry as a [spec, options] tuple
  "plugin": [
    ["@sorenllm/opencode-forge", {
      "jobs": {
        "mode": "auto",              // "auto" (default) | "forge" — equivalent, both keep the partition
                                     // | "native" — retire the supervisor, builtin shell returns
        "keepBuiltinShell": false    // true: give the forge family the builtin shell back (the one exec escape hatch)
      },
      "watchdog": {
        "mode": "kill",              // "kill" (default) | "dry-run" | "off" — forge-family sessions only
        "stallMs": 600000            // stall threshold, min 60000
      }
    }]
  ]
}
```

If you already have a `command.plan` or `command.goal` of your own, it wins
and the plugin's command of that name is not registered.

## Uninstall (four steps, restores native opencode)

1. Remove the plugin entry from the `plugin` array in
   `~/.config/opencode/opencode.json` (global installs).
2. Delete the package store dir:
   `~/.cache/opencode/packages/@sorenllm/opencode-forge/` (npm installs,
   scope-dir layout; for github installs it is
   `~/.cache/opencode/packages/github_ChengZiiii/opencode-forge/`).
3. Delete the `agent["forge"]` block from your config if you added one
   (otherwise the name lingers in the agent list).
4. Done — all runtime injections (agents, tool hiding, commands) are gone
   with the plugin; nothing was ever written to your config
   (the hide was runtime-only). Your `.opencode/plan/`, `.opencode/goal/`,
   and `.opencode/crew/` files are yours; delete them yourself if you want.
 5. Optional runtime debris: delete `<tmp>/opencode-forge/` (job logs, the
    job registry ledger, the watchdog ledger, and any leftover dispatch
    ledger from older versions — the file ledger table above lists
    everything).

## File ledger

What this plugin touches, exhaustively:

| Where | What | Lifetime |
| --- | --- | --- |
| `<project>/.opencode/plan/*.md` | plan files | user data — kept forever, uninstall never deletes |
| `<project>/.opencode/goal/*.md` | goal files (contract, Check Log, Turn Ledger) | user data — kept forever, uninstall never deletes |
| `<project>/.opencode/crew/*.md` | crew records (declared plan + arm/convert/abandon/close history; written at `crew_begin` registration, appended at each transition; record-only — never a resume mechanism) | user data — kept forever, uninstall never deletes |
| merged config object (RAM only) | forge agent, static `forge-<ns>-<id>` subagents (every pool family namespaced; the global fallback family `forge-global-<id>`), tool-partition injections (forge family shell hide, non-forge forge-tool hide, native build/plan/general/explore minimal entries), `command.plan`, `command.goal`, `command.crew`, goal permission keys, `permission.forge_shell`, `permission.crew_close` | vanishes when the plugin is removed; nothing is written to disk |
| `<tmp>/opencode-forge/jobs/<jobId>.log` | job output tee (full output; oldest rotated out above 50 files) | runtime debris — delete freely, also after uninstall |
| `<tmp>/opencode-forge/jobs/ledger.jsonl` | job registry ledger (bounded: 1 MB reset, 200 entries) | runtime debris — delete freely, also after uninstall |
| `<tmp>/opencode-forge/jobs/registry.json` | persistent survivor registry (bounded: 100 entries) | runtime debris — after uninstall, kill any still-running `survive` jobs yourself first |
| `<tmp>/opencode-forge/watchdog/log.jsonl` | watchdog interventions ledger (bounded: 200 entries, oldest rotated) | runtime debris — delete freely, also after uninstall |
| `<tmp>/opencode-forge/dispatch/ledger.jsonl` | dispatch ledger — **no longer written** (the dispatch engine was removed); only present as inert debris from older versions | runtime debris — delete freely |
| `.opencode/forge.json` (the NEAREST one walking up from the session's worktree — sole ownership) and `~/.config/opencode/forge.json` (global FALLBACK only, never merged) | your static subagent definitions (JSONC) — the workspace pool IS the session's whole roster; nested forge.json files are ignored. **User data — the plugin only reads them, never writes or migrates them** | yours — version the project ones, keep the global one out of sync tools if it holds machine-specific models |
| `~/.cache/opencode/packages/...` | installed package copy | written by the `opencode plugin` installer, not the plugin |
| `~/.config/opencode/opencode.json` | `plugin` array entry | written by the installer |

The plugin writes no temp files, no logs, nothing outside the table (a
`FORGE_GOAL_PROBE=1` env opt-in appends continuation diagnostics to the OS
temp dir for debugging).

## Goal mode (autonomous, host-verified objectives)

Three orthogonal workflows — pick per task, they never bind to each other:

| Workflow | decides | use when |
| --- | --- | --- |
| OpenSpec change | spec deltas, review gates | multi-session features with spec impact |
| `/plan` | approach + task order, you approve then it executes | single-task execution you want to review first |
| `/goal` | arm an objective + verification contract, the loop executes | well-defined objective with machine-checkable success |

`/goal <objective>` drafts a **contract**: goal, success criteria,
verification checks, constraints, non-goals, budgets. Contract markers in the
objective map to structured fields:

```
/goal make the release green --check "npm test" --check "npm run lint"
      --contains "CHANGELOG.md::## Unreleased"
      --success "zero failing tests" --constraint "no dependency bumps"
      --non-goal "refactoring" --max-turns 15 --max-minutes 30
```

Two check types, both **executed by the plugin on the host** (the model never
grades its own homework):

- `--check "cmd"` — shell command in the workspace; passes on exit 0,
  timeout-configurable (default 120 s, max 600 s).
- `--contains "file::text"` — file contract: the literal text must be present
  in that workspace file.

**Arming and the loop.** `goal_write` with `arm=true` pops one confirmation
dialog — your Allow IS the arm action; nothing autonomous runs before it.
From then on, whenever the session goes idle, the plugin re-prompts the agent
with a `[forge:goal-continue]` brief (with debounce, owner-checked, and
compaction-aware: autocontinue is suppressed for active-goal sessions so a
context compaction can never silently re-trigger the loop). Each continuation
turn is counted and recorded in the goal's Turn Ledger.

**Budgets and auto-pause.** `--max-turns` (default 25, hard ceiling 200) and
`--max-minutes` (default 60, hard ceiling 480). The loop pauses itself — with
a `stop_reason` in the frontmatter — on: budget exhaustion, two consecutive
no-progress continuation turns, three consecutive transport failures, or a
live draft plan appearing in the session (the only plan/goal interop: a draft
plan's write ban would wall the loop off, so the goal pauses instead of
burning turns against it). `/goal pause` (or `goal_pause` with a blocker
description) pauses by hand; `/goal resume` re-arms through another
confirmation dialog.

**Completion is fail-closed.** `goal_complete` re-executes every check itself
at the gate — results recorded in the Check Log never substitute for the
re-run — and requires one attestation per success criterion. Only then does
the user dialog appear. Revising the contract (`goal_write` with
`revise=true`) bumps the revision: earlier evidence no longer counts, but the
Check Log and Turn Ledger survive as an audit trail.

**Queueing.** One live goal per session; `/goal add ...` queues additional
goals (inert, no dialog). When the live goal reaches a terminal state,
`/goal resume` promotes the oldest queued goal into the now-free session.

**Run-mode limitation.** `opencode run` exits before the idle continuation
debounce fires, so the autonomous loop effectively requires a TUI/serve
session. Arming, checks, completion, pause/resume, and queueing all work in
run mode; `--auto` approves the gates, without it they auto-reject
(headless cannot silently pass a gate).

**Security boundary.** Verification shell commands run on your host, in the
workspace, via the plugin — that is the point (host-verified completion).
They are drafted by the model from your objective. Read them in the dialog
before allowing the arm; `--contains` contracts are strictly
workspace-relative (path escape is refused).

## Job supervisor (a shell that can never hang the session)

The builtin `shell` tool treats closed stdio pipes as completion — a
detached grandchild holding them open suspends the call indefinitely (the
multi-hour agent hangs behind upstream issues #47350 / #50316 / #49169).
Subagents have it worse: the native task tool has no timeout at all.
`forge_shell` is the replacement exec surface for the forge agent.

**`forge_shell`** completes on the FIRST of four conditions, and only the
exit condition is bound to the actual exit event (structural immunity to
the stdio-EOF bug):

| condition | knob | on trigger | completion behavior |
| --- | --- | --- | --- |
| process exit | — | final; exit code + output tail returned | **terminal evidence** — output delivered in full; the job self-clears from the registry (no wake, no clear needed) |
| `success_pattern` regex matches new output | opt-in | completes as success; process kept alive by default (server semantics), `keep_alive: false` kills its tree | kept alive → later exit still wakes (the server dying is real news); killed inline → self-clears |
| `idle_ms` with no new output | default 60000 | early return `still-running` + `jobId`; process stays alive | later exit queues a wake — unless a poll has already read the terminal state (a terminal poll consumes the entry); stays listed until then |
| `max_wait_ms` hard cap | default 120000, max 600000 | early return `still-running`; never kills | same as idle |

`run_in_background: true` skips all waiting and returns
`{jobId, logPath}` immediately. Every run pops one permission dialog
(`permission.forge_shell = "ask"`; an explicit `deny` in your config wins).
Every result form carries `cwd:` — the absolute directory the command
actually ran in. When the agent's narrative about the working directory
disagrees with that line, the line wins.

**Interpreter selection.** Commands run under the host-aligned shell —
the same interpreter the host's builtin shell tool uses — never under
Node's `shell: true` default (cmd.exe / plain sh). On Windows the chain
is `pwsh → powershell → git-bash → %COMSPEC%` (cmd.exe only as a
machine-level capability fallback); on POSIX the login shell with bash
preferred and `/bin/sh` as the fallback. PowerShell-family shells are
invoked directly (`<shell> -NoProfile -Command <command>` plus an
exit-code guard, so a native command's exit status propagates as the
job's exit status) — which means you write PowerShell syntax in
`forge_shell` on Windows: `echo $env:USERNAME` expands, quoted-exe
invocations use the call operator (`& "C:\path with spaces\tool.exe" args`).
The tool description states the interpreter family, and there is no
configuration knob: the interpreter follows the host, by design.
Goal-harness verification checks run through the same resolver, so a
check drafted under the model's shell expectations behaves identically
at the completion gate.

**`forge_jobs`** manages the registry: `list` / `poll {jobId, waitMs≤30s}`
(bounded wait for new output or exit, drains it) / `log {jobId, offset?,
limit?}` (line paging over the on-disk log) / `kill` (whole process tree) /
`clear` (drop a finished entry — only early-returned/background jobs need
this; synchronously consumed jobs self-clear at completion) / `handoff`
(rebind ownership to the root session so a subagent's job survives the
subagent). Delegated agents are instructed to poll their jobs before
yielding a conclusion.

**Exit wakes.** A job whose caller last saw it before completion —
`run_in_background` starts and `still-running`/kept-alive `success` early
returns — queues a single `[forge:job-complete]` message when it finishes,
delivered into the owning session via `promptAsync` the next time it goes
idle (exactly once; `notify: false` opts out per job). A foreground call
resolved on the exit event is terminal evidence: the caller already holds
the complete output, so no wake fires and the registry entry self-clears —
a stale `poll`/`kill`/`clear` on such an id answers "already consumed"
instead of "unknown job". The same consumption applies to a poll that
observes a finished job: the poll itself delivered the exit status and the
drained output, so the queued wake is dropped and the entry self-clears —
no duplicate notification, no manual clear. Wakes fire only for
completions that were never read.

**Ownership.** Jobs belong to the session that created them. Session
deleted → its live session-scoped jobs are killed and the event is recorded
in a bounded ledger (`handoff` beforehand survives). Plugin unload disposes
everything it still owns.

### Host exit cleans up on every path (0.3.1)

Background jobs used to survive the opencode process as broken zombies (the
host's stdout pipe died with it, so per-request writers broke on the next
write). Jobs now die with the host on every exit path, layered:

1. **stdio is file-backed.** Job stdout/stderr ARE the log file (inherited
   fd) — the host holds no job pipes at all, so nothing can break, and a
   `survive` job (below) stays genuinely healthy after the host is gone.
2. **JS exit matrix.** `SIGINT` / `SIGTERM` / `process exit` /
   `uncaughtException` / `unhandledRejection` / plugin dispose all force-kill
   every live non-survive job (synchronous `taskkill /T /F` — fast enough to
   finish before the OS terminates the host; dispose gets a graceful pass
   with a 3s grace window first).
3. **OS fence (Windows).** One lazily-started PowerShell watcher holds a Job
   Object with `KILL_ON_JOB_CLOSE` around every spawned tree (periodic
   process-table sweep adopts late-born grandchildren). Host dies ANY way —
   including `taskkill /F`, where no JS handler can run — the watcher's stdin
   pipe dies with it, the handle closes, and the kernel kills the whole tree
   (~sub-second measured). POSIX has no kernel equivalent here (PDEATHSIG
   was rejected for its parent-thread pitfalls): process groups + the exit
   matrix carry it, and the next start's registry scan reports orphans.

Known boundaries: a host killed within ~1s of a job's start can leak that
job's grandchild (the fence watcher is still compiling); Chromium-family
processes that explicitly break away from the job object escape the fence
(deliberate: `BREAKAWAY_OK` is not set). Both are recorded in the ledger
when observable.

**Survive mode (explicit opt-out of death).** `forge_shell { survive: true }`
starts a job that OUTLIVES the host: it is recorded in
`<tmp>/opencode-forge/jobs/registry.json` (pid + command + log path), gets no
fence and no exit kill, and the NEXT opencode run adopts it automatically —
`forge_jobs list` shows it as `previous-run`, and poll/log/kill work on it
as usual. Config `jobs.survive: "always"` flips the per-call default; config
`jobs.survive: "deny"` disables survival entirely and a per-call
`survive: true` against it is an error (the explicit deny wins). Survivors
whose pid died are detected at next start, ledgered as orphans, and dropped
from the registry. Stop survivors explicitly — nothing else will.

### Mode matrix (supervisor lifecycle)

The old three-stage capability probe is retired: the forge-side partition
holds regardless of what the host's builtin shell can do, so `auto` and
`forge` are equivalent. Only the manual `native` mode retires the
supervisor:

| mode | how you get there | builtin shell (forge family) | forge_shell / forge_jobs |
| --- | --- | --- | --- |
| auto (default) / forge | nothing to do | hidden — the exec surface is forge_shell, always | registered |
| native | manual only: `jobs.mode: "native"` | restored | retired; calls throw with a pointer to the native parameter |

`jobs.keepBuiltinShell: true` gives the forge family the builtin shell back
in any mode (the watchdog keeps governing those calls).

### Artifacts and uninstall additions

Job output lands in `<tmp>/opencode-forge/jobs/<jobId>.log` (the file IS the
job's stdout/stderr; oldest rotated out above 50 files; reads are windowed to
8 MB). Registry events append to
`<tmp>/opencode-forge/jobs/ledger.jsonl` (bounded, 1 MB reset, 200 entries),
and surviving jobs persist in `<tmp>/opencode-forge/jobs/registry.json`
(bounded to 100 entries; a stale `registry.json.lock` breaks itself after 5s).
These are runtime debris, not data — with ONE caveat: **if you uninstall with
`survive` jobs still running, killing them is on you** (`taskkill /PID <pid>
/F /T`, or just reboot); deleting the directory afterwards is safe and
complete.

## Forge subagents (static worker agents in forge.json)

Forge subagents are **static, user-authored worker agents**: each forge.json
entry is either **pinned** (a model + a reasoning depth, bound at
materialization) or an **Auto worker** (no model — it inherits the parent
session's model at dispatch), materializes as a native `forge-<ns>-<id>`
subagent — EVERY pool family is namespaced, no exceptions (see
*Pools on a shared host* below) — and is dispatched through the host's
**native `task`
tool** — which means every run is visible in the TUI, expandable and
monitorable, exactly like any native subagent. There is no dispatch tool, no
child-session engine, and no configuration invitation anywhere: the session
AI never writes your config.

No forge.json? Nothing happens — the plugin registers nothing and the native
subagent behavior is untouched. Onboarding is this README, for you the human.

### forge.json — the configuration

A dedicated `forge.json` (JSONC — comments allowed) with **workspace pool
ownership and a global fallback** (sole ownership — the same
workspace-ownership strictness as opencode's native MCP config):

1. the **workspace pool**: the **nearest** `.opencode/forge.json` walking up
   from the session's worktree (session worktree → session directory → host
   launch directory as the anchor chain; first file found on the ancestor
   chain wins, nothing above it is consulted). When it exists, it **IS the
   session's whole dispatch roster**.
2. the **global layer**: `~/.config/opencode/forge.json` — a **fallback
   ONLY**: when the workspace has no pool file, the global layer serves as
   the whole roster; when the workspace has one, the global layer is NOT
   consulted for that session (**a fallback, not a merge** — no per-id
   blending, global agents never ride a workspace pool).

`forge.json` files nested **deeper** in the workspace's subtree (a cloned
repo or subfolder carrying its own file) are **ignored entirely** — they
contribute no agents, split no pools, and extend nothing (a git checkout
does not change your roster). A broken file empties only its own pool
(error finding with the parse location); everything else still applies.
Both layers re-read at every real materialization — host boot, a first
config build, or an opencode config reload — without a restart; a new
session alone does not re-read them, and a **deleted pool file
un-materializes its agents** (deletion is real — no zombie pools).

**Pools on a shared host.** Agent frontends (paseo and friends) routinely
share ONE opencode host process across projects, re-initializing plugins
with different directories. The host therefore remembers every workspace
directory it was initialized in, and the **host-wide materialization set**
is the global layer plus each seen workspace's pool (one pool per
directory: its walk-up nearest file). Pool membership is re-derived from
disk truth on every resolve — a deleted pool file disappears at the next
config hook. EVERY pool family materializes **namespaced** as
`forge-<ns>-<id>` (`ns` = the file's declared top-level `pool` field, else
the sanitized pool-directory basename); the **global fallback layer
materializes under the fixed namespace `global`** as `forge-global-<id>`.
**No family gets plain ids anywhere** — a materialized id is identical on
every host regardless of the order workspaces were initialized in, so crew
plans, rosters, and muscle memory transfer between hosts. Pool resolution
order is deterministic — families ordered lexicographically by absolute
pool-file path — and that same order governs cross-family materialized-id
collisions: the earlier pool's agent wins, the colliding later agent is
skipped with an error finding naming both files. Every materialized agent's
task-vocabulary **description carries its pool provenance**: its namespace,
its origin forge.json path, and — for every family except the global
fallback — that it is dispatchable only from sessions whose workspace pool
is that file; the global family names the global fallback layer as its
origin. The same static text ships to every session — the dispatch gate
(below) is the dynamic authority, the description is the honest label.

**Dispatch is gated to the session's own pool.** Materializing every pool
host-wide is a vocabulary necessity (the task tool's agent list is
host-level); what a given session may actually DISPATCH is scoped
session-locally: a task call targeting an agent whose pool belongs to
ANOTHER workspace is refused with a finding naming the target's origin
pool path, stating it is *not dispatchable from this session*, and the
exits — open a session in that workspace, or configure the role into this
workspace's pool / the global layer. The `/crew` roster and the
`crew_begin` registration output lead with the session's dispatchable pool
(its forge.json origin — workspace pool, or the global layer marked as
fallback) and list every other host pool as NOT dispatchable with its
origin path.

| axis | follows | survives restart? |
| --- | --- | --- |
| pools (the `forge-*` vocabulary) | workspaces — sole ownership + global fallback | the workspace registry re-seeds from the spawn anchor only |
| session artifacts (plan/goal/crew records) | the session's own workspace | files on disk are the source of truth |

A forge.json in a workspace this host has never been initialized in is NOT
silently ignored: `/crew` names it as the residual mismatch and tells you
a host re-initialization in that workspace materializes it (or move the
agents into the global layer).

**Id naming**: use plain role words (`research`, `coder`, …) — the plugin
materializes every id as `forge-<ns>-<id>` under its family's namespace
(never a plain `forge-<id>`; pool-less workspaces get the fixed `global`
namespace). A `forge-`-prefixed id in the file would double up
(`forge-coder` → agent `forge-<ns>-forge-coder`); the loader auto-strips the
prefix (all repetitions) with a warning so existing files keep working, but
rename the entries to silence it. The namespace infix is never parsed back
out of a materialized id.

```jsonc
{
  // namespace for this pool's ids (forge-<ns>-<id> — EVERY pool is
  // namespaced; declare it instead of riding the directory name).
  // Short, stable, [a-z0-9-] up to 24 chars — ids survive directory renames.
  // REQUIRED for crew-governed dispatch (the /crew compliance gate: no
  // valid declared `pool` → `crew_begin` refuses and crew `forge-*`
  // dispatches are blocked until the field is added). Invalid values
  // degrade to a warning + the directory-derived namespace.
  // "pool": "aa",
  "agents": {
    // PINNED worker: model + thoughtLevel form an ATOMIC PAIR — set BOTH
    "research": {
      "model": "zai-coding-plan/glm-5.3", // exact "provider/model" string
      "thoughtLevel": "low",              // none/minimal/low/medium/high/xhigh/max, or any word — write lowercase
      // "prompt": "short role description — explicit prompts fully override the built-ins (only research/review ids have them; any other id without a prompt gets a generic one-liner)",
      // "shape": "readonly", // absent shape defaults to WRITE (open
                               // permissions); "readonly" is the explicit seal
                               // denying write/edit/bash + the patch family
                               // (patch/applypatch/apply/multiedit)
      // "permission": { "bash": "deny" } // optional override; "task" is ALWAYS denied
    },
    // AUTO worker: set NEITHER — inherits the parent session's model at
    // dispatch (snapshot semantics: later primary model switches affect only
    // future dispatches), runs at the provider's default depth
    "scout": {}
  }
}
```

**The atomic pair — the one rule that matters:**

| `model` | `thoughtLevel` | result |
| --- | --- | --- |
| set | set | pinned worker (brain + depth bound at materialization) |
| — | — | **Auto worker** (inherits the parent session's model; provider-default depth) |
| set | — | ✗ rejected: entry skipped, error finding names the missing `thoughtLevel` |
| — | set | ✗ rejected: entry skipped, error finding names the missing `model` |

A rejected entry costs only itself — its siblings materialize normally.

- **The plugin only ever reads this file.** It never creates, writes, or
  migrates it. The old AI-authored onboarding path (seed placeholder +
  error recipe) is gone: an unconfigured host is inert and silent, and the
  session AI is never invited to touch config. The ONE exception is the
  `/crew` initialization gate (below), where AI-assisted configuration is
  offered to YOU and happens only on your explicit go-ahead.
- **Parsing is field-level fail-soft** (ZCode-style): a semantically bad
  agent entry is skipped with an error finding while its siblings apply; a
  mistyped optional field is ignored with a warning (and counts as absent
  for the atomic pair — so a pinned `model` with a typo'd `thoughtLevel`
  skips the whole entry); a syntactically broken file empties the agent set
  with one parse-location error. There is no seed in any failure path.
  Findings surface in the plugin diagnostics log.
- **`depths` is deprecated**: the array is ignored with a warning finding.
  Pin ONE `thoughtLevel` per agent instead.
- Each agent materializes as `forge-<ns>-<id>` — a subagent-mode agent
   visible in the task tool's vocabulary (never hidden), whose description
   names its **pool provenance** (namespace + origin forge.json path +
   dispatchability scope; the global family names the global fallback
   layer), carrying the pinned `model`
  (pinned workers) or NO model key at all (Auto workers — the description
  says "inherits the parent session's model" instead of naming a brain),
  the worker discipline (workspace-relative paths only, verbatim reporting
  of tool refusals, evidence-bearing conclusions) around its role prompt,
   and a deny-style permission: an ABSENT `shape` defaults to WRITE (open
   permissions — the compatibility-preserving default for existing pools);
   an explicit `shape: "readonly"` denies
   the full mutating-tool family — `write`/`edit`/`bash` plus the host's
   patch family (`patch`/`applypatch`/`apply`/`multiedit`) — `shape:
   "write"` allows them (same as absent), an explicit `permission` map overrides the shape
   default (lifting ANY member of that family off `deny` forfeits the
   draft-phase readonly exemption) — and `task` is ALWAYS
   denied (recursive spawning stays physically impossible). Readonly is a
   restriction you ask for explicitly, never a surprise default — new pools
   should give every agent an explicit `shape` (the `/crew` initialization
   gate teaches the AI author exactly this).

> **Upgrading from ≤ 0.5.0 (breaking):** agent entries that pinned `model`
> without `thoughtLevel` used to be accepted; they are now SKIPPED with an
> error finding naming the missing half. Fix per entry: add the missing
> `thoughtLevel`, or delete `model` to make it an Auto worker.

> **BREAKING — every materialized id is now namespaced.** The
> first-registered pool's plain-id privilege is gone: existing plain ids
> (`forge-coder`) no longer exist, and there are **no compat aliases** —
> deliberately, because an alias layer would resurrect the two-ids-one-agent
> ambiguity this change kills (crew records and docs referencing old ids
> are history artifacts). Migration:
>
> - **Single-pool workspaces**: add a short stable top-level `"pool"` field
>   to your forge.json (`[a-z0-9-]`, 1–24 chars) and dispatch
>   `forge-<pool>-<id>` from now on.
> - **Pool-less workspaces** (global fallback roster): dispatch
>   `forge-global-<id>` — the global layer materializes under the fixed
>   namespace `global`.
> - **New crew-governed pool-compliance gate**: `crew_begin` refuses to
>   register, and every `task` dispatch of a `forge-*` worker from a
>   crew-governed session is refused, while the workspace pool file lacks a
>   valid declared top-level `pool` field. The fix is one line — add the
>   field (the refusal suggests a namespace) — and the gate lifts
>   hot-apply: the next resolve after the repair admits registration and
>   dispatch with no host restart. Global-fallback sessions are exempt.
>   Per-agent fail-soft findings never make the file non-compliant.

**What applies when** — only a real materialization re-reads the pool
files into the `forge-*` vocabulary. Materialization triggers (2026-10-01
live finding): host boot (a freshly started CLI process reads the files as
they are), the FIRST config build for a directory on this host, and
opencode config file reloads. A NEW session on a long-lived shared host
(serve-type) does NOT re-materialize:

| change | needs a host restart? |
| --- | --- |
| `thoughtLevel` on an existing agent | no (applies to NEW sessions of that agent; running sessions keep their frozen depth) — depth lookups resolve the pool files fresh at every dispatch, independent of materialization |
| agent added / removed / edited, any pool file created or deleted | no restart — but not at the next session either: the materialized `forge-*` set rebuilds only at the next REAL materialization (host boot, opencode config reload, or a first config build); on a long-lived shared host pool changes wait for that rebuild or a restart. The crew gate, the session-domain dispatch gate, and depth lookups resolve the pool files fresh regardless — a DELETED pool file un-materializes at that next resolve |
| a NEW directory joining the host (the first session of another project on the shared host) | no restart — that first config build itself re-initializes the plugin and registers that workspace and its pool (existing pools never flip — every family namespaces by its own `pool` field or directory name, so ids never depend on arrival order) |

### Dispatching

Say "dispatch a subagent..." in a forge session and the model picks from the
task tool vocabulary: a configured `forge-*` agent whose description matches
runs on its pinned brain; if none matches, forge is instructed to say so
plainly and fall back to the native task channel. During a plan draft the
`task` tool is gated by the dispatch target's effective readonly shape:
readonly scout dispatch passes as reconnaissance (breadth evidence without
burning the planning session's context), write-shaped workers and native
agents are denied with the dispatchable roster and the two exits.

**Known pitfall — keyless endpoints × readonly agents**: free/keyless
providers can return a deterministic EMPTY response for any toolset-reduced
(readonly) agent. On the native task channel this now surfaces as a visible,
attributable task failure; the mitigation is unchanged — use
`shape: "write"` for such endpoints, or a keyed provider.

### Readonly exec seal (the sealed supervised-exec channel)

The readonly shape used to seal only the TOOL face (write/edit/bash + the
patch family) — a readonly worker could still mutate the world through its
exec channel (`forge_shell`). The exec seal closes that hole: a session whose
running `forge-*` worker has an **explicit** `shape: "readonly"` (an absent
shape defaults to write and is **never** sealed) has its `forge_shell` calls
classified BEFORE spawn by a pure string classifier (`src/exec-classify.ts`,
no fs access at classify time). READ-CLASS commands (inspection, search,
read-only evals — `rg`, `git log`/`status`/`diff`, `node -e`/`python -c`
read evals, version/help queries) flow normally; **WRITE-CLASS commands are
denied** with a bounded finding (once per session per indicator class) that
names the readonly shape, names the classified write indicator, and points
at the remedy: `"shape": "write"` on that agent when its job legitimately
mutates. The worker is told to report the refusal verbatim, not work around
it. The primary forge session is never sealed; a session whose agent cannot
be resolved fails open (one-time disclosure). The seal composes with — never
replaces — the draft-phase ask/deny posture on the channel.

Covered WRITE-CLASS indicators:

| indicator | covers |
| --- | --- |
| `redirect` | output redirection to files — `>` `>>` and fd forms (`2>`, `1>`, `*>`); the PowerShell family uses the same operators |
| `mutating-cmdlet` | `Set-Content`, `Out-File`, `New-Item`, `Remove-Item`, `Move-Item`, `Copy-Item`, `Add-Content`, `Clear-Content` |
| `git-mutation` | `git add/commit/push/reset/checkout/rebase/merge/clean/rm` |
| `pkg-mutation` | `npm publish`, `npm install` (incl. `npm i`/`ci`/`add`), `bun add`/`install`, `pip`/`pip3 install` |
| `workspace-write` | output-target flags (`--out`, `--output`, `--out-file`/`--outfile`/`--outFile`, `--dest`, `--destination`, `-o`) whose parsed value is a workspace-relative path, or an absolute path under the session workspace |

**Honest positioning — this is belt-in-depth, NOT a sandbox.** A command
that fails to classify is treated as READ-CLASS (fail-open on the channel,
the same posture as every refusal belt). The known bypass surface, verbatim:
**indirect writes** (a script that writes internally — `node build.js` with
no redirect is indirection the classifier does not model), **`Start-Process`
writers** (spawning a writer process is explicitly out of scope), and
**encoded payloads** (`powershell -EncodedPayload …`, base64 blobs) are NOT
covered; they flow on the readonly channel. The seal narrows the exec hole
from "completely open" to "explicitly constructed indirection" — a true OS
level seal (write-time redirection, shadow copies, containers, win32+POSIX
dual implementations) was evaluated and rejected as a disproportionate
rewrite (see `openspec/changes/readonly-exec-seal/design.md`, option D3).
The tool-face deny remains the first belt; this is the second.


### The thoughtLevel word

One word per agent: the canonical seven-word dictionary
`none | minimal | low | medium | high | xhigh | max`, or any native level
name. **Write lowercase**: the value is normalized at the config boundary
(trimmed and lowercased), so `High` and `XHigh` behave exactly as `high` and
`xhigh`; normalization that changes what you wrote records one warn finding.
Native casing on the wire is the catalog's business, never yours. Injection
rides the `chat.params` hook keyed by agent name. The wire shape comes from
data, not guessing — with ONE family decided ahead of the catalog: for the
**anthropic family** the channel is read straight off the empirically
verified transport matrix — adaptive-era models (major > 4 or 4.7+) take
the adaptive effort key `options.effort` (the host transports it as the
adaptive-era native `output_config: {effort: <word>}` wire shape), legacy-era
models take the budget tier table below — and the models.dev catalog is
**not consulted** for this family: its effort claim cannot sound on the
current host generation's anthropic transport, which silently drops the
`reasoningEffort` key a catalog effort shape would select. For every other
family the catalog remains the shape authority: a model the models.dev
catalog knows by
`reasoning_options` is translated per that catalog shape (effort word list /
toggle / token budget); a catalog-silent model falls back to the
provider-prefix family; a provider absent from both is treated as an effort
**word channel** by default (custom relays and unknown endpoints — the most
universal shape). **The dictionary is a
dictionary, never a whitelist**: a word matching neither the dictionary nor
the model's ladder passes through VERBATIM on word-shaped channels
(`reasoningEffort = <word>`, or `effort = <word>` on the adaptive channel),
disclosed as unverified — the provider is the
final judge, and a provider-side rejection surfaces as the request's own
error. Known host-side limitation: the adaptive channel passes `none`
through verbatim per the dictionary axiom, but the current host generation's
anthropic transport refuses to send such a request (it silently never
reaches the wire) — documented here, deliberately not worked around. Ladder
matching is case-insensitive and emits the catalog's native
casing (`xhigh` in, `XHigh` out when the catalog says so). **The only dead
ends are the two shapes with no word channel**: budget-style (legacy
Anthropic-style) models have a published thinking tier instead
(`minimal → 1024` — the Anthropic API hard floor, the only cross-project
consensus number; `low → 8192`, `medium → 16384`, `high → 24576`,
`xhigh → 28672` — a half step between high and max; `max → 32768`;
`none → off`. **This tier table is this plugin's selection — there is no
community-standard tier table**), and pure toggle endpoints (zai/GLM: a level
word has no toggle counterpart) — there the plugin injects nothing and
records one bounded finding naming both vocabularies. **Host-transport
caveat (observed on the opencode 1.18.34 generation):** the anthropic
transport rewrites the thinking `budget_tokens` value this plugin injects
to 1024 regardless of the selected tier (characterized by four paired
probe experiments). The tier table above is the plugin-side truth —
verifiable with a `FORGE_DEPTH_PROBE=1` trace — while the value that
actually reaches the wire is the host's to rewrite. No interpolation
anywhere; the session is never broken by a config word. A session's depth is
frozen at its first request (editing forge.json mid-session never rewrites a
running session).

## Crew workflow (`/crew`)

`/crew <objective>` is the third state-activation command next to `/plan` and
`/goal`: it enters crew orchestration discipline for the session. The macro
contract above the crew may come from an approved plan, an OpenSpec change, or
inline text — the discipline is identical in all three cases and never
requires a plan. The flow:

1. **Register** the declared plan: `crew_begin {objective, subtasks}` — one
   titled subtask each, optionally naming the intended `forge-*` agent.
   When the macro contract descends from a plan artifact, pass its path as
   the optional `lineage` argument — recorded as a first-class `lineage:`
   line in the crew record header and disclosed in the registration output
   (explicit argument only; never inferred from a recently discarded plan).
   Registration enters a **PENDING** crew: execution has not started. The
   registration output LEADS with the crew record path line (same
   first-block prominence as the plan tools' `Plan created:`) and the
   PENDING pause text instructs the model to relay that path to the user
   alongside the choice — so you can verify the record really landed on
   disk (an earlier output order buried the path line, and the model
   reliably drops what it buries — leading with it is the fix). The
    output then confirms the roster **grouped by pool with its origins**
    (which forge.json families the dispatchable set materialized from —
    every family rendered as `forge-<ns>-*`, no plain-id family),
    presents the three execution-mode choices, and stops
    the turn. Registration pre-flights **pool compliance**: the workspace
    pool file must declare a valid top-level `pool` namespace — a
    non-compliant file refuses the registration outright (see the BREAKING
    note above; global-fallback sessions are exempt), and while a crew
    governs the session every `forge-*` task dispatch re-checks the same
    compliance (a file degraded mid-crew blocks further crew dispatches
    until repaired — the fix is the one `"pool": "<suggested>"` line, and
    it lifts hot-apply). Reconnaissance task calls are free BEFORE registration.
2. **The pause is mechanical**: while the crew pends, every `task` dispatch is
   refused by an interception belt. The user chooses:
   - **supervised waves now** — `crew_begin {execution: "waves"}` lifts the
     belt and the wave discipline runs;
   - **convert to a goal contract** — `crew_begin {execution: "goal"}` ends
     the crew as a conversion record and the session drafts `goal_write`
     (arm=true) folding the declared subtasks into criteria/checks; the arm
     dialog is the user's gate;
   - **standby** — no call; the crew waits until armed or abandoned.
3. **Execute in waves** (armed crews only) of parallel native `task` calls
   (results return in-turn; the next wave launches only after the previous
   wave's results). GUI / computer-use subtasks are mutually exclusive within
   a wave (the desktop is a singleton; non-GUI subtasks still parallelize
   freely), and GUI walkthroughs use the `computer` tool rather than DIY
   shell screenshot pipelines.
4. **Missing role?** Run the subtask through a native task call anyway and
   tell the user — suggest configuring the missing role.
5. **Verify** each subtask against its acceptance-evidence statement;
   retry a failure at most once.
6. **Close** with `crew_close` — a hard, ask-gated gate cross-checking the
   report against the DECLARED plan: every declared subtask needs a
   PASS/FAIL verdict with evidence; an undeclared subtask in the report
   refuses the close (fold discoveries into an existing verdict, or discard
   and re-crew); a FAIL needs both failure reports.
7. **Re-shard exit**: `crew_close {abandon: true, reason}` abandons the crew
   — ask-gated like the close, no verdict requirements, usable from PENDING
   (standby cancel) and EXECUTING (wrong decomposition) alike. The session is
   immediately free for a fresh `crew_begin` with the corrected plan.

**Crew record**: registration writes `.opencode/crew/<date>-<slug>.md` under
the session anchor with the declared plan; arm / convert / abandon / close
append to it. It is inspectable history and a compaction-recovery anchor —
NOT a resume mechanism: crew state is in-memory and a host restart ends it
honestly (a stale record is inert).

**Goal-delegated orchestration**: while a live ACTIVE goal governs the
session, the pause folds into the goal's own authorization —
`crew_begin {objective, subtasks, execution: "waves"}` in ONE call is legal
(born armed, never pends), `crew_close` (report and abandon) are ask-free
(the goal's arm/complete/budget gates are the user boundary), and
`execution: "goal"` is refused (already governed). The goal continuation
brief carries the own-the-crew-layer directive, so an armed loop can crew,
re-shard (`abandon` + fresh one-call registration), and close without a human
turn. Neither harness requires its slash command — the ask dialogs are the
authorization surfaces; the templates are discipline carriers.

**Artifact anchoring** (plan / goal / crew alike): a git-repo session anchors
artifacts at the repo root; a plain-folder session anchors at the folder
itself (a rootish guard keeps degenerate global-project worktrees from
landing files on the drive root or the launch anchor). The anchor follows the
session's workspace, never the objective's scope.

**Not initialized?** `/crew` on a session whose roster is EMPTY (neither
its workspace pool nor the global fallback materializes an agent) refuses
with one-time setup guidance: the two file paths and their sole-ownership
relationship (the workspace pool IS the whole roster; the global layer is
fallback-only, never merged; nested forge.json files ignored), a
copy-paste template, and the choice of configuring it yourself OR having
the session AI do it — the latter only on your explicit go-ahead in that
conversation, through the normal visible write path (when the AI writes
the file every agent gets an explicit `shape` — `readonly` for read-only
roles, `write` for implementers — and it also proposes a short stable
`pool` namespace so ids survive directory renames). This is the plugin's
only configuration invitation. Saved files apply at the next real
materialization — no restart needed, and a deleted pool file
un-materializes its agents; on a shared host, the first session in a NEW
workspace registers that workspace and its pool automatically (a new
session in an existing workspace does not re-read the files — see the
apply-timing table above).

### Debris note

The old dispatch suite's ledger at `<tmp>/opencode-forge/dispatch/` is no
longer written. If it exists on your machine it is inert runtime debris —
delete the directory freely, also after uninstalling.

## Hang watchdog (a stuck builtin shell unblocks itself)

`forge_shell` is structurally immune to the stdio-EOF hang, but the builtin
`shell`/`bash` tool can still hang outside it — under `jobs.mode: "native"`
or `jobs.keepBuiltinShell: true`, forge-family sessions carry it again. The
watchdog is the independent backstop for those paths, in **forge-family
sessions only** (primary and delegated forge-* workers alike) — non-forge
agents' builtin shells are entirely native: no markers, no timing, no kills:

1. The host's shell environment hook stamps each builtin shell call's
   process with a plugin-namespaced marker (`FORGE_WATCHDOG_MARK`), and the
   call is timed from start to end.
2. At 80% of the stall budget: a diagnostic entry (the session is busy —
   injecting a message would just queue, so nothing is sent to it).
3. At `watchdog.stallMs` (default 600000): the call's process tree is
   located and **killed** — the pipes hit EOF and the pending tool call
   resolves immediately with whatever output was captured.
4. If the call still hasn't returned after the kill, or no matching
   process exists (a hang with nothing to kill): an honest
   diagnostics-only `unresolved` report.

Location is exact where foreign process environments are readable (POSIX
`/proc/*/environ` marker match). On Windows they are not readable, so the
watchdog infers in two guarded waves, both restricted to processes created
during the stalled call: wave 1 matches descendants of the opencode host
process or processes whose command line carries the stalled call's own
command text; wave 2 — only when wave 1 found nothing, or killed and the
call still didn't return within the observation window — additionally
matches processes whose command lives in the stalled command's own
directory, which is exactly where the detached stdio holders of the
exit-with-inherited-stdio hang class sit. The locator never targets its
own probe processes, console hosts (`conhost.exe`), or anything created
before the call's time window. If the shell environment hook itself ever
stops firing (host API drift), the watchdog detects the missing marker and
degrades itself to dry-run instead of killing by inference alone.

**Modes** (`watchdog.mode`, default `kill`): `dry-run` records the exact
process list it *would* terminate and kills nothing — recommended for a
first observation round on a new host; `off` disables timing entirely.
`watchdog.stallMs` is clamped to a 60 s protection floor. Invalid option
values fall back to the defaults and the fallback is ledgered.

**Known trade-off.** The builtin shell exposes no output visibility, so
the watchdog cannot tell "hung" from "quietly working" — a legitimate
silent command longer than the threshold will be killed. That is the
deliberated price of stopping multi-hour hangs; the guidance layer already
routes legitimate long-running work to `forge_shell`, which has real idle
detection. On Windows, concurrent builtin shell calls started inside the
same window are inferred together (the rare case) — `dry-run` makes the
exact blast radius auditable before you trust `kill`.

**Retiring it.** When upstream ships exit-based completion for the builtin
shell, switch `watchdog.mode` to `dry-run` for an observation round, then
`off`.

### Watchdog ledger

Every intervention (warn / kill / dry-run candidate / unresolved /
config fallback) appends to `<tmp>/opencode-forge/watchdog/log.jsonl`
(bounded: 200 entries, oldest rotated out). Deleting the directory after
uninstall is safe and complete.

## Design stance (read before filing "bash is blocked" issues)

During a plan's draft phase every mutating tool — `bash` included — is
denied, and an `allow` in your config does not override it. Reconnaissance is
read/grep/glob; if you genuinely need a shell command to decide the plan,
approve the plan first (revising after approval is allowed via a new `/plan`).
The escape hatches are `plan_approve` and `/plan discard`, by design.

One carve-out, keyed on the target rather than the tool: during a draft the
`task` tool is gated by the dispatch target's **effective readonly shape**. A
dispatch to a forge worker whose shape is EXPLICITLY `readonly` AND whose
permission
overrides do not lift `write`/`edit`/`bash` — nor any host patch-family tool
(`patch`/`applypatch`/`apply`/`multiedit`) — off `deny` (`ask` counts as
lifted — fail-closed) passes as a reconnaissance dispatch: readonly scouts
may be spawned both before and during the draft, so breadth
evidence-gathering does not burn the planning session's context. A worker
with NO shape field is not exempt (absent defaults to write). Every other
target — write-shaped and shape-less workers, native agents, absent or
unresolvable targets
(including resume calls that carry no target) — is denied like any write-class
tool. The refusal names the currently dispatchable effective-readonly roster,
points to defining a readonly worker in forge.json (explicit
`"shape": "readonly"`) when the roster is empty
(an unconfigured host stays fully denied — same behavior as before, just more
actionable wording), and names the two exits (`plan_approve`, `/plan
discard`). Invariant strength is unchanged: the scout's materialized
permission hard-denies the mutating-tool family — write/edit/bash and the
patch family (and `task`, always — no chained
spawning), the scout's own session is ambient-bound to the same draft write
ban, and its `forge_shell` calls ride the same per-call ask gate the primary
agent faces. The `permission.ask` belt does not follow the exemption: on a
host configured with `task: "ask"` a draft-phase dispatch is still denied
(fail-closed degradation by design — the side belt does not resolve target
shapes).

Separately, the builtin shell is hidden on the forge agent on purpose —
`forge_shell` is the exec surface there (see Agent partition and the job
supervisor chapter above). The hide is unconditional: it covers a
**user-defined** `agent.forge` entry too. The escape hatches are
`jobs.keepBuiltinShell: true` (builtin shell back on the forge family) and
`jobs.mode: "native"` (supervisor retired entirely).

### The exec channel is final for this plugin-API generation (2026-09-28)

The four layers — tools-map hide, prompt mandate, belt refusal, `forge_shell`
itself — are the ceiling of what the current opencode plugin API can express,
and the design is closed deliberately:

- **Not expressible**: `tool.execute.before` can only mutate `args` or throw.
  There is no tool-name rewrite, no executor replacement, no result injection —
  "transparently reroute a builtin bash call through the job runner" cannot be
  written. Registering a plugin tool named `bash` collides globally: tool
  registration is not per-agent, and the per-agent mechanism is exactly the
  tools map some hosts ignore.
- **Prior art ships a subset**: OMO (oh-my-opencode-slim / oh-my-openagent,
  the largest opencode plugin ecosystem) pairs a permission-deny boundary with
  a prompt channel mandate and does not hide the builtin shell at plugin level
  either — their models also see bash and pay one denial round.
- **The residual is bounded and accepted**: on hosts where the hide does not
  hold, a first bash attempt costs one round-trip per session — the belt
  refuses pre-execution (~2 ms, the command never runs), the message names
  `forge_shell`, and models re-issue once and stay on-channel. Field data
  (2026-09-28): zero duplicate executions attributable to the belt.
- **Reopen on upstream movement**: hosts honoring injected tools maps (the
  belt becomes pure insurance), a tool-execute replacement hook (transparent
  rerouting becomes expressible), or exit-based builtin-shell completion (the
  watchdog retirement path above applies).

A process restart forgets the session binding: the write-ban soft-disables
(safety over strictness) and the next session's system notice + `/plan
resume` re-bind from the plan file on disk, which is the source of truth.

## Development

```bash
npm install
bun run typecheck     # tsc --noEmit
node --test tests/*.test.mjs
bun run bundle        # rebuild self-contained dist/index.js (committed)
```

Architecture: `plugin.ts` (dual entry — v1 `server` full-featured + v2
`setup` defensive forward-compat; the /plan and /goal command templates each
carry their own full discipline, hermes-style: the entry turn is the
rulebook) + `src/plan-file.ts` / `src/goal-file.ts`
(pure document cores, unit-tested, no opencode imports) + `src/run-check.ts`
(shell/file-contract runner with tree-kill timeouts and a workspace path
guard) + `src/proc.ts` (shared spawn/tree-kill muscle) + `src/job-manager.ts`
(job registry, ownership, wake queue — pure logic) + `src/job-runner.ts`
(four-condition race, pipe capture, log tee). Behavioral changes go through the
OpenSpec workflow in `openspec/` — see AGENTS.md. Common pitfalls live in
`../opencode-plugin-dev-pitfalls.md`.

## License

MIT
