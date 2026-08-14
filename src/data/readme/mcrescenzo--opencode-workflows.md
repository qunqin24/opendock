# opencode-workflows

**An OpenCode plugin for running resumable, multi-agent workflows with durable run state.**

`@mcrescenzo/opencode-workflows` adds a `workflow_*` tool family to OpenCode that
lets you (or an agent) fan work out across multiple agent lanes, inspect
persisted status, resume after an interruption, and choose between direct
live-tree edits and explicitly isolated, hash-gated worktree changes.

It is the **engine and harness**, with one flagship workflow included; you bring
the rest.

## Why use it

OpenCode chats are great for one-off tasks, but some jobs are bigger or riskier
than a single unstructured prompt: a whole-repo review, a multi-step research
fan-out, a staged edit plan, a long-running background sweep. This plugin gives
those jobs a structure:

- **Run on the first call.** `workflow_run` resolves authority, models, budgets,
  and lanes, then starts immediately. Use the separate `workflow_propose` tool
  when you want a durable, non-executing Planner review first.
- **Control each lane.** Workflow bodies run inside a deterministic QuickJS
  sandbox. Narrowed authority profiles use deny-by-default lane permissions;
  `authority.full` uses the broader Claude-parity permission policy.
- **Recover after interruptions.** Run state and completed lane results persist;
  pause, cancel, reconcile, and resume re-run only what's needed. Live execution
  still stops with the owning OpenCode process.
- **Extend a stopped wave deliberately.** `maxAgents` is cumulative approved
  logical-call credit, not an attempt counter. An agent-capacity stop persists a
  single-use request that a request-bound `grantAgents` resume can fund
  additively, up to the cumulative hard cap, while completed lanes replay.
- **Choose the write boundary.** Ordinary edit lanes write the primary tree
  directly. A lane that requests `isolation: "worktree"` stages changes in a
  managed worktree for the separate hash-gated `workflow_apply` path.

## What you get

- A `workflow_*` tool family: `workflow_propose`, `workflow_proposal_feedback`, `workflow_run`, `workflow_status`, `workflow_artifact`, `workflow_events`,
  `workflow_apply`, `workflow_save`, `workflow_list`, `workflow_templates`, plus
  lifecycle tools (`workflow_cancel`, `workflow_pause`, `workflow_kill`,
  `workflow_reconcile`, `workflow_cleanup`, `workflow_salvage`) and references
  (`workflow_roles`, `workflow_models`, `workflow_template_save`).
- Workflow primitives in the sandbox body: `agent`, `parallel`, `pipeline`,
  nested `workflow`, phases, budgets, structured-output schemas, and background
  runs with completion notifications.
- Authority profiles that scope what a run can do — from read-only review up to
  hash-gated primary-tree apply and (via a trusted extension) autonomous local
  drains.
- Starter templates (`first-run-slice`, `scoped-parallel`, `edit-review`,
  `exhaustive-review`) to
  copy and adapt.
- One bundled flagship workflow — `deep-research` — plus its `/deep-research`
  command: deep multi-source web research with adversarial fact-checking. It
  doubles as the living gold-standard example of every convention below.
- Three bundled skills: `opencode-workflow-authoring`, `workflow-model-tiering`,
  and `workflow-plan-review`.
- A trusted-extension seam so operators can contribute their own workflows,
  commands, skills, tools, and drain adapters.

## What it is *not*

- **It is an engine, not a pack of automations.** It ships exactly one bundled
  workflow (`deep-research`, with its `/deep-research` command) as the flagship
  exemplar; everything else you write yourself (or install via a trusted
  extension) and run with `workflow_run`.
- It is **not a daemon.** Background runs live inside the OpenCode process and
  stop if that process exits; use `workflow_reconcile` to recover stale runs.
- It does **not** make edit authority harmless. An ordinary edit lane writes the
  live primary tree; choose a read-only profile or `isolation: "worktree"` when
  direct writes are not appropriate.
- Trusted extensions are **not** sandboxed — they run as normal Node code in
  your process. Only install extensions you'd trust as local code.

## Install

Requires OpenCode `>=1.18.3 <1.19.0`, Node ≥ 20.11, and `git` on your
`PATH`.

The recommended installer registers both package targets: the server plugin in
`opencode.json` and the native workflow monitor in `tui.json`.

```sh
opencode plugin @mcrescenzo/opencode-workflows
# or install and register it globally
opencode plugin -g @mcrescenzo/opencode-workflows
```

For a source checkout or monorepo package, the same command accepts a local path
without registry traffic:

```sh
opencode plugin ./plugins/opencode-workflows
```

For manual installation, add the package with `bun add` or `npm install`, then
register both targets. OpenCode uses the singular `plugin` array key in each
file:

`opencode.json`:

```json
{
  "plugin": ["@mcrescenzo/opencode-workflows"]
}
```

`tui.json`:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["@mcrescenzo/opencode-workflows"]
}
```

Restart OpenCode after changing plugin config.

## Bundled workflow: deep-research

Deep multi-source research with adversarial fact-checking: Scope → parallel web
search per angle → URL-dedup + source budget → indexed, target-bound evidence
extraction through WebSearch →
per-claim adversarial vote panels (3 votes at `thorough`; verifier infrastructure
errors are reported as *unverified*, never as refutations) → cited synthesis.

```
workflow_run({ name: "deep-research", args: "is fish oil effective for ADHD?", background: true })
```

Or with options: `args: { question, depth: "quick" | "normal" | "thorough",
maxSources, seedUrls }`. Seed inputs must be bounded, already-public and indexed
HTTP(S) URLs; local files, non-public address literals, and credential-bearing URLs are
rejected and surfaced in the result. Do not submit confidential research questions or
confidential, unlisted, capability-bearing, or signed URLs. The research question,
generated queries, and seed URL targets are sent through OpenCode WebSearch to its
configured external search provider (Exa or Parallel on the supported runtime). Depth
`thorough` (default) is full 3-vote verification.

The workflow has **network authority**, but every child lane explicitly denies
direct WebFetch. Search, extraction, and verification use remote
WebSearch only; scope and synthesize lanes deny network access. Consequently, seed URLs
prioritize public indexed targets but are not an offline or direct-fetch fallback when
the external search provider is unavailable. No shell, no MCP, no edits. The
`/deep-research` command wraps the full flow: clarify → model tiers → launch →
report persisted to `.deep-research/runs/`.

## Quick start

`workflow_run` starts on the first call; there is no preview/approve handshake.
Background execution is the default, and an explicit `background: false` makes
the call wait for the result inline.

1. Save or write a workflow, then run it:
   ```
   workflow_run({ name: "my-workflow", args: { task: "..." }, background: true })
   ```
2. The background call returns a run id immediately. Yield instead of polling;
   the best-effort completion prompt normally resumes the invoking session. A
   successful `promptAsync` submission proves acceptance only, not observation
   or acknowledgement. Then read the terminal result exactly once:
   ```
   workflow_status({ runId, detail: "result" })
   ```

If launch warns that completion prompts are unavailable, polling is the
fallback.

### Optional durable Planner review

`workflow_propose` resolves and persists an exact `awaiting_human` proposal but
never executes or launches it. Open **Planner** from the Workflows sidebar to
review the `awaiting_review` record. **Approve & run** launches it immediately;
deferred **Approve** makes its exact identity launchable through the originating
session:

```js
const feedback = workflow_proposal_feedback({
  proposalId: "<proposal id from the proposal receipt>",
  proposalRootScope: "<proposalRootScope from the proposal receipt>",
})
workflow_run({
  proposalId: feedback.proposal.proposalId,
  proposalRevision: feedback.proposal.revision,
  proposalPlanHash: feedback.proposal.planHash,
  proposalRootScope: feedback.proposal.rootScope,
})
```

Launch only when the current feedback receipt says `launchable: true`. Use all
four identity fields from that same receipt; do not combine them with source,
args, or other launch fields. Chat wording alone is never approval.

### Compatibility: inert launch-gate fields

Saved presets and approved proposal launches may still carry `approve`,
`approvalHash`, `approvalMode`, or `autoApprove`. `workflow_run` accepts and
ignores all four; they do not gate a direct run or restore the retired transient
preview protocol.

The result readback remains the same for direct and proposal-originated runs:

```
workflow_status({ runId, detail: "result" })
```

`detail: "result"` preserves the legacy `status.result.output` path and also
returns `resultEnvelope` version 2. Its independent `execution`, `domain`,
`readback`, and `resume` axes prevent technical success, domain readiness, and
readback fidelity from being collapsed into one status. Model-returned fields
such as `complete` or `auditReady` are ordinary output, not proof. Follow the
returned `nextActions`; do not infer output for an absent/projected result.

New to workflows? Save a copy of the smallest safe shape and run it read-only:

```
workflow_template_save({ template: "first-run-slice" })
workflow_run({ name: "first-run-slice", background: true })
```

The bundled `workflow-plan-review` skill owns the full launch →
background → completion-notification → result-readback contract; `opencode-workflow-authoring`
covers source shape, fan-out, and edit/apply boundaries; `workflow-model-tiering`
covers fast/deep tier mapping.

## Definitions, presets, and trust are separate

- A **workflow definition** is executable source saved project-locally or
  globally. Saving records an exact source receipt; it never approves or trusts.
- A **launch preset** stores only reusable arguments, model mappings, limits,
  background, and debug choices for one exact definition identity. Applying it
  re-resolves dependencies/roles and creates a fresh proposal; it never runs.
- A **legacy remembered approval** is retained only as a retired, auditable
  record. `workflow_run` does not consult it and it cannot authorize a launch.

Planner keeps separate lists and receipts for all three. Project/global Save and
preset destinations show collision, overwrite, shadowing, and portability facts.
Normal Approve and Approve & run create no policy.

## Configuration (optional)

- **`OPENCODE_WORKFLOWS_DIR`** — where global run state, roles, and templates
  live. Defaults to `$XDG_CONFIG_HOME/opencode/workflows`.
- **`OPENCODE_WORKFLOWS_DEBUG_RETENTION_DAYS`** — keep debug artifacts for this
  many days (default and maximum `7`, valid range `1..7`). Capture defaults to
  privacy-safe `summary`; use `debugCapture: "off"`/`false` to disable it or
  explicit `debugCapture: "full"`/`true` for bounded prompt/schema/raw-message
  capture.
- **`OPENCODE_WORKFLOWS_TUI_ASCII=1`** — replace the native monitor's Unicode
  status glyphs with distinct one-cell ASCII markers. `TERM=dumb` and explicit
  ASCII locales select the same fallback automatically.
- **Plugin `autoApprove` and `approvalMode` options** — accepted for config and
  saved-preset compatibility, but inert for `workflow_run`; direct calls already
  execute on the first call.
- **`OPENCODE_WORKFLOWS_HARD_CONCURRENCY_LIMIT`** — raises/lowers the per-run
  concurrency ceiling (default `64`). The lane default is
  `max(1, min(16, CPU cores - 2))`; lower the ceiling when provider capacity or
  rate limits require less parallelism.

## Safety & privacy

- `workflow_run` executes immediately after the ordinary OpenCode tool-permission
  decision. `workflow_propose` is the separate non-executing review route.
  Elevated authority additionally requires a compatible OpenCode server
  (≥ `1.17.13`).
- Narrowed lanes use deny-by-default permission rules. A lane under
  `authority.full` uses the broader Claude-parity policy, while explicit
  `readOnly` and per-tool `false` choices still narrow it. Ordinary edit lanes
  write the live primary tree; `isolation: "worktree"` opts a lane into a managed
  worktree and the hash-gated `workflow_apply` boundary.
- Raw run artifacts under `.opencode/workflows/runs/` can contain sensitive
  local evidence. Prefer `workflow_status({ detail: "result" })`,
  `workflow_artifact` for complete manifest-issued logical refs, and
  `workflow_events` (all redacted and bounded) over reading raw files.
- Raw proposals and policy state under `.opencode/workflows/proposals/` and
  `.opencode/workflows/policies/` are private local runtime data. Planner lists
  only bounded projections and redacted audit facts; expiry/reconciliation and
  bounded retention do not make raw files safe to publish.
- Model-facing status, completion prompts, and newly emitted exact run
  references do not contain absolute run/result paths. Exact duplicate-run
  references bind to a one-way run-root fingerprint; copied legacy references
  remain readable for compatibility.
- Model-facing artifact receipts expose availability, bounded file names/logical
  references, counts, and one-way hashes; canonical artifact directories and
  file paths remain private controller state. `workflow_artifact` requires the
  receipt namespace plus an exact manifest-issued ref, rejects duplicate plain
  run IDs, traversal, symlinks, root substitution, partial/corrupt manifests,
  changed-generation continuations, and inconsistent part hashes/bytes/counts/order.
  Readers pin every part descriptor before old generation names can be reclaimed.
  Persistence retains one named generation per namespace under explicit 128 MiB,
  1,024-part, and 2,048-file cleanup ceilings. All modes validate every manifest
  part before returning full, hash-bound partial, or summary readback without
  becoming a run-file browser; a bounded two-minute LRU prevents partial pages
  from re-reading and re-hashing every part.

The deep contracts — full trust model, source-of-truth hierarchy, salvage/crash
recovery, apply internals — live in the docs linked below, not here.

## For agents

Agents install and use this plugin exactly like users: add
`@mcrescenzo/opencode-workflows` to the `plugin` array in `opencode.json` and
restart OpenCode. Then drive it through tools:

- **Author** a workflow body (`export const meta = {...}` + top-level statements
  ending in `return`; no imports) and save it with `workflow_save`, or run it
  inline. The body runs in a QuickJS sandbox with injected globals: `agent`,
  `parallel`, `pipeline`, `workflow`, `phase`, `log`, `budget`, `args`,
  `persistArtifacts`, `inventoryFiles`, `coverage`, `workflowResult`, `drain`.
  Use `await workflowResult(output, { disposition, reasonCodes, coverage })` only when
  the workflow intentionally asserts a domain disposition. Ordinary return
  values remain domain `unknown`; fields such as `output.status` and
  `output.auditReady` are never inferred. The async helper obtains a run-bound
  host receipt that is validated after the VM returns; marker-shaped guest or
  child-model objects cannot assert a domain outcome.
- **Run** with `workflow_run`. It executes on the first call and defaults to
  background mode; use `profile: "read-only-review"` until a task truly needs
  more authority. Use `workflow_propose` only when the user explicitly wants a
  durable Planner review before execution. Plan agents may propose, but may not
  run, save, trust, or apply.
- **Yield after launch** instead of polling. The completion prompt normally resumes the
  invoking session; then read `workflow_status({ detail: "result" })` exactly
  once. Poll only on the explicit no-notification fallback, for user-requested
  progress/control, or for recovery. Foreground results are already inline.
- For direct edit runs, expect live primary-tree writes. Use
  `agent(prompt, { edit: true, isolation: "worktree" })` when the lane should
  stage a diff for `workflow_apply` instead.
- See the bundled `workflow-plan-review`, `opencode-workflow-authoring`, and
  `workflow-model-tiering` skills and the tool reference below for the full
  contract (launch/readback, sandbox limits, fan-out arity, schemas, model
  tiers, edit/apply boundaries).

## Documentation Map

Use `workflow_list({ format: "json" })` as the machine-canonical discovery surface
for saved and bundled workflow names, args schemas, examples, authority profile,
model-tier hints, and safe readback steps. The docs below are operator guidance,
technical contracts, or historical context.

**Packaged vs GitHub-only.** The tarball includes the runtime plugin, its bundled
workflow and command, all bundled skills, root package/community documents, and
`docs/workflow-plugin.md`. Within the `docs/` tree,
`docs/workflow-plugin.md` is the only packaged file: it is the canonical
`workflow_*` tool reference
(`docs/workflow-plugin.md#workflow-tool-reference`) that every extension,
skill, or agent invoking `workflow_run`/`workflow_apply`/`workflow_status`
depends on — independent of any bundled command beyond the one flagship workflow and command pair (`deep-research`).
Every other doc below lives in the GitHub repository only: read it from a
source checkout, or follow the GitHub links in the table.

| Category | Documents | Packaged? |
| --- | --- | --- |
| Packaged reference surfaces | `README.md`, `skills/*/SKILL.md`, `docs/workflow-plugin.md` | **Yes** |
| Active operator references (GitHub only) | [docs/workflow-recipes.md](https://github.com/mcrescenzo/opencode-workflows/blob/main/docs/workflow-recipes.md), [docs/plugin-system-tests.md](https://github.com/mcrescenzo/opencode-workflows/blob/main/docs/plugin-system-tests.md), [docs/run-audit-playbook.md](https://github.com/mcrescenzo/opencode-workflows/blob/main/docs/run-audit-playbook.md), [docs/goal-supervision-autonomous-drains.md](https://github.com/mcrescenzo/opencode-workflows/blob/main/docs/goal-supervision-autonomous-drains.md) | No |
| Active technical contracts (GitHub only) | [docs/workflow-extensions.md](https://github.com/mcrescenzo/opencode-workflows/blob/main/docs/workflow-extensions.md) | No |
| Roadmap / planning (GitHub only) | `docs/claude-parity-roadmap.md` | No |
| Historical snapshots / audits / completed plans (GitHub only) | `docs/release-gate-validation-2026-06-16.md`, `docs/dogfood-rollout-2026-06-16.md`, `docs/workflow-autonomous-harness-design.md`, `docs/workflow-autonomous-harness-plan.md`, `docs/review-2026-06-19-bug-robustness-remediation-plan.md`, `docs/general-purpose-harness-extraction-plan.md`, `docs/superpowers/specs/2026-06-23-session-aware-model-tiering-design.md`, `docs/superpowers/plans/2026-06-23-session-aware-model-tiering-plan.md`, `docs/superpowers/plans/2026-06-23-port-repo-bughunt-to-opencode.md`, `docs/superpowers/specs/2026-07-07-toast-status-cards-design.md`, `docs/superpowers/plans/2026-07-07-design-c-gate-simplification.md`, `docs/superpowers/plans/2026-07-08-agent-surface-docs-accuracy.md`, `docs/superpowers/specs/2026-07-08-deep-research-bundled-workflow-design.md`, `docs/superpowers/plans/2026-07-08-deep-research-bundled-workflow.md`, `docs/superpowers/plans/2026-07-08-inline-approval-rekey-hardening.md`, `docs/superpowers/specs/2026-07-08-pure-architecture-extraction-design.md`, `docs/superpowers/plans/2026-07-08-pure-architecture-extraction.md`, `docs/superpowers/plans/2026-07-09-deep-research-hardening.md` | No |

**Drains and extensions.** The kernel ships no domain drain workflow or domain
extension — drain workflows (`harness: "drain"`) are contributed by configured
trusted extensions and invoked by name (see `docs/workflow-extensions.md` and
the "Workflow Boundaries" section of `AGENTS.md`).
`docs/goal-supervision-autonomous-drains.md` describes the `/goal` oversight
boundary for such extension-supplied drains; it does not itself ship or assume a
bundled drain workflow.

Canonical safety references — apply authority and primary-tree writes, the
raw-artifact source-of-truth hierarchy, lifecycle recovery and cleanup, and the
deterministic launch-time trust checks — live in `docs/workflow-plugin.md`; the
complete `workflow_*` tool table is in
`docs/workflow-plugin.md#workflow-tool-reference`.

## Native workflow monitor

The package ships a **native OpenCode workflow monitor** as a dedicated TUI
plugin, alongside the server plugin, from the same npm package. Open it in
OpenCode with the **`/workflows`** command or **`<leader>w`**.

The public `./tui` export points to the checked-in generated JavaScript artifact
`workflow-tui/index.js`, not runtime TSX. The package builds that artifact and
its module inventory before packing; it has no install or postinstall build.
OpenCode, OpenTUI, and Solid stay external to the artifact. OpenTUI `0.4.x` and
Solid `1.9.12` are optional host-owned peers, so co-installed TUI plugins do not
bring private competing renderer runtimes.

Run artifacts stay in the existing project/worktree roots, but the monitor is
**scoped to the exact OpenCode session currently being viewed**. Its minimal
aggregate sidebar and full-host-content workspace include only runs that session
successfully launched or resumed. `/workflows`, `<leader>w`, and clicking the
sidebar all navigate to the same namespaced public TUI route; Escape backs out
drill levels and then restores the exact prior route. With no exact host session,
the sidebar renders nothing and the route shows no workflow data.

- **Adaptive layout** by available host width: three panes (Runs / Phases and lanes /
  Detail) on wide terminals, two on medium, single-pane drill-down on narrow.
- **Detail tabs:** Details, Activity, and Output, with contextual recovery
  banners and pane maximize. Keyboard **and** mouse.
- **Shared runs and result availability:** resuming a run adds that session to its
  durable invoker set without removing earlier invokers, so every session that
  launched or resumed it can see it. Completed results remain visibly available
  in the Output tab without creating a read-state badge or persistent attention
  signal.
- **Controls:** Pause/Resume (one reversible slot), resumable Stop, permanent
  Cancel (distinct from Remove), exact single-run Remove, bulk Cleanup (which
  protects active, recovery-pending, pinned, locked, ambiguous, corrupt,
  partial, and review/apply-pending runs while ordinary completed cache-replay
  history remains removable), selected-run Save, and exact
  selected-lane Stop/Restart.
- **Attention:** actionable states remain visible as monitor-local attention in
  the scoped sidebar/workspace. Completed result availability remains visible
  without an unread or read-state badge and does not itself become attention.
  The monitor does not request blurred-host desktop notifications. These display
  states are distinct from the separate durable completion prompt for background
  runs.

The monitor's eager graph contains bounded, no-follow durable readers and pure,
secret-masked projections. Server registration, QuickJS, child-agent launch,
worktree, approval execution, and mutation services are absent from activation.
Fixed action-owned modules load only after the matching explicit user action and
surface a bounded local error if loading fails. Approval stays an OpenCode-only
interaction; the monitor has no approval action and never resumes, applies,
reconciles, or starts an owner.
Live execution still dies with its owner: after owner death the monitor shows
stale state; recover with `workflow_reconcile` (optionally `workflow_salvage`),
then an approved `workflow_run({ resumeRunId })`.

Session scoping is a display predicate, not an authorization boundary or a new
storage root. Session IDs are persisted only as domain-separated digests and are
never rendered. Existing runs without valid invocation attribution are hidden
from the monitor by design; `workflow_status` remains unscoped and
project/worktree-wide, so use it to inspect or recover legacy runs. There is no
project-history toggle, and a forked session does not inherit monitor visibility
unless it independently launches or resumes the run. Approval hashes, authority,
durable completion-notification targeting, and run ownership are unchanged.

**Register the TUI target.** The monitor is a separate registration from the
server plugin — OpenCode discovers TUI plugins only through a `tui.json` file.
The recommended `opencode plugin` command and both manual config blocks are in
the Install section above.

Restart OpenCode after changing either file. The package and native-monitor
support band is OpenCode `>=1.18.3 <1.19.0`; `1.18.3` is the supported minimum
and `1.18.11` is the current/latest intended 1.18.x verification point. The
separate elevated server-authority fingerprint still refuses servers older than
`1.17.13`; that is a security floor, not the package/TUI compatibility range.
Installing the package does not modify your `PATH`. The server target
must still be registered with `opencode plugin` or in `opencode.json`. On its
first boot, that server target registers the separate TUI target automatically
when no TUI config layer already contains it; restart OpenCode once more to load
the monitor. Set the plugin option `autoRegisterTui` to `false`, or set
`OPENCODE_WORKFLOWS_TUI_AUTOREGISTER_DISABLED`, to disable this bootstrap.

Registration always emits a bare package name or package-root path. A legacy
entry that points inside this package at the raw TSX, generated JavaScript, or
server entrypoint is replaced in place exactly once; tuple options, comments,
ordering, Self-Evolve, and unrelated plugins remain unchanged. Unsafe JSONC,
symlink drift, audit failure, or unsupported filesystem guarantees refuse the
write and retain local backup/audit evidence rather than weakening the edit.

### Removed legacy monitoring surfaces

The standalone terminal companion, its diagnostic command-line interface, and
ambient lifecycle progress notifications have been removed. Use the native
monitor above for live observation and control.

Monitor detail is a bounded, secret-masked display boundary, not semantic
filtering. Raw prompts, reasoning, tool input/output/error, transcripts,
checkpoints, journals, and full result files are excluded. A successful lane may
expose one allowlisted result preview only after secret and absolute-path
masking, bounded to 600 Unicode code points; names, hostnames, and business data
can still remain visible within that preview. Treat raw run artifacts as
local-sensitive.

Linux is the verified release platform. Windows and macOS observation have not
been runtime-verified for this release. The `workflow_save`/`workflow_template_save`
write paths, automatic TUI registration, descriptor-pinned edit/integration lane
control, and the attempt journal are unsupported on those platforms and fail closed when Linux
`/proc/self/fd`, `O_NOFOLLOW`, or `O_DIRECTORY` guarantees are unavailable. The
destination registry filesystem must also support same-directory hard links and
directory fsync; unsupported operations fail explicitly rather than falling back
to a weaker transaction.

Ordinary workflow journals, events, and ledgers remain available on other
platforms through the prior private-file implementation. On verified Linux
hosts, those JSONL files additionally use descriptor-pinned target checks,
cross-process append locks, fail-closed interior validation, and a
version-matched validation sidecar so appends do not rescan the full history.
Exact run deletion similarly uses validated-inode quarantine rename before
recursive removal on Linux. It fails closed when descriptor-backed quarantine
is unavailable; there is no pathname-only recursive-deletion fallback.

## Source Checkout Verification

The npm package ships the server plugin, the native TUI monitor target
(`exports["./tui"]`), all bundled skills, exactly one workflow
and command (`deep-research`), root package/community documents, and
`docs/workflow-plugin.md` (see `files` in `package.json` for the exact list).
The other active operator and technical docs are GitHub-only. It does not ship the "Historical snapshots / audits" or
"Roadmap / planning" docs; completed
plans stay with those historical sources. It also does not ship this repository's `tests/`, `scripts/`, or reference
extension source. The `npm run ...` verification commands below
are for a source checkout or contributor clone, **not for an installed package tarball**.

Run the nested repo workflow regression wrapper from this directory:

```sh
npm run test:workflows
```

This wrapper covers the core `workflow_run` / `workflow_apply` paths. Kernel
drain, extension-seam, and durable state coverage live in the focused scripts
below and in the catch-all `npm test` matrix.

Run focused kernel and extension coverage from this directory:

```sh
npm run test:workflow-kernel
npm run test:workflow-adapters
npm run test:extension-seam
```

Run the full plugin test matrix (all workflow, adapter, runtime,
durable-state, and extension integration tests) from this directory:

```sh
npm test
```

`npm test` recursively discovers every `tests/**/*.test.mjs` file, orders the
paths deterministically, and passes the complete list to Node's built-in test
runner. The broader `npm run release:no-token` gate also type-checks the native
TUI, builds it twice, rejects non-deterministic bytes or forbidden eager modules,
packs and exercises the installed artifact with Node and Bun, and validates the
final dry-run package manifest. Its installed-artifact step requires a `tar`
executable on `PATH`.

For TUI coexistence changes, the separate canonical live gate is:

```sh
npm run release:tui-coexistence-required -- \
  --workflows /absolute/workflows-checkout-or-tarball \
  --self-evolve /absolute/self-evolve-checkout-or-tarball \
  --opencode /absolute/opencode-1.18.x \
  --artifacts /absolute/sanitized-evidence-directory
```

It requires generated-JavaScript `./tui` exports, creates a fresh home for
Workflows alone and for both plugin orders on each of 10 attempts (20 paired
starts), recognizes readiness from the current terminal frame, submits no
provider prompt, configures no MCP, and kills the full process group. Its
primary stage deliberately has no witness or server plugin. After all primary
starts pass, two fresh secondary processes add a witness that requires both
stable plugin IDs to be active and both exact command IDs to be registered;
the installed-package smoke separately opens the Workflows route. One stage
cannot substitute for the other. A missing built peer candidate,
unsupported host version, skipped live run, or independent review remains
unverified evidence rather than a pass.

The public CI workflow in `.github/workflows/ci.yml` runs that gate on
`ubuntu-latest` with Node `20.11.0`, `22`, and `24`, plus the repository-pinned
Bun `1.3.8` and Node-20.11-compatible npm `10.9.4`. It installs dependencies
from `bun.lock`. The automated release runs that same npm pin in an unprivileged
gate job, then uses the exact pinned npm `11.18.0` packer to create one release
tarball and runs the installed-artifact Node/Bun import and TUI-build smoke
against those exact validated and hashed bytes. A
checkout-free repository-write job then reserves the exact version tag. A
separate source-checkout-free minimal job uses npm `11.18.0` on Node `22.23.1`
with OIDC permission, downloads that tarball by immutable artifact ID,
revalidates its SHA-256 and package contents, and publishes those exact bytes
with lifecycle scripts disabled. A final checkout-free repository-write job
creates or repairs the GitHub Release.
Checkout credentials are not persisted, every third-party action is pinned to
a full commit SHA, and GitHub's native max-queue concurrency serializes the
whole four-job flow without consuming a hosted runner while waiting. The
platform retains up to 100 pending release runs; additional runs are canceled
and must be rerun after capacity is available. Each release push must introduce
exactly one strictly increasing, npm-compatible stable `X.Y.Z` transition.
Prerelease and build-metadata versions are intentionally rejected until they
have an explicit channel policy; npm normalizes build metadata and a prerelease
must not silently become `latest`. Public CI applies an effective-merge
at-most-one, monotonic transition guard to pull requests and the exact
first-parent guard to pushes; configure that check as required before merging.
Version-bump PRs must use squash or merge-commit integration, or contain only
one version-changing commit when rebased. Because queue wait order can differ
from dispatch order, the OIDC job refreshes the current `main` manifest
immediately before publishing. A run whose package version is no longer current
publishes under a commit-qualified npm tag instead of moving the default
`latest` tag backward. Reserving the exact version tag after the no-token gate
makes both failed/ambiguous publication and post-publication finalization
crashes recoverable by rerunning the same workflow.
Already-published versions require an existing remote version tag that points
exactly at the workflow commit (annotated tags are checked at their peeled
commit); the release refuses to invent an unproven tag. Tag provenance is
checked before publishing and again before finalization, and only an explicit
registry `E404` is treated as an unpublished version.
The `vX.Y.Z` tag records gated immutable release intent; the published GitHub
Release records completion. A reserved tag can therefore remain without an npm
version or GitHub Release after a persistent publish failure. Repair the
registry/service issue and rerun that same current-definition workflow. Do not
rerun pre-migration historical release runs, because a rerun uses the workflow
definition from its original commit.

Configure npm trusted publishing for this exact workflow and treat it as the
package's sole publisher. In npm package settings, the trusted publisher must
name this repository and `release.yml`, and **Allowed actions** must include
`npm publish`. Set **Publishing access** to **Require two-factor authentication
and disallow tokens**, and remove other out-of-band publication paths;
otherwise another publisher can race the registry check, reservation, and OIDC
publish boundaries. Registry reads and publication are executed from a clean
runner directory with both the default and `@mcrescenzo` registries pinned to
`https://registry.npmjs.org`, so a repository `.npmrc` cannot redirect them.

The repository must also enforce a `v*` tag ruleset that permits the release
workflow to create a missing tag but blocks tag updates and deletions, with
bypass access minimized. The workflow rechecks the reserved direct/peeled ref
immediately before npm publication and twice before GitHub Release creation;
the ruleset supplies the immutability that a read-then-publish workflow cannot
create by itself.
The full matrix remains Linux-only because Linux is the verified release
platform; it intentionally does not run publishing, token-using live probes,
the private parent integration check, or the required live child system smoke.

For system-level plugin startup checks, use [docs/plugin-system-tests.md](https://github.com/mcrescenzo/opencode-workflows/blob/main/docs/plugin-system-tests.md) (GitHub only, not packaged). Those
checks start disposable child opencode servers and verify startup health,
registries, and cleanup without restarting the parent TUI.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contributor prerequisites, lockfile
policy, and release-readiness notes. Verification matrix: `npm test`;
`workflow_run`/`workflow_apply` wrapper: `npm run test:workflows`.

## Roadmap

The current roadmap is `docs/claude-parity-roadmap.md` — proposed parity work
where every item is marked proposed or **[shipped]**. The earlier
`docs/workflow-autonomous-harness-plan.md` is a **historical** moonshot plan
retained for context (its beads domain and live-gate subsystem were implemented
and later removed; see CHANGELOG 0.2.0). Current autonomous-drain behavior comes
from configured trusted extensions (`docs/workflow-extensions.md`), not a
bundled domain workflow.
