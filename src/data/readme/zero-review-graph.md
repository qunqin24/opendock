# ZeroReview Graph (ZRG)

![ZERO REVIEW GRAPH lockup](docs/brand/logo/zero-review-graph-lockup.svg)

**Trace impact. Read less.** — *Review the graph, not the guess.*

<p align="center">
  <img src="docs/brand/supporting/zero-review-graph-topology.svg" alt="ZERO REVIEW GRAPH impact topology" width="800"/>
</p>

A **Go/Rust graph-first code-review toolkit for OpenCode**, inspired by the minimal-context review model of `code-review-graph` and Zerolang's semantic-graph and checked-edit model.

The goal is simple: **make the agent ask the graph what deserves context before it reads the repository broadly.**

> **Published v0.1.0 — deliberately bounded.** This is not a starter kit or prototype pitch. ZRG v0.1.0 ships a small, auditable surface: Go workspace indexer and CLI (`zrg`), Go MCP server (`zrg-mcp`), optional Rust reverse-impact accelerator, optional Zerolang adapter, thin OpenCode TypeScript plugin shim, and pointable skill. It intentionally favors correctness over breadth and documents what it does not yet claim.

## Install (npm)

**Requirements**

- **Node 20+** (package floor, `engines.node >=20` in `package.json`)
- **Go 1.25+** (module floor, `go 1.25.0` in `go.mod` — required by `github.com/modelcontextprotocol/go-sdk v1.7.0`)
- **OpenCode 1.18.26** (stable/V1 config shape verified: `plugin` singular + flat `mcp.zrg` (flat mcp.zrg))

Install from npm:

```bash
npm install zero-review-graph
# or globally
npm install -g zero-review-graph
```

Run the CLI via npx (no global install required):

```bash
npx zrg --help
npx zrg-mcp --help
# alias also works
npx zero-review-graph --help
```

### Go-source fallback (v0.1.0 runtime model)

v0.1.0 is distributed as a **portable, source-backed npm package** — native binaries are deferred. The npm wrappers at `bin/zrg.js` and `bin/zrg-mcp.js` implement a Go-source fallback:

- If a prebuilt Go binary exists at `bin/zrg` / `bin/zrg-mcp`, the wrapper delegates to it.
- Otherwise it falls back to `go run ./cmd/zrg` / `go run ./cmd/zrg-mcp` from the installed package root.

That means `npm install` works on any platform with Go 1.25+ on `PATH`, even without a platform-specific binary. Verify:

```bash
go version  # must be go1.25.0+
node --version  # must be v20+
npx zrg build -root .
```

## v0.1.0 runtime model

- **Distribution:** portable npm tarball (23 files, no native binaries bundled). See `final_publish_candidate` in `ledger/state.json` for sha1 `6fc5bd63d1fc053c555d0c983c1b5cd44dafb5da` / sha256 `e156d703a8142109365442bddcc438bd6efd6c504932298b665f945b14669db7`.
- **Execution:** wrappers prefer local binary if present, otherwise `go run` source fallback.
- **Future:** platform-native npm binaries are deferred to a later release; v0.1.0 explicitly documents this so users do not expect prebuilt binaries.

## Quick start

```bash
# 1. Install
npm install zero-review-graph

# 2. Build a workspace graph (writes .zrg/graph.json)
npx zrg build -root .

# 3. Search before reading broadly
npx zrg search -graph .zrg/graph.json "handler"

# 4. Trace blast radius (absolute indexed path or node ID)
npx zrg impact -graph .zrg/graph.json -depth 3 /absolute/path/to/file.go

# 5. Get a byte-bounded review list (returns file list, not file contents)
npx zrg context -graph .zrg/graph.json -depth 3 -bytes 120000 /absolute/path/to/file.go
```

Through OpenCode (MCP):

```bash
# OpenCode discovers the local skill + plugin automatically; no manual wiring needed for repo-local use.
# For global use, point OpenCode at the repo-owned files or install via npm and use the enabled example.
cat opencode.jsonc.enabled.example
```

## OpenCode integration (stable/V1, 1.18.26)

ZRG targets **OpenCode stable/V1 1.18.26** (`https://opencode.ai/config.json`). The actual package/config on disk is canonical:

- **Plugin:** singular `plugin` array — see `package.json` field `"opencode": { "plugin": "./dist/plugin.js" }` and `opencode.jsonc` key `"plugin": ["./.opencode/plugins/zero-review-graph.ts"]`. Toggle by adding/removing the entry — no uninstall required.
- **MCP:** flat `mcp.zrg` (flat mcp.zrg) — see `opencode.jsonc` key `"mcp": { "zrg": { "type": "local", "command": ["go", "run", "./cmd/zrg-mcp"] } }`. The stable shape is `mcp.<name>`, not `mcp.servers.<name>`. Disable via `enabled: false` or by removing/commenting the block.
- **Examples:** `opencode.jsonc.enabled.example` (enabled) and `opencode.jsonc.disabled.example` (disabled, commented) show the exact toggle.

The plugin is a **thin TypeScript shim** — OpenCode loads local plugins as JS/TS modules; substantive indexing, graph, MCP, and runtime behavior stays in Go/Rust.

Skill: `.opencode/skills/zero-review-graph/SKILL.md` (graph-first sequence: `graph_build` → `graph_search` → `impact_analyze` → `context_pack` → bounded reads → `zero_read` when `zero.graph` exists).

## MCP tool surface — six tools

| Tool | Purpose | Mutates source? |
|---|---|---:|
| `graph_build` | index the workspace and write `.zrg/graph.json` | No source mutation |
| `graph_search` | locate graph nodes before broad reads | No |
| `impact_analyze` | reverse-dependency blast radius | No |
| `context_pack` | return bounded file list, not file contents | No |
| `zero_read` | allowlisted Zerolang query/check operations | No source mutation intended |
| `zero_patch_preview` | return proposed `zero patch` command + hash | **No execution** |

Confirmed surface: `ledger/state.json` `build_state.mcp: "PASS (6 tools, connected)"` and `mcp_tools: 6`. See `docs/MCP_TOOLS.md` for request/response contracts. `graph_build` is the only tool that writes (to `.zrg/graph.json`); no tool mutates project source.

## workspace_id

`workspace_id` is a first-class agent primitive. It identifies the exact indexed workspace snapshot derived from normalized indexed paths and SHA-256 content hashes. Calculation: sorted `relPath:sha256` over indexed files (`*.go`, `*.rs`, `*.graph`, `go.mod`, `Cargo.toml`). Stable across reordering; any indexed-file content change rotates the ID. Agents must log it with results; if it changes, prior graph conclusions may be stale. Example from ledger: `zrg-313a98fd480b6eab843ca55d` (68 nodes, 74 edges).

## What the graph currently knows

Implemented and verified on Go 1.25 / Rust 1.93 / OpenCode 1.18.26:

- deterministic `workspace_id` from indexed path/content hashes;
- Go file/function/type extraction with the Go parser;
- local Go module import edges;
- bounded Rust function/type/module/use extraction;
- Rust module-dependency approximation;
- `zero.graph` snapshot anchoring when present;
- reverse-dependency BFS blast radius;
- byte-bounded context packs;
- optional Rust impact traversal with automatic Go fallback;
- Go MCP tool façade (six tools);
- OpenCode plugin + skill integration;
- derived self-contained HTML ledger with original ledger preserved intact.

## What ZRG does not claim yet

This is **not** equivalent to `code-review-graph`'s mature parser/analysis surface. V0.1.0 intentionally does **not** claim:

- Tree-sitter coverage across many languages;
- complete call-site or dynamic-dispatch resolution;
- inheritance/interface resolution;
- community detection;
- embedding/vector retrieval;
- incremental database updates;
- test-coverage edges;
- CI risk scoring;
- perfect Rust macro/module resolution;
- direct arbitrary source mutation through MCP.

These are roadmap candidates (see `docs/ROADMAP.md`), not hidden features. See also `ledger/state.json` `known_limits`.

## Optional Rust accelerator

- Requires current Rust toolchain (`cargo`, `rustc`). Verified with `rustc 1.93.1 / cargo 1.93.1` in ledger.
- If available, `zrg` prefers the Rust reverse-impact core; otherwise the Go engine is used automatically.
- Enable explicitly:

```bash
cargo build --release --manifest-path rust/zrg-core/Cargo.toml
export ZRG_RUST_CORE="$PWD/rust/zrg-core/target/release/zrg-core"
```

No Rust toolchain → Go fallback, no behavior change beyond performance.

## Optional Zerolang integration

- Requires `zero` on `PATH` and a Zerolang package/workspace if compiler facts are desired.
- ZRG treats Zerolang as an **optional semantic-truth provider**, not a magic parser.
- Allowlisted operations only: `zero query`, `zero inspect`, `zero check`, `zero test`, `zero verify-projection`, `zero skills`.
- Returns the current `zero.graph` SHA-256 alongside results; `zero_patch_preview` returns the proposed `zero patch` command without executing it.

```bash
zrg zero -root . query
zrg zero -root . inspect
zrg zero -root . check
zrg patch-preview -root . --op 'addMain' --op 'addCheckWrite fn="main" text="hello\n"'
```

## Architecture

```text
User / OpenCode task
        │
        ▼
OpenCode skill + thin plugin shim
        │
        ▼
Go MCP tools
  graph_build
  graph_search
  impact_analyze
  context_pack
  zero_read
  zero_patch_preview
        │
        ├──────────────► Go graph/index + workspace_id
        │                         │
        │                         └── optional Rust reverse-impact core
        │
        └──────────────► optional Zerolang zero.graph / compiler facts
                                   │
                                   └── graph hash + checked-edit preview

All findings / status / provenance
        │
        ▼
ZeroReview Graph OpenCode Master Ledger
```

Design target: answer four questions before broad reads — snapshot identity (`workspace_id`), relevant location (`graph_search`), blast radius (`impact_analyze`), minimal evidence set (`context_pack`) — plus compiler truth (`zero_read` + `zero.graph` hash) when Zerolang is present. See `docs/ARCHITECTURE.md`.

Edge direction: `dependent → dependency` (file A imports B ⇒ A → B). Blast radius walks reverse edges.

## Repository layout

```text
.
├── cmd/
│   ├── zrg/                      # local Go CLI
│   └── zrg-mcp/                  # MCP stdio server
├── internal/
│   ├── graph/                    # reverse impact + context pack + Rust fallback
│   ├── index/                    # Go AST + bounded Rust lexical index
│   ├── model/                    # snapshot/node/edge contracts
│   └── zero/                     # allowlisted Zerolang adapter
├── rust/zrg-core/                # optional stdlib-only Rust impact engine
├── .opencode/
│   ├── plugins/zero-review-graph.ts
│   └── skills/zero-review-graph/
├── ledger/
│   ├── zero_review_graph_opencode_master_ledger.html
│   ├── MASTER_INDEX.yaml
│   ├── runtime.toml
│   ├── state.json
│   └── provenance/dynamic_agent_master_ledger.original.html
├── docs/
│   ├── brand/                  # lockup, mark, board, topology (see docs/brand/README.md)
│   └── ...
├── bin/
│   ├── zrg.js                  # wrapper → bin/zrg or go run ./cmd/zrg
│   └── zrg-mcp.js              # wrapper → bin/zrg-mcp or go run ./cmd/zrg-mcp
├── scripts/
├── opencode.jsonc
├── opencode.jsonc.enabled.example
├── opencode.jsonc.disabled.example
└── BUILD_LEDGER.md
```

## Build from source

```bash
# bootstrap + verify
make bootstrap
make test
make build

# or manually
go mod download
go test ./...
go build -o bin/zrg ./cmd/zrg
go build -o bin/zrg-mcp ./cmd/zrg-mcp
cargo build --release --manifest-path rust/zrg-core/Cargo.toml  # optional
```

TypeScript plugin:

```bash
npm run build  # tsc -p tsconfig.json → dist/plugin.js
```

Isolated install check (mirrors ledger verification):

```bash
npm pack --dry-run
# or
mkdir /tmp/zrg-check && tar -xzf zero-review-graph-0.1.0.tgz -C /tmp/zrg-check --strip-components=1
go test ./...
```

## Master ledger

Open:

```text
ledger/zero_review_graph_opencode_master_ledger.html
```

It preserves the original 145-node uploaded ledger and appends 12 ZRG-specific source, runtime, OpenCode, and governance nodes (157 total). Original upload is retained byte-for-byte under `ledger/provenance/` with SHA-256 `9567f73276d9de3a9bd581f6ab5ba456f2e8750da48f4c3acdf91b9b17cd7b46` recorded in the derived ledger. See `ledger/state.json` for `derived_source_sha256`, `node_count`, and verification.

The ledger follows the supplied rule that resource discovery is separate from dependency adoption, preserves stable IDs and provenance, and treats cross-reference scores as retrieval hints rather than proof of compatibility.

## Design principles

- **Graph first, read second.** Ask the graph what deserves context before broad reads.
- **Bounded over aspirational.** Ship a small auditable surface with explicit non-claims.
- **Deterministic identity.** `workspace_id` and `zero.graph` hash make staleness visible.
- **No silent mutation.** Tools do not mutate source; patch preview never executes `zero patch`.
- **Toolchain honesty.** Pin Go 1.25 / Node 20 / OpenCode 1.18.26 floors and verify them; fall back gracefully (Go fallback, Rust optional).

## Brand

ZeroReview Graph's visual system is a **review instrument**, not a mascot. The core mark — "The Review Lens" — is a broken zero ring (incomplete inspection by design) with three graph nodes and a diagonal review cut.

- **Display name:** `ZERO REVIEW GRAPH` · **Repo:** `zero-review-graph` · **Short:** `ZRG`
- **Tagline:** *Trace impact. Read less.* · **Secondary:** *Review the graph, not the guess.*
- **Palette:** Obsidian `#0A0E12`, Graph Cyan `#31E6D6`, Graph Violet `#7A5CFF`, Review Amber `#FFC857`, Risk Coral `#FF6B6B`
- **Assets:** [`docs/brand/`](docs/brand/) contains the canonical brand kit — lockup, mark, brand board, and supporting topology (see [`docs/brand/README.md`](docs/brand/README.md)).

The supporting topology illustration contains one intentionally tiny easter egg (`0xED` + `found it.`); the core mark and lockup do not depend on it.

> **Brand identity:** [`docs/brand/zero-review-graph-brand-id.md`](docs/brand/zero-review-graph-brand-id.md) · **Board:** [`docs/brand/board/zero-review-graph-brand-board.svg`](docs/brand/board/zero-review-graph-brand-board.svg) · **Mark:** [`docs/brand/logo/zero-review-graph-mark.svg`](docs/brand/logo/zero-review-graph-mark.svg) · **Topology:** [`docs/brand/supporting/zero-review-graph-topology.svg`](docs/brand/supporting/zero-review-graph-topology.svg)

## Project lineage

This project is independently implemented and **inspired by**, not presented as a fork or drop-in replacement for:

- `es-3581100/code-review-graph` — MIT licensed; conceptual inspiration for minimal-context graph review, blast radius, and MCP ergonomics.
- `es-3581100/zerolang` — Apache-2.0 licensed; conceptual/runtime inspiration for semantic graph handles, graph hashes, query-before-edit, checked patch behavior, and projections.

See `NOTICE` and `docs/SOURCE_LINEAGE.md`.

## Release status — v0.1.0

- **Version:** `0.1.0` (`package.json` + git tag `v0.1.0` at `12ba8481f82979bf9c2a1d59466c4f78881cd02d`)
- **Published:** `2026-09-02T06:58:45.415Z` via npm (receipt in `ledger/state.json` `publication_receipt`; dist shasum `6fc5bd63d1fc053c555d0c983c1b5cd44dafb5da`, integrity `sha512-xy5B/krzix/H8vHRsGMDg9qhCJu1ubaIMMy82sz5LdtP+KmzHAPv00kVWhluWN72PkE3uCNew2iIvTaExwq/Fg==`, tarball `https://registry.npmjs.org/zero-review-graph/-/zero-review-graph-0.1.0.tgz`, gitHead `12ba8481f82979bf9c2a1d59466c4f78881cd02d`)
- **Package floors verified:** Go 1.25 (`go.mod` `go 1.25.0`), Node 20 (`engines.node >=20`), OpenCode stable/V1 1.18.26 (`plugin` singular + flat `mcp.zrg` (flat mcp.zrg), schema `https://opencode.ai/config.json`)
- **MCP surface verified:** six tools, connected (`graph_build`, `graph_search`, `impact_analyze`, `context_pack`, `zero_read`, `zero_patch_preview`)
- **Pre-publish checkpoints preserved:** sha256 `15e7596252f0a9d067ef887b83606b0cc31f088b7de9c77bcd0bdee68a574427` (pre-publish) and sha1 `6fc5bd63d1fc053c555d0c983c1b5cd44dafb5da` / sha256 `e156d703a8142109365442bddcc438bd6efd6c504932298b665f945b14669db7` (final candidate) — not rewritten.
- **Distribution model:** v0.1.0 Go-source fallback, platform-native npm binaries deferred.

## License

Apache-2.0 — see `LICENSE` and `NOTICE`.
