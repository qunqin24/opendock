# IUMBTEMS: I Use My Brain To Express My Self

> **Epistemic Swarm** is the product: an AI build factory for OpenCode v2 —
> grill an idea, research it with cited evidence, spec it, build it in gated
> phases under dual QA, and open a PR a human merges. Mechanical gates and a
> human-only approval channel keep autonomous runs honest.

> **Status: 1.6.0.** Phase 5 self-improvement: telemetry harvest
> (`es improve harvest`), distillation into reviewable proposals
> (`es improve distill`), and the self-dogfood factory preset
> (`docs/SELF-DOGFOOD.md`) — runs learn from runs, and the factory builds
> this repo into draft PRs a human reviews (#135–#138). Install from npm
> (`@heretek-ai/epistemic-swarm`, `@heretek-ai/es-core`, `@heretek-ai/es-cli`);
> run `es key seal` once.

## Naming

| Name | What it is |
| :--- | :--- |
| **IUMBTEMS** | The project and brand ("I Use My Brain To Express My Self"). Repo: [`Heretek-AI/IUMBTEMS`](https://github.com/Heretek-AI/IUMBTEMS). |
| **Epistemic Swarm** | The technical/product name. npm packages `@heretek-ai/epistemic-swarm`, `@heretek-ai/es-core`, `@heretek-ai/es-cli`. |

## What it does

- **Factory stages, enforced by code.** Grill → Research → Spec → Build ⇄ QA →
  Release runs through a state machine; every `es_*` tool refuses an
  out-of-order step. Approvals (frontier, spec) are human-only and complete
  in the TUI (masked passphrase dialog, in-process signing), in the browser
  (preview, then passphrase over loopback), or at a terminal
  (`es approve`); waivers and trust stay terminal-only (`es waive`,
  `es trust`), all signed with the passphrase-sealed Ed25519 human key
  (`es key seal` once); agents
  may request, never grant. The approve/trust/resume RPCs no longer exist:
  the TUI signs approvals itself and previews trust/resume for the terminal.
- **Mechanical gates.** Format, lint and typecheck on touched files, affected
  tests from a tree-sitter import graph (runner-native fallback), secret
  scanning, OSV, budgets (diff size, file length, complexity, dependency
  justification, test-with-behaviour), with structured `file:line:rule`
  findings and signed, expiring waivers.
- **Evidence-first research.** Content-addressed source cache, a pure verbatim
  quote verifier, and an epistemic auditor that downgrades ungrounded claims.
  Web sources come through an ordered backend chain (Scraper-Swarm gateway,
  Brave, Firecrawl, SearXNG, direct fetch) with per-backend cooldowns: one
  provider's outage or rate limit fails over to the next, while a safety
  refusal never does. To use the self-hosted gateway, mint a key with scopes
  `search` and `scrape` (`POST /agents/keys` on the panel API) and set
  `ES_SCRAPER_SWARM_URL` and `ES_SCRAPER_SWARM_TOKEN`; the token never leaves
  its `Authorization` header and is masked in seat sandboxes. Deep research
  runs a question adversarially outside the factory flow — thesis, antithesis,
  synthesis to a grounded report (`es research deep "<question>" --output
  <dir> --max-usd N`, or `/research deep` in the TUI). A run renders to
  readable Markdown or a self-contained HTML dossier — tag, status, verbatim
  quote, source and seal per claim (`es research render --format md|html`).
  The signed brief stays human-only (`es research export`).
- **Domain packs.** Pluggable constitutions (quant, biopharma, legal) vet
  research claims: banned domains, mandatory tags, retraction policy and an
  accept threshold on the tier-weighted epistemic score. Every cached source
  is deterministically tiered at ingestion (preprint, peer-reviewed, docs,
  press — sealed with its metadata) and claims inherit the tier, so source
  quality moves the score.
- **Lateral work.** Brainstorm fans out eight divergent lenses into a
  deduplicated, rubric-scored shortlist with a forced outlier — callable by
  the grill and the factory at depth 1, with the shortlist back as JSON; darkharvest
  tears down competitor projects with fail-closed SPDX detection, per-field
  provenance and clean-room specs, plus a callable verdict check for the
  grill, the factory and the scout; queereye interviews you into a
  contrast-gated DTCG token system with a generated style guide.
- **Self-improvement.** `es improve harvest` aggregates runs and evals into
  one versioned, secret-scrubbed telemetry dataset (read-only; a broken
  audit chain is reported, never repaired), and `es improve distill`
  clusters recurring failures into reviewable proposals — prompt guidance
  (a version-bumped patch), gate tuning (an explanation only; gates.json
  stays a human-applied control file) and domain-pack candidates
  (schema-validated). A "code disposes" gate drops proposals whose
  evidence is not verbatim or whose model numerals the telemetry never
  recorded; nothing is applied automatically, and `--open-pr` (human-run)
  puts the proposals on a topic branch as a draft PR. The `self-dogfood`
  factory preset builds this repo from an issue into a draft PR against
  `rewrite` (see `docs/SELF-DOGFOOD.md`).
- **Live-run visibility.** `es status`, `es watch` and the factory dashboard
  lead with one plain sentence (working, waiting on you, possibly stuck,
  halted or done), then each seat's state and last activity and the research
  progress. `es runs` lists runs across projects. The TUI footer shows the
  stage and the running seat; headless runs emit `progress` events.
  `es-fleet web` opens the same fleet in a browser: dashboard, browser
  approvals, a preview-only config editor, and the evidence explorer
  (claim graph, range-highlighted quotes, seal status, dossier exports).
  `es-fleet` is private, never published to npm — run it from a checkout
  (`bun packages/fleet/bin/es-fleet.js …`).
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
| `packages/fleet` | The `es-fleet` daemon (private): concurrent task DAGs in isolated worktrees. |
| `packages/web` | The web control plane (private, never published): dashboard, browser approvals, config editor, evidence explorer — SolidJS, served by `es-fleet` on loopback. |
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
- **MCP caller identity is pinned.** Over the stdio MCP server the calling agent's
  identity comes from the adapter's environment (`ES_MCP_AGENT`, else the legacy
  `ES_AGENT` default) — one server per agent, set in the human-written adapter
  config — and the model-supplied `agent` argument is ignored. Without an adapter
  identity the caller is `mcp`, which maps to no seat, so every seat-checked tool
  refuses. There is no MCP tool for approvals, trust, waivers or resume.

## Upgrading from 0.7

The 0.7-era plugin options `search_engine`, `max_iterations` and `mode` were
removed in 1.0. A config that still carries them loads, but warns once:
`Ignored unknown plugin options: …`. Delete those keys; a clean `plugins`
entry only needs `models` per tier:

```json
{
  "package": "@heretek-ai/epistemic-swarm",
  "options": {
    "models": {
      "deep": "<provider>/<model>",
      "balanced": "<provider>/<model>",
      "fast": "<provider>/<model>"
    }
  }
}
```

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
