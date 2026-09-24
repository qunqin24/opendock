# JevGuard

> **Semantic policy engine for coding agents.**

![JevGuard: semantic policy engine for coding agents](https://raw.githubusercontent.com/pablozr/JevGuard/main/27b864b2-3f64-4211-99dd-26764c549d03.png)

JevGuard checks the code an agent just changed against the policies that matter in
your repository. It uses Jev for a narrow semantic judgment per rule, then applies
your local deterministic gate to return `PASS`, `WARN`, or `FAIL`.

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
> JevGuard is in active development. The current release targets OpenCode `1.18.32`
> and evaluates every rule block declared in `.jev/rules.md` plus the `SCOPE-CREEP`
> and `COMPLEXITY` built-ins. Reviews are background and observe-only: they report
> results but never alter the agent context or block a task. When remediation is
> enabled and a review has any `FAIL`, the plugin asks a hidden `jevguard-proposer`
> subagent for a proposal in an isolated child session and shows a generic toast; the
> proposer never edits code.

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

### Rule

HTTP controllers must not contain business logic.

### Violation

A controller performs domain decisions, calculations, or state mutations directly.

### Allowed

Validation, HTTP mapping and delegation to services.
```

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

If complete attributed evidence is unavailable, too large, invalid, or contains a
blocked sensitive file, JevGuard marks the affected rule `UNAVAILABLE`. It never
turns incomplete evidence into a reassuring verdict. Evidence problems are scoped
to the rules they affect: a rule whose applicable files are all safe still runs
even when another rule's evidence is blocked.

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
`.jev/config.yaml`.

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
- A generic toast reports that the proposal is ready in the child session. It carries
  no rule, task, diff, finding, or credential.

The plugin creates at most one proposal per evaluated turn, and the child session is
excluded from review for the plugin lifetime, so a proposal can never recurse or
trigger a second one. A host, model, or toast failure is contained and never changes
the review.

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

Once `@pablozrrrr/jevguard` is published to npm, the intended install is one line in
`opencode.json`:

```json
{ "plugin": ["@pablozrrrr/jevguard"] }
```

OpenCode then resolves the package from the npm registry or its cache and loads it
on the next start. Adding the entry only loads the plugin; it does **not** put the
`jevguard` CLI on `PATH` (see [Install the CLI](#install-the-cli)). Restart
OpenCode after changing the plugin list.

> [!IMPORTANT]
> `@pablozrrrr/jevguard` is **not published to npm yet**. The one-line entry above is
> future behavior and will not resolve until the package is released. Before
> publication, load the plugin as a local artifact plugin instead.

### Build the local artifact

The artifact ships the plugin as a **locally packed tarball** that bundles the
private `@jevguard/core` and `@jevguard/opencode-adapter` workspace code, so a
clean consumer installs one tarball and never resolves a workspace link or a
private registry package. It also packages the `jevguard-rules` skill and its
private rule validator under `skills/jevguard-rules/`.

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

### Load the local plugin before publication

OpenCode `1.18.32` resolves a **bare** `opencode.json` `plugin` entry from the npm
registry or its cache, not from the consumer's `node_modules`. Until the package is
published, install the tarball into the project's `.opencode` directory and load it
through a local plugin shim:

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
`.opencode/node_modules`. Do **not** add `@pablozrrrr/jevguard` to the `opencode.json`
`plugin` list before publication; that bare entry does not resolve locally.

Remediation is built into the same server plugin: the `config` hook registers the
hidden `jevguard-proposer` subagent, so no second entrypoint or shim is needed. The
server plugin reviews and reports turns, and — when remediation is enabled and a review
fails — creates the proposal child session automatically.

### Author rules with the bundled skill

The package ships a `jevguard-rules` OpenCode skill beside the plugin. On startup
the plugin's `config` hook appends the installed skill directory to the host's
`skills.paths`, so the skill is discovered without a manual `opencode.json` entry.
Skill discovery is read at OpenCode startup: restart OpenCode after installing or
updating the package so the skill appears.

Policy content is different. `.jev/rules.md` and `.jev/config.yaml` are read once
per attributed turn, so editing rule text takes effect on the next reviewed turn
without restarting OpenCode. The skill validates a candidate with the same parser
JevGuard uses, requires explicit final confirmation, and replaces `.jev/rules.md`
only after the candidate passes; it never edits `.jev/config.yaml` and never calls
Jev.

### Install the CLI

Loading the plugin does not expose the `jevguard` binary on `PATH`. Once the
package is published, run the login command without a global install:

```sh
bunx --package @pablozrrrr/jevguard jevguard login
```

Or install the package globally so `jevguard` is on `PATH`:

```sh
bun install --global @pablozrrrr/jevguard
jevguard login
```

Until the package is published, install the local tarball globally instead:

```sh
bun install --global /path/to/pablozrrrr-jevguard-<version>.tgz
jevguard login
```

Known limitations:

- `@pablozrrrr/jevguard` has no registry release yet, so the one-line `opencode.json`
  plugin entry does not resolve until the package is published.
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

## Implemented behavior

The current release implements the full local review path:

- OpenCode V1 plugin loads.
- A completed assistant response is detected.
- The direct parent user task and assistant-attributed diff are acquired.
- Every `## <RULE-ID>` block in `.jev/rules.md` is parsed in source order. Each
  block is validated independently, so one invalid block does not suppress its
  valid siblings, and every occurrence of a duplicated ID is invalid.
- Each valid rule is processed independently. It asks Jev at most once, and only
  when the gate config is valid, the rule is applicable, and its scoped evidence is
  complete and safe; it produces one typed violation probability or an operational
  outcome.
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
- The built-in batch runs concurrently with the sequential rule lane. One shared FIFO
  concurrency limit allows at most two Jev requests in flight across the plugin
  instance, counting the batch as one request. With no attributed patch a built-in is
  `SKIPPED`; blocked or oversized evidence is `UNAVAILABLE`; a rule, policy-load, or
  config failure never suppresses the batch, and one built-in's answer never
  suppresses the other.
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

The multi-rule, scope-creep, and complexity slices are implemented. Planned work
beyond them:

```text
V0.3  Remaining built-in semantic check: test adequacy
  ↓
V0.4  jev-init: evidence-based policy bootstrap
  ↓
V0.5  On-demand evidence and explanations
  ↓
V0.6  Opt-in, bounded auto-remediation
  ↓
V0.7  Observe / enforce / remediate modes
  ↓
V0.8  Rule packs
  ↓
V0.9  Local feedback and calibration
  ↓
V1    Claude Code and Codex adapters
```

The auto-propose slice is implemented: after a review with a `FAIL`, an enabled
configuration asks the hidden `jevguard-proposer` subagent for a strategy in an
isolated child session, and never applies a change. The `V0.6` entry remains the
future, unattended corrective loop; the proposer is a bounded, strategy-only step, not
that loop.

CI and pull-request policy review come after V1, using the same versioned rules.

## Architecture

JevGuard is a pnpm TypeScript monorepo. The core has no dependency on OpenCode or
its runtime, which keeps the evaluation model portable to future adapters.

```text
packages/
├── core/                 domain, policy, evaluation, gate
├── opencode-adapter/     OpenCode attribution and presentation
├── plugin/               OpenCode composition root and CLI
└── testkit/              fixtures and contract helpers

plugin → opencode-adapter → core
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
