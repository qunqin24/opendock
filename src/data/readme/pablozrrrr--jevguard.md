# JevGuard

> **Semantic policy engine for coding agents.**
>
> JevGuard reviews every change an AI coding agent makes against the rules of your
> repository, written in plain Markdown, and reports `PASS`, `WARN`, or `FAIL` per
> rule. It runs in the background for OpenCode and Claude Code, never blocks the
> agent, and never edits your code.

![JevGuard: semantic policy engine for coding agents](https://raw.githubusercontent.com/pablozr/JevGuard/main/27b864b2-3f64-4211-99dd-26764c549d03.png)

JevGuard checks the code an agent just changed against the policies that matter in
your repository. It uses Jev for a narrow semantic judgment per rule, then applies
your local deterministic gate to return `PASS`, `WARN`, or `FAIL`.

| Host | Package | Status |
| --- | --- | --- |
| [OpenCode](https://opencode.ai) | `@pablozrrrr/jevguard` | Available, targets OpenCode `1.18.32` |
| [Claude Code](https://claude.com/claude-code) | `@pablozrrrr/jevguard-claude-code` | Available through this repository's plugin marketplace |
| Codex | — | Planned |

## Quick start

```sh
# 1. Store your Jev key in the OS credential store (shared by both hosts)
bunx --package @pablozrrrr/jevguard jevguard login

# 2a. OpenCode: register the plugin in opencode.json
bunx --package @pablozrrrr/jevguard jevguard install

# 2b. Claude Code: install from the marketplace
claude plugin marketplace add pablozr/JevGuard
claude plugin install jevguard@jevguard
```

Then add your rules to `.jev/rules.md` (in OpenCode, the bundled `jev-init` skill can
bootstrap them) and keep working with your agent as usual. Details are in
[Install](#install) and the [Claude Code guide](./docs/configuration.md#claude-code).

```text
agent completes a turn
        ↓
task + attributed diff + local rules
        ↓
   Jev per rule
        ↓
local policy gate per rule
        ↓
  PASS · WARN · FAIL
```

Not a code generator. Not a prose review bot. Not another static linter.

JevGuard is a semantic linter: it asks whether a specific change violated a
specific policy, and leaves planning, code generation, and correction with the
coding agent.

> [!WARNING]
> JevGuard is in active development. The OpenCode plugin targets OpenCode `1.18.32`
> and the Claude Code plugin is distributed through this repository's marketplace.
> Both evaluate every rule block declared in `.jev/rules.md` plus the `SCOPE-CREEP`
> and `COMPLEXITY` built-ins. Reviews are background and observe-only: they report
> results but never alter the agent context or block a task. When remediation is
> enabled and a review has any `FAIL`, JevGuard drafts a strategy-only proposal; it
> never edits code. The sections below describe the OpenCode plugin; the Claude Code
> plugin's differences are documented in the
> [Claude Code guide](./docs/configuration.md#claude-code).

## Why JevGuard

Traditional linters are excellent at syntax, types, and patterns. They cannot
reliably answer repository-specific questions such as:

- Did a controller start making domain decisions?
- Did this business-rule change arrive without meaningful tests?
- Did the agent solve a small task by introducing an unnecessary abstraction?
- Did a change cross an architectural boundary that this codebase protects?

JevGuard makes those questions versioned, scoped, and machine-actionable.

```md
## ARCH-001

severity: error
scope: backend/**
scope: !backend/generated/**
evidence: code

### Rule

HTTP controllers must not contain business logic.

### Violation

A controller performs domain decisions, calculations, or state mutations directly.

### Allowed

Validation, HTTP mapping and delegation to services.
```

`scope:` may repeat. Each line adds an inclusion glob, and a leading `!` adds an
exclusion, so a path is in scope when it matches at least one inclusion and no
exclusion. `evidence:` chooses which files the rule is evaluated against — `code`
(the default), `docs`, or `any`. Because the default is `code`, prose documentation
(`.md`, `.mdx`, `.txt`) no longer participates in a rule's evidence unless the rule
opts in with `evidence: docs` or `evidence: any`; this is intentional. Config and
data formats (`.json`, `.yaml`, `.toml`, `.xml`, `.csv`, and others) stay in the
`code` class, so config rules keep their coverage.

The rule stays in the repository beside the code it governs. `Allowed` is a real
exception, not a suggestion. JevGuard evaluates it as part of the same rule.

## The contract

JevGuard is built around one non-negotiable idea: review the **change that belongs
to the turn**, not whatever happens to be in the worktree.

```text
user task
   ↓
assistant response
   ↓
attributed patch
   ↓
applicable rules
   ↓
one semantic judgment per rule
```

If complete attributed evidence is unavailable, invalid, or contains a blocked
sensitive file, JevGuard marks the affected rule `UNAVAILABLE`. It never turns
incomplete evidence into a reassuring verdict. Evidence problems are scoped to the
rules they affect: a rule whose applicable files are all safe still runs even when
another rule's evidence is blocked.

Oversized evidence is no longer refused outright. A scoped diff above
`maxDiffLength` is split, in attributed file order, into one slice per file; an
individually oversized file is split into its ordered unified-diff hunks with the file
preamble repeated in every slice. Nothing is truncated, summarized, or dropped: an
unparseable oversized file or an indivisible oversized hunk makes the whole rule
`UNAVAILABLE/OVERSIZED_DIFF`.

Some failures happen before any policy rule is evaluated. If the attributed diff
cannot be built, the review is a single synthetic `UNAVAILABLE` entry with no rule
ID, and neither lane runs. If the turn is attributed but the policy files cannot be
read or validated, the rule lane reports one synthetic `UNAVAILABLE` entry with no
rule ID — it does not invent one result per declared rule — while the built-in batch
still runs against the turn's attributed patch.

## How a review works

For every applicable rule, JevGuard sends Jev one focused yes/no question:

> Does this attributed change violate `ARCH-001`?

Jev returns a Noul: the probability that the answer is yes. JevGuard owns the
policy that translates it into an outcome.

| Rule severity | PASS | WARN | FAIL |
| --- | ---: | ---: | ---: |
| `error` | `< 40%` | `40%–69%` | `≥ 70%` |
| `warning` | `< 60%` | `≥ 60%` | never |

Those thresholds are per repository rule and locally configurable in
`.jev/config.yaml`. Slicing does not change them: each slice is gated independently,
the rule outcome is the highest slice outcome (`FAIL > WARN > PASS`), and the rule's
`violationProbability` is the maximum across its slices. `PASS` requires every planned
slice to pass. A rule may produce at most 16 slices, and slicing may add at most 32
repository-rule Jev calls per turn beyond one per applicable rule; a rule that does not
fit is `UNAVAILABLE/SLICE_LIMIT_EXCEEDED` with no Jev call and later rules still use the
remaining budget. Any failed, blocked, or out-of-range slice makes the whole rule
`UNAVAILABLE`, and no sibling probability is presented as a verdict. The built-ins do
not slice.

JevGuard also runs two product-owned built-ins on every attributed turn,
`SCOPE-CREEP` and `COMPLEXITY`. Both receive the turn's complete, safe attributed
patch with no scope filtering, and both are answered by a **single** Jev request
that carries two independent questions. Each answer is validated on its own, so a
malformed answer fails only its own check.

`SCOPE-CREEP` asks whether the change contains material functional, behavioral,
architectural, dependency, configuration, documentation, or refactoring work the task
did not request and that is not reasonably necessary to complete it. It uses fixed
`error` thresholds (`65%`/`90%`), independent of `.jev/config.yaml`.

`COMPLEXITY` asks whether the change introduces material complexity disproportionate
to, or not reasonably necessary for, completing the task, such as unnecessary
abstractions, layers or indirections without proportional gain, new dependencies
without a clear need, excessive configuration, premature generalization, or structure
materially larger than the problem requires. It is advisory: it warns at `50%` and
can never fail.

The rule lane and the built-in batch are launched together. One shared FIFO
concurrency limit caps the plugin instance at two Jev requests in flight, counting the
built-in batch as a single request. Results join the same aggregate in a fixed order:
rules in source order, then `SCOPE-CREEP`, then `COMPLEXITY`.

Reviews run in the background. The idle event returns as soon as the serialized
attribution step is scheduled; policy reads, Jev calls, and presentation never sit on
the agent's critical path.

## Safe auto-propose remediation

Reviews are observe-only by default: a review never injects feedback into the agent
context, adds a session message, prompts a session, blocks a turn, or changes your
code. A separate, configurable path can turn a review result into a proposal, and it is
delivered entirely by the same server plugin.

When `.jev/config.yaml` enables remediation (it is enabled by default) and a review
contains any `FAIL`, the plugin, after presenting the review, sends one aggregate
proposal request to a hidden `jevguard-proposer` subagent:

- The request aggregates every `FAIL` finding in the review — local `error` rules and
  the `SCOPE-CREEP` built-in — together with the turn's task and its **complete, safe,
  full attributed patch**. `COMPLEXITY` is advisory and never fails, and `warning`
  rules never fail.
- The full attributed patch must pass the same safety policy as the review. If any
  attributed file is blocked or the patch is oversized, the plugin records no proposal
  at all — even when a rule-scoped `FAIL` exists — because there is no complete safe
  evidence to send. It never falls back to a repository or global diff.
- The request is sent in an isolated child session parented to the source session. The
  `jevguard-proposer` subagent has wildcard-deny permissions and wildcard-disabled
  tools, so it cannot call a tool, edit a file, or produce a patch. It returns a
  strategy and one manual apply instruction only.
- `remediation.model` is optional. When set in `.jev/config.yaml`, it selects the
  proposer model; when it is absent, the proposer inherits the host's model.
- A generic toast reports that the proposal is ready in the child session. It carries
  no rule, task, diff, finding, or credential.

The plugin creates at most one proposal per evaluated turn, and the child session is
excluded from review for the plugin lifetime, so a proposal can never recurse or
trigger a second one. A host, model, or toast failure is contained and never changes
the review. A contained proposal failure — an invalid model specifier, a child-session
failure, or a prompt failure — shows a generic error toast and writes one structured
`error` log entry carrying only a typed reason code, never any task, diff, finding,
path, or credential.

The proposer is a strategy step, not an apply step: it never edits code, and nothing
is applied automatically. You read the proposal, copy its manual apply instruction
into your normal coding agent, and apply it there. That apply is an ordinary completed
assistant turn, so the server plugin reviews it normally on the next idle — exactly
like any other turn.

The proposal prompt treats the task, paths, diff, rules, and findings as untrusted
data, and requires a separate explicit confirmation before proposing changes to tests,
configuration, or dependencies. No secret is ever carried, and no payload, task, diff,
or secret is logged.

## Install

Installing `@pablozrrrr/jevguard` does **not** register it with OpenCode by itself.
OpenCode only loads plugins listed in `plugin: [...]` in `opencode.json`, so register
the plugin from the installed CLI:

```sh
# global config: ~/.config/opencode/opencode.json
jevguard install

# project config: ./opencode.json
jevguard install --project
```

The installer asks for confirmation, edits only the `plugin` array, and is
idempotent. It only edits a `plugin` array of plain strings, so OpenCode's
`[["pkg", { "options": {} }]]` tuple form is a known limitation: the installer leaves
the file unchanged and prints the manual snippet instead. If `jevguard` is not on
`PATH`, run it through `bunx`:

```sh
bunx --package @pablozrrrr/jevguard jevguard install
```

The manual alternative is one entry in `opencode.json`:

```json
{ "plugin": ["@pablozrrrr/jevguard"] }
```

OpenCode resolves the package from the npm registry or its cache and loads it on the
next start. Adding the entry only loads the plugin; it does **not** put the
`jevguard` CLI on `PATH` (see [Install the CLI](#install-the-cli)). Restart OpenCode
after changing the plugin list.

> [!IMPORTANT]
> A bare plugin entry resolves only from the npm registry. To run an unreleased
> local build, load the packed tarball as a local artifact plugin instead.

### Build the local artifact

The artifact ships the plugin as a **locally packed tarball** that bundles the
private `@jevguard/core`, `@jevguard/node-infra` and `@jevguard/opencode-adapter`
workspace code, so a clean consumer installs one tarball and never resolves a
workspace link or a private registry package. It also packages the `jevguard-rules` and `jev-init`
skills and their private validators under `skills/<name>/`.

Build the tarball from this repository:

```sh
corepack enable
pnpm install
pnpm artifact:build
pnpm artifact:pack
```

`pnpm artifact:pack` writes `artifacts/pablozrrrr-jevguard-<version>.tgz`. Both
`packages/plugin/dist/` and `artifacts/` are build output and are not committed.

The packed manifest depends only on public runtime packages
(`@inquirer/password`, `@napi-rs/keyring`, `@typesafe-ai/sdk`, `yaml`). Installing
the tarball therefore needs npm registry access for those packages; the artifact
does not vendor them and does not promise an offline install.

### Load the plugin

OpenCode `1.18.32` resolves a **bare** `opencode.json` `plugin` entry from the npm
registry or its cache:

```json
{
  "plugin": ["@pablozrrrr/jevguard"]
}
```

To run an unreleased local build instead, install the packed tarball into the
project's `.opencode` directory and load it through a local plugin shim:

```sh
cd /path/to/consumer/.opencode
bun add /path/to/pablozrrrr-jevguard-<version>.tgz
```

```ts
// .opencode/plugins/jevguard.ts
export { JevGuardPlugin } from "@pablozrrrr/jevguard";
```

OpenCode loads `.opencode/plugins/` with its bundled Bun runtime. The shim runs as
a local plugin module and resolves `@pablozrrrr/jevguard` from
`.opencode/node_modules`. Use either the bare `plugin` entry or the local shim, not
both.

Remediation is built into the same server plugin: the `config` hook registers the
hidden `jevguard-proposer` subagent, so no second entrypoint or shim is needed. The
server plugin reviews and reports turns, and — when remediation is enabled and a review
fails — creates the proposal child session automatically.

### Claude Code

Inside Claude Code:

```text
/plugin marketplace add pablozr/JevGuard
/plugin install jevguard@jevguard
```

The Claude Code plugin reviews each closed unit of work in a detached background
worker, shows the result in the session (status line, transcript line, and a toast on
`FAIL`) without sending it to the model, and records it in the same local history.
Remediation proposals are off by default and are enabled from your user config, never
from the repository. It needs `node` `>=22.13.0`, `npm`, and `git` on `PATH`. See the
[Claude Code guide](./docs/configuration.md#claude-code) for what is reviewed, the
in-session display, and remediation.

### Author rules with the bundled skill

The package ships two OpenCode skills beside the plugin: `jevguard-rules` to author
rules, and `jev-init` to bootstrap a policy where none exists. On startup the plugin's
`config` hook appends the installed skill directories to the host's `skills.paths`, so
the skills are discovered without a manual `opencode.json` entry. Skill discovery is
read at OpenCode startup: restart OpenCode after installing or updating the package so
the skills appear.

`jev-init` runs only when neither `.jev/rules.md` nor `.jev/config.yaml` exists. It
reads a bounded inventory of the repository, keeps rules only from the user's explicit
constraints and strongly evidenced local conventions, records provenance in a preamble,
and previews both candidate files before requiring explicit confirmation naming both
exact paths. Once a policy exists, every rule change belongs to `jevguard-rules`.

Policy content is different. `.jev/rules.md` and `.jev/config.yaml` are read once
per attributed turn, so editing rule text takes effect on the next reviewed turn
without restarting OpenCode. The skill validates a candidate with the same parser
JevGuard uses, requires explicit final confirmation, and replaces `.jev/rules.md`
only after the candidate passes; it never edits `.jev/config.yaml` and never calls
Jev.

### Install the CLI

Loading the plugin does not expose the `jevguard` binary on `PATH`. Run the login
command without a global install:

```sh
bunx --package @pablozrrrr/jevguard jevguard login
```

Or install the package globally so `jevguard` is on `PATH`:

```sh
bun install --global @pablozrrrr/jevguard
jevguard login
```

To run an unreleased local build, install the packed tarball globally instead:

```sh
bun install --global /path/to/pablozrrrr-jevguard-<version>.tgz
jevguard login
```

Known limitations:

- Target host is OpenCode `1.18.32`. Exact `1.18.32` runtime smoke is still
  pending; a local `1.18.28` run worked.
- The plugin and CLI run on Bun, and the packed `jevguard` bin keeps a Bun
  shebang. Install and run the artifact with the Bun runtime.

## Connect Jev

For local use, connect once with the installed command:

```sh
jevguard login
```

Loading the plugin does not put `jevguard` on `PATH`. If it is not installed
globally, run the one-line login instead:

```sh
bunx --package @pablozrrrr/jevguard jevguard login
```

JevGuard stores the key in your operating system's credential store instead of a
repository file or shell history. In CI, provide `TYPESAFE_API_KEY` through the
platform secret manager. See the [security model](./docs/security.md) for details.

```text
JevGuard FAIL
pass 1 · warn 1 · fail 1 · skipped 0 · unavailable 0
```

One toast per turn shows the aggregate outcome and the outcome counts; the
structured log carries every rule's result, its raw violation probability or typed
reason, and its scoped paths. The counts include every entry, including the single
synthetic entry a review-level failure produces.

`PASS`, `WARN`, and `FAIL` are per-rule semantic outcomes. `SKIPPED` means that
rule had no applicable change to evaluate. `UNAVAILABLE` means JevGuard could not
safely or completely evaluate that rule.

## Review history

JevGuard keeps a bounded, local, content-free history of your reviews so you can see
how turns fared without grepping the host log. Every review appends the same safe
structured-log projection plus an ISO 8601 timestamp to one JSON Lines file:

```text
<XDG_DATA_HOME or ~/.local/share>/jevguard/reviews.jsonl
```

The file holds the aggregate counts, each result's rule or check ID, its outcome, and
its typed reason or raw probability — the same allowlist as the structured log. It
never holds a task, diff, prompt, model output, credential, or environment value. It
is local-only, bounded (it rewrites itself once it passes 5 MB, keeping the newest
records), and safe to delete at any time; the next review recreates it.

```sh
# human-readable summary
jevguard report

# the same aggregation as JSON
jevguard report --json
```

The report prints aggregated counts, rule IDs, check IDs, and reason codes only —
never file paths, tasks, diffs, or credentials. A missing or empty history is a
normal empty report, not an error.

### Rule feedback

Tell JevGuard whether a `FAIL` was right. The answer is stored locally and only
feeds the calibration shown by `jevguard report`; it never changes a rule, a
threshold, or what the model returns.

```sh
# unanswered rule FAILs, newest first, numbered
jevguard feedback

# answer one: right = a real violation, wrong = a false alarm
jevguard feedback 1 wrong
```

Numbers stay fixed to the last listing. Built-in checks are not covered. See
[configuration](./docs/configuration.md)
for details.

## Diagnose your setup

`jevguard doctor` checks your local setup without touching the network or changing
anything:

```sh
jevguard doctor
jevguard doctor --json
```

It reports `OK`, `WARN` or `FAIL` for the credential source, `.jev/rules.md`,
`.jev/config.yaml` and the OpenCode plugin registration, each with a hint when
something is wrong. It never prints the API key or any part of it — only whether the
key comes from the OS credential store or the `TYPESAFE_API_KEY` override. It exits
`0` unless a check fails (warnings are fine) and `1` when one does. The project root is
the first parent directory of the current directory that contains `.git`, or the
current directory when there is none. It does not check Claude Code installs yet.

## Check rules on demand

`jevguard rules check` runs your repository rules against a diff you provide, without
waiting for an agent turn:

```sh
git diff --cached | jevguard rules check --diff - --task "Add rate limiting to login"
jevguard rules check --diff change.diff --rule ARCH-001 --json
```

It evaluates the repository rules over the diff with the same scope filtering,
evidence safety, slicing and gate thresholds as a review, but runs no built-in checks,
starts no remediation and writes nothing to the review history. The input must be
plain `git diff` output (or a plain `---`/`+++` unified diff) with `a/` and `b/`
prefixes; anything else is refused whole, never partly evaluated (see
[configuration](./docs/configuration.md#cli-diagnostics-and-on-demand-rule-checks)).
`--task` is optional; without it a neutral default task is sent. It prints each rule's outcome, probability, severity and
scoped paths, never the task or the diff. Exit codes: `0` completed with no `FAIL` and
no `UNAVAILABLE`; `1` at least one rule `FAIL`ed; `2` it could not check completely
(invalid arguments, an unreadable or unsupported diff, an unknown `--rule`, or an
`UNAVAILABLE` result). See [configuration](./docs/configuration.md#cli-diagnostics-and-on-demand-rule-checks)
for the full contract.

## Implemented behavior

The current release implements the full local review path:

- OpenCode V1 plugin loads.
- A completed assistant response is detected.
- The direct parent user task and assistant-attributed diff are acquired.
- Every `## <RULE-ID>` block in `.jev/rules.md` is parsed in source order. Each
  block is validated independently, so one invalid block does not suppress its
  valid siblings, and every occurrence of a duplicated ID is invalid.
- Each valid rule is processed independently. Its complete scoped evidence is planned
  locally, then every planned slice across all rules is dispatched through one batched
  Jev entry that resolves the credential once and uses bounded concurrency; each slice
  asks one Noul. The rule result is the deterministic maximum of its slice judgments,
  and a fitting rule still issues exactly one call. The rule asks Jev only when the
  gate config is valid, the rule is applicable, and its scoped evidence is complete and
  safe; it produces one typed violation probability or an operational outcome.
- A failure before rule evaluation — no attributed diff, unreadable policy files, or
  a missing `.jev/rules.md` — is reported by the rule lane as one synthetic
  `UNAVAILABLE` entry with no rule ID, not one result per declared rule. When the
  turn itself is attributed, the built-in batch still runs.
- The product-owned `SCOPE-CREEP` built-in runs on every attributed turn over the
  turn's complete, safe attributed patch, with fixed `error` thresholds
  (`0.65`/`0.90`) and no scope filtering. It can produce `PASS`, `WARN`, or `FAIL`.
- The product-owned `COMPLEXITY` built-in runs on every attributed turn over the same
  complete, safe attributed patch. It uses a fixed advisory threshold of `0.50`,
  independent of `.jev/config.yaml`, and can produce `PASS` or `WARN` but never
  `FAIL`.
- Both built-ins are sent as one batch request with two independent named answers.
  One malformed or missing answer fails only its own check; the valid sibling still
  gates. A failed or malformed batch envelope makes both checks `UNAVAILABLE`.
- The built-in batch runs concurrently with the rule lane. The rule lane dispatches
  one batched request for all of the turn's planned slices with a bounded adapter
  concurrency cap of four; the built-in batch keeps its own single request. One shared
  FIFO concurrency limit allows at most two Jev entries in flight across the plugin
  instance, counting the rule batch and the built-in batch as one entry each. With no
  attributed patch a built-in is `SKIPPED`; blocked or oversized evidence is
  `UNAVAILABLE`; a rule, policy-load, or config failure never suppresses the batch, and
  one built-in's answer never suppresses the other.
- Reviews run in the background. The idle event resolves as soon as the serialized
  attribution step is scheduled, so policy reads, Jev calls, and presentation do not
  block the agent.
- The local gate maps each rule to `PASS`, `WARN`, or `FAIL`; a rule with no
  applicable scope is `SKIPPED`, and a rule that cannot be safely evaluated is
  `UNAVAILABLE`.
- One aggregate TUI toast and one structured log entry report the turn. The log
  carries every entry's outcome, raw probability, or reason, including the built-in
  results and the synthetic review-level entry when there is one. The fixed result
  order is rules in source order, then `SCOPE-CREEP`, then `COMPLEXITY`.
- After presentation, when remediation is enabled and the review contains any `FAIL`,
  at most one aggregate proposal request is sent to the hidden `jevguard-proposer`
  subagent in an isolated child session parented to the source session, and a generic
  toast reports that the proposal is ready. The request carries every `FAIL` finding
  (local `error` rules and the `SCOPE-CREEP` built-in), the task, and the complete,
  safe, full attributed patch; a blocked or oversized patch records no proposal. A
  notifier or host failure never affects the review, presentation, or later turns.

The review itself injects no feedback into the agent session, prompts no session, and
blocks no task. The proposal above is a strategy only; nothing is applied, and
the user copies its manual apply instruction into their normal coding agent, whose
ordinary turn is reviewed normally.

## Roadmap

Implemented so far: multi-rule reviews, the `SCOPE-CREEP` and `COMPLEXITY`
built-ins, the `jev-init` policy bootstrap, local review history with feedback and
calibration (`jevguard report`, `jevguard feedback`), on-demand checks
(`jevguard rules check`, `jevguard doctor`), and the Claude Code plugin. Planned work:

```text
V0.3  Remaining built-in semantic check: test adequacy        planned
V0.4  jev-init: evidence-based policy bootstrap               done
V0.5  On-demand evidence and explanations                     partial (rules check)
V0.6  Opt-in, bounded auto-remediation                        planned
V0.7  Observe / enforce / remediate modes                     planned
V0.8  Rule packs                                              planned
V0.9  Local feedback and calibration                          done
V1    Claude Code and Codex adapters                          Claude Code done, Codex planned
```

The auto-propose slice is implemented: after a review with a `FAIL`, an enabled
configuration asks the hidden `jevguard-proposer` subagent for a strategy in an
isolated child session, and never applies a change. The `V0.6` entry remains the
future, unattended corrective loop; the proposer is a bounded, strategy-only step, not
that loop.

The `V0.4` `jev-init` skill is implemented: when no policy exists it bootstraps
`.jev/rules.md` and `.jev/config.yaml` from the user's explicit constraints and
strongly evidenced local conventions, records each rule's provenance, and writes both
files only after validating the confirmed candidates.

CI and pull-request policy review come after V1, using the same versioned rules.

## Architecture

JevGuard is a pnpm TypeScript monorepo. The core has no dependency on OpenCode,
Claude Code, or their runtimes, which keeps the evaluation model portable across
host adapters.

```text
packages/
├── core/                 domain, policy, evaluation, gate
├── claude-code-adapter/  Claude Code tool-attributed units, hook and review worker
├── claude-code-plugin/   Claude Code plugin composition and artifact
├── node-infra/           shared Node infra: credentials, Jev transport, policy, history
├── opencode-adapter/     OpenCode attribution and presentation
├── plugin/               OpenCode composition root and CLI
└── testkit/              fixtures and contract helpers

plugin → opencode-adapter → node-infra → core
plugin ────────────────────→ node-infra
claude-code-plugin → claude-code-adapter → node-infra → core
testkit ──────────────────────────────→ core
```

## Status

The multi-rule, multi-built-in, background and observe-only review is implemented. It
loads in OpenCode, attributes one completed turn, parses every rule block in
`.jev/rules.md`, asks Jev once per applicable rule and once per built-in batch, runs
the `SCOPE-CREEP`
and `COMPLEXITY` built-ins over the complete attributed patch behind one shared
concurrency limit, applies the local gate to each, and presents one aggregate result
as a transient TUI toast and a structured log entry.

The local, private tarball (`pnpm artifact:build`, `pnpm artifact:pack`) packages
that slice so a clean consumer can install it without workspace links.

OpenCode sees only transient toasts, structured logs, and — when remediation is
enabled and a review has a `FAIL` — one proposal child session and a generic toast.
The review does not inject anything into the agent context, prompt the source session,
add session messages, or block a task. The proposal is a separate, configurable,
strategy-only workflow delivered by the server plugin; it never edits code and never
applies a change. Real-host validation against exact OpenCode `1.18.32` is still
pending.

The Claude Code plugin reuses the same core, policy files, gate, and local history. It
reviews closed units of work in a detached worker and shows results in the session
without sending them to the model; see the
[Claude Code guide](./docs/configuration.md#claude-code).

## Development

Requirements: Node.js `>=22.13.0`, pnpm `10.33.2` (via Corepack), and the Bun
runtime for the CLI and OpenCode plugin loading.

```sh
corepack enable
pnpm install
pnpm typecheck
pnpm test
```

Use `pnpm check` to run format, lint, typecheck, and tests in sequence. See
[CONTRIBUTING.md](./CONTRIBUTING.md) for the full contribution workflow.

## Documentation

- [Configuration reference](./docs/configuration.md)
- [Security model](./docs/security.md)
- [Contributing](./CONTRIBUTING.md)
- [Agent instructions](./AGENTS.md)

## License

MIT — see [LICENSE](./LICENSE).
