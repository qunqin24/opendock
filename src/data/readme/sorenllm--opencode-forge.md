# opencode-forge

Single general-purpose **forge** agent for [opencode](https://opencode.ai), with three file-backed harnesses: plan, goal and crew. OpenSpec workflows remain separate. This README describes the in-progress runtime retirement, not a released or live-host-verified replacement.

```
/plan fix login timeout   → read-only recon → plan_write (draft, writes denied)
                           → present, end turn → USER REVIEW (revise / discard / go-ahead)
                           → plan_approve (user dialog = final gate) on explicit go-ahead
                           → execute task by task, plan_tick on each (timestamped audit)
                           → all ticked → per-criterion self-check → plan_close
                             (plugin re-runs the FROZEN checks, fail-closed, no dialog) → done
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
- Draft plans restrict writes for the session. The intended native dispatch policy admits only eligible readonly scouts with shell explicitly denied; actual native admission remains to be verified. Approval or discard ends the draft.
- `plan_approve` is pinned to a confirmation dialog: the model can never
  flip itself into execution. `plan_close` has **no dialog** — the
  completion gate is plugin-verified: plans that declare Verification
  Checks (`plan_write {checks: [...]}`, goal-harness-shaped) get the frozen
  set re-executed on the host at close, fail-closed (a failing check
  refuses the close, records the run in the plan's `## Check Log`, and the
  plan stays approved); plans without declared checks keep the
  per-criterion self-check gate. Both paths append an evidence summary the
  user reviews asynchronously; `plan_reopen` (done → approved, explicit
  user instruction only) is the rollback window.
- **Confirmation gates are time-boxed (gated-ask watchdog)**: every
  confirmation gate (`plan_approve` / `goal_write` arm /
  `goal_complete` / `goal_resume` / `goal_discard` / `crew_close`) is
  wrapped by a watchdog — when no answer arrives within the window (default
  300 s, `FORGE_GATE_ASK_WATCHDOG_MS`, 0 disables), the gate resolves as a
  DISCLOSED REJECTION: the awaiting tool call fails with a finding that
  names the gate, the timeout, the fail-closed posture (state unchanged,
  nothing approved — the invariant survives verbatim) and the retry
  contract (re-run when the dialog is actually visible; a late click on the
  stale dialog cannot approve the refused call). The plugin NEVER
  auto-approves. This exists because of a real incident: a TUI wedge where
  the dialog never rendered and `goal_write` hung forever.
- **A confirmation dialog reaches the session that asked (hosts with more
  than one directory)**: an opencode v2 host runs one instance per project
  directory, each with its own pending-permission table, and a terminal
  reads and answers a session's requests only through that session's own
  directory. The plugin's tools confirm through the interface of the
  plugin initialization that registered them — the one of the session's
  directory — never through a shared one. With several directories loaded
  at once (several TUI tabs, a pooled worktree, a second project) the
  dialog shows up where the call was made **and the answer given there
  reaches it**, and the host evicting one directory's idle instance does
  not break the gates of any other. (Before 0.34.1 one
  shared interface filed every directory's requests in the table of the
  directory initialized last: the dialog still popped up — a terminal
  hears of a new request through a host event — but the answer could not
  find the request, the dialog vanished and the gate waited out its
  watchdog.) A door whose directory has no confirmation interface refuses
  by name (fail-closed: nothing is approved, nothing executes).
- Goal files: `.opencode/goal/<date>-<slug>.md`, state machine
  `queued → active ⇄ paused → completed / abandoned`, one live goal per
  session plus a workspace queue. Completion is **verified by the plugin**,
  not attested by the model: `goal_complete` re-executes every check itself
  and refuses (fail-closed) on any failure.
- Plan, goal and crew records are user data and remain on disk when Forge is disabled or removed.

## Agent surface

Native host tools are the intended execution and dispatch surface. Harness state changes remain forge-primary-only. Pool and draft restrictions are intended runtime gates, not permission grants; native host admission still requires verification. Explicit user configuration takes precedence over picker/default transforms.


## Install

The current 0.34.1 development candidate is v2-only. The v1 entry and package subpath have been removed. The planned 0.35.0 release is not yet released or accepted.

```bash
# npm (recommended)
opencode plugin add @sorenllm/opencode-forge
# or GitHub source
opencode plugin add git+https://github.com/ChengZiiii/opencode-forge.git
```

Local development uses a directory package reference (`file:///<repo abs path>`)
in the host plugin configuration, with its package manifest and built dist
present. The v2 loader does not accept the old single-file installation.
CLI `plugin add` accepts npm registry or Git package specifiers; directory
loading is a configuration mechanism, not a CLI install recipe.

Note: do not enable opencode's experimental plan mode
(`OPENCODE_EXPERIMENTAL_PLAN_MODE`) together with forge — two plan mechanisms
would overlap.

### Upgrade notes — planned 0.35.0 (breaking changes)

These are the approved runtime-retirement decisions for the intended release,
not a release announcement or a claim of new live-host verification.
The old shell/job and dispatch engine code and the v1 `server` entry/export
are retired in the current working tree. Same-name search enhancement is now
implemented, as is native cancellation. The fixed e3ec development bundle has partial live-host stop evidence; full native admission, cancellation, search, activation/removal and final-package verification remain pending.

**Before upgrading:** confirm your host is opencode 2.x (`^2.0.0`). The
intended release removes the v1 `server` entry and `./server` export; v1
will no longer be supported. While still on the old plugin, review surviving
and background jobs, queued dispatches and in-flight children. Decide whether
to wait or stop them using the old version's controls, and confirm their
disposition before upgrading. Do not upgrade with that check outstanding.
Back up recipes, generated definitions and historical harness records.

| Previous behavior | Intended release |
| --- | --- |
| `forge_shell`, `forge_jobs`, job supervisor, process fence and stuck-shell watchdog | Removed. Use builtin `shell` and the host Shell panel; no plugin job list/poll/kill, survivor adoption, idle/success-pattern early return or process-lifecycle guarantee. |
| `cwd:` in command results; forced noninteractive editor/pager | No plugin guarantee. The host determines working directory, timeouts and editor/pager behavior. |
| Command-level readonly seal | Removed. Readonly workers retain shell by default; file-write restrictions are not a readonly shell sandbox. Explicit recipe denies still apply. Draft recon requires eligible readonly workers with shell explicitly denied. |
| Plugin `task` dispatch engine | Removed without fallback. Use native `subagent`: background only, no plugin concurrency limit, queue, per-call permissions, retries, restart adoption, logs, report files, progress or supplemental wakes. |
| Dispatch results and cancellation | See host child-session records/transcripts and completion messages. `/forge stop` requests cancellation of confirmed native descendants and their owned background commands; a request is not confirmed termination, cancellation is not task success, and parent interruption alone does not guarantee children stop. Host notification and restart behavior belong to the host. |
| `forge_grep` / `forge_glob` | Removed. Current source enhances builtin `grep` / `glob` under the same names via `editor.update`, defaulting `follow` and glob `hidden` to true for all agents where supported; unsupported host contexts retain native behavior. Isolated staged-host execution has been reported, but final-package, authorization-equivalence and uninstall E2E verification remain pending. |
| Agent-family tool hiding | No longer hides Forge tools from other agents. Harness state tools remain forge-primary-only; session/pool and draft gates still govern dispatch while Forge is enabled. |
| `agent["forge"].disable` whole-plugin switch | Retired in the working tree. The host owns plugin activation; agent disable affects the agent only. The native activation/removal matrix remains blocked. |

Plan, goal and crew retain their file formats and disciplines. Their runtime
checks, gates and continuation require a loaded Forge plugin. Worker questions
default to denied; explicitly allowing `question` can leave a background child
waiting for an answer that never reaches it.

Old `dispatch`, `jobs.*`, `watchdog.*` and `FORGE_DISPATCH_*` settings are
ignored with bounded diagnostics, not rewritten. The confirmation
door timeout `FORGE_GATE_ASK_WATCHDOG_MS` remains. The retired runtime's
job/watchdog files and dispatch logs are neither read nor deleted by the new
runtime. Historical paths include `<tmp>/opencode-forge/jobs/`,
`<tmp>/opencode-forge/watchdog/`, `<tmp>/opencode-forge/dispatch/` and
`<project>/.opencode/forge/dispatch-log.jsonl`. After confirming no old jobs
need them, manually remove specific old files only if you no longer need
their history.

Generated definitions must match current compiled content/contract even if
recipe timestamps are unchanged. Incompatible worker projections are not
silently accepted for dispatch/recon/crew. Use `/forge sync` from the forge
primary or existing `sync: "auto"` opt-in; without authorization no rewrite.
Builtin overrides have their own independent compilation rules; handwritten
same-name files are protected. A broken workspace pool remains exclusive (no
global fallback); host-wide visibility does not grant cross-pool dispatch.

**Rollback is not lossless.** Reinstalling an older version with authorization
and restoring backups or explicitly syncing definitions for that version does
not guarantee recovery of old job lifetimes, pending work, notifications or
terminal states. Preserved plan/goal/crew records do not themselves resume
or reconcile live work.

### Upgrading (previously verified installer behavior)

`opencode plugin add` APPENDS — it never replaces an existing entry for the
same plugin id, so a bare `opencode plugin add @sorenllm/opencode-forge`
over an existing install fails with `Duplicate plugin ID: forge`. The
historical installer evidence suggests this upgrade sequence; current-candidate removal and activation are not yet verified:

1. Remove the old entry first (uninstall step 1 below: edit the `plugin`
   array in `~/.config/opencode/opencode.json`).
2. Install the new source: `opencode plugin add @sorenllm/opencode-forge`.
3. Smoke-check (`opencode agent list` shows forge + forge-* workers), then
   clean the stale store dir (uninstall step 2) if you switched sources.

Also verified on the 2.x installer: `remove` only removes the config entry
of its own registered source; the `npm:` prefix is not accepted by `add`
(use the bare package name); and the store path is derived from the
specifier spelling, so switching between npm and github sources leaves both
store dirs behind — isolate only the identified stale copy if cleaning up.

### v2-host notes

Native worker Markdown is the default v2 materialization. Picker/default transforms are runtime-only; explicit user configuration wins. The global recipe option `hideNativeAgents: false` retains visible native primaries. Disabling the plugin must not remove agent files or user settings.

See the activation/removal boundary below. Earlier development-package probes are historical evidence only, not acceptance of the current candidate.

Global workers and built-in overrides use `$OPENCODE_CONFIG_DIR/agent` when that directory is configured, otherwise `~/.config/opencode/agent/`. Workspace workers remain in the workspace `.opencode/agent/` directory. Historical generated files at the previous global location are not automatically removed.

## Configuration

Optional configuration (your config, your files —
the plugin never writes them):

```jsonc
{
  "agent": {
    "forge": {
      "model": "provider/model"    // pick any model for forge
    }
  }
}
```

If you already have a `command.plan` or `command.goal` of your own, it wins
in the effective host command registry. OpenCode v2.4.0 reapplies user command
configuration after plugin registration.

## Disabling and re-enabling Forge (planned 0.35.0)

Forge no longer has a private whole-plugin disable switch. Disabling just the
`forge` agent is not unloading Forge. Public v2.4.0 host source describes
removal selectors (`"-target"`) in `plugins`; CLI help lists `add`, `remove`,
`list`, `check` and `update`, not a disable command. Earlier development-package
probes do not establish the current candidate's activation contract. The current
K matrix is blocked: actual selector resolution, workspace/global precedence,
restart/restore, multi-directory lifecycle and uninstall behavior have not been
accepted. This is a mechanism description, not a tested operational recipe.
Preserve other plugin entries and review effective scope before making changes.

In the intended unloaded state, Forge's runtime registrations, picker/default transforms,
harness tools and commands, prompt injections, tool/permission hooks,
pool/draft/dispatch gates, goal/crew continuation and builtin search
updates are absent. Host/user configuration governs the remaining registry
and builtin tools. Do not rely on Forge runtime protections while disabled.
Re-enabling is intended to restore runtime contributions subject to host configuration,
recipe compatibility and authorized sync rules.

### Independently loaded agent files

Disabling or uninstalling the plugin must **not** hide, rewrite or remove
native Markdown definitions already on disk. The host can still load the
workers and builtin overrides without Forge's runtime gates or injections.
The override files have their own lifecycle, independent of namespaced
worker definitions. To return to native-only behavior, explicitly review
these files as well as your own opencode configuration:

| Scope | Candidate generated files |
| --- | --- |
| Each workspace/pool, including applicable ancestor directories | `<project>/.opencode/agent/forge-<ns>-<id>.md` |
| Global fallback workers | `<global agent dir>/forge-global-<id>.md` |
| Global builtin overrides (independent of workers) | `<global agent dir>/general.md`, `<global agent dir>/explore.md` |

The global agent directory for both workers and overrides is `$OPENCODE_CONFIG_DIR/agent` when configured,
otherwise `~/.config/opencode/agent/` (Windows: `%USERPROFILE%\.config\opencode\agent\`).
Inspect the actual effective host search paths for each workspace and any previous global
directory that remains in use. Forge does not silently move or remove files at the older recipe-sibling path.

1. Inventory and back up the individual candidate files outside all host
   agent scan paths, preserving their original paths.
2. Inspect each file: confirm both the expected filename and its in-content
   ownership marker `<!-- GENERATED BY forge_sync`. A filename or prefix
   alone never establishes ownership. Preserve handwritten same-name,
   unmarked, unknown or ambiguous files; never clean by wildcard or prefix.
3. If desired, manually move the confirmed generated files out of all host
   scan paths or remove them individually after backup. Reload/restart and
   inspect the resulting agent registry; files left there may remain active.
4. For recovery, restore individual backups to their original paths without
   overwriting user files, or re-enable Forge and explicitly run `/forge sync`
   from the primary agent (or use the existing `sync: "auto"` opt-in).
   Restored definitions must satisfy the target version's compatibility rules;
   builtin overrides use their own global recipe entries and sync rules.

Review any explicit `default_agent`, `agent["forge"]` and native `hidden`
settings yourself; they are user-owned and are not automatically undone.
Historical `.opencode/plan/`, `.opencode/goal/`, `.opencode/crew/` and
workspace/global `forge.json` remain untouched by enable/disable or uninstall.

## Uninstall

1. First resolve old live jobs as described in the upgrade notes. Remove the
   plugin entry from the applicable host config (global installs previously
   used `~/.config/opencode/opencode.json`). Check for multiple sources, including historical single-file installs. CLI help
   exposes `opencode plugin remove <configured package specifier>` for global
   configuration; actual scope and removal behavior for this candidate remain unverified.
2. The historical package store locations are
   `~/.cache/opencode/packages/@sorenllm/opencode-forge/` (npm) and
   `~/.cache/opencode/packages/github_ChengZiiii/opencode-forge/` (GitHub).
   If cleaning the store, identify and isolate only the old package copy.
3. Review independently loaded agent files and user configuration using the
   preceding steps; restart the host. Runtime removal alone does not
   restore all native definitions or stop old jobs.
4. Retain historical records and recipes. Old job/watchdog and dispatch
   debris is optional manual cleanup only after checking job disposition.

## File ledger

Retained records and artifacts (legacy files are covered in the upgrade notes):

| Where | What | Lifetime |
| --- | --- | --- |
| `<project>/.opencode/plan/*.md` | plan files | user data — kept forever, uninstall never deletes |
| `<project>/.opencode/goal/*.md` | goal files (contract, Check Log, Turn Ledger) | user data — kept forever, uninstall never deletes |
| `<project>/.opencode/crew/*.md` | crew records (declared plan + arm/convert/abandon/close history; written at `crew_begin` registration, appended at each transition; record-only — never a resume mechanism) | user data — kept forever, uninstall never deletes |
| runtime registry (RAM only) | Forge agents, harness tools and commands, runtime gates | absent when unloaded; no user configuration rewrite |
| `<tmp>/opencode-forge/session-anchors.jsonl` | session-anchor ledger — persisted evidence of the pooled worktrees where live activity bound sessions (pooled binds only, FIFO-capped to 200, fail-soft IO); a restart-resumed session whose record is pool-less and whose in-memory map is empty re-binds its OWN pool from here, only while the recorded pool file still exists on disk | runtime debris — delete freely; losing it only costs the restart-resume own-pool re-bind (sessions re-learn their pool from live activity) |
| `<project>/.opencode/agent/forge-<ns>-<id>.md` | compiled native agent files — `forge_sync` output on v2 native mode (GENERATED header, `forge-` prefix + marker; GC'd by sync when the recipe entry disappears; a transient `forge-*.md.new` temp lives microseconds during atomic writes and is best-effort cleaned on failure) | compiled artifacts — version them: they travel with the workspace (compatibility still requires current compiled content) |
| `<global agent dir>/forge-global-<id>.md` | compiled GLOBAL-roster agents — when (and only when) a global `~/.config/opencode/forge.json` exists, `forge_sync` also compiles its fallback family into the host's own global agent dir (same GENERATED header + marker + GC discipline; non-forge files there are never touched) | compiled artifacts — independently loaded by host; disabling/uninstalling does not remove them; manage individually as above |
| `<global agent dir>/general.md`, `<global agent dir>/explore.md` | built-in override artifacts (0.31.0) — `forge_sync` output when the GLOBAL forge.json's `override` node activates an entry. No `forge-` prefix (the lowercase id stem IS the override key — case-sensitive); GC keys on the in-content GENERATED marker, so re-commenting the entry removes the file; a hand-written file of the same name is never overwritten (sync refuses + discloses). Global agent dir: `OPENCODE_CONFIG_DIR/agent` when set, else `~/.config/opencode/agent/` | compiled artifacts — independently loaded by host; disabling/uninstalling leaves overrides in place; manage individually as above |
| `.opencode/forge.json` (the NEAREST one walking up from the session's worktree — sole ownership) and `~/.config/opencode/forge.json` (global FALLBACK only, never merged) | your static subagent definitions (JSONC) — the workspace pool IS the session's whole roster; nested forge.json files are ignored. **User data — the plugin only reads them, never writes or migrates them** | yours — version the project ones, keep the global one out of sync tools if it holds machine-specific models |
| `~/.cache/opencode/packages/...` | installed package copy | written by the `opencode plugin` installer, not the plugin |
| `~/.config/opencode/opencode.json` | `plugin` array entry | written by the installer |

Other disclosed
transients: the microsecond `forge-*.md.new` temp of an atomic sync
write (best-effort cleaned on failure — a target file is never
half-written) and the `FORGE_GOAL_PROBE=1` env opt-in continuation
diagnostics in the OS temp dir for debugging.

## Goal mode (autonomous, host-verified objectives)

The existing confirmation and completion contracts remain. Native activity
and waiting-state accounting are incomplete; no new autonomy is asserted.

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
burning turns against it). Meaningful read-only investigation, review, real
changes, commits and checks with new evidence are productive work; a write,
shell command or git diff is not required each turn. Repeating a check with
the same input and complete result without other new evidence is not progress.
Unknown or truncated results do not prove equality. Genuine observed host
waiting is not an empty work turn; it should not trigger repeated continuation
prompts. Native activity accounting and live waiting coverage are still incomplete.
`/goal pause` (or `goal_pause` with a concrete blocker description) records a
persistent pause; `/goal resume` re-arms through another confirmation dialog.

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
(run mode never silently passes a gate).

**Security boundary.** Verification shell commands run on your host, in the
workspace, via the plugin — that is the point (host-verified completion).
They are drafted by the model from your objective. Read them in the dialog
before allowing the arm; `--contains` contracts are strictly
workspace-relative (path escape is refused).

Verification uses the platform interpreter chain when the public plugin interface
has no initial merged shell setting (as observed in the v2.4.0 interface):
Windows prefers pwsh, PowerShell, then git-bash, with COMSPEC as a capability
fallback; POSIX uses the available login shell, bash, then /bin/sh.
This does not guarantee that verification uses a user's customized native shell.
Forge does not independently merge host configuration.

## Search tools

Use builtin `grep` and `glob`. Current source uses `editor.update` to enhance those same names for all agents on supported local hosts: `follow` defaults to `true`, as does glob `hidden`. Unsupported host contexts or unavailable definitions retain native behavior.

Earlier staged-host evidence reports real `grep` / `glob` execution on an isolated host with a staged build, demonstrating hidden-file inclusion, junction traversal and duplicate-path merging. The coordinating session also relays real-host execution-time denials for a specific grep pattern (`Permission denied:grep`) and an explicit external root (`Permission denied:external_directory`). These staged runs used differing hashes during concurrent work, not one final package. These are partial evidence only; current search verification is blocked. Final-package verification, full host availability and authorization equivalence (including external link targets), and disable/uninstall restoration E2E remain pending. Mock tests and staged evidence do not establish those gates or a published release.

## Forge subagents (static worker agents in forge.json)

Forge subagents are static user-authored workers, pinned or Auto (parent model), materialized under namespaced IDs `forge-<ns>-<id>`. Native `subagent` is the intended dispatch surface. The session AI never writes your config without explicit user authorization.


### Slash commands — the roster levers

ONE roster command on the supported v2 host:

- **`/forge <argument>`** — the router, four forms:
  - **`sync`** — force a roster sync NOW (`forge_sync`) and show the full
    diff. The manual force/debug lever; the default staleness-gate posture
    and `sync:"auto"` are unchanged.
  - **`init`** — draft THIS workspace's `.opencode/forge.json` in-band
    (interview or infer, show, write only on your explicit go-ahead; refuses
    and reviews when one already exists).
  - **`init global`** — same drafting flow for the GLOBAL
    `~/.config/opencode/forge.json`, with the built-in override entries
    (`general`/`explore`) shipped commented out (inert until you fill one).
  - **`stop`** — directly requests cancellation of confirmed native children and their owned background commands (see [Native dispatch](#native-dispatch)).

On v2 hosts typed arguments are composed into the delivered prompt by the
plugin (the host does no `$ARGUMENTS` substitution for plugin commands).
The hyphenated family (`/forge-sync`, `/forge-init`, `/forge-init-global`,
`/forge-cancel`) is RETIRED — one command, four argument forms, the
smallest collision surface. On v2.4.0, the host's command editor is add-only;
user-configured commands are applied after plugin commands and win same-name
collisions in the registry (verified with an isolated marker plugin). Forge
does not rewrite or delete user command files. The primary identity guard
applies except to stop (live host identity lookup coverage remains incomplete).
The command router never writes files itself — every write goes through
`forge_sync` or the normal write tool on your explicit go-ahead, transcript-visible.

### forge.json — the configuration

A dedicated `forge.json` (JSONC — comments allowed) with **workspace pool
ownership and a global fallback** (sole ownership — the same
workspace-ownership strictness as opencode's native MCP config):

1. the **workspace pool**: the **nearest** `.opencode/forge.json` walking up
   from the session's worktree (session worktree → session directory → host
   launch directory as the anchor chain; first file found on the ancestor
   chain wins, nothing above it is consulted). When it exists, it **IS the
   session's whole dispatch roster**. For the dispatch gates the anchor is
   resolved AUTHORITATIVE-FIRST (the host's session record) with one
   conflict rule: a restart-RESUMED session whose record carries a pool-less
   rebind directory while the session's live in-memory binding still owns a
   pool resolves to the POOLED binding (one bounded console disclosure per
   session names both paths) — own-pool dispatch rights survive both
   degeneration directions (the degraded map, and the rebound record).
   When BOTH degenerate at once — the map empty (no live activity yet after
   a host restart) and the record rebound pool-less — the plugin consults
   its **persisted session-anchor ledger** (a bounded plugin-namespaced
   JSONL in the OS temp dir recording ONLY pooled binds — FIFO-capped,
   fail-soft IO) and re-binds the session from that recorded evidence, but
   only while the recorded worktree still owns its pool file on disk (a
   deleted pool stays deleted); one bounded console disclosure per session
   names the re-bind.
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
native dispatch vocabulary **description carries its pool provenance**: its namespace,
its origin forge.json path, and — for every family except the global
fallback — that it is dispatchable only from sessions whose workspace pool
is that file; the global family names the global fallback layer as its
origin. The same static text ships to every session — the dispatch gate
(below) is the dynamic authority, the description is the honest label.

**Dispatch is gated to the session's own pool.** Materializing every pool
host-wide is a vocabulary necessity (the native subagent tool's agent list is
host-level); what a given session may actually DISPATCH is scoped
session-locally: a subagent call targeting an agent whose pool belongs to
ANOTHER workspace is refused with a finding naming the target's origin
pool path, stating it is *not dispatchable from this session*, and the
exits — open a session in that workspace, or configure the role into this
workspace's pool / the global layer. The `/crew` roster and the
`crew_begin` registration output lead with the session's dispatchable pool
(its forge.json origin — workspace pool, or the global layer marked as
fallback) and list every other host pool as NOT dispatchable with its
 origin path.

### Native roster compilation (`forge_sync`) — v2 hosts

The plugin's slash commands are `/plan`, `/goal`, `/crew`, and the
**`/forge` roster levers** (0.31.0) — one command routing on its argument:

| form | what it does |
| --- | --- |
| `/forge sync` | force an immediate `forge_sync` NOW and report the diff verbatim (created/updated/GC'd/errors) — the manual force/debug/fallback lever; the default staleness-gate posture and the `sync:"auto"` opt-in are unchanged |
| `/forge init` | draft **this workspace's** `.opencode/forge.json` in-band with the forge agent (brief interview or from project context: pool namespace, roles, shapes); **refuses when a recipe already exists** — it offers a review of the existing one instead, never an overwrite |
| `/forge init global` | draft the **global** `~/.config/opencode/forge.json` the same way; the scaffold ships the built-in override entries **commented out** (see [Built-in overrides](#built-in-subagent-overrides-general--explore) below) |

All three are family-guarded templates (a non-forge session is told to
switch to the forge agent and rerun), and the commands themselves write
nothing — every effect lands in the transcript through the in-band tools;
`forge_sync` remains a **tool** the forge agent calls.

On **v2 hosts** (opencode 2.x) the roster materializes **natively by
default** (`materialize: "native"`): forge **compiles** forge.json into
real host agent files — `.opencode/agent/forge-<ns>-<id>.md` — instead of
injecting drafts at runtime. The workspace recipe compiles into the
project's `.opencode/agent/`; the GLOBAL recipe's fallback family
(`forge-global-*`) compiles into the host's own global agent dir
(`$OPENCODE_CONFIG_DIR/agent` when set, otherwise `~/.config/opencode/agent/`) so those workers are machine-wide — a
write that only ever happens on machines where a global forge.json
actually exists. The recipe stays the **sole semantic
authority** (pools, session-domain gating, crew rosters, compliance keep
reading forge.json); the native files are only its projection. On v2, `"materialize": "runtime"` in the
GLOBAL forge.json is the escape hatch back to draft materialization.

Compilation happens through the **`forge_sync` tool** — the forge agent
calls it in-band (every effect transcript-visible), it writes atomically
(temp+rename), garbage-collects files whose entries left the recipe, and
discloses the full diff (created/updated/GC'd). The host **hot-applies**
the files — no restart. **Staleness gate**: `crew_begin` refuses
registration while the compiled artifacts are incompatible with current content (or
missing), with the one-step fix *call forge_sync now*; a plain dispatch
against a missing worker on a native host surfaces the same guidance.
`"sync": "auto"` in a pool file opts that pool into silent regeneration
at session start when stale (disclosed via a console finding); without
it the plugin never writes files uninvited.

**Visibility note**: native agent scoping is the host's up-tree merge —
agents in a parent directory's `.opencode/agent/` are also visible from
nested workspaces. This is a disclosed difference from the recipe's
nearest-exclusive pool scoping; dispatch gating still follows the
recipe, so visibility never grants cross-pool dispatch.

Native shell permission evaluation remains to be verified. Readonly workers deny the native file-write family and code-mode `execute`, but retain native shell by default; shell is not a readonly sandbox. Explicit permissions can override shape defaults, and named workers deny recursive `subagent` and default to denying `question`. Draft scouts additionally need shell explicitly denied.

**Recipe field reference** (per agent entry):

| field | meaning | notes |
| --- | --- | --- |
| `model` | `"provider/model"` — the pinned brain | pairs with `thoughtLevel`; both absent = Auto worker |
| `thoughtLevel` | depth word (`none minimal low medium high xhigh max`) | `low`/`medium`/`high` compile into the model string as a variant (`model#low`); the other words ride the per-spawn chat.params injection |
| `prompt` | role text (1–2 sentences) | defaults: `research`/`review` built-ins, else a generic worker |
| `shape` | `"readonly"` or `"write"` | **absent = write** (open); readonly restricts native file-write tools, not shell |
| `permission` | per-tool overrides (`{"edit":"ask"}`) | merges over the shape face; explicit denies still apply |

Top-level: `pool` (namespace, required for crew-governed dispatch),
`shared` (pool-wide prompt base), `materialize` (global layer only),
`sync` (`"auto"` opt-in), and `override` (built-in overrides — **global
layer file only**, see below).

**Starter recipes** (drop into `.opencode/forge.json`):

```jsonc
{
  "pool": "myproj",
  "agents": {
    // readonly scout: file-reading role, not a shell sandbox
    "scout":   { "model": "your-provider/your-model", "thoughtLevel": "low",
                 "shape": "readonly", "prompt": "Search, read, and run read-only checks; report a compact brief with file:line evidence." },
    // write coder: executes scoped implementation tasks
    "coder":   { "model": "your-provider/your-model", "thoughtLevel": "high",
                 "shape": "write", "prompt": "Implement the assigned task exactly as scoped; no refactoring beyond scope." },
    // readonly reviewer: diff/file review with prioritized findings
    "reviewer":{ "model": "your-provider/your-model", "thoughtLevel": "medium",
                 "shape": "readonly", "prompt": "Read the diff or files under review; report prioritized findings with file:line evidence and a fix suggestion." }
  }
}
```

Generated workers use `mode: subagent`. Compatibility requires matching current compiled content, not just timestamps. Keep handwritten files separate and use authorized sync for generated files.


### Built-in subagent overrides (`general` / `explore`)

The host ships two built-in subagents — **General** (`general`) and
**Explore** (`explore`). The **GLOBAL** forge.json can override them
machine-wide through a top-level `override` node:

```jsonc
{
  // ... optional forge-global-* agents ...
  "override": {
    "explore": { "model": "your-provider/your-model", "thoughtLevel": "low",
                 "shape": "readonly", "prompt": "You are my codebase scout. ..." }
  }
}
```

How it works, and the honest disclosures:

- **Identity key = exact LOWERCASE id stem** (probe-verified on 2.3.2,
  `reports/probe-builtin-override.md`): `forge_sync` compiles an active
  entry to a same-name, **non-namespaced** file in the host's global agent
  dir — `general.md` / `explore.md`, GENERATED marker, `mode: subagent`,
  its independent override compilation rules. A **capitalized**
  file (`General.md`) does **not** override — it creates an ambiguous
  duplicate entry in the agent list; the compiler never emits one, and you
  should never hand-write one.
- **Activating an override replaces the built-in's prompt wholesale.** This
  is not "just pin a model": description/system/model are fully replaced
  (permissions end up builtin-base ∪ appended). **We never copy the
  vendor's prompt text** — it drifts every host version — so an active
  entry without your own `prompt` gets only a minimal generic body.
  **Write your own general/explore.**
- **Inert by default.** The `/forge init global` scaffold (and the
  in-band ask the unconfigured-crew refusal offers) ships the `override`
  node **fully commented out**; uncommenting and filling an entry is your
  act. Not configured = official built-in behavior, byte-equal (the Auto
  worker — no `model` — inherits the parent session's model, which IS the
  built-in default).
- **Global layer only.** A `override` node in a workspace pool file is
  ignored with a warning — workspace agents always compile namespaced
  (`forge-<ns>-<id>`); per-project built-in overrides are a non-goal.
  Unknown override ids (anything but `general`/`explore`) warn + skip,
  fail-soft.
- **Collision redline.** If a hand-written `general.md` / `explore.md`
  already exists in the global agent dir, sync **refuses and discloses** —
  never overwrites (your file stays byte-identical).
- **GC keys on the GENERATED marker**, not the `forge-` prefix:
  re-comment or remove the entry and sync again → the compiled file is
  garbage-collected; a hand-written file of the same name is never touched.
- **Where is the global agent dir?** It mirrors the host's own resolution:
  `OPENCODE_CONFIG_DIR` set → `$CONFIG_DIR/agent`; unset →
  `~/.config/opencode/agent/`.

### Native dispatch

Use host-native `subagent` for background dispatch and builtin `shell` for commands.
Results belong in host child-session transcripts and completion messages. Native
admission, continuation and completion notification still require full host verification.

`/forge stop` executes directly, without waiting for the model to call a tool.
A child must have BOTH confirmed ancestry from the invoking session and native
dispatch evidence; parent ID alone does not qualify. Forge requests termination
of running background commands only when host metadata confirms their owning
session is one of those confirmed descendants, then
interrupts confirmed children and briefly rechecks for revived or newly confirmed
children. Unknown, ambiguous or unavailable enumeration/ownership is disclosed,
not used to broaden the scope. The receipt distinguishes requests from confirmed
terminal evidence, already-idle children from successful tasks, and failed/unknown
outcomes. Cancellation is not task success. Interrupting a parent alone does not
guarantee children or their commands stop. Forge does not clear the invoking
session's queued messages; background command selection follows confirmed child
ownership as described above. Forge does not intentionally cancel unrelated
sessions or other host job types; collateral effects of host interruption are
not globally guaranteed. Child transcripts are retained.

Partial live evidence on the 0.34.1 e3ec bundle shows a target child interrupted,
a cancelled completion notification and its background shell absent from the
running list, with unrelated/preflight shells still running. That is not a complete
cancellation, ownership or collateral matrix, nor final-package acceptance.

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

The file-backed discipline remains. Native dispatch admission, wave settlement
and activity accounting are still being migrated; this describes the intended
harness contract, not a claim of verified host behavior.

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
    governs the session every `forge-*` subagent dispatch re-checks the same
    compliance (a file degraded mid-crew blocks further crew dispatches
    until repaired — the fix is the one `"pool": "<suggested>"` line, and
    it lifts hot-apply). Reconnaissance remains subject to applicable approvals and gates.
2. **The pause is mechanical**: while the crew pends, every `subagent` dispatch is
   refused by an interception belt. The user chooses:
   - **supervised waves now** — `crew_begin {execution: "waves"}` lifts the
     belt and the wave discipline runs;
   - **convert to a goal contract** — `crew_begin {execution: "goal"}` ends
     the crew as a conversion record and the session drafts `goal_write`
     (arm=true) folding the declared subtasks into criteria/checks; the arm
     dialog is the user's gate;
   - **standby** — no call; the crew waits until armed or abandoned.
 3. **Execute in waves** (armed crews only) of parallel native `subagent` calls
    (background children; the next wave waits for verified settlement of the previous wave). GUI / computer-use subtasks are mutually exclusive within
    a wave (the desktop is a singleton; non-GUI subtasks still parallelize
    freely), and GUI walkthroughs use the `computer` tool rather than DIY
    shell screenshot pipelines.
 4. **Auto-advance on idle** (armed crews only): when the session goes idle
    between waves and no live active goal governs it, the plugin's
    idle-continuation engine sends a `[forge:crew-continue]` brief (objective
    + declared subtask titles + wave discipline) after the shared debounce —
    waves advance autonomously until `crew_close`. A PENDING crew is never
    auto-continued (that pause is the user's decision seam), a goal-governed
    session belongs to the goal engine exclusively, and a non-forge speaker is
    never continued. The engine keeps its OWN activity counter (dispatch
    dispatches and write-family calls count); after 3 consecutive
    activity-free continuation turns it STOPS with one bounded console
    disclosure — the crew itself stays registered (no auto-abandon, no
    auto-close; nudge, close, or re-shard), and repeated transport failures
    stop it the same way. A fresh `crew_begin` clears the stall; no disk
    state is added (the crew record is unchanged).
 5. **Missing role?** Run the subtask through a native subagent call anyway and
    tell the user — suggest configuring the missing role.
 6. **Native fallback lane** (crew-native-fallback): when the pool offers no
    forge worker fitting a subtask, or `forge-*` dispatch is blocked by a
    degraded (non-compliant) pool file, the armed crew dispatches the subtask
    through the native subagent channel (e.g. the `general` subagent) with the
    SAME relay contract as a forge dispatch — the change/artifact path for
    authoritative guides, the scoped task prompt, and the evidence demands.
    The fallback is recorded, never silent: the crew record's wave notes name
    it, and the subtask's `crew_close` evidence statement says it ran native
    (free text — the close gate's cross-check is unchanged; titles, verdicts
    and evidence statements govern exactly as before, no new field). The
    mid-crew compliance refusal names this exit while the pool is repaired —
    the belt gates `forge-*` dispatch only. Existing approvals, pending gates, pool restrictions and host permissions still govern; native fallback is not a permission grant.
 7. **Verify** each subtask against its acceptance-evidence statement;
    retry a failure at most once.
 8. **Close** with `crew_close` — a hard, ask-gated gate cross-checking the
    report against the DECLARED plan: every declared subtask needs a
    PASS/FAIL verdict with evidence; an undeclared subtask in the report
    refuses the close (fold discoveries into an existing verdict, or discard
    and re-crew); a FAIL needs both failure reports.
 9. **Re-shard exit**: `crew_close {abandon: true, reason}` abandons the crew
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

## Development

```bash
npm install
bun run typecheck     # tsc --noEmit
node --import ./tests/lib/test-runtime-namespace.mjs --test tests/*.test.mjs   # (= npm test; keeps test artifacts off the host's)
bun run bundle        # rebuild self-contained dist/index.js (committed)
```

The preload sets `FORGE_TEST_RUNTIME_DIR` to a private runtime directory.
`FORGE_TEST_FORGE_HOME` is the test home alias for config discovery.

Architecture: `plugin.ts` exposes v2 `setup` only. The file-backed Plan, Goal
and Crew harness cores remain in `src/`,
with host verification checks in `src/run-check.ts`. Behavioral changes
go through OpenSpec; see AGENTS.md.

## License

MIT
