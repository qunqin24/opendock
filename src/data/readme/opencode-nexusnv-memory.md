# No-Fuss Memory Plugin for OpenCode V2

[![npm version](https://img.shields.io/npm/v/opencode-nexusnv-memory)](https://www.npmjs.com/package/opencode-nexusnv-memory)
[![CI](https://github.com/nexusnv/opencode-nexusnv-memory/actions/workflows/ci.yml/badge.svg)](https://github.com/nexusnv/opencode-nexusnv-memory/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

Local-first, zero-subscription, zero-daemon, zero-embeddings memory for OpenCode V2. Git-backed markdown is the source of truth; hooks are passive and budget-capped; curation is human-approved.

## What it remembers

Project background, architectural decisions + why + rejected options, last refactors, planned GitHub issues, and your working style (no tech-debt deferral, architecture lock across model swaps, contract-first implementation with ripple lists).

Explicit lifecycle: `/memory-forget` removes a chosen line/block or a whole active file only after a dry-run, per-unit approval, and an archive copy; `/memory-gc` prunes root handoff snapshots only, dry-run by default, and never touches `handoffs/archive/`. Both are user-invoked commands; there is no model-facing delete tool (ADR-0009).

## What it never does by default

No transcripts, no embeddings/vector search, no cloud/server/API keys, no per-turn LLM extraction, no silent durable writes, no custom compaction triggers. The `compaction` hook injects priors only and never sets `event.result` (ADR-0003).

Memory content is treated as **untrusted data, never instructions** (ADR-0007). Raw captured command output is never auto-injected — the brief carries one tagged summary line per known error and the bodies stay recall-only. `/memory-review` **writes no memory** — its only durable side effect is the count-only `review.invoked` metrics bump (ADR-0008: diagnostics, never memory content) — and it produces only a proposal table; untrusted candidates are never bulk-approved — each approved line goes through the `memory_apply` tool, which checks permissions once per line. The review is deliberately **not** sandboxed: a session permission lock is time-scoped (it would defer, not contain, the threat) and would deny your own tools. The optional read-only `memory-manager` subagent isolates the pass to a child session. Prompt-injection _detection_ is explicitly not a security boundary; minimisation, provenance, and per-line human approval are. The one write that is not review-gated is a `source:user` directive (an explicit "remember X" in your own message), which the plugin appends to the append-only `decisions.md` immediately (ADR-0004 revision).

## Layout

```
AGENTS.md (repo root)         # hand-owned protocol + links only (never auto-written, never content)
.opencode/
├── opencode.jsonc             # .opencode/opencode.jsonc → plugins: ["./plugins/memory"]; repo-root → ["./.opencode/plugins/memory"]; plus agents: { memory-manager } and ≤5 plugin options (ADR-0006: no references entry)
├── agents/memory-manager.md   # on-demand curator, read-only: `*` deny, `read/glob/grep` allow only (proposes only; ADR-0007)
├── plugins/memory/index.ts    # hooks, execute.after capture, memory_recall/search/apply/metrics/status tools, /memory-review/metrics/status/forget/gc commands
└── memory/                    # six files (INDEX, activeContext, decisions, architecture, style, issues) + handoffs/ root (snapshots) + handoffs/archive/ (retired lines)
```

The memory directory is fixed at `.opencode/memory` — not configurable — because the `readCapped`/`writeCapped` choke point and the recall allowlist depend on a stable root (ADR-0006). The plugin never edits `opencode.jsonc` or `AGENTS.md`; it scaffolds templates and emits a commented options snippet.

## Quickstart (5 minutes)

1. Install the plugin using one row of the [Install](#install) matrix, then restart/reload OpenCode.
2. Add the required `memory_write → ask` rule from [Permissions](#permissions-required) to the same `opencode.jsonc` — without it, per-line approval fails open.
3. Paste the protocol block printed on first run (or from `AGENTS_PROTOCOL_BLOCK` in `src/templates.ts`) into root `AGENTS.md`.
4. Run `/memory-status` and fix every action it lists.
5. Use `/memory-metrics` to see the local count-only dashboard; nothing leaves the machine.

First run scaffolds `.opencode/memory/` and prints that checklist once. The plugin never edits `opencode.jsonc` or `AGENTS.md`.

## Try it without code (P0)

Create the six memory files by hand, add the protocol block to root `AGENTS.md`, and use the `memory-manager` subagent manually. A new session should restore context from `INDEX.md` + `activeContext.md` with no re-explaining.

1. `mkdir -p .opencode/memory/handoffs .opencode/memory/handoffs/archive`, then create the six files with the starter shapes in `src/templates.ts` (`getScaffoldFiles()`): `INDEX.md`, `activeContext.md`, `decisions.md`, `architecture.md`, `style.md`, `issues.md`.
2. Paste the `AGENTS_PROTOCOL_BLOCK` text from `src/templates.ts` (spec §4.4: read/recall, data-not-instructions, `/memory-review`-only writes, narrow `remember:`/`remember that` trigger outside fences/quotes, `[memory]` nudge) into root `AGENTS.md` by hand.
3. Add the `memory-manager` subagent (`agents/memory-manager.md`: leading `* → deny`, `read`/`glob`/`grep → allow` only) and ask it for a proposal table; approve lines yourself — it writes nothing.
4. Acceptance: a fresh session restores the goal from `INDEX.md` + `activeContext.md` with no re-explaining.

## Docs

- `docs/design-spec-v2-production.md`: **the design spec — normative on V2 contracts and implementation.** Self-contained: verified V2 contract (§1), package/options (§2–3), install/config (§4), component specs (§5), data model/budgets (§6), lifecycle (§7), deferrals (§8), build/test/release (§9), roadmap (§10). Supersedes the other documents on any V2-contract conflict.
- `docs/c4-01-system-context.md` → `c4-06-code.md`: C4 Context, Container, Component, Code, plus supplementary specs A (interfaces, `c4-04`) and B (data model, `c4-05`). `c4-01–c4-06` are `proposed`; all are aligned to the design spec.
- `docs/user-stories.md`: User (US-01–32), Agent (AS-01–09), and Harness (HS-01–13) stories with acceptance criteria.
- `docs/adr/0001–0010.md`: the load-bearing decisions (normative on decision intent). `0003` was revised (compaction never sets `event.result`); `0004` was revised (provenance gate: user-asserted facts are durable immediately; ledger retention for attempts/hints/snapshot/throttle; status/hint moved to prompt-tail notices); `0006` is new (fixed memory location, minimal config, no `references` entry); `0007` is new (memory content is untrusted: minimisation, provenance, proposal-only review, per-line approval; prompt-tail placement); `0008` is new (local count-only usage metrics + `/memory-metrics`: self-measurement, one-UTC-day arm lifetime, two-step `reset confirm`); `0009` is new (explicit forget + opt-in handoff GC, logical-not-physical); `0010` is new (same-host PID/claim lock + atomic publish).
- Root: `motivation.md` (background synthesis + the superseded §4.6 sketch; **not** normative on V2 contracts).

**Precedence:** ADRs are normative on decision intent; `design-spec-v2-production.md` is normative on V2 contracts and implementation; the C4 docs and `user-stories.md` are descriptive and defer to the spec; `motivation.md` is background and its §4.6 skeleton is superseded and non-normative.

## Install

Two independent axes: **where the plugin code lives** (drop-in vs package) and **which config file declares it** (`.opencode/` vs repo root). Pick one cell.

| Code location                                                          | Config file                | `plugins` entry                                                                                          |
| ---------------------------------------------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------- |
| `.opencode/plugins/memory/` (drop-in, auto-discovered; no config edit) | —                          | — (auto-discovery)                                                                                       |
| `.opencode/plugins/memory/`                                            | `.opencode/opencode.jsonc` | `"plugins": ["./plugins/memory"]` (relative to the containing config)                                    |
| `.opencode/plugins/memory/`                                            | repo-root `opencode.jsonc` | `"plugins": ["./.opencode/plugins/memory"]`                                                              |
| npm package `opencode-nexusnv-memory`                                  | either config              | `"plugins": ["opencode-nexusnv-memory"]` or `{ "package": "opencode-nexusnv-memory", "options": { … } }` |

Global variant: `~/.config/opencode/plugins/`. Arrays merge global → project → `.opencode` (they do not replace). Never mix the two relative spellings for one location. Inside `.opencode/plugins/memory/`, only `index.ts` is the entrypoint; sibling modules load via relative imports.

Verify with `opencode plugin list` (shows `memory`); reload by touching the entry file or restarting the runtime per its reload guidance. Supported range: OpenCode `2.0.x` with `@opencode/plugin` pinned to the exact `2.0.29` in `package.json` (never `latest`).

### Plugin options (all optional)

```jsonc
{
  // "indexLines": 30,              // INDEX.md cap (lines, on disk)
  // "fileLines": 60,               // activeContext/architecture/style/issues + per-handoff cap
  // "injectBudgetLines": 80,       // total injectable payload (INDEX attach + brief + prompt notices)
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
    { "action": "memory_write", "resource": "*", "effect": "ask" },
  ],
}
```

On first run the plugin emits one consolidated install checklist (this rule, the `AGENTS.md` protocol block, the commented options snippet, and a `/memory-status` pointer); later setups keep the unconditional loud warning that this rule must be installed — effective rules cannot be verified at setup. If the optional `memory-manager` delegation path is enabled, the parent agent also needs `{ "action": "subagent", "resource": "memory-manager", "effect": "allow" }`.

## Budgets

`INDEX.md` ≤ 30 lines on disk; `activeContext`/`architecture`/`style`/`issues` ≤ 60 lines; `decisions.md` unbounded with a ≤60-line injectable tail; root handoffs ≤ 60 lines/file (archive writes are uncapped for preservation; archive reads are recall-capped). Per-model-call system prefix: stable brief ≤47 lines (loader max 48; dynamic cap 47 at defaults). Per-prompt canonical input: INDEX ≤30 + brief ≤47 + volatile notices ≤3 = ≤80 injectable lines. The handoff pointer, status, and hint are prompt-tail data, appended once and marker-guarded. The one hint slot is either the INDEX tell-tale or the fixed `remember:` near-miss nudge — still exactly one line, so the measured budget is unchanged. An over-cap `INDEX.md` is not attached (the prompt-tail `[memory]` status line reports that it is over the line cap or too large to inspect, until trimmed); `/memory-review` reports the violation instead. A failure capture whose append is rejected (activeContext at cap without a rotatable Known-errors block, or a file I/O error) is reported on the status line too — fix the file or run `/memory-review`. When the budget cannot carry the status line, its notices stay queued for the next turn.

Handoffs are listed names-only via `memory_recall` (`file: "handoffs"` newest first; `file: "handoffs/archive"` for rotated/archived entries) — recall one by its full `handoffs/…` path.

## Concurrency

One root-level lock (`.opencode/memory/.write.lock`) plus atomic publish keep two OpenCode host processes from interleaving a read-modify-write cycle (ADR-0010).

- The lock file contains the holder PID. A second writer waits at most **5 s**, then fails with `[memory] another OpenCode process is writing memory (...)` instead of silently dropping a write. Retry is safe.
- A stale PID (or a malformed/empty lock after a 2 s grace) is reclaimed through `.write.lock.claim`, which is itself exclusive-create; only the same stale record is removed.
- Overwrites publish via a same-directory temp file + `rename`; new files and handoffs via temp + `link` (no overwrite). Readers see the old or new complete file, never a partial one.
- Existing ancestor paths are containment-checked (`lstat` + real path under the memory root) before `mkdir`/publish/delete; handoff/archive parents must be canonical, so a symlink alias fails closed. Lock and temp files are never allowlisted or auto-injected. A hard crash may leave a `.tmp-*`; it is ignored and not automatically swept (a sweep could delete a live writer's temp).
- Supported contract: **one host, one PID namespace, a local filesystem.** NFS/SMB, multiple hosts, containers sharing a volume without a shared PID namespace, PID reuse, and power-loss durability (`fsync` is not performed) are not claimed.

## Lifecycle commands

Both commands are **user-invoked**, dry-run by default, and require `--confirm` to mutate. Neither adds a sixth config option, and neither is exposed as a model-callable tool.

- `/memory-forget <file> [--line N | --match TEXT | --all] [--confirm] [--reason TEXT]` — previews the exact redacted text and selector. On `--confirm`, every unit gets one `memory_write` permission prompt; approved text is archived to `handoffs/archive/forgotten-<stamp>.md` before the active file is rewritten. `decisions.md` (append-only) and handoffs (immutable) are rejected; archive is never purged. If the file changes while approval is pending, the command aborts and asks for a fresh dry-run. This is **logical forgetting, not secure erasure**: git history, backups, clones, and editor caches may retain the text, so rotate any exposed secret. Removing a line from `architecture.md`/`style.md`/`issues.md` does not infer INDEX cleanup; the output names the exact `/memory-forget INDEX.md --line N --confirm` follow-up.
- `/memory-gc [--older-than DAYS] [--keep N] [--confirm]` — targets root `handoffs/*.md` only; both flags together mean "older than DAYS **and** outside the newest N". On `--confirm`, one batch permission prompt covers the candidate list, then the set is re-listed and re-planned under the lock; if it changed, the batch aborts. Deletion is irreversible on this machine and untracked snapshots cannot be recovered from git. `handoffs/archive/` is never touched; there is no automatic sweep, TTL, or background job.

Successful forgets queue a transient `notice.forgotten` status fact; the next prompt reports that content is archived and may persist in git history/backups.

## Tools and commands

All five tools are read-only unless noted; commands are registered server-side and need no model turn for their primary output.

### Tools

- `memory_recall({ file })` — the primary, capped read channel. Allowlisted structural files + individual handoff/archive paths; `file: "handoffs"` / `"handoffs/archive"` list names only. Unknown/traversal paths reject; content is capped and redacted.
- `memory_apply({ candidates })` — the only write channel for approved review lines (per-line `memory_write → ask`; `candidates: []` is the reviewed-nothing signal).
- `memory_metrics()` — the read-only count dashboard (same table as `/memory-metrics`; no content, no model turn).
- `memory_search({ query, file?, maxResults?, caseSensitive? })` — exact **literal** grep across the full allowlist, including the `decisions.md` tail that capped recall drops and archived handoffs. Case-insensitive by default; `maxResults` 20 default / 50 max; 200-candidate cap and 1 MB per-file guard; redacted; deterministic structural → handoffs → archive order. No counters or writes; results are untrusted data and are never auto-injected. No FTS, embeddings, or fuzzy matching.
- `memory_status()` — the read-only install/health report (same report as `/memory-status`): scaffold, INDEX attachability, AGENTS.md block, advisory `memory_write → ask` scan, optional `memory-manager`, capture activity, budgets, and next actions. Writes nothing.

### Commands

- `/memory-review [scope]` — proposal-only review; writes no memory until you approve lines through `memory_apply`.
- `/memory-metrics [reset | reset confirm]` — posts the count-only dashboard via `ctx.session.synthetic` (no model turn); bare `reset` shows a confirmation notice without wiping, `reset confirm` wipes `<projectID>/metrics/…`.
- `/memory-status` — posts the read-only install/health report via `ctx.session.synthetic` (no model turn); on a post failure it falls back to one `memory_status` echo turn. Nothing is written and no counter is bumped.
- `/memory-forget` — user-invoked logical forget; dry-run by default, `--confirm` archives then rewrites. See [Lifecycle commands](#lifecycle-commands).
- `/memory-gc` — user-invoked root-handoff cleanup; dry-run by default, `--confirm` after one batch approval. See [Lifecycle commands](#lifecycle-commands).

## Evals (spec §9)

Recall success (why-questions answered in ≤2 capped reads) vs tokens injected, reported as three numbers (measured by `test/acceptance.test.ts`):

- **static = 16 lines** — hand-owned `AGENTS.md` protocol block (6 non-empty lines; test-bounded at ≤10) + the `memory_recall` description (5 wrapped lines at 80 cols) + the `memory_search` description (5 wrapped lines). Utility tool descriptions are excluded, as before. Always present, never counted against `injectBudgetLines`.
- **per-prompt with content = 96 lines** — static + `INDEX` ≤30 (once per prompt) + brief ≤47 + prompt notices ≤3. The injectable portion (INDEX + brief + notices) is capped at `injectBudgetLines` = 80.
- **session-total = 237 lines at 4 model steps** — `16 + 30 + 3 + 47×4`: the brief re-emits per model call (including tool-driven continuations), while INDEX and notices attach once per prompt. The hint is throttled to once per prompt/session (`<projectID>/hint/<sessionID>/<promptHash>`). These are **uncached line-count guardrails, not billed-token or cache-savings claims**. Provider cache measurement is documented in `docs/2026-10-20-e8-cache-placement-spike.md` and is not run in CI.

## Metrics (local-only)

The plugin measures its own intervention for your eyes only — count-only, on-machine, never sent anywhere (ADR-0008). Explicit calls counted: `memory_recall`/`memory_apply` tool calls, `/memory-review` invocations, and `/memory-metrics` renders/resets (the read-only `memory_metrics` query itself is not counted — it changes nothing). Behind the scenes: hook activity (prompt, context, compaction, event-driven capture), budget-cascade outcomes (brief truncation, status sacrifice), capture results (captured/duplicate/retry/failed), and the hint→recall conversion. Every stored value is a plain number — no prompt text, no tool output, no captured paths, no identities, ever — and the dashboards report on-disk health as line/entry counts only. Counter rows also carry a fixed human-readable `meaning` column (`METRIC_LABELS`, display furniture only). `memory_search` and `/memory-status`/`memory_status` are read-only and are not counted — searching or checking status never changes the numbers.

The `ctx.storage` namespace stays in the plugin-scoped storage under the OpenCode user data dir (e.g. `~/.local/share/opencode/storage/<plugin>/…`), inside the `<projectID>/metrics/…` keys: monotonic totals, UTC day buckets pruned after 90 days, per-session hint arm entries that age out after one UTC day, and a lazy first-write `since` stamp. The capture ledger is bounded too: `seen` is capped at 500, and aged attempts (30s), hint throttles (7 days), and snapshot/throttle stamps (30 days) are pruned by the same once-per-UTC-day housekeeping pass — snapshot values are stored as `{ hash, at }` (legacy bare hashes are normalized out on the first prune). Collection is always on — deliberately no sixth option (ADR-0006's five-option contract stands; ADR-0008) — and the control is:

- `/memory-metrics` — renders the dashboard (`Since`, _Explicit calls_, _Behind the scenes_, _Memory health_, _Budget pressure_) and posts it into the session with no model turn; on a post failure it degrades to one `memory_metrics` echo turn (spec §5.5 fallback).
- `/memory-metrics reset` — shows the dashboard plus a confirmation notice; **nothing is wiped**.
- `/memory-metrics reset confirm` — wipes the `<projectID>/metrics/…` keys and re-opens a fresh `since` window.
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

Run `/memory-status` (or call `memory_status`) in a fresh session and confirm every check row is present: memory directory, INDEX attachability, AGENTS.md protocol block, `memory_write -> ask` rule, `memory-manager` agent, and capture activity. Fix the listed next actions before relying on memory; the config scan is advisory and says so.

## Compatibility

Supported range: OpenCode `2.0.x` with `@opencode/plugin` pinned to the exact `2.0.29` in `package.json` (never `latest`). The published package form (`"plugins": ["opencode-nexusnv-memory"]`) loads the same `Plugin.define({ id: "memory", setup })` entrypoint as the drop-in; verify with `opencode plugin list` (shows `memory`). Bump the pin deliberately when adopting a newer API contract and re-run the §9 gates (`npx tsc --noEmit`, `npx vitest run`).

## Uninstall

Remove the `plugins` entry and/or delete `.opencode/plugins/memory/`; remove the `AGENTS.md` protocol block by hand. `.opencode/memory/` stays in git until an explicit `git rm` (never auto-deleted). The `ctx.storage` ledger is harmlessly orphaned; the metrics counters (`<projectID>/metrics/…`) are orphaned like the ledger — harmless, on-disk numbers only — and running `/memory-metrics reset confirm` before uninstalling clears them if you want. Status and search add no state: they write nothing and introduce no storage keys, so there is nothing extra to purge. No daemon, server, keys, or index to purge. Acceptance: `opencode plugin list` hides `memory`; hooks stop; history restores any prior state.

## Releases (maintainers)

Published to npm as [`opencode-nexusnv-memory`](https://www.npmjs.com/package/opencode-nexusnv-memory) (MIT, see `LICENSE`). The tarball ships `src/` (the `exports` entrypoint), `agents/`, `commands/`, `README.md`, `LICENSE`, and `CHANGELOG.md` only — tests, docs, and CI internals stay out via the `files` allowlist, enforced by the pack gate (`scripts/assert-pack.mjs`).

1. Bump the version with `npm version <x> --no-git-tag-version` (updates `package.json` **and** `package-lock.json` together — editing `package.json` by hand leaves the lockfile out of sync and the release's `npm ci` rejects it) and add a `CHANGELOG.md` entry.
2. Merge to `main` (CI must be green: typecheck, tests + coverage, gitleaks, audit, pack).
3. Publish a GitHub Release off `main` with the tag `v<version>` matching the manifest — the `release` workflow refuses tags off other branches or mismatched versions, then re-runs the gates and _stages_ the asserted tarball (`npm stage publish --provenance`). Nothing goes live from CI: approve the staged version on npmjs.com (with 2FA) to publish it. Approval order matters: if several versions are staged, approve oldest-first — approving an older stage after a newer one went live moves the `latest` tag backward and serves stale code.
4. Verify: fresh dir, `npm install opencode-nexusnv-memory@<version>`, declare it in that project's config (`"plugins": ["opencode-nexusnv-memory"]`), then `opencode plugin list` shows `memory` (install alone does not register it).

Version discipline: each published version may go out exactly once. The manual bootstrap consumed `0.1.0`, so the existing `v0.1.0` GitHub Release must never be re-run through the workflow (it would attempt the same version and fail) — the first workflow-published release must bump to a higher version first.

One-time setup — trusted publishing (no long-lived token):

1. Publish `0.1.0` once with the manual bootstrap below (the package must exist before npm lets you register a publisher — same chicken-and-egg as tokens).
2. On npmjs.com, open the package → Settings → Trusted Publisher → GitHub Actions, and register org `nexusnv`, repository `opencode-nexusnv-memory`, workflow file `release.yml` — **stage-only** (no direct publishing: CI stages, a human approves). (`repository.url` in `package.json` already matches, which npm verifies.)
3. From then on, releases stage via short-lived OIDC tokens minted per run (`id-token: write` on a minimal publish job that runs no dependency code; the workflow pins npm because OIDC needs npm ≥ 11.5.1). Approve each staged version on npmjs.com with 2FA.
4. Break-glass (OIDC down or misconfigured): Actions tab → run the `release` workflow manually from `main` with `token_fallback` enabled. It runs the same gates but stages the asserted tarball with `NPM_TOKEN` instead of OIDC (still human-approved) — keep that secret **read-write-stage-only, no 2FA bypass, short expiry** (a stage-only token cannot direct-publish, so bypass must stay off) for exactly this path, and out of the normal OIDC runs. No January-2027 cliff applies: nothing in this flow direct-publishes with a token.

Manual bootstrap (first publish only — requires your browser/OTP, CI cannot do it): `npm publish --access public --provenance=false` from green `main` (provenance needs CI OIDC, so the bootstrap version ships without the attestation; every CI release after it gets one).
