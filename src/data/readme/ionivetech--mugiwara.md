# Mugiwara

[![npm version](https://img.shields.io/npm/v/@ionivetech%2fmugiwara)](https://www.npmjs.com/package/@ionivetech/mugiwara)
[![npm downloads](https://img.shields.io/npm/dm/@ionivetech%2fmugiwara)](https://www.npmjs.com/package/@ionivetech/mugiwara)
[![License: MIT](https://img.shields.io/github/license/ionivetech/mugiwara)](https://github.com/ionivetech/mugiwara/blob/main/LICENSE)

**Your agent writes the code. Mugiwara proves it.**

A governed engineering crew for your AI agent — evidence at every step, a
process that sizes itself to the work, and cost you can actually see. No
runtime, no API keys, no servers. Just markdown your agent already knows how
to read.

Works on Claude Code, opencode, Copilot, Gemini, and 8 more platforms.

![Mugiwara banner](assets/banner.png)

---

## What is Mugiwara? (30 seconds)

AI agents are fast. They're also **unverified** — no audit trail, no review, no
"who checked this?" when something breaks.

Mugiwara wraps your agent in a **Straw Hat crew**: a team of named roles
(Luffy, Nami, Zoro, Chopper, …) that triages, plans, executes, audits, reviews,
and heals your work — with a **ruled pipeline**, **evidence at every gate**, and
a **cost governor** that keeps spend visible and bounded.

Three things it does for you:

| You get | Meaning |
|---|---|
| **Evidence, not claims** | Every flow stage re-runs checks and shows output. "Done" = proof. |
| **Process that sizes itself** | A typo costs nothing. An auth migration gets the full pipeline. |
| **Visible cost** | Per-lane budgets, a live slop governor, and a `mugiwara cost` ledger. |

It runs **inline in your chat** — you watch every step. No hidden subagents, no
black box.

→ [Why mugiwara vs just asking your agent](docs/concepts/comparison.md)

---

## Quick start (5 minutes)

Add the plugin, then just ask something non-trivial:

```bash
# opencode — add to opencode.json, then restart
{ "plugin": ["@ionivetech/mugiwara"] }

# Claude Code
/plugin marketplace add ionivetech/mugiwara && /plugin install mugiwara

# Any platform via npm
npx @ionivetech/mugiwara@latest install --target all --yes
```

First run writes `.mugiwara/config` with defaults. Then ask:

```
> add role-based access control: admin, editor, viewer
> audit the auth middleware for security gaps
> review the last PR for breaking changes
> split this feature across the team: payment gateway, ledger, fraud
```

You ask. The crew routes automatically. **No agent names to memorize, no
pipeline config to write.** A Standard-lane mission (~13k tokens) produces a
branch with test-first commits, an audit report, a security review, and a ready
PR summary — visible at every step in your chat.

| You say                                        | What happens |
| ---------------------------------------------- | ------------------------------------------------------- |
| `add search bar to products page`              | Luffy triages → Nami plans → Zoro executes TDD → Chopper audits → Sanji quality → Franky gates → Robin reviews → pushed, PR summary ready |
| `split payment system: gateway, ledger, fraud` | Nami writes one plan split into sub-missions, each with its own branch + done-criteria → each dev resumes only their own → all mergeable |
| `Brook, fix the failing login test`            | Healer reads the failure ledger, root-cause fixes, proves it ≤3 cycles |
| `Jinbe, audit auth middleware`                 | STRIDE + OWASP + dependency audit. Read-only — never touches code |

→ [Full walkthrough](docs/getting-started.md)

---

## How it works (the short version)

Four ideas explain almost everything:

### 1. The crew pipeline
A mission runs as **flow stages**, each owned by one crew member — triage →
brainstorm → plan → execute → audit → quality → gates → review → heal →
closure. Every stage reports a compact checkpoint you can read in your chat.

→ [Full pipeline](docs/concepts/workflow.md) · [The crew](docs/concepts/agents.md)

### 2. Lanes — process sizes itself
Work is sized to the diff. A typo gets no pipeline; an auth migration gets all
nine stages. Lanes: `direct` / `lean` / `standard` / `full` / `spike`.

| Lane | Flow stages | Typical tokens | Budget |
| ---- | :---: | :---: | :---: |
| Direct (typo) | 0 | ~0 | — |
| Lean (small bug) | 2 | ~8k | 12k |
| Standard (feature) | 5–7 | ~13k | 25k |
| Full (architecture) | 9–11 | ~22k | 50k |

→ [Lanes](docs/concepts/lanes.md)

### 3. Modes — how much you participate
`guided` (approve every step), `semi` (approve the plan, then auto), `auto`
(full autonomy within your scope).

→ [Modes](docs/concepts/modes.md)

### 4. Cost Governor — what is safe to spend
Per-lane budgets, a **live slop governor** that flags wasted cost and
attributes it to the crew member that caused it, and a `mugiwara cost` ledger.

→ [Cost model](docs/concepts/cost.md)

### Adaptive execution
Three decisions stay **independent**: your **control mode** (how much you
approve), the **execution posture** (how work runs — inline / parallel /
context-relief / phase / team), and the **Cost Governor** (what is safe to
spend). The crew picks the posture from evidence at each flow boundary; a
Full-lane mission can be Guided and inline, a Lean mission can be Auto and
sequential. Inline stays the default.

→ [Adaptive execution](docs/concepts/execution-model.md)

---

## See the evidence

A closed mission leaves a report you can actually read — and after
`mugiwara archive <mission>`, the whole trail folds INTO it. This is the shape
of `.mugiwara/missions/<mission>/report.md`:

    # Mission: invitation-accepted-flow . 2026-08-11

    **Lane** full . **Mode** guided . **Actor** john . **Branch** feature/MKR-412

    ## What changed
    11 files, +340 LOC. Sensitive paths: src/auth/

    ## Flow stages
    Execute (Flow 3)  PASS   · Checkpoint (Flow 4)  PASS   · Quality (Flow 5)  PASS
    Gates (Flow 6)    PASS   · Healing (Flow 8)     PASS   · Closure (Flow 9)  GO

    ## Review & blockers
    Review + security: 3 findings · Blocker ledger: 1 row

    ## State
    Flow 9 · 6/6 tasks · 0 blockers · 1 heal · 14,200 / 20,000 tokens

---

## What Mugiwara does

**Every day, on every repo:**

| Feature | What you get |
|---|---|
| **Lane sizing** | Work auto-sized from `git diff`. Typo = instant fix. Auth migration = full pipeline. |
| **Evidence trail** | `.mugiwara/` workspace: plans, audit reports, quality reports, review findings, blocker ledger. |
| **Adaptive execution** | Picks an execution posture from evidence at each flow boundary — cost-aware, never a mode flip. |
| **Live slop governor** | Flags wasted cost live and attributes it per crew member. `mugiwara cost` shows it. |
| **Closure integrity** | Archive fails on dangling links, secrets in the trail, or missing evidence. |
| **Provenance** | Per-commit attribution — agent, model, lane, evidence. `mugiwara blame`. |
| **Rollback map** | Executable `rollback.sh` per mission: exact revert commands. Human runs it. |
| **Staleness guard** | Resume warns when main moved past the mission's base. |

**When a team scales it up:**

| Feature | What you get |
|---|---|
| **Policy as code** | `mugiwara.policy.yml`: force lanes up, raise coverage gates, flag paths for human approval. |
| **Signed attestation** | Optional signing of the report — evidence that cannot be edited after the fact. |
| **Handoff** | `mugiwara handoff`: engineer-to-engineer report from computed state. |
| **Context budget** | Trail size measured at closure; optional ceiling fails the archive like a test. |
| **Team collaboration** | One shared plan, per-(mission, member) state + resume. Zero collisions. |

**Always on, under the surface:**

| Feature | What you get |
|---|---|
| **Self-healing** | Brook reads all failures at once, fixes root causes, re-runs verification. ≤3 cycles. |
| **Resume from anywhere** | Rebuilds from `.mugiwara/` state. Continues, never restarts. |
| **12 platforms** | Claude Code, opencode, Copilot, Gemini, Codex, Cursor, Kimi, Pi, Antigravity + CLI. |

→ All features, with how-to-use + scenarios: [Every feature](docs/concepts/features.md)

---

## Team collaboration

Built for a team sharing one repo. Identity is **(mission, member)**, never
branch — so any number of engineers run parallel work without colliding.

```bash
/mugiwara continue                      # list every in-flight mission for YOU
/mugiwara continue payment-gateway      # solo → resume; team → list members
/mugiwara continue payment-gateway patty # resume exactly patty's work
mugiwara status                         # computed per-mission position
```

Auto mode runs your **member scope only** — resuming your sub-mission runs it to
ship, never the other members'.

→ [Multi-actor reference](references/multi-actor.md)

---

## When not to use Mugiwara

- **Prototyping or spikes** — use Lane 4, or skip mugiwara entirely.
- **Unattended multi-hour runs** — the crew runs inline so you can interrupt it.
- **Solo scripts with no review path** — the audit trail has no audience.
- **Harnesses without agent dispatch** (Gemini, Codex, tier 3) — you get the
  workflow and the trail, not enforced role boundaries.

---

## Configuration

Switch mode any time: `/mugiwara guided | semi | auto`. Or edit `.mugiwara/config`:

| Key | Default | What |
|---|---|---|
| `mode` | guided | guided / semi / auto |
| `branch` | `feature/{type}-{issue}-{slug}` | Branch naming |
| `commit` | conventional | conventional / gitmoji / plain / template |
| `auto_commit` | on | off disables commit+push in guided/semi |
| `coverage_new` | 85 | Coverage threshold for new files (%) |
| `coverage_modified` | 90 | Coverage threshold for modified files (%) |
| `delegate_threshold` | 60 | % of budget at which remaining tasks dispatch to workers |
| `heal_max_cycles` | 3 | Max heal-loop cycles before human escalation |
| `verbosity` | normal | normal / full — how much the crew echoes |

Project config (`.mugiwara/config`) overrides global (`~/.mugiwara/config`).

→ [All config keys](docs/concepts/config.md)

---

## Quick reference

| Need | Command / Doc |
|---|---|
| Review a PR diff | `/mugiwara-review` or "review this PR" |
| Security audit | `/mugiwara-security` or "Jinbe, audit X" |
| Resume a mission | `/mugiwara continue <mission> [member]` |
| See mission position | `mugiwara status` |
| See cost + live slop | `mugiwara cost` |
| Close out a mission | `mugiwara archive <mission>` |
| Switch mode | `/mugiwara guided\|semi\|auto` |
| All docs | [docs/](docs/) |

---

## Install

<details>
<summary><b>Claude Code</b></summary>

```bash
/plugin marketplace add ionivetech/mugiwara && /plugin install mugiwara
```
Uninstall: `/plugin uninstall mugiwara`

</details>

<details>
<summary><b>OpenCode</b></summary>

Add to `opencode.json`:
```json
{ "plugin": ["@ionivetech/mugiwara"] }
```
Update: `rm -rf ~/.cache/opencode/packages/@ionivetech/mugiwara* && opencode plugin @ionivetech/mugiwara -g` ([details](docs/install/opencode.md#update))
Uninstall: remove `"@ionivetech/mugiwara"` from the plugins array

</details>

<details>
<summary><b>Gemini CLI / Codex / Copilot / Cursor / Antigravity / Kimi / Pi</b></summary>

See [per-platform guides](docs/install/index.md) — each has a one-line install
and uninstall.

</details>

<details>
<summary><b>Any platform via CLI</b></summary>

```bash
npx @ionivetech/mugiwara@latest install --target <id> --yes   # windsurf, cline, kilo, codex
npm i -g @ionivetech/mugiwara && mugiwara install --target all --yes
```

</details>

All platforms get the full crew — 11 agents (+3 internal), 21 skills.
Enforcement depth varies by harness; see the [harness matrix](docs/reference/harness-matrix.md).

---

## CLI

```bash
mugiwara install                              # wizard (interactive)
mugiwara install --target all --yes           # non-interactive
mugiwara update --target <id> --yes           # overwrite to latest
mugiwara uninstall                            # remove installed files
mugiwara list [--check]                       # show / health-check installations
mugiwara status                               # computed mission state
mugiwara continue [mission] [member]          # resume / list in-flight (read-only)
mugiwara cost [--mission <id>] [--json]       # cost ledger, avoided work, live slop
mugiwara archive <mission>                    # fold the trail into report.md
mugiwara clean [--all] [--before <date>]      # batch-archive closed missions
mugiwara blame <path>                         # provenance on the last commit touching path
mugiwara handoff <mission>                    # engineer-to-engineer handoff report
mugiwara sign <mission> [--verify]            # optional report attestation
mugiwara reset --keep-logs                    # wipe state, keep lessons
```

---

## Docs

**Start here:** [Getting started](docs/getting-started.md) · [What mugiwara replaces](docs/concepts/comparison.md)

**Concepts:** [Workflow](docs/concepts/workflow.md) · [Lanes](docs/concepts/lanes.md) · [Modes](docs/concepts/modes.md) · [Execution model](docs/concepts/execution-model.md) · [Git strategy](docs/concepts/git-strategy.md) · [Config](docs/concepts/config.md) · [Cost](docs/concepts/cost.md) · [Audit trail](docs/concepts/audit-trail.md) · [Security](docs/concepts/security.md) · [Provenance](docs/concepts/provenance.md) · [Policy as code](docs/concepts/policy-as-code.md) · [Closure tools](docs/concepts/closure-tools.md) · [Permissions](docs/concepts/permissions.md)

**Crew:** [Agents](docs/concepts/agents.md) · [Skills](docs/concepts/skills.md) · [Adaptive execution](docs/concepts/execution-model.md)

**Reference:** [Adoption guide](docs/reference/adoption-guide.md) · [Glossary](docs/reference/glossary.md) · [Harness matrix](docs/reference/harness-matrix.md) · [Compliance matrix](docs/reference/compliance-matrix.md)

**Install:** [Overview](docs/install/index.md) · [Claude](docs/install/claude.md) · [opencode](docs/install/opencode.md) · [Gemini](docs/install/gemini.md) · [Codex](docs/install/codex.md) · [Copilot](docs/install/copilot.md) · [CLI targets](docs/install/cli.md)

**Troubleshooting:** [Common problems](docs/troubleshooting.md)

---

## What is measured, and what is not

| Claim | Status |
|---|---|
| Retrieval routing rank-1 | **95.9%**, 216 probes, offline, in CI |
| Reference pointers resolve | **312/312**, 9 targets, in CI |
| Index size published vs measured | **doc-gated** — validator fails on drift, in CI |
| Lane constants match content load | **verified**, in CI |
| Write-scope enforcement | **opencode only** — rules-based elsewhere |
| Cross-harness mission behavior | **12/12 platforms**, in CI |
| Outcome vs other approaches | **not measured** |

Numbers here are produced by `bun run gate`. Nothing in this table is an estimate.

---

## License

MIT. Copyright (c) 2026 ionivetech.
