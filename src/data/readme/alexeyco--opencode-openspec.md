# @alexeyco/opencode-openspec

An OpenCode agentic flow for the [most loved spec framework](https://github.com/Fission-AI/OpenSpec).

![OpenCode agentic flow for OpenSpec](docs/gallery/banner.svg)

## Install

Requires [Node.js ≥ 20.19](https://nodejs.org) and the [OpenSpec CLI](https://openspec.dev/docs/installation) — the plugin delegates every mechanical gate to it:

```sh
npm install -g @fission-ai/openspec@latest
```

Not installed yet? No separate step needed — the first flow run detects it
and offers to install (say yes). Prefer [Homebrew](https://formulae.brew.sh/formula/openspec)?
`brew install openspec` works too; the plugin finds any `openspec` on PATH.

Add the plugin to `opencode.json`:

```json
{ "plugins": ["@alexeyco/opencode-openspec"] }
```

That's the whole setup — the plugin registers all 12 OpenSpec workflow skills
itself, so `openspec init` inside your project is optional; useful only when
other tools ([30+ of them](https://openspec.dev/docs/supported-tools)) touch
the same repo.

## QuickStart

```text
You: /openspec.plan I want dark mode but I'm not sure how to do it cleanly.
AI:  [coverage interview — 3 questions, each with a recommendation]
     Q: Follow the OS preference or a manual toggle? (rec: both, OS default)
     Q: Which surfaces in v1? (rec: app shell + settings only)
     [openspec-researcher ×2 — styles, existing theme code, quality bar]
     [grill] Your "instant switch" — src/theme.ts:88 repaints the whole tree.
     Still want "instant", or "under 100ms"?
You: Under 100ms is fine.
AI:  [playback] Outcome / Why now / Success / Constraints / Out of scope /
     Rejected risks — confirmed?
You: Go.
AI:  Created openspec/changes/add-dark-mode/
     ✓ proposal.md  ✓ specs/  ✓ design.md  ✓ tasks.md
     VALID: openspec validate · confirm 2 ASSUMPTION: + 1 REJECTED-RISK:

You: /openspec.apply add-dark-mode
AI:  Wave table: wave 1 [api, ui] parallel · wave 2 [docs] serialized on theme.ts
     ✓ 1.1 ✓ 1.2 ✓ 2.1 ✓ 2.2 — scenarios executed: 6/6 PASS · reviewer APPROVE
     git diff --stat: 14 files changed — commit is yours, as always
```

Existing project with no specs yet? Start with `/openspec.init` — it bootstraps baseline specs describing what the code actually does today.

## Why

- **OpenSpec is the contract.** No invented task file: proposal, spec deltas, design, and tasks live exactly where [upstream](https://github.com/Fission-AI/OpenSpec) puts them — `openspec/changes/<id>/`. Plain Markdown the whole team can read.
- **Subagent-strict flow.** The orchestrator dispatches, never implements — seven model-agnostic roles (`agents/*.md`) do the real work: research, drafting, critique, implementation, verification, review, retrospection.
- **Waves wherever groups allow.** `tasks.md` groups run in parallel; groups that could touch the same file serialize into later waves. The planner publishes the wave table before any code is written.
- **Contract-enforced, mechanically.** Every gate runs the real `openspec validate` — the plugin never forks upstream's rules. Editorial quality comes on top through the `openspec-critic` loop (≤3 rounds).
- **Evidence-backed done.** No completion without scenario-level `PASS` — verifiers execute each `WHEN/THEN`, not read them.
- **Skills that never rot.** All 12 upstream workflow skills are vendored byte-identically; a daily CI job re-vendors from the latest CLI and opens a PR on drift — with the plugin version mirroring the vendored one.
- **Your git stays yours.** The flow writes artifacts and code, never a commit, a push, or an archive. Review, commit, archive — those are yours.

## What you get

### Commands

- [`/openspec.init`](skills/openspec-init/SKILL.md) — bootstrap the baseline: research the codebase → agree on capabilities → validated `openspec/specs/**`
- [`/openspec.plan`](skills/openspec-plan/SKILL.md) — coverage interview → parallel research → grill (1–3 rounds, up to 5) → draft → critique loop → validated, ready to build
- [`/openspec.apply`](skills/openspec-apply/SKILL.md) — implement `tasks.md` in dependency-ordered waves, verify scenarios, review the diff
- [`/openspec.archive`](vendor/openspec/skills/openspec-archive-change/SKILL.md) — archive completed changes through the vendored archive workflows; two or more ids run the bulk one
- [`/openspec.retro`](skills/openspec-retro/SKILL.md) — meta: mine the finished run for prompt defects — ≤8 cited, ranked findings, read-only

### Roles

- [openspec-researcher](agents/openspec-researcher.md) — repo + spec facts with `path:line` evidence; read-only
- [openspec-planner](agents/openspec-planner.md) — drafts change artifacts (`MODE: plan`), baseline specs (`MODE: baseline`), or the wave table (`MODE: waves`)
- [openspec-critic](agents/openspec-critic.md) — mechanical + editorial review: `CLEAN` or `NEEDS-FIX`
- [openspec-implementer](agents/openspec-implementer.md) — exactly one task group; ticks only its own checkboxes
- [openspec-verifier](agents/openspec-verifier.md) — executes every scenario's WHEN/THEN; rejects lowered bars
- [openspec-reviewer](agents/openspec-reviewer.md) — cumulative diff vs proposal, spec delta, design
- [openspec-retrospector](agents/openspec-retrospector.md) — mines one run's evidence for defects in the plugin's own prompts; ≤8 cited findings; read-only

Full catalog with report formats and dispatch mechanics: [docs/agents.md](docs/agents.md).

### Skills

- [openspec-init](skills/openspec-init/SKILL.md) — preconditions → discovery → capability map → baseline draft → critique → approval
- [openspec-plan](skills/openspec-plan/SKILL.md) — scope → coverage interview → research → grill (1–3, up to 5) → playback → draft → critique → approval
- [openspec-apply](skills/openspec-apply/SKILL.md) — gate → wave plan → parallel waves → verify → review → report
- [openspec-retro](skills/openspec-retro/SKILL.md) — evidence bundle → retrospector → relay ≤8 findings
- `openspec-propose`, `openspec-explore`, `openspec-apply-change`, … (all 12) — upstream [OpenSpec workflow skills](https://openspec.dev/docs/supported-tools), vendored and auto-synced ([docs/vendor-sync.md](docs/vendor-sync.md))

## Keeping skills current

`vendor/openspec/` is generated byte-for-byte from the pinned CLI; every file
carries upstream's `generatedBy` stamp. A daily GitHub Actions job installs
the latest OpenSpec, re-vendors, and opens a PR when anything drifts — the
PR also mirrors the vendored number into the plugin version, so plugin
`1.14.2` bundles exactly the skills of CLI `1.14.2`. Dependabot covers the
rest of the dependencies and explicitly stays off `@fission-ai/openspec` so
pin, vendor, and version can only move together. Mechanics and the
versioning trade-off: [docs/vendor-sync.md](docs/vendor-sync.md).

## Using both?

Skill ids match upstream exactly (`openspec-propose`, `openspec-apply-change`,
…), so a project with `openspec init --tools opencode` alongside the plugin
loads the same workflows — the plugin just keeps them current on every release
instead of on every manual `openspec update`. The five commands this plugin
adds (`/openspec.init`, `/openspec.plan`, `/openspec.apply`,
`/openspec.archive`, `/openspec.retro`) and the upstream ones coexist:
upstream skills are
single-workflow steps, the flow commands are the multi-agent runs over the
whole change.

## Requirements

- [OpenCode v2](https://opencode.ai) (plugin API).
- [OpenSpec CLI](https://openspec.dev/docs/installation) in PATH for the
  `openspec_validate` gate — npm or Homebrew; if it's missing the flow
  offers to install it, and only continues critic-only (plan) if you
  decline.
- Node ≥ 22.18 for development (`make check`).
- Version = the OpenSpec version inside: plugin `vX.Y.Z` bundles skills
  generated by CLI `X.Y.Z`.

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

MIT — vendored OpenSpec skills remain under their upstream MIT license,
stamped with the version that generated them.
