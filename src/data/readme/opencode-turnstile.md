# turnstile

[![ci](https://github.com/edseabolt/turnstile/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/edseabolt/turnstile/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/opencode-turnstile)](https://www.npmjs.com/package/opencode-turnstile)
[![coverage](https://img.shields.io/badge/coverage-100%25%20lines%20%C2%B7%20branches%20%C2%B7%20funcs-brightgreen)](package.json)
[![deps](https://img.shields.io/badge/runtime%20dependencies-0-brightgreen)](package.json)
[![license](https://img.shields.io/npm/l/opencode-turnstile)](LICENSE)

![turnstile runs the ensemble end to end: planner → plan-reviewer → executor → test-runner → reviewer, with blocked dispatches (red) until VERDICT: APPROVE and verified GATE: PASS evidence flip each gate green, and every decision lands in turnstile.jsonl](docs/images/demo.svg)

**Verify what your agents claim.** An agent that says "tests pass" is asking
you to trust it. Turnstile checks instead: a reviewer dispatch stays blocked
until a `GATE: PASS` is correlated with a real exit-0 test run, an executor
stays blocked until a plan-reviewer has approved the plan, and every block,
verdict, and gate flip appends to an auditable JSONL journal —
`npx opencode-turnstile status` shows the evidence trail. Decided in tool and
task-dispatch hooks, outside the model loop. Zero runtime dependencies, fails
open.

## What you get

- **Premature dispatch blocked** — an executor cannot start against an
  unreviewed plan and a reviewer cannot start on an unverified test claim;
  blocked work prints `BLOCKED by turnstile: <reason>`.
- **Test claims verified** — a `GATE: PASS` greens the reviewer gate only
  when turnstile finds a journaled exit-0 test execution behind it; a bare
  claim stays unverified and the gate holds.
- **Plan approval journaled** — every verdict, waiver, block, and gate flip
  is appended to `turnstile.jsonl`; the evidence trail outlives the session
  and the replay window.
- **Restart-safe replay** — restart OpenCode mid-task and earned gate state
  comes back from the journal; the pipeline resumes where the evidence
  left it.

How it does it: an enforced pipeline — planner → plan-reviewer → executor →
test-runner → reviewer — with a gate at every hand-off, injected into your
session at runtime. Mechanics below the fold.

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
loads. Rather skip the agent definitions? Adding just the plugin still
enforces the gates, but the pipeline needs agents to dispatch against, so
run `init` (or bring your own, see
[`docs/usage.md`](docs/usage.md#customizing-the-pipeline-agents)):

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

An [OpenCode](https://opencode.ai) v2 plugin that mechanically enforces an
agent pipeline: planner → plan-reviewer → executor → test-runner → reviewer.
The orchestrator policy is injected at runtime by the plugin (nothing is
written to any instructions file) — appended to the parent session's system
prompt at the pre-first-model-call context hook, with the task-result prepend
as fallback — and turnstile **blocks the dispatches that violate it**.

**1. Start a task by invoking the planner.** Paste an issue or a topic into
your prompt and ask for a plan:

```text
Work on issue #42 (flaky retry in the upload path). Start from the planner:
produce a plan with a decomposition, then run the pipeline through review.
```

The orchestrator dispatches the planner, which writes a plan with numbered
`AC-n` / `chunk-N` entries to `.opencode/plans/`. From here the pipeline
drives itself — the `PIPELINE:` status line on each result names the next
stage:

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

**5. The reviewer closes the loop.** Approval requires two unwaived
reviewer dispatches (ensemble); once credited, the landing gate releases
`git push`. The `emptyDiffExempt` exemption (default on) additionally lets
provably no-op pushes through without a verdict — set
`emptyDiffExempt: false` for the strict behavior where every push waits for
review. Each gate is always enforced — there is no audit-only mode. The
opt-outs are deliberate and per-feature: `gitGates.commitMessages: false`
turns off commit lint, `gitGates.landingGate: false` turns off the landing
gate, an empty denylist leaves the tool policy idle, and `TURNSTILE OFF:`
suspends the whole plugin for a session (the `turnstile-suspend` skill).

When a gate fires early, the block message names the reason:

```text
BLOCKED by turnstile: no plan approval for "<plan path>". Dispatch the
plan-reviewer subagent first; proceed with executor only after the
plan-reviewer's first line is `VERDICT: APPROVE crit=<n> high=<n> med=<n>
low=<n>`, or obtain an explicit user waiver (a user prompt this task must
contain the literal marker 'USER WAIVER:' followed by the user's words).
```

Every block, verdict, and gate flip is appended to the journal —
`npx opencode-turnstile status` shows the state per session after the fact.

A full annotated session, with every dispatch, block message, waiver, and
the journal entries behind them, is in
[`docs/usage.md`](docs/usage.md#a-worked-session).

## What it enforces

Gates are decided in `execute.before` hooks; every gate has a human escape
hatch. Full detail (guards, state fields, escape ladders, diagrams) lives in
[`docs/architecture.md`](docs/architecture.md) (§5 Gate state machine).

| Gate                   | In one line                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plan approval          | `executor` dispatches blocked while the plans dir holds a _pending_ plan — one lacking a current plan-reviewer `VERDICT: APPROVE` (or human approval) and a durable approved-plan record; the approval key covers the plan's **spec region** (`# Objective` onward — the leading `# Progress` section is pipeline-maintained and excluded, so progress-note edits keep the approval live), spec edits invalidate it, and a durable record outlives the journal replay window and prompt resets                        |
| Reviewer dispatch gate | `reviewer` dispatches blocked until a `GATE: PASS` **verified** by a real exit-0 test execution in this task                                                                                                                                                                                                                                                                                                                                                                                                          |
| Reviewer round cap     | Max 2 `reviewer` dispatches per task; waived dispatches bypass and don't count                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Reviewer ensemble      | A reviewer APPROVE credits the landing gate only at ≥2 unwaived reviewer dispatches                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Loop caps              | Per task: planner 3, plan-reviewer 3, test-runner 4, 16 total dispatches; exhaustion blocks and journals an `escalation` entry                                                                                                                                                                                                                                                                                                                                                                                        |
| Decomposition gate     | `executor` dispatches must cite `chunk-N` / `AC-n` when a plan has a `## Decomposition` block                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Read horizon           | Warns at 8 whole-file `read` calls per session, blocks at 15 (prefer grep/glob)                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Tool-call policy       | `bash`/`shell` commands and `write`/`edit` paths matched against a configured denylist (default empty — the empty lists are the off switch)                                                                                                                                                                                                                                                                                                                                                                           |
| Commit-lint            | `git commit -m` subjects must be conventional commits when `gitGates.commitMessages` is on (default)                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Landing gate           | `git push` without a credited reviewer `VERDICT: APPROVE` — blocks, and under the default `escalation: "block"` re-blocks every retry (no permission ask); `escalation: "ask"` restores the interactive human ask; gated by `gitGates.landingGate` (default on); the `gitGates.emptyDiffExempt` exemption (default on) additionally exempts provably no-op pushes (every refspec's branch ref-equal to its upstream; force pushes never qualify; `exempt:"empty-diff"` in the journal; `false` is the strict opt-out) |
| Marker parsing         | `GATE:` / `VERDICT:` markers parsed from task results and child text; only marker-contracted emitters flip state — echoes are journaled `suppressed`                                                                                                                                                                                                                                                                                                                                                                  |
| Trace & telemetry      | JSONL journal of dispatches, gate transitions, verdicts, blocked calls, errors; `setup` heartbeat, stream-death errors                                                                                                                                                                                                                                                                                                                                                                                                |
| Decoding clamps        | reviewer/plan-reviewer temperature = 0; executor/test-runner/debugger ≤ 0.2                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Compaction             | Injects a "preserve verbatim" instruction, then the live gate-state snapshot — de-tokenized so it can never re-parse as a marker                                                                                                                                                                                                                                                                                                                                                                                      |

State lifecycle: a new user prompt resets the session's gate state, except
when continuation carry (default on) re-arms it for a prompt with an
unchanged worktree/branch fingerprint and earned credit. Replayed gate state
survives a restart and the next (resume) prompt, then reverts.

**Maintenance dispatches.** A bookkeeping-only executor dispatch — the prompt
names the live approved plan file plus the word "maintenance", and the current
working-tree diff touches only non-src surfaces (the plan file itself,
`docs/*.md`, `README.md`, `CONTRIBUTING.md`, `agents/*.md` prose; the
marker-validated ones qualify only while the repo's `scripts/check-markers.mjs`
guard passes) — skips the plan-approval and decomposition gates: no
plan-reviewer re-approval cycle for progress notes and doc prose. It journals
a `{type:"maintenance"}` row (MNT column in `status`) and is capped at **4
per plan**; a cap-exceeded attempt blocks like any other dispatch, and any
`src/`, `tests/`, `bin/`, `scripts/`, or config/schema/example touch in the
diff gates the dispatch as ordinary implementation work.

**Parent hands-on edits.** Parent sessions dispatch work through the
pipeline; direct `write`/`edit` calls in the parent — and in any
non-pipeline subagent — are always gated. The
first parent edit per task throws `BLOCKED by turnstile:`; under the default
`escalation: "block"` a repeat attempt re-blocks — the gate releases only on
your explicit `USER WAIVER:` (or a hands-on release carried from a prior
`"ask"` session). `escalation: "ask"` restores the interactive ladder: the
repeat attempt raises a human permission ask — `always` releases the rest of
the task, `once` releases one edit, `reject` re-blocks and re-arms on the
next attempt. `TURNSTILE OFF:` suspends it session-wide, but plan approval
alone does not release the gate. A new user prompt resets the block count
and any release. One exemption: a `write`/`edit` whose target path resolves
under the platform temp directory is scratch — zero-governance work (not
implementation, not project I/O) — so it is allowed with a journaled audit
row (`scratch: true`, target path) and never reaches the ladder or burns a
pending `once` grant; a configured `pathDeny` still wins first.

**Parent file-writing bash.** The hands-on gate also covers confident
file-writing bash commands in parents and non-pipeline subagents: redirects
from writer commands (`cat > f`, `echo x >> f`), `tee f`, `sed -i`/
`--in-place`, and `cp`/`mv`/`dd`/`truncate`/`touch` run the same ladder as a
parent `write`/`edit` (release, waiver, and the `once` grant all apply, and a
`once` releases one write of any kind). Output capture never gates —
`echo hi > /dev/null`, `npm test > log`, `git push > /dev/null` — and neither
do heredoc-bearing commands (`cat <<EOF`: the splitter sees the heredoc body
lines as simple commands, but they are stdin data, so the whole command is
observed, not gated), `tee /dev/null` / fd-dup operands (`tee 2>&1`), or `dd
of=/dev/...`; leading `NAME=value` assignments and `sudo`/`env`/`nice`/
`command` wrappers classify by the real head (`sudo cp a b` gates). Every
write-shaped command journals a `handsOn` telemetry row even where it
is not gated. `toolPolicy.bashWriteGate: false` opts the gate tier out
(telemetry continues).

## Waivers and approvals

Turnstile reads a waiver or a human plan approval only from the user's own
prompt — the plugin observes it at prompt admission, never from an agent's
dispatch prompt. A marker inside an agent-composed prompt must never unlock
a gate, so the plugin checks which channel the marker arrived through, not
what the text says.

- **`USER WAIVER:`** in your prompt waives gates. Naming configured agent
  stages (`planner`, `plan-reviewer`, `executor`, `test-runner`, `reviewer`)
  scopes it; unscoped covers every gate, but the reviewer gate consumes an
  unscoped waiver on the first dispatch it unlocks. A new prompt drops it.
  The landing gate is **not** waiver-released: `git push` on this task always
  needs the credited reviewer verdict or your permission reply, so an
  unscoped waiver expresses nothing there.
- **`PLAN APPROVED:`** in your prompt approves the plan like a reviewer
  verdict, with human provenance; it replays across restart.
- **Permission escalation.** Repeat-attempt escalation of the landing and
  hands-on gates is **block-only by default** (`escalation: "block"`): a
  retried attempt blocks again, the agent is told to stop and report, and
  release is scoped per gate — `USER WAIVER:` covers the hands-on gate,
  `PLAN APPROVED:` covers the plan gate only, and the landing gate releases
  only via an earned reviewer `VERDICT: APPROVE` (or your permission reply
  under `"ask"`). Set `escalation: "ask"`
  to restore the interactive ladder: the repeat attempt escalates to you
  through OpenCode's permission surface — reply `always` (approved for the
  task), `once` (one dispatch/edit), or `reject`. The plan-gate escalation
  (first executor dispatch with no plan approval) follows the same mode:
  under `"block"` the dispatch blocks with the stop-and-report instruction
  and release flows via `PLAN APPROVED:` (or a waiver); under `"ask"` it
  surfaces the permission prompt instead.
  Turnstile assumes a human actually answers these asks. If the host answers
  them automatically (`session.permissions: "autoaccept"` in
  `~/.config/opencode/cli.json`), the `"ask"`-mode human decision points,
  the plan-gate escalation, and the ensemble's human release are all
  rubber-stamped and those gates degrade to delays — one reason the default
  is `"block"`. `opencode-turnstile status` prints an advisory when it
  detects the setting.

Do not create, paste, or relay a `USER WAIVER:` / `PLAN APPROVED:` marker to
open a gate — only the user's own prompt carries a real waiver or approval.
Full lifecycle semantics (waiver allowances, ensemble interaction, prompt
channels): [`docs/usage.md`](docs/usage.md#waivers-and-approvals).

## Suspend and resume

You can pause turnstile's gate enforcement for the whole session with two
prompt markers, read only from your own prompt (never from an agent's
dispatch prompt — there is no agent-dispatchable off switch):

- **`TURNSTILE OFF:`** suspends blocking for the session: enforcement
  decisions keep computing and journaling (every block that would have fired
  is journaled as a `suspended` audit entry with `event:"would-block"`), but nothing throws `BLOCKED`
  and no permission ask is forced. The session's gate state is cleared fresh
  and stays suspended across a restart (replayed from the journal tail).
- **`TURNSTILE ON:`** resumes enforcement with fresh task state — no credit
  earned while suspended rehydrates.

When both markers appear in one prompt, the one occurring later wins. Config:
`suspendMarker` / `resumeMarker` rename the literals (defaults
`TURNSTILE OFF:` / `TURNSTILE ON:`), and `allowSuspend: false` disables both
(an OFF is refused with a journaled `refused:true` entry and a surfaced
diagnostic, and the ON marker is refused the same way). Inspect the live state with
`node bin/cli.mjs status` (in-repo) or `npx opencode-turnstile status`.

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

Turnstile has no npm lifecycle hooks: installing the package never
writes to `~/.config/opencode` — that happens only when you run an explicit
command. Modes, conflicts, the ledger, upgrades, uninstall, and per-agent
model pins are covered in
[`docs/usage.md`](docs/usage.md#installing-and-maintaining).

Verify a clone with:

```sh
npm install
npm run ci            # lint, format:check, typecheck, check:markers, 100%-coverage test gate
npm run ci:installed  # install:check — run after `npm run init` on a machine with artifacts
```

## Configuration

Defaults live in code (`src/config.ts`); override via
`~/.config/opencode/turnstile.json`, environment variables, or both
(precedence: defaults < file < env; config is read once at setup — restart
sessions to apply). Copy
[`examples/turnstile.example.json`](examples/turnstile.example.json) as a
starting point: every key is optional and matches the code defaults. One
key needs a note: the example writes agents.bareOutput as [], because JSON
cannot express the "unset" sentinel the code uses for the same default. The
loader reads an explicit [] as unset and re-derives the list from the
configured test-runner, reviewer, and plan-reviewer names, so the copy needs
no edits. The key knobs most people touch:

| Key                       | Default   | Meaning                                                                                                                |
| ------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------- |
| `gateEvidence`            | `enforce` | `flag`/`off` revert to flip-on-trust for `GATE: PASS`                                                                  |
| `escalation`              | `block`   | repeat landing/hands-on attempts re-block with no permission ask; `ask` restores the interactive permission-ask ladder |
| `gitGates.commitMessages` | `true`    | validate `git commit -m` subjects as conventional commits; `false` disables commit lint                                |
| `gitGates.landingGate`    | `true`    | gate `git push` on this task reviewer `VERDICT: APPROVE`; `false` disables the gate                                    |
| `reviewEnsemble`          | `enforce` | `advise` credits a single-reviewer APPROVE unconditionally                                                             |

| `sessionSummary` | `quiet` | one recap line at session end for active sessions (`on` adds an all-green line for idle ones; `off` disables) |
| `toolPolicy.bashDeny` | `[]` | regex denylist for `bash`/`shell` (e.g. worktree/branch/merge ops) |
| `toolPolicy.bashWriteGate` | `true` | gate confident file-writing bash commands (redirects from writer commands, `tee`, `sed -i`/`--in-place`, `cp`/`mv`/`dd`/`truncate`/`touch`) through the hands-on ladder; write-shaped commands always journal `handsOn` telemetry |
| `maxReviewerRounds` / others | 2 / 3 / 3 / 4 / 16 | per-leg and total dispatch caps per task |
| `agents.*` | stage names | rename recognition when you bring your own agents |
| `plansDir` | `.opencode/plans` | where the decomposition scan looks |

Invalid keys are ignored, journaled, and summarized once into the session
context; a malformed config file never breaks the host. The full table —
every key, default, and environment variable (`TURNSTILE_TRACE`,
`TURNSTILE_METRICS_DIR`, `TURNSTILE_CONFIG`) — is in
[`docs/usage.md`](docs/usage.md#configuration); `schemas/turnstile.schema.json`
ships with the package for editor completion.

## Show the evidence on your PR

The journal is per-machine; your teammates never see it. Turn the last task's
evidence into a shareable artifact — derived counts, canonical marker lines,
and shas, never session IDs, prompts, or command text:

    npx opencode-turnstile evidence --task latest --out .turnstile/evidence.json

That writes both the JSON and the Markdown the Action renders. Commit them and
a GitHub Action upserts one sticky comment per PR — the badge your reviewers
actually read, not README traffic. `evidence --validate` re-checks a committed
artifact in CI, so the summary a reviewer trusts is the one the schema
permits. The comment states what it is: a correlated claim, not proof, with
the journal head sha a reader can ask you to audit. One workflow detail worth
knowing: validation runs on the pull request itself (untrusted code, read-only
token), while the comment is posted from a trusted `pull_request_target` run
that never checks your branch out. GitHub asks a maintainer to approve that run
for a first-time contributor's fork PR, so an outside contributor's first badge
can sit pending until someone clicks — the alternative is a job that executes
contributor code holding a write token, which is not a trade worth making.

This is what the comment looks like, posted by the Action on this repo's own
pull requests — one comment, re-edited by each push, never a second one:

![turnstile evidence posted on a pull request: one sticky comment with the plan verdict, the verified test counts, and the journal head sha](docs/images/pr-evidence.png)

## What turnstile is not

Turnstile is a speed bump and an audit trail, not a security boundary. A
`GATE: PASS` is a claim correlated with evidence, not proof; the journal is
the record of what was _claimed_ and is treated as sensitive data (see
[SECURITY.md](SECURITY.md)); the denylist is a deterrent, not a sandbox; MCP
tools remain unguarded. The full threat model:
[`docs/architecture.md` §10](docs/architecture.md#10-security-posture-and-limits).

## Behavior contract

- Fail-open by design. Every hook body is guarded; internal errors are
  journaled and the tool call proceeds. The only thrown errors are the
  deliberate `BLOCKED by turnstile:` ones.
- `docs/architecture.md` is the authoritative reference for enforced
  contracts; the doc comment atop `turnstile.ts` summarizes it. CI keeps
  the marker examples in this README in sync with the parser regexes.
- Host API is the OpenCode v2 promise-plugin shape
  (`{ tool.hook, session.hook, permission.hook, event.subscribe }` — the
  permission hook is registered when the host exposes it).
- Host compatibility is checked at setup against the shipped range
  (`HOST_COMPAT` in `src/host-compat.ts`); see the matrix below.

### OpenCode compatibility matrix

| OpenCode host       | turnstile | Status                                            |
| ------------------- | --------- | ------------------------------------------------- |
| ≥ 2.0.22, < 3.0.0   | 0.8.x     | Supported (tested: 2.0.22, 2.0.27, 2.0.29, 2.2.0) |
| ≥ 3.0.0 or < 2.0.22 | 0.7.x     | Refuses to enforce at setup; upgrade turnstile    |
| version unreadable  | 0.7.x     | Enforces; one-time journal warning                |

On an incompatible host turnstile toasts the upgrade instruction and
registers no hooks (a full no-op — fail-open):

> turnstile 0.7.x expects opencode >=2.0.22,<3.0.0; you're on 3.1.0 —
> upgrade turnstile (npm i opencode-turnstile@latest) or pin opencode

`npx opencode-turnstile status --check-updates` (opt-in, network, cached 24 h)
reports when a newer turnstile is published.

## More documentation

- [`docs/architecture.md`](docs/architecture.md) — how the plugin works
  inside: module map, hook surface, end-to-end task flow, gate state
  machine, journal/replay, policy injection, security posture, and
  ecosystem positioning, with rendered diagrams.
- [`docs/usage.md`](docs/usage.md) — day-to-day operation: a worked session,
  waivers and approvals in full, installing and maintaining (modes, ledger,
  model pins), the complete configuration table, journals and retention, and
  the `status` command.
- [SECURITY.md](SECURITY.md) — journal sensitivity and trust model.
