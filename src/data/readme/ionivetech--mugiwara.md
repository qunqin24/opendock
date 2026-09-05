# Mugiwara

[![npm version](https://img.shields.io/npm/v/@ionivetech%2fmugiwara)](https://www.npmjs.com/package/@ionivetech/mugiwara)
[![npm downloads](https://img.shields.io/npm/dm/@ionivetech%2fmugiwara)](https://www.npmjs.com/package/@ionivetech/mugiwara)
[![License: MIT](https://img.shields.io/github/license/ionivetech/mugiwara)](https://github.com/ionivetech/mugiwara/blob/main/LICENSE)

**Your AI agent already writes the code. Mugiwara makes it reviewable.**

A crew of 12 specialists with defined roles, evidence at every step, and a
process that sizes itself to the work — a typo costs nothing, an auth migration
gets all nine stages and a security review. No runtime, no API keys, no
servers. Just markdown your agent already knows how to read.

Works on Claude Code, opencode, Copilot, Gemini, and 8 more platforms.

![Mugiwara banner](assets/banner.png)

---

## The problem

An AI agent can write 400 lines in five minutes. It says "tests pass" — and
leaves nothing you can open, read, or attach to a PR. Review becomes a
formality, and a formality is worse than no review, because it launders the
change through a human name.

Mugiwara makes the work provable: every change carries a trail a human can
review, and the process sizes itself to the work.

## What you get back

Every mission closes with one file. This is what your reviewer reads:

```markdown
# Mission: invitation-accepted-flow
2026-09-03 · farid · branch `feature/MKR-412` · lane **full** · mode guided

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

> **Agent:** Done — I refactored the auth flow and all tests pass.
>
> **You:** ...which tests? Did anything touch the token check? What did you
> decide about the redirect? Is there anything you skipped?
>
> **Agent:** *(the context is gone)*

### With Mugiwara

One file, attached to the PR. Which files changed, which gates passed and where
their evidence lives, who decided what and why, and — the part nobody else
writes down — **what was not verified**.

## The process fits the work

| Your change | Lane | What runs |
|---|---|---|
| Typo, one file | **Direct** | nothing — just fix it |
| Small bug | **Lean** | execute -> quality |
| A feature | **Standard** | plan -> execute -> audit -> quality -> review |
| Touches `auth/`, `payments/`, migrations | **Full** | all 9 flow stages + security review |
| Requirements still fuzzy | **Spike** | brainstorm first, then re-size |

The lane is computed from `git diff` — never guessed by the model — and it only
ever rises. Once a mission touches a sensitive path it cannot drop back, even if
that file is reverted.

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

## What Mugiwara does

| Feature | One line |
|---|---|
| Lane sizing | Process scales to the work. Computed from `git diff`, never guessed. |
| Evidence gates | A stage passes only if the check actually ran. No output, no pass. |
| Team split | One shared plan, per-person state, file conflicts caught before merge. |
| Resume | Session died? Continues from the exact stage. Never restarts. |
| 12 platforms | Same crew on Claude Code, Gemini, Codex, Copilot, Cursor and more — 9 via install, 3 via marketplace manifest. |

→ all features: [Every feature](docs/concepts/features.md)

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

- **Throwaway prototype you will delete tonight** — use Lane 4 spike, or skip mugiwara entirely; the trail outlives the code otherwise.
- **Unattended multi-hour runs with nobody watching chat** — the crew runs inline so you can interrupt it; asleep at the wheel, use a batch runner instead.
- **Solo script with no reviewer, no PR, no future reader** — the audit trail has no audience, so it is pure overhead.
- **Harnesses without agent dispatch** (Gemini, Codex, tier 3) — you get the workflow and the trail, not enforced role boundaries; do not expect the harness to stop a role from touching code it should not.

---

## Configuration

Switch mode any time: say `mugiwara mode <guided|semi|auto>` in session — no CLI flag, no slash command. Or edit `.mugiwara/config`:

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
| Switch mode | `mugiwara mode <guided\|semi\|auto>` (in session) |
| All docs | [docs/](docs/) |

---

## Try it in 60 seconds

    npx @ionivetech/mugiwara@latest install --target claude --yes

Then just describe what you want:

    "fix the typo in the header comment"        -> fixed immediately, no ceremony
    "add pagination to the users endpoint"      -> plan, execute, audit, quality, review
    "move auth to short-lived tokens"           -> all nine stages plus a security review

You did not choose any of that. The lane was computed from the diff.

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

**Runbooks:** [Solo mission](docs/runbooks/solo-mission.md) · [Team mission](docs/runbooks/team-mission.md) · [Joining mid-mission](docs/runbooks/joining-a-mission.md) · [Resume after crash](docs/runbooks/resume-after-crash.md) · [Monorepo](docs/runbooks/monorepo.md) · [Signing](docs/runbooks/signing-and-attestation.md) · [Policy](docs/runbooks/policy-for-a-team.md) · [Troubleshooting](docs/runbooks/troubleshooting.md)

**Troubleshooting:** [Common problems](docs/troubleshooting.md)

---

## What is measured, and what is not

| Claim | Status |
|---|---|
| Retrieval routing rank-1 | **95.9%**, 216 probes, offline, in CI |
| Reference pointers resolve | **318/318**, 9 targets, in CI |
| Index size published vs measured | **doc-gated** — validator fails on drift, in CI |
| Lane constants match content load | **verified**, in CI |
| Write-scope enforcement | **opencode only** — rules-based elsewhere |
| Cross-harness mission behavior | **12/12 platforms**, in CI |
| Outcome vs other approaches | **not measured** |

Numbers here are produced by `bun run gate`. Nothing in this table is an estimate.

---

## License

MIT. Copyright (c) 2026 ionivetech.
