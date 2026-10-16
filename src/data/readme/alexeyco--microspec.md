> [!IMPORTANT]
> This repository is frozen. Why reinvent the wheel when
> [`@alexeyco/opencode-openspec`](https://github.com/alexeyco/opencode-openspec) already does
> all of this — and better: use that package instead.

# @alexeyco/microspec

Task Contract: a task-scoped Micro-SDD flow for OpenCode and Pi — `/microspec.brief` produces one executable `TASK.md`, `/microspec.execute` runs it through parallel subagent waves.

<p align="center">
  <img src="docs/gallery/flow.svg" alt="Three bold signal dots converge into a large TASK.md card marked ready, which fans out into three thick parallel wave bars that converge on a green verified-done checkmark; captions /microspec.brief and /microspec.execute" width="720">
</p>

## What is Task Contract

Task Contract is a lightweight, task-scoped application of Micro-SDD.
It turns a user request into one executable TASK.md with explicit scope, non-goals, Given/When/Then acceptance criteria, a dependency-aware checklist, subagent assignments, and evidence-backed completion.

## Why

- **Subagent-strict flow.** The orchestrator dispatches, never implements — all real work is done by the plugin's own subagents (nine roles, model-agnostic, defined in `agents/*.md`).
- **Parallel waves wherever dependencies allow.** Independent plan steps run in a single batch; dependent steps wait for their predecessors. No unnecessary serialization.
- **Contract-enforced TASK.md.** Every draft passes the `microspec-critic` loop (up to 3 rounds) AND the mechanical `microspec_validate_task` gate (core validator) before approval. The contract is mechanical, not prompt-hoped.
- **Evidence-backed done.** No completion without verifier `PASS` — each acceptance criterion is checked by actually executing the Given/When/Then, with the decisive command and output recorded in `Result`.
- **One plugin, two hosts.** OpenCode v2 and Pi share the same `core/`, the same `agents/*.md` (single source of truth), and the same skills. Roles are model-agnostic and inherit the session model.

## What you get

### Commands

| Command                                                 | Purpose                                                            |
| ------------------------------------------------------- | ------------------------------------------------------------------ |
| [/microspec.brief](skills/microspec-brief/SKILL.md)     | Interview the user, research the codebase, produce TASK.md         |
| [/microspec.execute](skills/microspec-execute/SKILL.md) | Run TASK.md through dependency-ordered parallel subagent waves     |
| [/microspec.retro](skills/microspec-retro/SKILL.md)     | Read-only retrospective on the last run; ranked findings, no edits |

### Tools

| Tool                                        | Purpose                                                                                                                                     |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| [microspec_validate_task](core/contract.ts) | Mechanical TASK.md contract validation; registered in [opencode/index.ts](opencode/index.ts) and [pi/validate-tool.ts](pi/validate-tool.ts) |

#### microspec_task

While [microspec_task](pi/task-tool.ts) runs a role subagent in Pi, it streams a live trace of the child's work: one line per child tool call with the tool name, a truncated argument, the duration, and an `ok`/`FAIL` status. The window shows the last 8 lines, with earlier calls collapsed into a leading `… N more` counter, and while the child writes text instead of calling a tool, a `writing report… (N chars)` tail tracks the report's progress. The trace is drawn in the interactive transcript and reproduced in the HTML export; JSON and print modes have no UI and do not draw it.

### Roles

| Role                                                       | Mission                                                                     |
| ---------------------------------------------------------- | --------------------------------------------------------------------------- |
| [microspec-researcher](agents/microspec-researcher.md)     | Explore repo and docs for verifiable facts; read-only                       |
| [microspec-planner](agents/microspec-planner.md)           | Decompose goal and criteria into a dependency-aware Plan; re-plan dead-ends |
| [microspec-drafter](agents/microspec-drafter.md)           | Turn briefing + research into a complete TASK.md draft                      |
| [microspec-critic](agents/microspec-critic.md)             | Check a draft against the contract; CLEAN or NEEDS-FIX                      |
| [microspec-implementer](agents/microspec-implementer.md)   | Execute exactly one plan step; obey Guardrails verbatim                     |
| [microspec-verifier](agents/microspec-verifier.md)         | Verify acceptance criteria by executing Given/When/Then                     |
| [microspec-reviewer](agents/microspec-reviewer.md)         | Critique the diff against TASK.md Goal, Guardrails, and AC                  |
| [microspec-docwriter](agents/microspec-docwriter.md)       | Write and update documentation to match implemented changes                 |
| [microspec-retrospector](agents/microspec-retrospector.md) | Analyze one run's evidence; report ranked improvements; read-only           |

Full catalog with report formats and dispatch mechanics: [docs/agents.md](docs/agents.md).

### Skills

| Skill                                                  | Routing                                                                                     |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| [microspec-brief](skills/microspec-brief/SKILL.md)     | Briefing flow — scope check → interview → playback gate → plan + draft → critique → TASK.md |
| [microspec-execute](skills/microspec-execute/SKILL.md) | Execution flow — waves → verification → review → stop/guardrail handling → Result           |
| [microspec-retro](skills/microspec-retro/SKILL.md)     | Retrospective — evidence bundle → ranked findings                                           |
| [task-contract](skills/task-contract/SKILL.md)         | Canonical TASK.md contract specification                                                    |

## Usage

1. Run `/microspec.brief <request>` — the plugin checks scope (multi-capability requests get a capability map and build order, one per run), then interviews you. Every question carries a recommended answer, including one that always asks what happens at the end — commit, commit and push, or leave the tree uncommitted; rounds stay on the frontier (at most 5 questions per round); a coverage scan marks each contract section `Clear` / `Partial` / `Missing`. Dispatches `microspec-researcher` subagents in parallel for unknown areas.
2. After the interview, a playback gate restates intent (`Outcome` / `Why now` / `Success` / `Constraints` / `Out of scope`) — confirmed before `microspec-planner` produces a dependency-aware Plan skeleton, then `microspec-drafter` writes the draft.
3. `microspec-critic` checks the draft against mechanical + drafting-level rules (up to 3 rounds). The orchestrator writes the final file with status `draft`. Any `ASSUMPTION:` line in Context is listed explicitly and confirmed before approval → status `ready`.
4. Run `/microspec.execute` — the plugin reads TASK.md, sets status `in_progress`, groups plan steps by `deps` into waves, dispatches one subagent per step in parallel. Four situations halt for the user (irreversible action, security change, external side effect, broken plan). Guardrail tiers: plain imperative → `blocked`; `[ask]` prefix → pause and ask. The Plan's `Delivery:` marker decides whether the final wave ends with a commit/push step or with a `Do not commit or push.` guardrail.
5. After each wave, `microspec-verifier` checks affected acceptance criteria with fresh-run evidence; after the final wave, `microspec-reviewer` critiques the cumulative diff with a `REVIEW FOCUS:` block. After a fix round, scoped re-review: `ADDRESSED` / `NOT-ADDRESSED`. When a PR is wanted, its body (`What` / `Why` / `Verified` / `Look here first`) is drafted from the run and offered with a prefilled compare link.
6. All AC verified `PASS`, no blocking findings → status `done`. Final report lists completed steps, `choice:` entries, `ruling:` entries, and `git diff --stat`.
7. Run `/microspec.retro` — the orchestrator compiles an evidence bundle (TASK.md, run counters, `git diff --stat`, quality bar) and dispatches `microspec-retrospector` for a read-only retrospective. At most ten findings ranked by severity, each in four fixed sections (`What happened` / `Why it matters` / `How to fix` / `How to verify`). The report opens with one issues link to the plugin repository; findings about your own repo are advice only. Nothing is applied.

```text
User: /microspec.brief Add retry logic to the HTTP client
 ┌─ Scope check (multi-capability → map + build order)
 ├─ Interview (recommended answers, ≤5 questions per round, coverage scan; delivery question)
 ├─ microspec-researcher ×N (parallel — explore client code, quality bar)
 ├─ Playback gate (Outcome/Why now/Success/Constraints/Out of scope)
 ├─ microspec-planner → Plan skeleton (Interface: lines)
 ├─ microspec-drafter → TASK.md draft (ASSUMPTION: labeled)
 ├─ microspec-critic ⇄ microspec-drafter (mechanical + drafting-level rules, ≤3 rounds)
 └─ TASK.md ready (assumptions confirmed, status: ready)

User: /microspec.execute
 ┌─ Plan deps → parallel waves (Owner per step)
 ├─ microspec-verifier ×N (fresh-run evidence; reject lowered-bar PASS)
 ├─ microspec-reviewer (REVIEW FOCUS: + scoped re-review)
 ├─ stop → user (4 situations) / guardrail tiers / re-plan
 └─ Result: done (choices, rulings, evidence)

User: /microspec.retro
 └─ microspec-retrospector (≤10 findings)
```

The Plan section is the single source of execution order.

## Install

### OpenCode

```jsonc
// opencode.json(c)
{ "plugins": ["@alexeyco/microspec"] }
```

### Pi

```bash
pi install npm:@alexeyco/microspec
```

`/microspec.brief` automatically adds `TASK.md` to `.gitignore` when the entry is missing.

## TASK.md

TASK.md carries a YAML header (`status`, `created`, `updated`) followed by required H2 sections in fixed order: Goal, Non-goals, Context, Plan, Guardrails, Acceptance criteria, Result. Status flows `draft` → `ready` → `in_progress` → `done`, with `blocked` reachable from `in_progress`. Validation splits between the mechanical rules enforced by `microspec_validate_task` and the drafting rules enforced by `microspec-critic`. The full table, rules, and a worked example are in [docs/task-contract.md](docs/task-contract.md).

## Models

Roles ship **unpinned** and inherit the session model — no `model:` field in any `agents/*.md`.

Per-host pinning:

- **OpenCode** — set a model in the `agents` map of `opencode.jsonc`:
  ```jsonc
  { "agents": { "microspec-implementer": { "model": "provider/model" } } }
  ```
- **Pi** — `microspec_task` inherits the parent context model; pin at the session level.

## See also

- [docs/agents.md](docs/agents.md) — full role catalog with report formats and dispatch mechanics.
- [docs/task-contract.md](docs/task-contract.md) — contract deep-dive, template, and example.
- [CONTRIBUTING.md](CONTRIBUTING.md) — development and release workflow.
- [CHANGELOG.md](CHANGELOG.md).
