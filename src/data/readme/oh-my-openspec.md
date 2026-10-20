# oh-my-openspec

An OpenCode agentic flow for the [most loved spec framework](https://github.com/Fission-AI/OpenSpec).

![OpenCode agentic flow for OpenSpec](docs/gallery/banner.svg)

## QuickStart

```text
You: /omos.plan I want dark mode but I'm not sure how to do it cleanly.
AI:  [coverage interview — 3 questions, each with a recommendation]
     Q: Follow the OS preference or a manual toggle? (rec: both, OS default)
     Q: Which surfaces in v1? (rec: app shell + settings only)
     [omos-researcher ×2 — styles, existing theme code, quality bar]
     [grill] Your "instant switch" — src/theme.ts:88 repaints the whole tree.
     Still want "instant", or "under 100ms"?
You: Under 100ms is fine.
AI:  [playback] Outcome / Why now / Success / Constraints / Out of scope /
     Rejected risks — confirmed?
You: Go.
AI:  Created openspec/changes/add-dark-mode/
     ✓ proposal.md  ✓ specs/  ✓ design.md  ✓ tasks.md
     VALID: openspec validate · confirm 2 ASSUMPTION: + 1 REJECTED-RISK:

You: /omos.apply add-dark-mode
AI:  Wave table: wave 1 [api, ui] parallel · wave 2 [docs] serialized on theme.ts
     ✓ 1.1 ✓ 1.2 ✓ 2.1 ✓ 2.2 — scenarios executed: 6/6 PASS · reviewer APPROVE
     git diff --stat: 14 files changed — commit is yours, as always
```

Existing project with no specs yet? Start with `/omos.init` — it bootstraps baseline specs describing what the code actually does today.

## Comparison

How this plugin compares to the other OpenSpec×OpenCode tools.
✅ documented in the linked sources · ⚠️ partial or implemented differently · ❌ not found in the public sources checked

|                                        | [omos](https://www.npmjs.com/package/oh-my-openspec) | [AngDrew](https://github.com/AngDrew/opencode-openspec) | [Octane0411](https://github.com/Octane0411/opencode-plugin-openspec) | [oso](https://github.com/moyaspace/openspec-superpowers-opencode) | [openflow](https://github.com/lininn/openflow) |
| -------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------- |
| OpenCode-native plugin                 | ✅                                                   | ✅                                                      | ✅                                                                   | ❌[^1]                                                            | ❌[^2]                                         |
| AI-drafted artifacts pipeline          | ✅                                                   | ❌[^3]                                                  | ❌[^4]                                                               | ✅                                                                | ✅                                             |
| Adversarial review in planning         | ✅                                                   | ❌[^5]                                                  | ❌[^6]                                                               | ⚠️[^7]                                                            | ✅                                             |
| Parallel subagent implementation waves | ✅                                                   | ❌                                                      | ❌                                                                   | ❌[^8]                                                            | ❌                                             |
| Mechanical `openspec validate` gate    | ✅                                                   | ❌[^9]                                                  | ❌[^10]                                                              | ✅                                                                | ⚠️[^11]                                        |
| Retro                                  | ✅                                                   | ❌                                                      | ❌                                                                   | ✅[^12]                                                           | ❌                                             |
| Published on npm                       | ✅                                                   | ❌[^13]                                                 | ✅                                                                   | ✅                                                                | ✅                                             |

[^1]: oso ships as a global CLI (`oso init`), not an OpenCode plugin entry — [source](https://github.com/moyaspace/openspec-superpowers-opencode).

[^2]: lininn/openflow ships as a global CLI (`openflow init`), not an OpenCode plugin entry — [source](https://github.com/lininn/openflow).

[^3]: AngDrew's `openspec_ff` writes fixed Markdown templates, not AI-drafted content — [source](https://github.com/AngDrew/opencode-openspec).

[^4]: Octane0411 registers a single planning agent and defines no artifact pipeline; users are sent to an external command — [source](https://github.com/Octane0411/opencode-plugin-openspec).

[^5]: AngDrew's `openspec_ff` writes fixed Markdown templates, not AI-drafted content — [source](https://github.com/AngDrew/opencode-openspec).

[^6]: Octane0411 registers a single planning agent and defines no artifact pipeline; users are sent to an external command — [source](https://github.com/Octane0411/opencode-plugin-openspec).

[^7]: oso has an interactive brainstorm step; no separate critic loop is documented — [source](https://github.com/moyaspace/openspec-superpowers-opencode).

[^8]: oso parallelizes via git worktrees, one change per worktree — not execution waves — [source](https://github.com/moyaspace/openspec-superpowers-opencode).

[^9]: AngDrew claims "no external dependencies"; its only spec inspection is a regex requirement counter — [source](https://github.com/AngDrew/opencode-openspec).

[^10]: Octane0411 registers a single planning agent and defines no artifact pipeline; users are sent to an external command — [source](https://github.com/Octane0411/opencode-plugin-openspec).

[^11]: lininn/openflow calls the openspec CLI and reads its output, with a manual fallback; no separate validate command is documented — [source](https://github.com/lininn/openflow).

[^12]: the `superpowers-bridge` schema keeps an evidence-first `retrospective` artifact — [source](https://github.com/moyaspace/openspec-superpowers-opencode).

[^13]: [AngDrew/opencode-openspec](https://github.com/AngDrew/opencode-openspec) has a single commit (2026-02-01, [history](https://github.com/AngDrew/opencode-openspec/commits)) and is not published on npm — the registry returns 404 ([registry.npmjs.org/opencode-openspec](https://registry.npmjs.org/opencode-openspec)), so the `npm install opencode-openspec` line in its README does not resolve.

All cells checked 2026-10-17 against the linked public sources.

<details>
<summary>Detailed comparison</summary>

|                  | [omos](https://www.npmjs.com/package/oh-my-openspec)                                             | [AngDrew](https://github.com/AngDrew/opencode-openspec)                                                                        | [Octane0411](https://github.com/Octane0411/opencode-plugin-openspec)                                                                                  | [oso](https://github.com/moyaspace/openspec-superpowers-opencode)                                                                                               | [openflow](https://github.com/lininn/openflow)                                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Delivery         | OpenCode plugin ([npm](https://www.npmjs.com/package/oh-my-openspec))                            | OpenCode plugin ([repo](https://github.com/AngDrew/opencode-openspec))                                                         | OpenCode plugin ([npm](https://www.npmjs.com/package/opencode-plugin-openspec))                                                                       | Global CLI + project template (`oso`), not a plugin package ([npm](https://www.npmjs.com/package/@moyaspace/openspec-superpowers-opencode))                     | Global CLI generating skills for Claude Code/Codex/Cursor/OpenCode ([npm](https://www.npmjs.com/package/@lininn/openflow))                         |
| Plan drafting    | Interview → parallel research → grill → draft → critique loop ([docs/agents.md](docs/agents.md)) | Writes fixed Markdown templates, no AI drafting ([repo](https://github.com/AngDrew/opencode-openspec))                         | Single `openspec-plan` agent: edits OpenSpec documents, implementation code read-only ([npm](https://www.npmjs.com/package/opencode-plugin-openspec)) | 13 `/opsx-*` commands, Superpowers bridge, TDD ([repo](https://github.com/moyaspace/openspec-superpowers-opencode))                                             | Phases init/proposal/brainstorming/grill/spec/amend/build/close ([repo](https://github.com/lininn/openflow))                                       |
| Apply model      | Dependency-ordered parallel subagent waves ([docs/agents.md](docs/agents.md))                    | Sequential "Ralph loop", no parallel waves ([repo](https://github.com/AngDrew/opencode-openspec))                              | None — planning only ([npm](https://www.npmjs.com/package/opencode-plugin-openspec))                                                                  | Parallelism via git worktrees, not execution waves ([repo](https://github.com/moyaspace/openspec-superpowers-opencode))                                         | Build phase, no parallel waves documented ([repo](https://github.com/lininn/openflow))                                                             |
| Validation       | Mechanical upstream `openspec validate` gate ([README](#install))                                | No external CLI ("no external dependencies"), regex requirement counter ([repo](https://github.com/AngDrew/opencode-openspec)) | No validate tool, only permits `openspec` bash calls ([repo](https://github.com/Octane0411/opencode-plugin-openspec))                                 | Own `/opsx-verify` (CLI status checklist + schema validate), delegates to the openspec CLI ([repo](https://github.com/moyaspace/openspec-superpowers-opencode)) | Calls the openspec CLI and reads its output, manual fallback, no separate validate command documented ([repo](https://github.com/lininn/openflow)) |
| Commands & roles | 5 `/omos.*` commands, 7 subagent roles, 16 skills ([docs/agents.md](docs/agents.md))             | 7 tools + 7 skills, no commands or subagents ([repo](https://github.com/AngDrew/opencode-openspec))                            | 1 agent, no commands/skills/subagents ([repo](https://github.com/Octane0411/opencode-plugin-openspec))                                                | 13 `/opsx-*` commands ([repo](https://github.com/moyaspace/openspec-superpowers-opencode))                                                                      | CLI + generated multi-tool skills, not OpenCode-native ([repo](https://github.com/lininn/openflow))                                                |
| Retro            | /omos.retro — read-only run retrospective, ≤8 cited findings ([docs/agents.md](docs/agents.md))  | None ([repo](https://github.com/AngDrew/opencode-openspec))                                                                    | None ([repo](https://github.com/Octane0411/opencode-plugin-openspec))                                                                                 | Evidence-first `retrospective` artifact in the schema ([repo](https://github.com/moyaspace/openspec-superpowers-opencode))                                      | None documented ([repo](https://github.com/lininn/openflow))                                                                                       |
| npm package      | Published ([npm](https://www.npmjs.com/package/oh-my-openspec))                                  | Not published — registry 404[^14]                                                                                              | `opencode-plugin-openspec` v0.1.4 ([npm](https://www.npmjs.com/package/opencode-plugin-openspec))                                                     | v1.1.1 ([npm](https://www.npmjs.com/package/@moyaspace/openspec-superpowers-opencode))                                                                          | v0.5.2 ([npm](https://www.npmjs.com/package/@lininn/openflow))                                                                                     |

[^14]: [AngDrew/opencode-openspec](https://github.com/AngDrew/opencode-openspec) has a single commit (2026-02-01, [history](https://github.com/AngDrew/opencode-openspec/commits)) and is not published on npm — the registry returns 404 ([registry.npmjs.org/opencode-openspec](https://registry.npmjs.org/opencode-openspec)), so the `npm install opencode-openspec` line in its README does not resolve.

</details>

Among the tools above, none combines all three: dependency-ordered parallel subagent waves in /omos.apply, a mechanical upstream openspec validate gate, and a role-based plan flow (interview → parallel research → grill → critique). Single features exist elsewhere — lininn/openflow has a grill phase, oso keeps a retrospective artifact and parallelizes via git worktrees — the combination is what this plugin adds.

## Why

- **OpenSpec is the contract.** No invented task file: proposal, spec deltas, design, and tasks live exactly where [upstream](https://github.com/Fission-AI/OpenSpec) puts them — `openspec/changes/<id>/`. Plain Markdown the whole team can read.
- **Subagent-strict flow.** The orchestrator dispatches, never implements — seven model-agnostic roles (`agents/*.md`) do the real work: research, drafting, critique, implementation, verification, review, retrospection.
- **Waves wherever groups allow.** `tasks.md` groups run in parallel; groups that could touch the same file serialize into later waves. The planner publishes the wave table before any code is written.
- **Contract-enforced, mechanically.** Every gate runs the real `openspec validate` — the plugin never forks upstream's rules. Editorial quality comes on top through the `omos-critic` loop (≤3 rounds).
- **Evidence-backed done.** No completion without scenario-level `PASS` — verifiers execute each `WHEN/THEN`, not read them.
- **Skills that never rot.** All 12 upstream workflow skills are vendored byte-identically; a daily CI job re-vendors from the latest CLI and opens a PR on drift — with the plugin version mirroring the vendored one.
- **Your git stays yours.** The flow writes artifacts and code, never a commit, a push, or an archive. Review, commit, archive — those are yours.

## What you get

### Commands

- [`/omos.init`](skills/omos-init/SKILL.md) — bootstrap the baseline: research the codebase → agree on capabilities → validated `openspec/specs/**`
- [`/omos.plan`](skills/omos-plan/SKILL.md) — coverage interview → parallel research → grill (1–3 rounds, up to 5) → draft → critique loop → validated, ready to build
- [`/omos.apply`](skills/omos-apply/SKILL.md) — implement `tasks.md` in dependency-ordered waves, verify scenarios, review the diff
- [`/omos.archive`](vendor/openspec/skills/openspec-archive-change/SKILL.md) — archive completed changes through the vendored archive workflows; two or more ids run the bulk one
- [`/omos.retro`](skills/omos-retro/SKILL.md) — meta: mine the finished run for prompt defects — ≤8 cited, ranked findings, read-only

<details>
<summary>Using Codex CLI? Same flows, invoked as skill mentions</summary>

The plugin also ships as a native Codex CLI plugin (see
[docs/codex.md](docs/codex.md) for install). No slash commands — Codex
plugins have no command surface; every flow is a skill mention
(OpenCode → Codex):

- `/omos.init` → `$omos-init` — bootstrap baseline specs
- `/omos.plan` → `$omos-plan` — interview → research → grill → draft → critique
- `/omos.apply` → `$omos-apply` — parallel `spawn_agent` waves → verify → review
- `/omos.archive` → `$omos-archive` — archive via the bundled upstream archive skill (bulk for two or more ids)
- `/omos.retro` → `$omos-retro` — run retrospective, ≤8 cited findings
- `$omos-setup` — Codex-only first step: installs the seven role agent files

Roles run as native Codex subagents from `~/.codex/agents/omos-*.toml`, and
the `openspec validate` gate is the bundled MCP server
(`mcp__openspec__openspec_validate`) — same report format as here.
`$omos-archive` delegates to the bundled `$openspec-archive-change` skill
(`$openspec-bulk-archive-change` for two or more ids). The Codex bundle
ships one skill set — the six flow skills plus the same 12 vendored
upstream skills the OpenCode plugin registers — so no project-level
`openspec init` is needed there.

</details>

### Roles

- [omos-researcher](agents/omos-researcher.md) — repo + spec facts with `path:line` evidence; read-only
- [omos-planner](agents/omos-planner.md) — drafts change artifacts (`MODE: plan`), baseline specs (`MODE: baseline`), or the wave table (`MODE: waves`)
- [omos-critic](agents/omos-critic.md) — mechanical + editorial review: `CLEAN` or `NEEDS-FIX`
- [omos-implementer](agents/omos-implementer.md) — exactly one task group; ticks only its own checkboxes
- [omos-verifier](agents/omos-verifier.md) — executes every scenario's WHEN/THEN; rejects lowered bars
- [omos-reviewer](agents/omos-reviewer.md) — cumulative diff vs proposal, spec delta, design
- [omos-retrospector](agents/omos-retrospector.md) — mines one run's evidence for defects in the plugin's own prompts; ≤8 cited findings; read-only

Full catalog with report formats and dispatch mechanics: [docs/agents.md](docs/agents.md).

### Skills

- [omos-init](skills/omos-init/SKILL.md) — preconditions → discovery → capability map → baseline draft → critique → approval
- [omos-plan](skills/omos-plan/SKILL.md) — scope → coverage interview → research → grill (1–3, up to 5) → playback → draft → critique → approval
- [omos-apply](skills/omos-apply/SKILL.md) — gate → wave plan → parallel waves → verify → review → report
- [omos-retro](skills/omos-retro/SKILL.md) — evidence bundle → retrospector → relay ≤8 findings
- `openspec-propose`, `openspec-explore`, `openspec-apply-change`, … (all 12) — upstream [OpenSpec workflow skills](https://openspec.dev/docs/supported-tools), vendored and auto-synced ([docs/vendor-sync.md](docs/vendor-sync.md))

## Install

Requires [OpenCode v2](https://opencode.ai) (plugin API), [Node.js ≥ 22.18](https://nodejs.org) and the [OpenSpec CLI](https://openspec.dev/docs/installation) — the plugin delegates every mechanical gate to it:

```sh
npm install -g @fission-ai/openspec@latest
```

Not installed yet? No separate step needed — the first flow run detects it
and offers to install (say yes). Prefer [Homebrew](https://formulae.brew.sh/formula/openspec)?
`brew install openspec` works too; the plugin finds any `openspec` on PATH.

Add the plugin to `opencode.json`:

```json
{ "plugins": ["oh-my-openspec"] }
```

That's the whole setup — the plugin registers all 12 OpenSpec workflow skills
itself, so `openspec init` inside your project is optional; useful only when
other tools ([30+ of them](https://openspec.dev/docs/supported-tools)) touch
the same repo.

## Keeping skills current

All 12 upstream workflow skills are vendored byte-identically; a daily CI job re-vendors from the latest OpenSpec and opens a PR on drift, and plugin `vX.Y.Z` bundles exactly the skills of CLI `vX.Y.Z`. Mechanics and the versioning trade-off: [docs/vendor-sync.md](docs/vendor-sync.md).

## Using both?

Skill ids match upstream exactly and coexist with the five flow commands — upstream skills are single-workflow steps, the flow commands are the multi-agent runs over the whole change: [docs/using-both.md](docs/using-both.md).

## See also

- [OpenSpec](https://github.com/Fission-AI/OpenSpec) — the spec layer, CLI,
  and workflows this plugin rides on. All spec semantics belong upstream;
  this repo just orchestrates agents around them. If it helps you, star them,
  not us.
- [OpenSpec docs](https://openspec.dev/docs) — quickstart, commands,
  customization.
- [docs/agents.md](docs/agents.md) — role catalog with report formats and
  dispatch mechanics.
- [docs/vendor-sync.md](docs/vendor-sync.md) — the skill-freshness pipeline.
- [CONTRIBUTING.md](CONTRIBUTING.md) — development and release workflow.
- Alternatives in the same niche — [AngDrew/opencode-openspec](https://github.com/AngDrew/opencode-openspec), [Octane0411/opencode-plugin-openspec](https://github.com/Octane0411/opencode-plugin-openspec), [moyaspace/openspec-superpowers-opencode](https://github.com/moyaspace/openspec-superpowers-opencode), [lininn/openflow](https://github.com/lininn/openflow) — see [Comparison](#comparison).

MIT — vendored OpenSpec skills remain under their upstream MIT license,
stamped with the version that generated them.
