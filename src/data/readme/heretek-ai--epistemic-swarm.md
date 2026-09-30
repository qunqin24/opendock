# IUMBTEMS: I Use My Brain To Express My Self 🧠

[![npm version](https://img.shields.io/npm/v/@heretek-ai/epistemic-swarm.svg)](https://www.npmjs.com/package/@heretek-ai/epistemic-swarm)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![CI/CD](https://github.com/Heretek-AI/IUMBTEMS/actions/workflows/publish.yml/badge.svg)](https://github.com/Heretek-AI/IUMBTEMS/actions)
[![Marketplace Validated](https://github.com/Heretek-AI/IUMBTEMS/actions/workflows/validate-marketplace.yml/badge.svg)](https://github.com/Heretek-AI/IUMBTEMS/actions)

> **High-Integrity Dialectic Research Agent Harness**  
> *Universal support for Claude Code, OpenCode V2, Pi (pi.dev), OMP (oh-my-pi), Gemini CLI, Codex CLI, and AntiGravity.*  
> *Enforcing verified empirical evidence over parametric hallucination.*

---

## 🏷️ Naming

Two names appear throughout this project, and they are not interchangeable:

| Name | What it is |
| :--- | :--- |
| **IUMBTEMS** | The project and brand ("I Use My Brain To Express My Self"). Repo: [`Heretek-AI/IUMBTEMS`](https://github.com/Heretek-AI/IUMBTEMS). |
| **Epistemic Swarm** | The technical/product name of the harness. Ships as the npm package [`@heretek-ai/epistemic-swarm`](https://www.npmjs.com/package/@heretek-ai/epistemic-swarm), the Claude Code plugin `epistemic-swarm@heretek-official`, and the `iumbtems` / `epistemic-swarm` binaries. |

## 💡 The Philosophy of IUMBTEMS

**IUMBTEMS** is grounded in a singular design mandate: **Epistemic Sovereignty**.

Modern LLMs suffer from parametric hallucination, sycophancy, and premature narrative consensus. They invent citations, smooth over technical contradictions, and extrapolate beyond empirical bounds.

**IUMBTEMS** restores rigorous empirical grounding by pairing an unconstrained divergent exploration phase (Socratic grilling and assumption inversion) with a multi-agent dialectic swarm:

1. **Agent Alpha (The Proponent / Thesis)**: Gathers corroborating primary sources, empirical proofs, and implementation benchmarks.
2. **Agent Beta (The Adversary / Antithesis / Red Team)**: Hunts for counter-arguments, retracted data, methodology flaws, and edge-case failures.
3. **Epistemic Auditor**: Verifies cited quotes verbatim against content-addressed raw markdown caches (`.research/sources/<sha256>.md`), prunes ungrounded assertions, and scores dialectic divergence.

---

## 🌐 Universal Multi-Platform Support

IUMBTEMS is packaged as a single universal npm package that runs across seven autonomous agent harnesses. Single source of truth: `skills/*` + `prompts/*`. The canonical programmatic surface is the first-party MCP server (`python3 runner/mcp_server.py`), which exposes the `iumbtems_*` tools. Harness targets register that server and carry only thin skill stubs generated with `python3 scripts/build_adapters.py` (`iumbtems adapters`) into `plugins/*` and `.agents/skills`.

### 1. Claude Code (Native Marketplace & Overlay)

#### Native Marketplace (Recommended)
Add the official Heretek AI marketplace to Claude Code:
```bash
claude plugin marketplace add Heretek-AI/IUMBTEMS
```
Then install either the flagship harness or modular standalone plugins:
```bash
# Flagship dialectic research harness:
claude plugin install epistemic-swarm@heretek-official

# Or install standalone modular plugins:
claude plugin install socratic-grilling@heretek-official
claude plugin install research-cache@heretek-official
claude plugin install darkharvest@heretek-official
claude plugin install factory@heretek-official
```
See [MARKETPLACE.md](MARKETPLACE.md) for full component specifications.

#### CLI Overlay Installer
Install skills and MCP servers directly into `~/.claude/` and `~/.claude.json`:
```bash
npx @heretek-ai/epistemic-swarm install
# or from a local clone:
npm run install-local
```
- Run `/grilling` inside any interactive Claude Code session.
- Run headless dialectic research:
  ```bash
  iumbtems run "Evaluate FPGA Poseidon prover latency bounds"
  ```

### 2. Pi (`pi.dev`)
```bash
pi install npm:@heretek-ai/epistemic-swarm
```
- **Slash Commands**: `/swarm`, `/grill`, `/swarm-config`, `/audit`, `/scout`, `/brainstorming`, `/darkharvest`, `/factory`, `/domainexpansion`.
- **Agent Tools**: the full `iumbtems_*` MCP surface (see [MCP Tool Reference](#-mcp-tool-reference)).

### 3. OpenCode V2 ([opencode.ai/v2/docs](https://opencode.ai/v2/docs))
Enable IUMBTEMS in `~/.config/opencode/opencode.jsonc` or a project `opencode.jsonc`:
```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "@heretek-ai/epistemic-swarm",
      "options": {
        "search_engine": "duckduckgo",
        "max_iterations": 2,
        "mode": "research"
      }
    }
  ]
}
```
The plugin registers through OpenCode V2's transform domains at setup — `tool.transform` and `command.transform` (catalog), `agent.transform` (the shipped role profiles), and `skill.transform` (bundled `skills/*/SKILL.md`) — so no config-snippet install step is required. Agent profiles are registered with `AgentEditor.update` (V2 has no `add()`).

Slash commands: `/swarm`, `/grill`, `/swarm-config`, `/audit`, `/scout`, `/brainstorming` (alias `/brainstorm`), `/darkharvest`, `/factory`, `/domainexpansion`.

*(See [config/opencode-snippet.json](config/opencode-snippet.json) for the agent definitions.)*

### 4. Gemini CLI
```bash
gemini extensions install https://github.com/Heretek-AI/IUMBTEMS --path plugins/gemini
# local dev: gemini extensions link ./plugins/gemini
```
Bundle: `plugins/gemini/gemini-extension.json` (manifest + MCP servers), `GEMINI.md` (context), `commands/*.toml` (`/swarm`, `/grill`, `/audit`, `/scout`, `/brainstorming`, `/darkharvest`, `/factory`, `/domainexpansion`, `/swarm-config`), `hooks/hooks.json`, `skills/` thin stubs.

### 5. Codex CLI
Codex reads repo-local `.agents/skills/*` (generated in this repo) — `$brainstorming <prompt>` or implicit activation. Distributable pack in `plugins/codex/` (`openai.yaml`, `config.toml.snippet` for `[mcp_servers.*]`, `AGENTS.md.snippet`). Legacy `~/.codex/prompts/*.md` (`/prompts:<name>`) is deprecated; use skills.

### 6. Google AntiGravity (`agy`)
```bash
agy plugin install https://github.com/Heretek-AI/IUMBTEMS --path plugins/antigravity
agy plugin validate ./plugins/antigravity
```
Bundle: `plugins/antigravity/plugin.json`, `mcp_config.json`, `hooks.json`, `skills/` thin stubs, `agents/` (alpha/beta/auditor/brainstormer), `rules/epistemic-integrity.md`.

### 7. OMP (oh-my-pi, `omp.sh`)
```bash
omp install npm:@heretek-ai/epistemic-swarm
```
Shares the Pi extension entry point (`package.json: {omp, pi}` blocks). Project-local slash commands (`.omp/commands/*.md`), prompt templates (`.omp/prompts/*.md`), hooks (`.omp/hooks/pre|post/*.ts`), system override (`.omp/SYSTEM.md`).

---

## 🔌 Agent Runtime Backends

Agent work runs on whichever harness invoked it — **host-native by default**:

| Host | Default backend |
| :--- | :--- |
| Claude Code | `claude -p` |
| OpenCode V2 | `opencode run` (selected via `IUMBTEMS_HOST=opencode`) |
| Manual CLI run | `claude -p`, or `opencode run` when `claude` is absent from `PATH` |

Override, highest precedence first:

1. `--backend {auto,claude,opencode}` (CLI) / `backend` argument (MCP tools)
2. `IUMBTEMS_BACKEND_ALPHA` / `IUMBTEMS_BACKEND_BETA` (and `IUMBTEMS_MODEL_<ROLE>`)
3. `.research/config.json` → `agents.<role>.backend` / `agents.<role>.model`
4. Host-native default

Related environment variables:

| Variable | Purpose |
| :--- | :--- |
| `IUMBTEMS_HOST` | Host hint (`claude` / `opencode`); set automatically by the OpenCode plugin. |
| `IUMBTEMS_BACKEND_<ROLE>` / `IUMBTEMS_MODEL_<ROLE>` | Per-role backend argv / model override (e.g. `IUMBTEMS_BACKEND_BETA=opencode`). |
| `IUMBTEMS_AGENT_CWD` | Working directory for spawned agents: `project` (default), `package`, or an absolute path. |
| `IUMBTEMS_PROJECT_DIR` | Project root used to resolve the `.research/` workspace (set by the OpenCode plugin; wins over the process cwd). |
| `IUMBTEMS_PCRB_KEY` | HMAC key for proof-carrying brief signing/verification. |
| `IUMBTEMS_FETCH_TTL_DAYS` / `IUMBTEMS_FETCH_MAX_INLINE` | Fetch-cache TTL and inline size cap (bytes). |
| `IUMBTEMS_TOOL_NAMES` | Override the projected tool-name list. |

Spawned agents inherit `PWD` set to their working directory, so harnesses that resolve their project root from `$PWD` (OpenCode) land in the same tree the runner reads from.

> **Legacy config migration:** configs written before 0.7.6 could pin `agents.<role>.backend = ["claude", "-p"]`, which silently overrode the host-native default. That pin is now migrated to `null` on load (only when the top-level `backend` is not an explicit `"claude"`), and the migration is persisted on the next config **write** (a read / `--show` never heals). To deliberately keep Claude on an OpenCode host, set `"backend": "claude"`.

---

## ⚡ CLI Command Reference

```bash
# Inspect or update active configuration (search engine, depth, mode, backend)
iumbtems config
iumbtems config --engine duckduckgo --depth 3 --mode audit

# Run dialectic codebase architecture & security audit
iumbtems audit "runner/ and skills/ concurrency and injection security"

# Scout open-source software, mature libraries & clean-room blueprints
iumbtems scout "Zero-dependency Raft consensus implementations in Rust"

# Run the autonomous dialectic research swarm
iumbtems run "Sub-millisecond ZK state updates on L1 rollups"

# Run lateral brainstorming (divergent what-if ideation, never bug fixes)
iumbtems brainstorm "Where do we go from here?"

# Product competitor teardown with per-feature harvest verdicts
iumbtems darkharvest "Paseo-class agent harness competitor" --seeds https://github.com/a/b,https://github.com/c/d --max-repos 6

# Coding-factory run-state helper
iumbtems factory init --run arena
iumbtems factory phase-add --run arena --phase 01-handoff --goal "Session handoff" --accept "round-trips;STOP kills loop"
iumbtems factory qa-record --run arena --phase 01-handoff --seat qa-a --verdict pass
iumbtems factory expansion --run arena --loops 10 --max-loops 10
iumbtems factory stop --run arena          # writes .factory/STOP kill-file

# Socratic grilling and decision-frontier calculation
iumbtems grill --objective "L1 vs L2 state verification trade-offs"

# Rebuild harness adapter mirrors (skills -> plugins/*, .agents/skills)
iumbtems adapters

# Other utility commands
iumbtems install      # install skills & MCP servers into ~/.claude/
iumbtems marketplace  # print the Claude Code marketplace catalog
iumbtems doctor       # environment + preflight health check
iumbtems test         # run the automated test suite
iumbtems help         # full usage text
```

Run-shaping flags: `--resume` (continue a session instead of re-orchestrating) and `--dry-run` (validate config/backends/engine without spawning agents). Frontier authoring is fully tool-driven: `socratic_tree.py --add-node/--settle/--export`.

Common options: `--mock-claude` (synthetic responses, zero API cost), `--frontier <file>` (settled `frontier.json`), `--mode <research|audit|scout|hybrid|brainstorm|darkharvest>`, `--engine <duckduckgo|brave|firecrawl|searxng>`, `--depth <1-4>`, `--backend <auto|claude|opencode>`, `--dir <path>`.

The `epistemic-swarm` binary is an alias of `iumbtems`.

---

## 🧰 MCP Tool Reference

The canonical MCP server (`python3 runner/mcp_server.py`, stdio) exposes these tools to every harness:

| Tool | Purpose |
| :--- | :--- |
| `iumbtems_config` | Inspect or adjust active parameters in `.research/config.json` (search engine, depth, mode, backend, per-agent backends). |
| `iumbtems_swarm_research` | Dispatch the dialectic researcher pair (Alpha thesis vs Beta antithesis) with epistemic auditing. Long-running; blocks until complete. |
| `iumbtems_code_audit` | Dialectic codebase review: structural architect vs vulnerability red-team. |
| `iumbtems_oss_scout` | Scout open-source libraries, audit licenses, and build clean-room blueprints. |
| `iumbtems_brainstorm` | Lateral ideation portfolio: feature vectors, paradigm moves, falsifiable spikes. Never bug fixes. |
| `iumbtems_darkharvest` | Product competitor teardown with per-feature `depend\|vendor\|clean-room\|skip` verdicts and SPDX attribution. |
| `iumbtems_factory` | Drive factory run state: `init` / `phase-add` / `qa-record` / `expansion` / `stop`. State in `<project>/.factory` and `.roadmap`. |
| `iumbtems_verify_quote` | Audit a verbatim citation against the SHA-256 source cache (`.research/sources/<hash>.md`). |
| `iumbtems_socratic_frontier` | Inspect or advance the Socratic decision-tree frontier (`.research/frontier.json`). |
| `iumbtems_export_brief` | Export a proof-carrying research brief (PCRB): a self-contained signed bundle of synthesis, claims, quote witnesses, and full source texts. |
| `iumbtems_verify_brief` | Verify a PCRB against its bundled sources: manifest integrity, HMAC signature, and every quote re-checked. Exit-fail semantics — no trust in the producing LLM. |
| `iumbtems_reindex_claims` | Rebuild the derived `claims.sqlite` index from `.research` flat files (idempotent; flat files are the source of truth). |
| `iumbtems_report_retraction` | Record a RETRACTED/REVISED event for a cached source; dependent `VERIFIED` claims degrade to STALE/SUSPECT on the next audit. |
| `iumbtems_check_staleness` | One claim-degradation pass: join claims against retraction events, write the status ledger, queue re-runs for degraded scopes. Never mutates dossiers. |
| `iumbtems_set_domain_pack` | Activate a Regulated Domain Pack (`biopharma` / `quant` / `legal` epistemic constitution) for subsequent audits. |
| `iumbtems_doctor` | Preflight health check: plugin version, backend + resolved binary, search-engine live probe, workspace write test. Run first when something looks wrong. |
| `iumbtems_test` | Run the packaged test suite in a subprocess and report pass/fail with the tail. |

---

## 🎯 Skills & Slash Commands

Nine canonical skills live in `skills/*/SKILL.md`. Each maps to a slash command on harnesses that support them and to the MCP tool that carries its programmatic surface.

| Skill | Slash | Surface |
| :--- | :--- | :--- |
| `grilling` | `/grill` | `iumbtems_socratic_frontier` |
| `research_cache` | — | `iumbtems_verify_quote` |
| `epistemic_search` | — | research MCP servers (`brave-search`, `firecrawl`, `searxng`) |
| `swarm_config` | `/swarm-config` | `iumbtems_config` |
| `code_audit` | `/audit` | `iumbtems_code_audit` |
| `oss_scout` | `/scout` | `iumbtems_oss_scout` |
| `brainstorming` | `/brainstorming` | `iumbtems_brainstorm` |
| `darkharvest` | `/darkharvest` | `iumbtems_darkharvest` |
| `factory` | `/factory` | `iumbtems_factory` |

- **`/swarm-config`**: Interactive tuning of search engines (DuckDuckGo, Brave, Firecrawl, SearXNG), iteration depth, divergence threshold, backend, and operating mode.
- **`/audit`**: Dialectic codebase review pairing a Structural Architect (thesis) with a Vulnerability Red-Teamer (antithesis) enforcing line-number proofs (`file:///path#L10-25`).
- **`/scout`**: Evaluates GitHub repositories and package ecosystems (npm, crates.io, PyPI), license contamination (GPL/AGPL copyleft vs MIT/Apache), and outputs clean-room re-implementation blueprints.
- **`/darkharvest`**: Product competitor teardown (seed inspirations + prompt, expand to adjacents). Competitor × capability matrix, both-ways white-space gaps, per-feature `depend|vendor|clean-room-rebuild|skip` verdicts with SPDX attribution. Permissive-only vendoring; GPL/AGPL spec-rebuild only.
- **`/factory`**: Coding-factory Manager loop — grill-gated phased build, per-phase programmer spawns, dual QA (3 failures then escalate), explicit sign-off per phase.
- **`/domainexpansion`**: Autonomous agent-guided self-improvement loop (`/domainexpansion <n>`, max 10); bypasses gates, stops on count OR `.factory/STOP` OR user kill.
- **`/grilling`**: Socratic assumption-inversion and design-tree frontier discovery.
- **`epistemic_search`**: Zero-key DuckDuckGo Lite search and content-addressed fetch with automatic SHA-256 caching.

---

## ⚙️ Settings Surface (`/swarm-config`)

The settings surface is the recommended way to tune the harness from inside OpenCode V2. It has two parts:

- **`/swarm-config` wizard** — a native dialog wizard (`ui.dialog.select/prompt/confirm`) showing every canonical key with a provenance badge (`default` / `file` / `env-override`), one editable row at a time, validated and written atomically on save.
- **Status panel** — a read-only panel opened from the command palette / keymap (`iumbtems.swarm-settings`) rendering the effective rows with a **next-run** badge. It never writes.

The canonical config it edits is **`.research/config.json`** — the TUI resolves `.research` from the OpenCode host root; `IUMBTEMS_PROJECT_DIR` / `--dir` / `base_dir` select the workspace for the CLI, MCP, and runner surfaces. Configurable values include the search engine, depth (`max_iterations`), operating `mode`, `backend`, per-role (`agents.*`) backend/model, `license_whitelist`, the cache / TTL / search-timeout knobs, `searxng_url`, `verify.min_fuzzy_confidence`, the persistence `mcp_servers` toggle map, `allocation`, `domain_pack`, and the deprecated display-only `output_dir`. (`divergence_threshold` is advisory: recorded, never gating a verdict.)

**Honest boundaries**

- **Values apply to the NEXT swarm run.** The Python runner reads `.research/config.json` once at run start, so a save never hot-swaps a running swarm — the wizard and panel both say "applies to the next swarm run".
- **Per-role temperature does not govern spawned agents.** The OpenCode session `context` hook honors `IUMBTEMS_TEMPERATURE[_<ROLE>]` for sessions running inside OpenCode, but there is **no verified path** that sets per-role temperature for spawned swarm agents — that leg is recorded `[NEGATIVE_KNOWLEDGE]` (S3, dated 2026-09-29; waiver W3). The UI deliberately makes no temperature claim.
- **No secrets in config.** API keys stay in the environment (`FIRECRAWL_API_KEY`, …). The surface only reports whether an env override is set for the keys it models; it never renders an env value, and it does not probe engine availability.

Writes prefer the plugin's `iumbtems.settings` RPC (server-side validation + an `expectedHash` lost-update guard; the RPC surfaces a `conflict` error type, and Python's code is `CONFLICTING_EXPECTED_HASH`) and degrade to a direct-fs write with a visible toast when `client.rpc` is absent; `.research/config.json` stays the single source of truth. See [docs/SYSTEM_ARCHITECTURE.md](docs/SYSTEM_ARCHITECTURE.md) §6.7 for the full data flow, the atomic-write + lock protocol, and the `ctx.storage` mirror.

*Reviewed settings-surface patterns from Gemini CLI, Codex, Goose, Aider, Cline, OpenCode, and Crush (docs-only) informed this design; no code was copied.*

---

## 🗂️ Workspace & Evidence Model

All state lives in a local `.research/` directory (resolved from `IUMBTEMS_PROJECT_DIR` when set, else the process cwd):

```
.research/
├── config.json                 # active parameters (engine, depth, mode, backend, agents)
├── manifest.json               # session metadata, scope DAG, status
├── frontier.json               # settled Socratic decision frontier (input)
├── sources/                    # content-addressed raw cache
│   ├── <sha256>.md             # verbatim cleaned markdown
│   └── <sha256>.json           # provenance: url, title, headers, timestamp, query
├── scratchpads/<scope_id>/     # per-scope dossiers
│   ├── alpha_dossier.json      # proponent findings
│   ├── beta_dossier.json       # adversary counter-evidence
│   ├── audit_report.json       # quote-verification log, divergence score, trimmed claims
│   └── scope_synthesis.md
├── ledger/claim_status.json    # Living Dossiers status ledger
├── requeue.json                # scopes queued for re-run after degradation
├── claims.sqlite               # derived claim index (rebuildable)
└── final_synthesis.md          # master report
```

**Living Dossiers:** when a cached source is retracted or revised (`iumbtems_report_retraction`), dependent verified claims degrade to STALE/SUSPECT on the next `iumbtems_check_staleness` pass, and affected scopes are queued for re-run. Dossiers are never mutated in place.

**Proof-Carrying Research Briefs (PCRB):** `iumbtems_export_brief` emits a self-contained, HMAC-signed bundle (synthesis + claims + quote witnesses + full source texts); `iumbtems_verify_brief` re-checks every quote against the bundled sources with exit-fail semantics.

**Regulated Domain Packs:** `iumbtems_set_domain_pack` activates a stricter epistemic constitution for `biopharma`, `quant`, or `legal` audits.

---

## 🏷️ Epistemic Tagging Taxonomy

Every factual claim carries an explicit evidentiary tag:

| Tag | Formal Definition | Verification Standard |
| :--- | :--- | :--- |
| `[VERIFIED: <hash>]` | Direct empirical fact from a primary source. | Verbatim quote must exist in `.research/sources/<hash>.md`. |
| `[INFERRED: <reasoning>]` | Deductive conclusion from verified facts. | Explicit list of parent verified premises and bridging logic. |
| `[HYPOTHESIS: <test>]` | Speculative assertion or projection. | Must define a measurable falsification criterion. |
| `[NEGATIVE_KNOWLEDGE: <query>]` | Verified absence of empirical evidence. | Records the exact search query and literature gap. |

---

## 🔍 Multi-Tier OSINT & Search Pipeline

1. **Discovery Tier**: DuckDuckGo Lite (zero-key default), SearXNG (self-hosted metasearch), Brave Search API.
2. **Extraction Tier**: Firecrawl (headless JavaScript rendering, DOM cleaning, Markdown extraction), with a clean readability fallback.
3. **Academic Tier**: Semantic Scholar / arXiv MCPs for DOI citation resolution.
4. **Caching Tier**: Content-addressed SHA-256 storage (`skills/research_cache/hasher.py`).

### Free-first provider ladder & cost safety

OpenCode V2 hosts a plugin-registered **search provider** (`iumbtems-cached`) that resolves its upstream free-first and never overrides a deliberate `websearch.provider` or a provider you `/connect`ed. ("Cached" describes the evidence pipeline — `hasher.py` content-addresses full pages fetched via `webfetch` — not in-execute memoisation.)

1. **`/connect`-ed provider** (integration store) — **metered**, credential lives in the host store.
2. **BYO key** (`exa`/`firecrawl`/`parallel`/`tavily`/`tinyfish` via `EXA_API_KEY`/`FIRECRAWL_API_KEY`/`PARALLEL_API_KEY`/`TAVILY_API_KEY`/`TINYFISH_API_KEY`) — **metered** (vendor-billed).
3. **Self-hosted SearXNG** (`SEARXNG_URL`) — free; availability requires the URL.
4. **DuckDuckGo Lite** — free, zero-key, routed through `skills/epistemic_search/scripts/search.py` (anti-bot detection + telemetry).
5. **Console** (hosted, `$0.01`/successful search) — **metered, never implicit**.

Provider `execute()` returns **hits only** (`title`/`url`/`content`). Full page content must be fetched explicitly with the host `webfetch` tool and cached via `python3 skills/research_cache/hasher.py cache …`; **a snippet alone never witnesses a `[VERIFIED: <hash>]` claim**.

Preflight prints the active provider, a free|metered classification, a **per-run** our-path search count + cost **estimate**, and `metered-mode: yes|no|unknown`. The reachability probe is excluded, so a zero-search run reports `our-path searches: 0`, and every metered rung logs its own event. Engine aliases are normalised before the probe (`ddg`/`DuckDuckGo`/`DDG`/whitespace all mean `duckduckgo`), so no spelling can skip the probe. It also gates availability mode-aware: `research`/`scout`/`darkharvest`/`hybrid` (and strict `brainstorm`, including `--domain-pack`) **HALT before any agent spawns** when no usable search exists (exit code 3 — deliberately distinct from argparse's usage-error 2); `audit`/internal `brainstorm` warn and proceed, and `--dry-run` validates and reports without halting. The workspace connection file (`.research/websearch-state.json`) is advisory: it is honoured only within a 24h TTL and never marks a provider usable without a resolvable credential. It is resolved in a **single read** (provider + advisory verdict together), only when the path is a **regular file**, and read with a bounded non-blocking guard — so a FIFO/device/symlink or a file swapped between reads can neither spoof host confirmation nor wedge preflight/`doctor`. Enable the opt-in per-search cost gate with `./install.sh --search-gate`, which adds:

```jsonc
{ "permissions": [ { "action": "websearch", "resource": "*", "effect": "ask" } ] }
```

Without the flag, `install.sh` never touches your permissions. If a `websearch` `deny` already exists the gate refuses to downgrade it (exit non-zero, config untouched), and resource-scoped websearch rules are preserved and reported — never silently deleted.

### Local Infrastructure (Optional)
```bash
docker compose -f config/docker-compose.infra.yml up -d   # local SearXNG + Firecrawl
```

---

## 🛠️ Repository Layout & Adapter Generation

- **Canonical prose/specs**: `skills/*/SKILL.md`, `prompts/*.md`, `docs/*.md`.
- **Canonical programmatic surface**: `runner/mcp_server.py`.
- **Generated — never hand-edit**: `plugins/{antigravity,gemini,codex}/skills/**`, `.agents/skills/**`, and the modular copies under `plugins/{research-cache,socratic-grilling,darkharvest,factory}/skills/**`.

Regenerate and verify:
```bash
python3 scripts/build_adapters.py           # rebuild stubs + modular copies
python3 scripts/build_adapters.py --check   # CI gate: fails on drift
python3 -m unittest discover -s runner/tests
```

The legacy hyphenated skill name is served by an alias the overlay installer creates under the user's `~/.claude/skills/` directory. It is deliberately **not** committed as an in-repo symlink: `claude plugin validate --strict` treats a symlink entry as a warning (→ error), which fails marketplace and eval validation.

---

## 📦 CI/CD & Trusted Publishing

The package is distributed on npm as `@heretek-ai/epistemic-swarm` using [npm Trusted Publishing (OIDC)](https://docs.npmjs.com/trusted-publishers) with GitHub Actions — no long-lived npm token.

**Release flow** (see [AGENTS.md](AGENTS.md#releases)):

1. Bump the **four enforced manifests** in lockstep: `package.json`, `package-lock.json`, `.claude-plugin/plugin.json`, and `plugins/antigravity/plugin.json` (`python3 scripts/build_adapters.py --check` guards the AntiGravity one).
2. Commit and push to `main`.
3. `gh release create vX.Y.Z` — the `Publish to npm` workflow
   (`.github/workflows/publish.yml`) runs on `release: published`, executes the
   test suite, and publishes with provenance.
4. Verify: `curl https://registry.npmjs.org/@heretek-ai%2Fepistemic-swarm` (allow propagation time).

Manual `npm publish` is not part of the flow; the trusted publisher is bound to `Heretek-AI/IUMBTEMS` + `.github/workflows/publish.yml`.

---

## 📄 License

Licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE) for details.
