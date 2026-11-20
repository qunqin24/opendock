# opencode-dev-framework

[![Listed on dsh-plugin.org](https://dsh-plugin.org/badges/listed.svg)](https://dsh-plugin.org/plugins/jwitmann/opencode-dev-framework) [![npm version](https://img.shields.io/npm/v/opencode-dev-framework.svg)](https://www.npmjs.com/package/opencode-dev-framework) [![CI](https://github.com/jwitmann/opencode-dev-framework/actions/workflows/ci.yml/badge.svg)](https://github.com/jwitmann/opencode-dev-framework/actions) [![License: MIT](https://img.shields.io/npm/l/opencode-dev-framework.svg)](https://github.com/jwitmann/opencode-dev-framework/blob/main/LICENSE)

AI agents can say they're done without proving it. This plugin replaces
assertion with evidence: guardrails, per-edit formatting and lint feedback,
a completion gate that runs your real checks, and verified goals that require
a tool-result PASS on the final tree. Exit codes don't negotiate.

One shared enforcement core powers native adapters for
[OpenCode](https://opencode.ai) and [DSH](https://www.deepseek.com/en/harness/)
(DeepSeek Harness, via Cordis), with
the same config, profiles, rules, and gates on both.

Inspired by
[anticomputer/dev-framework](https://github.com/anticomputer/dev-framework),
which supports Copilot CLI, Claude Code, and Codex CLI; this is an independent
implementation. DSH guide: [`docs/user/dsh.md`](docs/user/dsh.md).

## Quickstart

Five minutes from zero to your first gated session.

### 1. Install the plugin

**On OpenCode:**

Requires OpenCode `v2.x` (tested on `v2.0.26` and `v2.2.0`).

```bash
opencode plugin add opencode-dev-framework
```

Or declare it in `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-dev-framework"]
}
```

**On DSH:**

```bash
dsh plugin --profile <name> add opencode-dev-framework
df install-dsh --profile <name>  # preset seam + verification
```

Full DSH reference: [`docs/user/dsh.md`](docs/user/dsh.md).

### 2. Init your project (same on both harnesses)

In any project, run:

```text
/df-init
```

It scaffolds the templates, writes a detected config, trial-runs it, and
hands your session agent a brief — what was detected, what passed, Makefile
targets worth mapping to wrappers, at most 3 open questions. The agent
resolves what it can, asks only genuinely user-only questions, and ends with
a config + `hardening.md` draft for your review. Budget ~5 minutes,
review-only at the end; imperfections assumed, manual always possible.

Prefer a shell? Same thing non-interactively — for CI, dotfiles, and
scripted runs (add `--dsh` on DSH so the host-visible skill mirror is
scaffolded too):

```bash
npx df init [--dsh]
```

Conflicts need `--overwrite-existing` or `--skip-existing` — everything
else is under `npx df init --help`.

On DSH, run `dsh` from the project root (or export `ODF_WORKDIR`), and
accept template drift via `df-update` if the session reports any.

Then ask the agent for a small edit. You will see the plugin working: the
edit is checked against guardrails before it lands, your linter runs on the
edited file, and when the session goes idle the completion gate runs your
typecheck/tests. `/df-status` shows the live state at any time. Start with
`profile: advisory` if you want to observe before enforcing.

## Local development

From a checkout — the contributor loop. Build once, then wire the profile
directly at the built file (no registry needed):

```bash
npm run build
df install-dsh --profile <name> --dist /path/to/opencode-dev-framework/dist/adapters/dsh/index.js
```

Rebuild after every source change; rerun `df install-dsh` any time
(it is idempotent outside its managed block). The full contributor
contract — validation commands, commit policy, never-push rule — is
[`AGENTS.md`](AGENTS.md).

## Harness differences

Same core, same config, same profiles — different wiring where the hosts
differ. Neither harness is the "real" one; each is stronger somewhere:

| Area | OpenCode | DSH |
| ---- | -------- | --- |
| Completion gate | Synthetic continuation at the idle boundary (re-prompt round-trip) | **Blocks termination pre-terminal; failure work continues in the same turn** |
| Per-edit lint | Logged against the landed edit | **Fails the tool call (`block`) — agent retries same turn** |
| Guard `warn` | Logged (advisory never blocks) | Logged, or **prompts the human as `ask`** when the `approval` seam is injected |
| Redirect targets (`a > file`) | Not guard-checked | **Guard-checked** (wider than OpenCode) |
| denial identity | Reason text | Reason text + structured `{name, code}` |
| Skills | `.opencode/skills` (native) | `.dsh/skills` (installed by `df-init`, kept current by `df-update`) |
| Reviewer agents | `.opencode/agents` specialists run as subagents | **Adapter-dispatched DSH children on review-blocks** (one per kind; read-only preset where the registry exists; findings fold into the steer; customize via `.dev-framework/agents/`); inline steer when the seam is absent |
| Goals | `/df-goal` wraps native `/goal` | `df-goal` creates the host goal with the same verification contract |
| Install | One command (`opencode plugin add`) | `dsh plugin add` + `df install-dsh` (bundle auto-wires the base entry) |
| Review UI | Instant TUI modals, never feed the LLM | Host commands returning text |

Bold marks where DSH currently enforces harder — the host exposes
pre-terminal hooks, tool-call blocking, and human approval, so the
same verdict bites earlier and louder there. OpenCode keeps the edge
in install simplicity and instant review UI; both run the identical
gate contract (typecheck, tests, acceptance, review artifact,
`max_blocks` budgeting).

Identical on both: pre-execute deny hardness, pre-flight ordering and
semantics, block budgeting, `protect_off` scope, and all eight
`df-*`/`dev_framework_*` command and tool names. Details:
[`docs/user/enforcement.md`](docs/user/enforcement.md) (OpenCode),
[`docs/user/dsh.md`](docs/user/dsh.md) (DSH).

## What it does

- **Constitution injection.** Adds a project quality bar to the system prompt
  at session start (bundled default, overridable per project).
- **Guardrails.** Blocks or warns on protected paths (`.env`, vendored
  code, your own globs) and dangerous shell commands (`git push`, `rm -rf`).
- **Per-edit lint.** Runs your linter on each edited file. On OpenCode
  the result is logged against the landed edit; on DSH a finding fails
  the tool call so the agent retries clean in the same turn.
- **Completion gate.** At the would-go-idle boundary, runs typecheck, tests,
  acceptance checks, and (optionally) lint on changed files — plus a required
  substantive peer-review artifact in `standard`/`strict` (length floors, no
  template checkboxes, written after the latest session edit). On OpenCode, failures steer the session back via a
  synthetic continuation, bounded by `gate.max_blocks` (fewer when
  the failure repeats with no new edits — the gate stands down early on
  zero progress). On DSH the same verdict runs pre-terminal in the same
  turn — no re-prompt round-trip.
- **Verified goals (`/df-goal`).** Wraps a task in native `/goal` with a
  verification contract the reviewer weighs as evidence.
- **Pre-flight gate (optional).** Denies edits until the agent records
  required upfront research.
- **Custom tools + CLI.** `dev_framework_*` tools for in-agent use;
  `df init [--dsh] / profile / status / version / install-dsh --profile <name>`
  from the shell (children may not invoke gate tools — deny + redirect).

## Minimal configuration

Create `.dev-framework.yml` in your project root (the legacy
`.opencode-dev-framework.yml` name is still read when no neutral-named
file exists):

```yaml
profile: standard

commands:
  typecheck: "npm run typecheck"
  test: "npm test"
```

Full reference (all keys, acceptance checks, pre-flight, rule overrides):
[`docs/user/configuration.md`](docs/user/configuration.md). Copy-paste
starters: [`examples/go-service/`](examples/go-service/).

## How it fits together

Every session runs the same loop — constitution, guardrails, lint, gate —
whether or not it starts under `/df-goal`. A goal just wraps that loop in
native verification. The diagram below shows the OpenCode wiring (idle
synthetic continuation); on DSH the same verdict bites earlier — the
pre-terminal completion block, same-turn lint `block`s, and dispatched
reviewers above all run inside the turn instead of round-tripping through it:

```text
                        user prompt
                  (plain or /df-goal plan)
                                |
                                v
                       agent implements
                                |
                                v
                       tool.execute.before
                        /                \
                     allow                deny: protected / dangerous / pre-flight
                       |                                |
                       v                                v
                   edit lands                 BLOCKED before landing
                       |
                       v
           per-edit lint + change tracker
                /                         \
               v                           v
agent runs dev_framework_verify        session idle
               |                               |
               v                               v
            verdict               completion gate (same full contract)
             /    \                     |             |               |                    |
          PASS    FAIL                 PASS    within max_blocks   past max_blocks   identical x3, no new edits
            |       |                   |             |               |                    |
            v       v                   v             v               v                    v
      gate green   loops back         done     synthetic          STAND DOWN (honest unmet report)
      (in a goal:  to agent                        continuation
       evidence     implements                            |
       into /goal)                                        v
                                                 loops back to agent implements

wrappers (dotted lines in the diagram version):
  /df-goal plan (optional) ── delegates once, appends contract ──> native /goal (owns objective + review)
  native /goal ── wraps the loop, drives turns ──> agent implements
```

The diagram version of this flow (rendered on GitHub) lives in
[`docs/user/enforcement.md`](docs/user/enforcement.md#flow) — update both
together.

## Profiles

| Profile    | Guardrails | Gate failures | Lint on edit | Pre-flight | Review required | Notes |
| ---------- | ---------- | ------------- | ------------ | ---------- | --------------- | ----- |
| `off`      | disabled   | not reported  | no           | no         | no              | Plugin registers no hooks at all. |
| `advisory` | warn       | warn          | yes          | warn only  | warned, not blocked | Nothing blocks; everything is logged. |
| `standard` | deny       | error         | yes          | deny edits | blocks completion | The default when a config file exists. |
| `strict`   | deny       | error         | yes          | deny edits | blocks completion | Also lints changed files in the gate. |

How each layer is enforced, and what it honestly cannot do:
[`docs/user/enforcement.md`](docs/user/enforcement.md).

## Commands

| Command | What it does |
| ------- | -------------- |
| `/df-status` | Instant modal: profile, guardrails, gate, configured commands. |
| `/df-runtime` | Instant modal: plugin version + live hook/gate runtime state. |
| `/df-help` | Instant modal: lists the dev-framework commands. |
| `/df-profile` | Instant modal picker (or `/df-profile <name>`): switches profile now, written to config. |
| `/df-verify` | Runs the verification suite manually; pass/fail summary in a modal. |
| `/df-init` | Server-side command: scaffolds templates, writes the detected config, trial-runs it, hands the brief to the agent. |
| `/df-update` | Server-side command: diffs installed templates against shipped, refresh/add each with user approval (detection only, never writes). Drift is also mentioned once at session startup. |
| `/df-goal <objective>` | Server-side command: starts a **verified** native goal (requires native `/goal`, a blocking profile, and at least one real check). |

The TUI commands open instantly and never feed the LLM; `/df-init`,
`/df-update`, and `/df-goal` are server-side and drive the session. Same
eight names on DSH, where they run as host commands returning text instead
of modals. Full reference:
[`docs/user/commands.md`](docs/user/commands.md).

## Limitations (short version)

### Both harnesses

- Completion enforcement is bounded by `gate.max_blocks` (and stands down
  earlier after repeated failures with no new edits). Stand-down is loud,
  and you can always close the session; this is not an unlimited trap.
- **Pre-flight and guardrail denials are pre-edit hard blocks**, distinct
  from the bounded completion mechanisms below.
- A cached pass never survives a restart — after a restart the gate
  always re-verifies the final tree from scratch.
- Formatting and linting stay with your project tooling — the framework
  does not reimplement them.

### OpenCode

- A failed completion gate admits a synthetic continuation at the idle
  boundary. A genuine pre-stop veto was proposed upstream
  ([`anomalyco/opencode#54487`](https://github.com/anomalyco/opencode/pull/54487),
  closed unmerged) — restoration is tracked in `docs/plans/08-notes.md`
  if the hook ever lands.
- Guardrails add to OpenCode permissions; they never replace them.
  Formatting is OpenCode core's job, not the plugin's.

### DSH

- In `standard`/`strict`, a failed completion gate blocks termination
  pre-terminal and enqueues required same-turn work until pass or stand-down.
- After a restart, all prior gate state is unknown (block budget
  included) — the gate re-verifies from scratch. `df-status` reports
  continuity per session (`clean`, `resumed after interruption`, or
  `unknown`).
- Human approval prompts, reviewer dispatch, and the read-only reviewer
  preset depend on services provided by the DSH profile. Missing optional
  services disable only their enhancement; `df-status` reports the seams.
  `df install-dsh` handles the profile-dependent preset wiring.

Full story: [`docs/user/enforcement.md`](docs/user/enforcement.md)
(OpenCode), [`docs/user/dsh.md`](docs/user/dsh.md) (DSH).

## Troubleshooting

Duplicate plugin IDs, stale npm cache, TUI not loading, version matrix:
[`docs/user/troubleshooting.md`](docs/user/troubleshooting.md).

## Contributing

`AGENTS.md` is the canonical contributor contract. Build/test commands and
the release path: [`docs/dev/contributing.md`](docs/dev/contributing.md).

## Disclaimer

This plugin changes how an AI agent behaves in your repository. Review the
constitution, protected paths, and gate commands before enabling the
`standard` or `strict` profiles, and start with `advisory` if you want to
observe behavior without enforcement.

## License

MIT
