# IUMBTEMS: I Use My Brain To Express My Self

> **Epistemic Swarm** is the product: an AI build factory for OpenCode v2 —
> grill an idea, research it with cited evidence, spec it, build it in gated
> phases under dual QA, and open a PR a human merges. Mechanical gates and a
> human-only approval channel keep autonomous runs honest.

> **Status: 1.1.3.** Live-run visibility and seat discipline from the 1.1.2
> dogfood (#63). Every status view leads with whether the run is working,
> waiting, stuck or done: `es status`, `es watch`, `es runs`, the factory
> dashboard and a TUI footer indicator. Factory seats run in the foreground,
> with one writer per research file. 1.1.2 added `audit.phase`, pipeline A and
> signed run state; 1.1.1 was the security release (bubblewrap for every agent
> shell, the passphrase-sealed Ed25519 human key, terminal-only approvals).
> Install from npm (`@heretek-ai/epistemic-swarm`, `@heretek-ai/es-core`,
> `@heretek-ai/es-cli`); run `es key seal` once.

## Naming

| Name | What it is |
| :--- | :--- |
| **IUMBTEMS** | The project and brand ("I Use My Brain To Express My Self"). Repo: [`Heretek-AI/IUMBTEMS`](https://github.com/Heretek-AI/IUMBTEMS). |
| **Epistemic Swarm** | The technical/product name. npm packages `@heretek-ai/epistemic-swarm`, `@heretek-ai/es-core`, `@heretek-ai/es-cli`. |

## What it does

- **Factory stages, enforced by code.** Grill → Research → Spec → Build ⇄ QA →
  Release runs through a state machine; every `es_*` tool refuses an
  out-of-order step. Approvals (frontier, spec), waivers and trust are human-only,
  signed with the passphrase-sealed Ed25519 human key at a terminal
  (`es key seal` once, then `es approve` / `es trust` / `es waive`); agents
  may request, never grant. The approve/trust/resume RPCs no longer exist:
  the TUI previews, then points at the terminal command.
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
- **Live-run visibility.** `es status`, `es watch` and the factory dashboard
  lead with one plain sentence (working, waiting on you, possibly stuck,
  halted or done), then each seat's state and last activity and the research
  progress. `es runs` lists runs across projects. The TUI footer shows the
  stage and the running seat; headless runs emit `progress` events.
- **OpenCode v2 native.** One plugin registers agents, tools, commands, the
  hook bridge, the LSP runtime and four TUI panels — additively, with no files
  written. Host web results are cached (citable by hash) only for factory
  seats in a project that already has `.factory/`. Claude Code (1.1), Pi (1.2) and Antigravity (1.3) adapters follow,
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

- **Seats require bubblewrap.** Every agent shell and every gate run is
  sandboxed by `bwrap` (user, seat, programmer, readonly and gate kinds;
  cached-web seats are `--unshare-net`). Without `bwrap`, factory seats are
  refused a shell outright and factory gate runs halt; the user's own agents
  fall back to the weaker argv-aware text policy (pattern matching a shell
  can outwit, so that mode is documented as weaker, not equivalent).
- **Control-file baseline.** `verifyControl` hashes the files a human
  authorises — `gates.json`, `config.json`, `frontier.json`, `approvals/**`,
  `waivers/**`; a hand edit is drift until a human accepts it (`es rebaseline`).
  The run state (`.factory/runtime/state.json`) carries a signed sidecar
  (HMAC under the masked engine key): reads refuse a missing or forged seal,
  and only a human re-signs reviewed files (`es reseal --sign`). Everything
  else that is a control file (engine-owned brainstorm, harvest and design
  state, the research evidence, `.git/config`) is deny-write for agents but
  is not individually sealed on every run.
- **Licence detection is strict.** A permissive verdict needs the whole licence
  file to match an SPDX template; mixed, notice-only (e.g. an Apache header
  without the licence text) or concatenated licence files are "unknown" and
  therefore clean-room only. Agents harvest local code only inside the
  project; a human can scan elsewhere with `es harvest scan`.
- **Evals are opt-in and capped.** `bun run evals` needs the opencode CLI
  and `ES_EVAL_MODEL`; each case is one real turn killed at its own step cap
  (bounded by `ES_EVAL_MAX_STEPS`) or once the run's spend, read from the
  stream's `step_finish` cost, passes `ES_EVAL_MAX_USD`. A model with no
  configured price reports $0, so for it only the step caps bound spend.
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

- `SYSTEM_ARCHITECTURE.md` — the factory, the seats and the claim flow.
- `docs/CAPABILITIES.md` — what each harness enforces, with proof references.
- `docs/CONFIG.md` — the layered config (global → project → plugin options).
- `docs/SCHEMAS.md` — every Zod contract as JSON Schema.
- `CHANGELOG.md` — release history and breaking changes.

## License

Apache-2.0.
