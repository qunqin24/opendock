# goals — the `/goal` plugin for opencode

Long agentic sessions drift: the assistant wanders off the original ask, loses
the thread after a few tool calls, or declares victory ("Done! ✅") on work
that doesn't actually satisfy what you asked for. `/goal` fixes that by
keeping a single, persistent objective for the session and refusing to accept
"I'm done" at face value.

Under the hood, after each assistant turn the plugin relays bounded, sanitized
evidence — a recent transcript excerpt, tool call/result summaries, the
session diff, the goal text, and any assistant-claimed evidence — to a hidden
**`mcrescenzo-opencode-goals-evaluator-v1`** agent, which returns the real,
final verdict. For file/test/docs/review-oriented goals a hidden read-only
**`mcrescenzo-opencode-goals-researcher-v1`** agent may gather additional
evidence first. Until the evaluator marks the goal
met (or the goal is blocked, paused, or its budget is exhausted), the plugin
sends an auto-continue prompt so work proceeds without a human re-prompting
every turn.

## Example

```
/goal Get all tests in src/api passing and update the CHANGELOG
```

Setting the goal fires an immediate toast and puts the session to work:

```
Goal active
Goal: Get all tests in src/api passing and update the CHANGELOG
Status: active · 0/100 turns · 0s
Evaluator: waiting for first verdict.
```

While the assistant works, ambient status toasts reflect the evaluator's
running verdict — for example, if it isn't convinced yet:

```
Goal: Get all tests in src/api passing and update the CHANGELOG
Status: active · 3/100 turns · 1m 12s
Evaluator: not met (medium confidence): No evidence yet that src/api tests
pass or that CHANGELOG was updated.
Gap: No test run output for src/api
```

Under the hood, the evaluator's real verdicts are structured JSON matching the
schema in `goals-core.js` (illustrative values):

```json
{
  "met": false,
  "confidence": "medium",
  "evidence_gaps": ["No test run output for src/api"],
  "criteria": [
    { "description": "All tests in src/api pass", "status": "unverified", "evidence_ref": "" }
  ],
  "next_steps": ["Run the test suite for src/api"],
  "reason": "No evidence yet that src/api tests pass or that CHANGELOG was updated.",
  "next": "continue"
}
```

Once the evaluator sees real evidence in the transcript (a passing test run,
an updated `CHANGELOG.md`), it flips `met` to `true` and the goal toast changes
accordingly:

```
Goal achieved
Goal: Get all tests in src/api passing and update the CHANGELOG
Status: achieved · 7/100 turns · 3m 41s
Evidence: All tests in src/api pass and CHANGELOG.md has a new entry.
```

Only the hidden evaluator can produce that final "achieved" state — the build
assistant claiming completion in its own reply is never enough on its own.

## Install and registration

The package is published on npm as `@mcrescenzo/opencode-goals` (registry
version `0.1.1` for this release). OpenCode installs configured npm plugins and
their dependencies into its own cache, so register the package name rather than
adding it to the workspace application. See
[OpenCode's plugin documentation](https://opencode.ai/docs/plugins/) for the
host's package and local-directory discovery contract.

This package declares `@opencode-ai/plugin` as its direct runtime dependency to
pin the host contract. `@opencode-ai/sdk@1.17.14` is a direct development-only
dependency for generated-contract and live-host tests; shipped source does not
import it. The runtime dependency's own packages are transitive dependencies,
recorded in the repo-only `DEPENDENCY-LICENSES.md` inventory.

Exact declared ranges, verified Node/SDK/host cells, beta boundaries, and the
difference between generated, mocked, injected-client, live-host, and packed
evidence are maintained in [`docs/COMPATIBILITY.md`](docs/COMPATIBILITY.md).

OpenCode supports the following registration and discovery paths:

### Published npm package

Add the published package name to the `"plugin"` array in `opencode.json`:

```json
{
  "plugin": [
    "@mcrescenzo/opencode-goals"
  ]
}
```

OpenCode resolves npm plugin packages at startup. The package's public registry
version was verified separately from the local manifest during release checks;
the packed-host smoke exercises the exact local tarball without treating that
as a registry-install result.

### Project-local source checkout

OpenCode automatically loads JavaScript/TypeScript plugin files from
`.opencode/plugins/` in the project. For local Goals development, clone this
repository under `vendor/opencode-goals`, install its dependencies there, and
create `.opencode/plugins/goals.js` with this loader:

```js
export { GoalPlugin } from "../../vendor/opencode-goals/goals.js";
```

Adjust the loader import only if your checkout lives elsewhere; do not add the
source-file path to the `opencode.json` package array. Arbitrary path entries are
not part of this release's verified stable-host installation contract.

### Global local-plugin directory

For a local checkout shared across projects, place an equivalent loader file in
`~/.config/opencode/plugins/`. Imports are relative to that loader; for example,
if the checkout is `~/.config/opencode/src/opencode-goals`, use:

```js
export { GoalPlugin } from "../src/opencode-goals/goals.js";
```

The credential-free packed host smoke exercises loader discovery from both the
project and isolated-global plugin directories. It does not modify your actual
global configuration.

Restart OpenCode after adding or changing any package entry, loader, plugin
source, or bundled command documentation. Already-running processes and
sessions keep the plugins, commands, and agents loaded at startup.

**If `/goal` is not available**, confirm either that `opencode.json` contains
the package name or that the loader is a direct `.js`/`.ts` child of the correct
project/global plugin directory. Then restart OpenCode and check startup output
for plugin import or dependency errors.

## What it does

`/goal <objective>` sets one session goal. Key behaviors:

- **Evaluator has final say.** Assistant-authored completion markers are
  signals, not authority — see "For AI agents" below for the exact marker
  contract. Only the hidden evaluator marks a goal achieved.
- **Two hidden agents, locked down.**
  `mcrescenzo-opencode-goals-evaluator-v1` runs with all tools denied;
  `mcrescenzo-opencode-goals-researcher-v1` is deny-by-default with only
  targeted `read` and `grep` allowed under secret-path deny rules (`.env`,
  `*.pem`, `*.key`, common credential stores, and every descendant of
  `secrets`/`credentials` directories). Sensitive parents override safe-example
  allowances. Broad `glob`, `list`, and `lsp` enumeration is denied. Both
  inherit the session's configured model.
  The generic `goal-evaluator` and `goal-researcher` names are temporary
  compatibility aliases in this release and are never internal fallback
  targets.
- **Human-first pausing.** A real user message after the last auto-continuation
  pauses before any hidden agent or further continuation, so the latest human
  instruction wins. Permission/question prompts block automation while waiting;
  a rejection pauses the goal.
- **Neutral automation admission.** Before hidden evaluation and again before
  each autonomous continuation, Goals joins the root session's durable
  `.opencode/automation-admission/v1/` lease. Conforming plugins therefore
  serialize prompt injection across duplicate factories and processes, while
  malformed state, unknown status, pending interactions, or contention deny the
  attempt. Admitted control parts carry structural
  `metadata.automation.protocol` provenance and are excluded from human and
  independent-evidence classification.
- **Fail-closed continuation settlement.** A thrown or returned send error, an
  acceptance timeout, or any unknown admission outcome pauses the goal after
  one attempt. The history and toast explain that acceptance was not confirmed;
  inspect the session and run `/goal resume` explicitly. Goals never retries an
  uncertain send automatically because the first request may have been accepted.
- **Runaway backstops.** Beyond the per-goal turn budget there are lifetime
  ceilings (a ~3-hour wall-clock cap and a hidden-call budget) and stall
  heuristics that pause repeated low-progress, no-tool-call, or repeated-diff
  loops with no criteria progress. These are not reset by `/goal resume`.
- **Verification and observe modes.** A `--verify` directive tells the build
  agent which command to run under its normal permissions (the plugin never
  executes it), and `--observe` lets the evaluator report not-met verdicts
  without auto-continuing.
- **Polite progress toasts.** The active session goal emits compact lifecycle
  toasts plus a best-effort heartbeat while active, including the objective,
  turn usage, latest evaluator reason, verification failure, or error summary
  (see the Example above).
- **Persistence + recovery.** Goal state is written per workspace and active
  goals recover as *paused* after an opencode restart (see Persistence below).
- **Scoped lifecycle cleanup.** Duplicate plugin factories share a
  reference-counted workspace runtime. Disposing one leaves the surviving
  factory's work intact; disposing the final reference cancels only that
  workspace's transient controllers, heartbeat, diagnostics, and queues.
  Durable goal files are left in place for paused recovery.

The plugin self-registers the `/goal` command from its bundled `commands/goal.md`; no separate command file is required.
It intercepts a command only while the final live `cfg.command.goal` definition is
exactly the bundled definition. An equivalent duplicate package/path
registration is shared safely; a foreign or legacy parent command is preserved,
diagnosed, and not intercepted. Remove the separate parent `/goal` definition
and restart OpenCode to migrate.

> Privacy: hidden evaluator/researcher calls send transcript excerpts, bounded
> tool summaries, diffs, goal text, and research summaries to the configured
> model/provider. Secret-path protections redact file/diff/research content for
> sensitive paths, and transcript text receives best-effort inline credential
> pattern redaction before hidden-agent relay, including common key assignments,
> provider token prefixes, bearer/basic auth, cookies, URL credentials, PEM keys,
> AWS access keys, JWT-shaped strings, and session/csrf-style token prefixes.
> This is not a comprehensive secrecy boundary: arbitrary opaque secrets may not
> match these patterns, do not paste secrets into chat, and nested `.gitignore`
> files are not a secrecy boundary for transcript evidence.

## For AI agents

If you're the build assistant working under an active `/goal`, signal
progress with markers the hidden evaluator treats as claims, not proof: put
`[goal:evidence] <proof>` immediately before a terminal `[goal:complete]`, and
state the concrete blocker on the line immediately before `[goal:blocked]`
when you genuinely need human input. The evaluator — not these markers —
decides whether the goal is actually met, so `[goal:complete]` without a
preceding `[goal:evidence]` line is rejected.

## Commands

- `/goal <objective>` — start or replace the session goal.
- `/goal status` — objective, criteria, constraints, turn usage, evaluator
  reason, evidence, blocker, and recent history.
- `/goal help`, `/goal --help`, `/goal -h` — usage summary for the command
  surface and completion marker.
- `/goal history` — lifecycle events for the current session goal.
- `/goal pause`, `/goal resume`, `/goal clear` — control automation.
- `/goal observe`, `/goal observe on`, `/goal observe off` — toggle observe
  mode, where hidden evaluation/research still runs but not-met verdicts pause
  instead of auto-continuing.
- `/goal continue` or `/goal step` — send one explicit continuation, useful
  after an observe-mode verdict pause.
- `/goal edit <new objective>` — revise the objective while preserving the turn
  limit and history; omitted success, constraints, and verify flags are cleared.
- Clear aliases: `clear`, `stop`, `off`, `reset`, `none`, `cancel`.

## Configuration options

Most configuration is **per goal**, supplied as flags when setting a goal. Value
flags accept both `--flag value` and `--flag="multi word value"` forms; boolean
flags use bare or inline forms. Use `--` before objective text that contains
literal `--flag` tokens:

- `--max-turns <n>` — auto-continue turn budget. Default: **100**.
- `--success "criteria"` — explicit success criteria the evaluator must verify.
- `--constraints "constraints"` / `--non-goals "constraints"` — constraints and
  non-goals to honor.
- `--verify "command"` — frozen build-agent verification directive. The plugin
  does not execute this command; it injects the directive into goal context and
  the evaluator treats transcript-visible results as authoritative evidence.
- `--observe` — hidden evaluation/research still runs and is budgeted, but
  not-met verdicts pause with the verdict instead of sending auto-continuations.
  Use bare `--observe` to enable it, or inline boolean forms such as
  `--observe=off`; accepted boolean tokens are `true`/`false`, `on`/`off`,
  `yes`/`no`, and `1`/`0`.

Notable defaults and safety limits (constants in `goals-core.js`, not currently
user-configurable):

- Default auto-continue budget: 100 turns.
- Minimum delay between auto-continues: ~1s.
- Per-goal lifetime wall-clock cap: ~3 hours (a runaway backstop, **not** reset
  by `/goal resume`; a fresh `/goal` or `/goal edit` starts it over).
- Hidden-call budget scaled to the turn budget, plus stall heuristics that pause
  after repeated low-progress or no-tool-call continuation turns.

The canonical hidden evaluator and researcher agents default to the session's
configured model (`cfg.model`) — no model ID is hard-coded. At runtime,
evaluator, researcher, and audit prompts follow the model captured from the
latest genuine build turn (falling back to the initial build model), so their
quality and cost track that session-model choice.

The skeptical audit is a separate judgment pass, but it uses the same selected
model and reviews the same evidence plus the primary verdict. It therefore adds
skeptical prompting, not cross-model or evidence independence. No comparative
benchmark currently supports claiming that a stronger model materially reduces
false positives, so the plugin does not impose a separate evaluator-model
override.

### Hidden model calls and cost

An ordinary not-met cycle uses **1** hidden call (evaluator); a met cycle uses
**2** (evaluator + skeptical audit); and an evidence-seeking cycle that runs the
researcher and then reaches met uses **4** (evaluator + researcher + evaluator +
audit). The audit is the extra call used by the plugin's fail-closed completion
check, not optional overhead in a met cycle. Each `askGoalEvaluator` pass can
retry once for malformed JSON or protocol confusion; the audit does not retry.
The respective retry-inclusive maxima are **2 / 3 / 6** calls.

The user-facing controls are `--max-turns` (default **100**), the ~3-hour active
lifetime cap, and a hidden-call cap of `4 × maxTurns + 20`. These bound calls and
lifetime, not provider dollars or tokens: actual cost varies with the model,
context, output, and researcher tool steps.

## Persistence

Goal state is written per workspace:

```text
.opencode/goals/state.json
.opencode/goals/state.json.ledger.jsonl
.opencode/goals/cycles.jsonl
```

Cross-plugin automation admission uses a separate neutral coordination tree:

```text
.opencode/automation-admission/v1/
```

Records are keyed per session, while these three files are shared by every
session in the workspace. Serialized read-merge-write persistence preserves
concurrent sessions. The in-memory map tracks at most 256 sessions, evicting the
oldest non-active entry first; if all 256 are active, adding another pauses and
evicts the oldest active goal while leaving its persisted state recoverable.
Cleared session IDs are tombstoned for seven days to prevent stale resurrection.

Active goals recover as **paused** after an opencode restart; run `/goal resume`
to continue with fresh turn and stall counters. State writes are refused when the
goals directory or state/ledger/cycle-ledger path is an existing symlink or escapes the
project directory. The cycle ledger stores bounded structured evaluator records
(verdict, criteria, diff fingerprint, verify evidence, and audit context) for
incremental criteria stability and stuck-loop detection. Keep `.opencode/goals/` out of git unless a project
intentionally wants local goal history committed.

Plugin diagnostics are written outside the project, under
`$OPENCODE_PLUGIN_DIAGNOSTICS_DIR` (or `$XDG_STATE_HOME/opencode/plugin-diagnostics/`),
as one `goals-<date>-<pid>.jsonl` per process and day. Each file rotates once at
5 MB, and the directory is swept on startup: files older than 14 days, and any
beyond the 20 most recent, are deleted. The current run's file is never pruned.

Admission is root-session scoped, bounded, fail-closed, and ignored by git via
its own exact `.gitignore`. It does not replace the host scheduler or make human
and automation admission atomic: the public host API cannot transact across the
final idle/pending-interaction snapshot and prompt acceptance. Goals holds the
neutral scope lock through the host's short acceptance call, diagnoses this
residual host race, and applies any subsequently observed interaction before
another reservation can succeed. Where the host cannot list outstanding
interactions, the durable event-derived set is the minimum check rather than a
claim of stronger assurance. See
[docs/AUTOMATION-ADMISSION-PROTOCOL.md](docs/AUTOMATION-ADMISSION-PROTOCOL.md)
for the interoperable record and provenance contract.

## Running the tests

```bash
node --test tests/*.test.mjs
```

This is also wired as the package's `test` script, so `bun run test` (or
`npm test`) runs the same command. See [CONTRIBUTING.md](CONTRIBUTING.md) for
the full test suite breakdown (packed-tarball release smoke, zero-token
runtime registration smoke, and the opt-in host-contract smoke), development
setup, and pull request expectations.

## Support and security

Compatibility claims are limited to the exact cells in
[`docs/COMPATIBILITY.md`](docs/COMPATIBILITY.md); the declared package range is
not a promise that every OpenCode 1.x host has been tested.

Use GitHub Issues for public bugs, support requests, and feature proposals:

<https://github.com/mcrescenzo/opencode-goals/issues>

Do **not** post secrets, credentials, private logs, exploit details, sensitive
vulnerability details, or private workspace data in public issues. See
`SECURITY.md` for the current reporting policy, `CONTRIBUTING.md` for pull
request expectations, and `CHANGELOG.md` for release notes.

## Development notes

See [AGENTS.md](AGENTS.md) in this directory for contributor invariants (SDK
contract direction and version compatibility, the hooks the plugin wires,
hidden-agent behavior, and testing expectations).
