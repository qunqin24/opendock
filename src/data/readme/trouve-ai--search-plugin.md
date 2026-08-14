# trouve

Fast and accurate code search for agents — a Rust port of
[MinishLab/semble](https://github.com/MinishLab/semble) with an incremental,
branch- and worktree-aware index and a fully multithreaded pipeline.

Pronounced **"troov"** (rhymes with *groove*; French /tʁuv/). *Trouver* is
French for "to find" — a nod to upstream's namesake *sembler*, "to seem".
The full story behind the name is in [NAME.md](NAME.md).

## Why a port?

Upstream Semble is excellent but its cache is all-or-nothing: touch one file
and the whole repository is re-chunked and re-embedded. On a 20,000+ file
codebase that means minutes per rebuild. trouve replaces the cached-index
model with a **content-addressed chunk store**:

- Every per-file artifact (chunks, embedding rows, BM25 token lists) is keyed
  by content hash — a git blob OID for clean files (no file reads at all) or a
  BLAKE3 hash for dirty/untracked files.
- **Incremental**: editing one file re-embeds one file. Everything else is a
  store hit.
- **Branch/worktree aware**: the store is keyed by the git *common* directory,
  so all branches and worktrees of a repository share one store. Switching
  branches only pays for content the store has never seen.
- **Multithreaded**: file hashing, parsing, chunking, tokenizing, and
  embedding all run in parallel via rayon; BM25 corpus statistics are
  recomputed at assembly time (cheap relative to embedding).

Retrieval behaviour is a faithful port: the same `potion-code-16M` model2vec
embeddings (via an in-house engine with a memory-mapped embedding table and a
word-caching WordPiece fast path, verified bit-identical to
[model2vec-rs](https://github.com/MinishLab/model2vec-rs) per text),
the same BM25 (Lucene variant) scoring, the same RRF hybrid fusion, and the
same code-tuned reranking heuristics (symbol-definition boosts, file-stem
boosts, multi-chunk coherence, test/example/compat path penalties, per-file
saturation decay).

Assembled indexes are also persisted as memory-mapped snapshots: a warm query
loads embeddings and BM25 postings zero-copy, and an incremental build patches
the previous snapshot — splicing unchanged rows out of the old mapping — so
its cost is proportional to the edit, not the repository.

Measured results ([BENCHMARKS.md](BENCHMARKS.md)) on kubernetes/kubernetes
(30k files): cold indexing drops from ~3 minutes to 3.3 s (54x), an
incremental reindex after touching one file from ~3 minutes to 0.86 s (200x+),
and a fully warm query from ~7 s to 0.55 s (13x). Retrieval quality is
identical — mean NDCG@10 matches upstream to within 0.0002 on the upstream
annotated benchmark, with identical chunk boundaries and BM25 scores.

Everything runs on CPU, like upstream: model2vec static embeddings are table
lookups plus mean pooling, so there is no neural forward pass to accelerate.
Disk and memory footprints are documented in
[BENCHMARKS.md](BENCHMARKS.md#resource-usage); a complete list of differences
from upstream (and the reasoning behind each) is in
[DIFFERENCES.md](DIFFERENCES.md).

## Install

```bash
npm i -g @trouve-ai/search-core
# or: cargo install trouve-search
# or download a release binary from GitHub Releases
```

## Usage

```bash
trouve-search search "authentication flow" ./my-project --max-snippet-lines 10
trouve-search search "deployment guide" ./my-project --content docs
trouve-search find-related src/auth.py 42 ./my-project
trouve-search stats ./my-project        # index + cache-hit stats
trouve-search savings                   # token savings report
trouve-search clear all                 # wipe stores + savings
trouve-search                           # run as an MCP stdio server
```

The bare MCP entry shares one daemon across sessions on unix: the first
session starts a detached `trouve-search daemon` and every session proxies
to it over a unix socket, so concurrent agent sessions share a single
embedding model and index cache instead of each holding their own. Sharing
is per matching configuration — sessions with the same binary version,
`--content` types, and embedding model share one daemon; a session with a
different configuration gets its own. The daemon exits on its own after 15
idle minutes (`TROUVE_DAEMON_IDLE_SECONDS` overrides; `0` disables). Set
`TROUVE_DAEMON=0` to serve each session in-process instead (always the
case on Windows).

`--content` selects what to index: `code` (default), `docs`, `config`, or
`all`.

## Agent integrations

There are three ways to wire trouve into a coding agent, plus the CLI as a
universal fallback. Pick **one per agent** — they expose the same tools, so
combining them shows the model duplicates. [INSTALL.md](INSTALL.md) has
step-by-step instructions for every route and agent.

| Aspect | Plugin: OpenCode / Kilo | Plugin: Claude Code / Codex | Native tool file | MCP entry | CLI only |
| --- | --- | --- | --- | --- | --- |
| Agents | OpenCode, Kilo Code | Claude Code, Codex | OpenCode | any MCP-capable agent (Cursor, Gemini, Copilot, VS Code, Windsurf, Zed, …) | anything with a shell |
| Tool surface | native `trouve_search` / `trouve_find_related` | MCP (`mcp__trouve-search__*`) | native `trouve_search` / `trouve_find_related` | MCP (`mcp__trouve-search__*`) | `trouve-search` CLI via bash |
| trouve process | shared daemon (one per matching configuration) | shared daemon (one per matching configuration) | one process per call | shared daemon (one per matching configuration) | one process per call |
| In-session index cache | yes, shared across matching sessions | yes, shared across matching sessions | disk store only | yes, shared across matching sessions | disk store only |
| Index warmed at session start | yes, + re-warm on idle turns | Claude: yes (hook) · Codex: no | no | no | no |
| Bundled guidance | rich tool descriptions | workflow skill (+ sub-agent on Claude) | rich tool descriptions | tool descriptions | sub-agent docs |
| Setup | one `plugin` entry in your config | managed by the plugin marketplace | copy one file | one config entry | nothing |
| Updates | npm (`latest` or pinned) | marketplace update | re-copy the file | with the binary | with the binary |

Sharing requires unix domain sockets; on Windows each session runs its own
server, as before.

How to choose:

- **If your agent has a plugin route, prefer it.** Plugins are versioned in
  lockstep with the repository release, install/uninstall as one unit, and
  are the only routes with session-start index warming. For OpenCode and Kilo
  Code the plugin also avoids MCP entirely: tools are native, and the shared
  daemon keeps indexes cached across calls and across sessions with the same
  configuration.
- **For OpenCode without npm, use the native tool file**: copy
  [`src/agents/opencode-tool.ts`](src/agents/opencode-tool.ts) to
  `~/.config/opencode/tools/trouve.ts`. It exposes `trouve_search` /
  `trouve_find_related` with no MCP server process and no JSON config
  edits; it provides the same capabilities as an MCP entry under different
  tool names, so enable one or the other.
- **Add an MCP entry for everything else.** `trouve-search` with no subcommand is
  an MCP stdio server; one `{"command": "npx", "args": ["-y", "@trouve-ai/search-core"]}`
  entry in your agent's MCP config is all it takes.
  [INSTALL.md](INSTALL.md#3-mcp-server-entry) lists the exact file and snippet
  for 14 agents, plus optional `trouve-search` sub-agent files you can copy
  alongside.
- **The CLI needs no setup at all** and is what sub-agents without tool
  access fall back to; every approach above shares the same on-disk index
  store, so mixing CLI use with any other route costs nothing.

Per-harness plugin install commands:

- **[OpenCode](https://opencode.ai)** — `{ "plugin": ["@trouve-ai/search-plugin"] }` in
  your opencode config.
- **[Kilo Code](https://kilo.ai)** — `kilo plugin @trouve-ai/search-plugin --global`
  (Kilo CLI and VS Code extension).
- **[Claude Code](https://code.claude.com)** —
  `/plugin marketplace add jimsimon/trouve` then
  `/plugin install trouve-search@trouve`.
- **[Codex](https://developers.openai.com/codex)** —
  `codex plugin marketplace add 'https://github.com/jimsimon/trouve.git' --ref main`
  then `codex plugin add trouve-search@trouve`.

See [search-plugin](npm/search-plugin/README.md) for details.

## Self-hosted pull-request reviews

The harness can also run as a GitHub App-backed review bot: reconciliation
polling, optionally accelerated by webhooks, creates read-only review sessions
at immutable PR head SHAs. A separate Dockerized web dashboard configures
providers, models, and per-repository automatic/manual policy. See
[docs/code-review.md](docs/code-review.md) for deployment and GitHub App setup.

## Ignoring files

`.gitignore` files are honoured per directory (in a git repository, git's own
ignore rules decide which untracked files are seen; tracked files are always
candidates). To exclude files from indexing only (without git-ignoring them),
add patterns to a `.trouveignore` file — same syntax, same per-directory
inheritance. `.trouveignore` applies in git and non-git roots alike, to
tracked and untracked files. Upstream's `.sembleignore` is
still honoured for backwards compatibility, but is deprecated and will be
removed in a future release; rename it to `.trouveignore`.

## Chunking

Files are split into chunks of ~750 bytes. How the boundaries are chosen
depends on the file's language, detected from its extension:

1. **Native (tree-sitter) chunking.** For the languages below, a tree-sitter
   grammar is compiled into the binary and chunk boundaries follow the syntax
   tree, so chunks align with functions, classes, and blocks rather than
   arbitrary line ranges.
2. **Line-based fallback.** Files in any other recognized language (250+
   extensions, including COBOL, Ada, Clojure, Nim, Vim script, …) are chunked
   by merging whole lines up to the same target length. They are fully
   indexed and searchable; only the boundary placement is less
   syntax-aware.
3. **Unrecognized extensions** are not indexed.

Natively supported languages:

| | |
| --- | --- |
| Systems | C, C++, D, Fortran, Go, Objective-C, Rust, Swift, Zig |
| Managed / JVM | C#, Groovy, Java, Kotlin, Scala |
| Scripting | Bash, Lua, Perl, PHP, PowerShell, Python, R, Ruby |
| Web | CSS, HTML, JavaScript/JSX, Svelte, TSX, TypeScript |
| Functional | Elixir, Elm, Erlang, Gleam, Haskell, OCaml (incl. `.mli`) |
| Mobile / other | Dart, Julia, Solidity, SQL |
| Config / IaC | CMake, HCL/Terraform, Make, Nix, TOML, YAML |
| Data / markup | GraphQL, JSON, Markdown, Protocol Buffers, XML (incl. DTD) |
| Templates | ERB/EJS (embedded templates) |

Grammars are chosen for maintained crates.io releases; adding one is a
two-line change (a dependency in `Cargo.toml` and a match arm in
`src/chunk.rs`).

## Cache location

Resolved in order: `TROUVE_CACHE_LOCATION` (absolute path), then the platform
cache dir (`~/.cache/trouve` on Linux). Set `TROUVE_MODEL_NAME` to override
the embedding model.

The upstream semble environment variables (`SEMBLE_CACHE_LOCATION`,
`SEMBLE_MODEL_NAME`) are still honoured as fallbacks when the corresponding
`TROUVE_CACHE_LOCATION` or `TROUVE_MODEL_NAME` is unset, but are deprecated
and will be removed in a future release.

The store garbage-collects itself: after a snapshot write (at most once per
day per store), entries not referenced by any kept snapshot are deleted, with
a one-hour grace period protecting concurrent builds. Deleted entries are
never wrong — the store is a cache, and a miss just recomputes the file.

## Development

This repository is a Cargo workspace (the trouve monorepo); the search tool
lives in `crates/trouve-search`. From the repo root:

```bash
cargo test -p trouve-search       # unit + integration tests (offline)
TROUVE_E2E=1 cargo test -p trouve-search -- --ignored   # e2e tests (downloads the model)
./scripts/fetch-reference.sh      # clone upstream Python semble into reference/
python3 crates/trouve-search/tests/parity/run_parity.py --binary target/release/trouve-search
./benchmarks/run_benchmarks.sh    # hyperfine comparison vs Python semble
```

Every first-party Cargo crate, Node package, plugin, and release artifact uses
the version in root `[workspace.package]` (enforced in CI). Repository releases
use `vX.Y.Z` tags. After changing the root version, run:

```bash
python3 scripts/sync_versions.py  # synchronize manifests, pins, and lockfiles
```

## Acknowledgements

trouve exists because of [Semble](https://github.com/MinishLab/semble) by
Thomas van Dongen and Stephan Tulkens of [MinishLab](https://github.com/MinishLab),
which pioneered the approach: static [Model2Vec](https://github.com/MinishLab/model2vec)
embeddings fused with BM25 and code-aware reranking, fast enough for agents to
use as a native tool. trouve's retrieval behaviour is a faithful port of their
design (see [DIFFERENCES.md](DIFFERENCES.md)), and the
[potion-code-16M](https://huggingface.co/minishlab/potion-code-16M) embedding
model is theirs. If you find trouve useful, star their repo too.

## Citing

If you use trouve in your research, please cite the original Semble project,
per its [citation guide](https://github.com/MinishLab/semble#citing):

```bibtex
@software{minishlab2026semble,
  author       = {{van Dongen}, Thomas and Stephan Tulkens},
  title        = {Semble: Fast and Accurate Code Search for Agents},
  year         = {2026},
  publisher    = {Zenodo},
  doi          = {10.5281/zenodo.19785932},
  url          = {https://github.com/MinishLab/semble},
  license      = {MIT}
}
```

## License

MIT, same as upstream. Portions derived from
[MinishLab/semble](https://github.com/MinishLab/semble).
