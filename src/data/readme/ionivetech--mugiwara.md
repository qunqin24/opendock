# Mugiwara

[![npm version](https://img.shields.io/npm/v/@ionivetech%2fmugiwara)](https://www.npmjs.com/package/@ionivetech/mugiwara)
[![npm downloads](https://img.shields.io/npm/dm/@ionivetech%2fmugiwara)](https://www.npmjs.com/package/@ionivetech/mugiwara)
[![License: MIT](https://img.shields.io/github/license/ionivetech/mugiwara)](https://github.com/ionivetech/mugiwara/blob/main/LICENSE)

**Your AI agent already writes the code. Mugiwara makes it reviewable.**

A crew of 12 specialists with roles and evidence at every step. The
process sizes itself to the work: a typo costs nothing, an auth migration gets
all nine stages and a security review. No runtime, no API keys, no servers.
Markdown your agent knows how to read.

Works on 12 platforms, including Claude Code and opencode.

![Mugiwara banner](assets/banner.png)

---

## The problem

An AI agent can write 400 lines in five minutes. It says "tests pass" and
leaves nothing you can open, read, or attach to a PR. Review becomes a
formality, and a formality launders the change through a human name.

## What you get back

Every mission closes with one file your reviewer reads:

```markdown
# Mission: invitation-accepted-flow
2026-09-03 · you · branch `feature/invitation-flow` · lane **full** · mode guided

## Verdict
**GO** — all gates passed. 1 finding deferred with an owner.

## What changed
11 files, +340 / -82.
Sensitive paths touched: `src/auth/invitation.ts`, `migrations/004.sql`

## Gates
| Gate | Verdict | Evidence |
|---|---|---|
| Checkpoint (Flow 4) | PASS | `flows/04-audit.md` |
| Quality (Flow 5) | PASS | `flows/05-quality.md` |
| Coverage (Flow 6) | PASS | new 94% / modified 87% |
| Security (Flow 7) | PASS | STRIDE, 0 high -> `review/security.md` |

## Cost
Used **8,781** of 12,000 tokens (73%). Lane `lean`. 1 heal cycle.
```

*Generated from fixture `test/fixtures/report-sample.md` — 2026-09-03.*

### Without Mugiwara

> **Agent:** Done: refactored auth, all tests pass.
>
> **You:** ...which tests? Did anything touch the token check?
>
> **Agent:** *(the context is gone)*

### With Mugiwara

One file per PR: files changed, gates passed with evidence locations, decisions made, plus **what was not verified**.

## The process fits the work

| Your change | Lane | What runs |
|---|---|---|
| Typo, one file | **Direct** | nothing, fix it directly |
| Small bug | **Lean** | execute -> quality |
| A feature | **Standard** | plan -> execute -> audit -> quality -> review |
| Touches `auth/`, `payments/`, migrations | **Full** | all 9 flow stages + security review |
| Requirements still fuzzy | **Spike** | brainstorm first, then re-size |

The lane is computed from `git diff`, never guessed, and it only ever rises.

## What is Mugiwara? (30 seconds)

AI agents are fast. They are also **unverified**: no audit trail, no review, no
"who checked this?" when something breaks.

Mugiwara wraps your agent in a **Straw Hat crew** of named roles
(Luffy, Nami, Zoro, Chopper, …) with a **ruled pipeline**, **evidence at every
gate**, and a **cost governor** keeping spend visible and bounded.

Three things it does for you:

| You get | Meaning |
|---|---|
| **Evidence, not claims** | Every flow stage re-runs checks and shows output. "Done" = proof. |
| **Process that sizes itself** | A typo costs nothing. An auth migration gets the full pipeline. |
| **Visible cost** | Per-lane budgets, a live [slop](docs/concepts/cost.md) governor, and a `mugiwara cost` ledger. |

It runs **inline in your chat**.

→ [Why mugiwara vs asking unaided](docs/concepts/features.md#outcome-honesty-including-what-is-missing)

---

## Quick start (5 minutes)

Add the plugin, then ask something non-trivial:

```bash
# opencode: add to opencode.json, then restart
{ "plugin": ["@ionivetech/mugiwara"] }

# Claude Code
/plugin marketplace add ionivetech/mugiwara && /plugin install mugiwara

# Any platform via npm
npx @ionivetech/mugiwara@latest install --target all --yes
```

First run writes `.mugiwara/config`. Then ask:

```
> add role-based access control: admin, editor, viewer
> audit the auth middleware for security gaps
> review the last PR for breaking changes
> split this feature across the team: payment gateway, ledger, fraud
```

You ask; the crew routes. A Standard-lane mission ends with test-first commits,
an audit report, a security review, and a PR summary, visible at every step.

| You say                                        | What happens |
| ---------------------------------------------- | ------------------------------------------------------- |
| `add search bar to products page`              | Triage, plan, execute, audit, gate, review, then a PR summary |
| `split payment system: gateway, ledger, fraud` | One plan split into sub-missions, each dev resumes only their own |
| `Brook, fix the failing login test`            | Healer reads the failure ledger, root-cause fixes, proves it in ≤3 cycles |
| `Jinbe, audit auth middleware`                 | STRIDE + OWASP + dependency audit. Read-only, never touches code |

→ [Full walkthrough](docs/getting-started.md)

---

## How it works (the short version)

Four ideas explain almost everything:

### 1. The crew pipeline
A mission runs as **flow stages**, each owned by one crew member: triage,
brainstorm, plan, execute, audit, quality, gates, review, heal, closure. Plans
record a preflight baseline (`bun test`, `tsc --noEmit`) before executing.

→ [Full pipeline](docs/concepts/workflow.md) · [The crew](docs/concepts/agents.md)

### 2. Lanes: process sizes itself
Work is sized to the diff. A typo gets no pipeline; an auth migration gets all
nine stages.

| Lane | Flow stages | Typical tokens | Budget |
| ---- | :---: | :---: | :---: |
| Direct (typo) | 0 | ~0 | — |
| Lean (small bug) | 2 | ~8k | 12k |
| Standard (feature) | 5–7 | ~13k | 25k |
| Full (architecture) | 9–11 | ~22k | 50k |

→ [Lanes](docs/concepts/lanes.md)

### 3. Modes: how much you participate
`guided` (approve every step), `semi` (approve the plan, then auto), `auto`
(full autonomy within your scope).

→ [Modes](docs/concepts/modes.md)

### 4. Cost Governor: what is safe to spend
Per-lane budgets, a **live slop governor** that flags wasted cost and
attributes it to the crew member that caused it, and a `mugiwara cost` ledger.
Native names: anti-fluff (terse writing); just-enough (minimal-code ladder, YAGNI-first); anti-slop (waste detection); have-adhd (scannable rendering).

→ [Cost model](docs/concepts/cost.md)

### Adaptive execution
[Control mode](docs/concepts/modes.md), [execution posture](docs/concepts/workflow.md), and [Cost Governor](docs/concepts/cost.md) stay **independent**. The
crew picks the posture from evidence at each flow boundary. Inline is the default.

→ [Adaptive execution](docs/concepts/workflow.md)

---

## What Mugiwara does

| Feature | One line |
|---|---|
| Lane sizing | Process scales to the work. Computed from `git diff`, never guessed. |
| Evidence gates | A stage passes only if the check actually ran. No output, no pass. |
| Team split | One shared plan, per-person state, file conflicts caught before merge. |
| Resume | Session died? Continues from the exact stage. Never restarts. |
| Feature flags | `features=` selects the skill set; `mugiwara features explain` shows why each feature loads. |
| 12 platforms | 11 agents (+3 internal) on 12 harnesses: 9 install full bodies, 3 via marketplace manifest. |

→ all features: [Every feature](docs/concepts/features.md)

---

## Team collaboration

Built for a team sharing one repo. Identity is **(mission, member)**, never
branch, so parallel work never collides.
Solo by default (`team=off`); the first shared mission flips it on at Flow 0.

```bash
/mugiwara continue                      # list every in-flight mission for YOU
/mugiwara continue payment-gateway      # solo → resume; team → list members
/mugiwara continue payment-gateway patty # resume exactly patty's work
mugiwara status                         # computed per-mission position
```

Auto mode runs your **member scope only**: your sub-mission ships alone.

→ [Multi-actor reference](references/multi-actor.md) · [Adoption guide](docs/reference/adoption-guide.md)

---

## When not to use Mugiwara

- **Throwaway prototype you will delete tonight**: skip the crew; the trail outlives the code otherwise.
- **Unattended multi-hour runs with nobody watching chat**: the crew runs inline so you can interrupt it; use a batch runner instead.
- **Solo script with no reviewer, no PR, no future reader**: the trail has no audience, so it is pure overhead.
- **Harnesses without agent dispatch** (Gemini, Codex, tier 3): you get the workflow and the trail, not enforced role boundaries.

---

## Configuration

Switch mode any time: say `mugiwara mode <guided|semi|auto>` in session.

| Key | Default | What |
|---|---|---|
| `mode` | guided | guided / semi / auto |
| `verbosity` | normal | normal / full |
| `branch` | `feature/{type}-{issue}-{slug}` | Branch naming |
| `commit` | conventional | conventional / gitmoji / plain / template |
| `auto_commit` | off | off hands you an uncommitted tree in guided/semi |
| `coverage_new` | 85 | Coverage threshold for new files (%) |
| `coverage_modified` | 90 | Coverage threshold for modified files (%) |
| `review_depth` | full | full / standard / quick |
| `quality_depth` | full | full / standard / quick |
| `verify_merged` | off | re-verify the merged tree before closing |
| `delegate_threshold` | 60 | % of budget at which remaining tasks dispatch to workers |
| `heal_max_cycles` | 3 | Max heal-loop cycles before human escalation |

Project config (`.mugiwara/config`) overrides global (`~/.mugiwara/config`).
Commented optionals (`features=`, `team=`, `sign=`, `enforce=`, scope, budgets,
investigation limits) stay off until set.

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
| Explain the feature mix | `mugiwara features explain` |
| Close out a mission | `mugiwara archive <mission>` |
| Switch mode | `mugiwara mode <guided\|semi\|auto>` (in session) |
| All docs | [docs/](docs/) |

---

## Try it in 60 seconds

    npx @ionivetech/mugiwara@latest install --target claude --yes

Then describe what you want:

    "fix the typo in the header comment"        -> fixed immediately, no ceremony
    "add pagination to the users endpoint"      -> plan, execute, audit, quality, review
    "move auth to short-lived tokens"           -> all nine stages plus a security review

## Install

<details>
<summary><b>Claude Code</b></summary>

```bash
/plugin marketplace add ionivetech/mugiwara && /plugin install mugiwara
```

</details>

<details>
<summary><b>OpenCode</b></summary>

Add `"plugin": ["@ionivetech/mugiwara"]` to `opencode.json` and restart.

</details>

<details>
<summary><b>Gemini CLI / Codex / Copilot / Cursor / Antigravity / Kimi / Pi</b></summary>

See [per-platform guides](docs/install/index.md).

</details>

<details>
<summary><b>Any platform via CLI</b></summary>

```bash
npx @ionivetech/mugiwara@latest install --target <id> --yes   # windsurf, cline, kilo, codex
```

</details>

Compact (tier-3) targets install stub pointers, not full bodies; each install
page names its side. See the [harness matrix](docs/reference/harness-matrix.md).

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
mugiwara features explain|list                # which skills load, and why
mugiwara archive <mission>                    # fold the trail into report.md
mugiwara clean [--all] [--before <date>]      # batch-archive closed missions
mugiwara blame <path>                         # provenance on the last commit touching path
mugiwara handoff <mission>                    # engineer-to-engineer handoff report
mugiwara sign <mission> [--verify]            # optional report attestation
mugiwara reset --keep-logs                    # wipe state, keep lessons
```

---

## Docs

**Start here:** [Getting started](docs/getting-started.md) · [What mugiwara replaces](docs/concepts/features.md#outcome-honesty-including-what-is-missing)

**Concepts:** [Workflow](docs/concepts/workflow.md) · [Lanes](docs/concepts/lanes.md) · [Modes](docs/concepts/modes.md) · [Git strategy](docs/concepts/git-strategy.md) · [Config](docs/concepts/config.md) · [Cost](docs/concepts/cost.md) · [Audit trail](docs/concepts/audit-trail.md) · [Security](docs/concepts/security.md) · [Provenance](docs/concepts/provenance.md) · [Policy as code](docs/concepts/policy-as-code.md) · [Closure tools](docs/concepts/closure-tools.md) · [Permissions](docs/concepts/permissions.md) · [Memory](docs/concepts/memory.md)

**Crew:** [Agents](docs/concepts/agents.md) · [Skills](docs/concepts/skills.md) · [Adaptive execution](docs/concepts/workflow.md)

**Reference:** [Adoption guide](docs/reference/adoption-guide.md) · [Glossary](docs/reference/glossary.md) · [Harness matrix](docs/reference/harness-matrix.md) · [Compliance matrix](docs/reference/compliance-matrix.md)

**Install:** [Overview](docs/install/index.md) · [Claude](docs/install/claude.md) · [opencode](docs/install/opencode.md) · [Gemini](docs/install/gemini.md) · [Codex](docs/install/codex.md) · [Copilot](docs/install/copilot.md) · [CLI targets](docs/install/cli.md)

**Runbooks:** [Solo mission](docs/runbooks/solo-mission.md) · [Team mission](docs/runbooks/team-mission.md) · [Joining mid-mission](docs/runbooks/joining-a-mission.md) · [Resume after crash](docs/runbooks/resume-after-crash.md) · [Monorepo](docs/runbooks/monorepo.md) · [Signing](docs/runbooks/signing-and-attestation.md) · [Policy](docs/runbooks/policy-for-a-team.md) · [Troubleshooting](docs/runbooks/troubleshooting.md)

---

## What is measured, and what is not

| Claim | Status |
|---|---|
| Retrieval routing rank-1 | **95.5%**, 227 probes (174 positive, 83 negative), in CI |
| Reference pointers resolve | **160/160**, 9 targets, in CI |
| Index size published vs measured | **doc-gated**: validator fails on drift, in CI |
| Lane constants match content load | **verified**, in CI |
| Slop verdicts | in `mugiwara cost` and the closing report: [Cost](docs/concepts/cost.md) |
| Write-scope enforcement | **opencode only**, rules-based elsewhere |
| Cross-harness mission behavior | **12/12 platforms**, in CI |
| Outcome vs other approaches | **not measured** |

Numbers here are produced by `bun run gate`. Nothing in this table is an estimate.

---

## License

MIT. Copyright (c) 2026 ionivetech.
