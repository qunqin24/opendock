# turnstile

[![ci](https://github.com/edseabolt/turnstile/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/edseabolt/turnstile/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/opencode-turnstile)](https://www.npmjs.com/package/opencode-turnstile)
[![coverage](https://img.shields.io/badge/coverage-100%25%20lines%20%C2%B7%20branches%20%C2%B7%20funcs-brightgreen)](package.json)
[![deps](https://img.shields.io/badge/runtime%20dependencies-0-brightgreen)](package.json)
[![license](https://img.shields.io/npm/l/opencode-turnstile)](LICENSE)

![turnstile runs the ensemble end to end: planner → plan-reviewer → executor → test-runner → reviewer, with blocked dispatches (red) until VERDICT: APPROVE and verified GATE: PASS evidence flip each gate green, and every decision lands in turnstile.jsonl](docs/images/demo.svg)

**Verify what your agents claim.** An agent that says "tests pass" is asking
you to trust it. Turnstile checks instead: dispatches that would violate the
pipeline throw `BLOCKED by turnstile: <reason>` until a real `GATE: PASS` and
a plan-reviewer `VERDICT: APPROVE` exist, and every decision appends to an
auditable JSONL journal (`npx opencode-turnstile status` shows the trail).
Decisions happen in tool and task-dispatch hooks, outside the model loop.
Zero runtime dependencies, fails open.

Turnstile is an [OpenCode](https://opencode.ai) v2 promise-plugin that
mechanically enforces an agent pipeline: planner → plan-reviewer → executor →
test-runner → reviewer, with a gate at every hand-off. The orchestrator policy
is injected at runtime by the plugin; nothing is written to any instructions
file.

- Quick start: [below](#tldr--try-it-in-two-minutes)
- The walkthrough: [using it for real work](#using-it-for-real-work)
- How it works inside: [`docs/architecture.md`](docs/architecture.md)
- Day-to-day reference (waivers, config, journals, install modes):
  [`docs/usage.md`](docs/usage.md)

## TL;DR — try it in two minutes

```sh
npx opencode-turnstile init      # install the plugin + pipeline agents
npx opencode-turnstile check     # verify the install (incl. plugin loadability); must exit 0
```

Then **restart OpenCode** (or `opencode service restart`) so the plugin
loads. Adding just the plugin still enforces the gates, but the pipeline
needs agents to dispatch against, so run `init` (or bring your own, see
[`docs/usage/install.md`](docs/usage/install.md#customizing-the-pipeline-agents)):

```jsonc
// ~/.config/opencode/opencode.json
{ "plugins": ["opencode-turnstile"] }
```

After restart the orchestrator dispatches the pipeline on your prompts,
blocked work says `BLOCKED by turnstile: <reason>` instead of proceeding,
and every decision is journaled — see it with
`npx opencode-turnstile status`. To bypass the gates for a task, put
`USER WAIVER:` in **your own prompt**.

## Using it for real work

You never invoke the pipeline stages directly. Start a task the way you
already would, and the enforcement wraps it. The one habit to build: open
with the planner.

![turnstile — the enforced pipeline: planner → plan-reviewer → executor → test-runner → reviewer, with gates blocking every dispatch](docs/images/hero.svg)

**1. Start a task by invoking the planner.** Paste an issue or a topic into
your prompt and ask for a plan:

```text
Work on issue #42 (flaky retry in the upload path). Start from the planner:
produce a plan with a decomposition, then run the pipeline through review.
```

The planner writes a plan with numbered `AC-n` / `chunk-N` entries to
`.opencode/plans/`. From here the pipeline drives itself — the `PIPELINE:`
status line on each result names the next stage:

```text
PIPELINE: planner=done plan=PENDING tests=RED reviewer=0/2
next=plan-reviewer — dispatch the next agent in this same turn
```

**2. The plan gate fires.** The plan-reviewer must record `VERDICT: APPROVE`
before any executor dispatch is allowed. A `VERDICT: BLOCK` sends the work
back to the planner — nothing for you to do unless you want to override:

```text
PLAN APPROVED: ship it as-is, the retry heuristic is good enough for now
```

(in your prompt — see [Waivers and approvals](#waivers-and-approvals)).

**3. The executor is gated on the approved plan** and must cite `chunk-N` /
`AC-n` entries from the decomposition, so implementation traces to the plan.

**4. Tests gate the reviewer.** The test-runner must emit
`GATE: PASS tests=…` and a matching exit-0 test execution must exist in the
task's history.

**5. The reviewer closes the loop.** Approval requires two unwaived reviewer
dispatches (ensemble); once credited, the landing gate releases `git push`.
A provably no-op push is exempt by default (`emptyDiffExempt`).

Enforcement is dormant until engaged: turnstile arms when your prompt
provides a plan or asks to run the planner/pipeline, and sleeps again on task
completion or `TURNSTILE OFF:` (`alwaysEnforce: true` restores always-armed).
Once engaged there is no audit-only mode. Per-feature opt-outs are listed in
[Configuration](#configuration).

When a gate fires early, the block message names the reason:

```text
BLOCKED by turnstile: no plan approval for "<plan path>". Dispatch the
plan-reviewer subagent first; proceed with executor only after the
plan-reviewer's first line is `VERDICT: APPROVE crit=<n> high=<n> med=<n>
low=<n>`, or obtain an explicit user waiver (a user prompt this task must
contain the literal marker 'USER WAIVER:' followed by the user's words).
```

A full annotated session, with every dispatch, block message, waiver, and
the journal entries behind them, is in
[`docs/usage/worked-session.md`](docs/usage/worked-session.md).

## What it enforces

Gates are decided in `execute.before` hooks; every gate has a human escape
hatch. Full detail (guards, state fields, escape ladders, diagrams) lives in
[`docs/architecture/gates.md`](docs/architecture/gates.md).

| Gate                   | In one line                                                                                                                                                                               |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plan approval          | `executor` dispatches blocked while the plans dir holds a pending plan (no reviewer `VERDICT: APPROVE` or human approval); editing the plan's spec region invalidates an earlier approval |
| Reviewer dispatch gate | `reviewer` dispatches blocked until a `GATE: PASS` verified by a real exit-0 test execution in this task                                                                                  |
| Reviewer round cap     | Max 2 `reviewer` dispatches per task; waived dispatches bypass and don't count                                                                                                            |
| Reviewer ensemble      | A reviewer APPROVE credits the landing gate only at ≥2 unwaived reviewer dispatches                                                                                                       |
| Loop caps              | Per task: planner 3, plan-reviewer 3, test-runner 4, 16 total dispatches; exhaustion blocks and journals an `escalation` entry                                                            |
| Decomposition gate     | `executor` dispatches must cite `chunk-N` / `AC-n` when a plan has a `## Decomposition` block                                                                                             |
| Read horizon           | Warns at 8 whole-file `read` calls per session, blocks at 15 (prefer grep/glob)                                                                                                           |
| Tool-call policy       | `bash`/`shell` commands and `write`/`edit` paths matched against a configured denylist (default empty — the empty lists are the off switch)                                               |
| Commit-lint            | `git commit -m` subjects must be conventional commits when `gitGates.commitMessages` is on (default)                                                                                      |
| Landing gate           | `git push` without a credited reviewer `VERDICT: APPROVE` blocks; a repeat attempt forces the interactive human ask                                                                       |
| Marker parsing         | `GATE:` / `VERDICT:` markers parsed from task results and child text; only marker-contracted emitters flip state — echoes are journaled `suppressed`                                      |
| Trace & telemetry      | JSONL journal of dispatches, gate transitions, verdicts, blocked calls, errors                                                                                                            |
| Decoding clamps        | reviewer/plan-reviewer temperature = 0; executor/test-runner/debugger ≤ 0.2                                                                                                               |
| Compaction             | Injects a "preserve verbatim" instruction, then the live gate-state snapshot — de-tokenized so it can never re-parse as a marker                                                          |

A few behaviors worth knowing; the mechanics live in
[`docs/architecture/gates.md`](docs/architecture/gates.md) and
[`docs/architecture/hooks.md`](docs/architecture/hooks.md):

- **State lifecycle.** A new user prompt resets the session's gate state,
  except when continuation carry (default on) re-arms it for a prompt in the
  same worktree/branch with earned credit. An interrupted review carries the
  same way: the task re-opens with its green gate, dispatch counts, and plan
  approval intact.
- **Maintenance dispatches.** A bookkeeping-only executor dispatch (plan file
  named in the prompt, diff touching only docs/prose surfaces) skips the
  plan-approval and decomposition gates — capped at 4 per plan; any
  `src/`, `tests/`, `bin/`, `scripts/`, or config touch gates it as ordinary
  implementation work.
- **Parent hands-on edits.** Direct `write`/`edit` calls in the parent (and
  any non-pipeline subagent) are always gated: the first block throws, a
  repeat attempt raises a human permission ask (`always` / `once` /
  `reject`). Writes to the platform temp directory are exempt scratch.
- **Parent file-writing bash.** Confident file-writing bash commands
  (redirects from writer commands, `tee f`, `sed -i`, `cp`/`mv`/`dd`/…) run
  the same ladder; output capture never gates. `toolPolicy.bashWriteGate:
false` opts out (telemetry continues).

## Waivers and approvals

Turnstile reads a waiver or a human plan approval only from the user's own
prompt — the plugin checks which channel the marker arrived through, never
what an agent's dispatch prompt says.

- **`USER WAIVER:`** in your prompt waives gates; naming agent stages scopes
  it. The landing gate is not waiver-released: `git push` always needs the
  credited reviewer verdict or your permission reply.
- **`PLAN APPROVED:`** in your prompt approves the plan like a reviewer
  verdict, with human provenance; it replays across restart.
- **Permission escalation.** A retried landing or hands-on attempt escalates
  to you through OpenCode's permission surface — reply `always`, `once`, or
  `reject`. Turnstile assumes a human answers these asks; an auto-accepting
  host (`session.permissions: "autoaccept"`) degrades them to delays, one
  reason `"block"` is the default.

Full lifecycle semantics: [`docs/usage/waivers.md`](docs/usage/waivers.md).

## User plan review (opt-in)

With `planUserReview: true`, turnstile inserts a human checkpoint after the
planner: the plan-reviewer dispatch blocks until you answer from your own
prompt with **`PLAN REVIEWED:`** (accept; edit the plan file first if you
wish) or **`PLAN REJECTED:`** (retire the task scope). The literals work only
in your own prompt, waivers do not bypass the pause, and the pending state
survives a restart. Config: `planReviewAcceptMarker` /
`planReviewRejectMarker` rename the literals.

## Requirements phase (opt-in)

With `requirementsPhase: true`, an ungated requirements leg precedes the
planner for non-trivial tasks: a `requirements` subagent returns a spec with
numbered acceptance criteria and Open Questions; open questions come to you
before planning. The phase is soft — its only enforcement surface is a loop
cap (`maxRequirementsRounds`, default 2). Config: `agents.requirements`
renames the agent.

## Suspend and resume

Two prompt markers pause enforcement for the whole session, read only from
your own prompt:

- **`TURNSTILE OFF:`** suspends blocking: would-be blocks are journaled as
  `suspended` audit entries, but nothing throws and no ask is forced.
  The suspension survives a restart.
- **`TURNSTILE ON:`** resumes enforcement with fresh task state.

When both markers appear in one prompt, the later one wins. Config:
`suspendMarker` / `resumeMarker` rename the literals, and
`allowSuspend: false` disables both. Inspect the live state with
`node bin/cli.mjs status` (in-repo) or `npx opencode-turnstile status`.

### `opencode-turnstile log`

Prints a chronological, human-readable timeline of one session's journal,
ending with a summary line. Read-only.

    opencode-turnstile log                 # most recent session
    opencode-turnstile log <sessionID>     # a specific session
    opencode-turnstile log --json          # machine-readable output

### `opencode-turnstile prov`

Prints the decision-provenance ledger: `prov:stated` (every admitted parent
prompt, verbatim after mechanical secret redaction), `prov:denied` (human
permission denials), `prov:waiver` (human gate waivers), and `prov:override`
(a parent write/edit following a pipeline-child write to the same path).
Read-only; capture is dumb, derivation is offline.

    opencode-turnstile prov                 # every session, interleaved
    opencode-turnstile prov <sessionID>     # a specific session
    opencode-turnstile prov --json          # machine-readable output
    opencode-turnstile prov --tail 100      # last 100 events
    opencode-turnstile prov --verify        # check the journal hash chain + anchors

Capture is gated on `decisionLedger.enabled` (default `true`).

### `opencode-turnstile prov-views`

Offline derived views over the decision ledger: classifies `prov:stated`
prompts by origin, computes the chatter noise rate, and aggregates
taste-drift signals. Purely read-time — journal rows are never rewritten, and
no derived value feeds gates.

    opencode-turnstile prov-views                 # every session
    opencode-turnstile prov-views <sessionID>     # a specific session
    opencode-turnstile prov-views --json          # machine-readable output

## Markers

Subagents must emit these as the first line of their output. These examples
are the canonical syntax; CI asserts the parser in `src/markers.ts` accepts
exactly them.

```
GATE: PASS tests=12 passed=12 failed=0
GATE: FAIL tests=12 passed=10 failed=2

VERDICT: APPROVE crit=0 high=0 med=2 low=1
VERDICT: BLOCK crit=1 high=0 med=0 low=2
```

The parser accepts these markers wrapped in markdown backticks and credits
them identically to the bare form; only a marker that does not match the
fields above is treated as absent.

Waiver and approval markers (must appear in the user's prompt, verbatim — a
dispatch prompt that merely contains the marker unlocks nothing):

```
USER WAIVER: <the user's words>
USER WAIVER: I approve proceeding to the <agent> stage
PLAN APPROVED: <the user's words>
```

## Install

Turnstile ships as the npm package
[`opencode-turnstile`](https://www.npmjs.com/package/opencode-turnstile).
Pick one way to install it; do not combine the plugin-array path with the
CLI install:

1. **Plugin only** — add `"plugins": ["opencode-turnstile"]` to
   `~/.config/opencode/opencode.json` and restart. Gates enforce; agent
   definitions are not installed.
2. **Full install** — `npx opencode-turnstile init` installs the plugin and
   the pipeline agent definitions into `~/.config/opencode`.
3. **From a clone** — clone the repo and run `npm run init` (symlink mode)
   so installed artifacts stay live against your edits.

Turnstile has no npm lifecycle hooks: installing the package never writes to
`~/.config/opencode` — that happens only when you run an explicit command.
Modes, conflicts, the ledger, upgrades, uninstall, and per-agent model pins
are covered in [`docs/usage/install.md`](docs/usage/install.md).

Verify a clone with:

```sh
npm install
npm run ci            # lint, format:check, typecheck, check:markers, test gate enforcing 100% line/branch/function coverage
npm run ci:installed  # install:check — run after `npm run init` on a machine with artifacts
```

For behavior-preserving changes, `npm run test:differential` compares HEAD
against a reference commit scenario by scenario; the worked example lives in
[`docs/usage/differential-characterization.md`](docs/usage/differential-characterization.md).
A self-host smoke (fresh session, one full pipeline cycle on a trivial task)
is described in [`docs/usage/field-tested.md`](docs/usage/field-tested.md).

## Configuration

Defaults live in code (`src/config.ts`); override via
`~/.config/opencode/turnstile.json`, environment variables, or both
(precedence: defaults < file < env; config is read once at setup — restart
sessions to apply). Copy
[`examples/turnstile.example.json`](examples/turnstile.example.json) as a
starting point: every key is optional and matches the code defaults. (One
exception: the example writes `agents.bareOutput: []` because JSON cannot
express the "unset" sentinel; the loader re-derives the list either way.)
The knobs most people touch:

| Key                          | Default                | Meaning                                                                                                           |
| ---------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `alwaysEnforce`              | `false`                | dormant-until-engaged; `true` restores always-armed from the first prompt                                         |
| `gateEvidence`               | `enforce`              | `flag`/`off` revert to flip-on-trust for `GATE: PASS`                                                             |
| `escalation`                 | `block`                | repeat-attempt escalation mode; the plan-gate escalation is mode-gated (`block` blocks, `ask` prompts)            |
| `gitGates.commitMessages`    | `true`                 | validate `git commit -m` subjects as conventional commits                                                         |
| `gitGates.landingGate`       | `true`                 | gate `git push` on a credited reviewer `VERDICT: APPROVE`                                                         |
| `reviewEnsemble`             | `enforce`              | `advise` credits a single-reviewer APPROVE unconditionally                                                        |
| `planUserReview`             | `false`                | pause the pipeline after the planner until you accept or reject; see [User plan review](#user-plan-review-opt-in) |
| `requirementsPhase`          | `false`                | dispatch the requirements subagent before the planner; see [Requirements phase](#requirements-phase-opt-in)       |
| `sessionSummary`             | `quiet`                | one recap line at session end for active sessions (`on` adds an all-green line for idle ones; `off` disables)     |
| `toolPolicy.bashDeny`        | `[]`                   | regex denylist for `bash`/`shell` (e.g. worktree/branch/merge ops)                                                |
| `toolPolicy.bashWriteGate`   | `true`                 | gate confident file-writing bash commands through the hands-on ladder                                             |
| `maxReviewerRounds` / others | 2 / 3 / 3 / 4 / 2 / 16 | per-leg (incl. requirements) and total dispatch caps per task                                                     |
| `agents.*`                   | stage names            | rename recognition when you bring your own agents                                                                 |
| `plansDir`                   | `.opencode/plans`      | where the decomposition scan looks                                                                                |
| `decisionLedger.enabled`     | `true`                 | observe-only decision ledger (`opencode-turnstile prov`)                                                          |
| `tamperEvidence.enabled`     | `false`                | per-record SHA-256 hash chain over every journal row + Merkle epoch commits                                       |

Invalid keys are ignored, journaled, and summarized once into the session
context; a malformed config file never breaks the host. The full table —
every key, default, and environment variable (`TURNSTILE_TRACE`,
`TURNSTILE_METRICS_DIR`, `TURNSTILE_CONFIG`) — is in
[`docs/usage/configuration.md`](docs/usage/configuration.md);
`schemas/turnstile.schema.json` ships with the package for editor
completion.

## Show the evidence on your PR

The journal is per-machine; your teammates never see it. Turn the last
task's evidence into a shareable artifact — derived counts, canonical marker
lines, and shas, never session IDs or prompts:

    npx opencode-turnstile evidence --task latest --out .turnstile/evidence.json

Commit the JSON and Markdown and a GitHub Action upserts one sticky comment
per PR. `evidence --validate` re-checks a committed artifact in CI. The
comment states what it is: a correlated claim, not proof. One workflow
detail: validation runs on the pull request itself, while the comment posts
from a trusted `pull_request_target` run; GitHub asks a maintainer to approve
that run for a first-time contributor's fork PR, so an outside
contributor's first badge can sit pending — the alternative is a job that
executes contributor code holding a write token.

![turnstile evidence posted on a pull request: one sticky comment with the plan verdict, the verified test counts, and the journal head sha](docs/images/pr-evidence.png)

## What turnstile is not

Turnstile is a speed bump and an audit trail, not a security boundary. A
`GATE: PASS` is a claim correlated with evidence; the journal records what
was _claimed_ and is treated as sensitive data (see
[SECURITY.md](SECURITY.md)); the denylist is a deterrent, not a sandbox; MCP
tools remain unguarded. The full threat model:
[`docs/architecture/security.md`](docs/architecture/security.md).

## Behavior contract

- Fail-open by design. Every hook body is guarded; internal errors are
  journaled and the tool call proceeds. The only thrown errors are the
  deliberate `BLOCKED by turnstile:` ones.
- `docs/architecture.md` (with the section files under `docs/architecture/`)
  is the authoritative reference for enforced contracts; the doc comment atop
  `turnstile.ts` summarizes it. CI keeps the marker examples in this README
  in sync with the parser regexes.
- Host API is the OpenCode v2 promise-plugin shape
  (`{ tool.hook, session.hook, permission.hook, event.subscribe }` — the
  permission hook is registered when the host exposes it).
- Host compatibility is checked at setup against the shipped range
  (`HOST_COMPAT` in `src/host-compat.ts`); see the matrix below.

### OpenCode compatibility matrix

| OpenCode host       | turnstile (current) | Status                                                                 |
| ------------------- | ------------------- | ---------------------------------------------------------------------- |
| ≥ 2.0.22, < 3.0.0   | 0.15.x              | Supported (tested: 2.0.22, 2.0.27, 2.0.29, 2.2.0, 2.2.5, 2.2.7, 2.3.0) |
| ≥ 3.0.0 or < 2.0.22 | all                 | Refuses to enforce at setup; upgrade turnstile                         |
| version unreadable  | all                 | Enforces; one-time journal warning                                     |

On an incompatible host turnstile toasts the upgrade instruction and
registers no hooks (a full no-op — fail-open):

> turnstile 0.15.0 expects opencode >=2.0.22,<3.0.0; you're on 3.1.0 —
> upgrade turnstile (npm i opencode-turnstile@latest) or pin opencode

`npx opencode-turnstile status --check-updates` (opt-in, network, cached 24 h)
reports when a newer turnstile is published.

## More documentation

- [`docs/architecture.md`](docs/architecture.md) — the architecture
  reference entry point: an overview plus links into the section files under
  `docs/architecture/`, with rendered diagrams.
- [`docs/modules.md`](docs/modules.md) — the authoritative module map: every
  file under `src/` with its responsibility.
- [`docs/journal.md`](docs/journal.md) — the journal reference entry point:
  file layout, the entry-type catalog, rotation, replay, and tamper
  evidence, each in its own section file under `docs/journal/`.
- [`docs/usage.md`](docs/usage.md) — the usage entry point: a worked
  session, waivers and approvals in full, installing and maintaining, the
  complete configuration table, journals and retention, and the `status`
  command.
- [SECURITY.md](SECURITY.md) — journal sensitivity and trust model.
