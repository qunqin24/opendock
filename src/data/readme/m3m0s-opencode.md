<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/brand/banner-dark.svg">
    <img alt="m3m0s: long-term memory for LLM agents" src="docs/brand/banner-light.svg" width="720">
  </picture>
</p>

<p align="center">
  <a href="https://m3m0s.rafaelvieiras.com"><b>Website</b></a> ·
  <a href="https://m3m0s.rafaelvieiras.com/guide/">Guide</a> ·
  <a href="https://github.com/rafaelvieiras/m3m0s/releases">Releases</a>
</p>

# M3m0s

A self-hosted, long-term semantic memory service for LLM agents: one small Go
binary that stores what your agents learn and serves it back to any tool over
**MCP**, **CLI** or **HTTP**, with a built-in web UI for browsing, editing and
chatting with your memory.

M3m0s exists because every agent tool keeps its own isolated memory — or none.
The result is context re-explained every session (wasted tokens), nothing that
travels between tools, and no way to use cheaper models because each session
has to rediscover everything from scratch. Memory systems that already tackle
this — Claude-Mem, Mem0, Cognee, Zep — each make different trade-offs, with
more emphasis on a single tool, graph features or a hosted platform. M3m0s
aims at a different corner: **one static binary backed by a single SQLite
file**, light enough for a small ARM board, speaking the protocols every agent
tool already supports, and keeping the memory *shared* instead of per-tool. A
feature comparison (a good-faith summary of public docs, corrections welcome)
is in [`docs/market-benchmark.md`](docs/market-benchmark.md).

- **Server** (`m3m0s serve`): HTTP API + embedded WebUI in one process. SQLite
  storage (pure Go, no cgo) with versioned migrations; embeddings from any
  OpenAI-compatible endpoint; cosine search in Go.
- **MCP bridge** (`m3m0s mcp`): stdio MCP server for hosts such as Claude Code
  or OpenCode; a stateless bridge to a running `serve`.
- **CLI** (`m3m0s add|search|recent|get|update|stats|forget-sweep|restore`):
  one-shot commands, also clients of `serve`.
- **Watcher** (`m3m0s watch <dir>`): indexes `AGENTS.md`, `CLAUDE.md`,
  `MEMORY.md` and `docs/**/*.md` of a project and reindexes them when they
  change.
- **Hooks** (`m3m0s hook claude-code`): automatic capture and context
  injection for Claude Code sessions.

## Status

Early but functional: the core runs in daily use by its author. The API is not
yet frozen. Design decisions are recorded in
[`docs/decisions/`](docs/decisions/README.md) and the phased plan is in
[`docs/implementation-plan.md`](docs/implementation-plan.md).

Working today:

- **Storage and search**: SQLite store with versioned migrations; vector
  search over OpenAI-compatible embeddings (brute-force cosine in Go, filtered
  by domain); a 4-axis scope schema (`domain` / `source` / `agent` /
  `tags`+`metadata`), see [`docs/memory-schema.md`](docs/memory-schema.md).
- **Ingestion quality**: secret redaction on ingestion, optional LLM fact
  extraction (one input becomes several atomic facts, chunked and retried),
  deduplication by similarity, deduplicated storage of the original source text.
- **Temporal facts and light knowledge links**: `related_to` links by
  similarity, `valid_until` set when a new fact contradicts an old one
  (LLM-classified, safe fallback).
- **Layers and forgetting**: retention formula with reinforcement on access,
  soft-delete with a grace period, restore, pinning, and a scheduled sweep.
- **Interfaces**: MCP tools, CLI, authenticated HTTP API under `/api/v1`
  ([`docs/api-contract.md`](docs/api-contract.md)), async `add` with a pollable
  operation when extraction is slow.
- **WebUI** (embedded in the binary): search and browse by scope, stats and
  telemetry, add with extraction preview, edit/delete, an in-process jobs
  panel (history, run now, change interval), a memory health page (distributions,
  what forgetting would do next, duplicate and noise candidates; read-only), a
  context-injection preview, and a floating chat that answers from your memory and can save new memories.
- **Claude Code plugin** (`/plugin install m3m0s-memory --marketplace rafaelvieiras/m3m0s`) or manual hooks: `SessionStart` (inject recent memory),
  `PreCompact` and `SessionEnd` (capture the transcript delta).
- **Self-documentation**: the project's own docs are embedded in the binary and
  indexed into memory at boot.

Not done yet (planned direction): a tool-agnostic memory shared by many LLM
clients, with integrations beyond Claude Code and more hooks; more reliable
capture; project scopes layered over the current domains; hybrid search
(full-text + vector); and a self-correction loop for memories that turn out to
be wrong or stale. Open questions are tracked as issues.

## Quickstart (Docker)

```sh
cp .env.example .env        # set OPENAI_API_KEY (used for embeddings)
docker compose up -d
curl http://localhost:19234/health
docker compose logs          # first start prints a generated API key — save it,
                             # it is not shown again
```

Then open `http://localhost:19234/`. A fresh instance runs a first-time setup:
create the first account (username and password), no key needed, so do it right
away if the instance is reachable from the internet. From then on you sign in
with that account. Data lives in a named volume (`m3m0s-data`), so it survives restarts.

Accounts are for people using the WebUI; hooks, MCP and the CLI keep using API
keys. Forgot the password? `m3m0s user reset <username>` prints a single-use,
30-minute link that opens a page to choose a new one (run it with
`M3M0S_URL`/`M3M0S_API_KEY` set, or inside the container). `m3m0s user add`,
`list` and `delete` manage further accounts; they all share the same memory.

Point the clients at the server:

```sh
export M3M0S_URL=http://localhost:19234
export M3M0S_API_KEY=<the key from the first start>

m3m0s add "We use SQLite with versioned migrations" --domain code:myproject
m3m0s search "which database do we use?" --domain code:myproject
```

Register the MCP bridge in your agent host as a stdio server with
`command: m3m0s`, `args: ["mcp"]` (and the two environment variables above). The
full operation list for MCP, CLI and HTTP is in
[`docs/api-contract.md`](docs/api-contract.md).

To run without Docker: `go build ./cmd/m3m0s` (build the WebUI first with
`npm run build` in `webui/` if you want it embedded), then `m3m0s serve`.

## Configuration

Set through environment variables (or the matching `m3m0s serve` flags).

| Variable | Default | Purpose |
|---|---|---|
| `OPENAI_API_KEY` | — (keyword-only) | Key for embeddings (`text-embedding-3-small`). Without it the server runs keyword-only: FTS5 search and exact-match dedup. Model, endpoint, dimensions and key can also be set at runtime (`/api/v1/embedding-config`, D36), which then takes precedence. |
| `M3M0S_OPENAI_BASE_URL` | OpenAI | Alternative OpenAI-compatible embeddings endpoint. |
| `M3M0S_REEMBED_BATCH` | `64` | Texts per request in the re-embedding job (max 2048). |
| `M3M0S_REEMBED_RPS` | `5` | Provider requests per second in the re-embedding job. |
| `M3M0S_PORT` | `19234` | HTTP port. |
| `M3M0S_DATA_DIR` | `~/.m3m0s/data` (`/data` in the Docker image) | Where the SQLite database lives. |
| `M3M0S_HOST_PORT` | `19234` | Host port published by `compose.yaml`. |
| `M3M0S_EXTRACT_API_KEY` | — (extraction off) | Enables LLM fact extraction. |
| `M3M0S_EXTRACT_BASE_URL` | `https://openrouter.ai/api/v1` | OpenAI-compatible endpoint for extraction. |
| `M3M0S_EXTRACT_MODEL` | `deepseek/deepseek-v4-flash` | Extraction model. |
| `M3M0S_CHAT_API_KEY` | falls back to the extraction key | Enables the WebUI chat. |
| `M3M0S_CHAT_BASE_URL` / `M3M0S_CHAT_MODEL` | OpenRouter / `deepseek/deepseek-v4-flash` | Chat provider and model. |
| `M3M0S_ADD_SYNC_TIMEOUT` | `300ms` | How long `add` waits before answering `202` and finishing in the background (`<= 0` disables). |
| `M3M0S_RETRO_EXTRACT_INTERVAL` | `2h` | Retroactive extraction job interval. |
| `M3M0S_FORGET_SWEEP_INTERVAL` | `12h` | Forgetting sweep interval. |
| `M3M0S_RETENTION_MODEL` | `legacy` | Score the forgetting sweep uses: `legacy` (one 30-day half-life) or `per-kind` (half-life by nature of fact; opt-in). Half-lives and bonuses: `M3M0S_RETENTION_*`, see [D39](docs/decisions/D39-per-kind-retention.md). |
| `M3M0S_JOBS_TICK` | `30s` | Scheduler heartbeat. |
| `M3M0S_INSIGHTS_CPU_PERCENT` | `60` | Duty cycle (1-100) of the memory-health analysis job while it runs. |
| `M3M0S_INSIGHTS_MAX_MINUTES` | `30` | Wall-clock limit of that job; a longer run ends with a partial report. |
| `M3M0S_FILTER_MODE` | `default` | Ingestion boilerplate filter, global mode: `default` (each rule's own action: drop for tool-prompt leaks, tag for diff trivia), `off`, `tag` or `drop`. Acts only on automatic capture; see [D12](docs/decisions/D12-llm-fact-extraction.md). |
| `M3M0S_FILTER_MODES` | — | Per-rule modes that win over the global one, e.g. `diff-trivia-fact=drop,commit-prompt-*=tag` (`*` as a trailing prefix wildcard). |
| `M3M0S_FILTER_RULES` | — | JSON file of rules that replace (same `id`), add or disable (`"action": "off"`) the built-in ones. Patterns must be anchored (`^`, and `$` for facts). |
| `GOGC` | `50` (set by m3m0s when unset) | Go GC target. Lower values trade a little CPU for a lower memory peak. |
| `GOMEMLIMIT` | — (not set) | Optional soft memory limit for the Go runtime, e.g. `600MiB` on a small host; keep it above the live size (~250 MB for 75k entries). |
| `M3M0S_URL` | `http://localhost:19234` | Server URL used by the CLI, MCP bridge, watcher and hooks. |
| `M3M0S_API_KEY` | — | API key used by those clients. |

### Memory health

The Insights page (`/insights`) shows the shape of the collection and what forgetting would
do next, and can run a read-only hygiene analysis (identical and near-duplicate memories,
low-value candidates). The analysis is a manual job (`insights-hygiene`), uses the vector
index already in memory and no network, keeps its last result in the database, and never
changes a memory. See `docs/decisions/D37-insights-dashboard.md`.

```sh
m3m0s insights show          # totals, forgetting outlook, last analysis (add --json for the raw data)
```

Each fact also carries a nature (`kind`: decision, rule, preference, gotcha, procedure, state, noise,
other), tagged by the extractor or a heuristic and shown as a distribution on that page. Search and
list filter on it (`m3m0s search "..." --kind rule`), `m3m0s update <id> --kind gotcha` corrects it,
and `m3m0s kind backfill estimate` sizes the optional tagging of older facts. See
`docs/decisions/D38-fact-kind.md`.

The page also compares, in shadow, the current retention score with a per-kind one (a half-life by
nature of fact) without changing anything; `m3m0s forget-sweep --dry-run --model per-kind` previews it
and `m3m0s kind retention --file sample.json` checks it against a labelled sample. See
`docs/decisions/D39-per-kind-retention.md`.

The same page lists the ingestion filter (tooling boilerplate stopped at automatic capture) with
per-rule counters. To see what the rules would catch in an existing database without changing it
(the file is opened read-only; run it on a copy if the server is writing to it):

```sh
m3m0s filter replay -data ~/.m3m0s/data              # counts per rule
m3m0s filter replay -data ~/.m3m0s/data -examples 5  # plus redacted, truncated examples
m3m0s filter replay -facts facts.txt -segments digest.txt -modes diff-trivia-fact=drop
```

### Embedding provider and re-embedding

The embedding model, endpoint, dimensions and key can be changed at runtime from the
WebUI (Embedding page) or the CLI (needs `M3M0S_URL`/`M3M0S_API_KEY`):

```sh
m3m0s embedding show                              # config, vector counts, re-embedding state (no secrets)
m3m0s embedding estimate --model text-embedding-3-large --dimensions 1024
echo "$NEW_KEY" | m3m0s embedding set --model text-embedding-3-large --api-key-stdin
m3m0s embedding set --dimensions 512 --api-key-env EMBED_KEY --confirm-reembed
m3m0s embedding set --disable
m3m0s embedding reembed start --watch             # also: status [--watch], cancel
```

The key is never accepted as an argument (shell history, `ps`) and never printed. If a change
leaves stored vectors in another model/size, `set` shows how many and an approximate cost
(characters / 4, an estimate) and asks to confirm; without a terminal pass
`--confirm-reembed` (or `--yes`). Add `--json` to `show`, `set`, `estimate` and
`reembed` for machine-readable output. See `docs/decisions/D36-runtime-embedding-config.md`.

## Security note

M3m0s stores whatever you send it — including conversation transcripts — and
you configure it with provider API keys. Text is passed through secret
redaction before storage and before it is sent to an extraction provider, but
redaction is best-effort (coverage notes in `docs/decisions/D6-getengram-analysis.md`;
`m3m0s maintenance redact-scan` reports secrets that were stored before a rule existed
and `--apply` re-redacts the stored source blobs; dry run by default). Put the server behind TLS and a trusted network
boundary before exposing it, keep your `.env` out of version control, and read
[`SECURITY.md`](SECURITY.md) for details and how to report a vulnerability.

## Development

Build, test and run commands, the repository layout and the project's
conventions (English only, human-owned commits, no personal or infrastructure
data) are in [`AGENTS.md`](AGENTS.md); contribution workflow is in
[`CONTRIBUTING.md`](CONTRIBUTING.md). Quick check:

```sh
go vet ./... && go test ./...
```

## Name

M3m0s has no relation to [getengram.app](https://getengram.app/). The project
was called "Engram" in its first days and was renamed to avoid the collision
(see [`docs/decisions/`](docs/decisions/README.md), D5/D6).

## License

MIT — see [`LICENSE`](LICENSE).
