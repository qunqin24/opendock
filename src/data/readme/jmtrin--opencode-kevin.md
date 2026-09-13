<div align="center">

# ⚡ Kevin

```
╔══════════════════════════════════════════════╗
║                                              ║
║   ██╗  ██╗███████╗██╗   ██╗██╗███╗   ██╗     ║
║   ██║ ██╔╝██╔════╝██║   ██║██║████╗  ██║     ║
║   █████╔╝ █████╗  ██║   ██║██║██╔██╗ ██║     ║
║   ██╔═██╗ ██╔══╝  ╚██╗ ██╔╝██║██║╚██╗██║     ║
║   ██║  ██╗███████╗ ╚████╔╝ ██║██║ ╚████║     ║
║   ╚═╝  ╚═╝╚══════╝  ╚═══╝  ╚═╝╚═╝  ╚═══╝     ║
║                                              ║
║        Local-First Memory for OpenCode       ║
║                                              ║
╚══════════════════════════════════════════════╝
```

### Local-first memory for OpenCode — it observes, learns, remembers and proves it.

**Kevin watches. Kevin learns. Kevin remembers.**

It turns every coding session into durable, confidence-scored knowledge,
injects exactly what matters back into the model's context, curates the best
of it into files you control, and shares it across a team through one
git-friendly file — deterministically, locally, with zero network calls.

![version](https://img.shields.io/badge/version-2.2.1-blue)
![node](https://img.shields.io/badge/node-%E2%89%A522.5-green)
![tests](https://img.shields.io/badge/tests-1538%20passing-brightgreen)
![deps](https://img.shields.io/badge/runtime%20deps-1-orange)
![network](https://img.shields.io/badge/network-zero-black)
![license](https://img.shields.io/badge/license-MIT-lightgrey)

</div>

<!-- uncomment when docs/demo.gif lands
![demo](docs/demo.gif)
-->

> **AI agents are good at solving problems. Kevin makes sure they don't have to solve the same problem twice.**

---

## 📖 Contents

- [Why Kevin](#-why-kevin)
- [The Kevin loop](#-the-kevin-loop)
- [Quick start](#-quick-start)
- [What's new in 2.2.1 — Docs sync](#-whats-new-in-221--docs-sync)
- [What's new in 2.2.0 — Harbor](#-whats-new-in-220--harbor)
- [What's new in 2.1.0 — Relay](#-whats-new-in-210--relay)
- [What's new in 2.0.0 — Commonwealth](#-whats-new-in-200--commonwealth)
- [What's new in 1.5.0 — Diaspora](#-whats-new-in-150--diaspora)
- [What's new in 1.4.0 — Bridge](#-whats-new-in-140--bridge)
- [What's new in 1.3.0 — Bedrock](#-whats-new-in-130--bedrock)
- [What's new in 1.2.0 — Surface](#-whats-new-in-120--surface)
- [What's new in 1.1.0 — Drift](#-whats-new-in-110--drift)
- [What's new in 1.0.0](#-whats-new-in-100)
- [How it works](#-how-it-works)
- [The 27 tools (plugin) + 11 MCP tools](#-the-27-tools-plugin--11-mcp-tools)
- [MCP Bridge — cross-harness memory](#-mcp-bridge--cross-harness-memory)
- [The benchmark: proven, not promised](#-the-benchmark-proven-not-promised)
- [Curation: from session noise to AGENTS.md](#-curation-from-session-noise-to-agentsmd)
- [Team sharing: one file, zero servers](#-team-sharing-one-file-zero-servers)
- [The contract](#-the-contract)
- [Hooks & latency budgets](#-hooks--latency-budgets)
- [Configuration](#%EF%B8%8F-configuration)
- [Supported runtimes](#-supported-runtimes)
- [Design & trust](#-design--trust)
- [Development](#-development)
- [License](#-license)

---

## 🤔 Why Kevin

Every coding session produces experience — errors, fixes, decisions,
conventions, lessons. Without memory, most of it evaporates when the context
window closes: the next session starts near zero and walks straight into the
same wall.

Kevin closes that loop:

| 🔍 Observe | 🧠 Learn | 🎯 Recall | ✍️ Curate | 👥 Share | 📏 Prove |
|---|---|---|---|---|---|
| Tool calls, chat messages, session signals | Failures become lessons, causal chains, patterns | Relevant knowledge ranked and injected inside a token budget | The best knowledge becomes human-approved `AGENTS.md` guidance | Curated knowledge travels through one git-friendly file | Latency and retrieval quality are measured, not assumed |

**Local first, by design.** Your coding experience belongs to you:

```
no cloud service · no telemetry · no network calls · no hidden write path
```

Knowledge lives in a local SQLite database, is projected into files you
control, and is shared — optionally — through a single file you can read,
diff and review like code.

---

## 🔁 The Kevin loop

```
        CODING SESSION
              │
              ▼
       🔍 OBSERVE ────── tool calls, chat signals, failures
              │
              ▼
        🧠 LEARN ─────── lessons, causal chains, patterns
              │
              ▼
       💾 REMEMBER ───── confidence · provenance · recurrence
              │
              ▼
        🎯 RECALL ────── rank → gates → token budget
              │
              ▼
      MODEL CONTEXT ──── only what matters now
              │
              ▼
       ✍️ CURATE ─────── propose → HUMAN review → approve
              │
              ▼
         AGENTS.md
              │
              ▼
        NEXT SESSION ─────────────────▶ 🔁
```

**Experience compounds instead of evaporating.**

---

## 🚀 Quick start

### 1. Declare the plugin

```jsonc
// opencode.json
{
  "plugin": ["@jmtrin/opencode-kevin"]
}
```

```bash
npm install @jmtrin/opencode-kevin
```

### 2. Restart OpenCode

On first boot Kevin migrates its database to schema version `015` and starts
observing. Nothing else is required.

### 3. Talk to it

```
kevin_status    → is everything healthy?
kevin_why       → why did this keep failing, and how was it fixed?
kevin_query     → what does Kevin remember about X?
kevin_doctor    → health report: hooks, deps, perf, verdict
```

### 4. Where data lives

```
~/.opencode-kevin/
├── kevin.db            ← everything Kevin learns (SQLite, WAL)
├── skills/             ← generated pull channels
├── refs/               ← topic reference bundles
└── tui/
    ├── proposals.json  ← pending proposals projection (512 KiB cap)
    ├── conflicts.json  ← open conflicts projection
    ├── health.json     ← doctor+perf snapshot
    ├── meta.json       ← {generatedAt, versions}
    ├── dashboard.html  ← static review surface (file://, zero network)
    ├── actions.json    ← mailbox queue (TUI panels → session.idle)
    └── results.json    ← last action results (audit)

<repo>/.kevin/
├── AGENTS.md           ← curated knowledge (marker block, human-approved)
├── knowledge.okf       ← single-file when okf_write_version='2' (opt-in, legacy)
└── knowledge/          ← sharded dir when okf_write_version='3' (default): knowledge.okf (primary ≤2000) + knowledge-002.okf …
```

---

## 🆕 What's new in 2.2.1 — "Docs sync"

> 2.2.1 syncs the paper trail — no behavior change.

- 📄 **READMEs synced** — version badges → `2.2.1` (+ tests badge → `1538 passing`) in root + all 4 packages; "What's new" TOC + sections backfilled (2.1.0 Relay, 2.2.0 Harbor) in core/tui/plugin READMEs; stale `Upgrade` pins refreshed; mcp README version header + publish-order pin refreshed.
- 📒 **Package CHANGELOGs revived** — `packages/core/CHANGELOG.md` + `packages/plugin/CHANGELOG.md` gain 2.0.0/2.1.0/2.2.0 backfill entries + 2.2.1 (were stopped at 1.5.0).
- 🔢 **Version bookkeeping** — `2.2.1` across root + 4 packages (+ exact cross-pins), lockfile re-synced, `KEVIN_VERSION 2.2.1`. No migration, no contract change (C-07 stays `016`), no new tools/settings/metrics.

**Upgrade:** `npm i @jmtrin/kevin-core@2.2.1 @jmtrin/opencode-kevin@2.2.1 @jmtrin/opencode-kevin-tui@2.2.1 @jmtrin/kevin-mcp@2.2.1` — DB already at `016`, nothing migrates.

---

## 🆕 What's new in 2.2.0 — "Harbor"

> 2.2.0 docks — the plugin loads and every Desktop instance belongs to its project.

- 🔌 **Loadable entrypoint (K22-002)** — the plugin `main` exports only the `KevinPlugin` factory; public metadata (`KEVIN_CONFIG_KEYS`, `REMOVED_SETTINGS`, `ERROR_LESSON_MODE_VALUES`, `KEVIN_VERSION`, `performRekey`) moved to the additive `./config` subpath (`@jmtrin/opencode-kevin/config`). Fixes v2.1.0 never registering its tools (`Plugin export is not a function`); new loader-contract test + `verify-pack` property 8 guard it.
- 🏠 **Per-instance identity (K22-004)** — every project directory resolves its own `project_id`/`repo_id` under OpenCode Desktop (was: every instance shared the server home); CLI single-project mode byte-identical; `kevin_export` isolation proven per project.
- 🧾 **Truthful seeds and counts (K22-005/K22-006)** — migration `016` seeds the MCP trio so fresh `kevin_config list` shows all 44 keys; `kevin_status.tool_count` derives from the live tool map (27).
- 📦 **Migration `016`** — schema `015→016`, additive seeds only. See `docs/MIGRATION_2.2.0.md`.

**Upgrade:** `npm i @jmtrin/kevin-core@2.2.0 @jmtrin/opencode-kevin@2.2.0 @jmtrin/opencode-kevin-tui@2.2.0 @jmtrin/kevin-mcp@2.2.0` — DB auto-migrates to `016`; metadata imports move to `@jmtrin/opencode-kevin/config`.

---

## 🆕 What's new in 2.1.0 — "Relay"

> 2.1.0 relays — deletion sync + native probe + gate re-evaluated.

- 🗑️ **Deletion sync (K21-005)** — `source_deletion_sync` (`'0'` opt-in, D21-03) idle diffs fingerprints per source; missing → `archived` + OKF tombstone if exported + `source_deletions_total` (since 2.1.0), cross-source safe, idempotent; migration `015` adds `memories.source` + index, seeds metric + setting.
- 🔍 **Opencode-native probe activation (K21-006)** — single const `NATIVE_CANDIDATE_PATHS = [".opencode/memory/*.md",".opencode/MEMORY.md"]`, `statSync` try/catch, `health:absent` when no file, no throw, grep guard single-source.
- 🚦 **Gate re-evaluated (K21-001)** — `api.npmjs.org` 2026-08-30 base 763 / mcp 219 → ratio 0.287 (<0.50) FAIL, `docs/Kevin_v2.1.0_Defaults_Outcome.md` + `K16-021` appendix; K21-002..004 gate not taken — zero `cc-adapter` code, C-14 stays 4 sources.
- 📦 **Migration 015 + engines** — schema `014→015`, `tui` gains `opencode` engine, pins `core/tui 2.1.0`, `verify-pack` now expects `2.1.0` + `015`.

**Upgrade:** `npm i @jmtrin/kevin-core@2.1.0 @jmtrin/opencode-kevin@2.1.0 @jmtrin/opencode-kevin-tui@2.1.0 @jmtrin/kevin-mcp@2.1.0` — DB auto-migrates to `015`; to enable deletion sync `kevin_config set source_deletion_sync 1`.

---

## 🆕 What's new in 2.0.0 — "Commonwealth"

> 2.0.0 unites — OKF v3 sharding + MemorySources.

- ❄️ **Contract v2 C-10..C-14** — `C-10` core exports (`1.3.0`), `C-11` MCP tool names + refusal vocabulary (`1.4.0`), `C-12` skills layout (`1.5.0`), `C-13` MIF envelope + redaction (`1.5.0`), `C-14` MemorySources names/precedence/dedup (`2.0.0`); `contract_version` `1` → `2`, succession carried verbatim, `kevin_contract` v2, `tests/fixtures/contract/v2.json` golden, `diffContract` still fails loudly on any carried-clause drift.
- 📂 **OKF v3 sharded `.kevin/knowledge/`** — primary `knowledge.okf` (≤2000) + overflow `knowledge-002.okf` (zero-padded, deterministic), cap `2000`, `okf_write_version` `'3'` default `'2'` rollback (byte-exact legacy), reader walks all shards lexicographically and enforces global `entry_id` uniqueness (duplicate → structured error naming both files), writer packs primary / spills overflow / collapses gaps, `healHeader` rewrites every shard.
- 🧠 **MemorySources on idle** — `opencode-plugin (10)`, `claude-memory (20)`, `codex-memories (30)`, `opencode-native (40)` in precedence order; settings `sources_enabled` (`'1'` master) + `source_claude_memory`/`source_codex_memories`/`source_opencode_native` (`'0'` per-source) + `okf_write_version`; idle only (after skills refresh, before snapshots), per-source errors never block next source, cycle bounded `10 s`; incremental `memory_sources.meta_json` `{mtime,size}` caches; dedup by fingerprint (lower precedence wins, `source_dedup_skips_total++`, `also_seen_by[]`), topic clash → `memory_conflicts kind='source_pair'` (open, never auto-resolved); tool #27 `kevin_sources` (show-only), `kevin_trace` `source` + `kevin_audit` `sources` block with health/last_sync/counts/skips, provenance `<!-- kevin:source=claude-memory -->` when non-default.
- 🗄️ **Migration `014`** — `memory_sources` table + `memories.source` + `idx_memories_source` + 3 metric seeds (`source_syncs_total`, `source_dedup_skips_total`, `okf_v3_files_written`), retire `import_host_memory` → `{error:"removed_in_2.0.0", replacement:"sources_*"}` with one-shot translation to `sources`; `Defaults Outcome` both `FALSE` (no default flip, no enum collapse), CC adapter gate `K16-021` not taken → `v2.1` (zero `cc-adapter` code in `2.0.0`).
- ⏱️ **Latency** — `sources.sync` `p95 50/max 250` (idle, same `bench:check` red rule).

**Upgrade:** `npm i @jmtrin/kevin-core@2.0.0 @jmtrin/opencode-kevin@2.0.0 @jmtrin/opencode-kevin-tui@2.0.0 @jmtrin/kevin-mcp@2.0.0` — DB auto-migrates to `014`.

---

## 🆕 What's new in 1.5.0 — "Diaspora"

> 1.5.0 shares curated knowledge as versioned skills mirrored to every harness and as portable `.mif` memory — same DB, same recall, gated emission.

- 📚 **Canonical skills** — `skills_canonical_dir` (`'.agents/skills'` canonical `.md` + `manifest.json`), atomic writes, ≤80/150 caps, deterministic sort, idle refresh after snapshots flush; missing `manifest.json` ⇒ external-edit signal, `SKILL.md` frontmatter `name/metadata(hash,generated_at)`, manifest written last (`C-02`).
- 🪞 **Mirrors** — `skills_mirror_claude` / `skills_mirror_cursor` exact byte copy of canonical, deleted skills pruned following canonical, single-prefix enforcement, external mirror edits discarded silently, `EXTERNAL` (disk!=manifest) → skip.
- 📦 **MIF portable memory** — `MifDocument` `{version,exported_at,entries{vendor}}`, `kevin_export {mif, redact_pii}` + `kevin_import {mif,claude,codex}` with `SECRET_PATTERNS` redaction, vendor preservation, metrics `mif_exports/imports_total`, fingerprint before redact, `MAX_BODY 500` warn.
- 📥 **Host import** — gate `import_host_memory='1'`, Claude `~/.claude.json` lineage + Codex `~/.codex/sessions/*.jsonl` lineage, dedup by fingerprint, `pending` memories with `origin:host`, capped walk `1 MiB/5000`, `lstatSync` symlink-safe, `frontmatter` unclosed → skipped.
- 📊 **Contracts** — `C-04/C-05` since `1.5.0` (+4 settings / +3 metrics → 39/64), `C-07` `013`, golden `v1.json` `39/64`, `kevin_audit` channels `v2` + perf `skills.emit/mif.codec` (`p95 25/max 100`), scans green (`core_purity_scan`, `single_write_path`).

**Upgrade:** `npm i @jmtrin/kevin-core@1.5.0 @jmtrin/opencode-kevin@1.5.0 @jmtrin/opencode-kevin-tui@1.5.0 @jmtrin/kevin-mcp@1.5.0` — DB auto-migrates to `013`; emission/mirrors gated off until canonical/mirror paths set, host import gated off until `import_host_memory='1'`.

---
## 🆕 What's new in 1.4.0 — "Bridge"

> 1.4.0 opens Kevin to every MCP harness — same local DB, same ranked recall, no network.

- 🌉 **MCP Bridge** — new package `@jmtrin/kevin-mcp` (stdio MCP server, SDK 1.30.0): 7 read tools (`query/get/recall/why/status/trace/feedback` with provenance `{repo_id, identity_source, channel:"mcp"}` + token ceiling `ceil(chars/4)` + `pull_mcp` ledger), 3 gated write tools (`save/approve/share` behind `mcp_write_enabled` / `mcp_approve_enabled` double-gate + `mcp_writes_refused/accepted`), `ping` liveness — single binary `npx @jmtrin/kevin-mcp [--repo <id>]`, stderr `ready` line, SIGINT/SIGTERM flush.
- 🔐 **Identity & repo scope** — `RepoIdentity` (declared → remote → path hex-16), `mcp_repo_override` setting, `--repo` CLI, scope guard `repo_mismatch` on every tool (read + write), resolves once at init (heals OKF header on rekey).
- 🗄️ **Migration 013** — `channel TEXT DEFAULT 'plugin' CHECK(plugin|mcp)`, `injected_at_ms` probe, 5 metrics `mcp_requests_total/reads_served/writes_accepted/writes_refused/errors_total`, `schema_version 013`; `busy_timeout=5000` on Store for plugin↔MCP WAL concurrency; pre-013 DBs omit `mcp` block in `kevin_audit` (partial:true).
- 📊 **Contracts & audit** — `C-04/C-05` since `1.4.0` (3 MCP config keys, 5 MCP metrics), `C-07` schema `013`, golden `v1.json` 35/61, `METRIC_KEY_LABELS`, `kevin_audit` gains `mcp{requests,reads,writes_accepted/refused,errors,channel_split{plugin,mcp}}`.
- ⏱️ **Perf** — `mcp.read` p95 25/max 100, `mcp.write` p95 50/max 250, flush every 100 requests or SIGINT to `perf_samples`; concurrency stress 500×500 interleaved ops, zero `SQLITE_BUSY`.
- 📚 **Harnesses & demo** — recipes for Claude Code / Codex / Cursor / Windsurf / Gemini CLI / Opencode (`docs/harnesses/*.md`, valid JSON blocks), 10-min cross-harness demo `docs/demo-cross-harness.md`, release ordering `core→tui→plugin→mcp` in `docs/DISTRIBUTION.md`.

**Upgrade:** `npm i @jmtrin/kevin-core@1.4.0 @jmtrin/opencode-kevin@1.4.0 @jmtrin/opencode-kevin-tui@1.4.0 @jmtrin/kevin-mcp@1.4.0` — DB auto-migrates to 013; writes remain gated off until `mcp_write_enabled='1'`.

---

## 🆕 What's new in 1.3.0 — "Bedrock"

> 1.3.0 declares the border the code already had. No visible behavior change — everything after this changes *because* of it.

- 🏗️ **Monorepo with a hostless core** — root becomes a private `npm workspaces` manager; `packages/core` (`@jmtrin/kevin-core` **zero deps**), `packages/plugin` (`@jmtrin/opencode-kevin` — name frozen by C-06, now depends on core `1.3.0` exact), `packages/tui` (`@jmtrin/opencode-kevin-tui`, isolated). 60+ domain modules `plugin/*.ts` → `packages/core/src/*.ts` via `git mv`, migrations `migrations/` → `packages/core/migrations/` (12 SQL, built to `dist/migrations`).
- 🔌 **One new type + one new export** (`KevinEnv` + `exportMigrationsDir`): every `process.cwd()`/`homedir()` touchpoint now takes an injected `KevinEnv {projectRoot,dataRoot}` via `resolveEnv()` (defaults `cwd` / `~/.opencode-kevin` only in `env.ts`). Core scans as `0` `process.cwd/homedir/node:os` outside the allowlist (K13-007), verified by `packages/core/tests/core_purity_scan.test.ts`.
- 🔄 **Replay lives in core** — `replay.ts` + `idle-pipeline.ts` (`IDLE_STEP_ORDER` single source, `composeIdlePipeline`) moved to core; adapter and replay both mount the same pipeline (D13-07). Parity harness `packages/plugin/tests/parity.test.ts` mounts adapter vs core wirings over every `tests/replay/fixtures/*.json` and asserts byte-identical outputs (swapped-step probe proves sensitivity).
- 📦 **Packaging proof** — both tarballs verified + offline consumer smoke (`npm install <core.tgz> <tui.tgz> <plugin.tgz>` → `Store` + `Migrate` + `exportMigrationsDir` → `schema_version 012`). Core zero-deps and `types`-first exports; plugin pins core exact `1.3.0`, `exports["./tui"]` redirects to the tui package — external specifiers unchanged.
- 📜 **Contract unchanged** — `describeContract({scanRoots})` now accepts explicit roots (monorepo vs packed), golden values byte-equal (D13-05, 26/32/56 unchanged, no new setting/tool/metric/migration).

**Upgrade:** no action required — drop-in reorganization, behavior diff empty (K13-016), DB untouched.

---

## 🆕 What's new in 1.1.0 — "Drift"

> 1.1.0 protects what 1.0.0 proved: a published number without a regression gate is marketing.

- 🛡️ **Continuous benchmark gate** — `npm run bench:regress` compares the last two `bench/results` against per-metric thresholds (`precision@k` >0.02, `recall` >0.05, `mrr` >0.05 on the `kevin` arm); CI fails when truth drifts.
- 🗑️ **Lifecycle closure — `kevin_forget`** — dry-run default, `confirm:true` archives locally and publishes a tombstone through the single write path; second identical run is a `noop`.
- ⏱️ **Millisecond timestamps** — new `_ms` columns with conservative backfill; `settle()` and `CausalChain` now decide sub-second causality.
- 🧹 **Debt paid** — one `STOP_WORDS` source, one `readOriginCallId`, `ConflictDetector` via `mapRow`, one column-probe registry; every setting has an on-path test.
- 📜 **Public hygiene** — `LICENSE` (MIT), `homepage` filled, `docs/DISTRIBUTION.md` checklist, `scripts/release-notes.mjs` for `gh release create`, and `<!-- demo -->` slot.

---

## 🆕 What's new in 1.2.0 — "Surface"

> 1.2.0 gives the human-in-the-loop a place to stand: every pending proposal is readable with its diff without opening an editor, and every approval rides the same gated handler.

- 🖥️ **Three review surfaces, one projection** — TUI panels (`/kevin` route, `k` to open) where the host renders them, plus a static `dashboard.html` under `~/.opencode-kevin/tui/` that opens via `file://` with zero network, zero fetch, inline CSS/JS and embedded JSON.
- 💬 **Chat-command bridge `/kevin-*` (universal, immediate)** — `/kevin-approve <id> <token>`, `/kevin-reject <id> <token> [note]`, `/kevin-ack <id>` execute through the existing `kevinApprove` / acknowledge handlers; valid commands are swallowed, invalid/stale ones pass through untouched to the model.
- 📦 **Mailbox for TUI panels (idle-latency)** — proposals approved from the TUI write `~/.opencode-kevin/tui/actions.json`; the session consumes it at the next `session.idle` before `curator.propose`, then refreshes snapshots (`tui_snapshots_enabled='1'`).
- ⏱️ **Latency honesty** — chat commands apply this turn; mailbox actions apply at next idle. Both disclosed in-surface (`queued — applies at session idle` toast, copy hint on dashboard).
- 📦 **Packaging** — new export `opencode-kevin/tui` (`dist/plugin/tui.*`), `engines.opencode ^1.18.0` validated by the host with skip-with-warning.

| Surface | Review | Action | Latency |
|---|---|---|---|
| TUI panel (`/kevin`) — CLI/TUI host | Proposals / Conflicts / Health tabs, diff dialog, truncation markers | `a` approve / `r` reject / `x` ack → mailbox | next idle |
| Static dashboard (`dashboard.html`) | Proposals (+escaped diff `<pre>`), conflicts two-column, health banner | Copy `/kevin-*` button → paste into chat input | immediate (chat bridge) |
| Any client (Desktop, CLI) | — | Type `/kevin-approve …` etc in chat input | immediate |

Snapshots + dashboard are capped at 512 KiB (diff truncation with `truncated:true`), written atomically via `tmp`+`rename`, and read best-effort with empty-state explanations (`no snapshots yet — open an opencode session…`) when missing/corrupt/stale-token.

---

## 🆕 What's new in 1.0.0

> 1.0.0 is the **proven release**: the surface is frozen as data, the cost is
> measured, the value is benchmarked — reproducibly.

- ❄️ **A frozen public contract** — nine clauses (`C-01` … `C-09`) derived from
  live source, digest-stamped, enforced by an append-only golden file.
  Inspect it live with `kevin_contract`.
- ⏱️ **Latency budgets** — eight instrumented scopes; `npm run bench:check`
  fails if any scope exceeds its p95 budget. `dispose` joins as the seventh
  hook with crash-safe deferred settlement.
- 📊 **A reproducible benchmark** — committed synthetic corpus, four arms,
  committed result. See [below](#-the-benchmark-proven-not-promised).
- 🛡️ **An untrusted-input boundary** — everything reaching an artifact or
  prompt is escaped at the single write path; stored text is never trusted.
- 📦 **A corrected published package** — types-first exports, `dist/` only,
  verified against the packed tarball by `npm run verify:pack`.

---

## ⚙️ How it works

Kevin is an intentionally deterministic pipeline — no LLM in the core loop:

```
     your coding session
             │
             ▼
┌────────────────────────────────────────────┐
│ 🔍 OBSERVE                                 │
│ tool.execute.before/after · chat.message   │
│ Failures auto-detected from exit codes,    │
│ stderr and stdout markers.                 │
└──────────────────┬─────────────────────────┘
                   ▼
┌────────────────────────────────────────────┐
│ 🧠 LEARN                                   │
│ Reflector    → lessons                     │
│ CausalChain  → failure/fix links           │
│ PatternMiner → repeated sequences          │
│ Evidence raises confidence; recurrence     │
│ lowers it and flags staleness.             │
└──────────────────┬─────────────────────────┘
                   ▼
┌────────────────────────────────────────────┐
│ 🎯 INJECT                                  │
│ QualityGate → BM25 × origin × recency ×    │
│ truth penalty → token-budget fit           │
│ Deduped per session, inside <kevin-context>│
└──────────────────┬─────────────────────────┘
                   ▼
┌────────────────────────────────────────────┐
│ ✍️ CURATE                                  │
│ propose → HUMAN REVIEW → approve           │
│ Nothing writes without approval.           │
└──────────────────┬─────────────────────────┘
                   ▼
┌────────────────────────────────────────────┐
│ 📏 PROVE                                   │
│ perf budgets · retrieval benchmark ·       │
│ contract digest                            │
│ The system measures itself instead of      │
│ merely claiming to work.                   │
└────────────────────────────────────────────┘
```

---

## 🧰 The 27 tools (plugin) + 11 MCP tools

<details open>
<summary><b>🧠 Core memory</b></summary>

| Tool | What it does |
|---|---|
| `kevin_save` | Store a memory: decision, rule, pattern, context or solution |
| `kevin_query` | Search memories — slim payload; `evidence: true` exposes confidence |
| `kevin_get` | Fetch one memory in full |
| `kevin_recall` | Ranked recall with origin-aware scoring |
| `kevin_status` | Session scoreboard: counts, precision, metrics |
| `kevin_config` | List/set any of the 44 settings — no SQL required |
| `kevin_project` | Show, initialize or rekey the repository identity |

</details>

<details>
<summary><b>🔎 Understanding & debugging</b></summary>

| Tool | What it does |
|---|---|
| `kevin_why` | Failure→fix trace for a recurring error, with confidence and evidence |
| `kevin_trace` | Dry-run: exactly what would be injected for a query, zero side effects |
| `kevin_feedback` | Rate an injected memory `useful` / `wrong` / `outdated` / `ignore` |
| `kevin_conflicts` | Surface contradictions between memories and repository truth |
| `kevin_facts` | Scan the repository for ground-truth facts |
| `kevin_retrospective` | Per-session markdown retrospective |

</details>

<details>
<summary><b>✍️ Curation & publishing</b></summary>

| Tool | What it does |
|---|---|
| `kevin_propose` | Dry-run curation proposals with unified diffs — writes nothing |
| `kevin_approve` | The **only** path that writes `AGENTS.md` (or rejects) |
| `kevin_publish` | Regenerate skill/ref pull bundles under `~/.opencode-kevin/` |

</details>

<details>
<summary><b>👥 Team & operations</b></summary>

| Tool | What it does |
|---|---|
| `kevin_share` | Promote curated memories into `.kevin/knowledge.okf` (approval-gated) |
| `kevin_sync` | Import the shared file into the local layer |
| `kevin_export` / `kevin_import` | Markdown/OKF bundles out and in |
| `kevin_audit` | Whole-system report: memories, injections, channels, team, perf, contract |
| `kevin_doctor` | Health verdict: `healthy` / `degraded` / `unknown`, with reasons |
| `kevin_native` | Show/enable/disable native host registration (default off) |
| `kevin_contract` | **v2.0.0** — inspect the frozen public surface at runtime (`contract_version: 2`, `C-01..C-14`) |
| `kevin_bench` | **v1.0.0** — report benchmark results; never runs them in-session |
| `kevin_sources` | **v2.0.0** — show MemorySources provenance, sync status and per-source health (tool #27, show-only) |

</details>

---

## 🌉 MCP Bridge — cross-harness memory

Kevin's SQLite file becomes accessible outside OpenCode via the MCP bridge — same ranking, same gates, same file you already trust.

| Surface | Install | Transport | Reads | Writes |
|---|---|---|---|---|
| **MCP** `@jmtrin/kevin-mcp` | `npx -y @jmtrin/kevin-mcp` ( `--repo <id>` optional) | stdio (SDK 1.30.0), no HTTP/SSE | 7 tools always on (query/get/recall/why/status/trace/feedback + ping) | 3 tools gated (`save` needs `mcp_write_enabled='1'`, `approve/share` need + `mcp_approve_enabled='1'`) |

- **One DB, two processes** — plugin and MCP server share `.opencode-kevin/kevin.db` via WAL + `busy_timeout=5000`; every read/write is repo-scoped (`repo_mismatch` on drift).
- **Provenance** — every MCP response carries `{repo_id, identity_source, channel:"mcp"}` (plus confidence/evidence when applicable).
- **Harnesses** — `docs/harnesses/{claude-code,codex,cursor,windsurf,gemini-cli,opencode}.md` with exact JSON/TOML snippets, verification, troubleshooting, uninstall; demo `docs/demo-cross-harness.md` (opencode → Claude Code recall).

See `packages/mcp/README.md` for full MCP reference.

---

## 📊 The benchmark: proven, not promised

Kevin ships a committed synthetic corpus and a four-arm harness measuring
whether real retrieval beats trivial baselines at surfacing labelled-relevant
memories:

```
bench/corpus/
seed:   1262835273   (xorshift32, byte-for-byte regenerable)
digest: adecbdf4c7af82e2
result: bench/results/2026-08-21-adecbdf4c7af82e2.json   (k = 5)
```

```
npm run bench          # run the harness (also persists one row per arm)
npm run bench:check    # gate: every perf scope within its p95 budget
npm run verify:pack    # gate: seven properties against the packed tarball
```

| Arm | Precision@5 | Recall@5 | MRR |
|---|---:|---:|---:|
| `none` (control) | 0.000 | 0.000 | 0.000 |
| `recent-k` (baseline) | 0.050 | 0.026 | 0.109 |
| `random-k` (floor) | 0.048 | 0.028 | 0.093 |
| **`kevin`** | **0.950** | **0.546** | **1.000** |

```
Precision@5                    Recall@5                MRR
0.950  ██████████████████░░    0.546  ██████████░░░░   1.000  ████████████████████
0.050  █░░░░░░░░░░░░░░░░░░░    0.026  █░░░░░░░░░░░░░   0.109  ██░░░░░░░░░░░░░░░░░░
```

The labelling rule is mechanical and the retrieval numbers are exactly
reproducible — asserted by running the harness twice in-process.

**Honest limits, stated up front.** This benchmark measures retrieval on a
synthetic corpus built to have a ranked answer; it does **not** prove that real sessions look like this synthetic corpus. It does not prove that a surfaced memory changed what the model did. Retrieval quality is one layer of the agent loop, not the whole of it.

---

## ✍️ Curation: from session noise to AGENTS.md

Knowledge worth keeping becomes a proposal; a human decides; only then is it
written — once, atomically, inside a marker pair you can edit around:

```
memories ──▶ kevin_propose ──▶ pending proposals (unified diffs, no writes)
                                    │
                              HUMAN REVIEW
                                    │
                    ┌── approve ────┴──── reject ──▶ decision recorded
                    ▼                                nothing written
AGENTS.md updated atomically  ◀── the single write path (D6-01)
```

```markdown
<!-- kevin:begin — curated by opencode-kevin, safe to edit -->
- Always run `npm run typecheck` before committing (fixed 3 CI failures)
<!-- kevin:end -->
```

Deliberately conservative: only non-inferable memories are eligible — an
LLM-recoverable diagnostic is not something a human should have to review into
a permanent rule. Re-applying an unchanged plan is a counted noop, never a
write. **Kevin can propose. Humans decide.**

---

## 👥 Team sharing: one file, zero servers

Opt-in via `shared_layer_enabled='1'`. Curated knowledge exports to one
`.kevin/knowledge.okf` — header lines plus one JSON entry per line, sorted by a
deterministic `entry_id`, LF-only, ≤4096 bytes per line — designed so git
merges are meaningful and conflicts are parseable:

```
   DEV A                                DEV B
     │ share (approval-gated)             │ git pull
     ▼                                    ▼
  knowledge.okf ◀═══════ git ══════▶ knowledge.okf
                                          │ kevin_sync
                                          ▼
                        projected into local memories
                        (layer='shared', immutable)
```

Repository identity resolves **once**, in order:
`.kevin/project.json` (declared) → git remote hash (never a raw URL) → path.
Two clones of the same repository are one team; different repositories never
leak into each other. Sharing requires explicit approval
(`share_requires_approval='1'`), author identity is hashed by default, and
tombstones archive rather than delete.

---

## 📜 The contract

Kevin 2.x makes promises about its published surface **in writing**.
[`docs/CONTRACT.md`](docs/CONTRACT.md) freezes fourteen clauses — `C-01` … `C-14` —
from the `AGENTS.md` marker bytes to MemorySources, each tagged `frozen`
or `forward-only` and stamped with the release that incurred the obligation. A
test diffs the live contract against an append-only golden file on every run:
removals and silent changes fail loudly; additions must carry `since`; `C-10` core exports (`1.3.0`), `C-11` MCP (`1.4.0`), `C-12` skills (`1.5.0`), `C-13` MIF (`1.5.0`), `C-14` MemorySources (`2.0.0`) — succession carried verbatim. `kevin_contract` v2 reports `contract_version: 2`.

```jsonc
// kevin_contract (excerpt)
{
  "contract_version": 2,
  "digest": "a1b2c3d4e5f6a7b8",
  "clauses": [
    { "id": "C-03", "title": "Tool names and argument shapes", "stability": "frozen", "since": "0.2.0" },
    { "id": "C-07", "title": "Database schema", "stability": "forward-only", "since": "0.1.0" },
    { "id": "C-14", "title": "MemorySources", "stability": "frozen", "since": "2.0.0" }
  ]
}
```

> 1.0.0 is not just a version number — it is where Kevin starts making explicit, testable promises about its surface. 2.0.0 proves succession: every carried clause byte-equal.

---

## ⏱️ Hooks & latency budgets

Six host hooks plus Kevin's own `dispose` checkpoint plus two MCP bridges plus `sources.sync` — eleven measured scopes,
each with a declared p95/max budget enforced by `npm run bench:check`:

| Scope | p95 budget | max |
|---|---:|---:|
| `tool.execute.before` | 2 ms | 10 ms |
| `tool.execute.after` | 5 ms | 25 ms |
| `chat.message` | 2 ms | 10 ms |
| `chat.system.transform` | 15 ms | 50 ms |
| `session.compacting` | 15 ms | 50 ms |
| `event` | 5 ms | 25 ms |
| `session.idle` | 150 ms | 600 ms |
| `dispose` | 50 ms | 250 ms |
| `mcp.read` | 25 ms | 100 ms |
| `mcp.write` | 50 ms | 250 ms |
| `sources.sync` | 50 ms | 250 ms |

Measured on the reference laptop: retrieval p50 ≈ 0.2 ms, p95 < 1 ms — orders
of magnitude under budget. Samples persist to `perf_samples` at idle; a breach
degrades `kevin_doctor`'s verdict, because a plugin that is technically alive
but consistently slow is not healthy.

---

## ⚙️ Configuration

Everything is a TEXT setting managed through `kevin_config` (or any SQLite
client). All values are TEXT — flags compare with `=== "1"`, never truthiness.

| Key | Default | Purpose |
|---|---|---|
| `quality_gate_enabled` | `'1'` | Weak lessons stored but never injected |
| `lesson_snippet_injection` | `'1'` | Compact 2-line snippets instead of full bodies |
| `patternminer_enabled` | `'0'` | Deterministic tool-sequence mining (≥5 sessions) |
| `cross_project_enabled` | `'0'` | Include imported cross-project rows |
| `llm_reflection_enabled` | `'0'` | Opt-in LLM enrichment at pattern promotion |
| `tool_calls_dedup_enabled` | `'0'` | Suppress duplicate call recordings per minute bucket |
| `deterministic_retrieval` | `'0'` | Freeze the clock for hermetic tests/replay |
| `pre_prompt_budget_tokens` | `'400'` | Pre-prompt injection cap (clamped `[0, 4000]`) |
| `archive_after_days` | `'30'` | Age threshold for idle archival |
| `curation_enabled` | `'1'` | Idle dry-run proposal generation |
| `agents_md_path` | `'AGENTS.md'` | Where curated knowledge lands |
| `skill_emission_enabled` | `'0'` | Register project-knowledge skill on v2 hosts |
| `reference_emission_enabled` | `'0'` | Register `@kevin/<topic>` mentions |
| `injection_confidence_floor` | `'0.6'` | Memories below this never inject |
| `repo_truth_enabled` | `'0'` | Repository fact scanning |
| `convention_mining_enabled` | `'0'` | Deterministic convention mining |
| `conflict_detection_enabled` | `'0'` | Contradiction surfacing |
| `error_lesson_mode` | `'all'` | Error lesson injection mode |
| `shared_layer_enabled` | `'0'` | Team sharing via `.kevin/knowledge.okf` |
| `okf_path` | `'.kevin/knowledge.okf'` | Shared file location |
| `share_requires_approval` | `'1'` | No export without human confirmation |
| `author_identity_mode` | `'hashed'` | Author identity hashed, never raw email |
| `shared_confidence_floor` | `'0.7'` | Confidence floor for shared projections |
| `hook_liveness_enabled` | `'1'` | Per-hook liveness tracking |
| `native_registration_enabled` | `'0'` | v2 native skill/reference registration |
| `host_probe_history_enabled` | `'0'` | Append-only probe history |
| `dead_hook_report_threshold` | `'3'` | Consecutive misses before a hook reads dead |
| `perf_enabled` | `'1'` | Latency instrumentation |
| `perf_ring_capacity` | `'512'` | Samples per scope (clamped `[64, 8192]`) |
| `perf_flush_on_idle` | `'1'` | Persist samples at idle |
| `contract_report_enabled` | `'1'` | Contract block in `kevin_audit` |
| `tui_snapshots_enabled` | `'1'` | Snapshot + dashboard flush at idle (opencode-kevin/tui) |
| `mcp_write_enabled` | `'0'` | Gate for MCP `save` (refused counter `mcp_writes_refused`) |
| `mcp_approve_enabled` | `'0'` | Double-gate for MCP `approve`/`share` (needs + `mcp_write_enabled`) |
| `mcp_repo_override` | `''` | Override `RepoIdentity` for MCP (hex-16 or empty) |
| `skills_canonical_dir` | `'.agents/skills'` | Canonical skills root (validated: no absolute, no "..") |
| `skills_mirror_claude` | `'0'` | Gate for `.claude/skills` exact byte copy |
| `skills_mirror_cursor` | `'0'` | Gate for `.cursor/skills` exact byte copy |
| `sources_enabled` | `'1'` | Master toggle for MemorySources (idle, bounded 10s) |
| `source_claude_memory` | `'0'` | Per-source gate: claude-memory (20) |
| `source_codex_memories` | `'0'` | Per-source gate: codex-memories (30) |
| `source_opencode_native` | `'0'` | Per-source gate: opencode-native (40) |
| `source_deletion_sync` | `'0'` | Deletion sync: archive + tombstone when source file disappears (idle, opt-in) |
| `okf_write_version` | `'3'` | OKF writer version `2` legacy / `3` sharded (rollback byte-exact) |

> `import_host_memory` retired in `2.0.0` → `{error:"removed_in_2.0.0", replacement:"sources_*"}` — one-shot translation to `sources_enabled` + per-source flags on first `014` migration. `mcp_repo_override` still gates MCP identity; `okf_write_version='3'` shards, `'2'` rolls back byte-exact.

---

## 🖥️ Supported runtimes

| Runtime | SQLite backend | Status |
|---|---|---|
| Node 24.x | `node:sqlite` (stable) | ✅ **Supported** — the reference row |
| Node 22.5+ | `better-sqlite3` (optional dep) | ⚠️ **Supported with a caveat** — needs a build toolchain; without one there is no backend (and npm install still succeeds silently) |
| Node 22.5+ | `node:sqlite` behind `--experimental-sqlite` | 🔶 Works, unsupported — exercised in CI, not promised |
| Bun ≥ 1.1 | `bun:sqlite` | ✅ **Supported** — smoke-tested in `npm run verify` |

Zero network calls — asserted by source scan (forbidden: http/https/net/dgram/fetch/SSE/HttpTransport/child_process/spawn) on every test run; MCP uses stdio only, no spawn, logs on stderr only.

---

## 🎨 Design & trust

**Principles.** Local first · deterministic by default (no LLM in the core
loop) · evidence over vibes (every memory carries evidence, provenance,
recurrence and confidence) · signal over noise (inject *less, better* context,
not more) · humans hold the write boundary · git-friendly collaboration ·
important claims become executable checks.

**Security model.** Stored knowledge is treated as untrusted input: anything
reaching an artifact or prompt passes through idempotent escaping at the
single write path; permanent project-file changes require explicit human
approval; author identity in the shared layer is hashed
(`author_identity_mode='hashed'`). No network service is required to store,
retrieve or share knowledge.

**Without memory vs with Kevin:**

```
without:  session 1 solve ─▶ context closes ─▶ session 2 same problem ─▶ solve again

with:     session 1 solve ─▶ lesson ─▶ memory ─┐
          session 2 problem ◀── recall ◀───────┘ ─▶ fix ─▶ evidence ↑
```

**Why not just `AGENTS.md`?** It is excellent for durable, human-authored
guidance — Kevin treats it as a curated destination, not as a memory system.
It cannot do failure/fix traces, confidence scoring, evidence tracking, ranked
retrieval, recurrence signals, dry-run injection inspection, automatic
proposal generation, team projections, or performance and contract
instrumentation. That is what Kevin adds around it.

---

## 🛠️ Development

```bash
npm install                            # hoists workspaces (root private, 4 packages)
npm run build                          # core → tui → plugin → mcp (tsc + copy-migrations)
npm run typecheck                      # -w core -w tui -w plugin -w mcp + root (strict)
npm run lint                           # biome
npm test                               # vitest — root suite (233 files)
npm test -w @jmtrin/kevin-core         # core only — also passes with @opencode-ai/plugin absent (K13-013)
npm run verify                         # install checks + Bun smoke + verify:pack (×2 + consumer)
npm run verify:pack                    # dual-tarball + offline consumer smoke (K13-014)
npm run gen:corpus                     # regenerate the seeded corpus (byte-identical)
npm run replay                         # replay recorded sessions deterministically (now via core)
```

Project layout (Bedrock monorepo):

```
packages/core/         @jmtrin/kevin-core — ~60 modules (zero deps), src/*.ts, migrations/ 001→015, dist/migrations
packages/plugin/       @jmtrin/opencode-kevin — 4 modules (index, host, native, capabilities), adapter thin, depends on core+tui 2.0.0 exact
packages/tui/          @jmtrin/opencode-kevin-tui — isolated TUI panel (target-exclusive, own package.json/exports)
packages/mcp/          @jmtrin/kevin-mcp — MCP bridge (stdio, 11 tools, pure helper, identity+provenance)
scripts/               bench · gen-corpus · verify-pack (dual) · verify-install · …
tests/                 unit · integration · e2e · replay fixtures (at root, run via workspaces)
bench/                 committed corpus + committed results
docs/                  CONTRACT.md · per-release plans/tasks · roadmap v2
```

> **C-10 preview** — the future public surface is the explicit re-export list at `packages/core/src/index.ts` (keep it minimal and deliberate).

C-06 frozen: `plugin` package name `@jmtrin/opencode-kevin` and `exports["./tui"]` specifier unchanged; consumers see no break.

---

## 📄 License

MIT — see the package manifest. Kevin is built by [jmtrin](https://github.com/jmtrin);
bug reports and PRs welcome at the [issue tracker](https://github.com/jmtrin/opencode-kevin/issues).

<div align="center">

### ⚡ Kevin — *Observe. Learn. Remember. Improve.*

</div>
