# IUMBTEMS: I Use My Brain To Express My Self

> **Epistemic Swarm** is the product: an AI build factory for OpenCode v2 —
> grill an idea, research it with cited evidence, spec it, build it in gated
> phases under dual QA, and open a PR a human merges. Mechanical gates and a
> human-only approval channel keep autonomous runs honest.

> **Status: 1.0 in development.** This repository is the TypeScript rewrite on
> the `rewrite` branch. The legacy Python harness is tagged `legacy-final` and
> receives no further support; the 1.0 cutover replaces `main` in one reviewed
> merge, after which the packages publish to npm.

## Naming

| Name | What it is |
| :--- | :--- |
| **IUMBTEMS** | The project and brand ("I Use My Brain To Express My Self"). Repo: [`Heretek-AI/IUMBTEMS`](https://github.com/Heretek-AI/IUMBTEMS). |
| **Epistemic Swarm** | The technical/product name. npm packages `@heretek-ai/epistemic-swarm`, `@heretek-ai/es-core`, `@heretek-ai/es-cli`. |

## What it does

- **Factory stages, enforced by code.** Grill → Research → Spec → Build ⇄ QA →
  Release runs through a state machine; every `es_*` tool refuses an
  out-of-order step. Approvals (frontier, spec) and waivers are human-only,
  signed through a TUI/CLI dialog agents cannot call.
- **Mechanical gates.** Format, lint and typecheck on touched files, affected
  tests from a tree-sitter import graph (runner-native fallback), secret
  scanning, OSV, budgets (diff size, file length, complexity, dependency
  justification, test-with-behaviour), with structured `file:line:rule`
  findings and signed, expiring waivers.
- **Evidence-first research.** Content-addressed source cache, a pure verbatim
  quote verifier, and an epistemic auditor that downgrades ungrounded claims.
- **Lateral work.** Brainstorm fans out eight divergent lenses into a
  deduplicated, rubric-scored shortlist with a forced outlier; darkharvest
  tears down competitor projects with fail-closed SPDX detection, per-field
  provenance and clean-room specs; queereye interviews you into a
  contrast-gated DTCG token system with a generated style guide.
- **OpenCode v2 native.** One plugin registers agents, tools, commands, the
  hook bridge, the LSP runtime and four TUI panels — additively, with no files
  written. Claude Code (1.1), Pi (1.2) and Antigravity (1.3) adapters follow,
  each publishing capability-matrix rows with smoke tests.

## Repository layout

| Path | What lives there |
| :--- | :--- |
| `packages/core` | The harness-neutral core: factory, gates, audit, trust, research, brainstorm, harvest, queereye, LSP, hooks, capabilities, schemas. |
| `packages/opencode` | The OpenCode v2 plugin (`server` and `tui` entrypoints). |
| `packages/cli` | The `es` CLI and a coarse MCP server for non-OpenCode harnesses. |
| `packages/testkit` | Real in-process host testing (`boot`, scripted fake model). |
| `scripts/` | `docs.ts` (generated contracts/docs) and `v2-head.sh` (nightly compatibility). |
| `schemas/`, `docs/` | Generated: JSON Schemas, capability matrix, config and schema docs. |
| `spikes/` | Recorded proofs from the M0/M6 spikes. |

## Known enforcement limits

The integrity model is mechanical, but these limits are deliberate and visible
rather than silently assumed:

- **Read-only seats.** QA and manager shells run under `bwrap` when it is
  installed. Without `bwrap` (some CI runners), the fallback is a command
  allowlist plus a post-run tree fingerprint that halts the run on any change;
  it catches writes to files in the checkout, not reads or side effects outside
  it.
- **Control-file baseline.** `verifyControl` hashes the files a human
  authorises — `gates.json`, `config.json`, `frontier.json`, `approvals/**`,
  `waivers/**`; a hand edit is drift until a human accepts it (`es rebaseline`).
  Everything else that is a control file (engine-owned brainstorm, harvest and
  design state, `runtime/**`, `.git/config`) is deny-write for agents but is
  not individually hashed on every run.
- **Licence detection is strict.** A permissive verdict needs the whole licence
  file to match an SPDX template; mixed, notice-only (e.g. an Apache header
  without the licence text) or concatenated licence files are "unknown" and
  therefore clean-room only. Agents harvest local code only inside the
  project; a human can scan elsewhere with `es harvest scan`.
- **Evals are opt-in and step-capped.** `bun run evals` needs the opencode CLI
  and `ES_EVAL_MODEL`; each case is one real turn killed at a step cap, since
  the CLI's event stream reports no cost.
- **MCP caller identity.** Over the stdio MCP server the calling agent's
  identity is a model-supplied `agent` argument (or `ES_AGENT`), so it is
  ADVISORY: the harness adapter, not the protocol, establishes it. There is no
  MCP tool for approvals, trust, waivers or resume.

## Development

```bash
bun install
bun run check        # biome + tsc + bun test (all packages)
bun run docs:gen     # regenerate schemas/ + docs/ after schema changes
bun run docs:check   # CI drift check
scripts/pack-smoke.sh   # build, pack and install the packages; run them under Node and Bun
scripts/v2-head.sh   # run the real-host suite against OpenCode v2 HEAD
```

Platform: Linux, Node ≥ 22 or Bun. No Python.

## Documentation

- `docs/CAPABILITIES.md` — what each harness enforces, with proof references.
- `docs/CONFIG.md` — the layered config (global → project → plugin options).
- `docs/SCHEMAS.md` — every Zod contract as JSON Schema.
- `CHANGELOG.md` — the 1.0 cutover and breaking changes.

## License

Apache-2.0.
