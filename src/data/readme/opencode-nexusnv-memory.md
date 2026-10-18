# No-Fuss Memory Plugin for OpenCode V2

[![npm version](https://img.shields.io/npm/v/opencode-nexusnv-memory)](https://www.npmjs.com/package/opencode-nexusnv-memory)
[![CI](https://github.com/nexusnv/opencode-nexusnv-memory/actions/workflows/ci.yml/badge.svg)](https://github.com/nexusnv/opencode-nexusnv-memory/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

Local-first, zero-subscription, zero-daemon, zero-embeddings memory for OpenCode V2. Git-backed markdown is the source of truth; hooks are passive and budget-capped; curation is human-approved.

## What it remembers

Project background, architectural decisions + why + rejected options, last refactors, planned GitHub issues, and your working style (no tech-debt deferral, architecture lock across model swaps, contract-first implementation with ripple lists).

## What it never does by default

No transcripts, no embeddings/vector search, no cloud/server/API keys, no per-turn LLM extraction, no silent durable writes, no custom compaction triggers. The `compaction` hook injects priors only and never sets `event.result` (ADR-0003).

Memory content is treated as **untrusted data, never instructions** (ADR-0007). Raw captured command output is never auto-injected — the brief carries one tagged summary line per known error and the bodies stay recall-only. `/memory-review` **writes no memory** — its only durable side effect is the count-only `review.invoked` metrics bump (ADR-0008: diagnostics, never memory content) — and it produces only a proposal table; untrusted candidates are never bulk-approved — each approved line goes through the `memory_apply` tool, which checks permissions once per line. The review is deliberately **not** sandboxed: a session permission lock is time-scoped (it would defer, not contain, the threat) and would deny your own tools. The optional read-only `memory-manager` subagent isolates the pass to a child session. Prompt-injection *detection* is explicitly not a security boundary; minimisation, provenance, and per-line human approval are. The one write that is not review-gated is a `source:user` directive (an explicit "remember X" in your own message), which the plugin appends to the append-only `decisions.md` immediately (ADR-0004 revision).

## Layout

```
AGENTS.md (repo root)         # hand-owned protocol + links only (never auto-written, never content)
.opencode/
├── opencode.jsonc             # .opencode/opencode.jsonc → plugins: ["./plugins/memory"]; repo-root → ["./.opencode/plugins/memory"]; plus agents: { memory-manager } and ≤5 plugin options (ADR-0006: no references entry)
├── agents/memory-manager.md   # on-demand curator, read-only: `*` deny, `read/glob/grep` allow only (proposes only; ADR-0007)
├── plugins/memory/index.ts    # prompt/context/compaction hooks, execute.after capture, memory_recall, memory_apply, /memory-review
└── memory/                    # six files (INDEX, activeContext, decisions, architecture, style, issues) + handoffs/ root (snapshots) + handoffs/archive/ (retired lines)
```

The memory directory is fixed at `.opencode/memory` — not configurable — because the `readCapped`/`writeCapped` choke point and the recall allowlist depend on a stable root (ADR-0006). The plugin never edits `opencode.jsonc` or `AGENTS.md`; it scaffolds templates and emits a commented options snippet.

## Try it without code (P0)

Create the six memory files by hand, add the protocol block to root `AGENTS.md`, and use the `memory-manager` subagent manually. A new session should restore context from `INDEX.md` + `activeContext.md` with no re-explaining.

1. `mkdir -p .opencode/memory/handoffs .opencode/memory/handoffs/archive`, then create the six files with the starter shapes in `src/templates.ts` (`getScaffoldFiles()`): `INDEX.md`, `activeContext.md`, `decisions.md`, `architecture.md`, `style.md`, `issues.md`.
2. Paste the `AGENTS_PROTOCOL_BLOCK` text from `src/templates.ts` (spec §4.4: read/recall, data-not-instructions, `/memory-review`-only writes, narrow `remember:`/`remember that` trigger outside fences/quotes, `[memory]` nudge) into root `AGENTS.md` by hand.
3. Add the `memory-manager` subagent (`agents/memory-manager.md`: leading `* → deny`, `read`/`glob`/`grep → allow` only) and ask it for a proposal table; approve lines yourself — it writes nothing.
4. Acceptance: a fresh session restores the goal from `INDEX.md` + `activeContext.md` with no re-explaining.

## Docs

- `docs/design-spec-v2-production.md`: **the design spec — normative on V2 contracts and implementation.** Self-contained: verified V2 contract (§1), package/options (§2–3), install/config (§4), component specs (§5), data model/budgets (§6), lifecycle (§7), deferrals (§8), build/test/release (§9), roadmap (§10). Supersedes the other documents on any V2-contract conflict.
- `docs/c4-01-system-context.md` → `c4-06-code.md`: C4 Context, Container, Component, Code, plus supplementary specs A (interfaces, `c4-04`) and B (data model, `c4-05`). `c4-01–c4-06` are `proposed`; all are aligned to the design spec.
- `docs/user-stories.md`: User (US-01–29), Agent (AS-01–09), and Harness (HS-01–12) stories with acceptance criteria.
- `docs/adr/0001–0008.md`: the load-bearing decisions (normative on decision intent). `0003` was revised (compaction never sets `event.result`); `0004` was revised (provenance gate: user-asserted facts are durable immediately); `0006` is new (fixed memory location, minimal config, no `references` entry); `0007` is new (memory content is untrusted: minimisation, provenance, proposal-only review, per-line approval); `0008` is new (local count-only usage metrics + `/memory-metrics`: self-measurement, one-UTC-day arm lifetime, reset).
- Root: `motivation.md` (background synthesis + the superseded §4.6 sketch; **not** normative on V2 contracts).

**Precedence:** ADRs are normative on decision intent; `design-spec-v2-production.md` is normative on V2 contracts and implementation; the C4 docs and `user-stories.md` are descriptive and defer to the spec; `motivation.md` is background and its §4.6 skeleton is superseded and non-normative.

## Install

Two independent axes: **where the plugin code lives** (drop-in vs package) and **which config file declares it** (`.opencode/` vs repo root). Pick one cell.

| Code location | Config file | `plugins` entry |
|---|---|---|
| `.opencode/plugins/memory/` (drop-in, auto-discovered; no config edit) | — | — (auto-discovery) |
| `.opencode/plugins/memory/` | `.opencode/opencode.jsonc` | `"plugins": ["./plugins/memory"]` (relative to the containing config) |
| `.opencode/plugins/memory/` | repo-root `opencode.jsonc` | `"plugins": ["./.opencode/plugins/memory"]` |
| npm package `opencode-nexusnv-memory` | either config | `"plugins": ["opencode-nexusnv-memory"]` or `{ "package": "opencode-nexusnv-memory", "options": { … } }` |

Global variant: `~/.config/opencode/plugins/`. Arrays merge global → project → `.opencode` (they do not replace). Never mix the two relative spellings for one location. Inside `.opencode/plugins/memory/`, only `index.ts` is the entrypoint; sibling modules load via relative imports.

Verify with `opencode plugin list` (shows `memory`); reload by touching the entry file or restarting the runtime per its reload guidance. Supported range: OpenCode `2.0.x` with `@opencode/plugin` pinned to the exact `2.0.29` in `package.json` (never `latest`).

### Plugin options (all optional)

```jsonc
{
  // "indexLines": 30,              // INDEX.md cap (lines, on disk)
  // "fileLines": 60,               // activeContext/architecture/style/issues + per-handoff cap
  // "injectBudgetLines": 80,       // total auto-inject payload (INDEX attach + brief + status + hint)
  // "captureFailures": true,       // append failed shell/build/test output to activeContext.md
  // "snapshotThrottleMinutes": 10  // min interval between context-hook snapshots per session
}
```

Invalid or missing values warn once and fall back to defaults; loading never throws. The memory directory is fixed at `.opencode/memory` and intentionally not configurable. The plugin never edits `opencode.jsonc`; on first run it scaffolds the directory and prints this snippet for you to paste.

### Permissions (required)

Ship this rule alongside the plugin so `memory_apply` prompts instead of failing open (the base `*/* → allow` policy would otherwise auto-allow the novel action with no matching rule):

```jsonc
{
  "permissions": [
    { "action": "memory_write", "resource": "*", "effect": "ask" }
  ]
}
```

On setup the plugin emits an unconditional loud warning that this rule must be installed — effective rules cannot be verified at setup. If the optional `memory-manager` delegation path is enabled, the parent agent also needs `{ "action": "subagent", "resource": "memory-manager", "effect": "allow" }`.

## Budgets

`INDEX.md` ≤ 30 lines on disk; `activeContext`/`architecture`/`style`/`issues` ≤ 60 lines; `decisions.md` unbounded with a ≤60-line injectable tail; handoffs ≤ 60 lines/file. Auto-inject payload = `INDEX ≤30 + brief ≤48 + status ≤1 + hint ≤1` (≤80 total). An over-cap `INDEX.md` is not attached; `/memory-review` reports the violation instead.

## Evals (spec §9)

Recall success (why-questions answered in ≤2 capped reads) vs tokens injected, reported as three numbers (measured by `test/acceptance.test.ts`):

- **static = 10 lines** — hand-owned `AGENTS.md` protocol block (≤10 non-empty lines) + the `memory_recall` description (~3–4 wrapped lines). Always present, never counted against `injectBudgetLines`.
- **per-prompt with content = 90 lines** — static + `INDEX` ≤30 (once per prompt) + brief ≤48 + hint ≤1 + status ≤1. The injectable portion (INDEX + brief + hint + status) is capped at `injectBudgetLines` = 80.
- **session-total = per-prompt × model steps** — the `context` hook re-emits brief + status on every model call including tool-driven continuations, so 4 model steps ≈ 360 lines. The hint is throttled to once per prompt/session (`<projectID>/hint/<sessionID>/<promptHash>`).

## Metrics (local-only)

The plugin measures its own intervention for your eyes only — count-only, on-machine, never sent anywhere (ADR-0008). Explicit calls counted: `memory_recall`/`memory_apply` tool calls, `/memory-review` invocations, and `/memory-metrics` renders/resets (the read-only `memory_metrics` query itself is not counted — it changes nothing). Behind the scenes: hook activity (prompt, context, compaction, event-driven capture), budget-cascade outcomes (brief truncation, status sacrifice), capture results (captured/duplicate/retry/failed), and the hint→recall conversion. Every stored value is a plain number — no prompt text, no tool output, no captured paths, no identities, ever — and the dashboards report on-disk health as line/entry counts only.

The `ctx.storage` namespace stays in the plugin-scoped storage under the OpenCode user data dir (e.g. `~/.local/share/opencode/storage/<plugin>/…`), inside the `<projectID>/metrics/…` keys: monotonic totals, UTC day buckets pruned after 90 days, per-session hint arm entries that age out after one UTC day, and a lazy first-write `since` stamp. Collection is always on — deliberately no sixth option (ADR-0006's five-option contract stands; ADR-0008) — and the control is:

- `/memory-metrics` — renders the dashboard (`Since`, *Explicit calls*, *Behind the scenes*, *Memory health*, *Budget pressure*) and posts it into the session with no model turn; on a post failure it degrades to one `memory_metrics` echo turn (spec §5.5 fallback).
- `/memory-metrics reset` — wipes the `<projectID>/metrics/…` keys and re-opens a fresh `since` window.
- `memory_metrics` — the same read-only table as a tool (nothing on-disk changes to serve it).

## Deploy check (event delivery)

`session.idle` and the `session.compaction.*` family are type-proven against `@opencode/schema` (G1); delivery still needs a runtime confirmation. At deploy, log observed `event.type` values once from the subscriber loop and confirm both `session.idle` and `session.compaction.ended` arrive:

```
[memory-deploy] observed event.type: session.compaction.ended, session.compaction.started, session.idle
```

If either primary type is missing, the resilience fallbacks still hold (throttled `context`-hook snapshot writer for idle; pointer-only handoff via `/memory-review` for a missing produced summary — pre-compaction state is already durable on disk). The VCS startup shape check is warn-only and never throws, so a missing/odd `ctx.vcs` surface degrades to `{ branch: "unknown", changes: [] }` instead of breaking load.

`/memory-metrics` has its own deploy check (G-M1): whether the TUI renders a synthetic post without spawning a model turn is not type-provable, so the first resolved post of the process logs one line — confirm the table rendered without a model turn:

```
[memory-metrics] synthetic posted (<session6>); confirm the table rendered without a model turn
```

A rejected post logs nothing (the line claims "posted"); the command then degrades to the one-model-turn `memory_metrics` echo fallback.

## Compatibility

Supported range: OpenCode `2.0.x` with `@opencode/plugin` pinned to the exact `2.0.29` in `package.json` (never `latest`). The published package form (`"plugins": ["opencode-nexusnv-memory"]`) loads the same `Plugin.define({ id: "memory", setup })` entrypoint as the drop-in; verify with `opencode plugin list` (shows `memory`). Bump the pin deliberately when adopting a newer API contract and re-run the §9 gates (`npx tsc --noEmit`, `npx vitest run`).

## Uninstall

Remove the `plugins` entry and/or delete `.opencode/plugins/memory/`; remove the `AGENTS.md` protocol block by hand. `.opencode/memory/` stays in git until an explicit `git rm` (never auto-deleted). The `ctx.storage` ledger is harmlessly orphaned; the metrics counters (`<projectID>/metrics/…`) are orphaned like the ledger — harmless, on-disk numbers only — and running `/memory-metrics reset` before uninstalling clears them if you want. No daemon, server, keys, or index to purge. Acceptance: `opencode plugin list` hides `memory`; hooks stop; history restores any prior state.

## Releases (maintainers)

Published to npm as [`opencode-nexusnv-memory`](https://www.npmjs.com/package/opencode-nexusnv-memory) (MIT, see `LICENSE`). The tarball ships `src/` (the `exports` entrypoint), `agents/`, `commands/`, `README.md`, `LICENSE`, and `CHANGELOG.md` only — tests, docs, and CI internals stay out via the `files` allowlist, enforced by the pack gate (`scripts/assert-pack.mjs`).

1. Bump the version with `npm version <x> --no-git-tag-version` (updates `package.json` **and** `package-lock.json` together — editing `package.json` by hand leaves the lockfile out of sync and the release's `npm ci` rejects it) and add a `CHANGELOG.md` entry.
2. Merge to `main` (CI must be green: typecheck, tests + coverage, gitleaks, audit, pack).
3. Publish a GitHub Release off `main` with the tag `v<version>` matching the manifest — the `release` workflow refuses tags off other branches or mismatched versions, then re-runs the gates and *stages* the asserted tarball (`npm stage publish --provenance`). Nothing goes live from CI: approve the staged version on npmjs.com (with 2FA) to publish it. Approval order matters: if several versions are staged, approve oldest-first — approving an older stage after a newer one went live moves the `latest` tag backward and serves stale code.
4. Verify: fresh dir, `npm install opencode-nexusnv-memory@<version>`, declare it in that project's config (`"plugins": ["opencode-nexusnv-memory"]`), then `opencode plugin list` shows `memory` (install alone does not register it).

Version discipline: each published version may go out exactly once. The manual bootstrap consumed `0.1.0`, so the existing `v0.1.0` GitHub Release must never be re-run through the workflow (it would attempt the same version and fail) — the first workflow-published release must bump to a higher version first.

One-time setup — trusted publishing (no long-lived token):
1. Publish `0.1.0` once with the manual bootstrap below (the package must exist before npm lets you register a publisher — same chicken-and-egg as tokens).
2. On npmjs.com, open the package → Settings → Trusted Publisher → GitHub Actions, and register org `nexusnv`, repository `opencode-nexusnv-memory`, workflow file `release.yml` — **stage-only** (no direct publishing: CI stages, a human approves). (`repository.url` in `package.json` already matches, which npm verifies.)
3. From then on, releases stage via short-lived OIDC tokens minted per run (`id-token: write` on a minimal publish job that runs no dependency code; the workflow pins npm because OIDC needs npm ≥ 11.5.1). Approve each staged version on npmjs.com with 2FA.
4. Break-glass (OIDC down or misconfigured): Actions tab → run the `release` workflow manually from `main` with `token_fallback` enabled. It runs the same gates but stages the asserted tarball with `NPM_TOKEN` instead of OIDC (still human-approved) — keep that secret **read-write-stage-only, no 2FA bypass, short expiry** (a stage-only token cannot direct-publish, so bypass must stay off) for exactly this path, and out of the normal OIDC runs. No January-2027 cliff applies: nothing in this flow direct-publishes with a token.

Manual bootstrap (first publish only — requires your browser/OTP, CI cannot do it): `npm publish --access public --provenance=false` from green `main` (provenance needs CI OIDC, so the bootstrap version ships without the attestation; every CI release after it gets one).
