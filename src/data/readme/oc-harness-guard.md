# 🛡 Harness Guard

**The control loop your agent swarm was missing.**

Most tooling in this ecosystem reports after the fact. Harness Guard runs
during. One plugin, three modules: a harness linter, a swarm governor, and
session memory that survives compaction.

```
Warden status for ses_parent (observe-only; enforcement only when a budget is set).
Children tracked: 3
- ses_child1 parent=ses_parent status=running cost=0.012 tokens=8400 last=session.usage.updated
- ses_child2 parent=ses_parent status=running cost=0.004 tokens=2100 last=session.created
- ses_child3 parent=ses_parent status=succeeded cost=0.031 tokens=15200 last=session.execution.succeeded
Active budgets: 1
- ses_child1 maxTokens=50000 maxCost=0.50
Breaches: 0
Orphan reports: 0
```

The block above is the real output shape with example ids. The
airworthiness counts below are from this host: 0 findings across 4 checks.

## Install

```jsonc
// opencode.jsonc
{ "plugins": ["oc-harness-guard"] }
```

Or:

```sh
opencode2 plugin add oc-harness-guard
```

Restart OpenCode. All three modules load. To turn one off:

```jsonc
// opencode.jsonc
{
  "plugins": [
    { "package": "oc-harness-guard", "options": { "warden": false } }
  ]
}
```

Option keys are `airworthiness`, `warden`, and `flightPlan`. Any key set to
`false` skips that module. Anything else keeps the default.

## What you get

| Module / tool | Why it exists |
| --- | --- |
| **Airworthiness** · `harness_check` | The harness drifts. A model binding points nowhere, a "read-only" agent keeps `edit`, a skill id collides. This catches it before the run. Read-only. |
| **Warden** · `harness_warden_status` | Child sessions are separate sessions with their own spend. Without a watcher you learn the total afterwards. This shows parent, status, cost, and tokens per child while they run. Observe-only unless you set a budget. |
| **Warden** · `harness_warden_budget` | An opt-in ceiling: tokens, cost, or wall-clock minutes. On breach the child is interrupted once, the breach is recorded, and the budget is dropped so it cannot loop. |
| **Flight Plan** · `harness_flightplan_status` | Compaction drops the mission. This keeps it: it reads `goal.md` and `plan.md` for the session, injects an Objective and a Next move, and logs a checkpoint record on compaction. Read-only report of which memory files exist. |

### Airworthiness is a linter, not a gate

Four checks, run on demand through `harness_check`. Nothing is modified.

- **Agent bindings.** Every agent that declares a `model` binding must resolve
  to a catalog model by `providerID` + `id`. Unresolved or malformed bindings
  are findings.
- **Specialist boundaries.** Each listed read-only specialist (default:
  `explore`, `reviewer`, `security-auditor`, `test-engineer`,
  `web-performance-auditor`) must deny both the `edit` and the `subagent`
  permission actions. A listed specialist with no matching agent is skipped,
  not a finding — unless `requireSpecialists: true`, in which case a
  missing agent reports both actions as missing.
- **Skill locality (lexical).** Skills from an unrecognised source are
  findings. The local root, known external client roots (`.agents/skills`,
  `.claude/skills`), and host built-ins (`/builtin`) are accepted conditions.
  The comparison is string-level only. A symlinked directory still classifies
  as `local`. This is advisory. It is not a security boundary.
- **Duplicate skills.** Two entries sharing one id is a finding.

On this host: **0 findings** (`local 22, external 63, builtin 2, unknown 0`).
Findings never emit the host's absolute skills root. They reference a fixed
`<local skills root>` placeholder instead, and every registry-derived
string that can reach output — skill and agent ids, model bindings, session
ids, and the former `location` field — passes through a strict allowlist
first: only bounded plain-ASCII tokens are echoed, everything else renders
as `<unknown>` (or `<invalid id>` for session ids). Raw host locations
appear in neither report text nor metadata, and logs carry fixed
categories only — never error objects, messages, or stacks.
Registry-read failures report which registry failed and keep the
tool registered.

### Warden watches children you cannot list

`ctx.session` has no `list` or `active`, so Warden is event-sourced. It tracks
forward from `session.created` and `session.forked` (which carry `parentID`),
records cost and tokens from `session.usage.updated` and `session.step.ended`,
and follows lifecycle events to `idle`, `succeeded`, `failed`, `interrupted`,
and `deleted`. Observed live: 3 real child sessions tracked.

Cumulative usage snapshots are canonical once seen. Step deltas accumulate
until the first snapshot arrives and are never added on top of one.

Budgets are opt-in. Set one per session with `harness_warden_budget`:

- `maxTokens`, `maxCost`, `maxMinutes`. Any combination. A dimension with no
  limit never breaches. Reaching the ceiling counts as breached.
- Time budgets arm a deadline timer from the child's `created` time, so a
  silent child is still interrupted at its deadline.
- `autoInterrupt: false` (warden option) records breaches without
  interrupting. Pure observer.

Orphan reports are recomputed when a parent goes idle or terminal, when a
tracked child ends, and when a birth event re-parents a child. Terminal
children are excluded.

### Flight Plan keeps the mission across compaction

Session state lives at `~/.opencode/state/sessions/<sessionID>/`. Two files
matter: `goal.md` (the Objective) and `plan.md` (the Next move).

On each `context` hook the module extracts one structured field from each
file — a matching section's direct body, else a bounded fallback — caps the
result (400 chars Objective, 600 chars Next move, 1200 total), and injects a
single system part explicitly framed as reference data, not instructions. Raw
file prose is never injected. When both fields are empty, nothing is injected.

On each `compaction` hook it appends a record to `compaction-log.md`:
timestamp, session id, message count, and a capped tail of the most recent
user text. It never sets `event.result`. Default compaction runs.

The framing reduces but does not eliminate prompt-injection risk. State files
are trusted-by-policy. This module is not a boundary against a malicious
state-file writer.

### Live status over RPC

A read-only `harness-guard/status` RPC reports non-identifying aggregates
for one session. There are no events — consumers poll `status` instead
(event envelopes carry the host `location.directory` absolute path, so
this plugin emits none). It pairs well with `oc-flight-deck` if you want
those numbers on a sidebar. See `src/rpc.ts` for the contract.

| Section | Shape |
| --- | --- |
| `airworthiness` | `{ available, checks, findings, counts }` |
| `warden` | `{ available, children, budgets, breaches, orphans }` |
| `flightPlan` | `{ available, goalPresent, planPresent, logPresent, blockChars }` |

`available` is `false` when the module is disabled or its read failed, so
a monitor never renders a false all-clear. `warden.orphans` counts
orphaned children (operational): still-running tracked children reported
as orphaned for the session. It is an operational count, with no claim of
parity with any other tool's counts.

Trust model: the RPC call context carries no caller identity, so the
surface cannot authorize per-session data. It is therefore limited to
aggregates by design — local, read-only, no free text, no session IDs, no
paths. `sessionID` is a selection key within one authenticated server
principal, not a per-session ACL — the real boundary is the OpenCode
server credential plus loopback binding. A malformed `sessionID` fails
closed with `refused`. When `ctx.session.get` is available, an unknown or
ended session also fails closed with `refused` (checked before any
summaries are collected); when the getter is unavailable, the handler
proceeds best-effort.

### Adapting to your harness

The defaults above mirror this project's own convention. That convention —
session memory at `~/.opencode/state/sessions/<sessionID>/goal.md` and
`plan.md`, with `Objective` and `Next move` headings — is not an OpenCode
standard. If your setup differs, point the plugin at your layout instead of
adopting ours:

```jsonc
// opencode.jsonc
{
  "plugins": [
    { "package": "oc-harness-guard", "options": {
      "airworthiness": {
        "specialists": ["explore", "reviewer"],
        "requireSpecialists": false
      },
      "flightPlan": {
        "goalFile": "goal.md",
        "planFile": "plan.md",
        "logFile": "compaction-log.md",
        "objectiveHeadings": ["objective", "goal"],
        "nextMoveHeadings": ["next move", "next steps", "next"]
      }
    } }
  ]
}
```

- `airworthiness.specialists` (default: the five ids listed above). Only
  listed agents are boundary-checked. List your own read-only agents, or an
  empty list to skip the check.
- `airworthiness.requireSpecialists` (default `false`). Absent specialists
  are skipped — a fresh install on a setup without those agents reports zero
  false findings. Set `true` for strict drift detection, where a missing
  specialist is a finding. The report shows the skip count
  (`- specialist boundaries: N finding(s) (M skipped)`), and metadata
  carries `specialists: { checked, skipped }`.
- `flightPlan.goalFile` / `planFile` / `logFile` (defaults `goal.md` /
  `plan.md` / `compaction-log.md`). Names that are empty, contain
  separators, `:`, or control characters, or try traversal fall back to
  the default. Tool text shows a configured name only when it is itself a
  plain token; anything else displays the default.
- `flightPlan.objectiveHeadings` / `nextMoveHeadings` (defaults as in the
  example). Must be an array containing at least one usable non-empty
  string — anything else, including an explicitly empty array, means the
  defaults. Valid entries are case-insensitive substrings matched against
  markdown headings; the direct body of the first match is extracted, else
  the bounded fallback.
- `flightPlan.stateRoot` (default `~/.opencode/state/sessions`), `maxChars`,
  `cacheTtlMs` — as before.

When the configured files are absent, Flight Plan stays a safe no-op:
nothing is injected. All containment and symlink/hard-link guards apply to
custom file names exactly as they do to the defaults.

## It watches. It reports. It only acts when you tell it to.

- **No network calls.** Nothing is fetched, nothing is sent.
- **No telemetry.** Nothing is collected or phoned home.
- **Airworthiness is read-only.** It reads the agent, model, and skill
  registries and reports. It writes nothing.
- **Warden defaults to observe-only.** No budget means no enforcement. Status
  never mutates anything.
- **Warden authority is host-verified.** A budget is accepted only when the
  host confirms the target's `parentID` equals the caller. Self-budgeting is
  refused. Foreign sessions are refused. Ownership is re-checked immediately
  before interrupting. Lookup failure means no interrupt.
- **Flight Plan never follows the files it reads.** Extracted content is
  framed as untrusted reference data, frame-boundary strings inside content
  are neutralised, and nested subsections are excluded from section matches.
  Symlinks and hard links fail closed. `register` and every hook body are
  guarded so a failure warns instead of breaking the model call or compaction.
- **Status tools are scoped.** `harness_warden_status` shows the caller's own
  tree only. `harness_flightplan_status` answers for the caller's own session
  or a host-verified child, and fails closed otherwise. Neither emits absolute
  host paths.

## Uninstall

Remove the entry from `opencode.jsonc`, restart, done. Everything it did
stops. Stored budgets and tracking records sit inert in plugin storage.

## Limitations

- The live-interrupt path is proven in unit tests but has not yet fired
  against a real runaway child.
- Airworthiness skill locality is lexical. It does not resolve symlinks and
  proves nothing about containment. The permission allowlist is the
  authoritative gate.
- Flight Plan framing is a mitigation, not a boundary. A writer with access
  to the state hierarchy can still smuggle directives past any framing this
  module can apply.
- Containment is check-then-use. A writer racing the check can swap the
  target between check and use, and hard links are invisible to the first
  check. Content reads narrow the window with open-then-`fstat` plus an
  `nlink === 1` refusal, but the window cannot be closed from userspace. The
  state hierarchy must not be writable by untrusted principals.
- Warden cannot backfill. It tracks from live events forward. A restart starts
  with an empty map plus whatever survives in storage.

## Development

```sh
bun install
bun test
bun run check
```

`bun test` runs the suite (**149 tests**). `bun run check` typechecks with
`tsc --noEmit` and then runs the suite.

To load the plugin **from this checkout** while working on it:

```jsonc
{
  "plugins": ["git+file:///absolute/path/to/oc-harness-guard"]
}
```

A `plugins` entry is a package specifier, not a file path. A bare path is
ignored silently. That installs a **copy, not a symlink**, so re-run the
install after editing the checkout.

Built on the official
[OpenCode V2 CLI plugin API](https://opencode.ai/v2/docs/build/plugins/cli/).

## Compatibility

Requires OpenCode V2 (`opencode2`). Built against `@opencode/plugin` `2.0.2`.
Building from source needs Bun 1.4+ or Node 22+.

## License

MIT © 2026 nathwn12 — free to use, modify, and share.
