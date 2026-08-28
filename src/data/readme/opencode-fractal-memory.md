# opencode-fractal-memory

Fractal memory system for [OpenCode](https://opencode.ai) with semantic search, automatic compression, and multi-level retrieval.

# about me and the usage

I made this because I needed a longterm memory at first.
Then while working with it I extended it's functionality.
I realized that the overall amout of tokens that gets used is huge.
So I tried to find ways to reduce that.
It might be a little bit overwhelming (lots of features)
but if you work with it you will start to love it.
It's kind of a swiss knife for opencode.
You can tell the coding agent to make a memory of everything.
And later on you can tell it to read it, making expensive queries
sometimes obsolete.

Tool output get's compressed.

There are also skill nodes.

You can also use the management app that includes a nice threejs visualization
and searching from there in the memory nodes.
You can also inject nodes directly to the agent from there.
You can edit the nodes too.

I think I forgot to mention some of the features here.

I'll update this project constantly.

Feel free to use it and tell me how much you hate or like it ;)

Have phun

Holger

PS.: Did I mention that this is alpha? So feel free to post issues with suggestions
if you find bugs or if you just want to suggest improvements 

## Installation — one command

```bash
opencode plugin add opencode-fractal-memory
# alias: opencode plugin opencode-fractal-memory  — that really works
```

It installs **both** targets via `oc-plugin: [["server"],["tui"]]` + `exports["./tui"]`:

- **Server** → `opencode.json: ["opencode-fractal-memory"]` (memory, graph, hooks)
- **TUI** → `tui.json: ["opencode-fractal-memory"]` (`sidebar_content` order 50, `/mem` palette)

No manual `tui.json` edit, no `postinstall` — `src/plugin/install.ts: patchPluginConfig()` does it (`npm install --ignore-scripts`). After install **restart OpenCode** (it loads from `~/.cache/opencode/packages/opencode-fractal-memory@latest`).

**Local dev** (this repo): `bun run dev-install` (build + sync cache + ensure `tui.json` npm spec + platform binaries for `sqlite-vec`).

Published `0.8.3` (`sqlite-vec v0.1.9` brute-force, `oc-plugin`).

## Features

- **Memory nodes** — structured persistent memory with labels, content, metadata, and type system
- **Dot nodes** — store Graphviz DOT source as a memory node (`type: "dot"`). Dot nodes are automatically sticky and skip embedding generation (diagram source isn't semantic text), so they survive compression and cost no vector storage. The management app renders them in-browser via the vendored `@viz-js/viz` WASM build (`management/public/vendor/viz-global.js`) — select a `dot:` node and click **◈ Open Diagram** for a pan/zoomable, fit-to-view rendering. `dot:` labels get the ×1.25 purpose-quality boost. Example: `memory(mode="set", type="dot", label="dot:auth-flow", content="digraph G {\\n  rankdir=LR;\\n  A -> B -> C;\\n}")`
- **Semantic search** — ONNX-powered embeddings (all-MiniLM-L6-v2) with sqlite-vec brute-force `vec_distance_cosine` on `memory_nodes.embedding_blob` (`v0.1.9`, fallback HNSW)
- **Native ONNX runtime** — `onnxruntime-node` with multi-threaded CPU execution (`intraOpNumThreads: 0`), full graph optimization (`graphOptimizationLevel: "all"`), CPU memory arena, and denormal/GELU approximation flags. 12-15× faster embedding inference vs WASM
- **BM25 hybrid search + dual retrieval** — keyword + vector hybrid scoring with dynamic weight adjustment; code queries get boosted BM25 weight for exact pattern matching. BM25 runs independently across ALL scope nodes (not just vector candidates), catching keyword matches outside the vector neighborhood and covering nodes without embeddings
- **Multi-hop temporal expansion** — temporally adjacent nodes (NEXT / DURING_SESSION edges) expanded up to 3 hops with 0.7^depth score decay, configurable via `temporal_hops` arg
- **Fractal retrieval** — drill-down from high-level summaries to granular details
- **Automatic compression** — periodically summarizes low-level nodes into progressively higher-level abstractions (4 levels + LLM-powered summaries)
- **Auto-retrieve (agent-pull model)** — reranks agent's `memory(mode="search")` results via Ollama LLM judge, in-process ONNX cross-encoder, or pure-JS fallback scoring (keyword overlap + metadata). No auto-injection — the agent pulls what it needs
- **Ollama / cross-encoder reranking** — dual-strategy reranking: LLM judge (via Ollama) or in-process ONNX cross-encoder (`Xenova/ms-marco-MiniLM-L-6-v2`) for better relevance, plus a zero-dep fallback scorer when neither is available
- **Rerank intent system** — agents can signal what type of information to prioritize (facts, concepts, rules, etc.) via `pref:rerank-intent` preference node; scoring boosts matching node types
- **LLM compression** — uses LLM to generate richer summaries instead of regex extraction
- **Auto-distill** — automatically extracts actionable rules from lesson nodes into `### Auto-Learned` section
- **Purpose-centric lessons** — at session idle, auto-extracts a distilled `lesson` node (type `lesson`, label `lesson:<ts>`, tag `sig:<failed-tools>`) from the session's failed tool calls — what failed, on which files, and how to avoid it next time. ArcticMem-style dedup: a lesson whose failure signature already exists is skipped. Config: `autoLessons {enabled (default true), minFailures (2), useLlm}`. Optional LLM pass generates concrete prevention rules. Impl at `src/application/lesson-extraction.ts`
- **Auto work capture** — the success-mirror of auto-lessons: at session idle, distills a `work:<ts>` knowledge node (type `knowledge`, tag `sess:<sessionId>`) from the session's successful edit/write tool calls — files touched + tools used, optional LLM "what was done" summary. So failures become `lesson:` nodes AND completed work becomes `work:` nodes — neither direction of session history is lost. Config: `autoCapture {enabled (default true), minEdits (1), useLlm (false), maxPerSession (3)}`. Dedup: per-session cap via `sess:` tag. Impl at `src/application/work-capture.ts`
- **Purpose-based search ranking** — RRF final scoring applies a quality multiplier: curated purpose labels (`lesson:`/`decision:`/`convention:`/`fact:` ×1.3, `knowledge:`/`rule:`/`skill:` ×1.25, `plan:`/`task:` ×1.1) are boosted while `storedcontext` session dumps (×0.5) and `middle-term:`/`[history]` snapshots (×0.6) are demoted, so distilled knowledge outranks raw session noise
- **Intent-aware retrieval** — `searchByEmbedding` accepts `intent` (read/edit/debug/discovery) and boosts purpose-typed nodes per intent: `debug`→`lesson`/`bug`/`fix`, `read`→`knowledge`/`concept`/`architecture`, `edit`→`convention`/`decision`/`preference` (×1.4 each)
- **Predictive rating** — adjusts memory usefulness scores over time based on usage patterns
- **Cache system** — in-memory LRU cache for frequently accessed nodes with configurable TTL
- **Consolidation** — extracts semantic facts from episodic node clusters on session idle
- **Command compression** — zero-dependency compression of bash tool output via a registry-driven pipeline (`pipeline.ts` + 12-entry strategy registry: ls, test, grep, git-status, git-log, git-diff, git-quick, git pull, truncate + generic fallback). Tiered gates (verbatim pass-through, net-win, benign-aware threshold). Optional Ollama extraction via small local model as last-resort. Stats tracked in `compression_stats` table. View via management app Compress tab
- **Context dashboard** — new management app tab showing memory node count/tokens by level, active rules, compression stats, recent injection history, and estimated total context usage with overhead breakdown
- **Structural shape detection** — automatically detects output shape (JSON, CSV, stack-trace, tree, table, compiler-diagnostics, test-output, npm-install, coverage-log) and applies tailored compressors (e.g., JSON → `Object(12 keys)`, stack-trace → error + unique frame count, compiler-diagnostics → errors grouped by file with codes). Falls through to generic if shape is unknown
- **SmartFilter** — noise-stripping preprocessor in shape detection: removes separator lines, progress bars, repeated punctuation, and leading/trailing blank lines before shape classification. Logged as `shape-json`, `shape-csv`, etc. with noise counts
- **Fuzzy dedup** — after exact SHA-256 dedup fails, computes trigram Jaccard similarity against recent outputs (threshold 0.85) to catch near-duplicates (timestamps, whitespace diffs). Logged as `fuzzy-dedup` in compress.log
- **Adaptive pressure** — tracks estimated context token usage; issues warnings and tightens `maxLines` (50→35→20→5) at configurable thresholds (70/85/95%). Logged to compress.log per phase transition
- **Output offloading** — when compressed output exceeds threshold (default 8K chars), writes to `~/.config/opencode/scratch/<hash>.out` and replaces with a short reference banner. Logged with offload_path and offload_bytes
- **Output token control** — injects `<system_reminder type="suggestion">` rules into the system prompt that constrain the agent's response length (sentence limit, char limit, bullet-only, or custom prompt). Mode: adaptive (tightens at context pressure thresholds), always-on, or off. 24 configurable fields. Logged to compress.log
- **Relevance trimming** — signal-word scoring: error terms (fail, error, fatal, exception) get +5 boost, keyword density weighted by position. Drops sub-threshold lines (default 0.15). Replaces legacy TF-IDF. Config via `commandCompression.relevanceTrimming*` fields. Opt-in (default false)
- **Relevant generic truncation** — relevance-weighted line selection instead of blind top-N truncation. Scores each line by signal-word density and keeps the highest-scoring lines up to maxLines when generic fallback fires. Falls back to blind truncation if relevance scoring fails
- **Delta compression** — when the same command runs again and output is ≥50% similar, emits only the diff lines (prefix/suffix) instead of the full compressed output. Config via `commandCompression.deltaCompression*` fields. Logged as `delta` in compress.log
- **Before/after compression statistics** — each compression event stores original_lines, compressed_lines, cmd_preview, and full content previews (up to 2K chars) in the DB. Management UI shows side-by-side before/after detail with expandable row modal
- **Code-aware output compression** — detects TS/JS/Python/Rust/Go/Java output and extracts imports + signatures + error lines with preserved line references instead of full file dumps
- **Session-persistent compression cache** — per-session JSON cache at `~/.config/opencode/scratch/session-<id>-cache.json` with 60-min TTL and 30s auto-save. Prevents redundant re-compression of identical command outputs within a session
- **Tool call deduplication** — LRU cache of tool call signatures per turn suppresses repeated identical calls (same tool + same args) before they waste LLM context. Config via `toolDedup` flag (default: on)
- **Error input pruning** — after 4 turns, replaces errored tool call input strings with `[<tool_name> call failed]` placeholder to reclaim context tokens without losing the failure signal. Config via `errorPruning` flag (default: off)
- **Structured memory injection** — injected memories formatted as XML-tagged `<memory_context label="..." type="..." importance="...">` blocks with structured metadata instead of raw text, improving LLM parsing of injected context
- **Stored context structured summaries** — `storedcontext` nodes (from compaction) now include a YAML header with `tools_used:`, `files_modified:`, `key_errors:`, `token_usage:`, and `turn_count:` fields for efficient cross-session scanning
- **Bounded compaction capture** — prevents the recursive middle-term blowup (opencode RSS 9+ GB): fallback cache fill excludes `middle-term:`/`storedcontext:` labels, middle-term capture is capped at 12 KB total / 2 KB per entry, `session.messages` fetch is limited to 20 messages with 2 KB text slices, and storedcontext nodes are created without ONNX embeddings (no in-process model inference during compaction). Working-cache content is capped at 8 KB per entry. Giant-node cleanup: `bun run scripts/cleanup-giant-nodes.ts --dry-run|--force`
- **Cross-session context injection** — on new sessions, searches `storedcontext` nodes via `searchText` and injects structured summaries of prior sessions as `<system_reminder type="info">` blocks. 60s throttle between fetches
- **Injection visibility** — every injection surface emits `[memory-plugin:<feature>]` inline markers + a per-turn digest summary message, and persists to `injection_metrics` (so previously-silent injections — re-read, compression, graph-context — appear in the management live feed). Config: `injectionVisibility {enabled, markers, digest}` (all default true). Impl: `src/application/injection-visibility.ts`
- **Adaptive rule selection** — scores each rule against the current user message via keyword-overlap similarity. Mandatory rules always inject; standard/suggestion/info need ≥0.15 relevance threshold. Logged with injected/total counts
- **Progressive rule disclosure** — at context pressure thresholds, strips non-essential rules: >75% removes suggestion/info, >85% removes standard, >95% requires ≥0.50 relevance for any non-mandatory rule. Reads global `__pressureState` from output-token-control
- **Proactive compaction nudge** — when context pressure hits warn(75%)/aggressive(85%)/critical(95%), injects a context-pressure warning into the system prompt urging the agent to use `context(mode="recall")`, `context(mode="middle_term")`, or `memory(mode="search")` to reduce token usage
- **Graph preamble on read** — auto-injects code dependency context (imports, symbols, dependents) when reading files. Gated by `graph.enabled`. Impl at `src/plugin/hooks/graph-context.ts`
- **Auto-skeletonize on large reads** — when reading files ≥ `autoSkeletonizeMinLines` lines, generates a skeleton (imports + symbols) before the content. Impl at `src/plugin/hooks/graph-context.ts`
- **Auto graph hints on grep/glob/search** — after search tools, appends up to 3 matching code graph symbol suggestions. Impl at `src/plugin/hooks/graph-search-hint.ts`
- **Edit-time dependency warning** — warns when editing a file that has dependents in the code graph. Impl at `src/plugin/hooks/graph-edit-check.ts`
- **Skeletonize tool** — standalone explicit `skeletonize(path)` tool to extract file skeleton on demand. Core logic at `src/application/skeletonize.ts`
- **Code knowledge graph** — builds a directed graph of code symbols (functions, classes, interfaces, types) and their relationships (calls, imports, references, defined_in, extends) via tree-sitter WASM AST extraction. 32 supported languages. Louvain community detection clusters related code; god-node and surprising-connections analysis highlight architectural hotspots
- **Pull-based code graph** — graph builds automatically on plugin init and auto-refreshes on `edit`/`write` (configurable via `graph.refreshEnabled`). No banner injection on reads, no system rule spamming. Agents call the `graph` tool on demand with `relation=callers|callees|call_chain|imports|dependents|search|explain|path`. Incremental rebuild on `session.idle` catches external changes.
- **Graph usage tracking** — every graph action (build, search, path, explain, graph tool call, background build) is counted in-memory and logged to `graph-usage.log` with source identifier (`mcp`, `management`, `plugin-hook`, `buildGraph`, etc.) and session ID for audit
- **Session logging** — opt-in session log with 1MB rotation for observability
- **Journal** — searchable journal entries (type: `journal` memory nodes) with semantic search
- **Playbooks** — reusable workflow templates (sticky memory nodes) proposed by the agent
- **Management server** — local web UI (port 8787) for browsing, searching, editing, backup/restore, and 3D visualization with temporal edge rendering. Settings panel organized into 5 collapsible categories, resizable sidebar with persisted width
- **Multi-graph retrieval** — temporal edges (NEXT, DURING_SESSION, CAUSAL, REFERENCES, RELATED_TO) expanded during search with confidence-weighted hop decay
- **Auto-edge creation** — `memory(mode="set")` auto-creates NEXT edges (session chaining) and REFERENCES edges (from `label:xxx` patterns) during active sessions
- **Synthetic evaluation** — 79-node/175-QA benchmark dataset for reproducible retrieval quality metrics (HitRate, Recall, Precision, MRR)
- **Sub-agents** — `memory-hints`, `memory-researcher`, and `translate` agents for guided interaction
- **Agent tool proactivity** — three mechanisms to ensure the agent proactively uses the right tools instead of defaulting to read/grep/glob/bash:
  - **Directive tool descriptions** — all 6 consolidated tool descriptions rewritten to say "USE INSTEAD OF X" and "USE WHEN Y" with explicit triggers and token-cost comparisons
  - **Pre-execution guard hook** — `tool.before` hook intercepts read/grep/glob/bash calls and injects a `[cost-saver]` hint when the code graph has a cheaper alternative. Impl at `src/plugin/hooks/tool-before-guard.ts`
  - **Never-strip decision tree** — `rule:mandatory:tools` seed node now has `never_strip: true` + a 7-step ordered decision tree (`graph > context > memory(mode="search") > graph(callees) > memory(mode="set") > learn`) that's always injected at the very front of the system prompt, never pressure-filtered

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| **OpenCode** | v1.17.0+ | SDK peer dependency |
| **Bun** | >=1.0.0 | Plugin runtime |
| **Node.js** | >=18 | For npm-based installs only |

## Installation

### For OpenCode users

Add the plugin name to `~/.config/opencode/opencode.json`:

```json
{
  "plugin": ["opencode-fractal-memory"]
}
```

OpenCode installs it automatically at startup from npm. Model files (~24 MB) download on first plugin load via `ensureModels()` — no manual steps needed.

### Updating

OpenCode caches plugins at `~/.cache/opencode/packages/`. After publishing a new version, force a cache refresh:

```bash
cd ~/.cache/opencode/packages/opencode-fractal-memory@latest/node_modules/opencode-fractal-memory/
bun add opencode-fractal-memory@latest
```

Or use the dev-install script from a local clone (recommended for development — syncs the plugin cache that OpenCode actually loads, copies all files + runtime deps, prints a RESTART REQUIRED warning):

```bash
cd <your-local-clone>
bun run dev-install                 # build + clean + sync to ~/.config/opencode + plugin cache
bun run dev-install --skip-build    # skip tsc, just sync
```

Then restart OpenCode — the running process holds the plugin in memory and won't see disk changes until restart.

Why a script: OpenCode loads the plugin ONLY from the cache dir (`~/.cache/opencode/packages/opencode-fractal-memory@latest/node_modules/opencode-fractal-memory/`) — beacon-proven via the `PLUGIN_LOADED_FROM` startup log in `~/.config/opencode/logs/memory-plugin.log`. The `~/.config/opencode/node_modules` copy is legacy and never read by OpenCode. `scripts/dev-install.ts` syncs the cache. VS Code: "Dev Install Plugin (build+clean+sync)" launch config.

This is a known OpenCode issue: [#6774](https://github.com/anomalyco/opencode/issues/6774), [#10546](https://github.com/anomalyco/opencode/issues/10546), [#25293](https://github.com/anomalyco/opencode/issues/25293).

### For development / manual install

```bash
npm install opencode-fractal-memory
```

Models download on first run. Use `--ignore-scripts` if installing via Bun (Bun skips lifecycle scripts).

### MCP server setup

Enables memory tools in IDEs that support the Model Context Protocol (Cursor, Windsurf, etc.):

```json
{
  "mcp": {
    "fractal-memory": {
      "type": "local",
      "command": ["bun", "run", "~/.cache/opencode/packages/opencode-fractal-memory@latest/node_modules/opencode-fractal-memory/dist/mcp-server.js"],
      "enabled": true
    }
  }
}
```

## Configuration

Create `~/.config/opencode/opencode-mem.json` to customize (optional — all defaults work out of the box). This is the **single** config file — all settings including journal and management live here:

```json
{
  "autoRetrieve": {
    "enabled": true,
    "candidateCount": 30,
    "maxInjectNodes": 5,
    "maxInjectPlaybooks": 3,
    "minQueryLength": 10,
    "injectionCooldownMs": 30000,
    "llmJudgeEnabled": true
  },
  "ollama": {
    "enabled": false,
    "baseUrl": "http://localhost:11434",
    "model": "qwen2.5-coder:1.5b",
    "mode": "binary",
    "strategy": "llm"
  },
  "llmCompression": {
    "enabled": false,
    "maxSummaryTokens": 500
  },
  "autoDistill": {
    "enabled": false,
    "minLessons": 3,
    "useLlm": false
  },
  "autoLessons": {
    "enabled": true,
    "minFailures": 2,
    "useLlm": false
  },
  "autoCapture": {
    "enabled": true,
    "minEdits": 1,
    "useLlm": false,
    "maxPerSession": 3
  },
  "autoConsolidate": {
    "enabled": false,
    "similarityThreshold": 0.3,
    "maxFactsPerCluster": 5,
    "minClusterSize": 2
  },
  "predictiveRating": {
    "enabled": false,
    "decayDays": 30,
    "confidenceThreshold": 0.3,
    "positiveBoost": 0.1,
    "negativePenalty": 0.05
  },
  "management": {
    "enabled": true,
    "port": 8787
  },
  "journal": {
    "enabled": false
  },
  "maxInjectionTokens": 8000,
  "coreInjectionTokens": 2000,
  "cacheSize": 8,
  "cacheTTLHours": 2,
  "autoCompressThreshold": 0.7,
  "highContextThreshold": 0.6,
  "criticalContextThreshold": 0.8,
  "defaultTtlDays": 0,
  "enableMiddleTermCapture": true,
  "graph": {
    "enabled": true,
    "maxFiles": 5000,
    "autoSkeletonizeMinLines": 300
  },
  "commandCompression": {
    "enabled": true,
    "maxLines": 50,
    "excludeCommands": ["curl", "wget"],
    "alwaysFullOnFailure": true
  },
  "sessionLog": {
    "enabled": false
  }
}
```

### Config reference

| Field | Type | Default | Description |
|---|---|---|---|---|
| `autoRetrieve.enabled` | bool | `false` | Enable automatic memory injection into prompts |
| `autoRetrieve.candidateCount` | int | `30` | Number of candidates to fetch for injection |
| `autoRetrieve.maxInjectNodes` | int | `5` | Max memory nodes to inject per turn |
| `autoRetrieve.maxInjectPlaybooks` | int | `3` | Max matching playbooks to list |
| `autoRetrieve.minQueryLength` | int | `10` | Min user message length to trigger injection |
| `autoRetrieve.injectionCooldownMs` | int | `30000` | Min ms between injections (rate limit) |
| `autoRetrieve.llmJudgeEnabled` | bool | `true` | Use SDK `session.prompt({noReply:true})` for relevance scoring when Ollama is off |
| `ollama.enabled` | bool | `false` | Use local LLM for reranking search results |
| `ollama.baseUrl` | string | `http://localhost:11434` | Ollama server URL |
| `ollama.model` | string | `qwen2.5-coder:1.5b` | Model for reranking |
| `ollama.mode` | enum | `"binary"` | `"binary"` (relevant/not) or `"score"` (0-1 rating) |
| `ollama.strategy` | enum | `"llm"` | `"llm"` (LLM judge via Ollama) or `"cross-encoder"` (in-process ONNX cross-encoder) |
| `llmCompression.enabled` | bool | `false` | Use LLM for richer compression summaries |
| `llmCompression.model` | string | _none_ | LLM model name (uses ollama if not set) |
| `llmCompression.maxSummaryTokens` | int | `500` | Max tokens per LLM-generated summary |
| `autoDistill.enabled` | bool | `false` | Auto-extract rules from lesson nodes |
| `autoDistill.minLessons` | int | `3` | Min lessons before extraction |
| `autoDistill.useLlm` | bool | `false` | Use LLM for more specific rules |
| `autoLessons.enabled` | bool | `true` | Extract lesson nodes from failed tool calls at session idle |
| `autoLessons.minFailures` | int | `2` | Min failed tool calls before extracting a lesson |
| `autoLessons.useLlm` | bool | `false` | Generate concrete prevention rules via LLM |
| `autoCapture.enabled` | bool | `true` | Distill a `work:` knowledge node from successful edits at session idle |
| `autoCapture.minEdits` | int | `1` | Min successful edit/write calls before capturing |
| `autoCapture.useLlm` | bool | `false` | Generate a "what was done" summary via LLM |
| `autoCapture.maxPerSession` | int | `3` | Max work nodes captured per session (dedup via `sess:` tag) |
| `autoDiscover.enabled` | bool | `false` | Auto-detect playbook patterns from tool call sequences |
| `autoDiscover.minSequenceLength` | int | `3` | Min steps for a detected pattern |
| `autoDiscover.minRepeatCount` | int | `2` | Min repeats to qualify as a pattern |
| `autoDiscover.maxInjectPlaybooks` | int | `3` | Max proposed playbooks per detection |
| `autoConsolidate.enabled` | bool | `false` | Extract semantic facts from episodic session clusters on idle |
| `autoConsolidate.similarityThreshold` | float | `0.3` | Cosine similarity threshold for clustering episodic nodes |
| `autoConsolidate.maxFactsPerCluster` | int | `5` | Max facts to extract per cluster |
| `autoConsolidate.minClusterSize` | int | `2` | Min episodic nodes needed to form a cluster |
| `predictiveRating.enabled` | bool | `false` | Auto-decay and boost node usefulness |
| `predictiveRating.decayDays` | int | `30` | Days until usefulness decay (exponential half-life) |
| `predictiveRating.confidenceThreshold` | float | `0.3` | Min confidence to count as relevant |
| `predictiveRating.positiveBoost` | float | `0.1` | Usefulness boost on positive rate |
| `predictiveRating.negativePenalty` | float | `0.05` | Usefulness penalty on negative rate |
| `maxInjectionTokens` | int | `8000` | Max tokens allowed in a single injection |
| `coreInjectionTokens` | int | `2000` | Tokens reserved for core rules in injection |
| `cacheSize` | int | `8` | Max cached nodes in LRU cache |
| `cacheTTLHours` | int | `2` | Cache entry TTL in hours |
| `autoCompressThreshold` | float | `0.7` | Context usage ratio triggering auto-compression |
| `highContextThreshold` | float | `0.6` | Token usage ratio for high context warning |
| `criticalContextThreshold` | float | `0.8` | Token usage ratio for critical warning |
| `defaultTtlDays` | int | `0` | Default TTL for new nodes (0 = no expiry) |
| `enableMiddleTermCapture` | bool | `true` | Save middle-term snapshots before compression (capture capped at 12 KB total / 2 KB per entry) |
| `management.enabled` | bool | `false` | Auto-start the management web UI on plugin init |
| `management.port` | int | `8787` | Port for the management server |
| `journal.enabled` | bool | `false` | Enable append-only searchable journal entries |
| `graph.enabled` | bool | `true` | Enable code knowledge graph (AST extraction + `graph` tool + auto-refresh) |
| `graph.maxFiles` | int | `5000` | Max files to extract in background build |
| `graph.refreshEnabled` | bool | `true` | Auto-re-extract on edit/write |
| `graph.autoSkeletonizeMinLines` | int | `300` | Min file lines to auto-generate skeleton on read |
| `commandCompression.enabled` | bool | `true` | Compress bash tool output |
| `commandCompression.maxLines` | int | `50` | Max lines for generic truncation |
| `commandCompression.excludeCommands` | string[] | `["curl","wget"]` | Commands to never compress |
| `commandCompression.alwaysFullOnFailure` | bool | `true` | Preserve full output on non-zero exit |
| `sessionLog.enabled` | bool | `false` | Log session events to separate file |
| `toolDedup` | bool | `true` | Deduplicate repeated identical tool calls within a turn |
| `errorPruning` | bool | `false` | Replace errored tool call inputs with placeholders after 4 turns |
| `commandCompression.relevanceTrimmingEnabled` | bool | `false` | Signal-word relevance trimming of command output |
| `commandCompression.relevanceTrimmingThreshold` | float | `0.15` | Min TF-IDF score to keep a line |
| `commandCompression.relevanceTrimmingMinKeep` | int | `5` | Min lines to keep regardless |
| `commandCompression.relevanceTrimmingAlwaysKeepTop` | int | `3` | Always keep top N lines |
| `commandCompression.deltaCompressionEnabled` | bool | `true` | Delta/differential compression for repeated commands |
| `commandCompression.deltaMaxCacheSize` | int | `50` | Max cached outputs per command |
| `commandCompression.deltaMinSimilarity` | float | `0.5` | Min Jaccard similarity to attempt delta |
| `outputTokenControl.enabled` | bool | `false` | Inject concise-output rules into system prompt |
| `outputTokenControl.mode` | enum | `"adaptive"` | `"adaptive"`, `"always-on"`, or `"off"` |
| `outputTokenControl.strategy` | enum | `"concise"` | `"concise"`, `"sentence_limit"`, `"char_limit"`, `"bullet_only"`, `"custom"` |
| `outputTokenControl.maxSentences` | int | `5` | Sentence limit (base/always-on) |
| `outputTokenControl.maxChars` | int | `0` | Global char limit (0 = disabled) |
| `outputTokenControl.customPrompt` | string | `""` | Custom rule text for `custom` strategy |
| `outputTokenControl.warnThreshold` | float | `0.7` | Context % for warn level |
| `outputTokenControl.aggressiveThreshold` | float | `0.85` | Context % for aggressive level |
| `outputTokenControl.criticalThreshold` | float | `0.95` | Context % for critical level |
| `outputTokenControl.normalSentences` | int | `5` | Sentence limit at normal pressure |
| `outputTokenControl.warnSentences` | int | `3` | Sentence limit at warn pressure |
| `outputTokenControl.aggressiveSentences` | int | `1` | Sentence limit at aggressive pressure |
| `outputTokenControl.criticalSentences` | int | `1` | Sentence limit at critical pressure |
| `outputTokenControl.normalStrategy` | enum | `"concise"` | Strategy at normal pressure |
| `outputTokenControl.warnStrategy` | enum | `"sentence_limit"` | Strategy at warn pressure |
| `outputTokenControl.aggressiveStrategy` | enum | `"sentence_limit"` | Strategy at aggressive pressure |
| `outputTokenControl.criticalStrategy` | enum | `"char_limit"` | Strategy at critical pressure |
| `outputTokenControl.normalPrompt` | string | `""` | Custom prompt at normal (for custom strategy) |
| `outputTokenControl.warnPrompt` | string | `""` | Custom prompt at warn |
| `outputTokenControl.aggressivePrompt` | string | `""` | Custom prompt at aggressive |
| `outputTokenControl.criticalPrompt` | string | `""` | Custom prompt at critical |
| `outputTokenControl.excludePatterns` | string[] | `[]` | Regex patterns to skip constraint injection |

## Advanced Features

### Reranking (LLM / Cross-Encoder)

Auto-retrieve results can be re-ranked for better relevance using one of two strategies, configurable via the `ollama.strategy` field or the management app:

```json
{
  "ollama": {
    "enabled": true,
    "baseUrl": "http://localhost:11434",
    "model": "qwen2.5-coder:1.5b",
    "mode": "binary",
    "strategy": "llm"
  }
}
```

**LLM judge** (`strategy: "llm"`, default) — scores candidates via Ollama chat API. In `"binary"` mode the LLM labels each as relevant or not; in `"score"` mode it assigns a 0-1 relevance rating.

**Cross-encoder** (`strategy: "cross-encoder"`) — runs an in-process ONNX cross-encoder (`Xenova/ms-marco-MiniLM-L-6-v2`, ~23 MB) for deterministic relevance scoring without needing Ollama. The model auto-downloads on first use via `ensureModels()`. This bypasses Ollama's missing `/api/rerank` endpoint entirely.

**SDK LLM judge** — when Ollama is disabled and `autoRetrieve.llmJudgeEnabled` is true (default), the plugin calls `client.session.prompt({noReply:true})` to have the session's LLM score memory relevance directly. Falls back to heuristic scoring if no session client is available. Configurable via `autoRetrieve.llmJudgeEnabled` in the management app Settings → Memory & Storage.

### Rerank Intent

Agents can tell the memory system what kind of information to prioritize by setting a preference node:

```
memory(mode="set",
  label: "pref:rerank-intent",
  content: "boost: fact=1.5, rule=0.5, concept=1.2",
  type: "pref"
)
```

The `boost:` line lists node types with priority multipliers. Types not listed get neutral weight (1.0). Setting weight 0 suppresses a type entirely. The auto-retrieve hook reads this node before scoring and applies the multiplier to each candidate's hybrid score. The reranker then re-ranks the already-boosted candidates — effectively guiding the reranker toward the types the agent needs.

Works with any memory type: `fact`, `concept`, `lesson`, `howto`, `decision`, `architecture`, `bug`, `fix`, and more. The rule is reset when a new `pref:rerank-intent` node is set.

### LLM Compression

Instead of regex-based compression (which extracts keywords), LLM compression generates richer natural-language summaries:

```json
{
  "llmCompression": {
    "enabled": true,
    "model": "qwen2.5-coder:1.5b",
    "maxSummaryTokens": 500
  }
}
```

Invoke manually with `context(mode="llm_compress")`.

### Auto-Distill

Periodically extracts actionable rules from `lesson`-type nodes created by `learn(mode="reflect")`. Rules are stored as `rule:standard:*` / `rule:suggestion:*` nodes for immediate injection:

```json
{
  "autoDistill": {
    "enabled": true,
    "minLessons": 3,
    "useLlm": false
  }
}
```

Set `useLlm: true` for LLM-generated rules instead of keyword extraction.

### Episodic / Semantic Memory Categories

Every memory node is auto-categorized on creation based on its type. This affects retrieval, decay, and consolidation:

| Category | Types | Half-life | Search weight |
|---|---|---|---|
| **Episodic** | event, note, session, task, plan, exploration, debug-investigation, improvement, review | 7 days | 0.5× importance |
| **Semantic** | concept, fact, lesson, rule:*, decision, architecture, howto, preference, convention, skill, playbook, knowledge, research, core, summary, bug, fix, etc. | 365 days | 1.0× importance |

- **Episodic** nodes decay fast and are weighted lower in search — they represent session-level traces.
- **Semantic** nodes persist long-term and are boosted in search — they represent learned knowledge.
- Use `category_filter` on `memory(mode="search")` to scope searches (e.g. `memory(mode="search", query="...", category_filter="semantic")`).
- Dashboard shows the category distribution.

### Consolidation

When a session goes idle, `autoConsolidate` extracts semantic facts from episodic clusters and promotes them to `type: "fact"` nodes. This creates a bridge from ephemeral session traces to long-term knowledge:

```json
{
  "autoConsolidate": {
    "enabled": true,
    "similarityThreshold": 0.3,
    "maxFactsPerCluster": 5,
    "minClusterSize": 2
  }
}
```

How it works:
1. Collects all episodic nodes created during the session
2. Clusters them by cosine similarity of their embeddings
3. Extracts declarative statements (uses "is"/"has"/"uses"/"defines" patterns)
4. Creates new `type: "fact"` semantic nodes with `parentIds` pointing back to source episodic nodes
5. Facts persist with full semantic weight and long decay half-life (365 days)

### Predictive Rating

Automatically adjusts node usefulness scores over time. Frequently accessed nodes get boosted; nodes that haven't been touched in `decayDays` get gradually decayed:

```json
{
  "predictiveRating": {
    "enabled": true,
    "decayDays": 30,
    "confidenceThreshold": 0.3,
    "positiveBoost": 0.1,
    "negativePenalty": 0.05
  }
}
```

### Command Compression

Built-in, zero-dependency compression for bash tool output. A tiered pipeline (`pipeline.ts`) gates eligibility (verbatim pass-through below `verbatimBelowLines`=40 lines / <80 chars, net-win token gate, benign-aware threshold), then dispatches to a 12-entry strategy registry (`strategy.ts`):

| Strategy | Matches | Output |
|---|---|---|
| `ls` | `ls`, `tree` | Filenames kept up to `keepNames` (never bare counts) |
| `test` | `npm test`, `bun test`, `pytest`, etc. | Pass/fail summary + failure details |
| `grep` | `grep`, `rg` | Matched lines kept up to `keepMatches`, grouped by file with counts |
| `git-status` | `git status` | Changed-file list (long format + porcelain ` M`/`?? `/`A `) |
| `git-log` | `git log` | One-line per commit |
| `git-diff` | `git diff` | N files changed, +M -L |
| `git-quick` | `git push/pull/commit/add` | One-line summary each |
| `truncate` | `cat`, `head`, `build`, `docker`, `find`, `tail` | Dedup + maxLines (default 50) |
| `generic` | (fallback) | Shape detection → relevance trim → truncate at maxLines |

Error-bearing output always passes through verbatim (`isSignalOutput`); payload-preserving commands (grep/ls/git/test) keep their answer lines. Original output is stashed on every compression with a `[Original stashed — cat <path>]` recovery marker. Every gate decision and strategy run is logged to `logs/memory-plugin.log` (`skip reason=…`, `strategy-ran`, `compressed`).

Stats tracked in the `compression_stats` table. View at management app → **Compress** tab. Full output preserved on non-zero exit (tee mode).

**Relevance trimming** — when enabled, TF-IDF scores each line against command terms and drops lines below the threshold. Keeps at least `minKeep` lines and always preserves the top `alwaysKeepTop` lines. Config under `commandCompression.relevanceTrimming*`.

**Delta compression** — when the same command runs multiple times and the new output is ≥50% similar (Jaccard) to the cached previous output, only the differing lines are emitted as a delta. The delta shows `- prefix lines` + new content + `+ suffix lines`. Config under `commandCompression.deltaCompression*`.

```json
{
  "commandCompression": {
    "enabled": true,
    "maxLines": 50,
    "excludeCommands": ["curl", "wget"],
    "alwaysFullOnFailure": true
  }
}
```

Configure via `~/.config/opencode/opencode-mem.json` or the management app Settings → AI & Compression.

## Commands

All memory operations go through four consolidated tools:

| Tool | Description |
|------|-------------|
| `memory(mode)` | Core CRUD — search, get, set, delete, list, drilldown, drilldown_query, fetch, replace |
| `context(mode)` | Context management — check, compress, llm_compress, total_tokens, inject, middle_term, recall, cache_status, tool_stats, session_stats |
| `learn(mode)` | Learning & quality — reflect, distill, verify, rate, stats, dashboard, temporal_edges, extract_patterns, injection_feedback |
| `journal(mode)` | Session journaling — write, read, search, migrate |

Playbooks are stored as `type: "playbook"` memory nodes with steps in `metadata`. CRUD uses generic `memory(mode="set")` / `memory(mode="get")` / `memory(mode="search")`.

### MCP tools

When the MCP server is configured, the memory and graph tools are available as MCP resources for IDE integration.

| Tool | Description |
|---|---|
| `graph(relation, name?, file?, depth?, query?, from?, to?, id?, limit?)` | Unified code graph navigator. Relations: `callers`/`callees`/`call_chain`/`imports`/`dependents`/`search`/`explain`/`path`. Returns JSON with `{relation, results, truncated}` |

## Memory Tool Usage Best Practices

Always use the `memory` tool for ALL node CRUD (search/get/set/delete/list). Never use bash+sqlite3 — it bypasses embeddings, BM25, compression tracking, and triggers output compression overhead (scratch file stashing, pipe tangling).

### Tool Selection Order
1. `memory(mode="search")` — always first, 100x cheaper than reading files cold
2. `memory(mode="drilldown")` or `memory(mode="get")` — after search finds the node
3. `memory(mode="set")` — store discoveries as you find them
4. `memory(mode="replace")` — fix outdated content
5. `memory(mode="delete")` — remove stale/test artifacts

### Source-of-Truth Linking
Every memory node should answer "where in the repo can this be checked?" Encode verification pointers as structured tags:

- `file:src/foo.ts` — file path
- `fn:calculateTotal` — function/symbol name
- `commit:abc123` — commit hash
- `line:42` — line number
- `test:testCalculateTotal` — test name
- `cmd:make migrate` — command used to validate

Searchable via `tagsFilter` with intersection semantics (e.g. `tagsFilter: ["file:src/foo.ts", "fn:calculateTotal"]`). This convention is documented in the auto-injected node `rule:feature:memory-tool-usage`.

### Cost Awareness
- `search` costs ~100x less than reading files cold
- `set` at creation time is nearly free — prevents re-discovery
- Memory tool costs less than bash/SQL alternatives in every case — bash triggers compression system

### Iterative Improvement
This practice evolves. Update the `rule:feature:memory-tool-usage` node when discovering new patterns, mistakes, or optimal parameter combinations.

## Skills

Skills are specialized instruction sets stored as memory nodes. When a task matches a skill's trigger keywords, its instructions load into context to guide the agent.

### Available skills

| Skill | Triggers |
|---|---|
| `debug-workflow` | bug, error, fix, crash |
| `write-tests` | tests, coverage, test suites |
| `refactor-component` | refactor, restructure, clean up |
| `refactoring-expert` | SOLID, code smell, technical debt |
| `code-reviewer` | review, PR, pull request, code quality, audit |
| `ai-code-pitfalls` | AI generated, hallucinated, copilot, cursor, LLM output |
| `security-review` | security, audit, vulnerability, deploy |
| `threejs-skills` | 3D, WebGL, visualization |
| `svelte-core-bestpractices` | svelte, component, runes |
| `svelte-code-writer` | svelte 5, sveltekit, component |
| `customize-opencode` | opencode config, agent, plugin |
| `context-engineering` | context, prompt, system message |
| `git-workflow-and-versioning` | git, commit, branch, version, publish |
| `incremental-implementation` | step by step, increment, gradual |
| `opencode-plugin-installation` | installation, update, upgrade, cache, stale, version, publish |

### Loading a skill

```ts
memory(mode="set", label="skill:debug-workflow", content="## Instructions...", type="skill", metadata='{"triggers":["bug","error","fix","crash"]}', sticky=true)
```

Skills are auto-injected when triggers match the task context. You can also load them explicitly with `memory(mode="set", label="skill:<name>", ...)`.

### Creating a skill

Skills are memory nodes with `type: "skill"`. Create one with:

```ts
memory(mode="set",
  label: "skill:my-skill",
  content: "## Skill instructions...",
  type: "skill",
  metadata: JSON.stringify({ triggers: ["keyword1", "keyword2"] }),
  sticky: true
)
```

## Sub-agents

The plugin ships with two agent instruction files for specialized memory interaction:

| Agent | File | Purpose |
|---|---|---|
| `memory-hints` | `agent/memory-hints.md` | System-level hints for using memory effectively — injected by the agent when memory-related context is needed |
| `memory-researcher` | `agent/memory-researcher.md` | Analyzes and reports on fractal memory state |

These are loaded by OpenCode's agent system and provide structured guidance for memory operations.

## Management App

A local web UI for browsing, searching, and editing memory — available when the plugin is active.

### Starting

The server starts automatically when `management.enabled: true` is set in `~/.config/opencode/opencode-mem.json` (see [Configuration](#configuration)), or manually:

```bash
bun run view
```

Opens at [http://localhost:8787](http://localhost:8787). The server starts as a background process and auto-stops on plugin shutdown.

### Usage

The app is organized into tab groups — **Monitor** (Dashboard, Settings), **Data** (Nodes/Graph, Search, Context, Backup, Quality, Compress, Tokens), and **Live** (Live Agent, Live Metrics). It runs fully from local files — no CDN is required.

**3D Graph** — the default view shows memory nodes as spheres connected by `[[wiki-link]]` relationships and temporal edges:
- **Drag** to rotate the scene
- **Scroll** to zoom in/out
- **Left-click** a node to select and inspect it
- **Right-click drag** to pan
- Nodes are color-coded by level and type (skill = gold icosahedron, playbook = orange torus, note = blue sphere)
- Playbook nodes render as orange torus shapes with steps visible in the detail panel
- **Dot nodes** — nodes of type `dot` show a full-width **◈ Open Diagram** button at the top of the detail panel; clicking renders the node's Graphviz DOT source in a modal (wheel zoom, drag pan, −/1:1/+ controls, resize re-fits)
- **Temporal edges** render as colored lines: NEXT (green), DURING_SESSION (blue dashed), CAUSAL (red), REFERENCES (yellow dotted), RELATED_TO (magenta) — see the Legend panel for color mapping
- Click a node to see its temporal connections in the detail panel with direction, edge type, and confidence score

**Filters** — narrow down visible nodes:
- **Scope** (global/project)
- **Level** (L0–L5), **Type** (note, skill, playbook, etc.), **Shape**, **Custom Type**
- **Project** — when multiple projects exist, filter by project name
- **Clear All Filters** button resets everything at once
- **Search** — find nodes by content, label, or type:
  - Type a query and press Enter
  - Results show relevance scores and preview snippets
  - Click a result to navigate to it in the graph

**Inspect** — when you click a node (graph or search results):
- View full content and summary
- See metadata JSON (type, importance, access count, timestamps)
- View embedding vector (truncated)
- See linked nodes and navigate between them

**Edit** — modify node fields directly:
- Update content, summary, importance, or type
- Changes persist immediately to the SQLite database
- Embedding auto-regenerates on content change

**Inject** — push a node directly into the agent's context:
- Click "Inject" on any node
- The node appears in the agent's next prompt
- Useful for reminding the agent of past decisions mid-session

**Manage** — the node list view shows all nodes with:
- Scope (global vs project), level, access count
- Last accessed and last verified timestamps
- Actions: edit, delete, verify, inject

**Backup** — the Backup tab lets you create and restore snapshots of your memory data:
- Select sources to back up (config, global DB, project DB) via checkboxes
- Backups stored at `~/.config/opencode/backups/` as flat directories with a `manifest.json`
- DB snapshots use `sqlite3_serialize()` for consistent WAL-safe copies
- Restore with per-source selection — a pre-restore safety backup is auto-created
- Manual retention: list, inspect, and delete backups from the UI

**Context** — shows a unified dashboard of all memory node tokens by level/type, active rules, compression savings, recent injection history, and estimated total LLM context usage (memory + system prompts + tool defs + conversation estimate).

**Dashboard** — memory distribution by level/type/supertype, tag cloud, confidence histogram, and stratum breakdown cards.

**Compress (Before/After)** — the compression tab now shows each event with before/after char counts, line counts, and duration. Click any row to see a modal with the full before/after content preview side-by-side.

**Live Agent** — a real-time conversation feed (polls `/api/live` every 2s) that merges conversation turns, tool calls, injections, and compressions into one filterable, chat-style timeline (newest at the bottom, auto-scrolled into view). The side panel shows live session context and token history.

**Live Metrics** — auto-refreshing cards for injections, compressions, tool calls, and token usage, sourced from the `injection_metrics`, `compression_stats`, and `agent_tool_calls` tables.

## How Plugin Initialization Works

When OpenCode loads the plugin, `initStorage()` runs automatically:

1. **SQLite database** — created at `~/.config/opencode/memory.db` with all tables and indexes. Project-scope nodes are stored alongside global nodes with a `project_name` discriminator column
2. **Seed nodes** — rule nodes, built-in playbooks (6), and skills (15) inserted into `memory_nodes`
3. **Model files** — `ensureModels()` checks `~/.config/opencode/models/` and downloads ONNX + tokenizer (~24 MB) if missing
4. **Agent files** — `ensureAgentFiles()` copies `agent/` directory to `~/.config/opencode/agent/`
5. **Command files** — `ensureCommandFiles()` copies `commands/` directory to `~/.config/opencode/commands/`
6. **Background embeddings** — after 1s, generates embeddings for nodes that lack them
7. **Auto-retrieve hook** — if enabled in config, injects relevant context into prompts

Every initialization step is logged with timing in `logs/memory-plugin.log`, making it easy to diagnose startup issues.

All of this happens automatically — no manual intervention required.

## Hook Timeline — Plugin x OpenCode SDK

The plugin hooks into the OpenCode agent via the Plugin SDK. Here's the exact per-turn lifecycle, from system prompt assembly through tool execution:

### Per-Turn Cycle (each agent reasoning turn)

```
┌─ PHASE 1: SYSTEM PROMPT ───────────────────────────────────────────┐
│  experimental.chat.system.transform                                  │
│                                                                     │
│  seed-rules        Loads rule:mandatory/*, rule:standard,            │
│                    rule:suggestion, rule:feature/* from DB →                  │
│                    injects as <system_reminder> tags.                          │
│                    Adaptive selection scores rules against user message;       │
│                    progressive disclosure at >75%/>85%/>95% pressure           │
│                                                                               │
│  output-token-     If context pressure is high, injects a                     │
│  control           concise-output rule into the system prompt.                 │
│                    At pressure thresholds, also injects compaction nudge       │
│                                                                     │
│  graph-refresh     Auto-re-extract graph on edit/write               │
│                    available" with node/edge counts                  │
└─────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─ PHASE 2: MESSAGES (before LLM) ───────────────────────────────────┐
│  experimental.chat.messages.transform                                │
│                                                                     │
│  messages-         Calls drilldownQuery(userText) for raw memory     │
│  transform         injection into the message list — uses            │
│                    structured <memory_context> XML format             │
│                                                                     │
│  auto-retrieve     Finds memory(mode="search") tool results in pending       │
│                    messages → re-ranks candidates via Ollama /       │
│                    LLM judge / fallback scorer → rewrites order      │
│                                                                     │
│  tool-dedup        LRU cache deduplicates repeated tool calls        │
│                    (same tool + same args in current turn)           │
│                                                                     │
│  error-prune       After 4 turns, replaces errored tool input        │
│                    strings with [<tool> call failed] placeholder     │
└─────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─ PHASE 3: CHAT PARAMS (before LLM) ────────────────────────────────┐
│  chat.params                                                        │
│                                                                     │
│  adaptive-         If pressure phase is warn/aggressive/critical:    │
│  pressure           → clamps temperature (0.5 → 0.1)                 │
│                     → clamps maxOutputTokens (4096 → 1024)           │
└─────────────────────────────────────────────────────────────────────┘
        │
        ▼
╔══════════════════════════════════════════════════════════════════╗
║  PHASE 4: LLM CALL                                               ║
║  ─ Agent reasoning happens here ─                                 ║
║  ─ LLM decides which tools to call ─                              ║
╚══════════════════════════════════════════════════════════════════╝
        │
        ▼  (for EACH tool the LLM calls)
┌─ PHASE 5: TOOL BEFORE ───────────────────────────────────────────┐
│  tool.execute.before                                               │
│                                                                   │
│  read tool:                                                       │
│    re-read-elimination  If file cached + mtime unchanged →        │
│                         serves cached content, **skips** read      │
└─────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─ PHASE 6: TOOL EXECUTES ───────────────────────────────────────────┐
│  (OpenCode runs the actual tool)                                    │
└─────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─ PHASE 7: TOOL AFTER ────────────────────────────────────────────┐
│  tool.execute.after                                                │
│                                                                   │
│  bash tool:                                                       │
│    adaptive-           Records output size → prepends pressure     │
│    pressure            warning if nearing context limit            │
│    compression         Compresses output via delta / fuzzy-dedup / │
│                        12-entry strategy registry (git-*),         │
│                        code-aware shape detection (source-code /   │
│                        compiler-diagnostics / test-output /        │
│                        npm-install / coverage-log),                │
│                        session-persistent cache → may offload      │
│                        >8KB to scratch dir                         │
│                                                                   │
│  read tool:                                                       │
│    graph-context      Auto-inject dependency context (imports,    │
│                       symbols, dependents) from code graph;       │
│                       if file ≥ autoSkeletonizeMinLines, prepends │
│                       a skeleton (imports + symbols) as well      │
│    re-read-           Caches result + mtime for future re-read    │
│    elimination        elimination checks                          │
│    graph-refresh      Auto-re-extract on edit/write               │
│                                                                   │
│  edit/write tool:                                                 │
│    graph-refresh      Re-extracts changed file into the graph     │
│                       (single-file incremental update, ~1-5ms)    │
│    graph-edit-check   Warns when edited file has dependents       │
│                                                                   │
│  grep/glob/search tool:                                          │
│    graph-search-hint  Searches code graph for matching symbols   │
│                       and appends up to 3 suggestions to output   │
│                                                                   │
│  memory/context/learn/journal tools:                              │
│    recording          Logs memory tool calls to store +            │
│                       predictive rating                            │
│    working-cache      Feeds memory results into in-memory          │
│                       working cache (8 KB cap per entry, used      │
│                       during compaction)                            │
└─────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─ PHASE 8: LOOP ───────────────────────────────────────────────────┐
│  If there are pending tool results to send back to the LLM →       │
│  go back to Phase 2 (messages.transform fires again with the       │
│  new tool results added to the message list)                       │
└─────────────────────────────────────────────────────────────────────┘
```

### Compaction (triggered by OpenCode when context is full)

| Hook | Handler | What it does |
|---|---|---|
| `experimental.session.compacting` | compaction | Captures working cache → middle-term context node (capped 12 KB total / 2 KB per entry, snapshot labels excluded from fallback fill). Archives conversation history → storedcontext node (no embedding — skipped in the hook). Records per-turn token usage stats |
| `experimental.compaction.autocontinue` | compaction | Forces `output.enabled = true` so the agent auto-resumes after compaction |
| `event('session.idle')` | events | Auto-distill (LLM extracts rules from lessons) + auto-consolidation + score decay + incremental graph rebuild |
| `event('session.compacted')` | events | Cleanup middle-term captures + score decay + auto-consolidation |
| `event('session.deleted')` | events | Stops management server if no active sessions remain |

### Key Design Principles

| Principle | Detail |
|---|---|
| **Everything runs before the LLM response** | All hooks fire before the LLM generates text — the plugin modifies inputs (system prompt, messages, params) and tool results, never the LLM's response |
| **Tool execution can be skipped** | Only `tool.execute.before` handlers (re-read-elimination, graph-tools) can short-circuit execution by pre-filling the output |
| **Post-processing feeds the next turn** | `tool.execute.after` modifies tool results that will be sent back to the LLM on the *next* iteration of Phase 2 |
| **Graceful degradation** | Every handler is wrapped in a try/catch in `hooks.ts` — a single handler failure never crashes the agent |
| **No auto-injection for memory** | By default, memory retrieval is agent-driven (`memory(mode="search")`/`memory(mode="get")`). The `messages.transform` hook is an opt-in alternative |

### Source Map

| Hook point | Orchestrator | Individual handlers |
|---|---|---|
| `experimental.chat.system.transform` | `src/plugin/hooks.ts:61` | `seed-rules.ts`, `output-token-control.ts` |
| `experimental.chat.messages.transform` | `src/plugin/hooks.ts:75` + `src/plugin/index.ts:58` | `messages-transform.ts`, `auto-retrieve/index.ts`, `tool-dedup.ts`, `error-prune.ts` |
| `chat.params` | `src/plugin/hooks.ts:73` | `chat-params.ts` |
| `tool.execute.before` | `src/plugin/hooks.ts:63` | `re-read-elimination.ts` |
| `tool.execute.after` | `src/plugin/hooks.ts:65` | `compression.ts`, `adaptive-pressure.ts`, `graph-context.ts`, `graph-edit-check.ts`, `graph-search-hint.ts`, `re-read-elimination.ts`, `recording.ts`, `working-cache.ts` |
| `experimental.session.compacting` | `src/plugin/hooks.ts:67` | `compaction.ts` |
| `event` | `src/plugin/hooks.ts:77` | `events.ts` |

## Logs

All plugin logs are consolidated under `~/.config/opencode/logs/`:

| Log | Path | Contents |
|-----|------|----------|
| Plugin | `logs/memory-plugin.log` | Plugin operations, init steps with timing, auto-retrieve, session events |
| MCP server | `logs/mcp-server.log` | MCP tool calls, resources, errors |
| Injection debug | `logs/memory-injection.log` | Full auto-retrieve injection payloads (rotated at 1 MB) |
| Context dump | `logs/context-dump.log` | Full context snapshots for debugging |
| Command compression | `logs/compress.log` | Compression events per command: strategy, original/compressed sizes, reduction pct, duration (auto-rotated at 2 MB) |
| Graph usage | `logs/graph-usage.log` | Graph tool calls with source, action type, and session ID (auto-rotated at 2 MB) |
| Session log | `logs/sessionlog.log` | Session lifecycle events (enabled via `sessionLog.enabled`) |
| OpenCode | `~/.local/share/opencode/log/` | Application lifecycle, tool calls |

## Development

```bash
git clone <repo>
cd opencode-fractal-memory
bun install
bun run build
bun run typecheck
```

### Testing

```bash
bun test                # essential suite — fast by default (~6s). Slow benchmark evals (search.loco, search.swecontext) are excluded via bunfig.toml pathIgnorePatterns
bun run test:full       # full suite — everything including slow benchmark evals (~9min)
bun run test:slow       # benchmark evals only (LoCoMo ~5min, SWE-ContextBench ~4min)
bun run test:coverage   # coverage run
```

### Installing locally (development)

```bash
bun run dev-install                # build + clean + sync to ~/.config/opencode + plugin cache
bun run dev-install --skip-build   # skip tsc, just sync
```

The script (scripts/dev-install.ts) wipes the plugin cache dir, copies all files + runtime deps, and prints a RESTART REQUIRED warning. Models download automatically on first plugin load via `ensureModels()` in `initStorage()`.

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│  Plugin Layer (plugin/index.ts)                           │
│  ┌──────────┬──────────┬──────────┬───────────┬──────┐  │
│  │ Memory    │ Skills   │ Journal  │ Auto-     │ Code │  │
│  │ Store     │ (nodes)  │ Store    │ Retrieve  │Graph │  │
│  └────┬─────┴────┬─────┴────┬─────┴─────┬─────┴──────┘  │
│       │          │          │           │               │
│  ┌────┴──────────┴──────────┴───────────┴───────────┐  │
│  │ SQLite (~/.config/opencode/memory.db)             │  │
│  │  - memory_nodes (labels, content, embeds)         │  │
│  │    - scope: "global" | "project"                  │  │
│  │    - project_name (for project-scope nodes)       │  │
│  │    - type: "note" / "skill" / "playbook"         │  │
│  │    - sticky playbooks/skills never pruned         │  │
│  │    - metadata.steps for playbook steps            │  │
│  │  - memory_links (wiki-link crossrefs)             │  │
│  │  - bm25_index (full-text search)                 │  │
│  │  - injection_metrics / session_metrics            │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │ HNSW Vector Index (in-memory, 384-dim)            │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
  │  │ ONNX Embedding Model (all-MiniLM-L6-v2)           │  │
  │  │ onnxruntime-node + @huggingface/tokenizers        │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │ Code Graph (in-memory graphology)                  │  │
│  │  - Node types: file, function, class, interface    │  │
│  │  - Edge types: calls, imports, references, extends │  │
│  │  - Louvain community detection                     │  │
│  │  - Incremental rebuild via file SHA-256 hashing    │  │
│  │  - Thread-safe: plugin hooks + MCP + management    │  │
│  └───────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

## Storage

Unified SQLite database with `project_name` discriminator:

| Path | Purpose |
|---|---|
| `~/.config/opencode/memory.db` | Global rules, persona, preferences (scope=global) + project-specific memory, nodes, playbooks (scope=project, discriminated by `project_name`) |

## License

MIT
